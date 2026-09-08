/**
 * Oyun tick motoru.
 *
 * ZAMAN: ölçek tek yerde — game/gameTime.js. processTick() gerçek saniyede bir
 * çağrılır ama her çağrıda YALNIZCA `hours` kadar oyun saati işler (1× ölçekte
 * 1/3600 saat). Bütün oranlar SAAT başınadır ve bu kesirle çarpılır.
 *
 * Hızlı ileri alma (tohumlama, offline telafi) aynı fonksiyonu büyük `hours`
 * ile çağırır — 400 oyun saatini 400 adımda alır, 1,44 milyon adımda değil.
 */
const { PRODUCTION_DEFS: BUILDING_DEFS, VILLAGE_DEFS, EQUIPMENT_DEFS, UNIT_DEFS } = require('../data');
const { fieldMultiplier, worldTileBonus, localEfficiency } = require('./world');
const GT = require('./gameTime');

/** En kısa üretim süresi — işçi sayısı ne olursa olsun 1 oyun dakikasının altına inmez */
const MIN_PRODUCTION_MINUTES = 1;

// ─── Beslenme dengeleri (GÜN başına; gün = 24 oyun saati) ────────
const HOURS_PER_DAY             = 24;
const FOOD_PER_VILLAGER_PER_DAY = 3;   // köylü günde 3 ekmek
const FOOD_PER_SOLDIER_PER_DAY  = 6;   // asker köylünün 2 katı (günde 6)
const GRAIN_PER_HORSE_PER_DAY   = 3;   // at günde 3 ham tahıl
/** Kesintisiz bu kadar oyun saati aç kalınca 1 nüfus/asker ölür */
const STARVE_HOURS_PER_LOSS     = 10;

/**
 * Birim eğitim süresi — oyun DAKİKASI (1 eğitmen referansı).
 * Ekipman sayısı × 5 dk, en az 3 dk. Travian kışla süreleriyle aynı mertebe.
 */
function getUnitTrainMinutes(unitType) {
  const def = UNIT_DEFS[unitType];
  if (!def) return Infinity;
  const eqCount = (def.equipment || []).length;
  return Math.max(3, eqCount * 5);
}
/** Geriye dönük ad — dakika döndürür (eski çağrı yerleri için) */
const getUnitTrainSeconds = getUnitTrainMinutes;

// ─── Ekipman deposu ──────────────────────────────────────────────
// Kılıç/mızrak/kalkan/zırh TEK PAYLAŞIMLI HAVUZ kullanır: cephanelik
// seviyesi × 200. Türler arasında serbestçe dağıtılabilir; toplam sınırlıdır.
// At ayrı: canlı hayvan olduğu için ahır seviyesi × 5 ile sınırlı.
const POOL_KEYS = new Set(['kilic', 'mizrak', 'kalkan', 'zirh']);
const POOL_DEFAULT = 80;   // cephanelik yoksa küçük başlangıç deposu

// Paylaşımlı havuzun kapasitesi ve doluluğu
function getEquipmentPool(village) {
  const cephane = Object.values(village.villageBuildings).find(b => b.type === 'cephane');
  const capacity = (!cephane || cephane.level < 1)
    ? POOL_DEFAULT
    : cephane.level * (VILLAGE_DEFS.cephane?.poolCapPerLevel || 200);

  let used = 0;
  for (const k of POOL_KEYS) used += village.equipment?.[k] || 0;

  return { capacity, used, free: Math.max(0, capacity - used) };
}

// At kapasitesi (ahır)
function getHorseCap(village) {
  const ahir = Object.values(village.villageBuildings).find(b => b.type === 'ahir');
  if (!ahir || ahir.level < 1) return 0;
  return ahir.level * (VILLAGE_DEFS.ahir?.horseCapPerLevel || 5);
}

// UI/payload için: bir türün üst sınırı olarak görünen değer.
// Havuz türlerinde havuzun TAMAMI döner (tek tür tüm havuzu doldurabilir).
function getEquipmentCap(village, equipmentType) {
  if (equipmentType === 'at') return getHorseCap(village);
  return getEquipmentPool(village).capacity;
}

