/**
 * Oyun tick motoru
 * processTick() her saniye çağrılır.
 * Test modu: 1 gerçek saniye = 1 oyun saati
 */
const { PRODUCTION_DEFS: BUILDING_DEFS, VILLAGE_DEFS, EQUIPMENT_DEFS, UNIT_DEFS } = require('../data');
const { getTileBonus, getTotalMultiplier } = require('./mapConfig');

// Min üretim saniyesi: çok fazla işçi olsa bile süre 1 saniyenin altına inmez
const MIN_PRODUCTION_SECONDS = 1;

// ─── Beslenme dengeleri ──────────────────────────────────────────
// 1 tick = 1 oyun saati. 1 gün = 24 tick.
const DAY_LENGTH_TICKS          = 24;
const FOOD_PER_VILLAGER_PER_DAY = 3;   // köylü günde 3 ekmek
const FOOD_PER_SOLDIER_PER_DAY  = 6;   // asker köylünün 2 katı (günde 6)
const GRAIN_PER_HORSE_PER_DAY   = 3;   // at günde 3 ham tahıl
const STARVE_POP_LOSS_INTERVAL  = 10;  // peş peşe 10 açlık tickinde 1 nüfus öl

// Birim eğitim süresi (saniye): ekipman sayısı × 5sn, min 3sn (1 işçi referansı)
function getUnitTrainSeconds(unitType) {
  const def = UNIT_DEFS[unitType];
  if (!def) return Infinity;
  const eqCount = (def.equipment || []).length;
  return Math.max(3, eqCount * 5);
}

// Belirli bir ekipman türünün depo tavanı.
// 'at' için ahır seviyesi × 5, diğerleri (kılıç/mızrak/kalkan/zırh) için cephanelik seviyesi × 50.
// Bina yoksa: at → 0 (üretilemez), diğerleri → 20 (küçük varsayılan stok).
function getEquipmentCap(village, equipmentType) {
  if (equipmentType === 'at') {
    const ahir = Object.values(village.villageBuildings).find(b => b.type === 'ahir');
    if (!ahir || ahir.building || ahir.level < 1) return 0;
    const def = VILLAGE_DEFS.ahir;
    return ahir.level * (def?.horseCapPerLevel || 5);
  }
  const cephane = Object.values(village.villageBuildings).find(b => b.type === 'cephane');
  if (!cephane || cephane.building || cephane.level < 1) return 20;
  const def = VILLAGE_DEFS.cephane;
  return cephane.level * (def?.equipmentCapPerLevel || 50);
}

// Bir askeri binanın aktif işçi sayısı
function getBuildingWorkers(village, buildingType) {
  const b = Object.values(village.villageBuildings).find(vb => vb.type === buildingType);
  if (!b || b.building || b.level < 1) return 0;
  return b.workers || 0;
}

