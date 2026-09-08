/**
 * PostgreSQL bağlantı havuzu
 * Railway'de DATABASE_URL env variable otomatik set edilir.
 */

const { Pool } = require('pg');

/**
 * SSL — yalnızca UZAK veritabanında.
 *
 * Eski kontrol sadece 'localhost' arıyordu; aynı makinedeki Postgres'e
 * 127.0.0.1 ile bağlanınca SSL açılıyor, yerel Postgres varsayılan olarak
 * SSL sunmadığı için bağlantı reddediliyordu. Aynı makine = SSL'e gerek yok,
 * trafik döngü arayüzünden çıkmıyor.
 */
const DB_URL = process.env.DATABASE_URL || '';
const IS_LOCAL_DB = /@(localhost|127\.0\.0\.1|\[::1\]|::1)[:/]/.test(DB_URL);

const pool = new Pool({
  connectionString: DB_URL,
  ssl: IS_LOCAL_DB ? false : { rejectUnauthorized: false },
});

// Tabloları oluştur (ilk çalışmada)
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id           SERIAL PRIMARY KEY,
      email        VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at   TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS villages (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      state      JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Dünya haritasındaki NPC köyleri (tek ortak dünya)
    CREATE TABLE IF NOT EXISTS world_villages (
      slot_key   TEXT PRIMARY KEY,
      q          INTEGER NOT NULL,
      r          INTEGER NOT NULL,
      tier       INTEGER NOT NULL,
      name       TEXT NOT NULL,
      state      JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Oyuncu köyünün harita konumu
  await pool.query(`
    ALTER TABLE villages ADD COLUMN IF NOT EXISTS slot_key     TEXT;
    ALTER TABLE villages ADD COLUMN IF NOT EXISTS village_name TEXT;
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS villages_slot_key_idx
      ON villages (slot_key) WHERE slot_key IS NOT NULL;
  `);
  console.log('[DB] Tablolar hazır');
}

// Kullanıcı kayıt
async function createUser(email, passwordHash) {
  const res = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
    [email.toLowerCase().trim(), passwordHash]
  );
  return res.rows[0];
}

// Email ile kullanıcı bul
async function findUserByEmail(email) {
  const res = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  return res.rows[0] || null;
}

// ID ile kullanıcı bul
async function findUserById(id) {
  const res = await pool.query('SELECT id, email FROM users WHERE id = $1', [id]);
  return res.rows[0] || null;
}

// Köy state'ini yükle
/**
 * "BOŞ" STATE = KÖY YOK.
 *
 * setPlayerSlot köy satırını state'ten ÖNCE oluşturuyor ve NOT NULL kolonu
 * '{}' yer tutucusuyla dolduruyor. Bu yer tutucu JS'te truthy olduğu için
 * çağıran taraf onu gerçek bir kayıt sanıyor, hydrateVillage boş nesneyi köy
 * diye döndürüyor ve ilk payload'da productionTiles bulunmadığı için sunucu
 * ÇÖKÜYORDU — üretimde ilk oyuncu bağlantısında. Dev deposunda slot ayrı bir
 * tabloda durduğu için bu yol hiç görünmedi.
 */
function realState(st) {
  return (st && typeof st === 'object' && st.productionTiles && st.resources)
    ? st : null;
}

async function loadVillage(userId) {
  const res = await pool.query(
    'SELECT state FROM villages WHERE user_id = $1',
    [userId]
  );
  return realState(res.rows[0]?.state);
}

// ─── Dünya haritası ────────────────────────────────────────────────

async function loadNpcVillages() {
  const res = await pool.query('SELECT slot_key, q, r, tier, name, state, updated_at FROM world_villages');
  return res.rows.map(row => ({
    slotKey: row.slot_key, q: row.q, r: row.r,
    tier: row.tier, name: row.name, state: row.state,
    updatedAt: row.updated_at,     // offline telafi bunu kullanır
  }));
}

async function saveNpcVillages(list) {
  if (!list.length) return;
  // Tek sorguda toplu upsert
  const values = [];
  const params = [];
  list.forEach((n, i) => {
    const o = i * 6;
    values.push(`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, NOW())`);
    const serializable = {
      ...n.state,
      TOWER_SLOTS: [...n.state.TOWER_SLOTS],
      PRODUCTION_RING_1: [...n.state.PRODUCTION_RING_1],
    };
    params.push(n.slotKey, n.q, n.r, n.tier, n.name, JSON.stringify(serializable));
  });
  await pool.query(
    `INSERT INTO world_villages (slot_key, q, r, tier, name, state, updated_at)
     VALUES ${values.join(', ')}
     ON CONFLICT (slot_key) DO UPDATE
     SET state = EXCLUDED.state, updated_at = NOW()`,
    params
  );
}

/** Oyuncu köylerinin harita konumları */
async function loadPlayerSlots() {
  const res = await pool.query(
    `SELECT v.user_id, v.slot_key, v.village_name, u.email
     FROM villages v JOIN users u ON u.id = v.user_id
     WHERE v.slot_key IS NOT NULL`
  );
  return res.rows.map(r => ({
    userId: r.user_id, slotKey: r.slot_key,
    name: r.village_name, email: r.email,
  }));
}

async function setPlayerSlot(userId, slotKey, name) {
  await pool.query(
    `INSERT INTO villages (user_id, state, slot_key, village_name, updated_at)
     VALUES ($1, '{}'::jsonb, $2, $3, NOW())
     ON CONFLICT (user_id) DO UPDATE
     SET slot_key = EXCLUDED.slot_key, village_name = EXCLUDED.village_name`,
    [userId, slotKey, name]
  );
}

// Köy state'ini kaydet / güncelle
async function saveVillage(userId, state) {
  // TOWER_SLOTS ve PRODUCTION_RING_1 Set/Array oldukları için
  // JSON'a serialize ederken array'e dönüştür
  const serializable = {
    ...state,
    TOWER_SLOTS: [...state.TOWER_SLOTS],
    PRODUCTION_RING_1: [...state.PRODUCTION_RING_1]
  };

  await pool.query(
    `INSERT INTO villages (user_id, state, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE
     SET state = $2, updated_at = NOW()`,
    [userId, JSON.stringify(serializable)]
  );
}

// Tüm köyleri yükle (sunucu başlangıcında offline catch-up için)
async function loadAllVillages() {
  const res = await pool.query('SELECT user_id, state, updated_at FROM villages');
  // Yer tutucu satırlar (slot alınmış ama köy henüz kaydedilmemiş) atlanır
  return res.rows
    .filter(row => realState(row.state))
    .map(row => ({
      userId: row.user_id,
      state: row.state,
      updatedAt: row.updated_at  // JS Date objesi
    }));
}

module.exports = {
  pool, initDB, createUser, findUserByEmail, findUserById,
  loadVillage, saveVillage, loadAllVillages,
  loadNpcVillages, saveNpcVillages, loadPlayerSlots, setPlayerSlot,
};