// Bu tür için yer var mı? Havuz türlerinde havuzun toplam doluluğuna bakılır.
function hasEquipmentRoom(village, equipmentType) {
  if (equipmentType === 'at') {
    return (village.equipment?.at || 0) < getHorseCap(village);
  }
  if (!POOL_KEYS.has(equipmentType)) return true;
  const pool = getEquipmentPool(village);
  return pool.used < pool.capacity;
}

// Bir askeri binanın aktif işçi sayısı
function getBuildingWorkers(village, buildingType) {
  const b = Object.values(village.villageBuildings).find(vb => vb.type === buildingType);
  if (!b || b.level < 1) return 0;
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
// TEK HARİTA: mesafe cezası köy merkezine göre YEREL, arazi bonusu ise
// tarlanın DÜNYA koordinatına göre hesaplanır.
/** Depo/ambar tavanları — tick içinde işlemeden önce ve sonra aynı değerler kullanılır */
function getStorageCaps(village) {
  const caps = { odun:300, kil:300, tas:300, demir:300, tahil:300, kereste:200, tugla:200, yontmaTas:200, demirKulce:200 };
  let granaryCap = 150;
  Object.values(village.villageBuildings).forEach(b => {
    const def = VILLAGE_DEFS[b.type];
    if (!def?.stores || (b.building && b.level === 0)) return;
    const cap = def.baseCapacity + Math.max(0, b.level - 1) * def.capacityPerLevel;
    if (b.type === 'granary') granaryCap += cap;
    else def.stores.forEach(res => { caps[res] = (caps[res] || 0) + cap; });
  });
  return { caps, granaryCap };
}

function getSlotTotalMultiplier(slotKey, buildingType, village) {
  const [q, r] = slotKey.split(',').map(Number);
  const wq = village?.worldQ || 0;
  const wr = village?.worldR || 0;
  return fieldMultiplier(wq, wr, q, r, buildingType);
}

// cost object for upgrading FROM level TO level+1
function getUpgradeCost(type, level) {
  const def = BUILDING_DEFS[type];
  return def.levels[level]?.cost || null;
}

/**
 * Tarla yükseltme süresi — oyun DAKİKASI.
 *
 * `sureSaat` alanının adı "saat" ama değerleri (5, 7, 9.8, 13.7, 19.2 …)
 * Travian'ın DAKİKA cetveline oturuyor (tarla lvl1→2 = 5 dk). Saat sayılsa
 * lvl1→2 beş saat sürerdi; ölçek düzeltilirken bu yorum netleştirildi.
 */
function getUpgradeMinutes(type, level, workers) {
  if (workers <= 0) return Infinity;
  const def = BUILDING_DEFS[type];
  const sureSaat = def.levels[level]?.sureSaat;
  if (!sureSaat) return Infinity;
  return sureSaat / workers;
}
/** Geriye dönük ad — DAKİKA döndürür */
const getUpgradeSeconds = getUpgradeMinutes;

function formatTime(seconds) {
  if (seconds === Infinity) return '—';
  if (seconds < 60) return seconds + 'sn';
  if (seconds < 3600) return Math.ceil(seconds / 60) + 'dk';
  return (seconds / 3600).toFixed(1) + 'sa';
}

function processTick(village, hours = GT.HOURS_PER_TICK) {
  // Sanal saat `hours` kadar ilerler; bütün saatlik oranlar bu kesirle çarpılır
  village.clockMs = (village.clockMs || Date.now()) + GT.hoursToClock(hours);
  const now = village.clockMs;

  // Üretim alanı hex tile'ları (ham madde)
  Object.entries(village.productionTiles).forEach(([slotKey, b]) => {
    const def = BUILDING_DEFS[b.type];
    if (!def) return;

    // Yükseltme sırasında üretim DURMAZ — mevcut seviyeden devam eder.
    // (İlk inşaat, yani level 0, henüz üretmeye başlamamıştır.)
    if (b.workers > 0 && b.level >= 1) {
      // Distance penalty + tile bonus (bonus resource == b.type ise uygulanır)
      const multiplier = getSlotTotalMultiplier(slotKey, b.type, village);
      const perHour = b.workers * def.baseProductionPerWorker * multiplier;
      village.resources[b.type] = (village.resources[b.type] || 0) + perHour * hours;
    }

    if (b.upgrading && now >= b.upgradeEndTime) {
      b.level++;
      b.upgrading = false;
      village.freeWorkers += b.upgradeWorkersAssigned;
      b.upgradeWorkersAssigned = 0;
      b.upgradeEndTime = null;
      if (!village.quiet) console.log(`[UPGRADE] UretimTile ${slotKey} (${b.type}) -> Seviye ${b.level}`);
    }
  });

  // Depo kapasiteleri — İŞLEMEDEN ÖNCE hesaplanır.
  // Sebep: çıktı deposu doluyken girdi tüketilip çıktı çöpe atılıyordu
  // (ölçüm: keresteci 3 işçi, kereste tavanda → 240 odun gitti, 0 kereste geldi).
  const { caps, granaryCap } = getStorageCaps(village);

  // Köy merkezi işleme binaları (ham -> işlenmiş)
  Object.values(village.villageBuildings).forEach(b => {
    const def = VILLAGE_DEFS[b.type];
    // Yükseltilirken de işlemeye devam eder; yalnızca ilk inşaat (level 0) beklemede
    if (!def?.processes || b.level < 1) return;

    const w = b.workers || 0;
    if (w <= 0) return;

    const { input, inputPerHour, output, outputPerHour } = def.processes;
    const ratio     = outputPerHour / inputPerHour;
    const rate      = inputPerHour * w * hours;
    const available = village.resources[input] || 0;
    let toConsume   = Math.min(available, rate);
    if (toConsume <= 0) return;

    // Çıktı için kalan yer kadar tüket — fazlası ham kaynağı boşa harcamak olur.
    // un/ekmek ambarda ortak yer paylaşır, o yüzden tavan ikisinin toplamına bakar.
    const isFood = output === 'un' || output === 'ekmek';
    const cap    = isFood ? granaryCap : (caps[output] ?? Infinity);
    const held   = isFood
      ? (village.resources.un || 0) + (village.resources.ekmek || 0)
      : (village.resources[output] || 0);
    const room   = Math.max(0, cap - held);
    if (room <= 0) return;                       // depo dolu: girdiye dokunma
    toConsume = Math.min(toConsume, room / ratio);
    if (toConsume <= 0) return;

    village.resources[input]  -= toConsume;
    village.resources[output]  = (village.resources[output] || 0) + toConsume * ratio;
  });

  /**
   * Yalnızca TAVANA kırp — YUVARLAMA YOK.
   *
   * Eskiden burada 0,1 hassasiyetle yuvarlanıyordu. Ölçek 1×'e inince bir
   * tick'in üretimi 7/3600 = 0,00194 birim oldu ve HER ARTIŞ yuvarlanarak
   * yok oldu: 3600 ince adım sonunda kaynak hiç artmıyordu (ölçtüm: kaba adım
   * 207 odun, ince adım 200 odun). Yuvarlama artık yalnızca istemciye
   * gönderilirken yapılıyor.
   */
  Object.keys(caps).forEach(k => {
    if (village.resources[k] !== undefined) {
      village.resources[k] = Math.min(village.resources[k] || 0, caps[k]);
    }
  });

  const totalFood = (village.resources.un || 0) + (village.resources.ekmek || 0);
  if (granaryCap <= 0) {
    village.resources.un    = 0;
    village.resources.ekmek = 0;
  } else if (totalFood > granaryCap) {
    const ratio = granaryCap / totalFood;
    village.resources.un    = (village.resources.un    || 0) * ratio;
    village.resources.ekmek = (village.resources.ekmek || 0) * ratio;
  }

  // Ekipman üretim kuyrukları
  processEquipmentQueues(village, now);

  // Birim eğitim kuyrukları
  processUnitQueues(village, now);

  // Beslenme: nüfus + ordu yer, atlar ayrı tahıl tüketir
  processFoodConsumption(village, hours);
}

// ─── Yiyecek tüketimi ─────────────────────────────────────────────
// Köylüler ve askerler sırasıyla ekmek → un → ham tahıl yer.
// Atlar yalnızca ham tahıl tüketir (un/ekmek yemez).
// Yeterli yiyecek yoksa isStarving=true → her STARVE_HOURS_PER_LOSS oyun saatinde 1 nüfus.
function processFoodConsumption(village, hours = GT.HOURS_PER_TICK) {
  const pop     = village.population || 0;
  const army    = Object.values(village.army || {}).reduce((s, c) => s + c, 0);
  const horses  = (village.equipment?.at) || 0;

  // Günlük tüketim → bu adımda geçen oyun saati kadarı
  const villagerRate = (pop    * FOOD_PER_VILLAGER_PER_DAY / HOURS_PER_DAY) * hours;
  const soldierRate  = (army   * FOOD_PER_SOLDIER_PER_DAY  / HOURS_PER_DAY) * hours;
  const horseRate    = (horses * GRAIN_PER_HORSE_PER_DAY   / HOURS_PER_DAY) * hours;

  let foodDebt = villagerRate + soldierRate;

  // Beslenme zinciri: ekmek → un → ham tahıl.
  // Ham gıdaya inildikçe verim düşer, yani fırın/değirmen kurmak kârlı kalır.
  const FOOD_CHAIN = [
    ['ekmek', 1.0],   // 1 birim ekmek = 1 birim doyum
    ['un',    1.5],   // un daha az doyurucu
    ['tahil', 2.5],   // ham tahıl en verimsiz
  ];
  for (const [key, ratio] of FOOD_CHAIN) {
    if (foodDebt <= 1e-9) break;
    const have = village.resources[key] || 0;
    if (have <= 0) continue;
    const take = Math.min(have, foodDebt * ratio);
    village.resources[key] = have - take;
    foodDebt -= take / ratio;
  }

  // Atlar: yalnızca ham tahıl (insanlar yedikten sonra kalan)
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
    village.starveCounter = (village.starveCounter || 0) + hours;
    if (village.starveCounter >= STARVE_HOURS_PER_LOSS) {
      village.starveCounter = 0;

      // 1) Önce asker öl
      const armyEntries = Object.entries(village.army || {}).filter(([, cnt]) => cnt > 0);
      if (armyEntries.length > 0) {
        const [deadType] = armyEntries[0];
        village.army[deadType] -= 1;
        if (!village.quiet) console.log(`[STARVE] Asker kaybı! ${deadType} (kalan: ${village.army[deadType]})`);

      // 2) Asker kalmadıysa ve nüfus minimumun üzerindeyse sivil öl
      } else if (village.population > MIN_POPULATION) {
        village.population -= 1;
        if (village.freeWorkers > 0) village.freeWorkers -= 1;
        if (!village.quiet) console.log(`[STARVE] Nüfus kaybı! Kalan: ${village.population}`);

      // 3) Minimum nüfusa ulaşıldı — artık kimse ölmez
      } else {
        if (!village.quiet) console.log(`[STARVE] Minimum nüfus (${MIN_POPULATION}) korunuyor.`);
      }
    }
  } else {
    village.starveCounter = 0;
  }

  // Negatife düşmesin (yuvarlama yok — bkz. yukarıdaki not)
  ['ekmek', 'un', 'tahil'].forEach(k => {
    if (village.resources[k] !== undefined) {
      village.resources[k] = Math.max(0, village.resources[k]);
    }
  });
}

