const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');

const { createVillage, hydrateVillage } = require('./game/villageState');
const { processTick, getUpgradeSeconds, hexDistanceFromCenter, getProductionMultiplier, getUnitTrainSeconds, getEquipmentCap, getConsumptionRates } = require('./game/tick');
const { simulateBattle } = require('./game/combat');
const { router: authRouter, verifyToken } = require('./auth');
const { initDB, loadVillage, saveVillage } = require('./db');

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

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] }
});

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use('/auth', authRouter);

// Per-user state: userId -> { village, tickMs, nextTickAt, socketId, dirty }
const userSessions = new Map();
const socketToUser  = new Map();

const DEFAULT_TICK_MS = 1000;
const MIN_TICK_MS     = 100;
const MAX_TICK_MS     = 10000;

function getVillageBuildSeconds(type, level, workers) {
  const def = VILLAGE_DEFS[type];
  if (!def || workers <= 0) return Infinity;
  const work = Math.round(def.buildBaseWork * Math.pow(def.buildMultiplier, level - 1));
  return Math.ceil(work / workers);
}

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

function canBuildProductionAt(village, slotKey, type) {
  if (slotKey === '0,0') return false;
  if (village.productionTiles[slotKey]) return false;
  if (!VALID_PRODUCTION_TYPES.has(type)) return false;
  const parts = slotKey.split(',');
  if (parts.length !== 2 || parts.some(p => isNaN(Number(p)))) return false;
  if (Object.keys(village.productionTiles).length >= getMaxProductionSlots(village)) return false;
  return getNeighbors(slotKey).some(n => n === '0,0' || village.productionTiles[n]);
}

function buildPayload(village, tickMs) {
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
  const now = Date.now();

  const equipmentQueues = Object.fromEntries(
    Object.entries(village.equipmentQueues || {}).map(([bt, q]) => [bt, q.map(o => ({
      id: o.id, type: o.type, remaining: o.remaining, total: o.total,
      waiting: !!o.waiting, waitingReason: o.waitingReason || null,
      workersAtStart: o.workersAtStart || null,
      timeLeft: o.endTime ? Math.max(0, Math.ceil((o.endTime - now) / 1000)) : null
    }))])
  );

  const unitQueues = Object.fromEntries(
    Object.entries(village.unitQueues || {}).map(([bt, q]) => [bt, (q || []).map(o => ({
      id: o.id, type: o.type, remaining: o.remaining, total: o.total,
      waiting: !!o.waiting, waitingReason: o.waitingReason || null,
      workersAtStart: o.workersAtStart || null,
      timeLeft: o.endTime ? Math.max(0, Math.ceil((o.endTime - now) / 1000)) : null
    }))])
  );

  const equipmentCaps = {
    kilic: getEquipmentCap(village,'kilic'), mizrak: getEquipmentCap(village,'mizrak'),
    kalkan: getEquipmentCap(village,'kalkan'), zirh: getEquipmentCap(village,'zirh'), at: getEquipmentCap(village,'at')
  };

  return {
    population: village.population, maxPopulation: village.maxPopulation, freeWorkers: village.freeWorkers,
    resources: { ...village.resources }, equipment: { ...(village.equipment || {}) },
    equipmentCaps, equipmentQueues, equipmentByBuilding: EQUIPMENT_BY_BUILDING, equipmentDefs: EQUIPMENT_DEFS,
    army: { ...(village.army || {}) }, unitQueues, unitDefs: TRAINABLE_UNITS,
    unitsByBuilding: UNITS_BY_BUILDING, baseStats: BASE_STATS,
    productionPerHour, depotCapacities, granaryCapacity, processingRates,
    populationGrowthRate: village.population < village.maxPopulation ? 1 : 0,
    isStarving: !!village.isStarving, starveCounter: village.starveCounter || 0,
    consumption, tickMs, tickMsRange: { min: MIN_TICK_MS, max: MAX_TICK_MS, default: DEFAULT_TICK_MS },
    villageBuildings: Object.fromEntries(
      Object.entries(village.villageBuildings).map(([k, b]) => [k, {
        ...b,
        buildTimeLeft: b.building ? Math.max(0, Math.ceil((b.buildEndTime - now) / 1000)) : null,
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
          efficiency: getProductionMultiplier(k),
          maxWorkers: def?.levels[b.level - 1]?.workers || 1,
          upgradeCost: def?.levels[b.level]?.cost || null,
          upgradeTimeLeft: b.upgrading ? Math.max(0, Math.ceil((b.upgradeEndTime - now) / 1000)) : null
        }];
      })
    )
  };
}

