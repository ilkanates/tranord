/**
 * NPC köyleri — oyuncunun oynadığı MOTORUN AYNISI ile çalışır.
 * Burada yalnızca "karar verme" var: işçi atama, inşa, yükseltme, asker eğitimi.
 *
 * Ölçüm: 1000 köy tick başına ~9.5 ms (%1 CPU), köy başına ~3.2 KB.
 * Bu yüzden sahte büyüme eğrisi yerine gerçek simülasyon kullanılıyor.
 */

const { createVillage } = require('./villageState');
const GT = require('./gameTime');
const { getUpgradeSeconds, getEquipmentPool, getStorageCaps, getConsumptionRates, processTick } = require('./tick');
const {
  PRODUCTION_DEFS, VILLAGE_DEFS, UNIT_DEFS, EQUIPMENT_DEFS, EQUIPMENT_BY_BUILDING,
} = require('../data');
const { rand01 } = require('./world');

const RES_TYPES = ['odun', 'kil', 'tas', 'demir', 'tahil'];
const PRODUCTION_RING_2 = ['2,0', '2,-1', '2,-2', '1,-2', '0,-2', '-1,-1',
  '-2,0', '-2,1', '-2,2', '-1,2', '0,2', '1,1'];
const VILLAGE_FREE_SLOTS = ['2,0', '2,-2', '1,-2', '0,-2', '-1,-1', '-2,0',
  '-2,2', '-1,2', '0,2', '1,1', '3,0', '3,-2', '0,3', '-3,0', '-3,2', '0,-3', '2,1', '-2,3'];
const TOWER_SLOTS = ['0,-2', '2,-1', '0,2', '-2,1'];

const HEX_NEIGHBORS = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
const neighborsOf = (key) => {
  const [q, r] = key.split(',').map(Number);
  return HEX_NEIGHBORS.map(([dq, dr]) => `${q + dq},${r + dr}`);
};

const maxProductionSlots = (v) => Math.min(16, 5 + (v.villageBuildings['0,0']?.level || 1));
const canAfford = (v, cost) =>
  !cost || Object.entries(cost).every(([res, amt]) => (v.resources[res] || 0) >= amt);
const pay = (v, cost) => {
  for (const [res, amt] of Object.entries(cost || {})) v.resources[res] -= amt;
};
const buildingsOfType = (v, type) => Object.values(v.villageBuildings).filter(b => b.type === type);
const has = (v, type) => buildingsOfType(v, type).length > 0;
const inProgress = (v) =>
  Object.values(v.villageBuildings).filter(b => b.building).length +
  Object.values(v.productionTiles).filter(b => b.upgrading).length;

const villageBuildSeconds = (type, level, workers) => {
  const def = VILLAGE_DEFS[type];
  if (!def || workers <= 0) return Infinity;
  return Math.ceil(Math.round(def.buildBaseWork * Math.pow(def.buildMultiplier, level - 1)) / workers);
};
const scaledUpgradeCost = (type, level) => {
  const def = VILLAGE_DEFS[type];
  if (!def?.upgradeCostBase) return null;
  const m = Math.pow(def.upgradeCostMultiplier || 1.5, level - 1);
  return Object.fromEntries(Object.entries(def.upgradeCostBase).map(([k, val]) => [k, Math.round(val * m)]));
};

