/**
 * DEV — PostgreSQL yerine bellek içi + JSON dosya kalıcılığı.
 * db.js ile aynı arayüzü sunar; index.dev.js bunu './db' yerine enjekte eder.
 * Veri: server/.dev-data.json  (sil → her şey sıfırlanır)
 */
const fs   = require('fs');
const path = require('path');

/**
 * VERİ DOSYASI — testler için değiştirilebilir.
 *
 * Yol sabitken otomatik testler geliştiricinin GERÇEK dev dünyasına yazıyordu:
 * test kullanıcıları aynı dosyaya ekleniyor, test köyleri aynı dünyada yer
 * kaplıyor ve testin ortasında kesilen bir kayıt oyuncunun köyünü bozabiliyordu.
 * TRANORD_DEV_DATA verildiğinde test kendi geçici dosyasında koşar.
 */
const FILE = process.env.TRANORD_DEV_DATA
  ? path.resolve(process.env.TRANORD_DEV_DATA)
  : path.join(__dirname, '.dev-data.json');

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
      migrateToMultiVillage();
    }
  } catch (err) {
    console.warn('[DEV DB] .dev-data.json okunamadi, sifirdan baslaniyor:', err.message);
  }
}

/**
 * GÖÇ — tek köyden çoklu köye.
 *
 * Eski biçim:  db.villages[userId]          = { state, updated_at }
 * Yeni biçim:  db.villages[userId][slotKey] = { state, updated_at, name, isCapital }
 *
 * Slot anahtarı eski kayıtta yok; `db.playerSlots[userId].slotKey`'den
 * alınıyor, o da yoksa köyün dünya koordinatından türetiliyor. Tek köy
 * doğal olarak MERKEZ sayılır.
 */
