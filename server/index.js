const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');

const { createVillage, hydrateVillage } = require('./game/villageState');
const { processTick, getUpgradeSeconds, hexDistanceFromCenter, getProductionMultiplier, getSlotTotalMultiplier, getUnitTrainSeconds, getEquipmentCap, getEquipmentPool, getConsumptionRates, getStorageCaps } = require('./game/tick');
const { simulateBattle } = require('./game/combat');
const ARMY = require('./game/army');
const GT = require('./game/gameTime');
const { router: authRouter, verifyToken } = require('./auth');
const { initDB, loadVillage, saveVillage, loadAllVillages,
        loadNpcVillages, saveNpcVillages, loadPlayerSlots, setPlayerSlot } = require('./db');
const W = require('./game/world');
const { seedNpcVillage, runNpcAi, npcSummary, stepVillage } = require('./game/npcAi');

const WORKER_ASSIGNABLE_MILITARY = new Set(['silahci', 'zirh', 'ahir', 'kisla', 'atolye']);
const { PRODUCTION_DEFS: BUILDING_DEFS, VILLAGE_DEFS, EQUIPMENT_DEFS, EQUIPMENT_BY_BUILDING, UNIT_DEFS, BASE_STATS } = require('./data');

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
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Manuel CORS — tüm originlere izin ver
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(cors());
app.use(express.json());
app.use('/auth', authRouter);

// Per-user state: userId -> { village, tickMs, nextTickAt, socketId, dirty }
const userSessions = new Map();
const socketToUser  = new Map();

const DEFAULT_TICK_MS = 1000;
/** Aç değilken ve tavan altındayken saatte kaç kişi katılır */
const POP_PER_GAME_HOUR = 1;
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

