const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');

const { createVillage, hydrateVillage, civilianCount } = require('./game/villageState');
const { processTick, getUpgradeSeconds, getStorageCaps } = require('./game/tick');
const { simulateBattle } = require('./game/combat');
const ARMY = require('./game/army');
const KUSATMA = require('./game/kusatma');
const HERO = require('./game/kahraman');
const MACERA = require('./game/macera');
const { HERO_ITEMS } = require('./data/heroItemDefs');
const KUSAM = require('./game/kusam');
/** Görev zinciri ve kahraman KÖYE değil HESABA ait — merkez değişince taşınır */
const { hesapKaydiniTasi } = require('./game/hesapKaydi');
const GT = require('./game/gameTime');
const { router: authRouter, verifyToken } = require('./auth');
const { initDB, loadVillages, saveVillage, loadAllVillages, setCapital, deleteVillage,
  deleteUser,
        loadNpcVillages, saveNpcVillages, loadPlayerSlots, setPlayerSlot,
        setDisplayName, loadDisplayNames, renameVillage,
        findUserById, findUserByDisplayName,
        mesajYaz, mesajKutusu, mesajOkunmamisSayisi, mesajOkundu, mesajSil,
        engelEkle, engelKaldir, engelListesi, engelliMi } = require('./db');
const MESAJ = require('./game/mesaj');
const W = require('./game/world');
const { canBuildAt, buildRefusalReason, canBuildProductionAt } = require('./game/insaat');
const { QUEST_BY_ID } = require('./data/questDefs');
const PAZAR = require('./game/pazar');
const IST = require('./game/istatistik');
const PAZAR_YOL = require('./game/pazarYol');
const KUYRUK = require('./game/kuyruk');

/**
 * SİPARİŞ ADEDİ TAVANI — oyun dengesi değil, saçma girdi kapısı.
 *
 * 50'ydi ve gerçek bir sınır gibi davranıyordu: deposu dolu oyuncu bile
 * bir seferde 50'den fazlasını sipariş edemiyordu. Oysa asıl sınır zaten
 * kaynak/ekipman/boş işçi — bedel sipariş anında peşin düşülüyor ve
 * yetmezse sipariş HİÇ girmiyor (bkz. game/kuyruk.js · eksikler).
 *
 * Bu yüzden tavan yalnız uç girdilere karşı duruyor: istemci 1e9 yollarsa
 * `carp` devasa bir bedel üretir, zaten reddedilir — ama kuyrukta tek
 * kalemde milyonluk bir iş oluşup kuyruğun başını sonsuza kilitlemesin.
 * İstemcideki QTY_TAVAN ile AYNI kalmalı (client/src/components/queueUI.jsx).
 */
const ADET_TAVANI = 10000;
const { UNITS_BY_BUILDING } = require('./game/birimler');
const { DEFAULT_TICK_MS, MIN_TICK_MS, MAX_TICK_MS, FULL_SYNC_MS,
        MAX_MARCHES_PER_TOWN, PROTECT_MIN_ARMY } = require('./sabitler');
const { buildPayload } = require('./game/payload');
const { questState, questSync, questTamam, questPayload, questFingerprint,
        egitimGoruldu, egitimBitir } = require('./game/quests');
const { seedNpcVillage, runNpcAi, npcSummary, stepVillage } = require('./game/npcAi');

// Kule de personel alır (arayüzde "okçu" adıyla); sur ve hendek almaz.
const WORKER_ASSIGNABLE_MILITARY = new Set(['silahci', 'zirh', 'ahir', 'kisla', 'atolye', 'kule', 'runSalonu',
  // Göçmen köşk/sarayda eğitiliyor; eğitmen yoksa kuyruk ilerlemez
  'kosk', 'saray']);
const { PRODUCTION_DEFS: BUILDING_DEFS, VILLAGE_DEFS, EQUIPMENT_BY_BUILDING, EQUIPMENT_DEFS, UNIT_DEFS,
        maxPopulationOf, maxLevelOf } = require('./data');
const { equipmentUpgradeCost, EQUIPMENT_MAX_LEVEL } = require('./data/militaryDefs');

// Eğitilebilir birim tabloları game/birimler.js'te.


const app    = express();
const server = http.createServer(app);

/**
 * CORS — üretimde YALNIZCA bilinen istemci adreslerine izin verilir.
 *
 * Eskiden hem Socket.io hem Express `*` kullanıyordu; bu, herhangi bir sitenin
 * tarayıcıdan bu API'ye istek atabilmesi demek. `CLIENT_URL` (virgülle birden
 * fazla verilebilir) tanımlıysa liste ondan kurulur; tanımsız ve üretim değilse
 * yerel geliştirme adresleri açık kalır.
 */
const { IS_PROD, IS_DEV_ENTRY, envReason } = require('./env');
const CULTURE = require('./game/culture');
const DEV_ORIGINS = [
  'http://localhost:5180', 'http://localhost:5173', 'http://localhost:3000',
  'http://127.0.0.1:5180',
];
const ALLOWED_ORIGINS = (process.env.CLIENT_URL || '')
  .split(',').map(s => s.trim()).filter(Boolean);
const ORIGIN_LIST = ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS
  : (IS_PROD ? [] : DEV_ORIGINS);

if (IS_PROD && !ORIGIN_LIST.length) {
  console.warn('[CORS] Üretimde CLIENT_URL tanımlı değil — tarayıcıdan gelen '
    + 'istekler reddedilecek. Railway/Vercel adresini CLIENT_URL olarak ekleyin.');
}

/** Origin izinli mi? (origin yoksa — curl, sunucu-sunucu — serbest) */
function originAllowed(origin) {
  if (!origin) return true;
  return ORIGIN_LIST.includes(origin);
}

const io = new Server(server, {
  cors: { origin: (origin, cb) => cb(null, originAllowed(origin)), methods: ['GET', 'POST'] },
});

