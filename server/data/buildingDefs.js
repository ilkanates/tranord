/**
 * Bina tanımları — sunucu tarafı
 * Yeni bina tipi eklemek için buraya ekle, başka dosyaya dokunma.
 */
const BUILDING_DEFS = {
  odun: {
    name: 'Odun Kesim Yeri',
    icon: '🪵',
    color: '#5a3a1a',
    slots: 3,
    baseProductionPerWorker: 2,   // 1 işçi → 2/saat (level değiştirmez)
    workersPerLevel: 5,            // level 1 = max 5, level 2 = max 10, ...
    upgradeBaseWork: 20,
    upgradeMultiplier: 1.8
  },
  tas: {
    name: 'Taş Ocağı',
    icon: '🪨',
    color: '#7a7068',
    slots: 3,
    baseProductionPerWorker: 1.5,
    workersPerLevel: 5,
    upgradeBaseWork: 25,
    upgradeMultiplier: 1.8
  },
  tugla: {
    name: 'Tuğla Fırını',
    icon: '🧱',
    color: '#9a5030',
    slots: 3,
    baseProductionPerWorker: 1,
    workersPerLevel: 4,
    upgradeBaseWork: 30,
    upgradeMultiplier: 1.9
  },
  demir: {
    name: 'Demir Madeni',
    icon: '⚙️',
    color: '#5a6878',
    slots: 3,
    baseProductionPerWorker: 1,
    workersPerLevel: 4,
    upgradeBaseWork: 35,
    upgradeMultiplier: 2.0
  },
  tahil: {
    name: 'Tarla',
    icon: '🌾',
    color: '#8a7818',
    slots: 6,
    baseProductionPerWorker: 3,
    workersPerLevel: 6,
    upgradeBaseWork: 15,
    upgradeMultiplier: 1.6
  }
};

module.exports = BUILDING_DEFS;
