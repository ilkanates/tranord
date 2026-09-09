const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');

const { createVillage, hydrateVillage,
        TOWER_SLOTS_ARR: TOWER_SLOT_NAMES,
        WALL_SLOTS_ARR: WALL_SLOT_NAMES,
        DEFENCE_TYPES, civilianCount } = require('./game/villageState');
const { processTick, getUpgradeSeconds, hexDistanceFromCenter, getProductionMultiplier, getSlotTotalMultiplier, getUnitTrainSeconds, getEquipmentCap, getEquipmentPool, getConsumptionRates, getStorageCaps } = require('./game/tick');
const { simulateBattle, towerBonusPct } = require('./game/combat');
const ARMY = require('./game/army');
const GT = require('./game/gameTime');
const { router: authRouter, verifyToken } = require('./auth');
const { initDB, loadVillages, saveVillage, loadAllVillages, setCapital,
        loadNpcVillages, saveNpcVillages, loadPlayerSlots, setPlayerSlot } = require('./db');
const W = require('./game/world');
const { seedNpcVillage, runNpcAi, npcSummary, stepVillage } = require('./game/npcAi');

// Kule de personel alır (arayüzde "okçu" adıyla); sur ve hendek almaz.
const WORKER_ASSIGNABLE_MILITARY = new Set(['silahci', 'zirh', 'ahir', 'kisla', 'atolye', 'kule']);
const { PRODUCTION_DEFS: BUILDING_DEFS, VILLAGE_DEFS, EQUIPMENT_DEFS, EQUIPMENT_BY_BUILDING, UNIT_DEFS, BASE_STATS,
        maxPopulationOf, maxLevelOf } = require('./data');

const TRAINABLE_UNITS = Object.fromEntries(
  Object.entries(UNIT_DEFS).filter(([_, def]) => {
    if (def.category === 'kusatma') return false;
    return (def.equipment || []).every(eq => EQUIPMENT_DEFS[eq]);
  })
);

const UNITS_BY_BUILDING = Object.entries(TRAINABLE_UNITS).reduce((acc, [key, def]) => {
  if (!def.trainedAt) return acc;
  (acc[def.trainedAt] ||= []).push(key);
  return acc;
}, {});

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

// Per-user state: userId -> { village, tickMs, nextTickAt, socketId, dirty }
const userSessions = new Map();

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

/** Arayüzdeki köy değiştirici için hafif liste */
function villageList(session) {
  const out = [];
  for (const [slotKey, v] of session.villages) {
    const slot = WORLD.slotByKey.get(slotKey);
    out.push({
      slotKey,
      name: slot?.name || slotKey,
      isCapital: slotKey === session.capitalSlot,
      active: slotKey === session.activeSlot,
      population: v.population || 0,
      q: slot?.q ?? v.worldQ ?? 0,
      r: slot?.r ?? v.worldR ?? 0,
      building: Object.values(v.villageBuildings || {}).some(b => b.building),
      starving: !!v.isStarving,
    });
  }
  return out.sort((a, b) => (b.isCapital - a.isCapital) || a.slotKey.localeCompare(b.slotKey));
}
const socketToUser  = new Map();

const DEFAULT_TICK_MS = 1000;
/** Aç değilken ve tavan altındayken saatte kaç kişi katılır */
/**
 * NÜFUS ARTIŞ HIZI — ANA BİNA SEVİYESİNE BAĞLI.
 *
 * Eskiden sabit 1 kişi/oyun saatiydi; ana binayı yükseltmenin nüfusa hiçbir
 * etkisi yoktu. Artık hız ana binadan gelir, TAVAN ise evlerden (bkz.
 * maxPopulation). Yani ana bina "ne kadar hızlı büyürüm", ev "ne kadar
 * büyüyebilirim" sorusunu cevaplıyor.
 *
 * Lvl 1'de eski hızın aynısı (1/saat = 24/gün), her seviye +0.6:
 *   lvl 1 → 1.0/sa   lvl 5 → 3.4/sa   lvl 10 → 6.4/sa   lvl 11 → 7.0/sa
 */
const POP_PER_HOUR_BASE = 1.0;
/**
 * Seviye başına artış 0,6 → 2. Eski hızda (Lvl 11'de 7 kişi/oyun saati)
 * tahılın besleyebildiği ~9.500 kişilik orduyu kurmak 56 oyun günü sürüyordu.
 * Yeni hızda Lvl 11 = 21, Lvl 20 = 39 kişi/saat; ana binayı yükseltmek de
 * gerçekten değerli oluyor.
 */
const POP_PER_HOUR_STEP = 2.0;

function popPerGameHour(anaBinaLevel) {
  const lv = Math.max(0, Math.floor(anaBinaLevel || 0));
  if (lv < 1) return 0;                       // ana bina yoksa büyüme yok
  return POP_PER_HOUR_BASE + (lv - 1) * POP_PER_HOUR_STEP;
}
/**
 * En küçük tick aralığı = en yüksek hız. 1000/7,8125 = 128× (üst bardaki
 * çubuğun son kademesi). Eskiden 100 ms idi ve çubuk 10×'te sessizce
 * kırpılıyordu: 16×, 32×, 128× yazıyor ama hepsi 10× koşuyordu.
 */
const MIN_TICK_MS     = 7;
const MAX_TICK_MS     = 10000;

/**
 * Köy binası inşa/yükseltme süresi — oyun DAKİKASI.
 * `buildBaseWork` bir "iş" sayısı; işçi sayısına bölünür. Değerler dakika
 * cetveline oturuyor (ana bina lvl1→2: 50 dk / işçi sayısı).
 */
function getVillageBuildMinutes(type, level, workers) {
  const def = VILLAGE_DEFS[type];
  if (!def || workers <= 0) return Infinity;
  const work = def.buildBaseWork * Math.pow(def.buildMultiplier, level - 1);
  return work / workers;
}
const getVillageBuildSeconds = getVillageBuildMinutes;   // geriye dönük ad

/**
 * YÜKSELTME MALİYETİ — HER SEVİYE İÇİN.
 *
 * Eskiden yalnızca `upgradeCostBase` tanımlı binalar ücret alıyordu ve o alan
 * SADECE anaBina'da vardı: diğer 27 bina Lvl 1'den sonra BEDAVA yükseliyordu.
 * Artık taban yok ise binanın İNŞA maliyeti taban kabul edilir, yani her
 * binanın her seviye artışının bir bedeli var.
 *
 * Maliyet = taban × çarpan^(mevcut seviye - 1). Çarpan bina tanımında
 * verilmezse UPGRADE_MULT_DEFAULT. 1.25 seçildi: Lvl 10'da ~7.5×, Lvl 20'de
 * ~73× taban — depo kapasitesinin (seviye × 500) ulaşabileceği aralıkta kalır.
 * anaBina kendi çarpanını (1.7) korur, dengesi elle ayarlanmış.
 */
const UPGRADE_MULT_DEFAULT = 1.25;

function getScaledUpgradeCost(type, currentLevel) {
  const def = VILLAGE_DEFS[type];
  const base = def?.upgradeCostBase || def?.cost;
  if (!base) return null;
  const mult = Math.pow(def.upgradeCostMultiplier || UPGRADE_MULT_DEFAULT,
    Math.max(0, currentLevel - 1));
  return Object.fromEntries(
    Object.entries(base).map(([k, v]) => [k, Math.round(v * mult)])
  );
}

function getMaxProductionSlots(village) {
  const anaBina = village.villageBuildings['0,0'];
  return Math.min(16, 5 + (anaBina?.level || 1));
}

