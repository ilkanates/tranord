const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');

const village  = require('./game/villageState');
const { processTick, getUpgradeSeconds, hexDistanceFromCenter, getProductionMultiplier, getUnitTrainSeconds, getEquipmentCap, getConsumptionRates } = require('./game/tick');
const { simulateBattle } = require('./game/combat');

// İşçi atanabilir askeri binalar: ekipman/at üretimi + birim eğitimi
const WORKER_ASSIGNABLE_MILITARY = new Set(['silahci', 'zirh', 'ahir', 'kisla', 'atolye']);
const { PRODUCTION_DEFS: BUILDING_DEFS, VILLAGE_DEFS, EQUIPMENT_DEFS, EQUIPMENT_BY_BUILDING, UNIT_DEFS, BASE_STATS } = require('./data');

// ─── Eğitilebilir birim listesi ──────────────────────────────────
// Kuşatma birimleri şimdilik hariç (koc_basi/mancinik EQUIPMENT_DEFS'te yok)
const TRAINABLE_UNITS = Object.fromEntries(
  Object.entries(UNIT_DEFS).filter(([_, def]) => {
    if (def.category === 'kusatma') return false;
    return (def.equipment || []).every(eq => EQUIPMENT_DEFS[eq]);
  })
);

// Her eğitim binasının eğitebildiği birimler
const UNITS_BY_BUILDING = Object.entries(TRAINABLE_UNITS).reduce((acc, [key, def]) => {
  if (!def.trainedAt) return acc;
  (acc[def.trainedAt] ||= []).push(key);
  return acc;
}, {});

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// ─── Yardımcı: köy binası inşaat süresi ─────────────────────────
function getVillageBuildSeconds(type, level, workers) {
  const def = VILLAGE_DEFS[type];
  if (!def || workers <= 0) return Infinity;
  const work = Math.round(def.buildBaseWork * Math.pow(def.buildMultiplier, level - 1));
  return Math.ceil(work / workers);
}

// ─── Yardımcı: anaBina-style ölçekli yükseltme maliyeti ─────────
function getScaledUpgradeCost(type, currentLevel) {
  const def = VILLAGE_DEFS[type];
  if (!def?.upgradeCostBase) return null;
  const mult = Math.pow(def.upgradeCostMultiplier || 1.5, currentLevel - 1);
  return Object.fromEntries(
    Object.entries(def.upgradeCostBase).map(([k, v]) => [k, Math.round(v * mult)])
  );
}

// ─── Yardımcı: anaBina seviyesinden max üretim slotu ─────────────
function getMaxProductionSlots() {
  const anaBina = village.villageBuildings['0,0'];
  const lvl     = anaBina?.level || 1;
  return Math.min(16, 5 + lvl);   // Lvl 1 → 6, Lvl 11 → 16
}

// ─── Yardımcı: hex axial komşuları ───────────────────────────────
const HEX_NEIGHBORS = [[1,-1],[1,0],[0,1],[-1,1],[-1,0],[0,-1]];
function getNeighbors(slotKey) {
  const [q, r] = slotKey.split(',').map(Number);
  return HEX_NEIGHBORS.map(([dq, dr]) => `${q+dq},${r+dr}`);
}

// ─── Tick: değiştirilebilir hız ──────────────────────────────────
const DEFAULT_TICK_MS = 1000;
const MIN_TICK_MS     = 100;
const MAX_TICK_MS     = 10000;
let tickMs = DEFAULT_TICK_MS;
let tickHandle = null;

function runTick() {
  processTick(village);

  const now = Date.now();
  Object.entries(village.villageBuildings).forEach(([key, b]) => {
    if (b.building && now >= b.buildEndTime) {
      b.level++;
      village.freeWorkers += b.buildWorkers;
      delete b.building;
      delete b.buildEndTime;
      delete b.buildWorkers;
      console.log(`[VILLAGE DONE] ${b.type} → Lvl ${b.level}`);
    }
  });

  const evBuildings = Object.values(village.villageBuildings).filter(b => b.type === 'ev' && !(b.building && b.level === 0));
  village.maxPopulation = 50 + evBuildings.reduce((sum, b) => sum + 50 * b.level, 0);

  village.tickCount++;
  if (village.tickCount % 10 === 0) {
    if (village.isStarving) {
      // Açlık varken üreme yok
    } else if (village.population < village.maxPopulation) {
      village.population++;
      village.freeWorkers++;
      console.log(`[POPULATION] ${village.population}/${village.maxPopulation}`);
    }
  }

  io.emit('village_update', buildPayload());
}