// ─── Hex mesafesi (axial) ─────────────────────────────────────────
// Merkeze olan ring seviyesi = hex mesafesi
function hexDistanceFromCenter(slotKey) {
  const [q, r] = slotKey.split(',').map(Number);
  return (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2;
}

// Üretim verim çarpanı: Ring 1 = %100, her ring -%5 (min 0)
// ring 0 (merkez) için de 1 döner ama üretim tile'ı 0,0'da olmaz.
function getProductionMultiplier(slotKey) {
  const ring = hexDistanceFromCenter(slotKey);
  if (ring <= 1) return 1;
  return Math.max(0, 1 - 0.05 * (ring - 1));
}

// Slota özel bonus dahil toplam üretim çarpanı.
// tile.type ile o slotun bonus resource'u eşleşirse bonus uygulanır.
function getSlotTotalMultiplier(slotKey, buildingType) {
  const [q, r] = slotKey.split(',').map(Number);
  return getTotalMultiplier(q, r, buildingType);
}

// cost object for upgrading FROM level TO level+1
function getUpgradeCost(type, level) {
  const def = BUILDING_DEFS[type];
  return def.levels[level]?.cost || null;
}

function getUpgradeSeconds(type, level, workers) {
  if (workers <= 0) return Infinity;
  const def = BUILDING_DEFS[type];
  const sureSaat = def.levels[level]?.sureSaat;
  if (!sureSaat) return Infinity;
  return Math.ceil(sureSaat / workers);
}

function formatTime(seconds) {
  if (seconds === Infinity) return '—';
  if (seconds < 60) return seconds + 'sn';
  if (seconds < 3600) return Math.ceil(seconds / 60) + 'dk';
  return (seconds / 3600).toFixed(1) + 'sa';
}

function processTick(village) {
  const now = Date.now();

  // Üretim alanı hex tile'ları (ham madde)
  Object.entries(village.productionTiles).forEach(([slotKey, b]) => {
    const def = BUILDING_DEFS[b.type];
    if (!def) return;

    if (b.workers > 0 && !b.upgrading) {
      // Distance penalty + tile bonus (bonus resource == b.type ise uygulanır)
      const multiplier = getSlotTotalMultiplier(slotKey, b.type);
      const perHour = b.workers * def.baseProductionPerWorker * multiplier;
      village.resources[b.type] = (village.resources[b.type] || 0) + perHour;
    }

    if (b.upgrading && now >= b.upgradeEndTime) {
      b.level++;
      b.upgrading = false;
      village.freeWorkers += b.upgradeWorkersAssigned;
      b.upgradeWorkersAssigned = 0;
      b.upgradeEndTime = null;
      console.log(`[UPGRADE] UretimTile ${slotKey} (${b.type}) -> Seviye ${b.level}`);
    }
  });

  // Köy merkezi işleme binaları (ham -> işlenmiş)
  Object.values(village.villageBuildings).forEach(b => {
    const def = VILLAGE_DEFS[b.type];
    if (!def?.processes || b.building || b.level < 1) return;

    const w = b.workers || 0;
    if (w <= 0) return;

    const { input, inputPerHour, output, outputPerHour } = def.processes;
    const rate      = inputPerHour * w;
    const available = village.resources[input] || 0;
    const toConsume = Math.min(available, rate);
    if (toConsume <= 0) return;

    village.resources[input]  -= toConsume;
    const produced = toConsume * (outputPerHour / inputPerHour);
    village.resources[output] = (village.resources[output] || 0) + produced;
  });

  // Depo kapasitesi tavanı
  const caps = { odun:300, kil:300, tas:300, demir:300, tahil:300, kereste:200, tugla:200, yontmaTas:200, demirKulce:200 };
  let granaryCap = 150;

  Object.values(village.villageBuildings).forEach(b => {
    const def = VILLAGE_DEFS[b.type];
    if (!def?.stores || (b.building && b.level === 0)) return;
    const cap = def.baseCapacity + Math.max(0, b.level - 1) * def.capacityPerLevel;
    if (b.type === 'granary') {
      granaryCap += cap;
    } else {
      def.stores.forEach(res => { caps[res] = (caps[res] || 0) + cap; });
    }
  });

  Object.keys(caps).forEach(k => {
    if (village.resources[k] !== undefined) {
      village.resources[k] = Math.min(village.resources[k] || 0, caps[k]);
      village.resources[k] = Math.round(village.resources[k] * 10) / 10;
    }
  });

  const totalFood = (village.resources.un || 0) + (village.resources.ekmek || 0);
  if (granaryCap <= 0) {
    village.resources.un    = 0;
    village.resources.ekmek = 0;
  } else if (totalFood > granaryCap) {
    const ratio = granaryCap / totalFood;
    village.resources.un    = Math.round((village.resources.un    || 0) * ratio * 10) / 10;
    village.resources.ekmek = Math.round((village.resources.ekmek || 0) * ratio * 10) / 10;
  } else {
    village.resources.un    = Math.round((village.resources.un    || 0) * 10) / 10;
    village.resources.ekmek = Math.round((village.resources.ekmek || 0) * 10) / 10;
  }

  // Ekipman üretim kuyrukları
  processEquipmentQueues(village, now);

  // Birim eğitim kuyrukları
  processUnitQueues(village, now);

  // Beslenme: nüfus + ordu yer, atlar ayrı tahıl tüketir
  processFoodConsumption(village);
}

// ─── Yiyecek tüketimi ─────────────────────────────────────────────
// Köylüler ve askerler sırasıyla ekmek → un → ham tahıl yer.
// Atlar yalnızca ham tahıl tüketir (un/ekmek yemez).
// Yeterli yiyecek yoksa isStarving=true → her STARVE_POP_LOSS_INTERVAL tickte 1 nüfus.
function processFoodConsumption(village) {
  const pop     = village.population || 0;
  const army    = Object.values(village.army || {}).reduce((s, c) => s + c, 0);
  const horses  = (village.equipment?.at) || 0;

  // Per-tick (saatlik) tüketim. 1 gün = 24 tick.
  const villagerRate = (pop    * FOOD_PER_VILLAGER_PER_DAY) / DAY_LENGTH_TICKS;
  const soldierRate  = (army   * FOOD_PER_SOLDIER_PER_DAY)  / DAY_LENGTH_TICKS;
  const horseRate    = (horses * GRAIN_PER_HORSE_PER_DAY)   / DAY_LENGTH_TICKS;

  let foodDebt = villagerRate + soldierRate;

  // Sadece ekmek sayılır — yoksa açlık
  if (foodDebt > 0 && (village.resources.ekmek || 0) > 0) {
    const take = Math.min(village.resources.ekmek, foodDebt);
    village.resources.ekmek -= take;
    foodDebt -= take;
  }

  // Atlar: sadece ham tahıl
  if (horseRate > 0) {
    const take = Math.min(village.resources.tahil || 0, horseRate);
    village.resources.tahil = (village.resources.tahil || 0) - take;
    // Eksik kalsa bile at kaybı yok (şimdilik) — balans kararı sonra.
  }

  // Açlık bayrağı + kayıp mantığı
  // Ölüm sırası: önce askerler, sonra siviller (min 10 nüfus koruması)
  const MIN_POPULATION = 10;
  const starving = foodDebt > 1e-6;
  village.isStarving = starving;
  if (starving) {
    village.starveCounter = (village.starveCounter || 0) + 1;
    if (village.starveCounter >= STARVE_POP_LOSS_INTERVAL) {
      village.starveCounter = 0;

      // 1) Önce asker öl
      const armyEntries = Object.entries(village.army || {}).filter(([, cnt]) => cnt > 0);
      if (armyEntries.length > 0) {
        const [deadType] = armyEntries[0];
        village.army[deadType] -= 1;
        console.log(`[STARVE] Asker kaybı! ${deadType} (kalan: ${village.army[deadType]})`);

      // 2) Asker kalmadıysa ve nüfus minimumun üzerindeyse sivil öl
      } else if (village.population > MIN_POPULATION) {
        village.population -= 1;
        if (village.freeWorkers > 0) village.freeWorkers -= 1;
        const hourlyDrop = FOOD_PER_VILLAGER_PER_DAY / DAY_LENGTH_TICKS;
        village.resources.ekmek = (village.resources.ekmek || 0) + hourlyDrop;
        console.log(`[STARVE] Nüfus kaybı! Kalan: ${village.population}`);

      // 3) Minimum nüfusa ulaşıldı — artık kimse ölmez
      } else {
        console.log(`[STARVE] Minimum nüfus (${MIN_POPULATION}) korunuyor.`);
      }
    }
  } else {
    village.starveCounter = 0;
  }

  // Float temizliği
  ['ekmek', 'un', 'tahil'].forEach(k => {
    if (village.resources[k] !== undefined) {
      village.resources[k] = Math.max(0, Math.round(village.resources[k] * 10) / 10);
    }
  });
}

function processEquipmentQueues(village, now) {
  if (!village.equipmentQueues) return;

  Object.entries(village.equipmentQueues).forEach(([buildingType, queue]) => {
    if (!queue.length) return;

    const b = Object.values(village.villageBuildings).find(vb => vb.type === buildingType);
    if (!b || b.building || b.level < 1) return;

    const order = queue[0];
    const def   = EQUIPMENT_DEFS[order.type];
    if (!def) { queue.shift(); return; }

    if (!order.startTime || order.waiting) {
      // 1) İşçi var mı?
      const workers = b.workers || 0;
      if (workers <= 0) {
        order.waiting      = true;
        order.waitingReason = 'isci_yok';
        return;
      }
      // 2) Depo (cephanelik / ahır at kapasitesi) dolu mu?
      const cap = getEquipmentCap(village, order.type);
      const have = village.equipment[order.type] || 0;
      if (have >= cap) {
        order.waiting      = true;
        order.waitingReason = order.type === 'at' ? 'ahir_dolu' : 'cephane_dolu';
        return;
      }
      // 3) Kaynak yeterli mi?
      const affordable = Object.entries(def.cost).every(([res, amt]) =>
        (village.resources[res] || 0) >= amt
      );
      if (!affordable) {
        order.waiting      = true;
        order.waitingReason = 'kaynak_yok';
        return;
      }
      // Başlat: kaynak harca, süre = productionHours / workers (min 1sn)
      for (const [res, amt] of Object.entries(def.cost)) {
        village.resources[res] -= amt;
      }
      const baseSecs = Math.ceil(def.productionHours);
      const secs     = Math.max(MIN_PRODUCTION_SECONDS, Math.ceil(baseSecs / workers));
      order.waiting       = false;
      order.waitingReason = null;
      order.startTime     = now;
      order.endTime       = now + secs * 1000;
      order.workersAtStart = workers;
    }

    if (now >= order.endTime) {
      // Bitim anında yine cap kontrolü (cephanelik yıkılmış/küçülmüş olabilir)
      const cap  = getEquipmentCap(village, order.type);
      const have = village.equipment[order.type] || 0;
      if (have >= cap) {
        // Depo doldu → üretilen parça ziyan (kaynak zaten harcandı). Bekletme moduna al.
        order.waiting      = true;
        order.waitingReason = order.type === 'at' ? 'ahir_dolu' : 'cephane_dolu';
        order.startTime = null;
        order.endTime   = null;
        return;
      }
      village.equipment[order.type] = have + 1;
      console.log(`[EQUIPMENT DONE] ${order.type} -> envanter (${have + 1}/${cap})`);

      order.remaining = (order.remaining || 1) - 1;
      if (order.remaining <= 0) {
        queue.shift();
      } else {
        order.startTime = null;
        order.endTime   = null;
        order.waiting   = false;
        order.waitingReason = null;
      }
    }
  });
}

// ─── Birim eğitim kuyruğu ─────────────────────────────────────────
// Sipariş başladığında ekipmanlar envanterden düşer + 1 serbest işçi rezerve edilir.
// Süre bitince: army[type]++, rezerve edilen işçi asker olur (geri gelmez).
// Kuşatma birimleri (EQUIPMENT_DEFS'te olmayan ekipman kullanan) şimdilik desteklenmiyor.
function processUnitQueues(village, now) {
  if (!village.unitQueues) return;
  if (!village.army) village.army = {};

  Object.entries(village.unitQueues).forEach(([buildingType, queue]) => {
    if (!queue || !queue.length) return;

    // Bu tür eğitim binası köyde var ve çalışır durumda mı?
    const b = Object.values(village.villageBuildings).find(vb => vb.type === buildingType);
    if (!b || b.building || b.level < 1) return;

    const order = queue[0];
    const unitDef = UNIT_DEFS[order.type];
    if (!unitDef) { queue.shift(); return; }

    // Bu birim bu binada eğitiliyor mu?
    if (unitDef.trainedAt !== buildingType) { queue.shift(); return; }

    // Yeni sipariş (henüz başlamamış) ise: kaynakları kontrol et + rezerve et
    if (!order.startTime || order.waiting) {
      // Eğitim binasının kendi işçisi var mı? (Kışla/ahır/atölye'deki personel süreyi belirler)
      const trainerWorkers = b.workers || 0;
      if (trainerWorkers <= 0) {
        order.waiting       = true;
        order.waitingReason = 'egitmen_yok';
        return;
      }

      // Ekipman ve boş işçi (askere dönüşecek) mevcut mu?
      const eqList = unitDef.equipment || [];
      const eqAffordable = eqList.every(eq => (village.equipment[eq] || 0) >= 1);
      const workerAvailable = village.freeWorkers >= 1;

      if (!eqAffordable) {
        order.waiting       = true;
        order.waitingReason = 'ekipman_yok';
        return;
      }
      if (!workerAvailable) {
        order.waiting       = true;
        order.waitingReason = 'asker_icin_isci_yok';
        return;
      }

      // Düş/rezerve et
      eqList.forEach(eq => { village.equipment[eq] = (village.equipment[eq] || 0) - 1; });
      village.freeWorkers -= 1;
      order.workerReserved = true;

      // Süre: temel × (1/trainerWorkers), min 1sn
      const baseSecs = getUnitTrainSeconds(order.type);
      const secs     = Math.max(MIN_PRODUCTION_SECONDS, Math.ceil(baseSecs / trainerWorkers));
      order.waiting       = false;
      order.waitingReason = null;
      order.startTime     = now;
      order.endTime       = now + secs * 1000;
      order.workersAtStart = trainerWorkers;
    }

    // Süresi doldu mu?
    if (now >= order.endTime) {
      village.army[order.type] = (village.army[order.type] || 0) + 1;
      // Not: işçi asker oldu, havuza geri dönmez (freeWorkers artmaz)
      console.log(`[UNIT TRAINED] ${order.type} (+1) ${buildingType}`);

      order.remaining = (order.remaining || 1) - 1;
      if (order.remaining <= 0) {
        queue.shift();
      } else {
        // Sıradaki adet için yeniden rezerve gerekli
        order.startTime      = null;
        order.endTime        = null;
        order.waiting        = true;
        order.waitingReason  = null;
        order.workerReserved = false;
      }
    }
  });
}

// Yardımcı: o anki beslenme gereksinimlerini (saatlik = tick başına) döndürür.
// Yardımcı: beslenme oranları (tick başına) — UI "-X/sa" göstergesi
function getConsumptionRates(village) {
  const pop    = village.population || 0;
  const army   = Object.values(village.army || {}).reduce((s, c) => s + c, 0);
  const horses = (village.equipment && village.equipment.at) || 0;

  const villagerFood = (pop    * FOOD_PER_VILLAGER_PER_DAY) / DAY_LENGTH_TICKS;
  const soldierFood  = (army   * FOOD_PER_SOLDIER_PER_DAY)  / DAY_LENGTH_TICKS;
  const horseGrain   = (horses * GRAIN_PER_HORSE_PER_DAY)   / DAY_LENGTH_TICKS;

  return {
    villagers:    pop,
    soldiers:     army,
    horses,
    foodPerHour:  +(villagerFood + soldierFood).toFixed(2),
    grainPerHour: +horseGrain.toFixed(2),
    dayLengthTicks: DAY_LENGTH_TICKS
  };
}

module.exports = {
  processTick,
  processUnitQueues,
  getUpgradeCost,
  getUpgradeSeconds,
  getUnitTrainSeconds,
  getEquipmentCap,
  getBuildingWorkers,
  getConsumptionRates,
  formatTime,
  hexDistanceFromCenter,
  getProductionMultiplier,
  getSlotTotalMultiplier,
  getTileBonus
};
