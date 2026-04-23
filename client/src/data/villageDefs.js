/**
 * Köy Merkezi bina tanımları — istemci tarafı
 */

const VILLAGE_DEFS = {

  // ── Merkez ──────────────────────────────────────────────────────
  anaBina: {
    name:'Ana Bina', category:'merkez', icon:'🏛️',
    description:'Köyün kalbi. Her seviye +1 üretim alanı slotu açar. Lvl 1: 6 slot, Lvl 11: 16 slot (maks).',
    unique:true, maxLevel:11,
    buildBaseWork:50, buildMultiplier:1.8,
    upgradeCostBase:{ kereste:60, tugla:80, yontmaTas:50, demirKulce:30 },
    upgradeCostMultiplier:1.7,
    cost:{ kereste:0, tugla:0, yontmaTas:0, demirKulce:0 }
  },

  // ── İşleme Binaları ─────────────────────────────────────────────
  keresteci: {
    name:'Keresteci', category:'isleme', icon:'🪚',
    description:'Odunu keresteye dönüştürür. 1 işçi: 8 odun -> 6 kereste/sa.',
    unique:true, maxLevel:null, workersPerLevel:3,
    processes:{ input:'odun', inputPerHour:8, output:'kereste', outputPerHour:6 },
    buildBaseWork:20, buildMultiplier:1.8, cost:{ odun:100, tas:40 }
  },
  tuglaci: {
    name:'Tuğlacı', category:'isleme', icon:'🧱',
    description:'Kili pişirerek tuğla üretir. 1 işçi: 8 kil -> 6 tuğla/sa.',
    unique:true, maxLevel:null, workersPerLevel:3,
    processes:{ input:'kil', inputPerHour:8, output:'tugla', outputPerHour:6 },
    buildBaseWork:20, buildMultiplier:1.7, cost:{ odun:60, kil:50 }
  },
  tasci: {
    name:'Taşçı', category:'isleme', icon:'🪨',
    description:'Ham taşı yontar. 1 işçi: 8 taş -> 6 yontma taş/sa.',
    unique:true, maxLevel:null, workersPerLevel:3,
    processes:{ input:'tas', inputPerHour:8, output:'yontmaTas', outputPerHour:6 },
    buildBaseWork:20, buildMultiplier:1.7, cost:{ odun:70, tas:40 }
  },
  demirci: {
    name:'Demirci', category:'isleme', icon:'🔨',
    description:'Demir cevherini külçe demire dönüştürür. 1 işçi: 5 demir -> 4 külçe/sa.',
    unique:true, maxLevel:null, workersPerLevel:3,
    processes:{ input:'demir', inputPerHour:5, output:'demirKulce', outputPerHour:4 },
    buildBaseWork:20, buildMultiplier:1.8, cost:{ odun:80, tas:40 }
  },
  degirmen: {
    name:'Değirmen', category:'isleme', icon:'⚙️',
    description:'Tahılı una öğütür. 1 işçi: 10 tahıl -> 8 un/sa.',
    unique:true, maxLevel:null, workersPerLevel:3,
    processes:{ input:'tahil', inputPerHour:10, output:'un', outputPerHour:8 },
    buildBaseWork:20, buildMultiplier:1.7, cost:{ odun:90, tas:30 }
  },
  firin: {
    name:'Fırın', category:'isleme', icon:'🔥',
    description:'Unu ekmek hâline getirir. 1 işçi: 8 un -> 6 ekmek/sa.',
    unique:true, maxLevel:null, workersPerLevel:3,
    processes:{ input:'un', inputPerHour:8, output:'ekmek', outputPerHour:6 },
    buildBaseWork:20, buildMultiplier:1.7, cost:{ odun:60, kil:40 }
  },

  // ── Askeri ──────────────────────────────────────────────────────
  zirh:         { name:'Zırhçı',          category:'askeri', icon:'🛡️', description:'Zırh ve kalkan üretir. İşçi sayısı üretim hızını belirler (süre = temel / işçi).',
                   unique:true, maxLevel:null, workersPerLevel:3, buildBaseWork:25, buildMultiplier:1.8, cost:{ kereste:70, yontmaTas:30, demirKulce:20 } },
  silahci:      { name:'Silahçı',         category:'askeri', icon:'⚔️', description:'Kılıç ve mızrak üretir. İşçi sayısı üretim hızını belirler (süre = temel / işçi).',
                   unique:true, maxLevel:null, workersPerLevel:3, buildBaseWork:25, buildMultiplier:1.8, cost:{ kereste:70, yontmaTas:30, demirKulce:20 } },
  ahir:         { name:'Ahır',            category:'askeri', icon:'🐎', description:'At yetiştirir ve süvari birliklerini eğitir. Seviye × 5 at kapasitesi.',
                   unique:true, maxLevel:null, workersPerLevel:3, horseCapPerLevel:5, buildBaseWork:35, buildMultiplier:1.9, cost:{ kereste:100, tahil:60 } },
  kisla:        { name:'Kışla',           category:'askeri', icon:'🛡️', description:'Piyade askerlerini eğitir. İşçi sayısı eğitim süresini kısaltır.',
                   unique:true, maxLevel:null, workersPerLevel:3, buildBaseWork:35, buildMultiplier:1.9, cost:{ kereste:100, yontmaTas:60 } },
  atolye:       { name:'Atölye',          category:'askeri', icon:'🏗️', description:'Kuşatma silahları üreten bina.',
                   unique:true, maxLevel:null, workersPerLevel:3, buildBaseWork:30, buildMultiplier:1.9, cost:{ kereste:120, demirKulce:40 } },
  cephane:      { name:'Cephanelik',      category:'askeri', icon:'🏹', description:'Kılıç/mızrak/kalkan/zırh depolar. Her seviye +50 kapasite.',
                   unique:true, maxLevel:null, equipmentCapPerLevel:50, buildBaseWork:30, buildMultiplier:1.8, cost:{ kereste:100, yontmaTas:60, demirKulce:20 } },
  saglikCadiri: { name:'Sağlık Çadırı',   category:'askeri', icon:'⛺', description:'Yaralı askerleri iyileştiren bina.',             unique:true, maxLevel:null, buildBaseWork:25, buildMultiplier:1.7, cost:{ kereste:60, tahil:30 } },

  // ── Depo ────────────────────────────────────────────────────────
  hammaddeDepo: {
    name:'Hammadde Deposu', category:'depo', icon:'📦',
    description:'Ham odun, kil, taş, demir ve tahıl depolar.',
    unique:true, maxLevel:null,
    stores:['odun','kil','tas','demir'],
    baseCapacity:1000, capacityPerLevel:500,
    buildBaseWork:30, buildMultiplier:1.8, cost:{ kereste:100, yontmaTas:50, tugla:30 }
  },
  islenmisMalDepo: {
    name:'İşlenmiş Mal Deposu', category:'depo', icon:'🏭',
    description:'Kereste, tuğla, yontma taş ve külçe demir depolar.',
    unique:true, maxLevel:null,
    stores:['kereste','tugla','yontmaTas','demirKulce'],
    baseCapacity:800, capacityPerLevel:400,
    buildBaseWork:30, buildMultiplier:1.8, cost:{ kereste:80, yontmaTas:50, tugla:40 }
  },
  tahilAmbar: {
    name:'Tahıl Ambarı', category:'depo', icon:'🌾',
    description:'Ham tahıl depolar.',
    unique:true, maxLevel:null,
    stores:['tahil'],
    baseCapacity:2000, capacityPerLevel:1000,
    buildBaseWork:25, buildMultiplier:1.7, cost:{ kereste:80, yontmaTas:40 }
  },
  granary: {
    name:'Granary', category:'depo', icon:'🍞',
    description:'Un ve ekmek depolar.',
    unique:true, maxLevel:null,
    stores:['un','ekmek'],
    baseCapacity:500, capacityPerLevel:250,
    buildBaseWork:25, buildMultiplier:1.7, cost:{ kereste:80, tugla:50 }
  },

  // ── Ekonomik ────────────────────────────────────────────────────
  pazar:      { name:'Pazar',              category:'ekonomik', icon:'🏪', description:'Hammadde al-sat.',                              unique:true, maxLevel:null, buildBaseWork:40, buildMultiplier:1.8, cost:{ kereste:100, yontmaTas:80 } },
  loncaDemir: { name:'Demirciler Loncası', category:'ekonomik', icon:'🔩', description:'Demir üretimini artırır. +%5/seviye. Maks 5.', unique:true, maxLevel:5, bonusPerLevel:5, affects:'demir',  buildBaseWork:30, buildMultiplier:2.0, cost:{ kereste:80, demirKulce:50 } },
  loncaOdun:  { name:'Oduncular Loncası',  category:'ekonomik', icon:'🪓', description:'Odun üretimini artırır. +%5/seviye. Maks 5.',  unique:true, maxLevel:5, bonusPerLevel:5, affects:'odun',   buildBaseWork:30, buildMultiplier:2.0, cost:{ kereste:100, yontmaTas:40 } },
  loncaTas:   { name:'Taşçılar Loncası',   category:'ekonomik', icon:'⛏️', description:'Taş üretimini artırır. +%5/seviye. Maks 5.',   unique:true, maxLevel:5, bonusPerLevel:5, affects:'tas',    buildBaseWork:30, buildMultiplier:2.0, cost:{ kereste:80, yontmaTas:60 } },
  loncaKil:   { name:'Kilciler Loncası',   category:'ekonomik', icon:'🟫', description:'Kil üretimini artırır. +%5/seviye. Maks 5.',   unique:true, maxLevel:5, bonusPerLevel:5, affects:'kil',    buildBaseWork:30, buildMultiplier:2.0, cost:{ kereste:80, tugla:60 } },
  loncaTahil: { name:'Tahılcılar Loncası', category:'ekonomik', icon:'🌾', description:'Tahıl üretimini artırır. +%5/seviye. Maks 5.', unique:true, maxLevel:5, bonusPerLevel:5, affects:'tahil',  buildBaseWork:30, buildMultiplier:2.0, cost:{ kereste:80, tahil:60 } },

  // ── Nüfus ───────────────────────────────────────────────────────
  ev: {
    name:'Ev', category:'nufus', icon:'🏠',
    description:'Her seviye 50 nüfus kapasitesi ekler.',
    unique:false, maxLevel:5, populationPerLevel:50,
    buildBaseWork:15, buildMultiplier:1.6, cost:{ kereste:80, tugla:50 }
  },

  // ── Savunma ─────────────────────────────────────────────────────
  sur:    { name:'Sur',            category:'savunma', icon:'🏰', description:'Savunmacılara savunma bonusu. Maks Lvl 20.',  unique:true,  maxLevel:20, buildBaseWork:50, buildMultiplier:2.0, bonusTable:null, cost:{ yontmaTas:160, kereste:40 } },
  hendek: { name:'Hendek',         category:'savunma', icon:'〰️', description:'Sur ile birleşik, yarı bonus. Maks Lvl 20.', unique:true,  maxLevel:20, buildBaseWork:40, buildMultiplier:1.9, bonusTable:null, cost:{ kereste:40, yontmaTas:80 } },
  kule:   { name:'Savunma Kulesi', category:'savunma', icon:'🗼', description:'Kuleye atanan askerlere iki kat bonus.',      unique:false, maxLevel:20, buildBaseWork:45, buildMultiplier:2.0, bonusTable:null, maxInstances:4, cost:{ kereste:80, yontmaTas:80, demirKulce:40 } }
};

export default VILLAGE_DEFS;
