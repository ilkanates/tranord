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

/**
 * BOŞ ŞEMA — TEK KAYNAK.
 *
 * Hem dosya yokken başlangıç değeri, hem dosya varken eksik alanların
 * tamamlayıcısı. İki ayrı listede tutulurken ayrıştı: birlik tabloları
 * yalnız ikinci listede vardı ve dosyasız açılışta `loadAlliances()`
 * tanımsız diziye `.map` çağırıyordu.
 */
const BOS_DB = () => ({
  users: [], villages: {}, world: {}, playerSlots: {}, nextUserId: 1,
  // Mesajlaşma — db.js'teki messages / message_blocks tablolarının karşılığı
  messages: [], nextMessageId: 1, blocks: [],
  // Grup mesajlaşması — message_threads / thread_members / thread_messages
  threads: [], threadMembers: [], threadMessages: [],
  nextThreadId: 1, nextThreadMessageId: 1,
  // Birlik — alliances / alliance_members / alliance_invites
  alliances: [], allianceMembers: [], allianceInvites: [],
  nextAllianceId: 1, nextInviteId: 1,
  // Haritada elle verilen oyuncu işaretleri
  playerMarks: [],
  // Birlik profili, günlüğü ve diplomasisi
  allianceLog: [], allianceDiplomacy: [],
  nextAllianceLogId: 1, nextDiplomacyId: 1,
  // Açık artırma — db.js'teki auctions tablosunun karşılığı
  auctions: [], nextAuctionId: 1,
});

let db = BOS_DB();

