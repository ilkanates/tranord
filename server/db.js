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

    /**
     * ÇOKLU KÖY: user_id artık UNIQUE DEĞİL. Bir oyuncunun birden fazla köyü
     * olabiliyor; köyü benzersiz kılan şey (user_id, slot_key) çifti.
     * Yeni kurulumlarda kısıt hiç konmuyor, eski kurulumlarda aşağıdaki
     * göç adımında düşürülüyor.
     */
    CREATE TABLE IF NOT EXISTS villages (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
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
    ALTER TABLE villages ADD COLUMN IF NOT EXISTS is_capital   BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  /**
   * GÖÇ — tek köyden çoklu köye.
   *
   * Eski şemada `user_id UNIQUE` vardı; adı otomatik üretildiği için
   * (villages_user_id_key) doğrudan düşürmek yerine katalogdan bulup
   * düşürüyoruz. Kısıt yoksa hiçbir şey yapılmaz, yani bu blok her
   * açılışta güvenle çalışır.
   */
  await pool.query(`
    DO $$
    DECLARE con text;
    BEGIN
      SELECT conname INTO con FROM pg_constraint
        WHERE conrelid = 'villages'::regclass AND contype = 'u'
          AND pg_get_constraintdef(oid) = 'UNIQUE (user_id)';
      IF con IS NOT NULL THEN
        EXECUTE format('ALTER TABLE villages DROP CONSTRAINT %I', con);
        RAISE NOTICE 'villages: user_id UNIQUE kisiti dusuruldu (coklu koy)';
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS villages_slot_key_idx
      ON villages (slot_key) WHERE slot_key IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS villages_user_slot_idx
      ON villages (user_id, slot_key);
  `);

  // Merkezi olmayan oyuncularda ilk köy merkez sayılır
  await pool.query(`
    UPDATE villages v SET is_capital = TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM villages w WHERE w.user_id = v.user_id AND w.is_capital
    )
    AND v.id = (SELECT MIN(id) FROM villages x WHERE x.user_id = v.user_id);
  `);
  console.log('[DB] Tablolar hazır (çoklu köy şeması)');
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

/**
 * Bir oyuncunun BÜTÜN köyleri. Merkez köy önce gelir, sonrası slot
 * anahtarına göre sıralı — arayüzdeki köy listesi böylece hep aynı sırada.
 * Yer tutucu satırlar (slot alınmış ama köy kurulmamış) `state: null` döner.
 */
async function loadVillages(userId) {
  const res = await pool.query(
    `SELECT slot_key, village_name, is_capital, state, updated_at
     FROM villages WHERE user_id = $1
     ORDER BY is_capital DESC, slot_key ASC`,
    [userId]
  );
  return res.rows.map(r => ({
    slotKey: r.slot_key,
    name: r.village_name,
    isCapital: !!r.is_capital,
    state: realState(r.state),
    updatedAt: r.updated_at,
  }));
}

/** Geriye dönük: tek köy bekleyen çağrı yerleri için merkez/ilk köy */
async function loadVillage(userId) {
  const list = await loadVillages(userId);
  return list.find(x => x.state)?.state || null;
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

/**
 * Oyuncuya bir slot yaz. Çoklu köyde çakışma anahtarı (user_id, slot_key):
 * aynı slot yeniden yazılırsa adı güncellenir, yeni slot ise YENİ SATIR
 * açılır. `isCapital` verilirse o köy merkez olur ve oyuncunun diğer
 * köylerinin merkezliği düşürülür (merkez tek olabilir).
 */
async function setPlayerSlot(userId, slotKey, name, isCapital = false) {
  await pool.query(
    `INSERT INTO villages (user_id, state, slot_key, village_name, is_capital, updated_at)
     VALUES ($1, '{}'::jsonb, $2, $3, $4, NOW())
     ON CONFLICT (user_id, slot_key) DO UPDATE
     SET village_name = EXCLUDED.village_name`,
    [userId, slotKey, name, !!isCapital]
  );
  if (isCapital) await setCapital(userId, slotKey);
}

/** Merkez köyü taşı — oyuncunun yalnız BİR merkezi olabilir */
async function setCapital(userId, slotKey) {
  await pool.query(
    `UPDATE villages SET is_capital = (slot_key = $2) WHERE user_id = $1`,
    [userId, slotKey]
  );
}

/** Oyuncunun bir köyünü sil (fethedilme / terk) */
async function deleteVillage(userId, slotKey) {
  await pool.query(
    'DELETE FROM villages WHERE user_id = $1 AND slot_key = $2',
    [userId, slotKey]
  );
}

// Köy state'ini kaydet / güncelle
/**
 * Bir köyü kaydet. Çoklu köyde `slotKey` ZORUNLU: hangi köy olduğunu o
 * belirliyor. TOWER_SLOTS ve PRODUCTION_RING_1 Set/Array olduğu için
 * JSON'a yazarken diziye çevrilir.
 */
async function saveVillage(userId, slotKey, state) {
  if (!slotKey) throw new Error('saveVillage: slotKey zorunlu (çoklu köy)');
  const serializable = {
    ...state,
    TOWER_SLOTS: [...state.TOWER_SLOTS],
    PRODUCTION_RING_1: [...state.PRODUCTION_RING_1],
  };
  await pool.query(
    `INSERT INTO villages (user_id, slot_key, state, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, slot_key) DO UPDATE
     SET state = $3, updated_at = NOW()`,
    [userId, slotKey, JSON.stringify(serializable)]
  );
}

// Tüm köyleri yükle (sunucu başlangıcında offline catch-up için)
/** Tüm oyuncu köyleri (açılışta offline telafi için) — köy başına bir satır */
async function loadAllVillages() {
  const res = await pool.query(
    'SELECT user_id, slot_key, village_name, is_capital, state, updated_at FROM villages'
  );
  // Yer tutucu satırlar (slot alınmış ama köy henüz kaydedilmemiş) atlanır
  return res.rows
    .filter(row => realState(row.state))
    .map(row => ({
      userId: row.user_id,
      slotKey: row.slot_key,
      name: row.village_name,
      isCapital: !!row.is_capital,
      state: row.state,
      updatedAt: row.updated_at,
    }));
}

module.exports = {
  pool, initDB, createUser, findUserByEmail, findUserById,
  loadVillage, loadVillages, saveVillage, loadAllVillages,
  setCapital, deleteVillage,
  loadNpcVillages, saveNpcVillages, loadPlayerSlots, setPlayerSlot,
};