const HEX_NEIGHBORS = [[1,-1],[1,0],[0,1],[-1,1],[-1,0],[0,-1]];
function getNeighbors(slotKey) {
  const [q, r] = slotKey.split(',').map(Number);
  return HEX_NEIGHBORS.map(([dq, dr]) => `${q+dq},${r+dr}`);
}

/**
 * SLOT TÜRÜ — hex arazi mi, sur mu, hendek mi, kule köşesi mi?
 * Savunma yapıları köyün içinde hex kaplamıyor (bkz. game/villageState.js).
 */
function slotKind(village, slotKey) {
  if (slotKey === 'sur' || slotKey === 'hendek') return slotKey;
  if (village.TOWER_SLOTS.has(slotKey)) return 'kule';
  return 'hex';
}

function canBuildAt(village, slotKey, buildingType, otherVillages = null) {
  if (slotKey === '0,0') return false;
  if (village.villageBuildings[slotKey]) return false;
  const def = VILLAGE_DEFS[buildingType];
  if (!def || buildingType === 'anaBina') return false;

  /**
   * Her savunma yapısı YALNIZ kendi isimli slotuna, her savunma slotu da
   * yalnız kendi yapısına.
   *
   * DÜZELTME: eski koşul `isDefence !== (buildingType === kind)` idi. Normal
   * bir hex'te (kind='hex') isDefence=false ve buildingType==='hex' de false
   * olduğu için false!==false çıkıyor ve koşul GEÇİYORDU: sur, hendek ve kule
   * herhangi bir hex'e kurulabiliyordu. Savunma slotları doğru çalıştığı için
   * hata yalnız "hex'e savunma yapısı" durumunda görünüyordu (3 vaka).
   */
  const kind = slotKind(village, slotKey);
  if (kind !== (DEFENCE_TYPES.has(buildingType) ? buildingType : 'hex')) return false;

  /**
   * TEK OLMA KURALI.
   *
   * `repeatableWhenMaxed` olan binalar (depolar) bir tane daha kurulabilir —
   * ama ancak MEVCUT OLANLARIN HEPSİ tavan seviyedeyse. Böylece oyuncu on
   * tane yarım depo dikip alan israf etmiyor, önce elindekini bitiriyor.
   */
  if (def.unique && !canRepeat(village, buildingType, def)) return false;

  /**
   * YÖNETİM BİNALARI:
   *  • Saray oyuncunun YALNIZ BİR köyünde olabilir (`oncePerPlayer`). Merkez
   *    köy şartı YOK: saray hangi köyde kuruluysa oradan "bu köyü merkez yap"
   *    denilebiliyor. Başka köye taşımak için önce mevcut saray yıkılmalı.
   *  • Köşk ve saray aynı köyde bir arada olamaz.
   */
  if (def.oncePerPlayer && otherVillages) {
    for (const [k, other] of otherVillages) {
      if (other === village) continue;
      if (Object.values(other.villageBuildings || {}).some(b => b.type === buildingType)) return false;
    }
  }
  if (def.excludes
    && Object.values(village.villageBuildings).some(b => b.type === def.excludes)) return false;
  const maxKule = VILLAGE_DEFS.kule?.maxInstances || TOWER_SLOT_NAMES.length;
  if (buildingType === 'kule'
    && Object.values(village.villageBuildings).filter(b => b.type === 'kule').length >= maxKule) return false;
  return true;
}

/**
 * Bu türden bir tane daha kurulabilir mi?
 *  • Hiç yoksa: evet.
 *  • `repeatableWhenMaxed` değilse: hayır (klasik tek örnek).
 *  • Öyleyse: mevcut olanların HEPSİ tavan seviyede ve inşaatı bitmişse evet.
 */
function canRepeat(village, buildingType, def) {
  const mevcut = Object.values(village.villageBuildings).filter(b => b.type === buildingType);
  if (!mevcut.length) return true;
  if (!def.repeatableWhenMaxed) return false;
  const tavan = maxLevelOf(buildingType);
  return mevcut.every(b => b.level >= tavan && !b.building);
}

/**
 * İNŞA REDDİNİN SEBEBİ — arayüzde gösterilecek tek cümle.
 *
 * `canBuildAt` yalnız true/false döndürüyor; oyuncu düğmeye basıp hiçbir şey
 * olmayınca sebebini bilemiyordu (saray örneği). Burada aynı kurallar sırayla
 * tekrar bakılıp insanca bir cümle üretiliyor.
 */
function buildRefusalReason(village, slotKey, buildingType, otherVillages = null, workers = 1) {
  const def = VILLAGE_DEFS[buildingType];
  if (!def) return 'Böyle bir bina yok.';
  if (slotKey === '0,0') return 'Ana bina hex\'i değiştirilemez.';
  if (village.villageBuildings[slotKey]) return 'Bu alan zaten dolu.';
  const kind = slotKind(village, slotKey);
  if (kind !== (DEFENCE_TYPES.has(buildingType) ? buildingType : 'hex')) {
    return kind !== 'hex'
      ? `Bu slota yalnız ${VILLAGE_DEFS[kind]?.name || kind} kurulabilir.`
      : `${def.name} köy içine kurulamaz — kendi savunma slotuna kurulur.`;
  }
  if (def.unique && !canRepeat(village, buildingType, def)) {
    if (def.repeatableWhenMaxed) {
      const tavan = maxLevelOf(buildingType);
      const eksik = Object.values(village.villageBuildings)
        .filter(b => b.type === buildingType && (b.level < tavan || b.building)).length;
      return `Yeni ${def.name} için mevcut ${eksik === 1 ? 'olanın' : eksik + ' tanesinin'}`
        + ` Lvl ${tavan} olması gerekiyor.`;
    }
    return `${def.name} bu köyde zaten var.`;
  }
  if (def.oncePerPlayer && otherVillages) {
    for (const [k, other] of otherVillages) {
      if (other === village) continue;
      if (Object.values(other.villageBuildings || {}).some(b => b.type === buildingType)) {
        const ad = WORLD.slotByKey.get(k)?.name || k;
        return `${def.name} yalnız tek köyde olabilir — şu an ${ad} köyünde.`
          + ` Taşımak için oradaki ${def.name.toLowerCase()} yıkılmalı.`;
      }
    }
  }
  if (def.excludes
    && Object.values(village.villageBuildings).some(b => b.type === def.excludes)) {
    return `${def.name} ile ${VILLAGE_DEFS[def.excludes]?.name || def.excludes} aynı köyde olamaz.`;
  }
  const maxKule = VILLAGE_DEFS.kule?.maxInstances || TOWER_SLOT_NAMES.length;
  if (buildingType === 'kule'
    && Object.values(village.villageBuildings).filter(b => b.type === 'kule').length >= maxKule) {
    return `En fazla ${maxKule} kule kurulabilir.`;
  }
  if (!workers || workers < 1) return 'En az 1 inşaat işçisi gerekiyor.';
  if (workers > village.freeWorkers) return `Yeterli boş işçi yok (${village.freeWorkers} boş).`;
  return 'İnşa edilemedi.';
}

const VALID_PRODUCTION_TYPES = new Set(['odun','kil','tas','demir','tahil']);

/**
 * Bu dünya hex'i BAŞKA bir köye mi ait?
 *   • başka bir köy merkezinin claim halkası içindeyse (NPC ya da oyuncu), veya
 *   • başka bir oyuncunun kurulu tarlası oradaysa.
 * NPC'ler yalnızca kendi ring1+ring2'sinde büyür, o yüzden onlar için halka yeterli.
 */
