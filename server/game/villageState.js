/**
 * Yeni köy başlangıç state'i oluşturur.
 * Her kullanıcı için ayrı bir kopya döndürülür.
 */

const TOWER_SLOTS_ARR    = ['0,-2', '2,-1', '0,2', '-2,1'];
const PRODUCTION_RING_1  = ['1,0', '1,-1', '0,-1', '-1,0', '-1,1', '0,1'];

function createVillage() {
  return {
    population: 50,
    maxPopulation: 50,
    freeWorkers: 50,
    tickCount: 0,

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
  // TOWER_SLOTS JSON'da array olarak saklanır, Set'e çevir
  if (Array.isArray(raw.TOWER_SLOTS)) {
    raw.TOWER_SLOTS = new Set(raw.TOWER_SLOTS);
  } else if (!raw.TOWER_SLOTS) {
    raw.TOWER_SLOTS = new Set(TOWER_SLOTS_ARR);
  }

  if (!Array.isArray(raw.PRODUCTION_RING_1)) {
    raw.PRODUCTION_RING_1 = [...PRODUCTION_RING_1];
  }

  // endTime alanları sayıya dön (JSON'da number olarak saklanır, sorun yok)
  return raw;
}

module.exports = { createVillage, hydrateVillage };