function startTickLoop() {
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = setInterval(runTick, tickMs);
}
startTickLoop();

// ─── Köy merkezi yardımcıları ────────────────────────────────────
function canBuildAt(slotKey, buildingType) {
  if (slotKey === '0,0') return false;
  if (village.villageBuildings[slotKey]) return false;
  const isTower = village.TOWER_SLOTS.has(slotKey);
  if (isTower && buildingType !== 'kule') return false;
  if (!isTower && buildingType === 'kule') return false;

  const def = VILLAGE_DEFS[buildingType];
  if (!def) return false;
  if (buildingType === 'anaBina') return false;

  if (def.unique) {
    const exists = Object.values(village.villageBuildings).some(b => b.type === buildingType);
    if (exists) return false;
  }

  if (buildingType === 'kule') {
    const count = Object.values(village.villageBuildings).filter(b => b.type === 'kule').length;
    if (count >= 4) return false;
  }

  return true;
}

// ─── Üretim alanı yardımcıları ───────────────────────────────────
const VALID_PRODUCTION_TYPES = new Set(['odun','kil','tas','demir','tahil']);

function canBuildProductionAt(slotKey, type) {
  if (slotKey === '0,0') return false;
  if (village.productionTiles[slotKey]) return false;
  if (!VALID_PRODUCTION_TYPES.has(type)) return false;

  // Geçerli axial koordinat mı?
  const parts = slotKey.split(',');
  if (parts.length !== 2 || parts.some(p => isNaN(Number(p)))) return false;

  const placed = Object.keys(village.productionTiles).length;
  if (placed >= getMaxProductionSlots()) return false;

  // Komşuluk kuralı: en az bir komşu '0,0' olmalı veya zaten dolu olmalı
  const neighbors = getNeighbors(slotKey);
  const connected = neighbors.some(n => n === '0,0' || village.productionTiles[n]);
  if (!connected) return false;

  return true;
}