function processEquipmentQueues(village, now) {
  if (!village.equipmentQueues) return;

  Object.entries(village.equipmentQueues).forEach(([buildingType, queue]) => {
    if (!queue.length) return;

    // Yükseltme üretimi durdurmaz — bina mevcut seviyesiyle çalışmaya devam eder
    const b = Object.values(village.villageBuildings).find(vb => vb.type === buildingType);
    if (!b || b.level < 1) return;

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
      // 2) Depo dolu mu? (havuz türlerinde ORTAK havuza bakılır)
      if (!hasEquipmentRoom(village, order.type)) {
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
      // productionHours GERÇEKTEN saat: işçiye bölünür, en az MIN_PRODUCTION_MINUTES
      const mins = Math.max(MIN_PRODUCTION_MINUTES, (def.productionHours * 60) / workers);
      order.waiting       = false;
      order.waitingReason = null;
      order.startTime     = now;
      order.endTime       = now + GT.minutesToClock(mins);
      order.workersAtStart = workers;
    }

    if (now >= order.endTime) {
      // Bitim anında yine kontrol (cephanelik yıkılmış/küçülmüş olabilir)
      const have = village.equipment[order.type] || 0;
      if (!hasEquipmentRoom(village, order.type)) {
        // Depo doldu → üretilen parça ziyan (kaynak zaten harcandı). Bekletme moduna al.
        order.waiting      = true;
        order.waitingReason = order.type === 'at' ? 'ahir_dolu' : 'cephane_dolu';
        order.startTime = null;
        order.endTime   = null;
        return;
      }
      village.equipment[order.type] = have + 1;
      const capNow = getEquipmentCap(village, order.type);
      if (!village.quiet) console.log(`[EQUIPMENT DONE] ${order.type} -> envanter (${have + 1}/${capNow})`);

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
    // (Yükseltme eğitimi durdurmaz; yalnızca ilk inşaat beklemede)
    const b = Object.values(village.villageBuildings).find(vb => vb.type === buildingType);
    if (!b || b.level < 1) return;

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

      // Süre: temel DAKİKA / eğitmen sayısı, en az MIN_PRODUCTION_MINUTES
      const mins = Math.max(MIN_PRODUCTION_MINUTES,
        getUnitTrainMinutes(order.type) / trainerWorkers);
      order.waiting       = false;
      order.waitingReason = null;
      order.startTime     = now;
      order.endTime       = now + GT.minutesToClock(mins);
      order.workersAtStart = trainerWorkers;
    }

    // Süresi doldu mu?
    if (now >= order.endTime) {
      village.army[order.type] = (village.army[order.type] || 0) + 1;
      // Not: işçi asker oldu, havuza geri dönmez (freeWorkers artmaz)
      if (!village.quiet) console.log(`[UNIT TRAINED] ${order.type} (+1) ${buildingType}`);

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

  const villagerFood = (pop    * FOOD_PER_VILLAGER_PER_DAY) / HOURS_PER_DAY;
  const soldierFood  = (army   * FOOD_PER_SOLDIER_PER_DAY)  / HOURS_PER_DAY;
  const horseGrain   = (horses * GRAIN_PER_HORSE_PER_DAY)   / HOURS_PER_DAY;

  return {
    villagers:    pop,
    soldiers:     army,
    horses,
    foodPerHour:  +(villagerFood + soldierFood).toFixed(2),
    grainPerHour: +horseGrain.toFixed(2),
    dayLengthHours: HOURS_PER_DAY
  };
}

module.exports = {
  processTick,
  processUnitQueues,
  getUpgradeCost,
  getUpgradeSeconds,
  getUpgradeMinutes,
  getUnitTrainSeconds,
  getUnitTrainMinutes,
  getEquipmentCap,
  getEquipmentPool,
  getHorseCap,
  hasEquipmentRoom,
  getBuildingWorkers,
  getConsumptionRates,
  formatTime,
  hexDistanceFromCenter,
  getProductionMultiplier,
  getSlotTotalMultiplier,
  getStorageCaps,
  worldTileBonus,
  localEfficiency,
  fieldMultiplier,
};