// ═══════════════════════════════════════════════════════════════════
//  NPC köyü oluştur — kademesine uygun gelişmişlikte, anında
// ═══════════════════════════════════════════════════════════════════
function seedInstant(slot) {
  const v = createVillage(slot.q, slot.r);
  const p = slot.power;                      // 0.10 … 1.00
  const rnd = (salt) => rand01(slot.q, slot.r, salt);
  const lerp = (a, b, t) => a + (b - a) * t;
  const jitter = (salt, spread) => 1 + (rnd(salt) - 0.5) * spread;

  // ── Ana bina ──
  const anaLevel = Math.max(1, Math.min(11, Math.round(lerp(1, 11, p) * jitter(31, 0.2))));
  v.villageBuildings['0,0'] = { type: 'anaBina', level: anaLevel };

  // ── Üretim tile'ları ──
  const tileCount = Math.max(6, Math.min(maxProductionSlots(v), Math.round(lerp(6, 16, p))));
  const tileLevel = () => Math.max(1, Math.min(10, Math.round(lerp(1, 9, p) * jitter(41, 0.35))));

  const extra = PRODUCTION_RING_2.slice(0, Math.max(0, tileCount - 6));
  extra.forEach((key, i) => {
    v.productionTiles[key] = {
      type: RES_TYPES[Math.floor(rnd(50 + i) * RES_TYPES.length)],
      level: tileLevel(), workers: 0, upgrading: false,
      upgradeEndTime: null, upgradeWorkersAssigned: 0,
    };
  });
  Object.values(v.productionTiles).forEach(t => { t.level = tileLevel(); });

  // ── İşleme binaları (baştan var, seviyelerini yükselt) ──
  Object.values(v.villageBuildings).forEach(b => {
    if (VILLAGE_DEFS[b.type]?.processes) {
      b.level = Math.max(1, Math.min(12, Math.round(lerp(1, 9, p) * jitter(61, 0.3))));
    }
  });

  // ── Ek binalar: gelişmişliğe göre sırayla ──
  const evLevel = Math.max(1, Math.min(5, Math.round(lerp(1, 5, p) * jitter(103, 0.4))));
  const plan = [];
  const evCount = Math.max(1, Math.round(lerp(1, 4, p) * jitter(102, 0.6)));
  for (let i = 0; i < evCount; i++) plan.push(['ev', evLevel]);
  if (p >= 0.18) plan.push(['hammaddeDepo', Math.round(lerp(1, 8, p))]);
  if (p >= 0.22) plan.push(['islenmisMalDepo', Math.round(lerp(1, 8, p))]);
  if (p >= 0.26) plan.push(['granary', Math.round(lerp(1, 8, p))]);
  if (p >= 0.34) plan.push(['silahci', Math.round(lerp(1, 8, p))]);
  if (p >= 0.40) plan.push(['zirh', Math.round(lerp(1, 8, p))]);
  if (p >= 0.44) plan.push(['cephane', Math.round(lerp(1, 8, p))]);
  if (p >= 0.48) plan.push(['kisla', Math.round(lerp(1, 8, p))]);
  if (p >= 0.58) plan.push(['ahir', Math.round(lerp(1, 7, p))]);
  if (p >= 0.62) plan.push(['tahilAmbar', Math.round(lerp(1, 6, p))]);
  if (p >= 0.70) plan.push(['pazar', Math.round(lerp(1, 5, p))]);

  const freeSlots = VILLAGE_FREE_SLOTS.filter(k => !v.villageBuildings[k] && !TOWER_SLOTS.includes(k));
  plan.forEach(([type, level], i) => {
    const key = freeSlots[i];
    if (!key || !VILLAGE_DEFS[type]) return;
    v.villageBuildings[key] = { type, level: Math.max(1, level), workers: 0 };
  });

  // ── Savunma ──
  if (p >= 0.30) {
    const surSlot = freeSlots[plan.length];
    if (surSlot) v.villageBuildings[surSlot] = { type: 'sur', level: Math.max(1, Math.round(lerp(1, 18, p))), workers: 0 };
  }
  if (p >= 0.45) {
    const hSlot = freeSlots[plan.length + 1];
    if (hSlot) v.villageBuildings[hSlot] = { type: 'hendek', level: Math.max(1, Math.round(lerp(1, 16, p))), workers: 0 };
  }
  if (p >= 0.55) {
    const towerCount = Math.min(4, Math.round(lerp(0, 4, p)));
    TOWER_SLOTS.slice(0, towerCount).forEach(k => {
      v.villageBuildings[k] = { type: 'kule', level: Math.max(1, Math.round(lerp(1, 14, p))), workers: 0 };
    });
  }

  // ── Nüfus ve işçi dağıtımı ──
  const evs = buildingsOfType(v, 'ev');
  v.maxPopulation = 50 + evs.reduce((s, b) => s + 50 * b.level, 0);
  v.population = Math.max(20, Math.min(v.maxPopulation,
    Math.round(v.maxPopulation * lerp(0.55, 0.95, p) * jitter(101, 0.3))));
  v.freeWorkers = v.population;
  assignIdleWorkers(v);

  // ── Kaynak stoku: depolarının yarısı civarı ──
  const fill = lerp(0.25, 0.7, p);
  ['odun', 'kil', 'tas', 'demir', 'tahil'].forEach(k => {
    v.resources[k] = Math.round(300 * fill * jitter(71, 0.4));
  });
  ['kereste', 'tugla', 'yontmaTas', 'demirKulce'].forEach(k => {
    v.resources[k] = Math.round(200 * fill * jitter(72, 0.4));
  });
  v.resources.ekmek = Math.round(120 * fill);
  v.resources.un = 0;

  // ── Ordu: güce göre ──
  v.army = {};
  v.equipment = { kilic: 0, mizrak: 0, kalkan: 0, zirh: 0, at: 0 };
  if (p >= 0.20) {
    const total = Math.round(lerp(5, 420, Math.pow(p, 1.5)) * jitter(81, 0.5));
    const trainable = Object.entries(UNIT_DEFS).filter(([, d]) =>
      d.category !== 'kusatma' && (d.equipment || []).every(e => EQUIPMENT_DEFS[e]));
    // Gelişmişlik arttıkça daha iyi birimler
    const pool = trainable.filter(([, d]) => {
      const eqCount = (d.equipment || []).length;
      return eqCount <= Math.max(1, Math.round(lerp(1, 4, p)));
    });
    const picks = pool.length ? pool : trainable;
    const kinds = Math.max(1, Math.min(picks.length, Math.round(lerp(1, 4, p))));
    let left = total;
    for (let i = 0; i < kinds; i++) {
      const [key] = picks[Math.floor(rnd(90 + i) * picks.length)];
      const n = i === kinds - 1 ? left : Math.round(total / kinds * jitter(95 + i, 0.5));
      const give = Math.max(0, Math.min(left, n));
      if (give > 0) v.army[key] = (v.army[key] || 0) + give;
      left -= give;
    }
    // Cephanelikte bir miktar yedek ekipman
    const poolCap = getEquipmentPool(v).capacity;
    const spare = Math.min(poolCap, Math.round(total * 0.25));
    if (spare > 0) v.equipment.kilic = spare;
    if (has(v, 'ahir')) v.equipment.at = Math.round(lerp(0, 20, p));
  }

  v.tickCount = 0;
  v.isStarving = false;
  v.starveCounter = 0;
  return v;
}