function hexOwnedByOther(wq, wr, selfUserId) {
  const here = { q: wq, r: wr };
  for (const n of WORLD.npcs.values()) {
    if (W.distanceBetween(here, n.slot) <= W.CLAIM_RADIUS) return true;
  }
  for (const [key, p] of WORLD.playerBySlot) {
    if (p.userId === selfUserId) continue;
    const slot = WORLD.slotByKey.get(key);
    if (slot && W.distanceBetween(here, slot) <= W.CLAIM_RADIUS) return true;
  }
  for (const [uid, sess] of userSessions) {
    if (uid === selfUserId) continue;
    // ÇOKLU KÖY: oyuncunun HER köyünün toprağı kontrol edilmeli
    for (const v of sess.villages.values()) {
      const bq = v.worldQ || 0, br = v.worldR || 0;
      for (const k of Object.keys(v.productionTiles)) {
        const [lq, lr] = k.split(',').map(Number);
        if (bq + lq === wq && br + lr === wr) return true;
      }
    }
  }
  return false;
}

/**
 * Tarla kurulabilir mi?
 * Sabit bir halka sınırı YOK — sahip olunan herhangi bir hex'in komşusuna yayılınır.
 * Sınırlar: tarla slotu limiti, dünya kenarı, başkasının toprağı ve komşuluk.
 * Uzaklaştıkça mesafe verimi düştüğü için yayılma kendiliğinden dengelenir.
 */
function canBuildProductionAt(village, slotKey, type, userId) {
  if (slotKey === '0,0') return false;
  if (village.productionTiles[slotKey]) return false;
  if (!VALID_PRODUCTION_TYPES.has(type)) return false;
  const parts = slotKey.split(',');
  if (parts.length !== 2 || parts.some(p => isNaN(Number(p)))) return false;
  const lq = Number(parts[0]), lr = Number(parts[1]);
  if (!Number.isInteger(lq) || !Number.isInteger(lr)) return false;
  if (Math.abs(lq) > 200 || Math.abs(lr) > 200) return false;

  const wq = (village.worldQ || 0) + lq, wr = (village.worldR || 0) + lr;
  if (W.hexDistance(wq, wr) > W.WORLD_RADIUS) return false;             // dünya kenarı
  if (hexOwnedByOther(wq, wr, userId)) return false;                    // başkasının toprağı
  if (Object.keys(village.productionTiles).length >= getMaxProductionSlots(village)) return false;
  return getNeighbors(slotKey).some(n => n === '0,0' || village.productionTiles[n]);
}

/**
 * SABİT TANIMLAR — bağlantı başına BİR kez gönderilir.
 *
 * Birim/ekipman tanımları, temel savaş istatistikleri ve tick aralıkları
 * oyun boyunca değişmiyor; her tick'te yeniden yollamak boşuna trafik.
 * İstemci gelen paketi öncekinin üzerine birleştirdiği için eksik alanlar
 * sorun değil.
 */
const STATIC_PAYLOAD_KEYS = [
  'unitDefs', 'baseStats', 'unitsByBuilding',
  'equipmentDefs', 'equipmentByBuilding', 'tickMsRange',
  'festivalDefs',
];

