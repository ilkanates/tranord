/**
 * Yeni köy başlangıç state'i oluşturur.
 * Her kullanıcı için ayrı bir kopya döndürülür.
 */

const TOWER_SLOTS_ARR    = ['0,-2', '2,-1', '0,2', '-2,1'];
const PRODUCTION_RING_1  = ['1,0', '1,-1', '0,-1', '-1,0', '-1,1', '0,1'];

function createVillage(worldQ = 0, worldR = 0) {
  return {
    // TEK HARİTA: köyün dünya üzerindeki merkez koordinatı.
    // Üretim tarlaları bu merkeze GÖRE yerel anahtarlarla tutulur ('1,0' gibi);
    // arazi bonusu hesaplanırken worldQ+localQ kullanılır.
    worldQ, worldR,

    population: 50,
    maxPopulation: 50,
    freeWorkers: 50,
    tickCount: 0,
    // Sanal köy saati. İnşaat/yükseltme/kuyruk sayaçları BUNA bakar, Date.now()'a değil.
    // Böylece hızlı ileri alma (tohumlama, offline telafi) sırasında da inşaatlar tamamlanır.
    clockMs: Date.now(),

    isStarving: false,
    starveCounter: 0,

    resources: {
      odun: 200, kil: 150, tas: 150, demir: 50, tahil: 300,
      kereste: 0, tugla: 0, yontmaTas: 0, demirKulce: 0,
      un: 0, ekmek: 0
    },

    equipment: {
      kilic: 0, mizrak: 0, kalkan: 0, zirh: 0, at: 0
    },

    equipmentQueues: {
      silahci: [],
      zirh:    [],
      ahir:    []
    },
    nextOrderId: 1,

    army: {},

    // SEFERLER: bu köyden çıkan hareketler burada durur (sahiplik = kalıcılık).
    // Zaman alanları Date.now() tabanlı — köyün sanal saati DEĞİL; gerekçe
    // game/army.js başındaki nota bakınız.
    marches: [],
    reports: [],
    nextMarchId: 1,
    // Kalıcı savaş sayaçları (istatistik sıralamaları) — bkz. game/army.js
    stats: {
      attacksSent: 0, attacksWon: 0, killsOffense: 0, lossesOffense: 0,
      lootTotal: 0, scoutsSent: 0,
      defensesTotal: 0, defensesWon: 0, killsDefense: 0, lossesDefense: 0,
      lootLostTotal: 0,
    },

    unitQueues: {
      kisla:  [],
      ahir:   [],
      atolye: []
    },
    nextUnitOrderId: 1,

    productionTiles: {
      '1,0':  { type: 'odun',  level: 1, workers: 0, upgrading: false, upgradeEndTime: null, upgradeWorkersAssigned: 0 },
      '1,-1': { type: 'kil',   level: 1, workers: 0, upgrading: false, upgradeEndTime: null, upgradeWorkersAssigned: 0 },
      '0,-1': { type: 'tas',   level: 1, workers: 0, upgrading: false, upgradeEndTime: null, upgradeWorkersAssigned: 0 },
      '-1,0': { type: 'demir', level: 1, workers: 0, upgrading: false, upgradeEndTime: null, upgradeWorkersAssigned: 0 },
      '-1,1': { type: 'tahil', level: 1, workers: 0, upgrading: false, upgradeEndTime: null, upgradeWorkersAssigned: 0 },
      '0,1':  { type: 'tahil', level: 1, workers: 0, upgrading: false, upgradeEndTime: null, upgradeWorkersAssigned: 0 }
    },

    villageBuildings: {
      '0,0':   { type: 'anaBina',   level: 1 },
      '1,0':   { type: 'keresteci', level: 1, workers: 0 },
      '0,1':   { type: 'tuglaci',   level: 1, workers: 0 },
      '-1,1':  { type: 'tasci',     level: 1, workers: 0 },
      '-1,0':  { type: 'demirci',   level: 1, workers: 0 },
      '0,-1':  { type: 'degirmen',  level: 1, workers: 0 },
      '1,-1':  { type: 'firin',     level: 1, workers: 0 }
    },

    TOWER_SLOTS:      new Set(TOWER_SLOTS_ARR),
    PRODUCTION_RING_1: [...PRODUCTION_RING_1]
  };
}

/**
 * DB'den yüklenen JSON'u tekrar çalışır hale getirir.
 * (Set'leri ve tarih alanlarını restore eder)
 */
function hydrateVillage(raw) {
  // Eski kayıtlarda sanal saat yok: duvar saatiyle başlat, mevcut mutlak
  // zaman damgaları böylece doğru kalan süreyi verir.
  if (typeof raw.clockMs !== 'number') raw.clockMs = Date.now();
  /**
   * TOWER_SLOTS her şekilden onarılır.
   *
   * Eski bir kayıt yolunda Set, diziye çevrilmeden JSON'a yazılmış ve diskte
   * `{}` olarak kalmış (478 dünya kaydından 6'sında). Eski kontrol yalnız dizi
   * ve "yok" hâllerini tanıdığı için `{}` olduğu gibi geçiyordu; sonra kayıt
   * sırasındaki `[...state.TOWER_SLOTS]` patlıyor ve o turdaki BÜTÜN NPC
   * kaydı iptal oluyordu. Kule slotları sabit bir liste olduğu için
   * varsayılana dönmek tam onarım demek.
   */
  if (Array.isArray(raw.TOWER_SLOTS)) {
    raw.TOWER_SLOTS = new Set(raw.TOWER_SLOTS);
  } else if (!(raw.TOWER_SLOTS instanceof Set)) {
    raw.TOWER_SLOTS = new Set(TOWER_SLOTS_ARR);
  }

  if (!Array.isArray(raw.PRODUCTION_RING_1)) {
    raw.PRODUCTION_RING_1 = [...PRODUCTION_RING_1];
  }

  // Eski kayıtlarda dünya konumu yoktu
  if (typeof raw.worldQ !== 'number') raw.worldQ = 0;
  if (typeof raw.worldR !== 'number') raw.worldR = 0;

  // Sefer sistemi öncesi kayıtlar
  if (!raw.stats || typeof raw.stats !== 'object') raw.stats = {};
  if (!Array.isArray(raw.marches)) raw.marches = [];
  if (!Array.isArray(raw.reports)) raw.reports = [];
  if (typeof raw.nextMarchId !== 'number') {
    raw.nextMarchId = raw.marches.reduce((m, x) => Math.max(m, (x.id || 0) + 1), 1);
  }

  // endTime alanları sayıya dön (JSON'da number olarak saklanır, sorun yok)
  return raw;
}

module.exports = { createVillage, hydrateVillage };