function load() {
  try {
    if (fs.existsSync(FILE)) {
      /*
        EKSİK ALANLAR BOŞ ŞEMADAN TAMAMLANIYOR: eski bir kayıt dosyası
        yeni tabloları bilmiyor. Tek tek yazmak yerine şemadan almak,
        yeni tablo eklerken burayı güncellemeyi unutmayı imkânsız
        kılıyor — nitekim birlik tabloları tam tersi yönde unutulmuştu.
      */
      db = { ...BOS_DB(), ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
      // Sayaçlar mevcut en büyük kimliğin üstünden devam etmeli
      const sonra = (liste) => liste.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
      db.nextUserId = Math.max(db.nextUserId || 1, db.users.length + 1);
      db.nextMessageId = Math.max(db.nextMessageId || 1, sonra(db.messages));
      db.nextThreadId = Math.max(db.nextThreadId || 1, sonra(db.threads));
      db.nextThreadMessageId =
        Math.max(db.nextThreadMessageId || 1, sonra(db.threadMessages));
      db.nextAllianceId = Math.max(db.nextAllianceId || 1, sonra(db.alliances));
      db.nextInviteId = Math.max(db.nextInviteId || 1, sonra(db.allianceInvites));
      db.nextAllianceLogId = Math.max(db.nextAllianceLogId || 1, sonra(db.allianceLog));
      db.nextDiplomacyId = Math.max(db.nextDiplomacyId || 1, sonra(db.allianceDiplomacy));
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

/** db.js ile aynı sözleşme — çakışmada { hata: 'email' | 'ad' } */
async function createUser(email, passwordHash, displayName = null) {
  const mail = email.toLowerCase().trim();
  if (db.users.some(u => u.email === mail)) return { hata: 'email' };
  if (displayName) {
    const alinan = String(displayName).toLocaleLowerCase('tr');
    if (db.users.some(u => String(u.display_name || '').toLocaleLowerCase('tr') === alinan)) {
      return { hata: 'ad' };
    }
  }
  const user = {
    id: db.nextUserId++,
    email: mail,
    password_hash: passwordHash,
    display_name: displayName || null,
    created_at: new Date().toISOString(),
  };
  db.users.push(user);
  persist();
  return { id: user.id, email: user.email, display_name: user.display_name };
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

/** Admin paneli için oyuncu listesi — şifre özeti dışarıda (bkz. db.js) */
async function listPlayers() {
  return db.users.map(u => ({
    id: u.id, email: u.email, display_name: u.display_name || null,
    village_count: Object.keys(db.villages[u.id] || {}).length,
  }));
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

/**
 * HESABI TAMAMEN SİL — son köyü de düşen oyuncu oyundan çıkar.
 * Üretimdeki db.js ile aynı sözleşme (bkz. oradaki gerekçe).
 */
async function deleteUser(userId) {
  delete db.villages[userId];
  delete db.playerSlots[userId];
  db.users = (db.users || []).filter(u => u.id !== Number(userId));
  db.messages = (db.messages || []).filter(
    m => m.from_user_id !== Number(userId) && m.to_user_id !== Number(userId));
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

/** Bütün NPC köylerini sil — yalnız `world` bölümü (bkz. db.js) */
async function deleteAllNpcVillages() {
  const adet = Object.keys(db.world || {}).length;
  db.world = {};
  persist();
  return adet;
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

// ═══════════════════════════════════════════════════════════════════
//  MESAJLAŞMA — db.js ile AYNI sözleşme
// ═══════════════════════════════════════════════════════════════════

async function findUserByDisplayName(name) {
  const aranan = String(name || '').trim().toLocaleLowerCase('tr');
  const u = db.users.find(
    x => String(x.display_name || '').toLocaleLowerCase('tr') === aranan);
  return u ? { id: u.id, email: u.email, display_name: u.display_name } : null;
}

async function mesajYaz({ fromUserId, toUserId, konu, govde }) {
  const m = {
    id: db.nextMessageId++,
    from_user_id: Number(fromUserId), to_user_id: Number(toUserId),
    konu, govde, at: new Date().toISOString(),
    okundu_at: null, gonderen_sildi: false, alan_sildi: false,
  };
  db.messages.push(m);
  persist();
  return { id: m.id, at: m.at };
}

const adiniBul = (id) => db.users.find(u => u.id === Number(id))?.display_name || null;

async function mesajKutusu(userId, { limit = 300 } = {}) {
  const uid = Number(userId);
  return db.messages
    .filter(m => (m.to_user_id === uid && !m.alan_sildi)
      || (m.from_user_id === uid && !m.gonderen_sildi))
    .sort((a, b) => b.id - a.id)
    .slice(0, Math.min(500, Math.max(1, limit)))
    .map(m => {
      const benden = m.from_user_id === uid;
      return {
        id: m.id, konu: m.konu, govde: m.govde,
        at: m.at, okundu: !!m.okundu_at, benden,
        karsiAd: adiniBul(benden ? m.to_user_id : m.from_user_id),
      };
    });
}

async function mesajOkunmamisSayisi(userId) {
  const uid = Number(userId);
  return db.messages.filter(
    m => m.to_user_id === uid && !m.okundu_at && !m.alan_sildi).length;
}

async function mesajOkundu(userId, id) {
  const m = db.messages.find(x => x.id === Number(id) && x.to_user_id === Number(userId));
  if (!m || m.okundu_at) return false;
  m.okundu_at = new Date().toISOString();
  persist();
  return true;
}

async function mesajSil(userId, id) {
  const uid = Number(userId);
  const m = db.messages.find(x => x.id === Number(id));
  if (!m || (m.to_user_id !== uid && m.from_user_id !== uid)) return false;
  if (m.to_user_id === uid) m.alan_sildi = true;
  if (m.from_user_id === uid) m.gonderen_sildi = true;
  persist();
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  GRUP MESAJLAŞMASI — db.js ile AYNI sözleşme
// ═══════════════════════════════════════════════════════════════

async function grupKur({ konu, tip, kurucuId, allianceId = null, uyeIdler = [] }) {
  const t = {
    id: db.nextThreadId++, konu, tip,
    kurucu_user_id: Number(kurucuId),
    alliance_id: allianceId == null ? null : Number(allianceId),
    at: new Date().toISOString(),
  };
  db.threads.push(t);
  /*
    BİRLİK GRUBU ÜYE SATIRI YAZMIYOR: katılımcı birliğin o anki üyeleri.
    Kuruluşta kopyalansaydı birlikten atılan biri yazışmayı okumaya
    devam ederdi.
  */
  if (tip === 'ozel') {
    for (const uid of new Set([Number(kurucuId), ...uyeIdler.map(Number)])) {
      db.threadMembers.push({ thread_id: t.id, user_id: uid, okundu_id: 0 });
    }
  }
  persist();
  return { id: t.id, at: t.at };
}

const grupSatiri = (t) => ({
  id: t.id, konu: t.konu, tip: t.tip,
  kurucuId: t.kurucu_user_id, birlikId: t.alliance_id, at: t.at,
});

async function grupBul(threadId) {
  const t = db.threads.find(x => x.id === Number(threadId));
  if (!t) return null;
  const uyeler = db.threadMembers.filter(m => m.thread_id === t.id);
  return {
    ...grupSatiri(t),
    uyeIdler: uyeler.map(m => m.user_id),
    okunduIdler: Object.fromEntries(uyeler.map(m => [m.user_id, m.okundu_id || 0])),
  };
}

async function gruplarim(userId, allianceId = null) {
  const uid = Number(userId);
  const bid = allianceId == null ? null : Number(allianceId);
  return db.threads
    .filter(t => db.threadMembers.some(m => m.thread_id === t.id && m.user_id === uid)
      || (t.tip === 'birlik' && t.alliance_id != null && t.alliance_id === bid))
    .map(t => {
      const okunduId = db.threadMembers.find(
        m => m.thread_id === t.id && m.user_id === uid)?.okundu_id || 0;
      const akis = db.threadMessages
        .filter(m => m.thread_id === t.id).sort((a, b) => a.id - b.id);
      const son = akis[akis.length - 1] || null;
      return {
        ...grupSatiri(t),
        okunduId,
        /* Kendi yazdığım mesaj bana okunmamış görünmemeli */
        okunmamis: akis.filter(m => m.id > okunduId && m.from_user_id !== uid).length,
        son: son ? {
          id: son.id, govde: son.govde, at: son.at,
          userId: son.from_user_id, ad: adiniBul(son.from_user_id),
        } : null,
      };
    })
    // En son konuşulan üstte — boş grup en altta
    .sort((a, b) => (b.son?.id || 0) - (a.son?.id || 0) || b.id - a.id);
}

async function grupUyeleri(threadId) {
  return db.threadMembers
    .filter(m => m.thread_id === Number(threadId))
    .map(m => ({ userId: m.user_id, ad: adiniBul(m.user_id) }));
}

async function grupMesajYaz({ threadId, fromUserId, govde }) {
  const m = {
    id: db.nextThreadMessageId++, thread_id: Number(threadId),
    from_user_id: Number(fromUserId), govde, at: new Date().toISOString(),
  };
  db.threadMessages.push(m);
  persist();
  return { id: m.id, at: m.at };
}

async function grupAkisi(threadId, { limit = 200 } = {}) {
  return db.threadMessages
    .filter(m => m.thread_id === Number(threadId))
    .sort((a, b) => a.id - b.id)
    .slice(-Math.min(500, Math.max(1, limit)))
    .map(m => ({
      id: m.id, userId: m.from_user_id, ad: adiniBul(m.from_user_id),
      govde: m.govde, at: m.at,
    }));
}

async function grupOkundu(threadId, userId, sonId) {
  const tid = Number(threadId), uid = Number(userId);
  let m = db.threadMembers.find(x => x.thread_id === tid && x.user_id === uid);
  if (!m) {
    /* Birlik grubunda üye satırı yok; okundu kaydı için ilk okumada açılıyor */
    m = { thread_id: tid, user_id: uid, okundu_id: 0 };
    db.threadMembers.push(m);
  }
  // Geri gitmesin: birkaç sekme açıkken eski kimlik gelebiliyor
  m.okundu_id = Math.max(m.okundu_id || 0, Number(sonId) || 0);
  persist();
  return true;
}

async function grupAyril(threadId, userId) {
  const n = db.threadMembers.length;
  db.threadMembers = db.threadMembers.filter(
    m => !(m.thread_id === Number(threadId) && m.user_id === Number(userId)));
  persist();
  return db.threadMembers.length < n;
}

async function grupSil(threadId) {
  const tid = Number(threadId);
  db.threads = db.threads.filter(t => t.id !== tid);
  db.threadMembers = db.threadMembers.filter(m => m.thread_id !== tid);
  db.threadMessages = db.threadMessages.filter(m => m.thread_id !== tid);
  persist();
  return true;
}

async function engelEkle(userId, blockedId) {
  const u = Number(userId), b = Number(blockedId);
  if (!db.blocks.some(x => x.user_id === u && x.blocked_id === b)) {
    db.blocks.push({ user_id: u, blocked_id: b, at: new Date().toISOString() });
    persist();
  }
}
async function engelKaldir(userId, blockedId) {
  const n = db.blocks.length;
  db.blocks = db.blocks.filter(
    x => !(x.user_id === Number(userId) && x.blocked_id === Number(blockedId)));
  if (db.blocks.length !== n) persist();
}
async function engelListesi(userId) {
  return db.blocks
    .filter(x => x.user_id === Number(userId))
    .map(x => ({ userId: x.blocked_id, ad: adiniBul(x.blocked_id) }));
}
async function engelliMi(userId, otherId) {
  return db.blocks.some(
    x => x.user_id === Number(userId) && x.blocked_id === Number(otherId));
}

// ── Birlik ─────────────────────────────────────────────────────────

const kucuk = (x) => String(x || '').trim().toLocaleLowerCase('tr');

async function loadAlliances() {
  return {
    birlikler: db.alliances.map(a => ({
      id: a.id, ad: a.ad, amblem: a.amblem, kurucu_id: a.kurucu_id,
      /* Açıklama db.js sürümünde de yükleniyor — ikisi ayrışmamalı */
      aciklama: a.aciklama || '',
    })),
    uyeler: db.allianceMembers.map(m => ({
      alliance_id: m.alliance_id, user_id: m.user_id, rutbe: m.rutbe,
    })),
    davetler: db.allianceInvites.map(i => ({
      id: i.id, alliance_id: i.alliance_id, user_id: i.user_id,
      davet_eden: i.davet_eden,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════
//  BİRLİK: PROFİL, GÜNLÜK, DİPLOMASİ — db.js ile AYNI sözleşme
// ═══════════════════════════════════════════════════════════════

async function isaretleriOku(userId) {
  const uid = Number(userId);
  return Object.fromEntries(db.playerMarks
    .filter(m => m.user_id === uid)
    .map(m => [m.hedef_ad, m.renk]));
}

async function isaretYaz(userId, hedefAd, renk) {
  const uid = Number(userId);
  db.playerMarks = db.playerMarks.filter(
    m => !(m.user_id === uid && m.hedef_ad === hedefAd));
  /* Renk boşsa işaret kalkıyor — ayrı bir "kaldır" olayı olmasın */
  if (renk) db.playerMarks.push({ user_id: uid, hedef_ad: hedefAd, renk });
  persist();
  return true;
}

async function birlikAciklama(allianceId, aciklama) {
  const a = db.alliances.find(x => x.id === Number(allianceId));
  if (a) { a.aciklama = aciklama; persist(); }
  return true;
}

async function gunlukYaz({ allianceId, tur, metin, userId = null }) {
  const k = {
    id: db.nextAllianceLogId++, alliance_id: Number(allianceId),
    tur, metin, user_id: userId == null ? null : Number(userId),
    at: new Date().toISOString(),
  };
  db.allianceLog.push(k);
  persist();
  return { id: k.id, at: k.at };
}

async function gunlukOku(allianceId, { limit = 40 } = {}) {
  return db.allianceLog
    .filter(k => k.alliance_id === Number(allianceId))
    .sort((a, b) => b.id - a.id)
    .slice(0, Math.min(200, Math.max(1, limit)))
    .map(k => ({ id: k.id, tur: k.tur, metin: k.metin, userId: k.user_id, at: k.at }));
}

/** Çift normalleştirme — küçük kimlik her zaman a_id */
const ciftle = (x, y) => (Number(x) < Number(y)
  ? { a: Number(x), b: Number(y) } : { a: Number(y), b: Number(x) });

const satirDiplomasi = (r) => ({
  id: r.id, aId: r.a_id, bId: r.b_id, tur: r.tur, durum: r.durum,
  teklifEdenId: r.teklif_eden_id, at: r.at,
});

const diplomasiBul = (x, y) => {
  const { a, b } = ciftle(x, y);
  return db.allianceDiplomacy.find(d => d.a_id === a && d.b_id === b) || null;
};

async function diplomasiYaz({ birlikA, birlikB, tur, durum, teklifEdenId }) {
  const { a, b } = ciftle(birlikA, birlikB);
  let d = diplomasiBul(a, b);
  /* Çift başına TEK satır: yeni ilişki eskisinin yerine geçiyor */
  if (!d) {
    d = { id: db.nextDiplomacyId++, a_id: a, b_id: b };
    db.allianceDiplomacy.push(d);
  }
  d.tur = tur; d.durum = durum;
  d.teklif_eden_id = Number(teklifEdenId);
  d.at = new Date().toISOString();
  persist();
  return { id: d.id, at: d.at };
}

async function diplomasiDurum(birlikA, birlikB) {
  const d = diplomasiBul(birlikA, birlikB);
  return d ? satirDiplomasi(d) : null;
}

async function diplomasiListesi(allianceId) {
  const id = Number(allianceId);
  const adOku = (aid) => db.alliances.find(x => x.id === aid) || {};
  return db.allianceDiplomacy
    .filter(d => d.a_id === id || d.b_id === id)
    .sort((x, y) => y.id - x.id)
    .map(d => {
      const benA = d.a_id === id;
      const oteki = adOku(benA ? d.b_id : d.a_id);
      return {
        ...satirDiplomasi(d),
        otekiId: benA ? d.b_id : d.a_id,
        otekiAd: oteki.ad || null,
        otekiAmblem: oteki.amblem || null,
      };
    });
}

async function diplomasiSil(birlikA, birlikB) {
  const { a, b } = ciftle(birlikA, birlikB);
  const n = db.allianceDiplomacy.length;
  db.allianceDiplomacy = db.allianceDiplomacy.filter(
    d => !(d.a_id === a && d.b_id === b));
  persist();
  return db.allianceDiplomacy.length < n;
}

async function birlikKur({ ad, amblem, kurucuId }) {
  if (db.alliances.some(a => kucuk(a.ad) === kucuk(ad))) return { hata: 'ad_alinmis' };
  const id = db.nextAllianceId++;
  db.alliances.push({ id, ad, amblem, kurucu_id: Number(kurucuId) });
  db.allianceMembers.push({ alliance_id: id, user_id: Number(kurucuId), rutbe: 'konung' });
  persist();
  return { id };
}

async function birlikSil(allianceId) {
  const id = Number(allianceId);
  db.alliances = db.alliances.filter(a => a.id !== id);
  db.allianceMembers = db.allianceMembers.filter(m => m.alliance_id !== id);
  db.allianceInvites = db.allianceInvites.filter(i => i.alliance_id !== id);
  persist();
}

async function birlikAdDegistir(allianceId, ad, amblem) {
  const id = Number(allianceId);
  if (db.alliances.some(a => a.id !== id && kucuk(a.ad) === kucuk(ad))) {
    return { hata: 'ad_alinmis' };
  }
  const a = db.alliances.find(x => x.id === id);
  if (a) { a.ad = ad; a.amblem = amblem; persist(); }
  return {};
}

async function uyeEkle(allianceId, userId, rutbe = 'karl') {
  const uid = Number(userId);
  if (db.allianceMembers.some(m => m.user_id === uid)) return { hata: 'zaten_birlikte' };
  db.allianceMembers.push({ alliance_id: Number(allianceId), user_id: uid, rutbe });
  persist();
  return {};
}

async function uyeCikar(userId) {
  const uid = Number(userId);
  db.allianceMembers = db.allianceMembers.filter(m => m.user_id !== uid);
  persist();
}

async function uyeRutbe(userId, rutbe) {
  const m = db.allianceMembers.find(x => x.user_id === Number(userId));
  if (m) { m.rutbe = rutbe; persist(); }
}

async function davetYaz(allianceId, userId, davetEden) {
  const aid = Number(allianceId), uid = Number(userId);
  if (db.allianceInvites.some(i => i.alliance_id === aid && i.user_id === uid)) {
    return { hata: 'zaten_davetli' };
  }
  db.allianceInvites.push({
    id: db.nextInviteId++, alliance_id: aid, user_id: uid,
    davet_eden: Number(davetEden) || null,
  });
  persist();
  return {};
}

async function davetSil(allianceId, userId) {
  const aid = Number(allianceId), uid = Number(userId);
  db.allianceInvites = db.allianceInvites.filter(
    i => !(i.alliance_id === aid && i.user_id === uid));
  persist();
}

async function davetleriTemizle(userId) {
  const uid = Number(userId);
  db.allianceInvites = db.allianceInvites.filter(i => i.user_id !== uid);
  persist();
}

/**
 * DÜNYANIN BAŞLANGICI — ilk hesabın açılış anı (ms).
 *
 * PostgreSQL sürümüyle AYNI sözleşme (bkz. db.js · ilkKayitZamani):
 * ikisinin ayrışması bu projede defalarca patladı, o yüzden
 * db-ikizleri.test.js ikisini karşılaştırıyor.
 */
async function ilkKayitZamani() {
  let ilk = null;
  for (const u of db.users) {
    const t = u.created_at ? new Date(u.created_at).getTime() : null;
    if (t && (ilk === null || t < ilk)) ilk = t;
  }
  return ilk;
}

/* ── AÇIK ARTIRMA ─────────────────────────────────────────────── */

/*
  db.js'teki auctions tablosunun karşılığı. Alan ADLARI burada zaten
  istemci biçiminde (camelCase) — PostgreSQL sürümü satırı `satirIlan`
  ile çeviriyor. Önemli olan İKİSİNİN AYNI ŞEKLİ döndürmesi; bu projede
  iki sürümün ayrışması defalarca patladı (bkz. db-ikizleri.test.js).
*/
const ilanKopya = (x) => ({ ...x });

async function ilanAc(ilan) {
  const kayit = {
    id: db.nextAuctionId++,
    saticiId: Number(ilan.saticiId),
    key: ilan.key, nadirlik: ilan.nadirlik, seviye: ilan.seviye,
    taban: ilan.taban, teklif: 0, teklifVerenId: null,
    baslangic: ilan.baslangic, bitis: ilan.bitis, bitti: false,
  };
  db.auctions.push(kayit);
  persist();
  return ilanKopya(kayit);
}

async function ilanlar({ limit = 60 } = {}) {
  return db.auctions
    .filter(a => !a.bitti)
    .sort((a, b) => a.bitis - b.bitis)
    .slice(0, Math.min(200, Math.max(1, limit)))
    .map(ilanKopya);
}

async function ilanBul(id) {
  const a = db.auctions.find(x => x.id === Number(id));
  return a ? ilanKopya(a) : null;
}

/* Koşullu yazma — PostgreSQL sürümündeki WHERE teklif = $5 ile aynı iş */
async function teklifYaz(id, { teklif, teklifVerenId, bitis, oncekiTeklif }) {
  const a = db.auctions.find(x => x.id === Number(id));
  if (!a || a.bitti || a.teklif !== oncekiTeklif) return null;
  a.teklif = teklif; a.teklifVerenId = Number(teklifVerenId); a.bitis = bitis;
  persist();
  return ilanKopya(a);
}

async function bitenIlanlar(simdi) {
  return db.auctions
    .filter(a => !a.bitti && a.bitis <= simdi)
    .sort((a, b) => a.id - b.id)
    .map(ilanKopya);
}

async function ilanKapat(id) {
  const a = db.auctions.find(x => x.id === Number(id));
  if (!a || a.bitti) return false;
  a.bitti = true;
  persist();
  return true;
}

module.exports = {
  ilkKayitZamani,
  ilanAc, ilanlar, ilanBul, teklifYaz, bitenIlanlar, ilanKapat,
  grupKur, grupBul, gruplarim, grupUyeleri, grupMesajYaz, grupAkisi,
  grupOkundu, grupAyril, grupSil,
  birlikAciklama, gunlukYaz, gunlukOku, isaretleriOku, isaretYaz,
  diplomasiYaz, diplomasiDurum, diplomasiListesi, diplomasiSil,
  loadAlliances, birlikKur, birlikSil, birlikAdDegistir,
  uyeEkle, uyeCikar, uyeRutbe, davetYaz, davetSil, davetleriTemizle,
  pool, initDB, createUser, findUserByEmail, findUserById,
  findUserByDisplayName, mesajYaz, mesajKutusu, mesajOkunmamisSayisi,
  mesajOkundu, mesajSil, engelEkle, engelKaldir, engelListesi, engelliMi,
  setDisplayName, loadDisplayNames, listPlayers, renameVillage,
  loadVillage, loadVillages, saveVillage, loadAllVillages,
  setCapital, deleteVillage, deleteUser,
  loadNpcVillages, saveNpcVillages, deleteAllNpcVillages, loadPlayerSlots, setPlayerSlot,
};
