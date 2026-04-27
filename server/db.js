/**
 * PostgreSQL bağlantı havuzu
 * Railway'de DATABASE_URL env variable otomatik set edilir.
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost')
    ? false
    : { rejectUnauthorized: false }
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
async function loadVillage(userId) {
  const res = await pool.query(
    'SELECT state FROM villages WHERE user_id = $1',
    [userId]
  );
  return res.rows[0]?.state || null;
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

module.exports = { pool, initDB, createUser, findUserByEmail, findUserById, loadVillage, saveVillage };
