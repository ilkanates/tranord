/**
 * DEV — PostgreSQL yerine bellek içi + JSON dosya kalıcılığı.
 * db.js ile aynı arayüzü sunar; index.dev.js bunu './db' yerine enjekte eder.
 * Veri: server/.dev-data.json  (sil → her şey sıfırlanır)
 */
const fs   = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '.dev-data.json');

let db = { users: [], villages: {}, world: {}, playerSlots: {}, nextUserId: 1 };

function load() {
  try {
    if (fs.existsSync(FILE)) {
      db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      db.users ||= [];
      db.villages ||= {};
      db.world ||= {};
      db.playerSlots ||= {};
      db.nextUserId ||= db.users.length + 1;
    }
  } catch (err) {
    console.warn('[DEV DB] .dev-data.json okunamadi, sifirdan baslaniyor:', err.message);
  }
}

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(FILE, JSON.stringify(db)); }
    catch (err) { console.error('[DEV DB] yazma hatasi:', err.message); }
  }, 400);
}

async function initDB() {
  load();
  console.log(`[DEV DB] Hazir - ${db.users.length} kullanici, ${Object.keys(db.villages).length} koy, ${Object.keys(db.world).length} NPC`);
}

async function createUser(email, passwordHash) {
  const user = {
    id: db.nextUserId++,
    email: email.toLowerCase().trim(),
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
  };
  db.users.push(user);
  persist();
  return { id: user.id, email: user.email };
}

async function findUserByEmail(email) {
  return db.users.find(u => u.email === email.toLowerCase().trim()) || null;
}

async function findUserById(id) {
  const u = db.users.find(x => x.id === Number(id));
  return u ? { id: u.id, email: u.email } : null;
}

/**
 * DERİN KOPYA — çağıran taraf saklanan nesneyi DEĞİŞTİREBİLİR.
 *
 * Eskiden saklanan nesne doğrudan döndürülüyordu; hydrateVillage gelen nesneyi
 * yerinde değiştirdiği için TOWER_SLOTS deposun İÇİNDE Set'e dönüyor, sonraki
 * persist() de onu JSON'a `{}` olarak yazıyordu. Kayıt yolundaki
 * "TOWER_SLOTS is not iterable" hatasının kaynağı buydu. Postgres tarafında
 * bu olmuyor (JSON.parse her seferinde yeni nesne verir); dev deposu da artık
 * aynı sözleşmeye uyuyor.
 */
const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));

async function loadVillage(userId) {
  return clone(db.villages[userId]?.state) || null;
}

function serialize(state) {
  const towers = state.TOWER_SLOTS instanceof Set || Array.isArray(state.TOWER_SLOTS)
    ? [...state.TOWER_SLOTS] : [];
  return JSON.parse(JSON.stringify({
    ...state,
    TOWER_SLOTS: towers,
    PRODUCTION_RING_1: [...state.PRODUCTION_RING_1],
  }));
}

async function saveVillage(userId, state) {
  db.villages[userId] = { state: serialize(state), updated_at: new Date().toISOString() };
  persist();
}

async function loadAllVillages() {
  return Object.entries(db.villages).map(([userId, row]) => ({
    userId: Number(userId),
    state: clone(row.state),
    updatedAt: new Date(row.updated_at),
  }));
}

// ─── Dünya haritası ────────────────────────────────────────────────

async function loadNpcVillages() {
  return Object.entries(db.world).map(([slotKey, row]) => ({
    slotKey, q: row.q, r: row.r, tier: row.tier, name: row.name, state: clone(row.state),
    updatedAt: new Date(row.updated_at || Date.now()),
  }));
}

async function saveNpcVillages(list) {
  for (const n of list) {
    db.world[n.slotKey] = {
      q: n.q, r: n.r, tier: n.tier, name: n.name,
      state: serialize(n.state),
      updated_at: new Date().toISOString(),
    };
  }
  persist();
}

async function loadPlayerSlots() {
  return Object.entries(db.playerSlots).map(([userId, row]) => {
    const u = db.users.find(x => x.id === Number(userId));
    return { userId: Number(userId), slotKey: row.slotKey, name: row.name, email: u?.email || '' };
  });
}

async function setPlayerSlot(userId, slotKey, name) {
  db.playerSlots[userId] = { slotKey, name };
  persist();
}

const pool = { query: async () => { throw new Error('[DEV DB] dogrudan SQL desteklenmiyor'); } };

module.exports = {
  pool, initDB, createUser, findUserByEmail, findUserById,
  loadVillage, saveVillage, loadAllVillages,
  loadNpcVillages, saveNpcVillages, loadPlayerSlots, setPlayerSlot,
};
