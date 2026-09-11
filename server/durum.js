/**
 * ÇALIŞMA ZAMANI DURUMU — sunucunun bellekteki iki tekili.
 *
 * server/index.js'ten AYNEN taşındı. Sebep: index.js'i bölerken her parça
 * bu ikisine bakıyor (WORLD 100'den fazla yerde). Onlar index.js içinde
 * kaldıkça hiçbir şey dışarı çıkamıyordu — modüller index.js'i require
 * edemez, çünkü index.js sunucuyu ayağa kaldıran giriş noktası.
 *
 * İkisi de yalnızca MUTASYONA uğruyor, hiç yeniden atanmıyor. Bu yüzden
 * modülden alınan referans her yerde aynı nesneyi gösteriyor ve taşıma
 * çağrı yerlerinin hiçbirini değiştirmedi.
 *
 * DİKKAT: buraya require('./index') KOYMA — döngüsel bağımlılık olur.
 * Bu modül hiçbir şey bilmemeli, yalnızca durumu tutmalı.
 */

// Per-user state: userId -> { village, tickMs, nextTickAt, socketId, dirty }
const userSessions = new Map();

// ═══════════════════════════════════════════════════════════════════
//  DÜNYA — tek ortak harita, NPC köyleri gerçek motorla yaşar
// ═══════════════════════════════════════════════════════════════════
const WORLD = {
  slots: [],                 // tüm köy slotları (deterministik üretilir)
  slotByKey: new Map(),
  npcs: new Map(),           // slotKey -> { slot, village }
  playerBySlot: new Map(),   // slotKey -> { userId, email, name }  (name = KÖY adı)
  slotByUser: new Map(),     // userId  -> MERKEZ (ya da ilk) slotKey
  slotsByUser: new Map(),    // userId  -> Set<slotKey>  (çoklu köy)
  /**
   * OYUNCU ADLARI — userId -> görünen ad.
   *
   * Köy adı ile oyuncu adı AYRI şeyler; eskiden karışıyorlardı ve yeni
   * oyuncunun köyüne e-postasının @ öncesi ad olarak veriliyordu. Köy adı
   * artık slotun kendi Nordic adı, oyuncu adı da burada.
   */
  ownerByUser: new Map(),
  npcTick: 0,
  /**
   * KİRLİ NPC'LER — yalnız bunlar diske yazılır.
   *
   * Eskiden tek bir `dirty` bayrağı vardı ve her tick true olduğu için 60
   * saniyede 200 köyün TAMAMI yazılıyordu (yerelde 1.6 MB, günde ~1 GB).
   * Kaynak birikmesi için kayıt gerekmiyor: açılışta her köy kendi kayıt
   * zamanına göre telafi ediliyor, yani eksik kalan üretim yeniden
   * hesaplanıyor. Bu yüzden yalnız YAPISAL olaylar işaretlenir — yapay zekâ
   * turu, sefer başlangıcı/varışı/dönüşü ve yeni tohumlanan köy.
   */
  dirtyNpcs: new Set(),
  /**
   * DÜNYA HIZI — üst bardaki çubuk bunu ayarlar. Oyuncu köyü, NPC'ler ve
   * SEFERLER aynı çarpanla akar; aksi hâlde ekonomi 128× koşarken ordular
   * gerçek zamanda sürünür ve saldırı denemek imkânsız olurdu.
   */
  speed: 1,
};

/**
 * KİRLİ İŞARETLEYİCİLER — "bunu diske yazmayı unutma".
 *
 * Durumun yanında duruyorlar çünkü tek yaptıkları o durumu işaretlemek;
 * index.js'te kalsalardı seferleri tarayan modül onlar için index.js'i
 * require etmek zorunda kalırdı (döngüsel bağımlılık).
 */
function markNpcDirty(slotKey) {
  if (slotKey) WORLD.dirtyNpcs.add(slotKey);
}

/**
 * Oyuncunun bir köyünü kirlet. `slotKey` verilmezse (eski çağrı yerleri)
 * bütün köyleri işaretlenir — kaydetmek zararsız, kaydetmemek veri kaybı.
 */
function markUserDirty(userId, slotKey = null) {
  const s = userSessions.get(userId);
  if (!s) return;
  if (slotKey && s.villages.has(slotKey)) s.dirtySlots.add(slotKey);
  else for (const k of s.villages.keys()) s.dirtySlots.add(k);
}

module.exports = { userSessions, WORLD, markNpcDirty, markUserDirty };