// ─── Payload hazırla ─────────────────────────────────────────────
function buildPayload() {
  const productionPerHour = { odun:0, kil:0, tas:0, demir:0, tahil:0 };
  Object.entries(village.productionTiles).forEach(([slotKey, b]) => {
    if (b.workers > 0 && !b.upgrading) {
      const def = BUILDING_DEFS[b.type];
      if (def) {
        const mult = getProductionMultiplier(slotKey);
        productionPerHour[b.type] = (productionPerHour[b.type] || 0) + b.workers * def.baseProductionPerWorker * mult;
      }
    }
  });

  const processingRates = {};
  Object.values(village.villageBuildings).forEach(b => {
    const def = VILLAGE_DEFS[b.type];
    if (def?.processes && !b.building && b.level > 0) {
      const { input, inputPerHour, output, outputPerHour } = def.processes;
      const w    = b.workers || 0;
      const maxW = b.level * (def.workersPerLevel || 3);
      processingRates[output] = {
        input,
        inputPerHour:  inputPerHour  * w,
        outputPerHour: outputPerHour * w,
        workers: w,
        maxWorkers: maxW
      };
    }
  });

  const depotCapacities = {
    odun:300, kil:300, tas:300, demir:300, tahil:300,
    kereste:200, tugla:200, yontmaTas:200, demirKulce:200
  };
  let granaryCapacity = 150;

  Object.values(village.villageBuildings).forEach(b => {
    const def = VILLAGE_DEFS[b.type];
    if (!def?.stores || (b.building && b.level === 0)) return;
    const cap = def.baseCapacity + Math.max(0, b.level - 1) * def.capacityPerLevel;
    if (b.type === 'granary') {
      granaryCapacity += cap;
    } else {
      def.stores.forEach(res => {
        depotCapacities[res] = (depotCapacities[res] || 0) + cap;
      });
    }
  });

  const populationGrowthRate = village.population < village.maxPopulation ? 1 : 0;

  // Beslenme oranları (tick başına = saatlik)
  const consumption = getConsumptionRates(village);

  // Ekipman kuyruklarını kalan süre ile serialize et
  const now = Date.now();
  const equipmentQueues = Object.fromEntries(
    Object.entries(village.equipmentQueues || {}).map(([bt, q]) => [bt, q.map(o => ({
      id: o.id,
      type: o.type,
      remaining: o.remaining,
      total: o.total,
      waiting: !!o.waiting,
      waitingReason: o.waitingReason || null,
      workersAtStart: o.workersAtStart || null,
      timeLeft: o.endTime ? Math.max(0, Math.ceil((o.endTime - now) / 1000)) : null
    }))])
  );

  // Birim eğitim kuyruklarını kalan süre ile serialize et
  const unitQueues = Object.fromEntries(
    Object.entries(village.unitQueues || {}).map(([bt, q]) => [bt, (q || []).map(o => ({
      id: o.id,
      type: o.type,
      remaining: o.remaining,
      total: o.total,
      waiting: !!o.waiting,
      waitingReason: o.waitingReason || null,
      workersAtStart: o.workersAtStart || null,
      timeLeft: o.endTime ? Math.max(0, Math.ceil((o.endTime - now) / 1000)) : null
    }))])
  );

  // Ekipman depo tavanları (cephanelik + ahır at kapasitesi)
  const equipmentCaps = {
    kilic:  getEquipmentCap(village, 'kilic'),
    mizrak: getEquipmentCap(village, 'mizrak'),
    kalkan: getEquipmentCap(village, 'kalkan'),
    zirh:   getEquipmentCap(village, 'zirh'),
    at:     getEquipmentCap(village, 'at')
  };

  return {
    population:       village.population,
    maxPopulation:    village.maxPopulation,
    freeWorkers:      village.freeWorkers,
    resources:        { ...village.resources },
    equipment:        { ...(village.equipment || {}) },
    equipmentCaps,
    equipmentQueues,
    equipmentByBuilding: EQUIPMENT_BY_BUILDING,
    equipmentDefs:    EQUIPMENT_DEFS,
    army:             { ...(village.army || {}) },
    unitQueues,
    unitDefs:         TRAINABLE_UNITS,
    unitsByBuilding:  UNITS_BY_BUILDING,
    baseStats:        BASE_STATS,
    productionPerHour,
    depotCapacities,
    granaryCapacity,
    processingRates,
    populationGrowthRate,
    isStarving:       !!village.isStarving,
    starveCounter:    village.starveCounter || 0,
    consumption,
    tickMs,
    tickMsRange:      { min: MIN_TICK_MS, max: MAX_TICK_MS, default: DEFAULT_TICK_MS },
    villageBuildings: Object.fromEntries(
      Object.entries(village.villageBuildings).map(([k, b]) => [k, {
        ...b,
        buildTimeLeft: b.building ? Math.max(0, Math.ceil((b.buildEndTime - Date.now()) / 1000)) : null,
        upgradeCost:   getScaledUpgradeCost(b.type, b.level)
      }])
    ),
    towerSlots:         [...village.TOWER_SLOTS],
    productionRing1:    [...village.PRODUCTION_RING_1],
    maxProductionSlots: getMaxProductionSlots(),
    productionTiles: Object.fromEntries(
      Object.entries(village.productionTiles).map(([k, b]) => {
        const def = BUILDING_DEFS[b.type];
        const ring = hexDistanceFromCenter(k);
        const mult = getProductionMultiplier(k);
        return [k, {
          ...b,
          ring,
          efficiency:      mult,               // 0..1 aras\u0131, \u00fcretim \u00e7arpan\u0131
          maxWorkers:      def?.levels[b.level - 1]?.workers || 1,
          upgradeCost:     def?.levels[b.level]?.cost || null,
          upgradeTimeLeft: b.upgrading
            ? Math.max(0, Math.ceil((b.upgradeEndTime - Date.now()) / 1000))
            : null
        }];
      })
    )
  };
}