/**
 * NPC köyü tohumlama — KADEME = YAŞ.
 *
 * Köy yeni bir oyuncu köyü gibi sıfırdan kurulur, sonra GERÇEK motor + gerçek AI
 * ile kademesine göre "yaşlandırılır". Yani her seviye, her tarla, her asker
 * oyuncunun kazandığı gibi kazanılmış olur; hiçbir sayı elle yazılmaz. Tohumlama
 * bittikten sonra köy aynı AI ile adım adım gelişmeye devam eder.
 *
 * Sanal köy saati (village.clockMs) sayesinde hızlı ileri alma sırasında da
 * inşaatlar tamamlanır — eskiden Date.now() kullanıldığı için hiç bitmiyordu.
 */
/**
 * Kademe = YAŞ, OYUN SAATİ cinsinden (1. kademe ~17 gün, 5. kademe ~250 gün).
 * Tohumlama 1 saatlik kaba adımlarla koşar: 6000 saat = 6000 adım. İnce adımla
 * (1/3600 saat) aynı yaş 21,6 milyon adım ederdi.
 */
const AGE_HOURS_BY_TIER = { 1: 400, 2: 1200, 3: 2600, 4: 4200, 5: 6000 };

function seedNpcVillage(slot) {
  const v = createVillage(slot.q, slot.r);
  v.quiet = true;                                   // 200 NPC'nin logu konsolu boğmasın

  const base = AGE_HOURS_BY_TIER[slot.tier] || 400;
  // Aynı kademedeki köyler birbirinin kopyası olmasın: ±25% yaş sapması
  const jitter = 0.75 + rand01(slot.q, slot.r, 71) * 0.5;
  const hours = Math.round(base * jitter);

  for (let h = 1; h <= hours; h++) {
    stepVillage(v, 1);              // 1 oyun saatlik kaba adım
    if (h % 5 === 0) runNpcAi(v, slot);   // 5 saatte bir karar (canlı döngüyle aynı)
  }
  v.seedHours = hours;
  return v;
}


// ═══════════════════════════════════════════════════════════════════
//  Karar verme
// ═══════════════════════════════════════════════════════════════════

/**
 * Yiyecek zinciri önceliği: değirmen ve fırın MUTLAKA kadrolu olmalı.
 * Gerekirse en bol kaynağı üreten tile'dan işçi çekilir.
 */
/**
 * Yiyecek zinciri kadrosu: tahıl → un → ekmek.
 *
 * un ve ekmek ambarda AYNI yeri paylaşır. Eski sürüm değirmeni kapasitesinin
 * %60'ına kadar dolduruyordu; un ambarı tek başına dolduruyor, fırına yer
 * kalmıyor ve ekmek sürekli 0'da kalıyordu (ölçüm: un 141 / ekmek 0, ambar 150).
 * Ekmek 20'nin altında kalınca AI kalıcı "açlık acil durumu" moduna giriyordu.
 *
 * Yeni kural: un yalnızca ambarın ~%30'una kadar tutulur, gerisi ekmeğe ayrılır.
 * Fırın önce doyurulur (nihai yiyecek), değirmen fırının tüketebileceği kadar çalışır.
 */