function buildPayload(village, tickMs, opts = {}) {
  // opts.session verilirse çoklu köy alanları da eklenir (aşağıda)
  const productionPerHour = { odun:0, kil:0, tas:0, demir:0, tahil:0 };
  Object.entries(village.productionTiles).forEach(([slotKey, b]) => {
    if (b.workers > 0 && b.level >= 1) {
      const def = BUILDING_DEFS[b.type];
      if (def) {
        const mult = getSlotTotalMultiplier(slotKey, b.type, village);
        productionPerHour[b.type] = (productionPerHour[b.type] || 0) + b.workers * def.baseProductionPerWorker * mult;
      }
    }
  });

  const processingRates = {};
  Object.values(village.villageBuildings).forEach(b => {
    const def = VILLAGE_DEFS[b.type];
    if (def?.processes && b.level > 0) {
      const { input, inputPerHour, output, outputPerHour } = def.processes;
      const w = b.workers || 0;
      processingRates[output] = { input, inputPerHour: inputPerHour * w, outputPerHour: outputPerHour * w, workers: w, maxWorkers: b.level * (def.workersPerLevel || 3) };
    }
  });

  const depotCapacities = { odun:300, kil:300, tas:300, demir:300, tahil:300, kereste:200, tugla:200, yontmaTas:200, demirKulce:200 };
  let granaryCapacity = 150;
  Object.values(village.villageBuildings).forEach(b => {
    const def = VILLAGE_DEFS[b.type];
    if (!def?.stores || (b.building && b.level === 0)) return;
    const cap = def.baseCapacity + Math.max(0, b.level - 1) * def.capacityPerLevel;
    if (b.type === 'granary') granaryCapacity += cap;
    else def.stores.forEach(res => { depotCapacities[res] = (depotCapacities[res] || 0) + cap; });
  });

  const consumption = getConsumptionRates(village);
  const now = village.clockMs;          // kalan süreler sanal saate göre
  // Hız çarpanı: 1000 ms tick = 1×. Kalan süreler oyuncunun hızına göre yazılır.
  const speed = WORLD.speed;

  const equipmentQueues = Object.fromEntries(
    Object.entries(village.equipmentQueues || {}).map(([bt, q]) => [bt, q.map(o => ({
      id: o.id, type: o.type, remaining: o.remaining, total: o.total,
      waiting: !!o.waiting, waitingReason: o.waitingReason || null,
      workersAtStart: o.workersAtStart || null,
      timeLeft: o.endTime ? GT.clockToRealSeconds(o.endTime - now, speed) : null
    }))])
  );

  const unitQueues = Object.fromEntries(
    Object.entries(village.unitQueues || {}).map(([bt, q]) => [bt, (q || []).map(o => ({
      id: o.id, type: o.type, remaining: o.remaining, total: o.total,
      waiting: !!o.waiting, waitingReason: o.waitingReason || null,
      workersAtStart: o.workersAtStart || null,
      timeLeft: o.endTime ? GT.clockToRealSeconds(o.endTime - now, speed) : null
    }))])
  );

  const equipmentCaps = {
    kilic: getEquipmentCap(village,'kilic'), mizrak: getEquipmentCap(village,'mizrak'),
    kalkan: getEquipmentCap(village,'kalkan'), zirh: getEquipmentCap(village,'zirh'), at: getEquipmentCap(village,'at')
  };
  // Kılıç/mızrak/kalkan/zırh ortak havuzu — client tek bar olarak gösterir
  const equipmentPool = getEquipmentPool(village);

  // Devam eden inşaat/yükseltmeler — client sağ rayda liste olarak gösterir
  const buildQueue = [];
  Object.entries(village.villageBuildings).forEach(([slotKey, b]) => {
    if (!b.building) return;
    const isNew = b.level === 0;
    buildQueue.push({
      area: 'village', slotKey, type: b.type,
      name: VILLAGE_DEFS[b.type]?.name || b.type,
      kind: isNew ? 'build' : 'upgrade',
      fromLevel: b.level, toLevel: b.level + 1,
      workers: b.buildWorkers || 0,
      timeLeft: GT.clockToRealSeconds(b.buildEndTime - now, speed),
      totalSeconds: GT.clockToRealSeconds(
        GT.minutesToClock(getVillageBuildMinutes(b.type, b.level + 1, b.buildWorkers || 1)), speed),
      refund: isNew ? (VILLAGE_DEFS[b.type]?.cost || {}) : (getScaledUpgradeCost(b.type, b.level) || {}),
    });
  });
  Object.entries(village.productionTiles).forEach(([slotKey, b]) => {
    if (!b.upgrading) return;
    const isNew = b.level === 0;
    const def = BUILDING_DEFS[b.type];
    buildQueue.push({
      area: 'production', slotKey, type: b.type,
      name: def?.name || b.type,
      kind: isNew ? 'build' : 'upgrade',
      fromLevel: b.level, toLevel: b.level + 1,
      workers: b.upgradeWorkersAssigned || 0,
      timeLeft: GT.clockToRealSeconds(b.upgradeEndTime - now, speed),
      totalSeconds: GT.clockToRealSeconds(
        GT.minutesToClock(getUpgradeSeconds(b.type, b.level, b.upgradeWorkersAssigned || 1)), speed),
      refund: def?.levels?.[b.level]?.cost || {},
    });
  });
  buildQueue.sort((a, b) => a.timeLeft - b.timeLeft);

  const payload = {
    // TEK HARİTA: köyün dünya merkezi — client tarla bonuslarını buna göre hesaplar
    world: {
      q: village.worldQ || 0,
      r: village.worldR || 0,
      radius: W.WORLD_RADIUS,
      claimRadius: W.CLAIM_RADIUS,
      name: WORLD.playerBySlot.get(`${village.worldQ || 0},${village.worldR || 0}`)?.name
        || WORLD.slotByKey.get(`${village.worldQ || 0},${village.worldR || 0}`)?.name
        || 'Köyün',
    },
    population: village.population, maxPopulation: village.maxPopulation, freeWorkers: village.freeWorkers,
    // Ev tavanı yalnız sivilleri sınırlar; arayüz "siviller / tavan" gösterir
    civilians: civilianCount(village),
    // Yuvarlama SADECE burada: motor içinde kesirli kalır, yoksa 1× ölçekte
    // tick başına düşen küçük artışlar yuvarlanarak yok oluyor.
    resources: Object.fromEntries(Object.entries(village.resources)
      .map(([k, n]) => [k, Math.round((n || 0) * 10) / 10])),
    equipment: { ...(village.equipment || {}) },
    equipmentCaps, equipmentPool, buildQueue, equipmentQueues, equipmentByBuilding: EQUIPMENT_BY_BUILDING, equipmentDefs: EQUIPMENT_DEFS,
    army: { ...(village.army || {}) }, unitQueues, unitDefs: TRAINABLE_UNITS,
    unitsByBuilding: UNITS_BY_BUILDING, baseStats: BASE_STATS,
    // SEFERLER — timeLeft gerçek zamana göre (köy saatine değil)
    marches: (village.marches || []).map(m => ({
      id: m.id, mode: m.mode, phase: m.phase,
      toKey: m.toKey, toName: m.toName, fromName: m.fromName,
      units: { ...m.units }, distance: m.distance,
      loot: m.loot ? { ...m.loot } : null,
      legSeconds: m.legSeconds,
      timeLeft: GT.clockToRealSeconds(
        GT.hoursToClock(Math.max(0, m.remainingHours ?? 0)), speed),
    })),
    incoming: incomingMarchesFor(`${village.worldQ || 0},${village.worldR || 0}`),
    reports: (village.reports || []).slice(0, 25),
    intel: village.intel || {},
    marchInfo: {
      // İstemci yürüyüş süresini bunlarla hesaplar: hız = saatte hex,
      // bir oyun saati de hourSeconds gerçek saniye sürer.
      hourSeconds: GT.HOUR_SECONDS,
      minMarchMinutes: ARMY.MIN_MARCH_MINUTES,
      raidLootShare: ARMY.RAID_LOOT_SHARE,
      scoutUnits: [...ARMY.SCOUT_UNITS],
      maxMarches: MAX_MARCHES_PER_TOWN,
      protected: !village.hasAttacked && ARMY.totalUnits(village.army) < PROTECT_MIN_ARMY,
      protectMinArmy: PROTECT_MIN_ARMY,
    },
    productionPerHour, depotCapacities, granaryCapacity, processingRates,
    populationGrowthRate: village.population < village.maxPopulation ? 1 : 0,
    // Gerçek artış hızı — arayüz "+X/sa" ve "+1 nüfus için kalan süre" gösteriyor
    populationPerHour: popPerGameHour(village.villageBuildings['0,0']?.level),

    /**
     * KÜLTÜR PUANI ve genişleme durumu. `culture` tek nesnede geliyor:
     * mevcut puan, günlük üretim, sıradaki eşik, neyin engellediği.
     */
    /**
     * KÜLTÜR PUANI oyuncuya ait: bütün köylerin katkısı toplanır. Köy
     * nesnesinde her köy kendi payını biriktiriyor (kalıcılık ve merkez
     * taşınması bu şekilde sorunsuz).
     */
    culturePoints: Math.floor(opts.culturePoints ?? (village.culturePoints || 0)),
    culture: opts.culture || {
      ...CULTURE.expansionStatus([village], village.culturePoints || 0, VILLAGE_DEFS),
      points: Math.floor(village.culturePoints || 0),
    },
    // ÇOKLU KÖY: değiştirici için hafif liste + hangi köyün açık olduğu
    villages: opts.villages || null,
    activeSlot: opts.activeSlot || null,
    capitalSlot: opts.capitalSlot || null,
    /**
     * Oyuncu çapında TEK olan binalar hangi köyde? (`{ saray: '0,0' }`)
     * Arayüz bunu bilmezse "kur" düğmesini açık gösterip sunucunun sessizce
     * reddetmesine yol açıyor — saray tam bunu yapıyordu.
     */
    uniqueOwners: opts.uniqueOwners || null,
    isCapital: village.isCapital !== false,
    festival: village.festival
      ? {
        kind: village.festival.kind,
        label: CULTURE.FESTIVALS[village.festival.kind]?.label || village.festival.kind,
        timeLeft: GT.clockToRealSeconds(
          Math.max(0, village.festival.endTime - village.clockMs), WORLD.speed),
        cpAtStart: village.festival.cpAtStart,
      }
      : null,
    festivalDefs: CULTURE.FESTIVALS,
    isStarving: !!village.isStarving, starveCounter: village.starveCounter || 0,
    consumption, tickMs, tickMsRange: { min: MIN_TICK_MS, max: MAX_TICK_MS, default: DEFAULT_TICK_MS },
    // İstemci kaynakları iki yayın ARASINDA kendisi ilerletiyor; bunun için
    // dünya hızını bilmesi gerekiyor (bkz. client/src/flows.js extrapolate).
    worldSpeed: WORLD.speed,
    villageBuildings: Object.fromEntries(
      Object.entries(village.villageBuildings).map(([k, b]) => [k, {
        ...b,
        buildTimeLeft: b.building ? GT.clockToRealSeconds(b.buildEndTime - now, speed) : null,
        upgradeCost: getScaledUpgradeCost(b.type, b.level)
      }])
    ),
    towerSlots: [...village.TOWER_SLOTS],
    wallSlots: WALL_SLOT_NAMES,
    productionRing1: [...village.PRODUCTION_RING_1],
    maxProductionSlots: getMaxProductionSlots(village),
    productionTiles: Object.fromEntries(
      Object.entries(village.productionTiles).map(([k, b]) => {
        const def  = BUILDING_DEFS[b.type];
        return [k, {
          ...b,
          ring: hexDistanceFromCenter(k),
          efficiency: getSlotTotalMultiplier(k, b.type, village),
          maxWorkers: def?.levels[b.level - 1]?.workers || 1,
          upgradeCost: def?.levels[b.level]?.cost || null,
          upgradeTimeLeft: b.upgrading ? GT.clockToRealSeconds(b.upgradeEndTime - now, speed) : null
        }];
      })
    )
  };

  // Sabit tanımlar yalnız istendiğinde; raporlar yalnız değiştiğinde
  if (!opts.statics) for (const k of STATIC_PAYLOAD_KEYS) delete payload[k];
  if (!opts.reports) delete payload.reports;
  return payload;
}