function getScaledUpgradeCost(type, currentLevel) {
  const def = VILLAGE_DEFS[type];
  if (!def?.upgradeCostBase) return null;
  const mult = Math.pow(def.upgradeCostMultiplier || 1.5, currentLevel - 1);
  return Object.fromEntries(
    Object.entries(def.upgradeCostBase).map(([k, v]) => [k, Math.round(v * mult)])
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

function canBuildAt(village, slotKey, buildingType) {
  if (slotKey === '0,0') return false;
  if (village.villageBuildings[slotKey]) return false;
  const isTower = village.TOWER_SLOTS.has(slotKey);
  if (isTower && buildingType !== 'kule') return false;
  if (!isTower && buildingType === 'kule') return false;
  const def = VILLAGE_DEFS[buildingType];
  if (!def || buildingType === 'anaBina') return false;
  if (def.unique && Object.values(village.villageBuildings).some(b => b.type === buildingType)) return false;
  if (buildingType === 'kule' && Object.values(village.villageBuildings).filter(b => b.type === 'kule').length >= 4) return false;
  return true;
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
    const v = sess.village;
    const bq = v.worldQ || 0, br = v.worldR || 0;
    for (const k of Object.keys(v.productionTiles)) {
      const [lq, lr] = k.split(',').map(Number);
      if (bq + lq === wq && br + lr === wr) return true;
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

function buildPayload(village, tickMs) {
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

  return {
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
    isStarving: !!village.isStarving, starveCounter: village.starveCounter || 0,
    consumption, tickMs, tickMsRange: { min: MIN_TICK_MS, max: MAX_TICK_MS, default: DEFAULT_TICK_MS },
    villageBuildings: Object.fromEntries(
      Object.entries(village.villageBuildings).map(([k, b]) => [k, {
        ...b,
        buildTimeLeft: b.building ? GT.clockToRealSeconds(b.buildEndTime - now, speed) : null,
        upgradeCost: getScaledUpgradeCost(b.type, b.level)
      }])
    ),
    towerSlots: [...village.TOWER_SLOTS],
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
}

function runTickForUser(userId, session) {
  const { village, tickMs } = session;
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
  processTick(village, GT.realMsToGameHours(elapsed, speed));

  const now = village.clockMs;
  Object.entries(village.villageBuildings).forEach(([, b]) => {
    if (b.building && now >= b.buildEndTime) {
      b.level++;
      village.freeWorkers += b.buildWorkers;
      delete b.building; delete b.buildEndTime; delete b.buildWorkers;
    }
  });

  const evBuildings = Object.values(village.villageBuildings).filter(b => b.type === 'ev' && !(b.building && b.level === 0));
  village.maxPopulation = 50 + evBuildings.reduce((sum, b) => sum + 50 * b.level, 0);
  village.tickCount++;
  /**
   * NÜFUS: saat başına POP_PER_GAME_HOUR kişi (aç değilken ve tavanın altında).
   * Eskiden "her 10 tick'te 1" idi; tick artık 1/3600 oyun saati işlediği için
   * o kural saniyede bir nüfus demeye gelirdi.
   */
  village.popAccum = (village.popAccum || 0) + GT.HOURS_PER_TICK * POP_PER_GAME_HOUR;
  while (village.popAccum >= 1) {
    village.popAccum -= 1;
    if (village.isStarving || village.population >= village.maxPopulation) break;
    village.population++;
    village.freeWorkers++;
  }
  session.dirty = true;

  const sock = io.sockets.sockets.get(session.socketId);
  if (sock) sock.emit('village_update', buildPayload(village, tickMs));
}

// ═══════════════════════════════════════════════════════════════════
//  DÜNYA — tek ortak harita, NPC köyleri gerçek motorla yaşar
// ═══════════════════════════════════════════════════════════════════
const WORLD = {
  slots: [],                 // tüm köy slotları (deterministik üretilir)
  slotByKey: new Map(),
  npcs: new Map(),           // slotKey -> { slot, village }
  playerBySlot: new Map(),   // slotKey -> { userId, email, name }
  slotByUser: new Map(),     // userId  -> slotKey
  npcTick: 0,
  dirty: false,
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
      WORLD.slotByUser.set(p.userId, p.slotKey);
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
  const npcSlots = W.pickNpcSlots(WORLD.slots.filter(s => !taken.has(s.key)));

  let created = 0, restored = 0;
  for (const slot of npcSlots) {
    const rec = savedByKey.get(slot.key);
    if (rec) {
      WORLD.npcs.set(slot.key, { slot, village: hydrateVillage(rec.state) });
      restored++;
    } else {
      WORLD.npcs.set(slot.key, { slot, village: seedNpcVillage(slot) });
      created++;
    }
  }

  // Sunucu kapalıyken geçen süreyi telafi et — oyuncuyla AYNI tavan
  const offlineRealMs = Date.now() - (oldestNpcSave || Date.now());
  const npcHours = Math.min(MAX_CATCHUP_HOURS, offlineRealMs / 1000 / GT.HOUR_SECONDS);
  const npcSteps = Math.floor(npcHours / GT.CATCHUP_HOURS_PER_STEP);
  if (restored > 0 && npcSteps > 0) {
    for (let t = 0; t < npcSteps; t++) {
      for (const n of WORLD.npcs.values()) {
        stepVillage(n.village, GT.CATCHUP_HOURS_PER_STEP);
        if (t % NPC_AI_EVERY_HOURS === 0) runNpcAi(n.village, n.slot);
      }
    }
    console.log(`[WORLD] offline telafi: ${npcSteps} oyun saati`);
  }

  WORLD.dirty = created > 0;
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
    if (runAi) { runNpcAi(n.village, n.slot); maybeNpcRaid(n); }
  }
  processMarches(hours);
  WORLD.dirty = true;
}, NPC_TICK_MS);

// NPC'leri periyodik kaydet
setInterval(async () => {
  if (!WORLD.dirty) return;
  WORLD.dirty = false;
  try {
    await saveNpcVillages([...WORLD.npcs.values()].map(n => ({
      slotKey: n.slot.key, q: n.slot.q, r: n.slot.r,
      tier: n.slot.tier, name: n.slot.name, state: n.village,
    })));
  } catch (err) { console.error('[WORLD SAVE]', err.message); }
}, 60000);

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
    return {
      village: s?.village || null, name: p.name, kind: 'player',
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
  for (const [userId, session] of userSessions) {
    yield {
      village: session.village, kind: 'player', userId,
      slotKey: WORLD.slotByUser.get(userId) || null,
      dirty: () => { session.dirty = true; },
    };
  }
  for (const n of WORLD.npcs.values()) {
    yield {
      village: n.village, kind: 'npc', userId: null, slotKey: n.slot.key,
      dirty: () => { WORLD.dirty = true; },
    };
  }
}

function markUserDirty(userId) {
  const s = userSessions.get(userId);
  if (s) s.dirty = true;
}

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
        if (tgt?.userId) markUserDirty(tgt.userId);
        else if (tgt?.kind === 'npc') WORLD.dirty = true;
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
  WORLD.dirty = true;
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
    rows.push({
      key: slotKey, name: p.name, kind: p.userId === forUserId ? 'self' : 'player',
      tier: WORLD.slotByKey.get(slotKey)?.tier ?? null, tierLabel: 'Oyuncu',
      m: villageMetrics(session.village),
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
  try { await setPlayerSlot(userId, slot.key, name); }
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
function worldSnapshot(forUserId) {
  const mySlot = WORLD.slotByUser.get(forUserId) || null;
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

// Periyodik DB kaydet (30sn)
setInterval(async () => {
  for (const [userId, session] of userSessions) {
    if (session.dirty) {
      try { await saveVillage(userId, session.village); session.dirty = false; }
      catch (err) { console.error(`[DB SAVE] userId=${userId}`, err.message); }
    }
  }
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

  let session = userSessions.get(userId);
  if (session) {
    session.socketId = socket.id;
  } else {
    let village;
    try {
      const saved = await loadVillage(userId);
      village = saved ? hydrateVillage(saved) : createVillage(slot?.q || 0, slot?.r || 0);
    } catch (err) {
      console.error(`[DB LOAD] userId=${userId}`, err.message);
      village = createVillage(slot?.q || 0, slot?.r || 0);
    }
    // Eski kayıtlar konumsuz olabilir — slotuna oturt
    if (slot && (village.worldQ !== slot.q || village.worldR !== slot.r)) {
      village.worldQ = slot.q;
      village.worldR = slot.r;
    }
    // NOT: yayılma artık halka ile sınırlı olmadığı için halka dışı tarlaları
    // taşımaya gerek yok — migrateTilesIntoClaim yalnızca geriye dönük araç olarak duruyor.
    session = { village, tickMs: DEFAULT_TICK_MS, nextTickAt: Date.now() + DEFAULT_TICK_MS, socketId: socket.id, dirty: false };
    userSessions.set(userId, session);
  }
  socketToUser.set(socket.id, userId);
  socket.emit('village_update', buildPayload(session.village, session.tickMs));

  const v     = () => session.village;
  const emit  = () => socket.emit('village_update', buildPayload(v(), session.tickMs));
  const dirty = () => { session.dirty = true; };

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
    if (diff > v().freeWorkers) return;
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
    if (!canBuildAt(v(), slotKey, buildingType) || !workers || workers < 1 || workers > v().freeWorkers) return;
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
    if (!def || (def.maxLevel && b.level >= def.maxLevel) || !workers || workers < 1 || workers > v().freeWorkers) return;
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
    const b = v().villageBuildings[slotKey];
    if (!b || b.level < 1) return;
    const def = VILLAGE_DEFS[b.type];
    if (!def || (!def.processes && !WORKER_ASSIGNABLE_MILITARY.has(b.type))) return;
    const maxW = b.level * (def.workersPerLevel || 3);
    const newW = Math.max(0, Math.min(maxW, workers));
    const diff = newW - (b.workers || 0);
    if (diff > v().freeWorkers) return;
    v().freeWorkers -= diff; b.workers = newW;
    dirty(); emit();
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
    try { socket.emit('world_snapshot', worldSnapshot(userId)); }
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
    const mySlot = WORLD.slotByUser.get(userId);
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
      const { attacker = {}, defender = {}, surLevel = 0, hendekLevel = 0, mode = 'normal', tag = null } = payload;
      socket.emit('battle_result', { ok: true, tag, result: simulateBattle(attacker, defender, { surLevel, hendekLevel, mode }) });
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
      let added = 0;
      for (const [k, n] of Object.entries(a || {})) {
        const cnt = Math.max(0, Math.floor(Number(n) || 0));
        if (!UNIT_DEFS[k] || !cnt) continue;
        village.army[k] = (village.army[k] || 0) + cnt;
        added += cnt;
      }
      // Asker nüfusun parçası (eğitimde işçiden dönüşüyor) — bedava asker
      // verirken nüfusu da artır, yoksa yiyecek hesabı bozulur.
      if (added > 0) {
        village.population += added;
        village.maxPopulation = Math.max(village.maxPopulation, village.population);
      }
      for (const [k, n] of Object.entries(r || {})) {
        if (village.resources[k] != null) village.resources[k] += Math.floor(Number(n) || 0);
      }
      dirty(); emit();
      console.log(`[DEV] ${userEmail} ordu +${added}`);
    });
  }

  socket.on('disconnect', async () => {
    console.log(`[DISCONNECT] ${userEmail} (${userId})`);
    socketToUser.delete(socket.id);
    if (session.socketId === socket.id) session.socketId = null;
    try { await saveVillage(userId, session.village); session.dirty = false; }
    catch (err) { console.error(`[DB SAVE ERR] ${userEmail}`, err.message); }
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

  for (const { userId, state, updatedAt } of allVillages) {
    const village = hydrateVillage(state);
    // Oturumun ekran tazeleme aralığı (hız çubuğu bunu değiştirir)
    const tickMs = village.tickMs || DEFAULT_TICK_MS;
    // NPC'lerle AYNI tavan — oyun saati cinsinden, kaba adımlarla
    const offlineHours = Math.min(MAX_CATCHUP_HOURS,
      (now - updatedAt.getTime()) / 1000 / GT.HOUR_SECONDS);
    const offlineTicks = Math.floor(offlineHours / GT.CATCHUP_HOURS_PER_STEP);

    // stepVillage (processTick DEĞİL): inşaatlar da tamamlanmalı.
    // processTick tek başına bina inşaatını bitirmiyordu; oyuncu offline dönerken
    // inşaatları asılı kalıyordu.
    for (let i = 0; i < offlineTicks; i++) stepVillage(village, GT.CATCHUP_HOURS_PER_STEP);

    userSessions.set(userId, {
      village,
      tickMs,
      nextTickAt: now + tickMs,
      lastTickAt: now,        // ilk tick geçmişten sıçramasın
      socketId: null,
      dirty: offlineTicks > 0
    });
    if (offlineTicks > 0) {
      console.log(`[BOOT] userId=${userId} — ${offlineTicks} offline tick uygulandı`);
    }
  }

  console.log(`[BOOT] ${allVillages.length} oyuncu köyü yüklendi`);

  await bootWorld();

  server.listen(PORT, () => {
    console.log(`Sunucu: http://localhost:${PORT}`);
    console.log(`[ZAMAN] 1 oyun saati = ${GT.HOUR_SECONDS} gerçek saniye`
      + ` (${(3600 / GT.HOUR_SECONDS).toFixed(2)}× Travian) — TRANORD_HOUR_SECONDS ile değişir`);
  });
}

bootServer().catch(err => {
  console.error('[BOOT FAIL]', err.message);
  process.exit(1);
});