function ensureFoodStaffing(v) {
  const { granaryCap } = getStorageCaps(v);
  const un = v.resources.un || 0;
  const ekmek = v.resources.ekmek || 0;

  const deg = buildingsOfType(v, 'degirmen').find(b => b.level >= 1);
  const firin = buildingsOfType(v, 'firin').find(b => b.level >= 1);

  const maxW = (b) => b.level * (VILLAGE_DEFS[b.type]?.workersPerLevel || 3);
  const setW = (b, want) => {
    const cur = b.workers || 0;
    const target = Math.max(0, Math.min(maxW(b), want));
    if (target > cur) {
      const give = Math.min(target - cur, v.freeWorkers);
      if (give > 0) { b.workers = cur + give; v.freeWorkers -= give; }
    } else if (target < cur) {
      v.freeWorkers += cur - target; b.workers = target;
    }
  };

  // FIRIN: elindeki unu ekmeğe çevir, ambarda ekmek için yer varsa
  if (firin) {
    const pr = VILLAGE_DEFS.firin.processes;
    const room = Math.max(0, granaryCap - un - ekmek);
    const byInput = Math.floor(un / (pr.inputPerHour || 1));
    const byRoom  = Math.floor((room + un) / (pr.outputPerHour || 1)); // un yer açacak
    setW(firin, Math.max(un > 0 ? 1 : 0, Math.min(byInput, byRoom)));
  }

  // DEĞİRMEN: unu ambarın ~%30'unda tut — gerisi ekmeğe kalsın
  if (deg) {
    const pr = VILLAGE_DEFS.degirmen.processes;
    const unTarget = granaryCap * 0.3;
    const need = Math.max(0, unTarget - un);
    const tahil = v.resources.tahil || 0;
    const byNeed  = Math.ceil(need / (pr.outputPerHour || 1));
    const byInput = Math.floor(tahil / (pr.inputPerHour || 1));
    setW(deg, Math.min(byNeed, byInput));
  }

  // Gerçekten açsa: fırın/değirmen için en bol stoklu tarladan işçi ödünç al
  if (v.isStarving) {
    for (const b of [firin, deg]) {
      if (!b) continue;
      let want = Math.max(0, Math.min(maxW(b), 2) - (b.workers || 0));
      if (want <= 0) continue;
      const tiles = Object.values(v.productionTiles)
        .filter(t => (t.workers || 0) > 0 && t.type !== 'tahil')
        .sort((a, c) => (v.resources[c.type] || 0) - (v.resources[a.type] || 0));
      for (const t of tiles) {
        if (want <= 0) break;
        const take = Math.min(want, t.workers);
        t.workers -= take; b.workers = (b.workers || 0) + take; want -= take;
      }
    }
  }
}

/** İnşaat için elde tutulacak işçi sayısı — bunlar hiçbir kadroya verilmez */
const buildReserve = (v) => Math.max(4, Math.ceil(v.population * 0.06));

/**
 * İşçileri dağıt — AMA inşaat rezervini koru.
 *
 * Eski sürüm son işçiye kadar dağıtıyordu; freeWorkers 0'a düşünce AI hiçbir şey
 * inşa edemiyor ve köy kalıcı platoya giriyordu (ölçüm: 9.000 tick sonunda boşta 0,
 * ana bina 2, tarla 7/7, ham kaynaklar 300 tavanında kilitli).
 */