app.use(cors({
  origin: (origin, cb) => cb(null, originAllowed(origin)),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use('/auth', authRouter);

// Oturumlar (userId -> session) ve dünya durumu tek yerde: durum.js
const { userSessions, WORLD, markNpcDirty, markUserDirty } = require('./durum');
const { marchingVillages, gelenSeferSayilari } = require('./game/seferTakip');
const { popPerGameHour, getVillageBuildMinutes, getVillageDemolishMinutes, getScaledUpgradeCost,
        expansionFree, settlerCapacity, MAX_BUILDERS } = require('./game/koyKurallari');

/**
 * ÇOKLU KÖY OTURUMU.
 *
 * `villages` bir Map<slotKey, village>; `activeSlot` oyuncunun ekranda
 * hangi köyü gördüğü. Mevcut komut işleyicilerinin tamamı `session.village`
 * ve `session.dirty` üzerinden çalışıyordu — o yüzden bunlar GETTER olarak
 * korunuyor:
 *   • session.village  → aktif köy
 *   • session.dirty    → herhangi bir köy kirli mi (true atamak aktif köyü
 *                        kirletir, false hepsini temizler)
 * Böylece tek köy varsayımıyla yazılmış ~30 çağrı yeri değişmeden doğru
 * çalışıyor; yalnız tick ve kayıt döngüleri bütün köyleri geziyor.
 */
function makeSession(userId, { villages, activeSlot, capitalSlot, tickMs, socketId = null }) {
  const sess = {
    userId,
    villages,
    activeSlot,
    capitalSlot: capitalSlot || activeSlot,
    tickMs,
    nextTickAt: Date.now() + tickMs,
    lastTickAt: Date.now(),
    socketId,
    dirtySlots: new Set(),
  };
  Object.defineProperty(sess, 'village', {
    get() { return sess.villages.get(sess.activeSlot) || null; },
    enumerable: false, configurable: true,
  });
  Object.defineProperty(sess, 'dirty', {
    get() { return sess.dirtySlots.size > 0; },
    set(v) {
      if (v) { if (sess.activeSlot) sess.dirtySlots.add(sess.activeSlot); }
      else sess.dirtySlots.clear();
    },
    enumerable: false, configurable: true,
  });
  return sess;
}

/** Oyuncunun bütün köylerinin kültür puanı toplamı — havuz oyuncuya ait */
function totalCulturePoints(session) {
  let cp = 0;
  for (const v of session.villages.values()) cp += v.culturePoints || 0;
  return cp;
}

/**
 * Oyuncu çapında tek olabilen binalar (şu an yalnız saray) hangi köyde?
 * Boşsa null döner, yani "hiçbir köyde yok, kurulabilir".
 */
function uniqueOwnersOf(session) {
  const tekler = Object.entries(VILLAGE_DEFS)
    .filter(([, d]) => d.oncePerPlayer).map(([k]) => k);
  if (!tekler.length) return {};
  const out = {};
  for (const t of tekler) {
    out[t] = null;
    for (const [slotKey, v] of session.villages) {
      if (Object.values(v.villageBuildings || {}).some(b => b.type === t)) { out[t] = slotKey; break; }
    }
  }
  return out;
}


function villageList(session) {
  const out = [];
  const gelen = gelenSeferSayilari(new Set(session.villages.keys()));
  for (const [slotKey, v] of session.villages) {
    const slot = WORLD.slotByKey.get(slotKey);
    out.push({
      slotKey,
      /*
        Oyuncunun verdiği ad önce gelir (playerBySlot.name), yoksa slotun
        kendi Nordic adı. Eskiden hep slot adı gösteriliyordu; köy adını
        değiştirmek listeye yansımıyordu.
      */
      name: WORLD.playerBySlot.get(slotKey)?.name || slot?.name || slotKey,
      isCapital: slotKey === session.capitalSlot,
      active: slotKey === session.activeSlot,
      population: v.population || 0,
      q: slot?.q ?? v.worldQ ?? 0,
      r: slot?.r ?? v.worldR ?? 0,
      building: Object.values(v.villageBuildings || {}).some(b => b.building),
      starving: !!v.isStarving,
      /**
       * SALDIRI UYARISI — çoklu köyde hayati.
       *
       * Rapor listesi ve gelen sefer uyarısı yalnız AKTİF köyün paketinde
       * gidiyor. Oyuncuya saldırılan köy o an aktif değilse hiçbir şey
       * görmüyordu: ordusu eriyor, kaynağı gidiyor, haberi olmuyor.
       *
       * `incoming`  : şu an bu köye yürüyen düşman sefer sayısı
       * `reportIds` : bu köyün en yeni raporlarının kimlikleri — okunmuş
       *               işareti istemcide (localStorage) tutulduğu için
       *               sayıyı sunucu hesaplayamıyor; kimlikleri verince
       *               istemci okunmamışı köy köy kendisi buluyor.
       */
      incoming: gelen.get(slotKey) || 0,
      reportIds: (v.reports || []).slice(0, 15).map(r => r.id),
    });
  }
  return out.sort((a, b) => (b.isCapital - a.isCapital) || a.slotKey.localeCompare(b.slotKey));
}
const socketToUser  = new Map();

// Paylaşılan sayısal sabitler sabitler.js'te.
// Köy kuralları (nüfus hızı, inşa süresi, yükseltme maliyeti, köy hakkı,
// inşaatçı tavanı) game/koyKurallari.js'e taşındı.


const getVillageBuildSeconds = getVillageBuildMinutes;   // geriye dönük ad



// Görev zinciri game/quests.js'e taşındı — ölçüm, ilerleme ve ödül durumu.





/**
 * SAYISAL GİRDİ SÜZGECİ — istemciden gelen her sayı buradan geçmeli.
 *
 * İşçi sayısı doğrudan Math.min/Math.max'e veriliyordu. NaN geldiğinde
 * (yazı, null, eksik alan, bozuk istemci) sonuç da NaN oluyor ve NaN her
 * karşılaştırmada FALSE döndüğü için bütün korumalar sessizce geçiliyor:
 *     Math.max(0, Math.min(5, NaN))  →  NaN
 *     NaN > freeWorkers              →  false   (koruma devreye girmiyor)
 *     freeWorkers -= NaN             →  freeWorkers artık NaN
 * Oradan sonra köyün bütün sayıları NaN'a dönüyor ve bu hâliyle diske
 * yazılıyor — kurtarılamaz köy.
 *
 * KOMUT KALKANI BUNU YAKALAMAZ: hata fırlamıyor, değer sessizce yayılıyor.
 * Bu yüzden ayrı bir süzgeç gerekiyor.
 *
 * Math.floor ayrıca kesirli işçiyi de eliyor: 2,7 işçi hiçbir zaman
 * anlamlı değildi ama eski koşullar (workers < 1) onu geçiriyordu.
 */
function sayi(ham, { enAz = 0, enCok = Number.MAX_SAFE_INTEGER, yoksa = 0 } = {}) {
  const n = Math.floor(Number(ham));
  if (!Number.isFinite(n)) return yoksa;
  return Math.max(enAz, Math.min(enCok, n));
}

// İnşa yerleşim kuralları game/insaat.js'e taşındı (hex komşuluğu, savunma
// slotları, tekil bina kuralı, toprak sahipliği, üretim tarlası sınırları).

// İstemciye giden köy paketi game/payload.js'te (buildPayload).



/**
 * Kuyruğun ekranı ilgilendiren özeti: uzunluk + BAŞTAKİ işin durumu.
 *
 * Eskiden yalnız uzunluk vardı. Bir iş "bekliyor"dan "çalışıyor"a geçtiğinde
 * uzunluk değişmediği için paket gitmiyordu ve oyuncu 30 saniyelik kalp
 * atışına kadar ekranda "bekliyor" görüyordu — iş arka planda ilerlerken.
 */
function kuyrukOzeti(q) {
  const n = q?.length || 0;
  if (!n) return '0';
  const b = q[0];
  return `${n}${b.waiting ? 'W' : 'R'}${b.waitingReason || ''}${b.type || ''}`;
}


/**
 * AKTİF OLMAYAN köylerin uyarı durumu — gelen sefer sayısı ve en yeni
 * rapor kimliği. structFingerprint yalnız aktif köye baktığı için
 * arkadaki köye saldırı geldiğinde paket gitmiyordu.
 */
function digerKoyFingerprint(session) {
  const gelen = gelenSeferSayilari(new Set(session.villages.keys()));
  let s = '';
  for (const [k, v] of session.villages) {
    if (k === session.activeSlot) continue;
    s += `|${k}:${gelen.get(k) || 0}:${(v.reports || [])[0]?.id || '-'}`;
  }
  return s;
}

function structFingerprint(v) {
  const q = v.unitQueues || {}, eq = v.equipmentQueues || {};
  const up = v.upgradeQueues || {};
  let s = `${v.population}|${v.maxPopulation}|${v.freeWorkers}|${v.isStarving ? 1 : 0}`
    + `|${v.festival ? v.festival.kind : '-'}`
    + `|${v.isCapital ? 'C' : '-'}`
    + `|${(v.marches || []).length}|${(v.reports || []).length}|${v.tickMs || 0}`
    /*
      TAKVİYE PARMAK İZİNE GİRMELİ. Yoksa misafir gelip gitmesi ekrana
      ancak kalp atışında (FULL_SYNC_MS) yansırdı: oyuncu takviyenin
      vardığını 30 saniye sonra görürdü. Sayı + toplam asker yeter —
      hem varış/ayrılışı hem savaşta erimeyi yakalar.
    */
    + `|T${(v.takviyeler || []).length}:${(v.takviyeler || [])
      .reduce((s2, t) => s2 + ARMY.totalUnits(t.units), 0)}`
    + `|${kuyrukOzeti(q.kisla)},${kuyrukOzeti(q.ahir)},${kuyrukOzeti(q.atolye)}`
    + `|${kuyrukOzeti(eq.silahci)},${kuyrukOzeti(eq.zirh)},${kuyrukOzeti(eq.ahir)}`
    // Rún Salonu ve ekipman yükseltmeleri
    + `|${kuyrukOzeti(v.researchQueue)}|${Object.keys(v.research || {}).length}`
    + `|${kuyrukOzeti(up.silahci)},${kuyrukOzeti(up.zirh)}`
    + `|${Object.entries(v.equipmentLevels || {}).map(([k, n]) => k + n).join('')}`;
  for (const k in v.villageBuildings) {
    const b = v.villageBuildings[k];
    // Yıkım bayrağı da parmak izinde: yoksa "yıkılıyor" rozeti ekrana
    // ancak kalp atışında düşerdi.
    s += `|${k}:${b.level}:${b.workers || 0}:${b.building ? 1 : 0}:${b.yikiliyor ? 1 : 0}`;
  }
  for (const k in v.productionTiles) {
    const t = v.productionTiles[k];
    s += `|${k}:${t.level}:${t.workers}:${t.upgrading ? 1 : 0}`;
  }
  for (const k in (v.army || {}))      s += `|a${k}:${v.army[k]}`;
  for (const k in (v.equipment || {})) s += `|e${k}:${v.equipment[k]}`;
  return s;
}

/**
 * Köyü istemciye yolla. force=true her hâlde yollar (oyuncu bir şey yaptı),
 * aksi hâlde yalnız yapısal değişiklik veya kalp atışı varsa.
 */
/** Kullanıcının tüm bağlantılarını kapsayan oda */
const userRoom = (userId) => `u${userId}`;

/**
 * KAHRAMAN PARMAK İZİ — kahraman da yayının tetikleyicisi olmalı.
 *
 * Yoksa deneyim, can ve baygınlık sayacı ekrana ancak 30 saniyelik kalp
 * atışında yansırdı: oyuncu kahramanının iyileştiğini donmuş bir çubukta
 * izlerdi.
 *
 * CAN YUVARLANIYOR. Ham değer her tikte kesirli olarak artıyor; olduğu
 * gibi koysaydık parmak izi saniyede bir değişir ve tam paketi her tikte
 * yollardık — parmak izinin var olma sebebi tam olarak bunu önlemek.
 * Tam sayıya yuvarlamak dakikada birkaç yayın demek, o da yeterli.
 */
function kahramanFingerprint(session) {
  const k = kahramanDurumu(session);
  if (!k) return 'K-';
  return `K${Math.round(k.xp || 0)}:${Math.round(k.can || 0)}`
    + `:${k.harcanmamisPuan || 0}:${k.nerede || 'koy'}`
    + `:${k.olu ? 'O' : '-'}:${k.maceraSayisi || 0}`
    + `:${k.macera ? Math.round((k.macera.kalanSaat || 0) * 10) : '-'}`
    + `:${(k.envanter || []).length}`
    + `:${Object.keys(k.kusanilan || {}).length}`
    + `:${k.usSlot || '-'}`;
}

function emitVillage(session, { force = false, statics = false } = {}) {
  /**
   * Yayın KULLANICI ODASINA yapılır, tek bir socketId'ye değil.
   *
   * Eskiden oturum yalnız SON bağlanan socket'in kimliğini tutuyordu. Aynı
   * kullanıcının iki bağlantısı olduğunda (iki sekme, ya da React StrictMode
   * geliştirmede iki socket açtığında) paket son bağlanana gidiyordu; ekrandaki
   * socket hiçbir şey almıyor, komut sunucuda işlense bile arayüz donuyordu.
   * Belirti: "inşaat başlamıyor gibi duruyor, sayfayı yenileyince görünüyor".
   * Oda yayını her bağlantıya ulaşır.
   */
  const room = session.userId ? userRoom(session.userId) : null;
  const sockets = room ? io.sockets.adapter.rooms.get(room) : null;
  if (!sockets || sockets.size === 0) return;
  const sock = io.to(room);
  const v = session.village;
  /*
    Parmak izine DİĞER köylerin de saldırı durumu giriyor: yoksa aktif
    olmayan bir köye ordu yürüdüğünde ekran 30 saniyelik kalp atışını
    bekliyordu. Uyarı geciktiğinde işe yaramıyor.
  */
  const fp = structFingerprint(v) + '#' + questFingerprint(session)
    + '#' + digerKoyFingerprint(session)
    + '#' + kahramanFingerprint(session);
  const nowReal = Date.now();
  const beat = nowReal - (session.lastEmitAt || 0) >= FULL_SYNC_MS;
  if (!force && !beat && fp === session.fp) return;

  const topReport = (v.reports || [])[0]?.id || 0;
  const reportsChanged = topReport !== session.topReportId
    || (v.reports || []).length !== session.reportCount;

  session.fp = fp;
  session.lastEmitAt = nowReal;
  session.topReportId = topReport;
  session.reportCount = (v.reports || []).length;

  // Raporlar kalp atışına BİNMİYOR: 6 KB tutuyorlar ve yalnız yeni rapor
  // geldiğinde değişiyorlar; istemci listeyi kendinde tutuyor.
  /**
   * Kültür puanı ve köy listesi OTURUM düzeyinde: köy nesnesi tek başına
   * oyuncunun kaç köyü olduğunu ya da toplam puanını bilmiyor.
   */
  const cpTotal = totalCulturePoints(session);
  const culture = {
    ...CULTURE.expansionStatus([...session.villages.values()], cpTotal, VILLAGE_DEFS),
    points: Math.floor(cpTotal),
  };

  sock.emit('village_update', buildPayload(v, session.tickMs, {
    statics,
    takviyelerim: takviyelerimiBul(session.userId),
    reports: statics || reportsChanged,
    culturePoints: cpTotal,
    culture,
    villages: villageList(session),
    activeSlot: session.activeSlot,
    capitalSlot: session.capitalSlot,
    uniqueOwners: uniqueOwnersOf(session),
    quests: questPayload(session),
    /*
      OYUNCU ADI. `adVerilmedi` true ise istemci açılışta tek soruluk
      ad ekranını gösteriyor — kimse haritada e-postasıyla dolaşmasın.
    */
    playerName: ownerName(session.userId, session.userEmail),
    adVerilmedi: !WORLD.ownerByUser.has(session.userId),
    /*
      KARŞILAMA ANLATIMI. Görülmediyse istemci ekranın ortasında
      geçilemez bir anlatım açıyor. Bilgi SUNUCUDA — localStorage'da
      olsaydı depoyu temizleyen her girişte görür, isteyen de atlardı.
    */
    egitimBitti: egitimGoruldu(session),
    /*
      OKUNMAMIŞ MESAJ SAYACI — üst bardaki rozet bunu kullanıyor.

      Sayı OTURUMDA tutuluyor, her yayında veritabanına sorulmuyor:
      emitVillage saniyede bir çalışabiliyor ve senkron; oraya bir sorgu
      koymak tick yoluna veritabanı gecikmesi sokardı. Bağlantıda bir kez
      okunuyor, sonra mesaj gelince/okununca elle güncelleniyor.
    */
    mesajOkunmamis: session.mesajOkunmamis || 0,
    /*
      KAHRAMAN. Konağı olmayan oyuncuya `{ var: false }` gidiyor —
      istemci o zaman ekranda "Kahraman Konağı kur" diyor. null yollasaydık
      "henüz yüklenmedi" ile "kahramanın yok" ayırt edilemezdi.
    */
    kahraman: HERO.ozet(kahramanDurumu(session), kahramanKonagi(session)?.level || 0),
  }));
}

/**
 * TEK KÖYÜ ilerlet. Çoklu köyde oyuncunun HER köyü için çalışır — yalnız
 * aktif köy değil, yoksa arkadaki köyler donar.
 *
 * `userId` sadece log için; köyün kendisi hangi oyuncuya ait olduğunu
 * bilmiyor.
 */
function advanceVillage(village, gameHours, userId, slotKey = null) {
  processTick(village, gameHours);

  const now = village.clockMs;
  Object.entries(village.villageBuildings).forEach(([key, b]) => {
    if (b.building && now >= b.buildEndTime) {
      b.level++;
      village.freeWorkers += b.buildWorkers;
      delete b.building; delete b.buildEndTime; delete b.buildWorkers;
    }
    // Yıkım süresi doldu: slot boşalır. Personeli yıkım BAŞLARKEN çıkmıştı.
    if (b.yikiliyor && now >= b.yikimEndTime) {
      delete village.villageBuildings[key];
      /*
        Son bina da gittiyse köy yok olur. Oyuncunun kendi eliyle köyünü
        terk etme yolu bu; kuşatmayla aynı kural (bkz. koyBosMu).
      */
      if (userId && koyBosMu(village)) {
        koyuYokEt(userId, slotKey, 'kendi yıkımı').catch(err =>
          console.error('[KÖY YIKIM] kendi yıkımı:', err?.message));
      }
    }
  });

  // Nüfus tavanı tek kaynaktan: data/villageDefs.js maxPopulationOf
  village.maxPopulation = maxPopulationOf(village);
  village.tickCount++;
  /**
   * NÜFUS: hız ana bina seviyesinden gelir (popPerGameHour), tavan evlerden.
   * Aç olan ya da tavana dayanmış köy büyümez.
   */
  /**
   * KÜLTÜR PUANI — köyün CP/GÜN üretimi oyun saatine bölünüp birikir.
   * Puan oyuncuya ait (çoklu köy gelince bütün köyler aynı havuza akacak),
   * bu yüzden köy nesnesinde `culturePoints` olarak tutuluyor ve payload'da
   * gönderiliyor.
   */
  const cpDay = CULTURE.villageCpPerDay(village, VILLAGE_DEFS);
  village.culturePoints = (village.culturePoints || 0) + (cpDay / 24) * gameHours;

  /**
   * ŞÖLEN bitti mi? Puan şölenin SONUNDA yazılır — süresi boyunca ekranda
   * geri sayım görünüyor. Küçük şölen bu köyün, büyük şölen bütün köylerin
   * günlük üretimi kadar (tek köyde ikisi aynı, büyük şölen ×2 katsayılı).
   */
  if (village.festival && village.clockMs >= village.festival.endTime) {
    const f = CULTURE.FESTIVALS[village.festival.kind];
    const kazanc = Math.round((village.festival.cpAtStart || cpDay) * (f?.multiplier || 1));
    village.culturePoints += kazanc;
    console.log(`[ŞÖLEN] kullanıcı ${userId}: ${f?.label || village.festival.kind}`
      + ` bitti, +${kazanc} CP (toplam ${Math.round(village.culturePoints)})`);
    delete village.festival;
  }

  /**
   * DİKKAT — eski tutarsızlık düzeltildi: kaynaklar `processTick` ile GEÇEN
   * GERÇEK SÜREYE göre ilerliyordu ama nüfus/kültür sabit `HOURS_PER_TICK`
   * kullanıyordu. Yani nüfus artışı tick sıklığına bağlıydı, oyun zamanına
   * değil; hız kaydırıcısı oynatıldığında ölçek kayıyordu.
   * Varsayılan hızda ikisi birebir aynı değer (ölçüldü), o yüzden normal
   * oyun temposu değişmiyor — yalnız hızlandırılmış modda doğru davranıyor.
   */
  const popRate = popPerGameHour(village.villageBuildings['0,0']?.level);
  village.popAccum = (village.popAccum || 0) + gameHours * popRate;
  while (village.popAccum >= 1) {
    village.popAccum -= 1;
    // Tavan yalnız SİVİLLERİ sayar: asker evden çıkıp kışlaya gittiği için
    // yerine yeni köylü doğabilir (bkz. civilianCount).
    if (village.isStarving || civilianCount(village) >= village.maxPopulation) break;
    village.population++;
    village.freeWorkers++;
  }
}

function runTickForUser(userId, session) {
  /**
   * İlerleme GEÇEN GERÇEK SÜREYE göre — tick sayısına göre değil.
   * Böylece hız çarpanı tick aralığını kısaltmak zorunda kalmıyor (eskiden
   * MIN_TICK_MS=100 yüzünden en fazla 10× oluyordu) ve döngü gecikse bile
   * oyun temposu kaymıyor.
   */
  const speed = WORLD.speed;
  const nowReal = Date.now();
  const elapsed = Math.min(5000, nowReal - (session.lastTickAt || nowReal - DEFAULT_TICK_MS));
  session.lastTickAt = nowReal;
  const gameHours = GT.realMsToGameHours(elapsed, speed);

  // BÜTÜN köyler ilerler; sadece aktif olan yayınlanır
  for (const [slotKey, village] of session.villages) {
    advanceVillage(village, gameHours, userId, slotKey);
    session.dirtySlots.add(slotKey);
  }

  /*
    OTURUM BU TİKTE SİLİNMİŞ OLABİLİR: son köyün yıkımı oyuncuyu oyundan
    düşürüyor (bkz. oyuncuyuSil) ve bu, döngünün içinden tetikleniyor.
    Devam edersek olmayan bir köyü yayınlamaya çalışırız.
  */
  if (session.silindi || session.villages.size === 0) return;

  /*
    KAHRAMAN köylerden SONRA ilerliyor. Önce ilerleseydi bu tikte
    tamamlanan konak yükseltmesi iyileşme hızına ancak bir sonraki
    tikte yansırdı — görünür bir gecikme değil ama sebepsiz bir tutarsızlık.
  */
  const { kahraman, konak } = kahramaniSenkronla(session);
  if (kahraman) {
    HERO.ilerlet(kahraman, gameHours, konak?.level || 0);
    MACERA.maceraBiriktir(kahraman, gameHours, konak?.level || 0);
    maceraIlerlet(session, kahraman, gameHours, konak);
    /*
      EVE DÖNÜŞ. Takviyeden geri çağrılan kahraman ışınlanmıyor: gidiş
      kadar yol var. Anında dönseydi "saldırı gelince kahramanı çek"
      risksiz bir hamle olurdu.
    */
    if (kahraman.nerede === 'donuyor') {
      kahraman.donusKalanSaat = Math.max(0, (kahraman.donusKalanSaat || 0) - gameHours);
      if (kahraman.donusKalanSaat <= 0) {
        kahraman.nerede = 'koy';
        kahraman.misafirSlot = null;
      }
    }
  }

  /*
    ÜRETİM SKİLİ yalnız kahramanın DURDUĞU köye işliyor — tek kahraman,
    tek köy. Bütün köylere birden verseydik çok köylü oyuncu tek bir
    kahramanla imparatorluğunun tamamını beslerdi.

    Her tikte bütün köylerde sıfırlanıp doğru köye yazılıyor: kahraman
    sefere çıkınca ya da üssü taşınınca eski köyde artık kalmasın.
  */
  const uretimEk = (kahraman && (kahraman.nerede || 'koy') === 'koy')
    ? HERO.bonuslar(kahraman).uretimSaatlik : 0;
  for (const [slotKey, village] of session.villages) {
    village.kahramanUretimSaatlik =
      (uretimEk > 0 && slotKey === kahraman?.usSlot) ? uretimEk : 0;
  }

  emitVillage(session);
}

// Dünya durumu (WORLD) durum.js'e taşındı — bkz. require, dosya başı.

const NPC_TICK_MS   = 1000;  // NPC'ler her zaman 1× hızda yaşar
/**
 * NPC kararları OYUN ZAMANINA bağlı: 5 oyun saatinde bir.
 * Eskiden "her 5 tick" idi ve 1 tick = 1 oyun saatti; yani bu ORANI koruyor.
 * Saatte bire çıkarmak NPC'lere oyun saati başına 5 kat karar verdirir ve
 * daha önce ölçülmüş NPC gelişim eğrisini bozardı (tohumlama maliyeti de 5×).
 */
const NPC_AI_EVERY_HOURS = 5;
const NPC_AI_EVERY  = Math.max(1, Math.round(NPC_AI_EVERY_HOURS / GT.HOURS_PER_TICK));
/**
 * Sunucu kapalıyken geçen sürenin telafi tavanı — OYUNCU VE NPC İÇİN AYNI.
 * Eskiden oyuncu 7 güne kadar telafi alıyor, NPC'ler yalnızca 600 tick alıyordu;
 * bir gün kapalı kalan sunucuda oyuncu 86.400 tick, NPC 600 tick kazanıyordu.
 * Tavan açılış maliyetiyle sınırlı: ölçüm 200 NPC × 3600 tick = 11,6 sn,
 * 1800 tick ≈ 6 sn. Daha uzun molalar telafi edilmez (iki taraf da).
 */
/**
 * Offline telafi tavanı — OYUN SAATİ cinsinden, KABA adımlarla koşulur
 * (1 adım = 1 oyun saati). 1× ölçekte ince adımla 24 saat 86.400 tick eder;
 * kaba adımda 24 tekrar. Tavanın maliyeti: 200 NPC × 72 adım ≈ 1 sn.
 */
const MAX_CATCHUP_HOURS = 72;

/** Bir köyü bir tick ilerlet (oyuncu köyüyle aynı motor + aynı tamamlama mantığı) */
async function bootWorld() {
  const t0 = Date.now();
  WORLD.slots = W.generateSlots();
  WORLD.slots.forEach(s => WORLD.slotByKey.set(s.key, s));

  // Oyuncu adları — harita ve raporlar bunu kullanır (yoksa e-posta öneki)
  try {
    WORLD.ownerByUser = await loadDisplayNames();
    console.log(`[WORLD] ${WORLD.ownerByUser.size} oyuncu adı yüklendi`);
  } catch (err) { console.error('[WORLD] oyuncu adları:', err.message); }

  // Oyuncu konumları
  try {
    const players = await loadPlayerSlots();
    players.forEach(p => {
      /*
        SERBEST YERLEŞİM: göçmenle kurulan köyler ızgara slotu değil,
        dünya yeniden üretilince kayıtta olup haritada olmuyorlar. Kaydı
        olan her oyuncu slotu burada geri üretiliyor; yoksa köy adsız
        kalıyor ve haritadan siliniyordu.
      */
      if (!WORLD.slotByKey.has(p.slotKey) && !ensureSlotByKey(p.slotKey)) {
        console.warn(`[WORLD] ${p.email}: slot anahtarı bozuk (${p.slotKey}), atlandı`);
        return;
      }
      WORLD.playerBySlot.set(p.slotKey, { userId: p.userId, email: p.email, name: p.name });
      if (p.displayName) WORLD.ownerByUser.set(p.userId, p.displayName);
      if (!WORLD.slotByUser.has(p.userId) || p.isCapital) {
        WORLD.slotByUser.set(p.userId, p.slotKey);
      }
      if (!WORLD.slotsByUser.has(p.userId)) WORLD.slotsByUser.set(p.userId, new Set());
      WORLD.slotsByUser.get(p.userId).add(p.slotKey);
    });
  } catch (err) { console.error('[WORLD] oyuncu slotları:', err.message); }

  // Kayıtlı NPC'leri yükle
  let saved = [];
  try { saved = await loadNpcVillages(); }
  catch (err) { console.error('[WORLD] NPC yükleme:', err.message); }

  const savedByKey = new Map(saved.map(n => [n.slotKey, n]));
  // En eski NPC kaydı → sunucunun ne kadar kapalı kaldığı
  const oldestNpcSave = saved.length
    ? Math.min(...saved.map(n => (n.updatedAt ? new Date(n.updatedAt).getTime() : Date.now())))
    : null;
  const taken = new Set([...WORLD.playerBySlot.keys()]);

  /**
   * SLOT SEÇİMİ KAYITLI KÖYLERİ KORUR.
   *
   * pickNpcSlots havuz üzerinde sabit adımla seçiyor; bir oyuncu slot kapınca
   * havuz bir eleman kısalıyor ve seçim TAMAMEN kayıyor. Eskiden bu, her
   * açılışta kayıtlı NPC'lerin bir bölümünün terk edilip (veritabanında öksüz
   * satır) yerlerine sıfırdan yeni köy kurulması demekti: ölçüldü — ikinci
   * açılışta 200 NPC'nin 86'sı yeniden kuruldu, dev verisinde de 200 aktif
   * slot için 478 kayıt birikmişti. Artık önce KAYITLI slotlar alınıyor (en
   * son güncellenen önce, yani oynanan dünya), eksik kalan sayı deterministik
   * seçimden tamamlanıyor.
   */
  const savedSorted = [...saved].sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta || String(a.slotKey).localeCompare(String(b.slotKey));
  });
  const chosen = new Map();
  for (const rec of savedSorted) {
    if (chosen.size >= W.NPC_TARGET) break;
    if (taken.has(rec.slotKey)) continue;             // oyuncu oraya oturmuş
    const slot = WORLD.slotByKey.get(rec.slotKey);
    if (slot) chosen.set(rec.slotKey, slot);          // harita yeniden üretildiyse slot yok
  }
  if (chosen.size < W.NPC_TARGET) {
    const free = WORLD.slots.filter(s => !taken.has(s.key) && !chosen.has(s.key));
    for (const s of W.pickNpcSlots(free, W.NPC_TARGET - chosen.size)) {
      if (chosen.size >= W.NPC_TARGET) break;
      chosen.set(s.key, s);
    }
  }
  const npcSlots = [...chosen.values()];

  let created = 0, restored = 0;
  for (const slot of npcSlots) {
    const rec = savedByKey.get(slot.key);
    if (rec) {
      /**
       * `quiet` YALNIZCA tohumlamada atanıyordu (seedNpcVillage) ve kayda
       * yazılmıyordu; kayıttan yüklenen 200 NPC bu yüzden konuşkan dönüyor,
       * her tick onlarca [STARVE] satırı basıyordu. NPC köyü tanım gereği
       * sessizdir — yükleme noktasında da işaretlenir.
       */
      const village = hydrateVillage(rec.state);
      village.quiet = true;
      WORLD.npcs.set(slot.key, { slot, village });
      restored++;
    } else {
      WORLD.npcs.set(slot.key, { slot, village: seedNpcVillage(slot) });
      created++;
    }
  }

  /**
   * TELAFİ KÖY BAŞINA — her NPC KENDİ kayıt zamanından itibaren ilerletilir.
   *
   * Eskiden en eski kaydın yaşı bulunup aynı süre HERKESE uygulanıyordu; bu
   * hem yeni kaydedilmiş köyleri fazla ilerletiyor hem de "her köyü sık sık
   * kaydet" zorunluluğu doğuruyordu. Köy başına telafi, seyrek kaydı doğru
   * hâle getiriyor: diskteki anlık görüntü eskiyse aradaki üretim açılışta
   * yeniden hesaplanır.
   */
  let catchupMax = 0, catchupSum = 0, catchupCount = 0;
  for (const [key, n] of WORLD.npcs) {
    const rec = savedByKey.get(key);
    if (!rec) continue;                       // yeni tohumlandı, telafi yok
    const savedAt = rec.updatedAt ? new Date(rec.updatedAt).getTime() : Date.now();
    const hours = Math.min(MAX_CATCHUP_HOURS,
      Math.max(0, (Date.now() - savedAt) / 1000 / GT.HOUR_SECONDS));
    const steps = Math.floor(hours / GT.CATCHUP_HOURS_PER_STEP);
    if (steps <= 0) continue;
    /*
      Tek bozuk NPC açılışı düşürmesin. Korumasız hâlde hata bootWorld
      üzerinden bootServer'ın catch'ine düşüyor ve süreç exit(1) ile ölüyor;
      systemd yeniden başlatıyor, aynı köy yine düşürüyor — sunucu hiç
      açılmıyor. Bozuk köy atlanıp dünya ayağa kalkmalı.
    */
    try {
      for (let t = 0; t < steps; t++) {
        stepVillage(n.village, GT.CATCHUP_HOURS_PER_STEP);
        if (t % NPC_AI_EVERY_HOURS === 0) runNpcAi(n.village, n.slot);
      }
    } catch (err) { kalkanLog(`açılış telafisi NPC ${n.slot.key}`, err); }
    catchupMax = Math.max(catchupMax, steps);
    catchupSum += steps; catchupCount++;
  }
  if (catchupCount > 0) {
    console.log(`[WORLD] offline telafi: ${catchupCount} köy · ortalama `
      + `${(catchupSum / catchupCount).toFixed(1)} · en fazla ${catchupMax} oyun saati`);
  }

  // Yeni tohumlanan köyler diskte yok — ilk turda yazılmalı
  if (created > 0) {
    for (const [key] of WORLD.npcs) if (!savedByKey.has(key)) WORLD.dirtyNpcs.add(key);
  }
  console.log(`[WORLD] ${WORLD.slots.length} slot · ${WORLD.npcs.size} NPC (${created} yeni, ${restored} kayıtlı) · ${Date.now() - t0} ms`);
}

/**
 * KALKAN LOGU — aynı hata kaynağını en fazla dakikada bir yazar.
 *
 * Tick döngüleri 50 ms'de bir koşuyor; bozuk tek bir köy kısıtlamasız logla
 * dakikada 1.200 yığın izi üretir ve journald'ı (Pi'de SD kartı) boğar.
 * Etiket başına kısıldığı için farklı hatalar birbirini gizlemiyor.
 */
const sonHataAni = new Map();
function kalkanLog(etiket, err) {
  const now = Date.now();
  if (now - (sonHataAni.get(etiket) || 0) < 60000) return;
  sonHataAni.set(etiket, now);
  console.error(`[KALKAN] ${etiket}:`, err?.stack || err);
}

// NPC yaşam döngüsü
let npcLastTick = Date.now();
setInterval(() => {
  const nowReal = Date.now();
  const hours = GT.realMsToGameHours(Math.min(5000, nowReal - npcLastTick), WORLD.speed);
  npcLastTick = nowReal;
  WORLD.npcTick++;
  const runAi = WORLD.npcTick % NPC_AI_EVERY === 0;
  for (const n of WORLD.npcs.values()) {
    /*
      Tek bozuk NPC bütün dünyayı durdurmasın: eskiden buradan fırlayan hata
      setInterval geri çağrısını terk ediyor, sonraki NPC'ler hiç işlenmiyor
      ve processMarches atlandığı için BÜTÜN seferler donuyordu.
    */
    try {
      stepVillage(n.village, hours);
      if (runAi) {
        runNpcAi(n.village, n.slot);
        maybeNpcRaid(n);
        // Yapay zekâ turu = yapısal değişiklik olabilir + kaydın bayatlamasına
        // üst sınır (NPC_AI_EVERY_HOURS oyun saati). Kaynak artışı için kayıt
        // gerekmiyor, telafi onu hesaplıyor.
        markNpcDirty(n.slot.key);
      }
    } catch (err) { kalkanLog(`NPC ${n.slot.key}`, err); }
  }
  try { processMarches(hours); } catch (err) { kalkanLog('processMarches', err); }
  try { processPazarGonderileri(hours); } catch (err) { kalkanLog('pazarGonderileri', err); }
}, NPC_TICK_MS);

/**
 * NPC'leri periyodik kaydet — YALNIZ kirli işaretlenenleri.
 *
 * Tek bir bozuk köy bütün turu iptal etmesin diye köyler tek tek
 * doğrulanıyor: eskiden `[...state.TOWER_SLOTS]` bir köyde patlayınca
 * saveNpcVillages hiç yazmadan dönüyordu ve NPC dünyası hiç kaydedilmiyordu.
 */
const NPC_SAVE_MS = 60000;
let npcSaveInFlight = false;
setInterval(async () => {
  if (npcSaveInFlight || WORLD.dirtyNpcs.size === 0) return;
  const keys = [...WORLD.dirtyNpcs];
  WORLD.dirtyNpcs.clear();
  npcSaveInFlight = true;
  const batch = [];
  for (const key of keys) {
    const n = WORLD.npcs.get(key);
    if (!n) continue;
    if (!(n.village.TOWER_SLOTS instanceof Set)) {
      console.warn(`[WORLD SAVE] ${key}: TOWER_SLOTS şekli bozuk, onarıldı`);
      n.village = hydrateVillage(n.village);
      n.village.quiet = true;
    }
    batch.push({
      slotKey: n.slot.key, q: n.slot.q, r: n.slot.r,
      tier: n.slot.tier, name: n.slot.name, state: n.village,
    });
  }
  try {
    if (batch.length) await saveNpcVillages(batch);
  } catch (err) {
    console.error('[WORLD SAVE]', err.message);
    keys.forEach(k => WORLD.dirtyNpcs.add(k));   // sonraki turda tekrar dene
  } finally { npcSaveInFlight = false; }
}, NPC_SAVE_MS);


// NPC → oyuncu yağmaları
const NPC_RAIDS_ENABLED     = true;
const NPC_RAID_MAX_DISTANCE = 18;    // bu mesafeden uzaktaki NPC oyuncuyu görmez
const NPC_RAID_MIN_ARMY     = 25;    // bundan az ordusu olan NPC sefer açmaz
const NPC_RAID_SEND_SHARE   = 0.4;   // ordusunun en çok bu kadarını yollar
/** Oyuncuya gelen iki yağma arası en az bu kadar OYUN SAATİ */
const NPC_RAID_COOLDOWN_HOURS = 6;
const NPC_RAID_COOLDOWN_MS  = NPC_RAID_COOLDOWN_HOURS * GT.HOUR_SECONDS * 1000;
/** Uygun NPC'nin her AI turunda (saatte bir) deneme şansı */
const NPC_RAID_CHANCE       = 0.06;

/**
 * HEDEF KÖYÜ BELLEKTE BULUNAMAZSA kaç OYUN SAATİ beklenir.
 *
 * Açılışta her oyuncunun köyü yükleniyor, yani bu yalnız kayıtlı ama hiç
 * oynamamış hesabın slotuna denk gelir. Süre dolunca ordu eve döner —
 * eskiden sonsuza kadar bekliyor, oyuncu ordusunu kalıcı kaybediyordu.
 */
const HEDEF_BEKLEME_SAAT = 6;

let lastNpcRaidAt = 0;

/**
 * BENİM ASKERİM NEREDE — başka köylerde misafir duran birliklerim.
 *
 * Takviye girdisi ev sahibinin köyünde duruyor (savunma orada hesaplanıyor),
 * dolayısıyla sahibinin bunu görmesi için ters yönde aramak gerekiyor.
 * Bütün oyuncu köyleri zaten bellekte (çevrimdışı olanlar da tick alıyor),
 * o yüzden tarama yeterli ve ayrı bir dizin tutmaya gerek yok. Köy sayısı
 * büyürse burası dizine çevrilmeli.
 */
/**
 * BENİM ASKERİMİN DURDUĞU KÖYLER — KÖY BAŞINA TEK SATIR.
 *
 * Her varış sunucuda ayrı bir girdi açıyor; aynı köye üç kez asker
 * yollayan oyuncu arayüzde üç satır görüyor ve üçünü ayrı ayrı geri
 * çağırmak zorunda kalıyordu. Burada (ev sahibi köy + benim hangi köyümden
 * gittiği) çiftine göre GRUPLANIYOR.
 *
 * Kayıt birleşmiyor, yalnız görünüm: savunma kayıpları geliş sırasına
 * göre pay ediliyor (savunmaKayiplariniPayEt), girdileri birleştirmek o
 * sırayı bozardı.
 */
function takviyelerimiBul(userId) {
  const gruplar = new Map();
  for (const s of userSessions.values()) {
    for (const [slotKey, koy] of s.villages) {
      for (const t of koy.takviyeler || []) {
        if (t.userId !== userId) continue;
        const anahtar = `${slotKey}|${t.slotKey}`;
        const onceki = gruplar.get(anahtar);
        if (onceki) {
          for (const [k, n] of Object.entries(t.units || {})) {
            onceki.units[k] = (onceki.units[k] || 0) + (n || 0);
          }
          onceki.toplam = ARMY.totalUnits(onceki.units);
          onceki.girdiSayisi += 1;
          onceki.at = Math.min(onceki.at || t.at, t.at);
          continue;
        }
        gruplar.set(anahtar, {
          id: t.id,
          hostKey: slotKey,
          /*
            Köy nesnesinin `name`i boş olabiliyor; oyuncunun haritada
            gördüğü ad dünya kaydında duruyor. Aksi hâlde listede
            "0,0" gibi slot anahtarı yazıyordu.
          */
          hostName: WORLD.playerBySlot.get(slotKey)?.name
            || WORLD.slotByKey.get(slotKey)?.name || koy.name || slotKey,
          kendiKoyum: s.userId === userId,
          fromName: t.fromName,
          // Sahibin HANGİ köyünden gittiği — geri çağırma buraya döner
          slotKey: t.slotKey,
          units: { ...t.units },
          toplam: ARMY.totalUnits(t.units),
          girdiSayisi: 1,
          at: t.at,
        });
      }
    }
  }
  return [...gruplar.values()];
}

/**
 * YOLDAKİ MACERAYI İLERLET, dolunca ÇÖZ.
 *
 * Ödüller kahramanın ÜSSÜNE düşüyor — aktif köye değil. Oyuncu macera
 * dönerken başka bir köye bakıyor olabilir; ganimetin nereye gittiği
 * ekranda hangi köyün açık olduğuna bağlı olmamalı.
 *
 * Depo taşması BİLEREK yok sayılıyor: ödül zaten seyrek ve küçük,
 * "ganimetin geldi ama sığmadı" demek maceranın tek somut kazancını
 * görünmez bir kurala kurban etmek olurdu. Tavan yine de uygulanıyor
 * (depoya sığan kadarı) — sonsuz kaynak birikmesin.
 */
function maceraIlerlet(session, kahraman, gameHours, konak) {
  const m = kahraman.macera;
  if (!m) return;
  m.kalanSaat = Math.max(0, (m.kalanSaat || 0) - gameHours);
  if (m.kalanSaat > 0) return;

  /*
    SALDIRI GÜCÜ MACERADA HASARI AZALTIYOR. Gücü sefere çıkarken değil
    DÖNÜŞTE ölçüyoruz: macera süresince oyuncu eşya değiştirmiş olabilir
    ve buradaki soru "ne kadar yıprandı", "ne kadar güçlü yola çıktı"
    değil. Savaşta tersi (güç çıkışta donuyor) çünkü orada güç karşı
    tarafın hesabına giriyor.
  */
  const sonuc = MACERA.maceraSonucu(m.tip, undefined,
    HERO.bonuslar(kahraman).saldiriGucu || 0);
  kahraman.macera = null;
  kahraman.nerede = 'koy';

  HERO.xpEkle(kahraman, sonuc.xp);
  const hasar = HERO.hasarVer(kahraman, sonuc.can);

  const usKoy = session.villages.get(kahraman.usSlot)
    || session.villages.get(konak?.slotKey)
    || session.villages.values().next().value;

  const kazanilan = [];
  for (const odul of sonuc.oduller) {
    if (odul.tur === 'hammadde' && usKoy) {
      const { caps } = getStorageCaps(usKoy);
      const tavan = caps?.[odul.res];
      const yeni = (usKoy.resources[odul.res] || 0) + odul.adet;
      usKoy.resources[odul.res] = tavan > 0 ? Math.min(tavan, yeni) : yeni;
      kazanilan.push({ tur: 'hammadde', res: odul.res, adet: odul.adet });
    } else if (odul.tur === 'asker' && usKoy) {
      /*
        Bulunan asker NÜFUS TÜKETMİYOR: eğitilmedi, katıldı. Nüfustan
        düşseydik ekmek dar boğazındaki oyuncu için ödül bir cezaya
        dönerdi — "ordunu büyüttüm ama köyünü aç bıraktım".
      */
      usKoy.army[odul.birim] = (usKoy.army[odul.birim] || 0) + odul.adet;
      kazanilan.push({ tur: 'asker', birim: odul.birim, adet: odul.adet });
    } else if (odul.tur === 'esya') {
      (kahraman.envanter ||= []).push({ key: odul.key, nadirlik: odul.nadirlik });
      kazanilan.push({
        tur: 'esya', key: odul.key, nadirlik: odul.nadirlik,
        ad: MACERA.esyaAdi(odul.key, odul.nadirlik),
        slot: HERO_ITEMS[odul.key]?.slot || null,
      });
    }
  }

  /*
    RAPOR — maceranın sonucu raporlar ekranında dursun. Yalnız kahraman
    ekranında gösterseydik oyuncu çevrimdışıyken dönen maceranın ne
    getirdiğini hiç göremezdi.
  */
  if (usKoy) {
    ARMY.pushReport(usKoy, {
      id: `mac-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      at: Date.now(), dir: 'in', mode: 'macera',
      outcome: 'macera', winner: 'none',
      fromName: MACERA.MACERA_TIPLERI[m.tip]?.ad || 'Macera',
      toName: usKoy.name, toKey: kahraman.usSlot,
      macera: {
        tip: m.tip, xp: sonuc.xp,
        /*
          RAPORDAKİ CAN KAYBI GERÇEK KAYIP — zırhlanma düşülmüş hâli.
          Ham sayıyı yazsaydık oyuncu kuşandığı zırhın işe yarayıp
          yaramadığını hiçbir yerde göremezdi. `hamCan` yanında duruyor
          ki farkı da gösterebilelim.
        */
        /*
          HAM CAN = maceranın TANIMLI hasarı (hiçbir azaltma öncesi).
          Rapordaki "engellendi" satırı böylece İKİ etkiyi birden
          gösteriyor: saldırı gücünün azaltması + zırhlanma. Yalnız
          zırhı saysaydık saldırı gücüne yapılan yatırım görünmezdi.
        */
        can: hasar.uygulanan, hamCan: sonuc.hamCan ?? hasar.hamHasar,
        oldu: hasar.oldu, oduller: kazanilan,
      },
      myLosses: {}, theirLosses: {}, loot: {},
    });
    session.dirtySlots.add(kahraman.usSlot);
  }
  console.log(`[MACERA] userId=${session.userId} ${m.tip} bitti — ${sonuc.xp} XP, ${kazanilan.length} ödül`);
}

/**
 * KAHRAMAN HANGİ SEFERLERE KATILABİLİR?
 *
 * Saldırı ve yağma: savaşır. TAKVİYE: gittiği köyde savunma bonusunu
 * ORAYA verir ve sahibi geri çağırana kadar orada kalır (İlkan'ın
 * kararı: "kahramanı tek başına saldırıya ya da savunmaya yollayabilirim").
 *
 * Keşif ve yerleşim DIŞARIDA: keşif izcinin işi (kahraman gizlenmez),
 * yerleşim göçmenin.
 */
const KAHRAMAN_MODLARI = new Set(['attack', 'raid', 'takviye']);

/** Köyün son binası da gitti mi? Kural kusatma.js'te (bkz. koyBosMu). */
const koyBosMu = KUSATMA.koyBosMu;

/**
 * KAHRAMAN DURUMU — hesap başına, merkez köyün state'inde.
 *
 * Görev kaydıyla aynı yerde ve aynı gerekçeyle: ayrı tablo açmamak için,
 * ve merkez taşınınca kayıt da taşınsın diye (bkz. set_capital).
 *
 * Kahraman KÖYE DEĞİL OYUNCUYA ait. Köy bazında olsaydı beş köylü
 * oyuncunun beş kahramanı olurdu ve "tek ve kalıcı kahraman" fikri
 * çökerdi — köyü yıkılan oyuncu kahramanını da kaybederdi.
 *
 * @returns {object|null} kahraman nesnesi, ya da hiç konak yoksa null
 */
function kahramanDurumu(session, { yarat = false } = {}) {
  const merkez = session.villages.get(session.capitalSlot)
    || session.villages.values().next().value;
  if (!merkez) return null;
  if (!merkez.kahraman && yarat) merkez.kahraman = HERO.yeniKahraman(null);
  /*
    KAYITTAN GELEN ŞEKLİ DÜZELT. Kahraman sistemi geliştirilirken alanların
    şekli değişti (envanter sözlükten diziye, bayılma sayacı `olu`
    bayrağına). Eski kayıt olduğu gibi kullanılınca sunucu çöküyordu.
  */
  return merkez.kahraman ? HERO.duzelt(merkez.kahraman) : null;
}

/** Kahramanın üssü — Kahraman Konağı'nın bulunduğu köy. */
function kahramanKonagi(session) {
  for (const [slotKey, v] of session.villages) {
    const b = Object.values(v.villageBuildings || {})
      .find(x => x.type === 'kahramanKonagi' && (x.level || 0) > 0);
    if (b) return { slotKey, village: v, level: b.level };
  }
  return null;
}

/**
 * Konak var ama kahraman yoksa kahramanı DOĞUR; konak yıkıldıysa
 * kahramanı SİLME — eşyası ve seviyesi kalır, yalnız üssü kaybolur.
 * Silseydik bir mancınık dalgası oyuncunun aylarca biriktirdiği
 * kahramanını sıfırlardı.
 */
function kahramaniSenkronla(session) {
  const konak = kahramanKonagi(session);
  if (!konak) {
    const k = kahramanDurumu(session);
    if (k) k.usSlot = null;
    return { kahraman: k, konak: null };
  }
  const k = kahramanDurumu(session, { yarat: true });
  if (k) k.usSlot = konak.slotKey;
  return { kahraman: k, konak };
}

/**
 * OYUNCUYU OYUNDAN SİL — son köyü de düşmüş demektir.
 *
 * İlkan'ın kararı: *"köyleri haritadan silinen oyuncu oyundan tamamen
 * silinir"*. Önce boş kabuk köy bırakmak düşünülmüştü; reddedildi —
 * kuşatmanın nihai bir bedeli olmadan köy yıkımı yarım bir mekanik
 * olurdu.
 *
 * OTURUM ÖNCE KAPATILIYOR: bağlı soketler atılmadan kayıt silinirse
 * bir sonraki tick yok olmuş bir hesabı kaydetmeye çalışır ve köy geri
 * gelir.
 */
async function oyuncuyuSil(ownerUserId, sebep) {
  const s = userSessions.get(ownerUserId);
  const ad = WORLD.ownerByUser.get(ownerUserId) || `#${ownerUserId}`;

  for (const k of (WORLD.slotsByUser.get(ownerUserId) || [])) {
    WORLD.playerBySlot.delete(k);
  }
  WORLD.slotsByUser.delete(ownerUserId);
  WORLD.ownerByUser.delete(ownerUserId);
  if (s) { s.villages.clear(); s.dirtySlots.clear(); s.silindi = true; }
  userSessions.delete(ownerUserId);

  /*
    Oyuncuya NE OLDUĞUNU söyleyip bağlantısını kes. Sessizce atsaydık
    oyuncu donmuş bir ekranla kalır ve yenileyince "hesabınız yok"
    diye giriş ekranına düşerdi — sebebini hiç öğrenemezdi.
  */
  io.to(userRoom(ownerUserId)).emit('hesap_silindi', {
    sebep: 'Bütün köylerin yıkıldı. Krallığın sona erdi.',
  });
  for (const sock of io.sockets.adapter.rooms.get(userRoom(ownerUserId)) || []) {
    io.sockets.sockets.get(sock)?.disconnect(true);
  }

  try { await deleteUser(ownerUserId); }
  catch (err) { console.error('[OYUNCU SİL] kayıt silinemedi:', err.message); }
  console.log(`[OYUNCU SİL] ${ad} (userId=${ownerUserId}) oyundan silindi (${sebep})`);
  yayinlaDunya();
}

/**
 * KÖYÜ YOK ET — son binası da düşen köy haritadan silinir.
 *
 * SON KÖY DE SİLİNİYOR ve o zaman OYUNCU DA oyundan düşüyor (bkz.
 * oyuncuyuSil). Kuşatmanın nihai bedeli bu; boş kabuk köy bırakmak
 * mekaniği yarım bırakırdı.
 *
 * @returns {boolean} köy gerçekten silindi mi
 */
async function koyuYokEt(ownerUserId, slotKey, sebep) {
  const s = userSessions.get(ownerUserId);
  if (!s || !s.villages.has(slotKey)) return false;

  /*
    SON KÖY: köyü tek tek silmeye çalışmak yerine bütün hesabı
    kaldırıyoruz. Önce köyü silip sonra "hesapta köy kalmadı" demek,
    arada bir tick geçerse köysüz bir oturum bırakırdı.
  */
  if (s.villages.size <= 1) {
    await oyuncuyuSil(ownerUserId, sebep);
    return true;
  }

  const yikilan = s.villages.get(slotKey);
  s.villages.delete(slotKey);
  s.dirtySlots.delete(slotKey);
  if (s.activeSlot === slotKey) s.activeSlot = [...s.villages.keys()][0];
  if (s.capitalSlot === slotKey) {
    // Merkez düştüyse kalan köylerden biri merkez olur — merkezsiz hesap
    // görev kaydını ve kültür puanını kaybederdi
    s.capitalSlot = [...s.villages.keys()][0];
    // Görev zinciri ve kahraman hesaba ait — yıkılan köyle birlikte gitmesin
    hesapKaydiniTasi(yikilan, s.villages.get(s.capitalSlot));
    for (const [k, v] of s.villages) v.isCapital = (k === s.capitalSlot);
    try { await setCapital(ownerUserId, s.capitalSlot); }
    catch (err) { console.error('[KÖY YIKIM] merkez taşınamadı:', err.message); }
  }

  WORLD.playerBySlot.delete(slotKey);
  WORLD.slotsByUser.get(ownerUserId)?.delete(slotKey);
  try { await deleteVillage(ownerUserId, slotKey); }
  catch (err) { console.error('[KÖY YIKIM] kayıt silinemedi:', err.message); }

  console.log(`[KÖY YIKIM] userId=${ownerUserId} ${slotKey} yok oldu (${sebep})`);
  /*
    Sahibinin ekranı ZORLA tazelenmeli. Parmak izi yalnız AKTİF köyü
    özetliyor; silinen köy başka bir slotsa fingerprint hiç değişmez ve
    köy listesinden düşmesi 30 saniyelik kalp atışını beklerdi. Aktif köy
    silindiyse zaten bambaşka bir köye bakıyoruz: statics de gitmeli.
  */
  emitVillage(s, { force: true, statics: true });
  yayinlaDunya();
  return true;
}

/** slotKey → köy nesnesi. Çevrimdışı oyuncu için village null döner. */
function villageAtSlot(slotKey) {
  const npc = WORLD.npcs.get(slotKey);
  if (npc) return { village: npc.village, name: npc.slot.name, kind: 'npc', userId: null };
  const p = WORLD.playerBySlot.get(slotKey);
  if (p) {
    const s = userSessions.get(p.userId);
    // ÇOKLU KÖY: aktif köy değil, SLOTUN köyü. Aksi hâlde oyuncunun başka
    // bir köyüne yapılan saldırı yanlış köyü vuruyordu.
    return {
      village: s?.villages.get(slotKey) || null, name: p.name, kind: 'player',
      userId: p.userId, offline: !s,
    };
  }
  return null;
}

// Sefer tarama (marchingVillages / incomingMarchesFor) game/seferTakip.js'te,
// kirli işaretleyiciler durum.js'te.



/** Eve varışta depoya ne sığar — fazlası çöp olur (bkz. depositLoot) */
function lootRoom(village) {
  const { caps, granaryCap } = getStorageCaps(village);
  const foodHeld = (village.resources.un || 0) + (village.resources.ekmek || 0);
  return { caps, foodRoom: Math.max(0, granaryCap - foodHeld) };
}

/**
 * SERBEST YERLEŞİM — dünyadaki HER hex'e köy kurulabilir.
 *
 * Dünya üretilirken MIN_DISTANCE aralıklı bir slot ızgarası çıkıyor
 * (NPC'ler ve ilk doğuş için). Oyuncu göçmenle ızgara DIŞINA da
 * yerleşebilsin diye hedef hex'in slot kaydı gerekiyorsa burada
 * üretiliyor; ad, halka ve tier ızgaradakiyle aynı kuralla türetilir.
 */
/** "q,r" anahtarından slot üretir/bulur; bozuk anahtarda null */
function ensureSlotByKey(key) {
  const m = /^(-?\d+),(-?\d+)$/.exec(String(key || ''));
  return m ? ensureSlot(Number(m[1]), Number(m[2])) : null;
}

function ensureSlot(q, r) {
  const key = `${q},${r}`;
  const varOlan = WORLD.slotByKey.get(key);
  if (varOlan) return varOlan;
  const ring = W.hexDistance(q, r);
  const t = W.tierForRing(ring);
  const slot = {
    key, q, r, ring,
    tier: t.tier, tierLabel: t.label, power: t.power,
    name: W.villageName(q, r),
  };
  WORLD.slots.push(slot);
  WORLD.slotByKey.set(key, slot);
  return slot;
}

/**
 * Bu hex'e köy kurulabilir mi?
 *
 * KURALLAR:
 *  - Mesafe sınırı YOK: dünyanın içindeki, üstünde köy olmayan her
 *    hex'e kurulabilir. Topraklar çakışabilir.
 *  - Bonuslu hex'e köy kurulmaz — orası tarla olarak değerli, köy
 *    merkezi o bonusu heba eder.
 *
 * @returns {{ok:true,q:number,r:number}|{ok:false,reason:string}}
 */
function yerlesimUygun(targetKey, userId) {
  const m = /^(-?\d+),(-?\d+)$/.exec(String(targetKey || ''));
  if (!m) return { ok: false, reason: 'gecersiz_hedef' };
  const q = Number(m[1]), r = Number(m[2]);

  if (W.hexDistance(q, r) > W.WORLD_RADIUS - W.CLAIM_RADIUS) {
    return { ok: false, reason: 'dunya_disi' };
  }
  if (WORLD.npcs.has(targetKey) || WORLD.playerBySlot.has(targetKey)) {
    return { ok: false, reason: 'arazi_bos_degil' };
  }
  if (W.worldTileBonus(q, r)) return { ok: false, reason: 'bonus_arazi' };

  /*
    MESAFE SINIRI YOK (İlkan'ın kararı): köy, üstünde köy olmayan her
    hex'e kurulabilir — yabancı köyün bitişiği de dahil. Topraklar
    çakışabilir; aynı hex iki köyün tarlası olabilir.
  */
  return { ok: true, q, r };
}

/**
 * GÖÇMEN SEFERİ VARDI — hedef slotta yeni köy kur.
 *
 * Gidiş tek yön: slot bu arada dolduysa göçmenler kaybolur (kullanıcı
 * kararı). Her iki durumda da kurucu köye rapor düşülür.
 *
 * @returns {boolean} köy kuruldu mu
 */
function foundVillageAt(userId, slotKey, origin) {
  const session = userSessions.get(userId);
  const uygun = yerlesimUygun(slotKey, userId);
  const slot = uygun.ok ? ensureSlot(uygun.q, uygun.r) : WORLD.slotByKey.get(slotKey);
  const dolu = !uygun.ok;

  if (!session || dolu) {
    ARMY.pushReport(origin, {
      id: `y${slotKey}-${Date.now()}`, at: Date.now(), dir: 'out', mode: 'yerlesim',
      toKey: slotKey, toName: slot?.name || slotKey,
      outcome: 'arazi_dolu', winner: 'none',
      sent: {}, myLosses: {}, theirLosses: {}, loot: {},
      message: 'Arazi bu arada doldu — göçmenler kayboldu',
    });
    return false;
  }

  const nv = createVillage(slot.q, slot.r);
  nv.isCapital = false;
  session.villages.set(slotKey, nv);
  session.dirtySlots.add(slotKey);

  const kayit = WORLD.playerBySlot.get(session.capitalSlot);
  // Yeni köyün adı da slotun kendi adı — merkez köyün adının kopyası değil
  const name = slot.name;
  WORLD.playerBySlot.set(slotKey, { userId, email: kayit?.email || null, name });
  if (!WORLD.slotsByUser.has(userId)) WORLD.slotsByUser.set(userId, new Set());
  WORLD.slotsByUser.get(userId).add(slotKey);

  setPlayerSlot(userId, slotKey, name, false)
    .then(() => saveVillage(userId, slotKey, nv))
    .catch(err => console.error('[YERLEŞİM] kayıt:', err.message));

  origin.expansionUsed = (origin.expansionUsed || 0) + 1;
  (origin.foundedVillages ||= []).push({ key: slotKey, name: slot.name, at: Date.now() });

  ARMY.pushReport(origin, {
    id: `y${slotKey}-${Date.now()}`, at: Date.now(), dir: 'out', mode: 'yerlesim',
    toKey: slotKey, toName: slot.name,
    outcome: 'koy_kuruldu', winner: 'none',
    sent: {}, myLosses: {}, theirLosses: {}, loot: {},
    message: `${slot.name} kuruldu`,
  });
  console.log(`[YERLEŞİM] userId=${userId} → ${slotKey} (${slot.name}),`
    + ` toplam ${session.villages.size} köy`);

  emitVillage(session, { force: true, statics: true });
  return true;
}

/**
 * Seferleri `hours` oyun saati ilerlet ve varanları çöz.
 * NPC döngüsünden çağrılır — dünya hızıyla aynı adımı kullanır.
 */
/**
 * AÇIK TEKLİFLER — dünyadaki bütün köylerden toplanır.
 *
 * Teklifler açan köyün state'inde duruyor (seferlerle aynı desen), o
 * yüzden "kimler ne satıyor" sorusunun cevabı ancak tarayarak bulunuyor.
 * Oyuncu sayısı küçük olduğu sürece ucuz; büyüyünce merkezî bir defter
 * gerekir.
 *
 * Kendi tekliflerim de listede ama işaretli: iptal edebilmek için
 * görmem, kabul edememem gerekiyor.
 */
function acikTeklifler(benimSlotlar) {
  const out = [];
  for (const entry of marchingVillages()) {
    for (const t of entry.village.teklifler || []) {
      out.push({
        id: t.id, slotKey: entry.slotKey,
        satici: entry.kind === 'npc'
          ? (WORLD.slotByKey.get(entry.slotKey)?.name || entry.slotKey)
          : (WORLD.playerBySlot.get(entry.slotKey)?.name || entry.slotKey),
        saticiSahip: entry.kind === 'npc' ? null : ownerName(entry.userId,
          WORLD.playerBySlot.get(entry.slotKey)?.email),
        veren: t.veren, verenMiktar: t.verenMiktar,
        alan: t.alan, alanMiktar: t.alanMiktar,
        tuccar: t.tuccar, at: t.at,
        benimMi: benimSlotlar.has(entry.slotKey),
      });
    }
  }
  return out.sort((a, b) => b.at - a.at).slice(0, 80);
}

/**
 * PAZAR GÖNDERİLERİ — kabul edilen tekliflerin malı yolda.
 *
 * Seferlerle aynı adımda ilerliyor ama ayrı tutuluyor: gönderide savaş
 * yok, rapor yok, kayıp yok. Varışta mal doğrudan hedefin deposuna
 * giriyor; sığmayan kısım kayboluyor (yağmadaki kuralın aynısı, depo
 * yönetmek oyunun parçası).
 */
function processPazarGonderileri(hours) {
  if (!(hours > 0)) return;
  for (const entry of marchingVillages()) {
    const v = entry.village;
    if (!v.gonderiler?.length) continue;
    const degisti = PAZAR_YOL.ilerlet(v, hours, (hedefSlot, kaynak, miktar) => {
      const hedef = villageAtSlot(hedefSlot);
      if (!hedef?.village) return;                 // köy yoksa mal kayboldu
      const { caps, granaryCap } = getStorageCaps(hedef.village);
      const gida = kaynak === 'un' || kaynak === 'ekmek';
      const tavan = gida ? granaryCap : caps?.[kaynak];
      const mevcut = gida
        ? (hedef.village.resources.un || 0) + (hedef.village.resources.ekmek || 0)
        : (hedef.village.resources[kaynak] || 0);
      const yer = tavan == null ? miktar : Math.max(0, tavan - mevcut);
      const giren = Math.min(miktar, yer);
      if (giren > 0) {
        hedef.village.resources[kaynak] = (hedef.village.resources[kaynak] || 0) + giren;
      }
      if (hedef.userId != null) markUserDirty(hedef.userId, hedefSlot);
      else markNpcDirty(hedefSlot);
      if (giren < miktar) {
        console.log(`[PAZAR] ${hedefSlot} deposu doldu, ${Math.round(miktar - giren)} ${kaynak} kayboldu`);
      }
    });
    if (degisti) entry.dirty();
  }
}

function processMarches(hours) {
  if (!(hours > 0)) return;
  for (const entry of marchingVillages()) {
    const v = entry.village;
    const list = v.marches;
    if (!list || !list.length) continue;

    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      if (!ARMY.advanceMarch(m, hours)) continue;

      if (m.phase === 'outbound') {
        /*
          YERLEŞİM — savaş yok, dönüş yok. Köy kurulur (ya da arazi
          dolmuşsa göçmenler kaybolur) ve sefer listeden silinir.
        */
        if (m.mode === 'yerlesim') {
          if (entry.kind === 'player') foundVillageAt(entry.userId, m.toKey, v);
          list.splice(i, 1);
          entry.dirty();
          continue;
        }
        const tgt = villageAtSlot(m.toKey);
        /**
         * HEDEF KÖYÜ BELLEKTE YOK.
         *
         * Açılışta HER oyuncunun köyü belleğe yükleniyor ve çevrimdışıyken
         * de tick alıyor (bkz. bootServer + global tick), yani bu dal
         * neredeyse hiç işlemiyor. İşlediği tek durum: kayıtlı ama hiç
         * oynanmamış hesabın slotu — köy satırı yer tutucu.
         *
         * ESKİDEN sefer sonsuza kadar bekletiliyordu (`remainingHours = 0`
         * her tick yeniden sıfırlanıyor, zaman aşımı yok): ordu ne
         * dönüyor ne savaşıyordu, oyuncu ordusunu kalıcı kaybediyordu.
         * Artık bir süre beklenip ordu EVE YOLLANIYOR ve raporda sebebi
         * yazıyor.
         */
        if (tgt && tgt.offline) {
          m.bekleyenSaat = (m.bekleyenSaat || 0) + hours;
          if (m.bekleyenSaat < HEDEF_BEKLEME_SAAT) { m.remainingHours = 0; continue; }
          // Süre doldu: hedefi YOK say. resolveArrival(target=null) zaten
          // orduyu eve yollayıp "hedef_yok" raporunu yazıyor.
          ARMY.resolveArrival(m, v, null, { targetName: tgt.name });
          entry.dirty();
          continue;
        }
        /*
          SAVUNANIN KAHRAMANI. Kahraman ÜSSÜNDE duruyorsa o köyün
          savunmasına yüzde ek veriyor. Bonusu burada okuyoruz çünkü
          kahraman kaydı savunanın OTURUMUNDA; army.js oturumu görmüyor.

          Başka köye saldırılırsa bonus YOK: kahraman tek ve bir yerde.
          Bütün köylere birden bonus verseydi, çok köylü oyuncu tek bir
          kahramanla bütün imparatorluğunu güçlendirirdi.
        */
        /*
          SAVUNAN KAHRAMAN — köyde DURAN kahraman kim?

          İki olasılık: ev sahibinin kendi kahramanı üssünde duruyordur,
          ya da BAŞKA bir oyuncunun kahramanı buraya takviyeye gelmiştir.
          İkincisi olmadan "kahramanı savunmaya yolla" hiçbir şey yapmazdı.

          Kahraman TEK olduğu için ikisi aynı anda olamıyor; misafir
          kahraman önce bakılıyor çünkü ev sahibi kendi kahramanını başka
          yere yollamış olabilir.
        */
        let savunanKahYuzde = 0;
        let savunanKahBirim = null;
        const savunanKahramani = () => {
          const misafir = tgt?.village?.misafirKahraman?.userId;
          if (misafir) {
            const ms = userSessions.get(misafir);
            const mk = ms ? kahramanDurumu(ms) : null;
            if (mk && mk.misafirSlot === m.toKey && !mk.olu) return mk;
          }
          if (!tgt?.userId) return null;
          const ts = userSessions.get(tgt.userId);
          const tk = ts ? kahramanDurumu(ts) : null;
          return (tk && tk.usSlot === m.toKey && (tk.nerede || 'koy') === 'koy')
            ? tk : null;
        };
        const savKah = savunanKahramani();
        if (savKah) {
          const b = HERO.bonuslar(savKah);
          savunanKahYuzde = b.savunmaYuzde;
          savunanKahBirim = b.birim || null;
        }
        ARMY.resolveArrival(m, v, tgt?.village || null, {
          targetName: tgt?.name,
          ownerUserId: m.ownerUserId ?? null,
          kahramanSavunmaYuzde: savunanKahYuzde,
          kahramanBirimSavunma: savunanKahBirim,
        });
        entry.dirty();
        if (tgt?.userId) markUserDirty(tgt.userId, m.toKey);
        else if (tgt?.kind === 'npc') markNpcDirty(m.toKey);

        /*
          KAHRAMAN TAKVİYEYE VARDI — ev sahibi köye YERLEŞİYOR.

          Kayıt ev sahibinin köyünde (`misafirKahraman`) tutuluyor: savunma
          bonusunu ararken bütün oturumları taramak zorunda kalmayalım ve
          ev sahibi çevrimdışıyken de bonus işlesin.
        */
        if (m.mode === 'takviye' && m.kahramanUserId && tgt?.village) {
          const ks = userSessions.get(m.kahramanUserId);
          const kk = ks ? kahramanDurumu(ks) : null;
          if (kk && !kk.olu) {
            kk.nerede = 'takviye';
            kk.misafirSlot = m.toKey;
            tgt.village.misafirKahraman = { userId: m.kahramanUserId };
            if (ks) markUserDirty(m.kahramanUserId, ks.capitalSlot);
          }
          m.kahramanSonuc = null;     // takviye savaş değil
          m.kahramanUserId = null;    // aşağıdaki dönüş hesabına girmesin
        }

        /*
          SEFERDEKİ KAHRAMANIN HESABI. XP ve hasar savaş çözülürken
          hesaplandı (army.js · kahramanSonuc); uygulaması burada çünkü
          kahraman saldıranın OTURUMUNDA duruyor.

          Kahraman seferle birlikte DÖNMÜYOR: bayılma ihtimali varken
          "orduyla beraber yürüyor" saymak, geri dönüş yolunda bayılmış
          bir kahramanı köyde göstermek demekti. Savaş biter bitmez
          üssünde sayılıyor; yol yalnız orduya ait.
        */
        if (m.kahramanSonuc && m.kahramanUserId) {
          const ks = userSessions.get(m.kahramanUserId);
          const kk = ks ? kahramanDurumu(ks) : null;
          if (kk) {
            kk.nerede = 'koy';
            HERO.xpEkle(kk, m.kahramanSonuc.xp || 0);
            HERO.hasarVer(kk, m.kahramanSonuc.hasar || 0);
            if (ks) markUserDirty(m.kahramanUserId, ks.capitalSlot);
          }
        }

        /*
          KÖY YOK OLDU MU? Kuşatma son binayı da düşürmüş olabilir.
          Kontrol burada, kusatma.js'te değil: orası yalnız seviye
          düşürüyor; köyün varlığı oturum/dünya/kayıt üçlüsünü
          ilgilendiriyor ve bu dosyanın işi.
        */
        if (tgt?.userId && tgt.village && koyBosMu(tgt.village)) {
          koyuYokEt(tgt.userId, m.toKey, 'kuşatma').catch(err =>
            console.error('[KÖY YIKIM] kuşatma sonrası:', err?.message));
        }

        /*
          MİSAFİR KAYBI SAHİBİNİN NÜFUSUNDAN DÜŞER.

          Savaş ev sahibinin köyünde çözülüyor ama ölen misafir asker
          sahibinin köyünün nüfusunda sayılıyordu. Orada düşülmezse
          takviye gönderen oyuncu bedava nüfus kazanırdı (asker eğitirken
          bir boş işçi tüketilmişti, ölünce geri gelmiyor).
        */
        for (const kayip of m.misafirKayip || []) {
          const sahip = userSessions.get(kayip.userId);
          const koy = sahip?.villages?.get(kayip.slotKey);
          if (!koy) continue;
          koy.population = Math.max(1, (koy.population || 0) - kayip.olu);
          // Askerleri başka köyde öldü — sebebini görebilsin diye rapor
          if (kayip.rapor) ARMY.pushReport(koy, kayip.rapor);
          markUserDirty(kayip.userId, kayip.slotKey);
        }
        m.misafirKayip = null;

        /*
          TAKVİYE ve YERLEŞİM gibi tek yönlü: dönüş ayağı yok, sefer
          listeden silinir (bkz. army.js · march.bitti).
        */
        if (m.bitti) { list.splice(i, 1); continue; }
      } else {
        const { caps, foodRoom } = lootRoom(v);
        ARMY.resolveReturn(m, v, caps, foodRoom);
        list.splice(i, 1);
        entry.dirty();
      }
    }
  }
}
// NOT: seferlerin kendi zamanlayıcısı YOK — NPC/dünya döngüsünden ilerletilir,
// böylece dünya hızıyla tek adımda kalırlar.


/** Oyuncu NPC saldırılarına açık mı? */
function playerRaidable(userId) {
  const s = userSessions.get(userId);
  if (!s) return false;
  const v = s.village;
  if (v.hasAttacked) return true;
  return ARMY.totalUnits(v.army) >= PROTECT_MIN_ARMY;
}

/**
 * Güçlü bir NPC yakındaki oyuncuya yağma gönderir.
 * FAZ 1: NPC'ler yalnız OYUNCUYA saldırır, birbirlerine saldırmaz — NPC-NPC
 * savaşı 200 köyün dengelenmiş ekonomisini bozar ve görünür bir faydası yok.
 */
function maybeNpcRaid(n) {
  if (!NPC_RAIDS_ENABLED) return;
  const now = Date.now();
  if (now - lastNpcRaidAt < NPC_RAID_COOLDOWN_MS / Math.max(0.01, WORLD.speed)) return;
  if (Math.random() > NPC_RAID_CHANCE) return;

  const v = n.village;
  if ((v.marches || []).length >= MAX_MARCHES_PER_TOWN) return;
  const total = ARMY.totalUnits(v.army);
  if (total < NPC_RAID_MIN_ARMY) return;

  // En yakın uygun oyuncuyu bul
  let best = null;
  for (const [slotKey, p] of WORLD.playerBySlot) {
    if (!playerRaidable(p.userId)) continue;
    const slot = WORLD.slotByKey.get(slotKey);
    if (!slot) continue;
    const dist = W.distanceBetween(n.slot, slot);
    if (dist > NPC_RAID_MAX_DISTANCE) continue;
    if (!best || dist < best.dist) best = { slotKey, slot, p, dist };
  }
  if (!best) return;

  // Ordusunun bir kısmını yolla — savunmasız kalmasın
  const units = {};
  for (const [k, cnt] of Object.entries(v.army)) {
    const send = Math.floor(cnt * NPC_RAID_SEND_SHARE);
    if (send > 0) units[k] = send;
  }
  if (ARMY.totalUnits(units) <= 0) return;

  const res = ARMY.createMarch(v, {
    mode: 'raid', units, distance: best.dist,
    fromKey: n.slot.key, fromName: n.slot.name,
    toKey: best.slotKey, toName: best.p.name || best.slot.name,
    toKind: 'player', ownerKind: 'npc',
  });
  if (!res.ok) return;
  lastNpcRaidAt = now;
  markNpcDirty(n.slot.key);
  console.log(`[YAĞMA] ${n.slot.name} → ${best.p.name} (${best.dist} hex, ${ARMY.totalUnits(units)} asker, ${res.march.legSeconds} sn)`);
}

// ═══════════════════════════════════════════════════════════════════
//  İSTATİSTİK — dünya sıralamaları
// ═══════════════════════════════════════════════════════════════════
/*
  Sıralamanın kuralları game/istatistik.js'in başında yazılı: satırlar
  OYUNCU başına (köy başına değil) ve ordu bilgisi tabloya hiç girmiyor.
  Burada yalnız VERİ TOPLANIYOR.
*/

/**
 * ÇEVRİMDIŞI OYUNCULAR DA SIRALAMAYA GİRER.
 *
 * Eskiden yalnız `userSessions` taranıyordu: çevrimdışı oyuncunun köyü
 * bellekte olmadığı için listeden düşüyordu. Sıralama kimin o an bağlı
 * olduğuna göre değişiyordu — bir tablo için kabul edilemez.
 *
 * Çevrimdışı veriler veritabanından geliyor ve 60 sn önbellekleniyor:
 * tam tablo taraması her istekte yapılacak iş değil, sıralama da o
 * sürede anlamlı biçimde değişmiyor. Bağlı oyuncunun köyü bellekten
 * ALINIR ve DB kopyasının üstüne yazılır — bellek her zaman daha taze.
 */
const STATS_DB_TTL = 60000;
let statsDbCache = { at: 0, rows: [] };

async function statsKoyleriDbden() {
  if (Date.now() - statsDbCache.at < STATS_DB_TTL) return statsDbCache.rows;
  const rows = await loadAllVillages();
  statsDbCache = { at: Date.now(), rows };
  return rows;
}

/**
 * Bu oyuncunun sıralamada görünecek adı.
 *
 * `ownerName` e-posta yoksa herkese "oyuncu" diyor; sıralamada bu dört
 * satırın da aynı isimle görünmesi demek — kimin kim olduğu okunmuyor.
 * Burada son çare olarak kullanıcı numarası ekleniyor: çirkin ama
 * ayırt edici. Oyuncu adını belirleyince zaten o görünüyor.
 */
function statsOyuncuAdi(userId) {
  const ad = WORLD.ownerByUser.get(userId);
  if (ad) return ad;
  for (const p of WORLD.playerBySlot.values()) {
    if (p.userId === userId && p.email) return ownerName(userId, p.email);
  }
  return ownerName(userId, userSessions.get(userId)?.userEmail);
}

async function buildStats(forUserId) {
  /** userId -> { name, koyler: [{ v, slotKey, adi }] } */
  const oyuncular = new Map();
  const al = (userId) => {
    let o = oyuncular.get(userId);
    if (!o) { o = { name: statsOyuncuAdi(userId), koyler: [] }; oyuncular.set(userId, o); }
    return o;
  };

  // 1) Veritabanı — çevrimdışı oyuncular dahil herkes
  let dbHata = null;
  try {
    for (const row of await statsKoyleriDbden()) {
      al(row.userId).koyler.push({
        v: row.state, slotKey: row.slotKey,
        adi: row.name || WORLD.slotByKey.get(row.slotKey)?.name || row.slotKey,
      });
    }
  } catch (err) {
    dbHata = err.message;                      // bellekteki oyuncularla devam
  }

  // 2) Bellek — bağlı oyuncunun köyü DB kopyasının üstüne yazılır
  for (const [userId, sess] of userSessions) {
    const o = al(userId);
    for (const [slotKey, v] of sess.villages) {
      const adi = WORLD.playerBySlot.get(slotKey)?.name
        || WORLD.slotByKey.get(slotKey)?.name || slotKey;
      const idx = o.koyler.findIndex((k) => k.slotKey === slotKey);
      const kayit = { v, slotKey, adi };
      if (idx >= 0) o.koyler[idx] = kayit; else o.koyler.push(kayit);
    }
  }

  const boards = IST.tablolariKur(oyuncular, forUserId);
  const koySayisi = [...oyuncular.values()].reduce((t, o) => t + o.koyler.length, 0);
  return {
    updatedAt: Date.now(), villageCount: koySayisi,
    playerCount: oyuncular.size, dbHata, boards,
  };
}

/**
 * AD DOĞRULAMA — kural TEK yerde: server/adKurallari.js.
 *
 * İki giriş noktası aynı kuralı kullanıyor: kayıt (auth.js · oyuncu adı,
 * artık kayıt anında alınıyor) ve oyun soketi (burası · köy adı). İkiz
 * yazılsaydı biri değişince diğeri sessizce ayrışırdı.
 */
const { adDogrula } = require('./adKurallari');

/**
 * DÜNYAYI HERKESE YENİDEN YOLLA.
 *
 * Anlık görüntü BAKAN oyuncuya göre değişiyor (kendi köyü 'self',
 * mesafeye göre tarlalar) — tek bir paketi herkese yayamayız, her
 * oturum için ayrı üretiliyor. Ad değişikliği gibi HERKESİ ilgilendiren
 * ama seyrek olan olaylarda çağrılır; tick yolunda kullanılmaz.
 */
function yayinlaDunya() {
  for (const [uid, s] of userSessions) {
    const room = userRoom(uid);
    if (!io.sockets.adapter.rooms.get(room)) continue;   // çevrimdışı
    try { io.to(room).emit('world_snapshot', worldSnapshot(uid, s.activeSlot)); }
    catch (err) { console.error('[WORLD YAYIN]', err.message); }
  }
}

/**
 * Bu oyuncunun görünen adı: seçtiği ad → e-postanın @ öncesi → kullanıcı no.
 *
 * Son çare eskiden düz "oyuncu"ydu; adını henüz koymamış dört oyuncu
 * haritada ve sıralamada AYNI isimle görünüyor, kimin kim olduğu
 * okunmuyordu. Numara çirkin ama ayırt edici.
 */
const ownerName = (userId, email) =>
  WORLD.ownerByUser.get(userId)
  || (email ? String(email).split('@')[0] : `oyuncu#${userId}`);

/** Oyuncuya harita üzerinde yer ver (yoksa) */
async function ensurePlayerSlot(userId, email) {
  if (WORLD.slotByUser.has(userId)) return WORLD.slotByUser.get(userId);
  const taken = new Set([...WORLD.npcs.keys(), ...WORLD.playerBySlot.keys()]);
  const slot = W.findSpawnSlot(WORLD.slots, taken);
  if (!slot) return null;
  /*
    KÖY ADI = slotun kendi Nordic adı.
    Eskiden buraya e-postanın @ öncesi yazılıyordu; herkesin köyü
    haritada mail adresiyle görünüyordu. Oyuncu adı ayrı tutuluyor
    (WORLD.ownerByUser), köy adını oyuncu sonradan değiştirebiliyor.
  */
  const name = slot.name;
  WORLD.playerBySlot.set(slot.key, { userId, email, name });
  WORLD.slotByUser.set(userId, slot.key);
  if (!WORLD.slotsByUser.has(userId)) WORLD.slotsByUser.set(userId, new Set());
  WORLD.slotsByUser.get(userId).add(slot.key);
  // İlk köy MERKEZ olur
  try { await setPlayerSlot(userId, slot.key, name, true); }
  catch (err) { console.error('[WORLD] slot kaydı:', err.message); }
  console.log(`[WORLD] ${email} → ${slot.key} (${slot.name}, ring ${slot.ring})`);
  return slot.key;
}

/**
 * TEK HARİTA göçü: eski (600 hex'lik yerel harita) kayıtlarda köy toprağının
 * dışında kalan tarlalar var. Onları claim halkasındaki boş slotlara taşı —
 * tür/seviye/işçi korunur, kayıp olmaz.
 */
const CLAIM_KEYS = (() => {
  const out = [];
  for (let q = -W.CLAIM_RADIUS; q <= W.CLAIM_RADIUS; q++) {
    for (let r = -W.CLAIM_RADIUS; r <= W.CLAIM_RADIUS; r++) {
      if (q === 0 && r === 0) continue;
      if (W.hexDistance(q, r) <= W.CLAIM_RADIUS) out.push(`${q},${r}`);
    }
  }
  return out.sort((a, b) => {
    const [aq, ar] = a.split(',').map(Number);
    const [bq, br] = b.split(',').map(Number);
    return W.hexDistance(aq, ar) - W.hexDistance(bq, br) || a.localeCompare(b);
  });
})();

function migrateTilesIntoClaim(village, who = '') {
  const stray = Object.keys(village.productionTiles)
    .filter(k => {
      const [q, r] = k.split(',').map(Number);
      return W.hexDistance(q, r) > W.CLAIM_RADIUS;
    });
  if (!stray.length) return false;

  const wq = village.worldQ || 0, wr = village.worldR || 0;
  for (const oldKey of stray) {
    const tile = village.productionTiles[oldKey];
    // Bonusu türüne uyan boş slotu tercih et, yoksa merkeze en yakın boşu al
    const free = CLAIM_KEYS.filter(k => !village.productionTiles[k]);
    if (!free.length) { delete village.productionTiles[oldKey]; continue; }
    const best = free.find(k => {
      const [lq, lr] = k.split(',').map(Number);
      const b = W.worldTileBonus(wq + lq, wr + lr);
      return b && b.resource === tile.type;
    }) || free[0];
    delete village.productionTiles[oldKey];
    village.productionTiles[best] = tile;
    console.log(`[GÖÇ] ${who} tarla ${oldKey} → ${best} (${tile.type} lvl ${tile.level})`);
  }
  return true;
}

/** Harita anlık görüntüsü — sekme açıldığında istenir, her tick gönderilmez */
function worldSnapshot(forUserId, activeSlot = null) {
  // ÇOKLU KÖY: harita AKTİF köyün çevresine odaklanır
  const mySlot = activeSlot || WORLD.slotByUser.get(forUserId) || null;
  const me = mySlot ? WORLD.slotByKey.get(mySlot) : null;

  // Yakındaki köylerin TARLALARI da gönderilir; harita onları oyuncunun
  // tarlaları gibi (doku + seviye) çizsin. Uzaktakiler için gereksiz veri olur.
  const TILE_RADIUS = 30;
  /**
   * Yakındaki köylerin tarlaları haritaya çizilsin diye gönderilir.
   * SEVİYE YALNIZ KENDİ köylerimde: yabancının tarla seviyesi keşifsiz
   * bilinmemeli, yoksa harita bedava istihbarat oluyor. Yabancıya
   * seviye yerine 0 gidiyor; istemci rozeti çizmiyor.
   */
  const tileMap = (village, seviyeGoster) => Object.fromEntries(
    Object.entries(village.productionTiles || {})
      .filter(([, b]) => b.level >= 1)
      .map(([k, b]) => [k, [b.type, seviyeGoster ? b.level : 0]])
  );

  const villages = [];
  for (const n of WORLD.npcs.values()) {
    const s = npcSummary(n.village);
    const dist = me ? W.distanceBetween(me, n.slot) : null;
    villages.push({
      key: n.slot.key, q: n.slot.q, r: n.slot.r,
      name: n.slot.name, tier: n.slot.tier, tierLabel: n.slot.tierLabel,
      kind: 'npc',
      population: s.population, army: s.army, score: s.score,
      surLevel: s.surLevel, hendekLevel: s.hendekLevel,
      distance: dist,
      tiles: (dist != null && dist <= TILE_RADIUS) ? tileMap(n.village, false) : null,
    });
  }
  for (const [key, p] of WORLD.playerBySlot) {
    const slot = WORLD.slotByKey.get(key);
    if (!slot) continue;
    const session = userSessions.get(p.userId);
    /*
      DÜZELTME: `session.village` AKTİF köyü verir. Oyuncunun ikinci köyü
      için de aktif köyün tarlaları gönderiliyordu; harita o tarlaları
      yanlış konuma çiziyordu. Slotun kendi köyü alınmalı.
    */
    const v = session?.villages?.get(key) || null;
    villages.push({
      key, q: slot.q, r: slot.r,
      name: p.name || slot.name, tier: slot.tier, tierLabel: 'Oyuncu',
      // Köyün adı ile SAHİBİNİN adı ayrı; harita ikisini de gösteriyor
      owner: ownerName(p.userId, p.email),
      kind: p.userId === forUserId ? 'self' : 'player',
      population: v?.population ?? null,
      /**
       * ORDU YALNIZ KENDİ KÖYÜMDE.
       *
       * Harita başkasının asker sayısını yazıyordu: hedef seçmek için
       * kimseyle savaşmaya, izci göndermeye, hiçbir şey yapmaya gerek
       * kalmıyordu — bütün dünyanın ordusu tek bakışta okunuyordu.
       * İzci birimi de bu yüzden anlamsızdı. Artık sur/hendek gibi
       * ordu da keşifle öğreniliyor (bkz. mapPanels · ForeignVillagePanel).
       */
      army: (v && p.userId === forUserId)
        ? Object.values(v.army || {}).reduce((a, b) => a + b, 0)
        : null,
      score: null, surLevel: 0, hendekLevel: 0,
      distance: me ? W.distanceBetween(me, slot) : null,
      tiles: v && me && W.distanceBetween(me, slot) <= TILE_RADIUS
        ? tileMap(v, p.userId === forUserId) : null,
    });
  }

  return {
    radius: W.WORLD_RADIUS,
    claimRadius: W.CLAIM_RADIUS,
    minDistance: W.MIN_DISTANCE,
    tiers: W.TIERS,
    mySlot,
    emptySlots: WORLD.slots
      .filter(s => !WORLD.npcs.has(s.key) && !WORLD.playerBySlot.has(s.key))
      .map(s => ({ key: s.key, q: s.q, r: s.r, name: s.name, tier: s.tier })),
    villages,
  };
}

// Global tick polling (50ms) — socket olmasa da tüm köyler tick'lenir
setInterval(() => {
  const now = Date.now();
  for (const [userId, session] of userSessions) {
    if (now >= session.nextTickAt) {
      // Aralık yalnızca EKRAN tazeleme sıklığı; tempo geçen süreden geliyor
      session.nextTickAt = now + Math.min(DEFAULT_TICK_MS, Math.max(100, session.tickMs));
      /*
        Bir oyuncunun köyünde çıkan hata DİĞER oyuncuların tick'ini almasın.
        Kalkansız hâlde döngü terk ediliyor ve sıradaki bütün oturumlar o turu
        kaçırıyordu; hata her turda tekrarlandığı için de kalıcı oluyordu.
      */
      try { runTickForUser(userId, session); }
      catch (err) { kalkanLog(`tick userId=${userId}`, err); }
    }
  }
}, 50);

/**
 * Kirli köyleri kaydet. Çoklu köyde oyuncunun her köyü AYRI satır, o yüzden
 * `dirtySlots` gezilir. Bir köyün kaydı patlarsa o slot kirli kalır ve
 * sonraki turda yeniden denenir — diğer köyler etkilenmez.
 */
async function flushSession(userId, session) {
  if (!session.dirtySlots.size) return;
  const slots = [...session.dirtySlots];
  for (const slotKey of slots) {
    const v = session.villages.get(slotKey);
    if (!v) { session.dirtySlots.delete(slotKey); continue; }
    try {
      await saveVillage(userId, slotKey, v);
      session.dirtySlots.delete(slotKey);
    } catch (err) {
      console.error(`[DB SAVE] userId=${userId} slot=${slotKey}`, err.message);
    }
  }
}

// Periyodik DB kaydet (30sn)
setInterval(async () => {
  for (const [userId, session] of userSessions) await flushSession(userId, session);
}, 30000);

// Socket.io auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('auth:token_missing'));
  try {
    const payload = verifyToken(token);
    socket.userId    = payload.userId;
    socket.userEmail = payload.email;
    next();
  } catch {
    next(new Error('auth:token_invalid'));
  }
});

io.on('connection', async socket => {
  const { userId, userEmail } = socket;
  console.log(`[CONNECT] ${userEmail} (${userId})`);

  /**
   * KOMUT KALKANI — bir handler'daki hata SUNUCUYU düşürmesin.
   *
   * Socket.io handler hatalarını yakalamıyor: fırlayan hata uncaughtException'a
   * kadar çıkıyor ve süreç ölüyor — o an oynayan HERKESLE birlikte. Bir
   * oyuncunun geçersiz komutu bütün dünyayı düşürmemeli. (Ölçüldü: havuzda 10
   * işçi varken 42 kadroluk tarlaya atama isteği sunucuyu exit(1) ile
   * öldürüyordu.)
   *
   * Kalkan ayrı bir sarmalayıcı fonksiyona değil, `socket.on`un KENDİSİNE
   * takılıyor. Sebep: bu dosyaya yeni olay eklemek olağan iş (bkz.
   * PROJE_CONTEXT.md) ve hatırlanması gereken bir koruma er ya da geç
   * unutulur. Async handler'ların reddi de yakalanıyor; yoksa Node 22+
   * süreci yine öldürürdü.
   *
   * Hata YUTULMUYOR: tam yığın izi olay adı ve oyuncuyla loglanıyor, istemciye
   * de `komut_hatasi` gidiyor ki arayüz sebepsiz donmasın.
   */
  const komutHatasi = (event, err) => {
    console.error(`[KOMUT HATASI] ${event} · userId=${userId} (${userEmail})`);
    console.error(err?.stack || err);
    try { socket.emit('komut_hatasi', { event }); } catch { /* soket kapanmış olabilir */ }
  };
  const socketOn = socket.on.bind(socket);
  socket.on = (event, handler) => socketOn(event, (...args) => {
    try {
      const sonuc = handler(...args);
      if (sonuc && typeof sonuc.then === 'function') sonuc.catch(err => komutHatasi(event, err));
    } catch (err) { komutHatasi(event, err); }
  });

  /*
    Bu `await` kalkanın DIŞINDA: bağlantı geri çağrısının kendisi async, yani
    burada fırlayan hata handler değil, yakalanmamış bir RET oluyordu ve Node
    22+ süreci öldürüyordu. Veritabanı bir an cevap vermezse tek bir bağlanma
    denemesi sunucuyu düşürebilirdi. Artık bağlantı kesiliyor; istemci sınırsız
    yeniden bağlanma ile birazdan tekrar deniyor (bkz. client/src/App.jsx).
  */
  /*
    OYUNCU ADINI BELLEĞE AL.

    `WORLD.ownerByUser` AÇILIŞTA bir kez yükleniyor (loadDisplayNames).
    Ad artık KAYIT sırasında veriliyor, yani sunucu açıldıktan sonra
    kaydolan oyuncu bu haritada yok: adı olduğu hâlde "adsız" sayılıyor,
    açılışta ad ekranı soruluyor ve adını değiştirebiliyordu (testte
    yakalandı). Bağlantıda bir kez kayıttan okunuyor.
  */
  if (!WORLD.ownerByUser.has(userId)) {
    try {
      const kayit = await findUserById(userId);
      if (kayit?.display_name) WORLD.ownerByUser.set(userId, kayit.display_name);
    } catch (err) {
      console.error('[AD] kullanıcı adı okunamadı:', err.message);
    }
  }

  let slotKey;
  try {
    slotKey = await ensurePlayerSlot(userId, userEmail);
  } catch (err) {
    console.error(`[BAĞLANTI] ${userEmail} için dünya slotu alınamadı:`, err?.stack || err);
    socket.disconnect(true);
    return;
  }
  const slot = slotKey ? WORLD.slotByKey.get(slotKey) : null;

  socket.join(userRoom(userId));

  let session = userSessions.get(userId);
  if (session) {
    session.socketId = socket.id;
    session.userId = userId;
    session.userEmail = userEmail;
  } else {
    /**
     * ÇOKLU KÖY: oyuncunun bütün köyleri yüklenir. Hiç kaydı yoksa ilk köy
     * kurulur ve MERKEZ olur. Kayıtlı ama slotu dünyada bulunmayan köy
     * atlanır (dünya yeniden tohumlanmış olabilir).
     */
    const villages = new Map();
    let capitalSlot = null;
    try {
      const rows = await loadVillages(userId);
      for (const row of rows) {
        if (!row.state || !row.slotKey) continue;
        // Izgara dışı (göçmenle kurulmuş) köyler için slot kaydını üret
        const sl = WORLD.slotByKey.get(row.slotKey) || ensureSlotByKey(row.slotKey);
        if (!sl) {
          console.warn(`[DB LOAD] userId=${userId} slot ${row.slotKey} çözülemedi, atlandı`);
          continue;
        }
        const v = hydrateVillage(row.state);
        // Eski kayıtlar konumsuz olabilir — slotuna oturt
        if (v.worldQ !== sl.q || v.worldR !== sl.r) { v.worldQ = sl.q; v.worldR = sl.r; }
        v.isCapital = !!row.isCapital;
        villages.set(row.slotKey, v);
        if (row.isCapital) capitalSlot = row.slotKey;
      }
    } catch (err) {
      console.error(`[DB LOAD] userId=${userId}`, err.message);
    }

    if (!villages.size) {
      const v = createVillage(slot?.q || 0, slot?.r || 0);
      v.isCapital = true;
      villages.set(slotKey, v);
      capitalSlot = slotKey;
    }
    capitalSlot ||= [...villages.keys()][0];
    // Merkez bayrağı köy nesnelerinde de tutarlı olsun (canBuildAt okuyor)
    for (const [k, v] of villages) v.isCapital = (k === capitalSlot);

    session = makeSession(userId, {
      villages, activeSlot: capitalSlot, capitalSlot,
      tickMs: DEFAULT_TICK_MS, socketId: socket.id,
    });
    // Oyuncu adı verilmemişse e-postanın @ öncesine düşülüyor
    session.userEmail = userEmail;
    userSessions.set(userId, session);
    if (villages.size > 1) {
      console.log(`[CONNECT] userId=${userId} ${villages.size} köy yüklendi`
        + ` (merkez ${capitalSlot})`);
    }
  }
  /*
    OKUNMAMIŞ MESAJ SAYISI — bağlantıda BİR KEZ okunur.

    emitVillage senkron ve saniyede bir çalışabiliyor; oraya sorgu koymak
    tick yoluna veritabanı gecikmesi sokardı. Bundan sonrası elle: mesaj
    gelince, okununca ya da silinince `mesajSayaciYenile` güncelliyor.
  */
  try {
    session.mesajOkunmamis = await mesajOkunmamisSayisi(userId);
  } catch (err) {
    console.error('[MESAJ] okunmamış sayısı okunamadı:', err.message);
    session.mesajOkunmamis = 0;
  }

  socketToUser.set(socket.id, userId);
  emitVillage(session, { force: true, statics: true });

  const v     = () => session.village;
  const emit  = () => emitVillage(session, { force: true });
  const dirty = () => { session.dirty = true; };

  /**
   * KÖY DEĞİŞTİR. Sunucu tarafında yalnız `activeSlot` değişiyor: bütün
   * komut işleyicileri `v()` = aktif köy üzerinden çalıştığı için otomatik
   * olarak yeni köye uygulanıyor. Köylerin hepsi zaten tick alıyor, yani
   * arkadaki köyler çalışmaya devam ediyor.
   */
  /**
   * OYUNCU ADINI BELİRLE / DEĞİŞTİR.
   *
   * Ad benzersiz (büyük/küçük harf duyarsız) ve veritabanındaki tekil
   * dizin son sözü söylüyor: iki kişi aynı anda aynı adı isterse biri
   * `ad_alinmis` alır. Ad değişince haritadaki bütün istemcilerin
   * gördüğü sahip adı da değişmeli, o yüzden dünya yayını tazeleniyor.
   */
  /**
   * OYUNCU ADI — YALNIZ BİR KEZ.
   *
   * Ad artık kayıt sırasında alınıyor (auth.js). Bu olay yalnızca ADSIZ
   * ESKİ HESAPLAR için duruyor: adı olan bir hesapta çağrılırsa reddedilir.
   * Ad haritada, savaş raporlarında ve sıralamada geçtiği için sonradan
   * değişmesi başkalarının gördüğü geçmişi yalanlıyordu.
   */
  /*
    ═══════════════════════════════════════════════════════════════
      MESAJLAŞMA
    ═══════════════════════════════════════════════════════════════

    Alıcı OYUNCU ADIYLA seçiliyor, userId ile değil: istemciye kullanıcı
    numarası vermek oyuncuları numaralarıyla eşleştirmeye yarar ve adın
    zaten benzersiz olması bunu gereksiz kılıyor.
  */
  const mesajHata = (reason) =>
    socket.emit('mesaj_sonuc', { ok: false, reason,
      message: MESAJ.HATA_METNI[reason] || 'Mesaj gönderilemedi.' });

  /** Sayaç hem oturumda hem yayında güncel kalsın */
  const mesajSayaciYenile = async (uid = userId) => {
    try {
      const s = userSessions.get(uid);
      if (!s) return;
      s.mesajOkunmamis = await mesajOkunmamisSayisi(uid);
      const oturumSoketi = s.socketId && io.sockets.sockets.get(s.socketId);
      if (oturumSoketi) emitVillage(s, { force: true });
    } catch (err) {
      console.error('[MESAJ] sayaç yenilenemedi:', err.message);
    }
  };

  socket.on('mesaj_gonder', async ({ alici, konu, govde } = {}) => {
    const dogrulama = MESAJ.mesajDogrula({ konu, govde });
    if (!dogrulama.ok) return mesajHata(dogrulama.reason);

    const hiz = MESAJ.hizSiniri(userId);
    if (!hiz.ok) return mesajHata(hiz.reason);

    const hedef = await findUserByDisplayName(alici);
    if (!hedef) return mesajHata('alici_yok');
    if (hedef.id === userId) return mesajHata('kendine');

    /*
      ENGELLİYSE SESSİZCE DÜŞ. Gönderene "engellendin" demek, taciz edene
      hangi hesabın çalıştığını söylemek olur; hız sınırı da bu yüzden
      yine işletiliyor (engelli gönderim bedava deneme hakkı olmasın).
    */
    MESAJ.gonderimiKaydet(userId);
    if (await engelliMi(hedef.id, userId)) {
      return socket.emit('mesaj_sonuc', { ok: true, id: null, sessiz: true });
    }

    const kayit = await mesajYaz({
      fromUserId: userId, toUserId: hedef.id,
      konu: dogrulama.konu, govde: dogrulama.govde,
    });
    socket.emit('mesaj_sonuc', { ok: true, id: kayit.id });
    // Alıcı çevrimiçiyse rozeti anında güncellensin
    io.to(userRoom(hedef.id)).emit('mesaj_geldi', {
      gonderen: ownerName(userId, userEmail), konu: dogrulama.konu });
    await mesajSayaciYenile(hedef.id);
    console.log(`[MESAJ] ${userEmail} → ${hedef.display_name}`);
  });

  /**
   * MESAJ ALICISI İÇİN OYUNCU LİSTESİ.
   *
   * Kaynak BELLEKTEKİ ad haritası (`WORLD.ownerByUser`), veritabanı değil:
   * kutu her tuş vuruşunda süzülüyor, oraya sorgu koymak yazarken sunucuya
   * yük bindirirdi. Harita zaten bu adları gösteriyor, yeni bir bilgi
   * sızdırmıyor.
   *
   * Liste KISALTILIYOR (en fazla 40): binlerce oyuncuda tam listeyi
   * yollamak hem paketi şişirir hem de kutuyu okunmaz yapar. Aranan ad
   * listede yoksa oyuncu ELLE yazabiliyor — sunucu adı yine
   * veritabanından çözüyor, yani liste bir kolaylık, kapı değil.
   */
  socket.on('mesaj_oyuncular', ({ q = '' } = {}) => {
    const aranan = String(q || '').trim().toLocaleLowerCase('tr');
    const hepsi = [];
    for (const [uid, ad] of WORLD.ownerByUser) {
      if (uid === userId || !ad) continue;          // kendine mesaj yok
      if (aranan && !ad.toLocaleLowerCase('tr').includes(aranan)) continue;
      hepsi.push(ad);
    }
    hepsi.sort((a, b) => a.localeCompare(b, 'tr'));
    socket.emit('mesaj_oyuncu_listesi', { q, liste: hepsi.slice(0, 40), toplam: hepsi.length });
  });

  socket.on('mesaj_kutusu', async () => {
    const liste = await mesajKutusu(userId);
    const engelliler = await engelListesi(userId);
    socket.emit('mesaj_listesi', { liste, engelliler });
  });

  socket.on('mesaj_okundu', async ({ id } = {}) => {
    if (await mesajOkundu(userId, id)) await mesajSayaciYenile();
  });

  socket.on('mesaj_sil', async ({ id } = {}) => {
    const oldu = await mesajSil(userId, id);
    if (!oldu) return mesajHata('mesaj_yok');
    await mesajSayaciYenile();
    socket.emit('mesaj_sonuc', { ok: true, silindi: id });
  });

  socket.on('mesaj_engelle', async ({ ad, kaldir = false } = {}) => {
    const hedef = await findUserByDisplayName(ad);
    if (!hedef) return mesajHata('alici_yok');
    if (hedef.id === userId) return mesajHata('kendine');
    if (kaldir) await engelKaldir(userId, hedef.id);
    else await engelEkle(userId, hedef.id);
    socket.emit('mesaj_engel_listesi', { liste: await engelListesi(userId) });
  });

  /**
   * KARŞILAMA ANLATIMI BİTTİ — bir kez yazılır, geri alınmaz.
   *
   * "Gördüm" kararını istemci veriyor ama KAYIT sunucuda: oyuncu farklı
   * bir tarayıcıdan girince anlatımı tekrar görmesin, depoyu temizleyerek
   * de atlayamasın.
   */
  socket.on('tutorial_done', () => {
    if (egitimBitir(session)) { dirty(); emit(); }
  });

  socket.on('set_player_name', async ({ name } = {}) => {
    if (WORLD.ownerByUser.has(userId)) {
      return socket.emit('name_result', {
        ok: false, alan: 'oyuncu', message: 'Kullanıcı adı değiştirilemez' });
    }
    const { ad, hata } = adDogrula(name, { enAz: 3, enCok: 18 });
    if (hata) return socket.emit('name_result', { ok: false, alan: 'oyuncu', message: hata });

    let kayit;
    try { kayit = await setDisplayName(userId, ad); }
    catch (err) {
      console.error('[AD] oyuncu adı:', err.message);
      return socket.emit('name_result', { ok: false, alan: 'oyuncu', message: 'Kaydedilemedi' });
    }
    if (!kayit) {
      return socket.emit('name_result', {
        ok: false, alan: 'oyuncu', message: 'Bu ad başka bir oyuncuda' });
    }

    WORLD.ownerByUser.set(userId, ad);
    socket.emit('name_result', { ok: true, alan: 'oyuncu', name: ad });
    io.to(userRoom(userId)).emit('player_name', { name: ad });
    emitVillage(session, { force: true, statics: true });
    yayinlaDunya();
    console.log(`[AD] ${userEmail} → "${ad}"`);
  });

  /**
   * KÖY ADINI DEĞİŞTİR. Yalnız oyuncunun KENDİ köyü; slotKey verilmezse
   * aktif köy. Köy adları benzersiz DEĞİL (iki oyuncunun "Kuzeykale"si
   * olabilir) — karışıklığı sahip adı çözüyor.
   */
  socket.on('rename_village', async ({ slotKey, name } = {}) => {
    const key = slotKey || session.activeSlot;
    if (!key || !session.villages.has(key)) {
      return socket.emit('name_result', { ok: false, alan: 'koy', message: 'Bu köy senin değil' });
    }
    const { ad, hata } = adDogrula(name, { enAz: 2, enCok: 22 });
    if (hata) return socket.emit('name_result', { ok: false, alan: 'koy', message: hata });

    try { await renameVillage(userId, key, ad); }
    catch (err) {
      console.error('[AD] köy adı:', err.message);
      return socket.emit('name_result', { ok: false, alan: 'koy', message: 'Kaydedilemedi' });
    }

    const kayit = WORLD.playerBySlot.get(key);
    if (kayit) kayit.name = ad;
    else WORLD.playerBySlot.set(key, { userId, email: userEmail, name: ad });

    socket.emit('name_result', { ok: true, alan: 'koy', name: ad, slotKey: key });
    emitVillage(session, { force: true, statics: true });
    yayinlaDunya();
    console.log(`[AD] ${userEmail} köy ${key} → "${ad}"`);
  });

  socket.on('switch_village', ({ slotKey } = {}) => {
    if (!slotKey || !session.villages.has(slotKey)) {
      if (IS_DEV_ENTRY) console.warn(`[KÖY DEĞİŞ RED] ${slotKey}: oyuncunun köyü değil`);
      return;
    }
    if (session.activeSlot === slotKey) return;
    session.activeSlot = slotKey;
    // Statikleri de gönder: yeni köyün panelleri baştan kurulacak
    emitVillage(session, { force: true, statics: true });
    console.log(`[KÖY] userId=${userId} → ${slotKey}`);
  });

  /**
   * MERKEZ KÖYÜ TAŞI. Saraydan çağrılıyor: saray oyuncu çapında tek olduğu
   * için "merkez" onun bulunduğu köye taşınabiliyor. Şart: istenen köyde
   * kurulmuş (seviye ≥ 1) bir saray olmalı.
   *
   * Merkez bayrağı köy nesnelerinde de tutuluyor (canBuildAt ve payload
   * okuyor), o yüzden hepsi baştan yazılıyor.
   */
  /**
   * KAHRAMAN SKİL PUANI DAĞIT.
   *
   * Dağıtım KISMÎ uygulanmıyor (bkz. game/kahraman.js · puanDagit): puan
   * yetmiyorsa ya da skil tavanı aşılıyorsa istek tamamen reddediliyor.
   * Yarısı uygulanmış bir dağıtım oyuncunun geri alamayacağı sessiz bir
   * hata olurdu.
   */
  socket.on('kahraman_puan', ({ skil, adet = 1 } = {}) => {
    const kah = kahramanDurumu(session);
    if (!kah) return socket.emit('kahraman_error', { reason: 'kahraman_yok' });
    const r = HERO.puanDagit(kah, skil, adet);
    if (!r.ok) return socket.emit('kahraman_error', { reason: r.sebep });
    dirty(); emit();
  });

  /**
   * SKİLLERİ SIFIRLA — bedeli KATLANARAK artıyor.
   *
   * Bedelsiz olsaydı oyuncu her savaştan önce puanları saldırıya, savunma
   * sırasında savunmaya taşır ve iki tavandan da aynı anda faydalanırdı.
   * Bedel AKTİF köyden alınıyor: oyuncunun kaynağı köyde durur, hesapta değil.
   */
  socket.on('kahraman_sifirla', () => {
    const kah = kahramanDurumu(session);
    if (!kah) return socket.emit('kahraman_error', { reason: 'kahraman_yok' });
    const village = v();
    const bedel = HERO.sifirlamaBedeli(kah);
    const eksik = KUYRUK.eksikler(village.resources, bedel);
    if (Object.keys(eksik).length) {
      return socket.emit('kahraman_error', {
        reason: 'yetersiz_kaynak', metin: KUYRUK.eksikMetni(eksik) });
    }
    for (const [k2, n] of Object.entries(bedel)) village.resources[k2] -= n;
    HERO.skilleriSifirla(kah);
    dirty(); emit();
  });

  /**
   * MACERAYA ÇIK.
   *
   * Koşulların tamamı SUNUCUDA ölçülüyor (bkz. macera.js · maceraUygunMu):
   * baygın değil, başka işte değil, macera hakkı var, canı eşiğin üstünde.
   * İstemcinin düğmeyi gizlemesi bir denetim değildir.
   */
  socket.on('macera_baslat', ({ tip = 'kisa' } = {}) => {
    const kah = kahramanDurumu(session);
    const konak = kahramanKonagi(session);
    const canTavan = kah ? HERO.canTavani(HERO.xpSeviyesi(kah.xp || 0)) : 0;
    const uygun = MACERA.maceraUygunMu(kah, tip, canTavan);
    if (!uygun.ok) return socket.emit('kahraman_error', { reason: uygun.sebep });
    if (!konak) return socket.emit('kahraman_error', { reason: 'konak_yok' });

    kah.maceraSayisi -= 1;
    kah.nerede = 'macera';
    kah.macera = { tip, kalanSaat: MACERA.MACERA_TIPLERI[tip].saat };
    dirty(); emit();
    console.log(`[MACERA] ${userEmail} ${tip} maceraya çıktı`);
  });

  /**
   * EŞYA KUŞAN / ÇIKAR / AT.
   *
   * Üçü de tek yerden: istemcideki sürükle-bırak yalnız bir görünüm,
   * karar sunucuda. Kuşanma SEFERDE ya da MACERADAYKEN kapalı — eşyayı
   * yolda değiştirip savaş gücünü büyütmek mümkün olmamalı (sefer gücü
   * zaten çıkarken donduruluyor, bu ikinci kapı).
   */
  const kusamIslemi = (fn) => {
    const kah = kahramanDurumu(session);
    if (!kah) return socket.emit('kahraman_error', { reason: 'kahraman_yok' });
    if ((kah.nerede || 'koy') !== 'koy') {
      return socket.emit('kahraman_error', { reason: 'mesgul' });
    }
    const r = fn(kah);
    if (!r.ok) return socket.emit('kahraman_error', { reason: r.sebep });
    dirty(); emit();
  };

  socket.on('kusam_kusan', ({ indeks } = {}) =>
    kusamIslemi(kah => KUSAM.kusan(kah, Number(indeks))));
  socket.on('kusam_cikar', ({ slot } = {}) =>
    kusamIslemi(kah => KUSAM.cikar(kah, String(slot || ''))));
  socket.on('kusam_at', ({ indeks } = {}) =>
    kusamIslemi(kah => KUSAM.at(kah, Number(indeks))));

  /**
   * KAHRAMANI DİRİLT — iki yol: HAMMADDE ya da DİRİLTME İKSİRİ.
   *
   * İki yol olması bilinçli (İlkan'ın kararı): kaynak biriktiren oyuncu
   * ödeyerek, macera oynayan oyuncu iksirle geri alır. Tek yol olsaydı
   * oynama tarzlarından biri ölüm karşısında çaresiz kalırdı.
   *
   * İKSİR VARSA DA HAMMADDE SEÇİLEBİLİR: iksir nadir, oyuncu onu saklamak
   * isteyebilir. Kararı sunucu vermiyor, oyuncu veriyor.
   */
  socket.on('kahraman_dirilt', ({ yol = 'kaynak' } = {}) => {
    const kah = kahramanDurumu(session);
    if (!kah) return socket.emit('kahraman_error', { reason: 'kahraman_yok' });
    if (!kah.olu) return socket.emit('kahraman_error', { reason: 'olu_degil' });

    if (yol === 'iksir') {
      const r = KUSAM.kullan(kah, 'diriltmeIksiri');
      if (!r.ok) return socket.emit('kahraman_error', { reason: r.sebep });
    } else {
      /*
        Bedel ÜSSÜN köyünden alınıyor, aktif köyden değil. Oyuncu
        diriltirken başka bir köye bakıyor olabilir; hangi köyün
        deposunun boşalacağı ekranda ne açık olduğuna bağlı olmamalı.
      */
      const usKoy = session.villages.get(kah.usSlot) || v();
      const bedel = HERO.dirilmeBedeli(kah);
      const eksik = KUYRUK.eksikler(usKoy.resources, bedel);
      if (Object.keys(eksik).length) {
        return socket.emit('kahraman_error', {
          reason: 'yetersiz_kaynak', metin: KUYRUK.eksikMetni(eksik) });
      }
      for (const [k2, n] of Object.entries(bedel)) usKoy.resources[k2] -= n;
    }

    const r = HERO.dirilt(kah);
    if (!r.ok) return socket.emit('kahraman_error', { reason: r.sebep });
    dirty(); emit();
    console.log(`[KAHRAMAN] ${userEmail} kahramanını diriltti (${yol})`);
  });

  /**
   * KAHRAMANI TAKVİYEDEN GERİ ÇAĞIR.
   *
   * Yol süresi gidişle aynı hesaptan: kahraman ışınlanmıyor. Ev sahibinin
   * kaydı ANINDA siliniyor ama kahraman yolda — yani çağırdığın anda
   * savunma bonusunu kaybediyorsun. Tersi olsaydı bonus iki köyde birden
   * sayılırdı.
   */
  socket.on('kahraman_geri_cagir', () => {
    const kah = kahramanDurumu(session);
    if (!kah) return socket.emit('kahraman_error', { reason: 'kahraman_yok' });
    if (kah.nerede !== 'takviye' || !kah.misafirSlot) {
      return socket.emit('kahraman_error', { reason: 'takviyede_degil' });
    }

    // Ev sahibinin köyündeki misafir kaydını sil
    const hedef = villageAtSlot(kah.misafirSlot);
    if (hedef?.village?.misafirKahraman?.userId === userId) {
      delete hedef.village.misafirKahraman;
      if (hedef.userId) markUserDirty(hedef.userId, kah.misafirSlot);
    }

    const me = WORLD.slotByKey.get(kah.usSlot);
    const oradan = WORLD.slotByKey.get(kah.misafirSlot);
    const dist = (me && oradan) ? W.distanceBetween(me, oradan) : 1;
    kah.nerede = 'donuyor';
    kah.donusKalanSaat = ARMY.marchGameHours({}, dist, true);
    dirty(); emit();
    console.log(`[KAHRAMAN] ${userEmail} kahramanını geri çağırdı (${kah.misafirSlot})`);
  });

  socket.on('set_capital', ({ slotKey } = {}) => {
    const hedef = slotKey || session.activeSlot;
    const village = session.villages.get(hedef);
    if (!village) return;
    if (session.capitalSlot === hedef) return;
    /*
      SARAY YÜKSELTİLİRKEN DE MERKEZ TAŞINABİLİR — pazarla aynı gerekçe
      (bkz. pazar.js · pazarBinasi): yükseltme mevcut seviyeden devam
      eden bir iyileştirme, hizmetin kesilmesi değil. İLK inşaat
      (seviye 0) hâlâ saray sayılmıyor.
    */
    const saray = Object.values(village.villageBuildings || {})
      .find(b => b.type === 'saray' && b.level >= 1);
    if (!saray) {
      socket.emit('build_refused', { slotKey: hedef, buildingType: 'saray',
        reason: 'Merkez yapmak için bu köyde tamamlanmış bir saray gerekiyor.' });
      return;
    }
    /*
      Görev zinciri ve kahraman merkez köyün state'inde duruyor; merkez
      taşınınca kayıt da taşınmalı, yoksa oyuncu zinciri sıfırlanmış,
      kahramanını yok olmuş görür (bkz. hesapKaydiniTasi).
    */
    hesapKaydiniTasi(
      session.villages.get(session.capitalSlot), session.villages.get(hedef));

    session.capitalSlot = hedef;
    for (const [k, v2] of session.villages) v2.isCapital = (k === hedef);
    for (const k of session.villages.keys()) session.dirtySlots.add(k);
    setCapital(userId, hedef).catch(err => console.error('[MERKEZ] kayıt:', err.message));
    emitVillage(session, { force: true, statics: true });
    console.log(`[MERKEZ] userId=${userId} → ${hedef}`);
  });

  socket.on('assign_production_workers', ({ slotKey, workers } = {}) => {
    /**
     * BU TANIM ŞARTTI. Aşağıdaki `reject(...)` çağrısının bu kapsamda
     * karşılığı yoktu (ikizi yalnız assign_village_workers içinde tanımlı):
     * havuzdakinden fazla işçi isteyen HER istek ReferenceError fırlatıyordu.
     * Socket.io handler hatalarını yakalamaz, süreçte uncaughtException
     * kancası da yok — yani tek bir bayat istek SUNUCUYU KOMPLE düşürüyordu,
     * o an oynayan bütün oyuncularla birlikte. Tetiklemek için hile
     * gerekmiyordu: iki sekme, arka arkaya iki atama ya da açlıkla işçi
     * kaybının ardından gelen tek tık yetiyordu.
     */
    const reject = (why) => {
      if (IS_DEV_ENTRY) console.warn(`[ISCI RED] ${slotKey}: ${why}`);
    };
    const b = v().productionTiles[slotKey];
    // Yükseltme sırasında da işçi atanabilir — bina çalışmaya devam ediyor.
    // Yalnızca hiç kurulmamış tile'a (level 0) işçi atanamaz.
    if (!b || b.level < 1) return;
    const def = BUILDING_DEFS[b.type];
    if (!def) return;
    const maxW = def.levels[b.level - 1]?.workers || 1;
    const newW = sayi(workers, { enCok: maxW });
    const diff = newW - (b.workers || 0);
    if (diff > v().freeWorkers) {
      return reject(`havuzda ${v().freeWorkers} işçi var, ${diff} isteniyor`);
    }
    v().freeWorkers -= diff; b.workers = newW;
    dirty(); emit();
  });

  socket.on('upgrade_production', ({ slotKey, workers } = {}) => {
    const b = v().productionTiles[slotKey];
    if (!b || b.upgrading) return;
    // NaN eski koşulların ÜÇÜNÜ de geçiyordu (NaN her karşılaştırmada false)
    const isci = sayi(workers);
    if (isci < 1 || isci > v().freeWorkers || isci > MAX_BUILDERS(b.level)) return;
    const def = BUILDING_DEFS[b.type];
    if (!def || b.level >= def.levels.length) return;
    const cost = def.levels[b.level]?.cost;
    if (!cost) return;
    for (const [res, amt] of Object.entries(cost)) { if ((v().resources[res] || 0) < amt) return; }
    for (const [res, amt] of Object.entries(cost)) { v().resources[res] -= amt; }
    v().freeWorkers -= isci;
    b.upgrading = true; b.upgradeEndTime = v().clockMs + GT.minutesToClock(getUpgradeSeconds(b.type, b.level, isci)); b.upgradeWorkersAssigned = isci;
    dirty(); emit();
  });

  socket.on('build_production', ({ slotKey, type, workers } = {}) => {
    const isci = sayi(workers);
    if (!canBuildProductionAt(v(), slotKey, type, userId)) return;
    if (isci < 1 || isci > v().freeWorkers || isci > MAX_BUILDERS(0)) return;
    const def = BUILDING_DEFS[type];
    const cost = def.levels[0]?.cost || {};
    for (const [res, amt] of Object.entries(cost)) { if ((v().resources[res] || 0) < amt) return; }
    for (const [res, amt] of Object.entries(cost)) { v().resources[res] -= amt; }
    v().freeWorkers -= isci;
    v().productionTiles[slotKey] = { type, level: 0, workers: 0, upgrading: true, upgradeEndTime: v().clockMs + GT.minutesToClock((def.levels[0]?.sureSaat || 5) / isci), upgradeWorkersAssigned: isci };
    dirty(); emit();
  });

  socket.on('demolish_production', ({ slotKey } = {}) => {
    const b = v().productionTiles[slotKey];
    if (!b) return;
    if (b.upgrading && b.upgradeWorkersAssigned) v().freeWorkers += b.upgradeWorkersAssigned;
    if (b.workers) v().freeWorkers += b.workers;
    delete v().productionTiles[slotKey];
    dirty(); emit();
  });

  socket.on('build_village', ({ slotKey, buildingType, workers } = {}) => {
    const isci = sayi(workers);
    if (!canBuildAt(v(), slotKey, buildingType, session.villages)
      || isci < 1 || isci > v().freeWorkers || isci > MAX_BUILDERS(0)) {
      // Sessiz red oyuncuyu koru bırakıyordu ("saray kuramıyorum, sebep yok").
      socket.emit('build_refused', { slotKey, buildingType,
        reason: buildRefusalReason(v(), slotKey, buildingType, session.villages, isci) });
      return;
    }
    const def = VILLAGE_DEFS[buildingType];
    const cost = def?.cost || {};
    for (const [res, amount] of Object.entries(cost)) { if ((v().resources[res] || 0) < amount) return; }
    for (const [res, amount] of Object.entries(cost)) { v().resources[res] -= amount; }
    v().freeWorkers -= isci;
    v().villageBuildings[slotKey] = { type: buildingType, level: 0, workers: 0, building: true, buildEndTime: v().clockMs + GT.minutesToClock(getVillageBuildMinutes(buildingType, 1, isci)), buildWorkers: isci };
    dirty(); emit();
  });

  socket.on('upgrade_village', ({ slotKey, workers } = {}) => {
    const b = v().villageBuildings[slotKey];
    if (!b || b.building || b.yikiliyor) return;
    const def = VILLAGE_DEFS[b.type];
    // Tavan: tanımda yoksa DEFAULT_MAX_LEVEL. Eski koşul `def.maxLevel &&`
    // ile başlıyordu, tanımsız olan 18 bina sınırsız yükseliyordu.
    if (!def || b.level >= maxLevelOf(b.type)) return;
    const isci = sayi(workers);
    if (isci < 1 || isci > v().freeWorkers || isci > MAX_BUILDERS(b.level)) return;
    const upgradeCost = getScaledUpgradeCost(b.type, b.level);
    if (upgradeCost) {
      for (const [res, amt] of Object.entries(upgradeCost)) { if ((v().resources[res] || 0) < amt) return; }
      for (const [res, amt] of Object.entries(upgradeCost)) { v().resources[res] -= amt; }
    }
    v().freeWorkers -= isci;
    b.building = true; b.buildEndTime = v().clockMs + GT.minutesToClock(getVillageBuildMinutes(b.type, b.level + 1, isci)); b.buildWorkers = isci;
    dirty(); emit();
  });

  socket.on('assign_village_workers', ({ slotKey, workers } = {}) => {
    /**
     * Sessiz reddetme teşhis edilemiyordu: kule listeye eklenmeden önce bu
     * handler hiçbir iz bırakmadan `return` ediyordu, arayüzde de değer geri
     * sıçrıyordu ("atadım ama atanmış gözükmüyor"). Artık geliştirme modunda
     * reddin sebebi loglanıyor.
     */
    const reject = (why) => {
      if (IS_DEV_ENTRY) console.warn(`[ISCI RED] ${slotKey}: ${why}`);
    };
    const b = v().villageBuildings[slotKey];
    if (!b || b.level < 1) return reject('bina yok ya da seviye 0');
    if (b.yikiliyor) return reject('bina yıkılıyor, personel almaz');
    const def = VILLAGE_DEFS[b.type];
    if (!def || (!def.processes && !WORKER_ASSIGNABLE_MILITARY.has(b.type))) {
      return reject(`${b.type} personel almıyor (processes yok, atanabilir listede değil)`);
    }
    const maxW = b.level * (def.workersPerLevel || 3);
    const newW = sayi(workers, { enCok: maxW });
    const diff = newW - (b.workers || 0);
    if (diff > v().freeWorkers) return;
    v().freeWorkers -= diff; b.workers = newW;
    dirty(); emit();
  });

  /**
   * ŞÖLEN BAŞLAT — taverna. Kaynak peşin alınır, puan şölenin SONUNDA
   * yazılır (bkz. runTickForUser). Aynı anda tek şölen.
   *
   * `cpAtStart` başlangıçtaki günlük üretim: şölen sürerken bina yıkıp
   * puanı şişirmeyi engelliyor, ayrıca oyuncu ne kazanacağını baştan
   * biliyor.
   */
  /**
   * NPC TAKASI — anında kaynak dönüşümü.
   *
   * Tüccar harcamıyor ve süre almıyor; bedeli ORANIN KENDİSİ (her takas
   * kaybettirir, bkz. game/pazar.js). Oranları istemci değil sunucu
   * uyguluyor — istemcideki panel yalnızca önizleme gösteriyor.
   */
  socket.on('pazar_takas', ({ veren, alan, miktar } = {}) => {
    const village = v();
    const { caps, granaryCap } = getStorageCaps(village);
    const istenen = sayi(miktar, { enAz: 0, enCok: 100000000 });
    const s = PAZAR.npcTakas(village, veren, alan, istenen, caps, granaryCap);
    if (!s.ok) {
      socket.emit('pazar_sonuc', { ok: false, sebep: s.sebep, sigan: s.sigan });
      return;
    }
    dirty(); emit();
    socket.emit('pazar_sonuc', { ok: true, veren, alan, ...s });
    console.log(`[PAZAR] ${userEmail}: ${s.harcanan} ${veren} -> ${s.alinan} ${alan}`);
  });

  /* ════════════════════════════════════════════════════════════════
     PAZAR — OYUNCULAR ARASI TEKLİFLER
     ════════════════════════════════════════════════════════════════ */

  /**
   * AÇIK TEKLİF LİSTESİ — TALEP ÜZERİNE, her tick'te değil.
   *
   * Liste bütün köyleri taramayı gerektiriyor ve saniyede bir yapılacak
   * iş değil; pazar paneli açıkken periyodik tazeleniyor (istatistik
   * ekranındaki desenin aynısı).
   */
  socket.on('pazar_teklifleri', () => {
    try {
      const benim = new Set(session.villages.keys());
      socket.emit('pazar_teklif_listesi', {
        teklifler: acikTeklifler(benim), at: Date.now(),
      });
    } catch (err) {
      console.error('[PAZAR LİSTE]', err.message);
      socket.emit('pazar_teklif_listesi', { teklifler: [], at: Date.now() });
    }
  });

  /**
   * TEKLİF AÇ — mal ve tüccar HEMEN ayrılır.
   *
   * Ayrılmasaydı aynı 2.000 odunla on teklif açılır, biri kabul edilince
   * kalan dokuzu karşılıksız kalırdı. Açık teklifteki mal depodan çıkmış
   * sayılıyor; iptalde geri geliyor.
   */
  socket.on('pazar_teklif_ac', ({ veren, alan, verenMiktar, alanMiktar } = {}) => {
    const village = v();
    const mySlot = session.activeSlot || WORLD.slotByUser.get(userId);
    const red = (sebep) => socket.emit('build_refused', { reason: sebep });

    if (!PAZAR.pazarBinasi(village)) return red('Önce pazar kurman gerekiyor.');
    const vm = sayi(verenMiktar, { enAz: 1, enCok: 100000000 });
    const am = sayi(alanMiktar, { enAz: 1, enCok: 100000000 });
    const hata = PAZAR.teklifGecerliMi(veren, alan, vm, am);
    if (hata) {
      return red(hata === 'ayni_kaynak' ? 'Aynı kaynağı takas edemezsin.'
        : hata === 'miktar_sifir' ? 'Miktar sıfır olamaz.'
          : 'Bu kaynak pazarda işlem görmüyor.');
    }
    if ((village.resources[veren] || 0) < vm) {
      return red(`Yetersiz ${KUYRUK.ETIKET[veren] || veren}: ${Math.ceil(vm - (village.resources[veren] || 0))} eksik.`);
    }
    const gereken = PAZAR.teklifTuccari(vm);
    if (PAZAR.tuccarBos(village) < gereken) {
      return red(`${gereken} tüccar gerekiyor, ${PAZAR.tuccarBos(village)} boşta.`);
    }

    village.resources[veren] -= vm;
    (village.teklifler ||= []).push({
      id: village.nextTeklifId = (village.nextTeklifId || 0) + 1,
      veren, verenMiktar: vm, alan, alanMiktar: am,
      tuccar: gereken, slotKey: mySlot, at: Date.now(),
    });
    dirty(); emit();
    console.log(`[PAZAR] ${userEmail} teklif: ${vm} ${veren} -> ${am} ${alan}`);
  });

  /** Teklifi geri çek — ayrılan mal ve tüccar iade edilir */
  socket.on('pazar_teklif_iptal', ({ id } = {}) => {
    const village = v();
    const liste = village.teklifler || [];
    const i = liste.findIndex((t) => t.id === id);
    if (i < 0) return;
    const t = liste[i];
    const { caps } = getStorageCaps(village);
    KUYRUK.iadeEt(village.resources, { [t.veren]: t.verenMiktar }, caps);
    liste.splice(i, 1);
    dirty(); emit();
  });

  /**
   * TEKLİFİ KABUL ET — iki gönderi birden yola çıkar.
   *
   * Kabul eden kendi malını ve kendi tüccarını O AN veriyor; teklif
   * sahibininki zaten teklif açılırken ayrılmıştı. İki taraf da yolda
   * olduğu için kimse ödemeden mal alamıyor.
   */
  socket.on('pazar_teklif_kabul', ({ slotKey, id } = {}) => {
    const village = v();
    const mySlot = session.activeSlot || WORLD.slotByUser.get(userId);
    const red = (sebep) => socket.emit('build_refused', { reason: sebep });

    if (!PAZAR.pazarBinasi(village)) return red('Önce pazar kurman gerekiyor.');
    if (slotKey === mySlot) return red('Kendi teklifini kabul edemezsin.');

    const hedef = villageAtSlot(slotKey);
    if (!hedef?.village) return red('Teklif sahibi bulunamadı.');
    const liste = hedef.village.teklifler || [];
    const t = liste.find((x) => x.id === id);
    if (!t) return red('Teklif artık geçerli değil.');

    if ((village.resources[t.alan] || 0) < t.alanMiktar) {
      return red(`Yetersiz ${KUYRUK.ETIKET[t.alan] || t.alan}: ${Math.ceil(t.alanMiktar - (village.resources[t.alan] || 0))} eksik.`);
    }
    const gereken = PAZAR.teklifTuccari(t.alanMiktar);
    if (PAZAR.tuccarBos(village) < gereken) {
      return red(`${gereken} tüccar gerekiyor, ${PAZAR.tuccarBos(village)} boşta.`);
    }

    const benimSlot = WORLD.slotByKey.get(mySlot);
    const onunSlot = WORLD.slotByKey.get(slotKey);
    const mesafe = (benimSlot && onunSlot) ? W.distanceBetween(benimSlot, onunSlot) : 10;
    const saat = PAZAR_YOL.saat(mesafe);

    // Kabul edenin malı çıkıyor, tüccarı yola giriyor
    village.resources[t.alan] -= t.alanMiktar;
    (village.gonderiler ||= []).push(PAZAR_YOL.gonderi({
      hedefSlot: slotKey, hedefAd: hedef.name,
      kaynak: t.alan, miktar: t.alanMiktar, tuccar: gereken, saat, mesafe,
    }));

    // Teklif sahibinin malı (zaten ayrılmıştı) kabul edene yola çıkıyor
    (hedef.village.gonderiler ||= []).push(PAZAR_YOL.gonderi({
      hedefSlot: mySlot, hedefAd: WORLD.playerBySlot.get(mySlot)?.name || mySlot,
      kaynak: t.veren, miktar: t.verenMiktar, tuccar: t.tuccar, saat, mesafe,
    }));
    liste.splice(liste.indexOf(t), 1);

    if (hedef.userId != null) markUserDirty(hedef.userId, slotKey);
    dirty(); emit();
    console.log(`[PAZAR] ${userEmail} kabul: ${t.verenMiktar} ${t.veren} <-> ${t.alanMiktar} ${t.alan} (${mesafe} hex)`);
  });

  socket.on('start_festival', ({ kind } = {}) => {
    const village = v();
    const f = CULTURE.FESTIVALS[kind];
    const reject = (why) => { if (IS_DEV_ENTRY) console.warn(`[ŞÖLEN RED] ${kind}: ${why}`); };
    if (!f) return reject('bilinmeyen şölen türü');
    if (village.festival) return reject('zaten bir şölen sürüyor');

    const tav = Object.values(village.villageBuildings)
      .find(b => b.type === 'taverna' && b.level >= 1);
    if (!tav) return reject('taverna yok');
    if (tav.level < f.minLevel) return reject(`taverna Lvl ${f.minLevel} gerekiyor (şu an ${tav.level})`);

    for (const [res, amt] of Object.entries(f.cost)) {
      if ((village.resources[res] || 0) < amt) return reject(`${res} yetersiz`);
    }
    for (const [res, amt] of Object.entries(f.cost)) village.resources[res] -= amt;

    village.festival = {
      kind,
      endTime: village.clockMs + GT.minutesToClock(f.hours * 60),
      cpAtStart: CULTURE.villageCpPerDay(village, VILLAGE_DEFS),
    };
    dirty(); emit();
    console.log(`[ŞÖLEN] kullanıcı ${userId}: ${f.label} başladı`
      + ` (${f.hours} oyun saati, +${Math.round(village.festival.cpAtStart * f.multiplier)} CP)`);
  });

  /**
   * YIKIM — anında değil, SÜREYLE.
   *
   * Başlatıldığı an: personeli havuza döner, bina çalışmaz, yükseltilemez.
   * Süre dolunca (advanceVillage) slot boşalır. Süre o seviyenin inşa
   * süresinin onda biri (koyKurallari · getVillageDemolishMinutes).
   *
   * HENÜZ BİTMEMİŞ inşaat anında kalkar: ortada yıkılacak bina yok,
   * oyuncuyu yanlış bastığı bir inşaatın süresi kadar bekletmek anlamsız.
   */
  socket.on('demolish_village', ({ slotKey } = {}) => {
    /*
      ANA BİNA DA YIKILABİLİR. Eskiden '0,0' sessizce reddediliyordu ve
      oyuncu köyünü kendi eliyle terk edemiyordu. Köyün yok olma yolu
      "bütün binaları düşür" olduğuna göre ana bina da bu yola dahil.
      Onay metni ayrıca uyarıyor (bkz. flows.js · yikimOnayi).
    */
    const village = v();
    const b = village.villageBuildings[slotKey];
    if (!b || b.yikiliyor) return;

    if (b.building || (b.level || 0) < 1) {
      if (b.building && b.buildWorkers) village.freeWorkers += b.buildWorkers;
      if (b.workers) village.freeWorkers += b.workers;
      delete village.villageBuildings[slotKey];
      dirty(); emit();
      return;
    }

    if (b.workers) { village.freeWorkers += b.workers; b.workers = 0; }
    b.yikiliyor = true;
    b.yikimEndTime = village.clockMs
      + GT.minutesToClock(getVillageDemolishMinutes(b.type, b.level));
    dirty(); emit();
  });

  /**
   * EKİPMAN SİPARİŞİ — bedel PEŞİN.
   *
   * Eskiden sipariş bedelsiz kuyruğa giriyor, her parça sırası gelince
   * ödeniyordu; kaynak yetmezse iş kuyruğun başında takılıp arkasındaki
   * her şeyi kilitliyordu. Artık yetmiyorsa sipariş HİÇ girmiyor ve
   * oyuncuya neyin eksik olduğu yazılıyor (bkz. game/kuyruk.js).
   */
  socket.on('queue_equipment', ({ buildingType, equipmentType, quantity } = {}) => {
    const allowed = EQUIPMENT_BY_BUILDING[buildingType];
    if (!allowed?.includes(equipmentType)) return;
    const b = Object.values(v().villageBuildings).find(vb => vb.type === buildingType);
    if (!b || b.level < 1) return;
    const def = EQUIPMENT_DEFS[equipmentType];
    if (!def) return;
    const q = Math.max(1, Math.min(ADET_TAVANI, parseInt(quantity, 10) || 1));

    const village = v();
    const bedel = KUYRUK.carp(def.cost, q);
    const eksik = KUYRUK.eksikler(village.resources, bedel);
    if (Object.keys(eksik).length) {
      socket.emit('build_refused', {
        reason: `${def.name} ×${q} için yetersiz: ${KUYRUK.eksikMetni(eksik)}`,
      });
      return;
    }
    KUYRUK.dus(village.resources, bedel);
    (village.equipmentQueues[buildingType] ||= []).push({
      id: village.nextOrderId++, type: equipmentType, total: q, remaining: q,
      waiting: true, startTime: null, endTime: null,
      odendi: true,                       // bedel sipariş anında düşüldü
    });
    dirty(); emit();
  });

  /**
   * EKİPMAN İPTALİ — üretilmemiş parçaların bedeli TAM iade.
   *
   * Devam eden parça da üretilmemiş sayılıyor: yarım kılıç diye bir şey
   * yok, oyuncu eline hiçbir şey geçmediği bir işin bedelini ödemesin.
   * İade depo tavanını aşmıyor (bkz. kuyruk.js · iadeEt).
   */
  socket.on('cancel_equipment_order', ({ buildingType, orderId } = {}) => {
    const village = v();
    const queue = village.equipmentQueues?.[buildingType];
    if (!queue) return;
    const idx = queue.findIndex(o => o.id === orderId);
    if (idx < 0) return;
    const order = queue[idx];
    if (order.odendi) {
      const def = EQUIPMENT_DEFS[order.type];
      const kalan = Math.max(0, order.remaining || 0);
      if (def && kalan > 0) {
        const { caps } = getStorageCaps(village);
        KUYRUK.iadeEt(village.resources, KUYRUK.carp(def.cost, kalan), caps);
      }
    }
    queue.splice(idx, 1);
    dirty(); emit();
  });

  socket.on('train_unit', ({ buildingType, unitType, quantity } = {}) => {
    const allowed = UNITS_BY_BUILDING[buildingType];
    if (!allowed?.includes(unitType)) return;
    const b = Object.values(v().villageBuildings).find(vb => vb.type === buildingType);
    if (!b || b.level < 1) return;
    /**
     * BİRİM SEVİYE KİLİDİ — iyi asker iyi kışla ister.
     *
     * Her birimin `minLevel`i var (kışla/ahır 1-10); en iyi birim Lvl 10'da
     * açılıyor. Arayüz kilitli birimin EĞİT düğmesini kapatıyor, ama tek
     * doğruluk kaynağı burası: istemciye güvenilmez.
     */
    const gerekenSeviye = UNIT_DEFS[unitType]?.minLevel || 1;
    if (b.level < gerekenSeviye) {
      if (IS_DEV_ENTRY) {
        console.warn(`[BİRİM RED] ${unitType}: ${buildingType} Lvl ${b.level}`
          + `, gereken Lvl ${gerekenSeviye}`);
      }
      return;
    }
    /**
     * İKİNCİ KAPI — Rún Salonu araştırması.
     *
     * Seviye kilidi "kışlan yeterince iyi mi" diye soruyor; araştırma
     * "bu birimi biliyor musun" diye. Başlangıç birimleri (minLevel 1)
     * araştırma istemiyor, yoksa oyun ilk saatlerde asker basamadan durur.
     */
    if (UNIT_DEFS[unitType]?.research && !v().research?.[unitType]) {
      socket.emit('build_refused', {
        reason: `${UNIT_DEFS[unitType].name} önce Rún Salonu'nda araştırılmalı`,
      });
      return;
    }
    /*
      GÖÇMEN TAVANI: köyün kalan yerleşim hakkı × 3. Hak bitince yeni
      göçmen basılamaz; köşk/sarayı bir sonraki eşiğe çıkarmak gerekir.
    */
    if (unitType === ARMY.SETTLER_UNIT) {
      const kap = settlerCapacity(v());
      if (kap.bos <= 0) {
        socket.emit('build_refused', {
          reason: kap.izin === 0
            ? 'Bu köyün yerleşim hakkı yok — köşkü Lvl 10\'a çıkar'
            : 'Yerleşim hakkın dolu — yeni göçmen için köşk/sarayı bir üst eşiğe çıkar',
        });
        return;
      }
    }
    const q = Math.max(1, Math.min(ADET_TAVANI, parseInt(quantity, 10) || 1));

    /**
     * BEDEL PEŞİN — ekipman, kaynak ve İŞÇİ birlikte.
     *
     * Bir asker üç şey tüketiyor: ekipmanı (kılıç/zırh/at), varsa kaynak
     * bedeli ve bir boş işçi (asker olan kişi). Üçü de sipariş anında
     * ayrılıyor. Yetmiyorsa sipariş kuyruğa hiç girmiyor: eskiden girip
     * kuyruğun başında takılıyor ve arkasındaki hazır siparişleri de
     * bekletiyordu.
     *
     * İşçi bir "kaynak" gibi ayrılıyor ama nüfustan düşmüyor — kişi hâlâ
     * köyde, sadece artık başka işe verilemiyor. Asker olunca havuza geri
     * dönmüyor; iptalde dönüyor.
     */
    const village = v();
    const ekBedel = KUYRUK.carp(KUYRUK.ekipmanBedeli(UNIT_DEFS[unitType]), q);
    const kayBedel = UNIT_DEFS[unitType]?.cost ? KUYRUK.carp(UNIT_DEFS[unitType].cost, q) : {};
    const eksik = {
      ...KUYRUK.eksikler(village.equipment, ekBedel),
      ...KUYRUK.eksikler(village.resources, kayBedel),
    };
    const isciEksik = Math.max(0, q - (village.freeWorkers || 0));
    const parcalar = [];
    if (Object.keys(eksik).length) parcalar.push(KUYRUK.eksikMetni(eksik));
    if (isciEksik) parcalar.push(`${isciEksik} boş işçi`);
    if (parcalar.length) {
      socket.emit('build_refused', {
        reason: `${UNIT_DEFS[unitType]?.name || unitType} ×${q} için yetersiz: ${parcalar.join(', ')}`,
      });
      return;
    }

    KUYRUK.dus(village.equipment, ekBedel);
    KUYRUK.dus(village.resources, kayBedel);
    village.freeWorkers -= q;

    village.unitQueues[buildingType] ||= [];
    village.unitQueues[buildingType].push({
      id: village.nextUnitOrderId++, type: unitType, total: q, remaining: q,
      waiting: true, startTime: null, endTime: null,
      odendi: true,          // ekipman + kaynak + işçi sipariş anında ayrıldı
      workerReserved: true,  // eski alan: işçi muhasebesi bunu okuyor
    });
    dirty(); emit();
  });

  /**
   * ARAŞTIRMA SIRAYA AL — Rún Salonu.
   *
   * Kaynak burada DÜŞÜLMÜYOR: iş sırası gelip gerçekten başlarken tick
   * düşüyor (bkz. tick.js processResearchQueue). Böylece oyuncu birkaç
   * araştırmayı arka arkaya sıraya alabiliyor, ödemeyi sırası gelince
   * yapıyor. Burada yalnız "bu iş anlamlı mı" denetleniyor.
   */
  /**
   * GÖREV ÖDÜLÜ AL. Koşul sunucuda denetlenir; istemciye güvenilmez.
   * Bir kez tamamlanmış görev `done`'da kalıcı işaretli olduğu için
   * ödül sonradan da alınabilir — ölçüm o an geri düşmüş olsa bile.
   * Ödül AKTİF köye yazılır (kaynak depoyu aşarsa fazlası kaybolur).
   */
  socket.on('claim_quest', ({ id } = {}) => {
    const def = QUEST_BY_ID[id];
    const st = questSync(session);
    if (!def || !st) return;
    if (st.claimed.includes(id)) return;
    if (!questTamam(def, session)) {
      socket.emit('build_refused', { reason: 'Görev henüz tamamlanmadı' });
      return;
    }
    const village = v();
    const { caps, granaryCap } = getStorageCaps(village);
    for (const [res, amt] of Object.entries(def.reward?.res || {})) {
      const tavan = ['un', 'ekmek'].includes(res) ? granaryCap : (caps?.[res] ?? Infinity);
      village.resources[res] = Math.min(tavan, (village.resources[res] || 0) + amt);
    }
    if (def.reward?.isci) {
      // Nüfus tavanını aşmaz; yer yoksa daha az işçi gelir
      const yer = Math.max(0, maxPopulationOf(village) - (village.population || 0));
      const gelen = Math.min(def.reward.isci, yer);
      village.population = (village.population || 0) + gelen;
      village.freeWorkers = (village.freeWorkers || 0) + gelen;
    }
    if (def.reward?.kp) {
      village.culturePoints = (village.culturePoints || 0) + def.reward.kp;
    }
    st.claimed.push(id);
    console.log(`[GÖREV] ${userEmail} → ${id} tamamlandı`);
    dirty(); emit();
  });

  /** Rehberi gizle/göster — görevler arka planda işlemeye devam eder */
  socket.on('toggle_quests', ({ hidden } = {}) => {
    const st = questState(session);
    if (!st) return;
    st.hidden = hidden === undefined ? !st.hidden : !!hidden;
    dirty(); emit();
  });

  socket.on('research_unit', ({ unitType } = {}) => {
    const def = UNIT_DEFS[unitType];
    if (!def?.research) return;                       // araştırma istemeyen birim
    if (v().research?.[unitType]) return;             // zaten açık
    const kuyruk = (v().researchQueue ||= []);
    if (kuyruk.some(o => o.type === unitType)) return; // zaten sırada

    const salon = Object.values(v().villageBuildings)
      .find(b => VILLAGE_DEFS[b.type]?.researches);
    if (!salon || salon.level < 1) {
      socket.emit('build_refused', { reason: 'Önce Rún Salonu kurulmalı' });
      return;
    }
    if (salon.level < def.research.level) {
      socket.emit('build_refused', {
        reason: `${def.name} için Rún Salonu Lvl ${def.research.level} gerekiyor`
          + ` (şu an Lvl ${salon.level})`,
      });
      return;
    }
    /**
     * ÜÇÜNCÜ KAPI — EĞİTİM BİNASININ SEVİYESİ.
     *
     * Basamadığın askeri araştırmak anlamsız: kışla Lvl 10 istiyorsa
     * araştırma da Lvl 10 kışla ister. Böylece Rún Salonu'nu tek başına
     * yükseltip bütün birimleri açmak mümkün olmuyor; iki hat da
     * ilerlemek zorunda.
     */
    const egitimTipleri = [].concat(def.trainedAt || []);
    let egitimLv = 0;
    for (const b of Object.values(v().villageBuildings)) {
      if (egitimTipleri.includes(b.type)) egitimLv = Math.max(egitimLv, b.level || 0);
    }
    if (egitimLv < (def.minLevel || 1)) {
      const ad = VILLAGE_DEFS[egitimTipleri[0]]?.name || egitimTipleri[0] || 'eğitim binası';
      socket.emit('build_refused', {
        reason: `${def.name} için ${ad} Lvl ${def.minLevel} gerekiyor (şu an Lvl ${egitimLv})`,
      });
      return;
    }
    if (kuyruk.length >= 5) {
      socket.emit('build_refused', { reason: 'Araştırma kuyruğu dolu (en çok 5)' });
      return;
    }
    kuyruk.push({
      id: v().nextResearchId++, type: unitType,
      waiting: true, waitingReason: null,
      paid: false, startTime: null, endTime: null,
    });
    dirty(); emit();
  });

  /** Araştırmayı iptal et — ödeme yapıldıysa kaynak TAM iade */
  socket.on('cancel_research', ({ orderId } = {}) => {
    const kuyruk = v().researchQueue;
    if (!kuyruk) return;
    const i = kuyruk.findIndex(o => o.id === orderId);
    if (i < 0) return;
    const job = kuyruk[i];
    if (job.paid) {
      const cost = UNIT_DEFS[job.type]?.research?.cost || {};
      for (const [res, amt] of Object.entries(cost)) {
        v().resources[res] = (v().resources[res] || 0) + amt;
      }
    }
    kuyruk.splice(i, 1);
    dirty(); emit();
  });

  /**
   * EKİPMAN YÜKSELTMESİ — silahçı (kılıç, mızrak) ve zırhçı (kalkan, zırh).
   *
   * Kaynak burada değil, iş başlarken düşülüyor (tick.js): oyuncu iki
   * seviyeyi arka arkaya sıraya alabilsin ve ikinci iş kendi seviyesinin
   * bedelini ödesin.
   */
  socket.on('upgrade_equipment', ({ buildingType, equipment } = {}) => {
    if (!EQUIPMENT_BY_BUILDING[buildingType]?.includes(equipment)) return;
    if (equipment === 'at') return;                       // at yükseltilmiyor
    const b = Object.values(v().villageBuildings).find(vb => vb.type === buildingType);
    if (!b || b.level < 1) return;

    const kuyruk = (v().upgradeQueues[buildingType] ||= []);
    const mevcut = v().equipmentLevels?.[equipment] || 0;
    const sirada = kuyruk.filter(o => o.type === equipment).length;
    if (mevcut + sirada >= EQUIPMENT_MAX_LEVEL) {
      socket.emit('build_refused', { reason: `${equipment} zaten en üst seviyede` });
      return;
    }
    if (kuyruk.length >= 3) {
      socket.emit('build_refused', { reason: 'Yükseltme kuyruğu dolu (en çok 3)' });
      return;
    }
    kuyruk.push({
      id: v().nextUpgradeId++, type: equipment,
      waiting: true, waitingReason: null,
      paid: false, paidLevel: null, startTime: null, endTime: null,
    });
    dirty(); emit();
  });

  /** Yükseltmeyi iptal et — ödenmişse o seviyenin bedeli TAM iade */
  socket.on('cancel_equipment_upgrade', ({ buildingType, orderId } = {}) => {
    const kuyruk = v().upgradeQueues?.[buildingType];
    if (!kuyruk) return;
    const i = kuyruk.findIndex(o => o.id === orderId);
    if (i < 0) return;
    const job = kuyruk[i];
    if (job.paid) {
      const cost = equipmentUpgradeCost(job.paidLevel || 0);
      for (const [res, amt] of Object.entries(cost)) {
        v().resources[res] = (v().resources[res] || 0) + amt;
      }
    }
    kuyruk.splice(i, 1);
    dirty(); emit();
  });

  /**
   * BİRİM İPTALİ — eğitilmemiş askerlerin bedeli iade.
   *
   * Peşin ödenen siparişte kalan her asker için ekipman, kaynak ve işçi
   * geri veriliyor. `odendi` alanı olmayan ESKİ siparişler kayıtlı
   * oyunlarda durabilir; onlarda yalnız o an rezerve edilmiş tek parça
   * iade ediliyor (eski davranış).
   */
  /**
   * KUYRUK SIRASI — bir siparişi bir basamak yukarı/aşağı taşı.
   *
   * ÇALIŞAN İŞ KİLİTLİ: başta duran siparişin sayacı işliyor; yerini
   * değiştirmek onu baştan başlatmak olurdu. Bu yüzden çalışan bir işin
   * önüne geçilemiyor (bkz. game/kuyruk.js · tasi).
   *
   * Sıralama artık anlamlı: peşin ödeme sayesinde kuyrukta bekleyen her
   * iş hazır, yani sırayı değiştirmek gerçekten hangi işin önce biteceğini
   * belirliyor.
   */
  const siraDegistir = (kuyruklar, ad) => ({ buildingType, orderId, yon } = {}) => {
    if (yon !== 'yukari' && yon !== 'asagi') return;
    const queue = kuyruklar()?.[buildingType];
    if (!queue) return;
    const s = KUYRUK.tasi(queue, orderId, yon);
    if (!s.ok) {
      if (s.sebep === 'calisan_is') {
        socket.emit('build_refused', { reason: 'Üretimi süren iş sırada ilk kalır.' });
      }
      return;
    }
    dirty(); emit();
    if (IS_DEV_ENTRY) console.log(`[KUYRUK] ${ad}/${buildingType}: #${orderId} ${yon}`);
  };
  socket.on('reorder_equipment_order', siraDegistir(() => v().equipmentQueues, 'ekipman'));
  socket.on('reorder_unit_order', siraDegistir(() => v().unitQueues, 'birim'));

  socket.on('cancel_unit_order', ({ buildingType, orderId } = {}) => {
    const village = v();
    const queue = village.unitQueues?.[buildingType];
    if (!queue) return;
    const idx = queue.findIndex(o => o.id === orderId);
    if (idx < 0) return;
    const order = queue[idx];
    const def = UNIT_DEFS[order.type];

    if (order.odendi) {
      const kalan = Math.max(0, order.remaining || 0);
      if (kalan > 0) {
        const { caps } = getStorageCaps(village);
        KUYRUK.iadeEt(village.equipment, KUYRUK.carp(KUYRUK.ekipmanBedeli(def), kalan), null);
        if (def?.cost) KUYRUK.iadeEt(village.resources, KUYRUK.carp(def.cost, kalan), caps);
        village.freeWorkers += kalan;
      }
    } else if (order.workerReserved && !order.waiting) {
      village.freeWorkers += 1;
      (def?.equipment || []).forEach(eq => { village.equipment[eq] = (village.equipment[eq] || 0) + 1; });
    }
    queue.splice(idx, 1);
    dirty(); emit();
  });

  // ─── İnşaat / yükseltme iptali ─────────────────────────────────
  // İptalde harcanan kaynak TAM iade edilir, inşaat işçileri havuza döner.
  // İlk inşaat iptal edilirse bina/tile tamamen kaldırılır.

  socket.on('cancel_production_build', ({ slotKey } = {}) => {
    const b = v().productionTiles[slotKey];
    if (!b || !b.upgrading) return;
    const def = BUILDING_DEFS[b.type];
    const cost = def?.levels?.[b.level]?.cost || {};

    // Kaynak iadesi
    for (const [res, amt] of Object.entries(cost)) {
      v().resources[res] = (v().resources[res] || 0) + amt;
    }
    // İnşaat işçileri havuza döner
    v().freeWorkers += b.upgradeWorkersAssigned || 0;

    if (b.level === 0) {
      // Hiç kurulmamıştı — çalışan işçi varsa o da geri döner
      v().freeWorkers += b.workers || 0;
      delete v().productionTiles[slotKey];
    } else {
      b.upgrading = false;
      b.upgradeEndTime = null;
      b.upgradeWorkersAssigned = 0;
    }
    dirty(); emit();
  });

  /**
   * YIKIMI İPTAL ET — süre dolmadan vazgeçme.
   *
   * Yıkım artık zaman aldığı için yanlış basılan düğmeden dönüş olmalı;
   * inşaatın "İPTAL"i varken yıkımın olmaması tuzak olurdu. Geçen süre
   * geri gelmiyor: bina olduğu yerde kalıyor, personeli elle yeniden
   * atanıyor — karar bedelsiz değil, sadece geri alınabilir.
   */
  socket.on('cancel_demolish_village', ({ slotKey } = {}) => {
    const b = v().villageBuildings[slotKey];
    if (!b || !b.yikiliyor) return;
    delete b.yikiliyor;
    delete b.yikimEndTime;
    dirty(); emit();
  });

  socket.on('cancel_village_build', ({ slotKey } = {}) => {
    const b = v().villageBuildings[slotKey];
    if (!b || !b.building) return;
    const def = VILLAGE_DEFS[b.type];
    const cost = b.level === 0 ? (def?.cost || {}) : (getScaledUpgradeCost(b.type, b.level) || {});

    for (const [res, amt] of Object.entries(cost)) {
      v().resources[res] = (v().resources[res] || 0) + amt;
    }
    v().freeWorkers += b.buildWorkers || 0;

    if (b.level === 0) {
      v().freeWorkers += b.workers || 0;
      delete v().villageBuildings[slotKey];
    } else {
      delete b.building;
      delete b.buildEndTime;
      delete b.buildWorkers;
    }
    dirty(); emit();
  });

  socket.on('request_world', () => {
    try { socket.emit('world_snapshot', worldSnapshot(userId, session.activeSlot)); }
    catch (err) {
      console.error('[WORLD SNAPSHOT]', err.message);
      socket.emit('world_snapshot', { villages: [], emptySlots: [], radius: W.WORLD_RADIUS, tiers: W.TIERS, mySlot: null });
    }
  });

  socket.on('request_stats', async () => {
    try {
      const t0 = Date.now();
      const snap = await buildStats(userId);
      socket.emit('stats_snapshot', snap);
      console.log(`[İSTATİSTİK] ${userEmail} · ${snap.playerCount} oyuncu`
        + ` · ${snap.villageCount} köy · ${Date.now() - t0} ms`);
    }
    catch (err) {
      console.error('[STATS]', err.message);
      socket.emit('stats_snapshot', { boards: [], villageCount: 0, updatedAt: Date.now() });
    }
  });


  // ── SEFER: ordu gönder ────────────────────────────────────────────
  socket.on('send_army', ({ targetKey, mode, units, hedefBina = null, hedefBina2 = null,
    kahraman: kahramaniGotur = false } = {}) => {
    const fail = (reason) => socket.emit('army_error', { reason });
    const village = v();
    // ÇOKLU KÖY: sefer AKTİF köyden çıkar, oyuncunun "ilk" köyünden değil
    const mySlot = session.activeSlot || WORLD.slotByUser.get(userId);
    if (!mySlot) return fail('konum_yok');
    if (targetKey === mySlot) return fail('kendi_koyun');
    if ((village.marches || []).length >= MAX_MARCHES_PER_TOWN) return fail('sefer_limiti');

    const me = WORLD.slotByKey.get(mySlot);

    /**
     * YERLEŞİM — hedef BOŞ bir dünya slotu olmalı; NPC ya da oyuncu köyüne
     * göçmen gönderilmez. Köy hakkı (köşk/saray seviyesi ve kültür puanı)
     * BURADA denetlenir: göçmen yola çıkmadan reddetmek, yolun sonunda
     * kaybetmekten iyidir. Yolda ikinci bir sefer başlatılamasın diye
     * halihazırda yoldaki yerleşim seferleri de sayılıyor.
     */
    let tgtSlot, tgtKind, tgtName;
    if (mode === 'yerlesim') {
      const uygun = yerlesimUygun(targetKey, userId);
      if (!uygun.ok) return fail(uygun.reason);
      if (expansionFree(village) <= 0) return fail('koy_hakki_yok');
      const cpTotal = [...session.villages.values()]
        .reduce((t, vv) => t + (vv.culturePoints || 0), 0);
      const durum = CULTURE.expansionStatus(
        [...session.villages.values()], cpTotal, VILLAGE_DEFS);
      let yoldaki = 0;
      for (const vv of session.villages.values()) {
        for (const mm of vv.marches || []) if (mm.mode === 'yerlesim') yoldaki++;
      }
      if (durum.owned + yoldaki >= durum.allowed) {
        return fail(durum.blockedBy === 'kultur' ? 'kultur_puani_yetmez' : 'koy_hakki_yok');
      }
      tgtSlot = ensureSlot(uygun.q, uygun.r); tgtKind = 'bos'; tgtName = tgtSlot.name;
    } else {
      /**
       * HEDEF ÇÖZÜMÜ — NPC ya da OYUNCU köyü.
       *
       * Eskiden yalnız WORLD.npcs'e bakılıyordu (faz 1). Boru hattının
       * geri kalanı zaten hedef cinsinden bağımsız: villageAtSlot iki
       * türü de çözüyor, resolveArrival iki tarafa da rapor yazıyor,
       * yağma ve kayıplar savunanın köyüne işleniyor. Tek engel buydu.
       */
      const npc = WORLD.npcs.get(targetKey);
      if (npc) {
        // NPC'ye takviye gönderilmez — savunmasını güçlendirmenin anlamı yok
        if (mode === 'takviye') return fail('takviye_yalniz_oyuncuya');
        tgtSlot = npc.slot; tgtKind = 'npc'; tgtName = npc.slot.name;
      } else {
        const p = WORLD.playerBySlot.get(targetKey);
        const slot = p ? WORLD.slotByKey.get(targetKey) : null;
        if (!p || !slot) return fail('gecersiz_hedef');
        /*
          KENDİ KÖYÜNE SALDIRAMAZSIN.
          Yukarıdaki `targetKey === mySlot` yalnız AKTİF köyü karşılaştırıyor;
          çoklu köyde oyuncu ikinci köyünü kendine çiftlik yapabilirdi
          (yağma kendi kaynağını taşımak olurdu). Sahibe bakmak gerekiyor.
        */
        /*
          TAKVİYE İSTİSNASI: kendi köyüne SALDIRAMAZSIN ama TAKVİYE
          gönderebilirsin — çoklu köyde asıl kullanım bu (sınırdaki köyü
          merkezden beslemek). Yağma kendi kaynağını taşımak olacağı için
          saldırı yasağı aynen duruyor.
        */
        if (p.userId === userId && mode !== 'takviye') return fail('kendi_koyun');
        tgtSlot = slot; tgtKind = 'player'; tgtName = p.name || slot.name;
      }
    }

    const dist = W.distanceBetween(me, tgtSlot);

    /*
      KAHRAMAN TEK BAŞINA GİDEBİLİR (İlkan'ın kararı). createMarch askersiz
      seferi normalde reddediyor; kahraman varsa o denetimler gevşiyor.
      Uygunluğu ÖNCEDEN ölçüyoruz, çünkü sonuç seferin kurulabilmesini
      belirliyor — sonradan bakarsak askersiz sefer boşuna reddedilirdi.
    */
    const kahAday = (kahramaniGotur && KAHRAMAN_MODLARI.has(mode))
      ? kahramanDurumu(session) : null;
    const kahHazir = !!(kahAday && kahramanKonagi(session)
      && kahAday.usSlot === mySlot
      && (kahAday.nerede || 'koy') === 'koy' && !kahAday.olu);

    const res = ARMY.createMarch(village, {
      mode, units, distance: dist,
      fromKey: mySlot, fromName: WORLD.playerBySlot.get(mySlot)?.name || 'Köyün',
      toKey: targetKey, toName: tgtName, toKind: tgtKind,
      ownerKind: 'player', kahramanVar: kahHazir,
    });
    if (!res.ok) return fail(res.reason);
    // Varışta misafir girdisine sahibini yazabilmek için sefere iliştir
    if (mode === 'takviye') res.march.ownerUserId = userId;

    /*
      KAHRAMAN SEFERE KATILIYOR.

      Gücü SEFER ÇIKARKEN dondurularak sefere iliştiriliyor: yola çıktıktan
      sonra skil dağıtıp saldırıyı büyütmek mümkün olmasın. Koşullar
      sunucuda ölçülüyor — istemcinin kutuyu göstermemesi bir denetim değil.

      YALNIZ SALDIRI VE YAĞMADA. Keşif izcinin işi, yerleşim göçmenin;
      takviyede kahramanı başka köyde bırakmak onu oradaki savaşta
      bayıltabilirdi ve oyuncu kahramanını geri alamazdı.
    */
    if (kahramaniGotur && KAHRAMAN_MODLARI.has(mode)) {
      const kah = kahramanDurumu(session);
      const konak = kahramanKonagi(session);
      const uygun = kah && konak
        && kah.usSlot === mySlot                 // kahraman BU köyde
        && (kah.nerede || 'koy') === 'koy'       // seferde/macerada değil
        && !kah.olu;                             // ölü değil
      if (uygun) {
        const b = HERO.bonuslar(kah);
        res.march.kahraman = {
          gucu: b.saldiriGucu, saldiriYuzde: b.saldiriYuzde,
          // Eşyaların birim bonusu da DONDURULUYOR — yolda eşya
          // değiştirip saldırıyı büyütmek mümkün olmasın
          birim: b.birim || null,
        };
        res.march.kahramanUserId = userId;
        kah.nerede = 'sefer';
      }
      // Uygun değilse sefer yine gidiyor, yalnız kahramansız. Reddetmek,
      // ölü kahraman yüzünden saldırıyı tamamen iptal etmek olurdu.
    }
    /*
      MANCINIK HEDEFI — istemci bina TIPI gonderiyor (slot degil): saldiran
      hedefin hangi slotunda ne oldugunu bilmiyor, yalnizca "deposunu vur"
      diyebiliyor. Bulunamazsa rastgele bina vuruluyor (bkz. kusatma.js).
    */
    if (typeof hedefBina === 'string' && hedefBina) {
      /*
        İKİNCİ HEDEF — ATÖLYE SEVİYESİ SUNUCUDA ÖLÇÜLÜR. İstemci düğmeyi
        gizliyor ama gizlemek bir denetim değil: seviye yetmiyorsa ikinci
        hedef sessizce düşürülüyor, sefer yine de gidiyor.
      */
      const ikiHedefAcik =
        ARMY.buildingLevel(village, 'atolye') >= KUSATMA.IKI_HEDEF_MIN_ATOLYE;
      res.march.kusatmaHedefi =
        (ikiHedefAcik && typeof hedefBina2 === 'string' && hedefBina2)
          ? [hedefBina, hedefBina2]
          : hedefBina;
    }

    /*
      İlk SALDIRI başlangıç korumasını kaldırır. Göçmen seferi ve TAKVİYE
      savaş değil — takviye gönderen oyuncuyu NPC yağmasına açmak yanlış
      olurdu (savunmaya yardım ediyor, saldırmıyor).
    */
    if (mode !== 'yerlesim' && mode !== 'takviye') village.hasAttacked = true;
    dirty(); emit();
    socket.emit('army_sent', {
      id: res.march.id, toName: tgtName, mode,
      seconds: res.march.legSeconds, distance: dist,
    });
    console.log(`[SEFER] ${userEmail} → ${tgtName} (${mode}, ${dist} hex, ${ARMY.totalUnits(res.march.units)} birim, ${res.march.legSeconds} sn)`);
  });

  /**
   * SEFERİ GERİ ÇAĞIR — yoldaki orduyu dönüşe geçirir (ilk 90 saniye).
   *
   * Pencere sunucuda ölçülüyor: istemcideki düğmenin görünür olması yetmez,
   * yayınlar arası gecikmede düğme hâlâ duruyor olabilir.
   */
  socket.on('sefer_geri_cagir', ({ marchId } = {}) => {
    const res = ARMY.seferGeriCagir(v(), marchId);
    if (!res.ok) return socket.emit('army_error', { reason: res.reason });
    dirty(); emit();
    console.log(`[SEFER İPTAL] ${userEmail} → ${res.march.toName} (${res.march.mode})`);
  });

  /**
   * TAKVİYEYİ GERİ ÇAĞIR — askerim hangi köydeyse oradan alıp eve yollar.
   *
   * `hostKey` misafir olduğum köyün slotu, `takviyeId` o köydeki girdinin
   * kimliği. SAHİPLİK DENETİMİ ŞART: başkasının takviyesini geri çağırmak
   * (yani rakibin savunmasını dağıtmak) tek satırlık bir sömürü olurdu.
   */
  /**
   * TAKVİYEYİ GERİ ÇAĞIR — KISMÎ de olabilir.
   *
   * `units` verilirse yalnız o kadarı çekilir, kalanı orada savunmaya
   * devam eder; verilmezse hepsi döner (eski davranış). `slotKey` benim
   * hangi köyümden gittiği — çoklu köyde aynı hedefe iki ayrı köyden
   * asker yollanmış olabilir ve her biri kendi köyüne dönmeli.
   *
   * Geriye dönük: eski istemci `takviyeId` yolluyor; o kimlikten sahibi
   * ve köyü çözülüyor.
   */
  /**
   * EV SAHİBİ MİSAFİRİ GERİ YOLLAR.
   *
   * Takviyeyi bugüne kadar YALNIZ SAHİBİ geri çağırabiliyordu; ev
   * sahibinin elinde hiçbir düğme yoktu. Oysa misafir askerin ekmeğini EV
   * SAHİBİ ödüyor (bkz. tick.js · getConsumptionRates): vazgeçmiş ya da
   * uzun süre girmemiş bir oyuncunun bıraktığı takviye, ev sahibinin
   * köyünü sessizce aç bırakabiliyor ve çıkış yolu yoktu.
   *
   * GELEN SEFER VARKEN ENGELLENMEDİ — bilerek. İlk bakışta "saldırı
   * anında misafiri kov, savunmayı düşür" gibi bir sömürü var sanılıyor
   * ama SAHİBİ zaten her an geri çağırabiliyor ve onda böyle bir kısıt
   * yok. Ev sahibine kısıt koymak yeni bir kapı kapatmaz, yalnız asıl
   * kullanımı (açlıktan boğulan köyün fazla boğazı göndermesi) tam da
   * gerektiği anda engellerdi.
   *
   * Sahibine RAPOR gidiyor: askerinin neden yolda olduğunu göremezse
   * oyuncu bunu hata sanar.
   */
  socket.on('takviye_geri_yolla', async ({ ownerUserId, slotKey, units = null } = {}) => {
    const fail = (reason) => socket.emit('army_error', { reason });
    const hostKey = session.activeSlot;
    const host = hostKey && session.villages.get(hostKey);
    if (!host) return fail('konum_yok');
    if (ownerUserId === userId) return fail('kendi_koyun');

    const girdiler = (host.takviyeler || [])
      .filter(t => t.userId === ownerUserId && t.slotKey === slotKey);
    if (!girdiler.length) return fail('takviye_yok');

    /*
      SAHİBİN KÖYÜ: önce bellekteki oturum. Oyuncu çevrimdışıysa oturumu
      sunucu yeniden başlayana kadar bellekte kalıyor; yoksa kayıttan
      okunup geri yazılıyor. Asıl kullanım zaten ÇEVRİMDIŞI oyuncunun
      unuttuğu takviye, "oyuncu çevrimiçi olsun" şartı işi anlamsız
      kılardı.
    */
    const sahipOturum = userSessions.get(ownerUserId);
    let sahipKoy = sahipOturum?.villages.get(slotKey) || null;
    let kayittan = false;
    if (!sahipKoy) {
      try {
        const rows = await loadVillages(ownerUserId);
        const row = rows.find(r => r.slotKey === slotKey);
        if (row?.state) { sahipKoy = hydrateVillage(row.state); kayittan = true; }
      } catch (err) {
        console.error('[TAKVİYE YOLLA] sahip köyü okunamadı:', err.message);
      }
    }
    if (!sahipKoy) return fail('gecersiz_hedef');

    const a = WORLD.slotByKey.get(hostKey);
    const b = WORLD.slotByKey.get(slotKey);
    const dist = (a && b) ? W.distanceBetween(a, b) : 1;

    const res = ARMY.takviyeGeriCagir(host, sahipKoy,
      { userId: ownerUserId, slotKey, units }, dist);
    if (!res.ok) return fail(res.reason);

    // Sahibine rapor: askerinin neden yolda olduğunu görsün
    ARMY.pushReport(sahipKoy, {
      id: `yolla-${Date.now()}`, at: Date.now(), dir: 'in', mode: 'takviye',
      fromName: WORLD.playerBySlot.get(hostKey)?.name || hostKey,
      toName: sahipKoy.name || slotKey, toKey: slotKey,
      outcome: 'takviye_geri_yollandi', winner: 'none',
      sent: { ...res.march.units }, myLosses: {}, theirLosses: {}, loot: {},
    });

    if (kayittan) {
      try { await saveVillage(ownerUserId, slotKey, sahipKoy); }
      catch (err) { console.error('[TAKVİYE YOLLA] sahip köyü yazılamadı:', err.message); }
    } else {
      markUserDirty(ownerUserId, slotKey);
    }
    dirty(); emit();
    socket.emit('army_sent', {
      id: res.march.id, toName: sahipKoy.name || slotKey, mode: 'takviye_geri_yollandi',
      seconds: res.march.legSeconds, distance: dist,
    });
    console.log(`[TAKVİYE YOLLA] ${userEmail} → userId=${ownerUserId}`
      + ` (${ARMY.totalUnits(res.march.units)} birim)`);
  });

  socket.on('takviye_geri_cagir', ({ hostKey, takviyeId, slotKey, units = null } = {}) => {
    const fail = (reason) => socket.emit('army_error', { reason });
    const host = villageAtSlot(hostKey);
    if (!host?.village) return fail('gecersiz_hedef');

    let kaynakSlot = slotKey;
    if (!kaynakSlot) {
      const girdi = (host.village.takviyeler || []).find(t => t.id === takviyeId);
      if (!girdi) return fail('takviye_yok');
      if (girdi.userId !== userId) return fail('senin_degil');
      kaynakSlot = girdi.slotKey;
    }

    const benimKoy = session.villages.get(kaynakSlot);
    if (!benimKoy) return fail('konum_yok');

    const a = WORLD.slotByKey.get(hostKey);
    const b = WORLD.slotByKey.get(kaynakSlot);
    const dist = (a && b) ? W.distanceBetween(a, b) : 1;

    const res = ARMY.takviyeGeriCagir(host.village, benimKoy,
      { userId, slotKey: kaynakSlot, units }, dist);
    if (!res.ok) return fail(res.reason);

    if (host.userId) markUserDirty(host.userId, hostKey);
    markUserDirty(userId, kaynakSlot);
    dirty(); emit();
    socket.emit('army_sent', {
      id: res.march.id, toName: benimKoy.name || 'Köyün', mode: 'takviye_donus',
      seconds: res.march.legSeconds, distance: dist,
    });
    console.log(`[TAKVİYE GERİ] ${userEmail} ← ${hostKey}`
      + ` (${ARMY.totalUnits(res.march.units)} birim, ${res.march.legSeconds} sn)`);
  });

  socket.on('simulate_battle', (payload = {}) => {
    try {
      // `tag` aynen geri döner: aynı anda birden fazla ekran tahmin isteyebilir
      // (savaş simülatörü + saldırı ekranı), yanıtı kim istediyse o eşleştirsin.
      const { attacker = {}, defender = {}, surLevel = 0, hendekLevel = 0, kulePct = 0, mode = 'normal', tag = null,
        attackerLevels = null, defenderLevels = null } = payload;
      /**
       * Simülatörde saldıran taraf oyuncunun kendisi sayılıyor: yükseltme
       * verilmediyse KENDİ ekipman seviyeleri kullanılıyor, yoksa tahmin
       * gerçek savaştan düşük çıkardı. Savunan taraf varsayılan Lvl 0 —
       * hedefin yükseltmeleri bilinmiyor (keşif onu söylemiyor).
       */
      socket.emit('battle_result', { ok: true, tag, result: simulateBattle(attacker, defender, {
        surLevel, hendekLevel, kulePct, mode,
        attackerLevels: attackerLevels || v().equipmentLevels || null,
        defenderLevels,
      }) });
    } catch (err) {
      socket.emit('battle_result', { ok: false, tag: payload?.tag ?? null, error: err.message });
    }
  });

  /**
   * DEV KOLAYLIĞI — yalnız TRANORD_DEV_CHEATS=1 ortam değişkeniyle tanımlanır.
   * Sefer/savaş sistemini ordu biriktirmeyi beklemeden denemek için. Değişken
   * yoksa olay hiç kaydedilmez, yani üretimde erişilebilir bir yüzey oluşmaz.
   */
  if (process.env.TRANORD_DEV_CHEATS === '1') {
    /**
     * HIZ ÇUBUĞU — kasten BU BLOĞUN İÇİNDE.
     *
     * `WORLD.speed` oturuma değil DÜNYAYA ait: ekonomi, NPC'ler ve seferler
     * hep birlikte o çarpanla akıyor. Handler blok dışındayken giriş yapmış
     * HERHANGİ bir oyuncu tarayıcı konsolundan
     *     socket.emit('set_speed', { tickMs: 7 })
     * yazıp bütün dünyayı 143×'e çıkarabiliyordu (ya da 10000 ile 0,1×'e
     * düşürüp herkesi durdurabiliyordu). Oyun satılacağı için bu hem ekonomi
     * hilesi hem griefing yüzeyi.
     *
     * İstemcideki `import.meta.env.DEV` kapısı yalnızca DÜĞMEYİ gizliyordu,
     * olayı değil — sunucu tarafında kapatmak şarttı. index.dev.js bu
     * değişkeni kendisi kuruyor, yani yerel geliştirmede çubuk çalışmaya
     * devam ediyor; Pi ve Hetzner'de tanımlı olmadığı için olay hiç
     * kaydedilmiyor.
     */
    socket.on('set_speed', ({ tickMs: newMs } = {}) => {
      session.tickMs = Math.max(MIN_TICK_MS, Math.min(MAX_TICK_MS, Number(newMs) || DEFAULT_TICK_MS));
      // Çubuk DÜNYA hızını ayarlar: ekonomi, NPC'ler ve seferler birlikte akar
      WORLD.speed = DEFAULT_TICK_MS / session.tickMs;
      console.log(`[HIZ] ${userEmail} → ${WORLD.speed.toFixed(2)}× `
        + `(1 oyun saati = ${(GT.HOUR_SECONDS / WORLD.speed).toFixed(0)} gerçek sn)`);
      emit();
    });

    socket.on('dev_grant', ({ army: a, resources: r } = {}) => {
      const village = v();
      /**
       * ASKER BÜTÇESİ — kaç asker verilebileceği ÖNCEDEN hesaplanır.
       *
       * Asker nüfusun parçası: eğitimde boş işçi askere dönüşür, nüfus
       * artmaz. Eskiden bu kısayol `population += added` yapıp tavanı da
       * yukarı çekiyordu; altı kez basınca nüfus 7.140 / tavan 5.550 gibi
       * imkânsız bir duruma düşüyordu (ekranda görüldü).
       *
       * Bütçe = boş işçi + tavana kalan yer. Bütçeden fazlası VERİLMEZ;
       * "verip muhasebeyi sonra onarırız" demek 83 köylünün kaybolduğu
       * hatanın aynısını üretirdi.
       */
      const tavan = maxPopulationOf(village);
      let butce = (village.freeWorkers || 0) + Math.max(0, tavan - (village.population || 0));
      let added = 0, atlanan = 0;
      for (const [k, n] of Object.entries(a || {})) {
        const istenen = Math.max(0, Math.floor(Number(n) || 0));
        if (!UNIT_DEFS[k] || !istenen) continue;
        const cnt = Math.min(istenen, butce);
        atlanan += istenen - cnt;
        if (cnt <= 0) continue;
        village.army[k] = (village.army[k] || 0) + cnt;
        added += cnt; butce -= cnt;
      }
      if (added > 0) {
        const havuzdan = Math.min(added, village.freeWorkers || 0);
        village.freeWorkers -= havuzdan;
        village.population += added - havuzdan;      // tavanı aşamaz, bütçe garanti
      }
      for (const [k, n] of Object.entries(r || {})) {
        if (village.resources[k] != null) village.resources[k] += Math.floor(Number(n) || 0);
      }
      dirty(); emit();
      socket.emit('dev_result', { ok: atlanan === 0,
        message: atlanan
          ? `Ordu +${added} asker — ${atlanan} asker verilemedi (nüfus tavanı ${tavan} dolu)`
          : `Ordu +${added} asker` });
      console.log(`[DEV] ${userEmail} ordu +${added}`
        + (atlanan ? ` (${atlanan} atlandı, nüfus tavanı)` : ''));
    });

    /**
     * TEST KURULUMU — depoları belirtilen seviyeye çıkarıp tam doldurur.
     *
     * Amaç: oyunu denemek için kaynak biriktirmeyi beklememek. Eskiden bunun
     * tek yolu sunucuyu kapatıp kayıt dosyasını elle yamalamaktı; sunucu
     * açıkken yamalanan dosyayı bellekteki durum geri yazıyordu.
     *
     * Depo binası yoksa boş bir hex'e KURULUR; varsa seviyesi yükseltilir.
     * Ücret alınmaz, süre beklenmez — kasten, bu bir test kolaylığı.
     */
    socket.on('dev_setup', ({ level = 10, fill = true } = {}) => {
      const village = v();
      const lv = Math.max(1, Math.min(20, Math.floor(Number(level) || 10)));
      const STORAGE = ['hammaddeDepo', 'islenmisMalDepo', 'tahilAmbar', 'granary'];

      /**
       * Boş hex slotları. Sunucu ayrı bir slot listesi tutmuyor (canBuildAt
       * yalnızca "dolu mu" diye bakıyor), o yüzden istemcinin yerleşim
       * halkaları burada üretiliyor: merkez + halka 1..3 = 37 hücre.
       */
      const free = [];
      for (let q = -3; q <= 3; q++) {
        for (let r = -3; r <= 3; r++) {
          const ring = (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2;
          if (ring < 1 || ring > 3) continue;          // merkez ve dışı atla
          const key = `${q},${r}`;
          if (!village.villageBuildings[key]) free.push({ key, ring });
        }
      }
      // İç halkalar önce: depolar en dış kenara tek sıra dizilmesin
      free.sort((a, b) => a.ring - b.ring || a.key.localeCompare(b.key));

      const kurulan = [];
      for (const type of STORAGE) {
        let entry = Object.entries(village.villageBuildings)
          .find(([, b]) => b.type === type);
        if (!entry) {
          const spot = free.shift();
          if (!spot) { console.warn(`[DEV] boş hex kalmadı, ${type} kurulamadı`); continue; }
          const key = spot.key;
          village.villageBuildings[key] = { type, level: lv, workers: 0 };
          kurulan.push(`${type}@${key} yeni lvl${lv}`);
        } else {
          const [, b] = entry;
          b.level = Math.max(b.level, lv);
          /**
           * İŞÇİ KAÇAĞI DÜZELTMESİ: süren inşaat burada iptal ediliyordu ama
           * `buildWorkers` havuza DÖNDÜRÜLMEDEN siliniyordu. Yükseltme
           * sırasında TEST DOLDUR'a basmak o işçileri yok ediyordu — nüfus
           * sayısı yerinde kalıyor, kimse hiçbir işte görünmüyordu (ölçüldü:
           * 7 işçilik yükseltmede tam 7 kişi kayboldu).
           */
          if (b.building && b.buildWorkers) village.freeWorkers += b.buildWorkers;
          delete b.building; delete b.buildEndTime; delete b.buildWorkers;
          kurulan.push(`${type} lvl${b.level}`);
        }
      }

      if (fill) {
        const { caps, granaryCap } = getStorageCaps(village);
        for (const [res, cap] of Object.entries(caps)) village.resources[res] = cap;
        // Un ve ekmek ORTAK ambarı paylaşıyor — tavanı ikiye böl
        village.resources.un = Math.floor(granaryCap / 2);
        village.resources.ekmek = granaryCap - village.resources.un;
      }

      dirty(); emit();
      socket.emit('dev_result', { ok: true, message: `Depolar Lvl ${lv}`
        + (fill ? ' ve dolu' : '') });
      console.log(`[DEV] ${userEmail} test kurulumu: ${kurulan.join(' · ')}`
        + (fill ? ' · depolar dolduruldu' : ''));
    });

    /**
     * TEST — NÜFUSU TAVANA ÇIKAR.
     *
     * Tavan evlerden geliyor (BASE_POPULATION + Σ ev seviyesi × 100), yani
     * "ev yettiği kadar". Ev yoksa 50'de kalır — kasten: kapasiteyi uydurmak
     * ev kurmanın anlamını yok ederdi.
     *
     * Gelen kişiler BOŞ İŞÇİ havuzuna ekleniyor. Nüfusu artırıp havuzu
     * artırmamak muhasebeyi bozardı (nüfus = boş + çalışan + inşaat + ordu
     * + kuyruk + sefer); bu tam da 83 köylünün kaybolduğu hatanın şekliydi.
     */
    socket.on('dev_fill_population', () => {
      const village = v();
      const tavan = maxPopulationOf(village);
      const eksik = tavan - (village.population || 0);
      if (eksik <= 0) {
        socket.emit('dev_result', { ok: true,
          message: `Nüfus zaten tavanda (${village.population}/${tavan})` });
        return;
      }
      village.population += eksik;
      village.freeWorkers = (village.freeWorkers || 0) + eksik;
      village.maxPopulation = tavan;
      village.popAccum = 0;

      dirty(); emit();
      socket.emit('dev_result', { ok: true,
        message: `+${eksik} köylü — nüfus ${village.population}/${tavan}` });
      console.log(`[DEV] ${userEmail} nüfus tavana: +${eksik} (${village.population}/${tavan})`);
    });

    /**
     * TEST — BÜTÜN BİNALARI SON SEVİYEYE ÇIKAR.
     *
     * Üst seviye içeriği (Lvl 10 birimler, 20. seviye savunma, köşk/saray
     * hakları) beklemeden denemek için. Kaynak alınmaz, süre beklenmez.
     *
     * `maxLevel` tanımsız olan 18 bina için tavan 20 kabul ediliyor — tarla
     * tablosu ve sur/kule tavanıyla aynı hizada.
     *
     * DİKKAT: süren inşaatlar burada iptal ediliyor; inşaat işçileri havuza
     * GERİ VERİLİYOR. dev_setup'ta tam bu satır eksik olduğu için 83 köylü
     * kaybolmuştu (bkz. repairWorkerAccounting).
     */
    socket.on('dev_max_buildings', ({ level = 20, tiles = true } = {}) => {
      const village = v();
      const tavan = Math.max(1, Math.min(20, Math.floor(Number(level) || 20)));
      let bina = 0, tarla = 0, iadeIsci = 0;

      for (const b of Object.values(village.villageBuildings)) {
        if (b.building && b.buildWorkers) { iadeIsci += b.buildWorkers; village.freeWorkers += b.buildWorkers; }
        delete b.building; delete b.buildEndTime; delete b.buildWorkers;
        const def = VILLAGE_DEFS[b.type];
        const hedef = Math.min(def?.maxLevel || tavan, tavan);
        if (b.level < hedef) { b.level = hedef; bina++; }
      }

      if (tiles) {
        for (const t of Object.values(village.productionTiles)) {
          if (t.upgrading && t.upgradeWorkersAssigned) {
            iadeIsci += t.upgradeWorkersAssigned;
            village.freeWorkers += t.upgradeWorkersAssigned;
          }
          t.upgrading = false; t.upgradeEndTime = null; t.upgradeWorkersAssigned = 0;
          const hedef = Math.min(BUILDING_DEFS[t.type]?.levels?.length || tavan, tavan);
          if (t.level < hedef) { t.level = hedef; tarla++; }
        }
      }

      dirty(); emit();
      socket.emit('dev_result', { ok: true,
        message: `${bina} bina${tiles ? ` + ${tarla} tarla` : ''} son seviyeye çıktı` });
      console.log(`[DEV] ${userEmail} maks seviye: ${bina} bina, ${tarla} tarla`
        + (iadeIsci ? ` · ${iadeIsci} inşaat işçisi havuza döndü` : ''));
    });

    /**
     * TEST — İKİNCİ KÖY. Kültür puanı biriktirmeyi ve köşk/saray dikmeyi
     * beklemeden çoklu köy arayüzünü (köy değiştirici, ayrı tick, ayrı
     * kayıt) denemek için. Kurallar KASTEN atlanıyor: göçmen, kaynak,
     * yol süresi, köy hakkı hiçbiri sorulmuyor.
     *
     * Yer: merkez köye EN YAKIN boş dünya slotu. Slotlar zaten aralıklı
     * üretildiği için ayrıca mesafe kontrolü gerekmiyor.
     */
    /**
     * TEST — SURLU HEDEF KÖY.
     *
     * Kuşatmayı denemenin önünde iki engel vardı: yakında surlu bir NPC
     * bulmak ve mancınığın vuracağı binaların var olması. İkisi de rastgele
     * tohumlamaya kalıyordu. Bu kısayol EN YAKIN NPC köyüne sur/hendek ve
     * birkaç bina dikiyor — koç başının SURU indirip HENDEĞE dokunmadığı
     * tek saldırıda görülebilsin diye ikisi FARKLI seviyede veriliyor.
     *
     * Ordusuna dokunulmuyor: kuşatma yalnız saldıran KAZANIRSA işliyor,
     * yani hedefin savunmasını yapay olarak sıfırlamak testi yalanlar.
     */
    /**
     * DEV: KAHRAMAN KISAYOLU — eşya, macera hakkı ve deneyim.
     *
     * Kahramanı ekranda denemek RASTGELELİĞE bağlıydı: eşya uzun
     * maceraların ancak beşte birinde düşüyor, yani kuşam ekranını bir
     * kez görmek için yedi macera beklemek gerekiyordu (ölçüldü). Bu
     * kısayol o beklemeyi kaldırıyor.
     *
     * Üretimde YOK: bütün dev kısayolları gibi TRANORD_DEV_CHEATS=1
     * kapısının arkasında ve o değişken Pi'ye asla eklenmiyor.
     */
    socket.on('dev_kahraman', ({ esya = 4, macera = true, xp = 0, oldur = false } = {}) => {
      const kah = kahramanDurumu(session, { yarat: true });
      if (!kah) return;
      const konak = kahramanKonagi(session);
      if (konak) kah.usSlot = konak.slotKey;

      /*
        ÖLDÜR: diriltme akışını denemek için. Savaşta ölmek defalarca
        kurgulanması zor bir durum (savunması olan bir hedef gerekiyor),
        oysa diriltme ekranı her sürümde çalışmalı.
      */
      if (oldur) {
        HERO.hasarVer(kah, 99999);
        dirty(); emit();
        console.log(`[DEV] ${userEmail} kahramanı öldürüldü`);
        return;
      }

      const anahtarlar = Object.keys(HERO_ITEMS);
      const nadirlikler = ['siradan', 'iyi', 'nadir', 'efsane'];
      for (let i = 0; i < Math.max(0, Math.min(20, esya)); i++) {
        (kah.envanter ||= []).push({
          key: anahtarlar[Math.floor(Math.random() * anahtarlar.length)],
          nadirlik: nadirlikler[Math.floor(Math.random() * nadirlikler.length)],
        });
      }
      if (macera) kah.maceraSayisi = MACERA.maceraTavani(konak?.level || 1);
      if (xp > 0) HERO.xpEkle(kah, xp);
      dirty(); emit();
      console.log(`[DEV] ${userEmail} kahraman: +${esya} eşya, +${xp} XP`);
    });

    socket.on('dev_surlu_hedef', ({ sur = 10, hendek = 5 } = {}) => {
      const mySlot = session.activeSlot || WORLD.slotByUser.get(userId);
      const me = WORLD.slotByKey.get(mySlot);
      let best = null, bestD = Infinity;
      for (const n of WORLD.npcs.values()) {
        const d = me ? W.distanceBetween(me, n.slot) : n.slot.ring;
        if (d < bestD) { bestD = d; best = n; }
      }
      if (!best) {
        socket.emit('dev_result', { ok: false, message: 'Yakında NPC köyü yok' });
        return;
      }

      const hv = best.village;
      const surLv = Math.max(1, Math.min(20, Math.floor(Number(sur) || 10)));
      const henLv = Math.max(0, Math.min(20, Math.floor(Number(hendek) || 5)));
      const koy = (slotKey, type, level) => {
        if (level <= 0) return;
        const b = hv.villageBuildings[slotKey];
        if (b && b.type === type) { b.level = Math.max(b.level || 0, level); }
        else hv.villageBuildings[slotKey] = { type, level, workers: 0 };
      };
      koy('sur', 'sur', surLv);
      koy('hendek', 'hendek', henLv);
      // Mancınığın vurabileceği birkaç hedef — hepsi farklı tip
      const hedefler = [['1,0', 'kisla'], ['1,-1', 'hammaddeDepo'], ['0,-1', 'anaBina']];
      for (const [slotKey, type] of hedefler) koy(slotKey, type, 10);

      markNpcDirty(best.slot.key);
      try { socket.emit('world_snapshot', worldSnapshot(userId, session.activeSlot)); }
      catch { /* harita yenilenmezse oyuncu kendisi açar */ }
      socket.emit('dev_result', { ok: true,
        message: `${best.slot.name} (${best.slot.key}, ${bestD} hex) — sur Lvl ${surLv}, hendek Lvl ${henLv}` });
      console.log(`[DEV] ${userEmail} surlu hedef: ${best.slot.key} sur ${surLv} / hendek ${henLv}`);
    });

    socket.on('dev_new_village', async () => {
      const cap = WORLD.slotByKey.get(session.capitalSlot);
      const taken = new Set([...WORLD.npcs.keys(), ...WORLD.playerBySlot.keys()]);
      let best = null, bestD = Infinity;
      for (const sl of WORLD.slots) {
        if (taken.has(sl.key)) continue;
        const d = cap ? W.distanceBetween(cap, sl) : sl.ring;
        if (d < bestD) { bestD = d; best = sl; }
      }
      if (!best) {
        socket.emit('dev_result', { ok: false, message: 'Boş dünya slotu kalmadı' });
        console.warn(`[DEV] ${userEmail} boş slot bulunamadı, köy kurulamadı`);
        return;
      }

      const nv = createVillage(best.q, best.r);
      nv.isCapital = false;
      session.villages.set(best.key, nv);
      session.dirtySlots.add(best.key);

      const name = best.name;   // köy adı slotun kendi adı (e-posta değil)
      WORLD.playerBySlot.set(best.key, { userId, email: userEmail, name });
      if (!WORLD.slotsByUser.has(userId)) WORLD.slotsByUser.set(userId, new Set());
      WORLD.slotsByUser.get(userId).add(best.key);

      try {
        await setPlayerSlot(userId, best.key, name, false);
        await saveVillage(userId, best.key, nv);
      } catch (err) {
        console.error('[DEV] yeni köy kaydı:', err.message);
      }

      emitVillage(session, { force: true, statics: true });
      try { socket.emit('world_snapshot', worldSnapshot(userId, session.activeSlot)); }
      catch { /* harita yenilenmezse oyuncu kendisi açar */ }
      socket.emit('dev_result', { ok: true,
        message: `${best.name} (${best.key}) kuruldu — ${session.villages.size} köy` });
      console.log(`[DEV] ${userEmail} yeni köy ${best.key} (${best.name},`
        + ` merkezden ${bestD} hex) — toplam ${session.villages.size} köy`);
    });
  }

  socket.on('disconnect', async () => {
    console.log(`[DISCONNECT] ${userEmail} (${userId})`);
    socketToUser.delete(socket.id);
    if (session.socketId === socket.id) session.socketId = null;
    await flushSession(userId, session);
  });
});

/**
 * Sağlık/sürüm ucu. Sefer sisteminin YÜKLÜ olup olmadığı buradan görülür;
 * eski sunucu çalışırken istemci 'send_army' gönderiyor ve olay sessizce
 * kayboluyordu — hangi sürümün ayakta olduğunu girişe gerek kalmadan bilmek
 * teşhis için şart.
 */
app.get('/', (_req, res) => res.json({
  ok: true,
  name: 'TraNord',
  features: { marches: true, combat: true, stats: true },
  marchInfo: {
    hourSeconds: GT.HOUR_SECONDS,
    scoutUnits: [...ARMY.SCOUT_UNITS],
    npcRaids: NPC_RAIDS_ENABLED,
  },
  timeScale: { hourSeconds: GT.HOUR_SECONDS, hoursPerTick: GT.HOURS_PER_TICK },
  npcs: WORLD.npcs.size,
  players: WORLD.playerBySlot.size,
}));

const PORT = process.env.PORT || 3001;

// Sunucu başlarken tüm köyleri yükle + offline süreyi tele al
async function bootServer() {
  await initDB();

  const allVillages = await loadAllVillages();
  const now = Date.now();

  /**
   * ÇOKLU KÖY: `loadAllVillages` köy başına bir satır döndürüyor, oyuncu
   * başına bir tane değil. Aynı oyuncunun köyleri tek oturumda toplanır;
   * offline telafi KÖY BAŞINA kendi `updated_at`'inden yapılır.
   */
  const byUser = new Map();
  let telafiEdilen = 0;

  for (const { userId, slotKey, isCapital, state, updatedAt } of allVillages) {
    if (!slotKey) {
      console.warn(`[BOOT] userId=${userId} slotsuz köy kaydı atlandı`);
      continue;
    }
    const village = hydrateVillage(state);
    village.isCapital = !!isCapital;

    // NPC'lerle AYNI tavan — oyun saati cinsinden, kaba adımlarla
    const offlineHours = Math.min(MAX_CATCHUP_HOURS,
      (now - updatedAt.getTime()) / 1000 / GT.HOUR_SECONDS);
    const offlineTicks = Math.floor(offlineHours / GT.CATCHUP_HOURS_PER_STEP);

    // stepVillage (processTick DEĞİL): inşaatlar da tamamlanmalı.
    // processTick tek başına bina inşaatını bitirmiyordu; oyuncu offline dönerken
    // inşaatları asılı kalıyordu.
    /*
      TELAFİ KALKANI — bu döngü SUNUCUNUN AÇILIŞ YOLU üzerinde.

      Korumasız hâlde tek bir köyün durumundan kaynaklanan hata bütün
      açılışı iptal ediyordu: bootServer().catch() exit(1) veriyor, systemd
      3 saniyede yeniden başlatıyor, aynı köy yine düşürüyor. Sonuç sonsuz
      açılış döngüsü — bir oyuncunun köyü yüzünden HERKES oyun dışı kalıyor.

      Gerçek örnek: Rún Salonu araştırması sürerken kaydedilen bir köy,
      processResearchQueue'daki ReferenceError yüzünden tam olarak bunu
      yapabilirdi. Artık o köy telafisiz yükleniyor (kaynakları eksik
      kalıyor), dünya ayağa kalkıyor ve sorun logdan görülüyor.
    */
    try {
      for (let i = 0; i < offlineTicks; i++) stepVillage(village, GT.CATCHUP_HOURS_PER_STEP);
      if (offlineTicks > 0) telafiEdilen++;
    } catch (err) {
      kalkanLog(`açılış telafisi userId=${userId} slot=${slotKey}`, err);
    }

    let rec = byUser.get(userId);
    if (!rec) { rec = { villages: new Map(), capitalSlot: null, tickMs: null, dirty: new Set() }; byUser.set(userId, rec); }
    rec.villages.set(slotKey, village);
    if (isCapital) rec.capitalSlot = slotKey;
    rec.tickMs ||= village.tickMs || DEFAULT_TICK_MS;
    if (offlineTicks > 0) rec.dirty.add(slotKey);
  }

  for (const [userId, rec] of byUser) {
    const capitalSlot = rec.capitalSlot || [...rec.villages.keys()][0];
    for (const [k, v] of rec.villages) v.isCapital = (k === capitalSlot);
    const sess = makeSession(userId, {
      villages: rec.villages,
      activeSlot: capitalSlot,
      capitalSlot,
      tickMs: rec.tickMs || DEFAULT_TICK_MS,
    });
    sess.nextTickAt = now + sess.tickMs;
    sess.lastTickAt = now;              // ilk tick geçmişten sıçramasın
    for (const k of rec.dirty) sess.dirtySlots.add(k);
    userSessions.set(userId, sess);
  }

  console.log(`[BOOT] ${allVillages.length} oyuncu köyü yüklendi`
    + ` (${byUser.size} oyuncu`
    + (telafiEdilen ? `, ${telafiEdilen} köye offline telafi` : '') + ')');

  await bootWorld();

  /**
   * BAĞLANMA ADRESİ — üretimde yalnız döngü arayüzü.
   *
   * Node'un önünde nginx var; port dışarıya açık olmasın diye servis
   * HOST=127.0.0.1 veriyor. Yerelde varsayılan 0.0.0.0 kalıyor ki aynı ağdaki
   * telefondan da test edilebilsin.
   */
  const HOST = process.env.HOST || '0.0.0.0';
  server.listen(PORT, HOST, () => {
    console.log(`Sunucu: http://localhost:${PORT} (bağlanma: ${HOST})`);
    console.log(`[ZAMAN] 1 oyun saati = ${GT.HOUR_SECONDS} gerçek saniye`
      + ` (${(3600 / GT.HOUR_SECONDS).toFixed(2)}× Travian) — TRANORD_HOUR_SECONDS ile değişir`);
    console.log(`[CORS] mod: ${IS_PROD ? 'ÜRETİM' : 'yerel'} (${envReason()})`);
    console.log(`[CORS] izinli origin: ${ORIGIN_LIST.length ? ORIGIN_LIST.join(', ') : '(yok)'}`);
  });
}

/**
 * SON ÇARE — kalkanların dışında kalan hatalar.
 *
 * İkisi KASTEN farklı davranıyor:
 *
 * `unhandledRejection` yalnızca loglanıyor. Bu projede retler pratikte
 * veritabanı/G-Ç çağrılarından geliyor; tek bir başarısız sorgu için oynayan
 * herkesi düşürmek zararın kendisinden büyük olurdu.
 *
 * `uncaughtException` ise loglanıp süreç KAPATILIYOR — ama diske YAZMADAN.
 *
 * Yazmamak kasıtlı. Çökme köyün DURUMUNDAN kaynaklanıyorsa (bu projede
 * yaşandı: araştırma kuyruğundaki bir iş her tick hata fırlatıyordu), o
 * durumu kaydetmek hatayı KALICI yapar: sunucu açılır, aynı köyü yükler,
 * yine düşer. Kayıtsız çıkışta en fazla son 30 saniyenin komutları
 * kaybolur — üretim zaten açılışta `updated_at` üzerinden yeniden
 * hesaplanıyor, yani kaybın büyük kısmı kendiliğinden geri geliyor.
 *
 * systemd 3 saniyede geri getiriyor (Restart=always).
 */
process.on('unhandledRejection', (reason) => {
  console.error('[YAKALANMAMIŞ RET]', reason?.stack || reason);
});

let kapaniyor = false;
process.on('uncaughtException', (err) => {
  console.error('[YAKALANMAMIŞ HATA] süreç kapatılıyor:', err?.stack || err);
  if (kapaniyor) return;                   // kapanış sırasında ikinci hata
  kapaniyor = true;
  /*
    Bilerek KAYIT YOK — gerekçe yukarıdaki blokta. Loglar journald'a
    ulaşsın diye bir tick bekleyip çıkıyoruz.
  */
  setTimeout(() => process.exit(1), 100).unref();
});

bootServer().catch(err => {
  console.error('[BOOT FAIL]', err.message);
  process.exit(1);
});