/**
 * YAPISAL PARMAK İZİ — köyde kaynak dışında bir şey değişti mi?
 *
 * Sunucu eskiden her tick'te (saniyede bir, hızlı ölçekte 100 ms'de bir) köyün
 * TAMAMINI yolluyordu: oyuncu başına ~10 KB/s, 100 oyuncuda saatte 3.6 GB.
 * Oysa tick'ten tick'e değişen tek şey genelde kaynak miktarı ve istemci onu
 * zaten saatlik oranlardan kendisi hesaplayabiliyor. Bu yüzden yayın artık
 * yapısal bir değişiklikte ya da FULL_SYNC_MS'lik kalp atışında yapılıyor.
 */
const FULL_SYNC_MS = 30000;

function structFingerprint(v) {
  const q = v.unitQueues || {}, eq = v.equipmentQueues || {};
  let s = `${v.population}|${v.maxPopulation}|${v.freeWorkers}|${v.isStarving ? 1 : 0}`
    + `|${v.festival ? v.festival.kind : '-'}`
    + `|${v.isCapital ? 'C' : '-'}`
    + `|${(v.marches || []).length}|${(v.reports || []).length}|${v.tickMs || 0}`
    + `|${q.kisla?.length || 0},${q.ahir?.length || 0},${q.atolye?.length || 0}`
    + `|${eq.silahci?.length || 0},${eq.zirh?.length || 0},${eq.ahir?.length || 0}`;
  for (const k in v.villageBuildings) {
    const b = v.villageBuildings[k];
    s += `|${k}:${b.level}:${b.workers || 0}:${b.building ? 1 : 0}`;
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
  const fp = structFingerprint(v);
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
    reports: statics || reportsChanged,
    culturePoints: cpTotal,
    culture,
    villages: villageList(session),
    activeSlot: session.activeSlot,
    capitalSlot: session.capitalSlot,
    uniqueOwners: uniqueOwnersOf(session),
  }));
}

/**
 * TEK KÖYÜ ilerlet. Çoklu köyde oyuncunun HER köyü için çalışır — yalnız
 * aktif köy değil, yoksa arkadaki köyler donar.
 *
 * `userId` sadece log için; köyün kendisi hangi oyuncuya ait olduğunu
 * bilmiyor.
 */