// ─── Socket olayları ─────────────────────────────────────────────
io.on('connection', socket => {
  console.log('[CONNECT]', socket.id);
  socket.emit('village_update', buildPayload());

  socket.on('assign_production_workers', ({ slotKey, workers }) => {
    const b = village.productionTiles[slotKey];
    if (!b || b.upgrading) return;
    const def = BUILDING_DEFS[b.type];
    if (!def) return;
    const maxW = def.levels[b.level - 1]?.workers || 1;
    const newW = Math.max(0, Math.min(maxW, workers));
    const diff = newW - (b.workers || 0);
    if (diff > village.freeWorkers) return;
    village.freeWorkers -= diff;
    b.workers = newW;
    io.emit('village_update', buildPayload());
  });

  socket.on('upgrade_production', ({ slotKey, workers }) => {
    const b = village.productionTiles[slotKey];
    if (!b || b.upgrading || workers <= 0 || workers > village.freeWorkers) return;
    const def = BUILDING_DEFS[b.type];
    if (!def) return;
    if (b.level >= def.levels.length) return;
    const cost = def.levels[b.level]?.cost;
    if (!cost) return;
    for (const [res, amt] of Object.entries(cost)) {
      if ((village.resources[res] || 0) < amt) {
        console.log(`[UPGRADE FAIL] ${slotKey} (${b.type}) yetersiz ${res}: ${village.resources[res]} < ${amt}`);
        return;
      }
    }
    for (const [res, amt] of Object.entries(cost)) {
      village.resources[res] -= amt;
    }
    const secs = getUpgradeSeconds(b.type, b.level, workers);
    village.freeWorkers           -= workers;
    b.upgrading                    = true;
    b.upgradeEndTime               = Date.now() + secs * 1000;
    b.upgradeWorkersAssigned       = workers;
    console.log(`[PROD UPGRADE START] ${slotKey} (${b.type}) Lvl${b.level}->${b.level+1}, ${secs}sn, ${workers} isci`);
    io.emit('village_update', buildPayload());
  });

  socket.on('build_production', ({ slotKey, type, workers }) => {
    if (!canBuildProductionAt(slotKey, type)) {
      console.log(`[PROD BUILD FAIL] ${slotKey} (${type}) — gecersiz slot/komsuluk/kapasite`);
      return;
    }
    if (!workers || workers < 1 || workers > village.freeWorkers) return;

    const def  = BUILDING_DEFS[type];
    const cost = def.levels[0]?.cost || {};
    for (const [res, amt] of Object.entries(cost)) {
      if ((village.resources[res] || 0) < amt) {
        console.log(`[PROD BUILD FAIL] yetersiz ${res}: ${village.resources[res]} < ${amt}`);
        return;
      }
    }
    for (const [res, amt] of Object.entries(cost)) {
      village.resources[res] -= amt;
    }
    const sureSaat = def.levels[0]?.sureSaat || 5;
    const secs = Math.ceil(sureSaat / workers);
    village.freeWorkers -= workers;
    village.productionTiles[slotKey] = {
      type,
      level: 0,
      workers: 0,
      upgrading: true,
      upgradeEndTime: Date.now() + secs * 1000,
      upgradeWorkersAssigned: workers
    };
    console.log(`[PROD BUILD START] ${type} -> ${slotKey}, ${secs}sn, ${workers} isci`);
    io.emit('village_update', buildPayload());
  });

  socket.on('demolish_production', ({ slotKey }) => {
    const b = village.productionTiles[slotKey];
    if (!b) return;
    if (b.upgrading && b.upgradeWorkersAssigned) village.freeWorkers += b.upgradeWorkersAssigned;
    if (b.workers) village.freeWorkers += b.workers;
    delete village.productionTiles[slotKey];
    console.log(`[PROD DEMOLISH] ${slotKey} (${b.type})`);
    io.emit('village_update', buildPayload());
  });

  socket.on('build_village', ({ slotKey, buildingType, workers }) => {
    if (!canBuildAt(slotKey, buildingType)) return;
    if (!workers || workers < 1 || workers > village.freeWorkers) return;

    const def  = VILLAGE_DEFS[buildingType];
    const cost = def?.cost || {};
    for (const [res, amount] of Object.entries(cost)) {
      if ((village.resources[res] || 0) < amount) {
        console.log(`[BUILD FAIL] Yetersiz ${res}: ${village.resources[res]} < ${amount}`);
        return;
      }
    }
    for (const [res, amount] of Object.entries(cost)) {
      village.resources[res] -= amount;
    }

    const secs = getVillageBuildSeconds(buildingType, 1, workers);
    village.freeWorkers -= workers;
    village.villageBuildings[slotKey] = {
      type: buildingType,
      level: 0,
      workers: 0,
      building: true,
      buildEndTime: Date.now() + secs * 1000,
      buildWorkers: workers
    };
    console.log(`[BUILD START] ${buildingType} -> ${slotKey}, ${secs}sn, ${workers} isci`);
    io.emit('village_update', buildPayload());
  });

  socket.on('upgrade_village', ({ slotKey, workers }) => {
    const b = village.villageBuildings[slotKey];
    if (!b || b.building) return;
    const def = VILLAGE_DEFS[b.type];
    if (!def) return;
    if (def.maxLevel && b.level >= def.maxLevel) return;
    if (!workers || workers < 1 || workers > village.freeWorkers) return;

    const upgradeCost = getScaledUpgradeCost(b.type, b.level);
    if (upgradeCost) {
      for (const [res, amt] of Object.entries(upgradeCost)) {
        if ((village.resources[res] || 0) < amt) {
          console.log(`[UPGRADE FAIL] ${b.type} yetersiz ${res}: ${village.resources[res]} < ${amt}`);
          return;
        }
      }
      for (const [res, amt] of Object.entries(upgradeCost)) {
        village.resources[res] -= amt;
      }
    }

    const secs = getVillageBuildSeconds(b.type, b.level + 1, workers);
    village.freeWorkers -= workers;
    b.building     = true;
    b.buildEndTime = Date.now() + secs * 1000;
    b.buildWorkers = workers;
    console.log(`[UPGRADE START] ${b.type} Lvl${b.level}->${b.level+1}, ${secs}sn, ${workers} isci`);
    io.emit('village_update', buildPayload());
  });

  socket.on('assign_village_workers', ({ slotKey, workers }) => {
    const b = village.villageBuildings[slotKey];
    if (!b || b.building || b.level < 1) return;
    const def = VILLAGE_DEFS[b.type];
    if (!def) return;

    // İzin: işleme binaları (processes) veya askeri üretim/eğitim binaları
    const isProcess = !!def.processes;
    const isMilWorker = WORKER_ASSIGNABLE_MILITARY.has(b.type);
    if (!isProcess && !isMilWorker) return;

    const maxW = b.level * (def.workersPerLevel || 3);
    const newW = Math.max(0, Math.min(maxW, workers));
    const diff = newW - (b.workers || 0);
    if (diff > village.freeWorkers) return;

    village.freeWorkers -= diff;
    b.workers = newW;
    console.log(`[VILLAGE WORKERS] ${b.type} -> ${newW} isci`);
    io.emit('village_update', buildPayload());
  });

  socket.on('demolish_village', ({ slotKey }) => {
    if (slotKey === '0,0') return;
    const b = village.villageBuildings[slotKey];
    if (b) {
      if (b.building && b.buildWorkers) village.freeWorkers += b.buildWorkers;
      if (b.workers) village.freeWorkers += b.workers;
    }
    delete village.villageBuildings[slotKey];
    io.emit('village_update', buildPayload());
  });

  // ── Ekipman üretim kuyruğu ────────────────────────────────────
  socket.on('queue_equipment', ({ buildingType, equipmentType, quantity }) => {
    const allowed = EQUIPMENT_BY_BUILDING[buildingType];
    if (!allowed || !allowed.includes(equipmentType)) {
      console.log(`[EQUIP QUEUE FAIL] ${buildingType} bu ekipmanı üretemez: ${equipmentType}`);
      return;
    }
    // Bina var ve çalışıyor mu?
    const b = Object.values(village.villageBuildings).find(vb => vb.type === buildingType);
    if (!b || b.building || b.level < 1) {
      console.log(`[EQUIP QUEUE FAIL] ${buildingType} çalışmıyor`);
      return;
    }
    const q = Math.max(1, Math.min(50, parseInt(quantity, 10) || 1));
    const queue = village.equipmentQueues[buildingType] ||= [];
    queue.push({
      id: village.nextOrderId++,
      type: equipmentType,
      total: q,
      remaining: q,
      waiting: true,
      startTime: null,
      endTime: null
    });
    console.log(`[EQUIP QUEUE] ${buildingType} -> ${equipmentType} x${q}`);
    io.emit('village_update', buildPayload());
  });

  socket.on('cancel_equipment_order', ({ buildingType, orderId }) => {
    const queue = village.equipmentQueues?.[buildingType];
    if (!queue) return;
    const idx = queue.findIndex(o => o.id === orderId);
    if (idx < 0) return;
    const order = queue[idx];
    // İlk sıradaki ve üretime başlanmış siparişte kısmen harcanan maliyet iade edilmez
    // (basit çözüm). Kalan parçalar için iade yok; sadece kuyruktan çıkar.
    queue.splice(idx, 1);
    console.log(`[EQUIP CANCEL] ${buildingType} order #${orderId} (${order.type})`);
    io.emit('village_update', buildPayload());
  });

  // ── Birim eğitim kuyruğu ─────────────────────────────────────
  socket.on('train_unit', ({ buildingType, unitType, quantity }) => {
    const allowed = UNITS_BY_BUILDING[buildingType];
    if (!allowed || !allowed.includes(unitType)) {
      console.log(`[TRAIN FAIL] ${buildingType} bu birimi eğitemez: ${unitType}`);
      return;
    }
    // Eğitim binası köyde var ve çalışıyor mu?
    const b = Object.values(village.villageBuildings).find(vb => vb.type === buildingType);
    if (!b || b.building || b.level < 1) {
      console.log(`[TRAIN FAIL] ${buildingType} çalışmıyor`);
      return;
    }
    const q = Math.max(1, Math.min(50, parseInt(quantity, 10) || 1));
    village.unitQueues[buildingType] ||= [];
    village.unitQueues[buildingType].push({
      id: village.nextUnitOrderId++,
      type: unitType,
      total: q,
      remaining: q,
      waiting: true,
      startTime: null,
      endTime: null,
      workerReserved: false
    });
    console.log(`[TRAIN QUEUE] ${buildingType} -> ${unitType} x${q}`);
    io.emit('village_update', buildPayload());
  });

  socket.on('cancel_unit_order', ({ buildingType, orderId }) => {
    const queue = village.unitQueues?.[buildingType];
    if (!queue) return;
    const idx = queue.findIndex(o => o.id === orderId);
    if (idx < 0) return;
    const order = queue[idx];
    // Eğer siparişte işçi/ekipman rezerve edilmişse geri ver (tek 1 birimlik rezerve)
    if (order.workerReserved && !order.waiting) {
      village.freeWorkers += 1;
      const unitDef = UNIT_DEFS[order.type];
      if (unitDef) {
        (unitDef.equipment || []).forEach(eq => {
          village.equipment[eq] = (village.equipment[eq] || 0) + 1;
        });
      }
    }
    queue.splice(idx, 1);
    console.log(`[TRAIN CANCEL] ${buildingType} order #${orderId} (${order.type})`);
    io.emit('village_update', buildPayload());
  });

  socket.on('set_speed', ({ tickMs: newMs }) => {
    const ms = Math.max(MIN_TICK_MS, Math.min(MAX_TICK_MS, Number(newMs) || DEFAULT_TICK_MS));
    tickMs = ms;
    startTickLoop();
    console.log(`[SPEED] tickMs → ${tickMs}`);
    io.emit('village_update', buildPayload());
  });

  // ─── Savaş Simülatörü ──────────────────────────────────────────
  socket.on('simulate_battle', (payload = {}) => {
    try {
      const {
        attacker    = {},
        defender    = {},
        surLevel    = 0,
        hendekLevel = 0,
        mode        = 'normal'
      } = payload;
      const result = simulateBattle(attacker, defender, { surLevel, hendekLevel, mode });
      socket.emit('battle_result', { ok: true, result });
    } catch (err) {
      console.error('[SIM_BATTLE]', err);
      socket.emit('battle_result', { ok: false, error: err.message });
    }
  });

  socket.on('disconnect', () => console.log('[DISCONNECT]', socket.id));
});

app.get('/', (_req, res) => res.send('TraNord sunucu calisiyor!'));
server.listen(3001, () => console.log('Sunucu: http://localhost:3001'));