function runTickForUser(userId, session) {
  const { village, tickMs } = session;
  processTick(village);

  const now = Date.now();
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
  if (village.tickCount % 10 === 0 && !village.isStarving && village.population < village.maxPopulation) {
    village.population++;
    village.freeWorkers++;
  }
  session.dirty = true;

  const sock = io.sockets.sockets.get(session.socketId);
  if (sock) sock.emit('village_update', buildPayload(village, tickMs));
}

// Global tick polling (50ms)
setInterval(() => {
  const now = Date.now();
  for (const [userId, session] of userSessions) {
    if (!session.socketId) continue;
    if (now >= session.nextTickAt) {
      session.nextTickAt = now + session.tickMs;
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

  let session = userSessions.get(userId);
  if (session) {
    session.socketId = socket.id;
  } else {
    let village;
    try {
      const saved = await loadVillage(userId);
      village = saved ? hydrateVillage(saved) : createVillage();
    } catch (err) {
      console.error(`[DB LOAD] userId=${userId}`, err.message);
      village = createVillage();
    }
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
    if (!b || b.upgrading) return;
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
    b.upgrading = true; b.upgradeEndTime = Date.now() + getUpgradeSeconds(b.type, b.level, workers) * 1000; b.upgradeWorkersAssigned = workers;
    dirty(); emit();
  });

  socket.on('build_production', ({ slotKey, type, workers }) => {
    if (!canBuildProductionAt(v(), slotKey, type) || !workers || workers < 1 || workers > v().freeWorkers) return;
    const def = BUILDING_DEFS[type];
    const cost = def.levels[0]?.cost || {};
    for (const [res, amt] of Object.entries(cost)) { if ((v().resources[res] || 0) < amt) return; }
    for (const [res, amt] of Object.entries(cost)) { v().resources[res] -= amt; }
    v().freeWorkers -= workers;
    v().productionTiles[slotKey] = { type, level: 0, workers: 0, upgrading: true, upgradeEndTime: Date.now() + Math.ceil((def.levels[0]?.sureSaat || 5) / workers) * 1000, upgradeWorkersAssigned: workers };
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
    v().villageBuildings[slotKey] = { type: buildingType, level: 0, workers: 0, building: true, buildEndTime: Date.now() + getVillageBuildSeconds(buildingType, 1, workers) * 1000, buildWorkers: workers };
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
    b.building = true; b.buildEndTime = Date.now() + getVillageBuildSeconds(b.type, b.level + 1, workers) * 1000; b.buildWorkers = workers;
    dirty(); emit();
  });

  socket.on('assign_village_workers', ({ slotKey, workers }) => {
    const b = v().villageBuildings[slotKey];
    if (!b || b.building || b.level < 1) return;
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
    if (!b || b.building || b.level < 1) return;
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
    if (!b || b.building || b.level < 1) return;
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

  socket.on('set_speed', ({ tickMs: newMs }) => {
    session.tickMs = Math.max(MIN_TICK_MS, Math.min(MAX_TICK_MS, Number(newMs) || DEFAULT_TICK_MS));
    emit();
  });

  socket.on('simulate_battle', (payload = {}) => {
    try {
      const { attacker = {}, defender = {}, surLevel = 0, hendekLevel = 0, mode = 'normal' } = payload;
      socket.emit('battle_result', { ok: true, result: simulateBattle(attacker, defender, { surLevel, hendekLevel, mode }) });
    } catch (err) {
      socket.emit('battle_result', { ok: false, error: err.message });
    }
  });

  socket.on('disconnect', async () => {
    console.log(`[DISCONNECT] ${userEmail} (${userId})`);
    socketToUser.delete(socket.id);
    if (session.socketId === socket.id) session.socketId = null;
    try { await saveVillage(userId, session.village); session.dirty = false; }
    catch (err) { console.error(`[DB SAVE ERR] ${userEmail}`, err.message); }
  });
});

app.get('/', (_req, res) => res.send('TraNord sunucu calisiyor!'));

const PORT = process.env.PORT || 3001;
initDB().then(() => {
  server.listen(PORT, () => console.log(`Sunucu: http://localhost:${PORT}`));
}).catch(err => {
  console.error('[DB INIT FAIL]', err.message);
  process.exit(1);
});