function advanceVillage(village, gameHours, userId) {
  processTick(village, gameHours);

  const now = village.clockMs;
  Object.entries(village.villageBuildings).forEach(([, b]) => {
    if (b.building && now >= b.buildEndTime) {
      b.level++;
      village.freeWorkers += b.buildWorkers;
      delete b.building; delete b.buildEndTime; delete b.buildWorkers;
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
    advanceVillage(village, gameHours, userId);
    session.dirtySlots.add(slotKey);
  }

  emitVillage(session);
}

// ═══════════════════════════════════════════════════════════════════
//  DÜNYA — tek ortak harita, NPC köyleri gerçek motorla yaşar
// ═══════════════════════════════════════════════════════════════════
const WORLD = {
  slots: [],                 // tüm köy slotları (deterministik üretilir)
  slotByKey: new Map(),
  npcs: new Map(),           // slotKey -> { slot, village }
  playerBySlot: new Map(),   // slotKey -> { userId, email, name }
  slotByUser: new Map(),     // userId  -> MERKEZ (ya da ilk) slotKey
  slotsByUser: new Map(),    // userId  -> Set<slotKey>  (çoklu köy)
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

  // Oyuncu konumları
  try {
    const players = await loadPlayerSlots();
    players.forEach(p => {
      // Harita yeniden üretildiyse eski slot anahtarı geçersiz olabilir → yeniden ata
      if (!WORLD.slotByKey.has(p.slotKey)) {
        console.warn(`[WORLD] ${p.email}: eski slot ${p.slotKey} artık yok, yeniden atanacak`);
        return;
      }
      WORLD.playerBySlot.set(p.slotKey, { userId: p.userId, email: p.email, name: p.name });
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
    for (let t = 0; t < steps; t++) {
      stepVillage(n.village, GT.CATCHUP_HOURS_PER_STEP);
      if (t % NPC_AI_EVERY_HOURS === 0) runNpcAi(n.village, n.slot);
    }
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

// NPC yaşam döngüsü
let npcLastTick = Date.now();
setInterval(() => {
  const nowReal = Date.now();
  const hours = GT.realMsToGameHours(Math.min(5000, nowReal - npcLastTick), WORLD.speed);
  npcLastTick = nowReal;
  WORLD.npcTick++;
  const runAi = WORLD.npcTick % NPC_AI_EVERY === 0;
  for (const n of WORLD.npcs.values()) {
    stepVillage(n.village, hours);
    if (runAi) {
      runNpcAi(n.village, n.slot);
      maybeNpcRaid(n);
      // Yapay zekâ turu = yapısal değişiklik olabilir + kaydın bayatlamasına
      // üst sınır (NPC_AI_EVERY_HOURS oyun saati). Kaynak artışı için kayıt
      // gerekmiyor, telafi onu hesaplıyor.
      markNpcDirty(n.slot.key);
    }
  }
  processMarches(hours);
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

// ═══════════════════════════════════════════════════════════════════
//  SEFERLER — ordu gönderme, varış, çarpışma, dönüş
//
//  Zaman: seferler Date.now() ile ilerler, köy saatiyle DEĞİL (gerekçe
//  game/army.js başında). Bu yüzden set_speed sefer süresini kısaltmaz.
// ═══════════════════════════════════════════════════════════════════
const MAX_MARCHES_PER_TOWN  = 8;     // aynı anda yolda olabilecek sefer sayısı

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
 * BAŞLANGIÇ KORUMASI: oyuncu askerî sisteme girene kadar NPC saldırmaz.
 * Ölçüt ordusunun 20'ye ulaşması VEYA ilk seferini göndermesi — ikisi de
 * "oyuncu artık savaşın içinde" demek. Aksi hâlde 5. kademe bir komşu,
 * oyuncu tek asker eğitmeden köyü boşaltabilirdi.
 */
const PROTECT_MIN_ARMY = 20;

let lastNpcRaidAt = 0;

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

/**
 * Sefer taşıyan tüm köyler — oyuncu oturumları + NPC'ler.
 * Ad NOTU: 'allVillages' denemez — bootServer içinde aynı adlı bir yerel
 * değişken var (DB'den yüklenen köy listesi) ve gölgeleme karışıklık yaratır.
 */
function* marchingVillages() {
  // ÇOKLU KÖY: her köy kendi seferlerini taşıyor, oyuncunun hepsi gezilir
  for (const [userId, session] of userSessions) {
    for (const [slotKey, village] of session.villages) {
      yield {
        village, kind: 'player', userId, slotKey,
        dirty: () => { session.dirtySlots.add(slotKey); },
      };
    }
  }
  for (const n of WORLD.npcs.values()) {
    yield {
      village: n.village, kind: 'npc', userId: null, slotKey: n.slot.key,
      dirty: () => { markNpcDirty(n.slot.key); },
    };
  }
}

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

/** Eve varışta depoya ne sığar — fazlası çöp olur (bkz. depositLoot) */
function lootRoom(village) {
  const { caps, granaryCap } = getStorageCaps(village);
  const foodHeld = (village.resources.un || 0) + (village.resources.ekmek || 0);
  return { caps, foodRoom: Math.max(0, granaryCap - foodHeld) };
}

/**
 * Seferleri `hours` oyun saati ilerlet ve varanları çöz.
 * NPC döngüsünden çağrılır — dünya hızıyla aynı adımı kullanır.
 */
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
        const tgt = villageAtSlot(m.toKey);
        // Hedef oyuncu çevrimdışıysa köyü bellekte yok — sefer BEKLETİLİR,
        // oyuncu girdiğinde çözülür. Boş savunmaya vurmak haksız olurdu.
        if (tgt && tgt.offline) { m.remainingHours = 0; continue; }   // beklet
        ARMY.resolveArrival(m, v, tgt?.village || null, { targetName: tgt?.name });
        entry.dirty();
        if (tgt?.userId) markUserDirty(tgt.userId, m.toKey);
        else if (tgt?.kind === 'npc') markNpcDirty(m.toKey);
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

/** Bir slota gelmekte olan seferler — oyuncu uyarısı için */
function incomingMarchesFor(slotKey) {
  const out = [];
  if (!slotKey) return out;
  for (const entry of marchingVillages()) {
    for (const m of entry.village.marches || []) {
      if (m.phase !== 'outbound' || m.toKey !== slotKey) continue;
      out.push({
        key: `${entry.slotKey}#${m.id}`,
        mode: m.mode,
        fromKey: m.fromKey, fromName: m.fromName,
        // Tam birim dökümü verilmiyor; büyüklük 10'a yuvarlanmış toplam olarak
        // veriliyor ki oyuncu savunma kararı verebilsin (ileride gözcü kulesi
        // bunu netleştirebilir).
        sizeApprox: Math.round(ARMY.totalUnits(m.units) / 10) * 10,
        timeLeft: GT.clockToRealSeconds(
          GT.hoursToClock(Math.max(0, m.remainingHours ?? 0)), WORLD.speed),
      });
    }
  }
  return out.sort((a, b) => a.timeLeft - b.timeLeft);
}

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
/**
 * Bir köyün sıralamaya giren bütün ölçüleri. Nüfus/ordu/toprak anlık
 * durumdan, savaş kalemleri kalıcı sayaçlardan (village.stats) gelir.
 */
function villageMetrics(village) {
  const st = village.stats || {};
  const army = ARMY.totalUnits(village.army);
  const buildLevels = Object.values(village.villageBuildings || {})
    .reduce((sum, b) => sum + (b.level || 0), 0)
    + Object.values(village.productionTiles || {})
      .reduce((sum, b) => sum + (b.level || 0), 0);
  return {
    population: village.population || 0,
    army,
    attack:  Math.round(ARMY.armyAttack(village.army)),
    defense: Math.round(ARMY.armyDefense(village.army)),
    land: Object.keys(village.productionTiles || {}).length,
    score: buildLevels * 10 + (village.population || 0) + army * 3,
    killsOffense: st.killsOffense || 0,
    killsDefense: st.killsDefense || 0,
    lootTotal: st.lootTotal || 0,
    attacksWon: st.attacksWon || 0,
    defensesWon: st.defensesWon || 0,
    attacksSent: st.attacksSent || 0,
    defensesTotal: st.defensesTotal || 0,
  };
}

const STAT_BOARDS = [
  { key: 'score',        label: 'En güçlü köy',      icon: 'bonus',  unit: 'puan',  desc: 'Bina seviyeleri + nüfus + ordu' },
  { key: 'population',   label: 'En çok nüfus',      icon: 'nufus',  unit: 'kişi',  desc: 'Köyde yaşayan toplam kişi' },
  { key: 'killsOffense', label: 'En iyi saldıran',   icon: 'kilic',  unit: 'asker', desc: 'Saldırılarında öldürdüğü asker' },
  { key: 'killsDefense', label: 'En iyi savunan',    icon: 'kalkan', unit: 'asker', desc: 'Köyünü savunurken öldürdüğü asker' },
  { key: 'lootTotal',    label: 'En iyi yağmacı',    icon: 'depo',   unit: 'kaynak', desc: 'Seferlerden getirdiği toplam ganimet' },
  { key: 'army',         label: 'En büyük ordu',     icon: 'ordu',   unit: 'asker', desc: 'Köyde bekleyen asker sayısı' },
  { key: 'attack',       label: 'En yüksek saldırı', icon: 'savas',  unit: 'güç',   desc: 'Ordusunun toplam saldırı gücü' },
  { key: 'defense',      label: 'En yüksek savunma', icon: 'sur',    unit: 'güç',   desc: 'Ordusunun toplam savunma gücü' },
  { key: 'land',         label: 'En çok toprak',     icon: 'harita', unit: 'tarla', desc: 'Sahip olduğu üretim tarlası' },
];

const STATS_TOP_N = 10;

/** Bütün köyleri tara, her ölçü için ilk N + oyuncunun kendi sırası */
function buildStats(forUserId) {
  const rows = [];
  for (const n of WORLD.npcs.values()) {
    rows.push({
      key: n.slot.key, name: n.slot.name, kind: 'npc',
      tier: n.slot.tier, tierLabel: n.slot.tierLabel,
      m: villageMetrics(n.village),
    });
  }
  for (const [slotKey, p] of WORLD.playerBySlot) {
    const session = userSessions.get(p.userId);
    if (!session) continue;             // çevrimdışı oyuncunun köyü bellekte yok
    // ÇOKLU KÖY: satır o SLOTUN köyünden, aktif köyden değil
    const v = session.villages.get(slotKey);
    if (!v) continue;
    rows.push({
      key: slotKey, name: p.name, kind: p.userId === forUserId ? 'self' : 'player',
      tier: WORLD.slotByKey.get(slotKey)?.tier ?? null, tierLabel: 'Oyuncu',
      m: villageMetrics(v),
    });
  }

  const boards = STAT_BOARDS.map(b => {
    const sorted = [...rows].sort((x, y) => y.m[b.key] - x.m[b.key]);
    const top = sorted.slice(0, STATS_TOP_N).map((r, i) => ({
      rank: i + 1, key: r.key, name: r.name, kind: r.kind,
      tierLabel: r.tierLabel, value: r.m[b.key],
    }));
    // Oyuncu ilk N'de değilse kendi satırını ayrıca ekle
    const myIdx = sorted.findIndex(r => r.kind === 'self');
    const me = myIdx >= 0 ? {
      rank: myIdx + 1, key: sorted[myIdx].key, name: sorted[myIdx].name,
      kind: 'self', tierLabel: 'Oyuncu', value: sorted[myIdx].m[b.key],
    } : null;
    return { ...b, rows: top, me, inTop: myIdx >= 0 && myIdx < STATS_TOP_N };
  });

  return { updatedAt: Date.now(), villageCount: rows.length, boards };
}

/** Oyuncuya harita üzerinde yer ver (yoksa) */
async function ensurePlayerSlot(userId, email) {
  if (WORLD.slotByUser.has(userId)) return WORLD.slotByUser.get(userId);
  const taken = new Set([...WORLD.npcs.keys(), ...WORLD.playerBySlot.keys()]);
  const slot = W.findSpawnSlot(WORLD.slots, taken);
  if (!slot) return null;
  const name = (email || 'oyuncu').split('@')[0];
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
  const tileMap = (village) => Object.fromEntries(
    Object.entries(village.productionTiles || {})
      .filter(([, b]) => b.level >= 1)
      .map(([k, b]) => [k, [b.type, b.level]])
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
      tiles: (dist != null && dist <= TILE_RADIUS) ? tileMap(n.village) : null,
    });
  }
  for (const [key, p] of WORLD.playerBySlot) {
    const slot = WORLD.slotByKey.get(key);
    if (!slot) continue;
    const session = userSessions.get(p.userId);
    const v = session?.village;
    villages.push({
      key, q: slot.q, r: slot.r,
      name: p.name || slot.name, tier: slot.tier, tierLabel: 'Oyuncu',
      kind: p.userId === forUserId ? 'self' : 'player',
      population: v?.population ?? null,
      army: v ? Object.values(v.army || {}).reduce((a, b) => a + b, 0) : null,
      score: null, surLevel: 0, hendekLevel: 0,
      distance: me ? W.distanceBetween(me, slot) : null,
      tiles: v && me && W.distanceBetween(me, slot) <= TILE_RADIUS ? tileMap(v) : null,
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
      runTickForUser(userId, session);
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

  // TEK HARİTA: köy oluşturulmadan önce dünya slotunu al
  const slotKey = await ensurePlayerSlot(userId, userEmail);
  const slot = slotKey ? WORLD.slotByKey.get(slotKey) : null;

  socket.join(userRoom(userId));

  let session = userSessions.get(userId);
  if (session) {
    session.socketId = socket.id;
    session.userId = userId;
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
        const sl = WORLD.slotByKey.get(row.slotKey);
        if (!sl) {
          console.warn(`[DB LOAD] userId=${userId} slot ${row.slotKey} dünyada yok, atlandı`);
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
    userSessions.set(userId, session);
    if (villages.size > 1) {
      console.log(`[CONNECT] userId=${userId} ${villages.size} köy yüklendi`
        + ` (merkez ${capitalSlot})`);
    }
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
  socket.on('set_capital', ({ slotKey } = {}) => {
    const hedef = slotKey || session.activeSlot;
    const village = session.villages.get(hedef);
    if (!village) return;
    if (session.capitalSlot === hedef) return;
    const saray = Object.values(village.villageBuildings || {})
      .find(b => b.type === 'saray' && b.level >= 1 && !b.building);
    if (!saray) {
      socket.emit('build_refused', { slotKey: hedef, buildingType: 'saray',
        reason: 'Merkez yapmak için bu köyde tamamlanmış bir saray gerekiyor.' });
      return;
    }
    session.capitalSlot = hedef;
    for (const [k, v2] of session.villages) v2.isCapital = (k === hedef);
    for (const k of session.villages.keys()) session.dirtySlots.add(k);
    setCapital(userId, hedef).catch(err => console.error('[MERKEZ] kayıt:', err.message));
    emitVillage(session, { force: true, statics: true });
    console.log(`[MERKEZ] userId=${userId} → ${hedef}`);
  });

  socket.on('assign_production_workers', ({ slotKey, workers }) => {
    const b = v().productionTiles[slotKey];
    // Yükseltme sırasında da işçi atanabilir — bina çalışmaya devam ediyor.
    // Yalnızca hiç kurulmamış tile'a (level 0) işçi atanamaz.
    if (!b || b.level < 1) return;
    const def = BUILDING_DEFS[b.type];
    if (!def) return;
    const maxW = def.levels[b.level - 1]?.workers || 1;
    const newW = Math.max(0, Math.min(maxW, workers));
    const diff = newW - (b.workers || 0);
    if (diff > v().freeWorkers) {
      return reject(`havuzda ${v().freeWorkers} işçi var, ${diff} isteniyor`);
    }
    v().freeWorkers -= diff; b.workers = newW;
    dirty(); emit();
  });

  socket.on('upgrade_production', ({ slotKey, workers }) => {
    const b = v().productionTiles[slotKey];
    if (!b || b.upgrading || workers <= 0 || workers > v().freeWorkers) return;
    const def = BUILDING_DEFS[b.type];
    if (!def || b.level >= def.levels.length) return;
    const cost = def.levels[b.level]?.cost;
    if (!cost) return;
    for (const [res, amt] of Object.entries(cost)) { if ((v().resources[res] || 0) < amt) return; }
    for (const [res, amt] of Object.entries(cost)) { v().resources[res] -= amt; }
    v().freeWorkers -= workers;
    b.upgrading = true; b.upgradeEndTime = v().clockMs + GT.minutesToClock(getUpgradeSeconds(b.type, b.level, workers)); b.upgradeWorkersAssigned = workers;
    dirty(); emit();
  });

  socket.on('build_production', ({ slotKey, type, workers }) => {
    if (!canBuildProductionAt(v(), slotKey, type, userId) || !workers || workers < 1 || workers > v().freeWorkers) return;
    const def = BUILDING_DEFS[type];
    const cost = def.levels[0]?.cost || {};
    for (const [res, amt] of Object.entries(cost)) { if ((v().resources[res] || 0) < amt) return; }
    for (const [res, amt] of Object.entries(cost)) { v().resources[res] -= amt; }
    v().freeWorkers -= workers;
    v().productionTiles[slotKey] = { type, level: 0, workers: 0, upgrading: true, upgradeEndTime: v().clockMs + GT.minutesToClock((def.levels[0]?.sureSaat || 5) / workers), upgradeWorkersAssigned: workers };
    dirty(); emit();
  });

  socket.on('demolish_production', ({ slotKey }) => {
    const b = v().productionTiles[slotKey];
    if (!b) return;
    if (b.upgrading && b.upgradeWorkersAssigned) v().freeWorkers += b.upgradeWorkersAssigned;
    if (b.workers) v().freeWorkers += b.workers;
    delete v().productionTiles[slotKey];
    dirty(); emit();
  });

  socket.on('build_village', ({ slotKey, buildingType, workers }) => {
    if (!canBuildAt(v(), slotKey, buildingType, session.villages)
      || !workers || workers < 1 || workers > v().freeWorkers) {
      // Sessiz red oyuncuyu koru bırakıyordu ("saray kuramıyorum, sebep yok").
      socket.emit('build_refused', { slotKey, buildingType,
        reason: buildRefusalReason(v(), slotKey, buildingType, session.villages, workers) });
      return;
    }
    const def = VILLAGE_DEFS[buildingType];
    const cost = def?.cost || {};
    for (const [res, amount] of Object.entries(cost)) { if ((v().resources[res] || 0) < amount) return; }
    for (const [res, amount] of Object.entries(cost)) { v().resources[res] -= amount; }
    v().freeWorkers -= workers;
    v().villageBuildings[slotKey] = { type: buildingType, level: 0, workers: 0, building: true, buildEndTime: v().clockMs + GT.minutesToClock(getVillageBuildMinutes(buildingType, 1, workers)), buildWorkers: workers };
    dirty(); emit();
  });

  socket.on('upgrade_village', ({ slotKey, workers }) => {
    const b = v().villageBuildings[slotKey];
    if (!b || b.building) return;
    const def = VILLAGE_DEFS[b.type];
    // Tavan: tanımda yoksa DEFAULT_MAX_LEVEL. Eski koşul `def.maxLevel &&`
    // ile başlıyordu, tanımsız olan 18 bina sınırsız yükseliyordu.
    if (!def || b.level >= maxLevelOf(b.type) || !workers || workers < 1 || workers > v().freeWorkers) return;
    const upgradeCost = getScaledUpgradeCost(b.type, b.level);
    if (upgradeCost) {
      for (const [res, amt] of Object.entries(upgradeCost)) { if ((v().resources[res] || 0) < amt) return; }
      for (const [res, amt] of Object.entries(upgradeCost)) { v().resources[res] -= amt; }
    }
    v().freeWorkers -= workers;
    b.building = true; b.buildEndTime = v().clockMs + GT.minutesToClock(getVillageBuildMinutes(b.type, b.level + 1, workers)); b.buildWorkers = workers;
    dirty(); emit();
  });

  socket.on('assign_village_workers', ({ slotKey, workers }) => {
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
    const def = VILLAGE_DEFS[b.type];
    if (!def || (!def.processes && !WORKER_ASSIGNABLE_MILITARY.has(b.type))) {
      return reject(`${b.type} personel almıyor (processes yok, atanabilir listede değil)`);
    }
    const maxW = b.level * (def.workersPerLevel || 3);
    const newW = Math.max(0, Math.min(maxW, workers));
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

  socket.on('demolish_village', ({ slotKey }) => {
    if (slotKey === '0,0') return;
    const b = v().villageBuildings[slotKey];
    if (b) {
      if (b.building && b.buildWorkers) v().freeWorkers += b.buildWorkers;
      if (b.workers) v().freeWorkers += b.workers;
    }
    delete v().villageBuildings[slotKey];
    dirty(); emit();
  });

  socket.on('queue_equipment', ({ buildingType, equipmentType, quantity }) => {
    const allowed = EQUIPMENT_BY_BUILDING[buildingType];
    if (!allowed?.includes(equipmentType)) return;
    const b = Object.values(v().villageBuildings).find(vb => vb.type === buildingType);
    if (!b || b.level < 1) return;
    const q = Math.max(1, Math.min(50, parseInt(quantity, 10) || 1));
    (v().equipmentQueues[buildingType] ||= []).push({ id: v().nextOrderId++, type: equipmentType, total: q, remaining: q, waiting: true, startTime: null, endTime: null });
    dirty(); emit();
  });

  socket.on('cancel_equipment_order', ({ buildingType, orderId }) => {
    const queue = v().equipmentQueues?.[buildingType];
    if (!queue) return;
    const idx = queue.findIndex(o => o.id === orderId);
    if (idx >= 0) { queue.splice(idx, 1); dirty(); emit(); }
  });

  socket.on('train_unit', ({ buildingType, unitType, quantity }) => {
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
    const q = Math.max(1, Math.min(50, parseInt(quantity, 10) || 1));
    (v().unitQueues[buildingType] ||= []).push({ id: v().nextUnitOrderId++, type: unitType, total: q, remaining: q, waiting: true, startTime: null, endTime: null, workerReserved: false });
    dirty(); emit();
  });

  socket.on('cancel_unit_order', ({ buildingType, orderId }) => {
    const queue = v().unitQueues?.[buildingType];
    if (!queue) return;
    const idx = queue.findIndex(o => o.id === orderId);
    if (idx < 0) return;
    const order = queue[idx];
    if (order.workerReserved && !order.waiting) {
      v().freeWorkers += 1;
      (UNIT_DEFS[order.type]?.equipment || []).forEach(eq => { v().equipment[eq] = (v().equipment[eq] || 0) + 1; });
    }
    queue.splice(idx, 1);
    dirty(); emit();
  });

  // ─── İnşaat / yükseltme iptali ─────────────────────────────────
  // İptalde harcanan kaynak TAM iade edilir, inşaat işçileri havuza döner.
  // İlk inşaat iptal edilirse bina/tile tamamen kaldırılır.

  socket.on('cancel_production_build', ({ slotKey }) => {
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

  socket.on('cancel_village_build', ({ slotKey }) => {
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

  socket.on('request_stats', () => {
    try {
      const t0 = Date.now();
      const snap = buildStats(userId);
      socket.emit('stats_snapshot', snap);
      console.log(`[İSTATİSTİK] ${userEmail} · ${snap.villageCount} köy · ${Date.now() - t0} ms`);
    }
    catch (err) {
      console.error('[STATS]', err.message);
      socket.emit('stats_snapshot', { boards: [], villageCount: 0, updatedAt: Date.now() });
    }
  });

  socket.on('set_speed', ({ tickMs: newMs }) => {
    session.tickMs = Math.max(MIN_TICK_MS, Math.min(MAX_TICK_MS, Number(newMs) || DEFAULT_TICK_MS));
    // Çubuk DÜNYA hızını ayarlar: ekonomi, NPC'ler ve seferler birlikte akar
    WORLD.speed = DEFAULT_TICK_MS / session.tickMs;
    console.log(`[HIZ] ${userEmail} → ${WORLD.speed.toFixed(2)}× `
      + `(1 oyun saati = ${(GT.HOUR_SECONDS / WORLD.speed).toFixed(0)} gerçek sn)`);
    emit();
  });

  // ── SEFER: ordu gönder ────────────────────────────────────────────
  socket.on('send_army', ({ targetKey, mode, units } = {}) => {
    const fail = (reason) => socket.emit('army_error', { reason });
    const village = v();
    // ÇOKLU KÖY: sefer AKTİF köyden çıkar, oyuncunun "ilk" köyünden değil
    const mySlot = session.activeSlot || WORLD.slotByUser.get(userId);
    if (!mySlot) return fail('konum_yok');
    if (targetKey === mySlot) return fail('kendi_koyun');
    if ((village.marches || []).length >= MAX_MARCHES_PER_TOWN) return fail('sefer_limiti');

    // FAZ 1: yalnız NPC köyleri hedef olabilir
    const tgt = WORLD.npcs.get(targetKey);
    if (!tgt) return fail(WORLD.playerBySlot.has(targetKey) ? 'oyuncu_hedefi_kapali' : 'gecersiz_hedef');

    const me = WORLD.slotByKey.get(mySlot);
    const dist = W.distanceBetween(me, tgt.slot);

    const res = ARMY.createMarch(village, {
      mode, units, distance: dist,
      fromKey: mySlot, fromName: WORLD.playerBySlot.get(mySlot)?.name || 'Köyün',
      toKey: targetKey, toName: tgt.slot.name, toKind: 'npc',
      ownerKind: 'player',
    });
    if (!res.ok) return fail(res.reason);

    // İlk sefer başlangıç korumasını kaldırır — oyuncu artık savaşın içinde
    village.hasAttacked = true;
    dirty(); emit();
    socket.emit('army_sent', {
      id: res.march.id, toName: tgt.slot.name, mode,
      seconds: res.march.legSeconds, distance: dist,
    });
    console.log(`[SEFER] ${userEmail} → ${tgt.slot.name} (${mode}, ${dist} hex, ${ARMY.totalUnits(res.march.units)} asker, ${res.march.legSeconds} sn)`);
  });

  socket.on('simulate_battle', (payload = {}) => {
    try {
      // `tag` aynen geri döner: aynı anda birden fazla ekran tahmin isteyebilir
      // (savaş simülatörü + saldırı ekranı), yanıtı kim istediyse o eşleştirsin.
      const { attacker = {}, defender = {}, surLevel = 0, hendekLevel = 0, kulePct = 0, mode = 'normal', tag = null } = payload;
      socket.emit('battle_result', { ok: true, tag, result: simulateBattle(attacker, defender, { surLevel, hendekLevel, kulePct, mode }) });
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

      const name = (userEmail || 'oyuncu').split('@')[0];
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
    for (let i = 0; i < offlineTicks; i++) stepVillage(village, GT.CATCHUP_HOURS_PER_STEP);
    if (offlineTicks > 0) telafiEdilen++;

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

bootServer().catch(err => {
  console.error('[BOOT FAIL]', err.message);
  process.exit(1);
});