function assignIdleWorkers(v) {
  const reserve = buildReserve(v);
  let moved = false;
  const { caps: rawCaps, granaryCap } = getStorageCaps(v);

  const give = (b, want, floor) => {
    const cur = b.workers || 0;
    const target = Math.max(0, Math.min(want, cur + Math.max(0, v.freeWorkers - floor)));
    if (target > cur) { b.workers = target; v.freeWorkers -= target - cur; moved = true; }
    else if (target < cur) { v.freeWorkers += cur - target; b.workers = target; moved = true; }
  };

  // 1) Üretim tarlaları — gelir kaynağı. Rezervin yarısına kadar inebilir.
  const tiles = Object.entries(v.productionTiles)
    .filter(([, b]) => b.level >= 1)
    .sort((a, b) => {
      const d = (k) => { const [q, r] = k.split(',').map(Number);
        return (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2; };
      return d(a[0]) - d(b[0]);
    });
  for (const [, b] of tiles) {
    const cap = rawCaps[b.type] ?? Infinity;
    const max = PRODUCTION_DEFS[b.type]?.levels?.[b.level - 1]?.workers || 1;
    // Deposu dolu kaynağa işçi yığmak boşa — işçi inşaatta daha değerli
    const full = b.type !== 'tahil' && (v.resources[b.type] || 0) >= cap * 0.95;
    give(b, full ? Math.min(b.workers || 0, 1) : max, Math.floor(reserve / 2));
  }

  // 2) İşleme binaları — yalnızca girdi fazlası VE çıktı deposunda yer varsa
  const RAW_RESERVE = 120;
  const outputRoom = (def) => {
    const out = def.processes.output;
    if (out === 'un' || out === 'ekmek') {
      return granaryCap - ((v.resources.un || 0) + (v.resources.ekmek || 0));
    }
    return (rawCaps[out] ?? Infinity) - (v.resources[out] || 0);
  };
  for (const b of Object.values(v.villageBuildings)) {
    const def = VILLAGE_DEFS[b.type];
    if (!def?.processes || b.level < 1) continue;
    const out = def.processes.output;
    if (out === 'un' || out === 'ekmek') continue;      // yiyecek zinciri ensureFoodStaffing'in işi

    const surplus = (v.resources[def.processes.input] || 0) - RAW_RESERVE;
    const room = outputRoom(def);
    if (surplus <= 0 || room <= 1) { give(b, 0, reserve); continue; }
    const max = b.level * (def.workersPerLevel || 3);
    const want = Math.min(max,
      Math.floor(surplus / (def.processes.inputPerHour || 1)),
      Math.floor(room / (def.processes.outputPerHour || 1)));
    give(b, want, reserve);
  }

  // 3) Askeri binalar — rezervin üstünde işçi kaldıysa
  const WORKER_TYPES = new Set(['silahci', 'zirh', 'ahir', 'kisla', 'atolye']);
  for (const b of Object.values(v.villageBuildings)) {
    const def = VILLAGE_DEFS[b.type];
    if (!def || b.level < 1 || !WORKER_TYPES.has(b.type)) continue;
    give(b, b.level * (def.workersPerLevel || 3), reserve + 4);
  }
  return moved;
}

/**
 * İnşaat için işçi bul: en değersiz kadrolardan geri çek.
 * Sıra: deposu dolu tarlalar → işleme binaları → askeri binalar.
 */
function freeUpWorkers(v, need) {
  if (v.freeWorkers >= need) return true;
  const { caps } = getStorageCaps(v);

  const pull = (b, keep) => {
    const take = Math.min((b.workers || 0) - keep, need - v.freeWorkers);
    if (take > 0) { b.workers -= take; v.freeWorkers += take; }
  };

  for (const b of Object.values(v.productionTiles)) {
    if (v.freeWorkers >= need) return true;
    const cap = caps[b.type] ?? Infinity;
    if (b.type !== 'tahil' && (v.resources[b.type] || 0) >= cap * 0.95) pull(b, 1);
  }
  for (const b of Object.values(v.villageBuildings)) {
    if (v.freeWorkers >= need) return true;
    const def = VILLAGE_DEFS[b.type];
    if (!def?.processes) continue;
    const out = def.processes.output;
    if (out === 'un' || out === 'ekmek') continue;         // yiyecek zincirine dokunma
    pull(b, 0);
  }
  const WORKER_TYPES = new Set(['silahci', 'zirh', 'ahir', 'kisla', 'atolye']);
  for (const b of Object.values(v.villageBuildings)) {
    if (v.freeWorkers >= need) return true;
    if (WORKER_TYPES.has(b.type)) pull(b, 0);
  }
  return v.freeWorkers >= need;
}

/** Motorun bir tick'i — index.js'teki stepVillage ile aynı, tohumlama da bunu kullanır */
/**
 * Bir köyü `hours` oyun saati ilerlet. Canlı döngü ince adım (1/3600 saat)
 * kullanır; tohumlama ve offline telafi 1 saatlik KABA adım kullanır.
 */
function stepVillage(v, hours = GT.HOURS_PER_TICK) {
  processTick(v, hours);          // saati de bu ilerletir
  const now = v.clockMs;
  Object.values(v.villageBuildings).forEach(b => {
    if (b.building && now >= b.buildEndTime) {
      b.level++;
      v.freeWorkers += b.buildWorkers;
      delete b.building; delete b.buildEndTime; delete b.buildWorkers;
    }
  });
  const evs = Object.values(v.villageBuildings)
    .filter(b => b.type === 'ev' && !(b.building && b.level === 0));
  v.maxPopulation = 50 + evs.reduce((sum, b) => sum + 50 * b.level, 0);
  v.tickCount++;
  // Nüfus: saatte 1 kişi (index.js'deki oyuncu kuralıyla aynı)
  v.popAccum = (v.popAccum || 0) + hours;
  while (v.popAccum >= 1) {
    v.popAccum -= 1;
    if (v.isStarving || v.population >= v.maxPopulation) break;
    v.population++; v.freeWorkers++;
  }
}

/** Bir köy binası inşa et */
function tryBuildVillage(v, type, buildWorkers) {
  const def = VILLAGE_DEFS[type];
  if (!def) return false;
  if (def.unique && has(v, type)) return false;
  if (!canAfford(v, def.cost)) return false;
  if (v.freeWorkers < buildWorkers) return false;

  const isTower = type === 'kule';
  const candidates = isTower
    ? TOWER_SLOTS.filter(k => !v.villageBuildings[k])
    : VILLAGE_FREE_SLOTS.filter(k => !v.villageBuildings[k] && !TOWER_SLOTS.includes(k));
  const slot = candidates[0];
  if (!slot) return false;

  pay(v, def.cost);
  v.freeWorkers -= buildWorkers;
  v.villageBuildings[slot] = {
    type, level: 0, workers: 0, building: true,
    buildEndTime: v.clockMs + villageBuildSeconds(type, 1, buildWorkers) * 1000,
    buildWorkers,
  };
  return true;
}

/** Bir köy binasını yükselt */
function tryUpgradeVillage(v, b, buildWorkers) {
  const def = VILLAGE_DEFS[b.type];
  if (!def || b.building) return false;
  if (def.maxLevel && b.level >= def.maxLevel) return false;
  const cost = scaledUpgradeCost(b.type, b.level);
  if (cost && !canAfford(v, cost)) return false;
  if (v.freeWorkers < buildWorkers) return false;

  if (cost) pay(v, cost);
  v.freeWorkers -= buildWorkers;
  b.building = true;
  b.buildEndTime = v.clockMs + villageBuildSeconds(b.type, b.level + 1, buildWorkers) * 1000;
  b.buildWorkers = buildWorkers;
  return true;
}

/** Yeni üretim tile'ı kur */
function tryBuildProduction(v, buildWorkers, preferType = null) {
  if (Object.keys(v.productionTiles).length >= maxProductionSlots(v)) return false;
  const free = PRODUCTION_RING_2.filter(k =>
    !v.productionTiles[k] && neighborsOf(k).some(n => n === '0,0' || v.productionTiles[n]));
  if (!free.length) return false;

  // Tercih edilen tür yoksa en az stoğu olan kaynağı seç
  const scarcest = preferType
    || [...RES_TYPES].sort((a, b) => (v.resources[a] || 0) - (v.resources[b] || 0))[0];
  const def = PRODUCTION_DEFS[scarcest];
  const cost = def?.levels?.[0]?.cost;
  if (!cost || !canAfford(v, cost) || v.freeWorkers < buildWorkers) return false;

  pay(v, cost);
  v.freeWorkers -= buildWorkers;
  v.productionTiles[free[0]] = {
    type: scarcest, level: 0, workers: 0, upgrading: true,
    upgradeEndTime: v.clockMs + Math.ceil((def.levels[0].sureSaat || 5) / buildWorkers) * 1000,
    upgradeWorkersAssigned: buildWorkers,
  };
  return true;
}

/** Üretim tile'ı yükselt — en düşük seviyeli, karşılanabilir olan */
function tryUpgradeProduction(v, buildWorkers) {
  const candidates = Object.values(v.productionTiles)
    .filter(b => !b.upgrading && b.level >= 1)
    .sort((a, b) => a.level - b.level);
  for (const b of candidates) {
    const def = PRODUCTION_DEFS[b.type];
    const next = def?.levels?.[b.level];
    if (!next || !canAfford(v, next.cost) || v.freeWorkers < buildWorkers) continue;
    pay(v, next.cost);
    v.freeWorkers -= buildWorkers;
    b.upgrading = true;
    b.upgradeEndTime = v.clockMs + getUpgradeSeconds(b.type, b.level, buildWorkers) * 1000;
    b.upgradeWorkersAssigned = buildWorkers;
    return true;
  }
  return false;
}

/** Ekipman ve asker siparişi */
function tryMilitary(v, foodShort) {
  // Ekonomi kırılganken ordu kurmak köyü açlığa sokuyordu (ölçüm: nüfus 126 → 76)
  if (foodShort || v.population < 90) return false;
  if (v.freeWorkers <= buildReserve(v) + 4) return false;
  const pool = getEquipmentPool(v);
  // Ekipman: havuzda yer varsa üret
  if (pool.free > pool.capacity * 0.25) {
    for (const [bType, list] of Object.entries(EQUIPMENT_BY_BUILDING)) {
      const b = buildingsOfType(v, bType)[0];
      if (!b || b.level < 1 || (b.workers || 0) <= 0) continue;
      const q = v.equipmentQueues[bType] ||= [];
      if (q.length >= 1) continue;   // bekleyen sipariş varken üstüne yığma
      const eq = list[0];
      if (!canAfford(v, EQUIPMENT_DEFS[eq]?.cost)) continue;
      q.push({ id: v.nextOrderId++, type: eq, total: 10, remaining: 10, waiting: true, startTime: null, endTime: null });
      return true;
    }
  }
  // Asker: ekipman biriktiyse eğit
  const kisla = buildingsOfType(v, 'kisla')[0];
  if (kisla && kisla.level >= 1 && (kisla.workers || 0) > 0 && v.freeWorkers > 5) {
    const q = v.unitQueues.kisla ||= [];
    if (q.length < 1) {
      const unit = Object.entries(UNIT_DEFS).find(([, d]) =>
        d.trainedAt === 'kisla' && (d.equipment || []).every(e => (v.equipment[e] || 0) >= 1));
      if (unit) {
        q.push({ id: v.nextUnitOrderId++, type: unit[0], total: 5, remaining: 5, waiting: true, startTime: null, endTime: null, workerReserved: false });
        return true;
      }
    }
  }
  return false;
}

/**
 * NPC kararları — her AI turunda bir kez çağrılır (her tick değil).
 * Öncelik: aç kalmama → işçi dağıtımı → nüfus → depo → üretim → askeri.
 */
/**
 * NPC kararları — her AI turunda bir kez çağrılır (her tick değil).
 *
 * Karar modeli AĞIRLIKLI ADAY LİSTESİ. Eskiden sıralı bir "ilk uyan kazanır"
 * zinciriydi ve üstteki adımlar (nüfus, depo) inşaat slotlarını sürekli
 * doldurduğu için alttakilere (tarla, ordu, savunma) hiç sıra gelmiyordu:
 * köyler anaBina 3 / tarla 7'de kilitleniyordu. Artık her tur uygun adaylar
 * ağırlıklarına göre karıştırılıp denenir; biri başarısız olursa sıradaki denenir.
 * Bu, oyuncunun davranışına da daha yakın: aynı anda birden çok yöne yatırım.
 */
function runNpcAi(v, slot) {
  const rnd = (salt) => rand01(slot.q, slot.r, (v.tickCount % 997) * 7 + salt);

  // 0) Yiyecek zinciri her şeyden önce — aç köy küçülür, ordusu erir
  ensureFoodStaffing(v);
  assignIdleWorkers(v);

  // Yiyecek durumu: STOK değil, ÜRETİM KAPASİTESİ / tüketim oranı.
  // ("ekmek < 20" testi yanlıştı: ekmek üretilir üretilmez tüketiliyor, sağlıklı
  //  köyde de stok 0 civarında kalıyor ve AI kalıcı açlık moduna giriyordu.)
  const cons = getConsumptionRates(v);
  const firinB = buildingsOfType(v, 'firin').find(b => b.level >= 1);
  const firinPr = VILLAGE_DEFS.firin?.processes;
  const breadCap = firinB && firinPr ? (firinB.workers || 0) * (firinPr.outputPerHour || 0) : 0;
  const foodShort = v.isStarving || breadCap < cons.foodPerHour * 1.15;

  // Kuyruk işleri (ekipman/asker) inşaat slotu kullanmaz → kapıdan bağımsız
  tryMilitary(v, foodShort);

  // ANA BİNA: tarla slotu açan tek bina, en yüksek kaldıraç → kendi inşaat slotu
  const ana = v.villageBuildings['0,0'];
  const tileCount = Object.keys(v.productionTiles).length;
  if (ana && !ana.building && tileCount >= maxProductionSlots(v)) {
    let abw = Math.max(2, Math.min(v.freeWorkers, 4));
    if (v.freeWorkers < abw) { freeUpWorkers(v, abw); abw = Math.min(abw, v.freeWorkers); }
    if (abw >= 1 && tryUpgradeVillage(v, ana, abw)) return;
  }

  const maxBuilds = Math.min(4, 1 + Math.floor(v.population / 150));
  if (inProgress(v) >= maxBuilds) return;

  let bw = Math.max(1, Math.min(v.freeWorkers, 2 + Math.floor(rnd(1) * 4)));
  if (v.freeWorkers < bw) {
    freeUpWorkers(v, bw);
    bw = Math.min(bw, v.freeWorkers);
    if (bw < 1) return;
  }

  // ── Adaylar ───────────────────────────────────────────────────────
  const cands = [];
  const add = (w, run) => { if (w > 0) cands.push({ w, run }); };
  const nearFull = (keys, cap) => keys.some(k => (v.resources[k] || 0) >= cap * 0.9);
  // Nüfus gerçekten darboğaz mı? Kurulu tarlaların boş kadro açığına bak —
  // "boş işçi oranı" yanıltıcıydı: 13 tarlalı köy nüfus 100'de kilitli kalıyordu.
  const staffDeficit = Object.values(v.productionTiles).reduce((sum, b) => {
    if (b.level < 1) return sum;
    const max = PRODUCTION_DEFS[b.type]?.levels?.[b.level - 1]?.workers || 1;
    return sum + Math.max(0, max - (b.workers || 0));
  }, 0);
  const popIsBottleneck = staffDeficit > v.freeWorkers;

  // Yiyecek — acil durumda her şeyi bastırır
  if (foodShort) add(120, () => {
    const grain = Object.values(v.productionTiles).filter(t => t.type === 'tahil');
    if (grain.length < 3 && tileCount < maxProductionSlots(v)
        && tryBuildProduction(v, bw, 'tahil')) return true;
    const gt = grain.filter(t => !t.upgrading).sort((a, b) => a.level - b.level)[0];
    if (gt) {
      const next = PRODUCTION_DEFS.tahil?.levels?.[gt.level];
      if (next && canAfford(v, next.cost) && v.freeWorkers >= bw) {
        pay(v, next.cost);
        v.freeWorkers -= bw;
        gt.upgrading = true;
        gt.upgradeEndTime = v.clockMs + getUpgradeSeconds('tahil', gt.level, bw) * 1000;
        gt.upgradeWorkersAssigned = bw;
        return true;
      }
    }
    for (const t of ['firin', 'degirmen']) {
      const b = buildingsOfType(v, t)[0];
      if (b && !b.building && tryUpgradeVillage(v, b, bw)) return true;
    }
    return false;
  });

  // Nüfus: tavandaysa ev. Boş işçi bolsa ağırlığı düşer — önce onları
  // çalıştıracak tarla lazım (ama tamamen kapanmaz, yoksa nüfus 50'de kalıyor).
  if (v.population >= v.maxPopulation - 2) {
    add(popIsBottleneck ? 70 : 18, () => {
      const evs = buildingsOfType(v, 'ev');
      const maxLvl = VILLAGE_DEFS.ev.maxLevel || 5;
      const lowest = evs.filter(b => !b.building).sort((a, b) => a.level - b.level)[0];
      if (evs.length >= 3 && lowest && lowest.level < maxLvl
          && tryUpgradeVillage(v, lowest, bw)) return true;
      if (tryBuildVillage(v, 'ev', bw)) return true;
      return !!(lowest && lowest.level < maxLvl && tryUpgradeVillage(v, lowest, bw));
    });
  }

  // Depolar — dolmak üzereyse üretim boşa gider
  if (nearFull(['odun', 'kil', 'tas', 'demir'], 300)) add(50, () => {
    if (!has(v, 'hammaddeDepo')) return tryBuildVillage(v, 'hammaddeDepo', bw);
    const d = buildingsOfType(v, 'hammaddeDepo')[0];
    return !!(d && !d.building && tryUpgradeVillage(v, d, bw));
  });
  if (nearFull(['kereste', 'tugla', 'yontmaTas', 'demirKulce'], 200)) add(35, () => {
    if (!has(v, 'islenmisMalDepo')) return tryBuildVillage(v, 'islenmisMalDepo', bw);
    const d = buildingsOfType(v, 'islenmisMalDepo')[0];
    return !!(d && !d.building && tryUpgradeVillage(v, d, bw));
  });

  // Ambar — yiyecek tamponu (stok değil, nüfusa göre ihtiyaç)
  const { granaryCap } = getStorageCaps(v);
  if (granaryCap < cons.foodPerHour * 24 && v.population > 60) add(30, () => {
    if (!has(v, 'granary')) return tryBuildVillage(v, 'granary', bw);
    const g = buildingsOfType(v, 'granary')[0];
    return !!(g && !g.building && tryUpgradeVillage(v, g, bw));
  });

  // Üretim alanı — yeni tarla ve tarla yükseltmesi, ekonominin motoru
  if (tileCount < maxProductionSlots(v)) add(60, () => tryBuildProduction(v, bw));
  add(45, () => tryUpgradeProduction(v, bw));

  // İşleme binaları
  add(20, () => {
    const proc = Object.values(v.villageBuildings)
      .filter(b => VILLAGE_DEFS[b.type]?.processes && !b.building)
      .sort((a, b) => a.level - b.level)[0];
    return !!(proc && tryUpgradeVillage(v, proc, bw));
  });

  // Askeri altyapı — ordunun önkoşulu
  if (v.population > 80) add(28, () => {
    for (const t of ['cephane', 'silahci', 'zirh', 'kisla', 'ahir']) {
      if (!has(v, t) && tryBuildVillage(v, t, bw)) return true;
    }
    const mil = ['silahci', 'zirh', 'kisla', 'ahir', 'cephane']
      .map(t => buildingsOfType(v, t)[0])
      .filter(b => b && !b.building)
      .sort((a, b) => a.level - b.level)[0];
    return !!(mil && tryUpgradeVillage(v, mil, bw));
  });

  // Savunma
  if (v.population > 100) add(24, () => {
    if (!has(v, 'sur') && tryBuildVillage(v, 'sur', bw)) return true;
    if (!has(v, 'hendek') && tryBuildVillage(v, 'hendek', bw)) return true;
    if (buildingsOfType(v, 'kule').length < 4 && rnd(5) < 0.4
        && tryBuildVillage(v, 'kule', bw)) return true;
    const d = ['sur', 'hendek'].map(t => buildingsOfType(v, t)[0])
      .filter(b => b && !b.building)
      .sort((a, b) => a.level - b.level)[0];
    return !!(d && tryUpgradeVillage(v, d, bw));
  });

  // ── Ağırlıklı sıra: biri olmazsa sıradakini dene ──
  let pool = cands.slice();
  let salt = 11;
  while (pool.length) {
    const total = pool.reduce((sum, c) => sum + c.w, 0);
    let pick = rnd(salt++) * total;
    let i = 0;
    while (i < pool.length - 1 && pick > pool[i].w) { pick -= pool[i].w; i++; }
    const chosen = pool[i];
    pool = pool.filter((_, j) => j !== i);
    try { if (chosen.run()) return; } catch (_) { /* bir aday patlarsa diğerlerini dene */ }
  }
}

function npcSummary(v) {
  const army = Object.values(v.army || {}).reduce((s, n) => s + n, 0);
  const attack = Object.entries(v.army || {}).reduce(
    (s, [t, n]) => s + (UNIT_DEFS[t]?.stats?.saldiri || 0) * n, 0);
  const defense = Object.entries(v.army || {}).reduce(
    (s, [t, n]) => s + (UNIT_DEFS[t]?.stats?.yayaSav || 0) * n, 0);
  const sur = buildingsOfType(v, 'sur')[0];
  const hendek = buildingsOfType(v, 'hendek')[0];
  const buildings = Object.values(v.villageBuildings).length;
  const levelSum = Object.values(v.villageBuildings).reduce((s, b) => s + b.level, 0)
    + Object.values(v.productionTiles).reduce((s, b) => s + b.level, 0);
  return {
    population: v.population,
    maxPopulation: v.maxPopulation,
    army, attack, defense,
    surLevel: sur?.level || 0,
    hendekLevel: hendek?.level || 0,
    buildings,
    score: levelSum * 10 + v.population + army * 3,
  };
}

module.exports = {
  seedNpcVillage, seedInstant, runNpcAi, npcSummary, ensureFoodStaffing, stepVillage,
  assignIdleWorkers, tryBuildVillage, tryUpgradeVillage,
  tryBuildProduction, tryUpgradeProduction,
};