function migrateToMultiVillage() {
  let gocen = 0;
  for (const [userId, row] of Object.entries(db.villages)) {
    if (!row || typeof row !== 'object') continue;
    // Yeni biçim mi? (slot anahtarları '<q>,<r>' şeklinde, altında state var)
    const ilk = Object.values(row)[0];
    if (row.state === undefined && ilk && typeof ilk === 'object' && 'state' in ilk) continue;

    const st = row.state;
    const slotKey = db.playerSlots?.[userId]?.slotKey
      || (st && st.worldQ != null ? `${st.worldQ},${st.worldR}` : null);
    if (!slotKey) {
      console.warn(`[DEV DB] userId=${userId} için slot bulunamadı, köy atlandı`);
      continue;
    }
    db.villages[userId] = {
      [slotKey]: {
        state: st,
        updated_at: row.updated_at || new Date().toISOString(),
        name: db.playerSlots?.[userId]?.name || null,
        isCapital: true,
      },
    };
    gocen++;
  }
  /**
   * Göç bellekte yapılıyor; DİSKE de yazılmalı. Yoksa dosya eski biçimde
   * kalıyor ve göç her açılışta yeniden koşuyor — kısmi bir yazma araya
   * girerse iki biçim karışabilir.
   */
  if (gocen) {
    console.log(`[DEV DB] ${gocen} köy çoklu köy biçimine göç ettirildi`);
    persist();
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
  const koySayisi = Object.values(db.villages)
    .reduce((n, byKoy) => n + Object.keys(byKoy || {}).length, 0);
  console.log(`[DEV DB] Hazir - ${db.users.length} kullanici, ${koySayisi} koy, ${Object.keys(db.world).length} NPC`);
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
  return u ? { id: u.id, email: u.email, display_name: u.display_name || null } : null;
}

/**
 * OYUNCU ADI — db.js ile aynı sözleşme: ad başkasındaysa `null` döner.
 * Karşılaştırma BÜYÜK/küçük harf duyarsız (canlıdaki lower() dizini gibi).
 */
async function setDisplayName(userId, name) {
  const alinan = String(name).toLocaleLowerCase('tr');
  const carpisma = db.users.some(
    u => u.id !== Number(userId)
      && String(u.display_name || '').toLocaleLowerCase('tr') === alinan);
  if (carpisma) return null;
  const u = db.users.find(x => x.id === Number(userId));
  if (!u) return null;
  u.display_name = name;
  persist();
  return { id: u.id, email: u.email, display_name: u.display_name };
}

/** Bütün oyuncu adları (userId -> display_name) */
async function loadDisplayNames() {
  return new Map(db.users.filter(u => u.display_name)
    .map(u => [u.id, u.display_name]));
}

/** Tek köyün adını değiştir */
async function renameVillage(userId, slotKey, name) {
  const row = db.villages[userId]?.[slotKey];
  if (!row) return false;
  row.name = name;
  const slots = normalizeSlots(db.playerSlots[userId]);
  const i = slots.findIndex(x => x.slotKey === slotKey);
  if (i >= 0) { slots[i] = { ...slots[i], name }; db.playerSlots[userId] = slots; }
  persist();
  return true;
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

/** Bir oyuncunun BÜTÜN köyleri — merkez önce, sonra slot anahtarına göre */
async function loadVillages(userId) {
  const byKoy = db.villages[userId] || {};
  return Object.entries(byKoy)
    .map(([slotKey, row]) => ({
      slotKey,
      name: row.name || null,
      isCapital: !!row.isCapital,
      state: clone(row.state) || null,
      updatedAt: new Date(row.updated_at || Date.now()),
    }))
    .sort((a, b) => (b.isCapital - a.isCapital) || a.slotKey.localeCompare(b.slotKey));
}

/** Geriye dönük: tek köy bekleyen çağrı yerleri için merkez/ilk köy */
async function loadVillage(userId) {
  const list = await loadVillages(userId);
  return list.find(x => x.state)?.state || null;
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

async function saveVillage(userId, slotKey, state) {
  if (!slotKey) throw new Error('saveVillage: slotKey zorunlu (çoklu köy)');
  db.villages[userId] ||= {};
  const eski = db.villages[userId][slotKey] || {};
  db.villages[userId][slotKey] = {
    ...eski,
    state: serialize(state),
    updated_at: new Date().toISOString(),
  };
  persist();
}

/** Merkez köyü taşı — oyuncunun yalnız BİR merkezi olabilir */
async function setCapital(userId, slotKey) {
  const byKoy = db.villages[userId] || {};
  for (const [k, row] of Object.entries(byKoy)) row.isCapital = (k === slotKey);
  persist();
}

/** Oyuncunun bir köyünü sil */
async function deleteVillage(userId, slotKey) {
  if (db.villages[userId]) delete db.villages[userId][slotKey];
  persist();
}

/** Tüm oyuncu köyleri — köy başına bir kayıt */
async function loadAllVillages() {
  const out = [];
  for (const [userId, byKoy] of Object.entries(db.villages)) {
    for (const [slotKey, row] of Object.entries(byKoy || {})) {
      if (!row?.state) continue;
      out.push({
        userId: Number(userId),
        slotKey,
        name: row.name || null,
        isCapital: !!row.isCapital,
        state: clone(row.state),
        updatedAt: new Date(row.updated_at || Date.now()),
      });
    }
  }
  return out;
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
  const out = [];
  for (const [userId, row] of Object.entries(db.playerSlots)) {
    const u = db.users.find(x => x.id === Number(userId));
    for (const s of normalizeSlots(row)) {
      out.push({
        userId: Number(userId), slotKey: s.slotKey, name: s.name,
        email: u?.email || '',
        displayName: u?.display_name || null,
        isCapital: !!db.villages[userId]?.[s.slotKey]?.isCapital,
      });
    }
  }
  return out;
}

/**
 * Oyuncuya slot yaz. `playerSlots` ARTIK dizi: bir oyuncunun birden fazla
 * slotu olabiliyor. Eski biçim (tek nesne) okunurken diziye çevriliyor.
 */
async function setPlayerSlot(userId, slotKey, name, isCapital = false) {
  const mevcut = normalizeSlots(db.playerSlots[userId]);
  const i = mevcut.findIndex(x => x.slotKey === slotKey);
  if (i >= 0) mevcut[i] = { ...mevcut[i], name };
  else mevcut.push({ slotKey, name });
  db.playerSlots[userId] = mevcut;

  db.villages[userId] ||= {};
  db.villages[userId][slotKey] ||= { state: null, updated_at: new Date().toISOString() };
  db.villages[userId][slotKey].name = name;
  if (isCapital) {
    for (const [k, row] of Object.entries(db.villages[userId])) row.isCapital = (k === slotKey);
  }
  persist();
}

/** Eski tek-nesne biçimini de kabul et */
function normalizeSlots(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return v.slotKey ? [{ slotKey: v.slotKey, name: v.name }] : [];
}

const pool = { query: async () => { throw new Error('[DEV DB] dogrudan SQL desteklenmiyor'); } };

module.exports = {
  pool, initDB, createUser, findUserByEmail, findUserById,
  setDisplayName, loadDisplayNames, renameVillage,
  loadVillage, loadVillages, saveVillage, loadAllVillages,
  setCapital, deleteVillage,
  loadNpcVillages, saveNpcVillages, loadPlayerSlots, setPlayerSlot,
};
