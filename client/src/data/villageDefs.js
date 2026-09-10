/**
 * Köy Merkezi bina tanımları — istemci tarafı
 *
 * SAVUNMA BONUSU — TAVAN %150, sunucudakiyle BİREBİR aynı formül
 * (server/data/villageDefs.js). Her şey maksimumda (sur 20 + hendek 20 +
 * altı kule lvl20 tam kadro) toplam tam %150 olur: sur %80, hendek %35,
 * kuleler %35. Payları değiştirirken İKİ dosyayı da birlikte güncelle.
 */
export const DEF_BONUS_CAP = 150;

/** Her yapının Lvl 20'deki payı — üçünün toplamı DEF_BONUS_CAP olmalı */
const SUR_MAX    = 80;   // sur tek başına
const HENDEK_MAX = 35;   // hendek tek başına
const KULE_MAX   = 35;   // ALTI kule lvl20 + tam kadro okçu, toplam

/** Seviye eğrisinin ŞEKLİ (Travian sur cetveli) — tavanlar aşağıda veriliyor */
const DEF_CURVE = [0,3.0,6.1,9.3,12.6,15.9,19.4,23.0,26.7,30.5,34.4,38.4,42.6,46.9,51.3,55.8,60.5,65.3,70.2,75.4,80.6];

const r1 = (v) => Math.round(v * 10) / 10;
const CURVE_TOP = DEF_CURVE[DEF_CURVE.length - 1];
/** Eğriyi verilen tavana ölçekler; şekli korur, Lvl 20'de tam `max` olur */
const curveTo = (max) => DEF_CURVE.map(v => r1(v * max / CURVE_TOP));

export const SUR_BONUS    = curveTo(SUR_MAX);
export const HENDEK_BONUS = curveTo(HENDEK_MAX);
export const KULE_BONUS   = curveTo(KULE_MAX);

/**
 * YÜKSELTME MALİYETİ — sunucudaki getScaledUpgradeCost ile BİREBİR aynı.
 * Taban yoksa binanın inşa maliyeti taban kabul edilir; her seviye artışının
 * bir bedeli var. Çarpanı değiştirirken server/index.js'i de güncelle.
 */
export const UPGRADE_MULT_DEFAULT = 1.25;

export function upgradeCostAt(type, currentLevel) {
  const def = VILLAGE_DEFS[type];
  const base = def?.upgradeCostBase || def?.cost;
  if (!base) return null;
  const mult = Math.pow(def.upgradeCostMultiplier || UPGRADE_MULT_DEFAULT,
    Math.max(0, currentLevel - 1));
  return Object.fromEntries(
    Object.entries(base).map(([k, v]) => [k, Math.round(v * mult)])
  );
}

/** Kule slot sayısı — bonus altı slotun ortalaması olarak hesaplanır */
export const TOWER_SLOTS = 6;

/**
 * Bir kulenin savunmaya net katkısı (%): seviye bonusu × okçu doluluğu,
 * altı slota bölünmüş. Sunucudaki towerBonusPct ile aynı formül.
 */
export function towerSlotBonus(level, archers) {
  if (!(level >= 1)) return 0;
  const maxA = level * (VILLAGE_DEFS.kule?.workersPerLevel || 4);
  if (maxA <= 0) return 0;
  const fill = Math.min(1, Math.max(0, (archers || 0) / maxA));
  const lv = Math.min(Math.floor(level), KULE_BONUS.length - 1);
  return Math.round((KULE_BONUS[lv] || 0) * fill / TOWER_SLOTS * 10) / 10;
}

const VILLAGE_DEFS = {

  // ── Merkez ──────────────────────────────────────────────────────
  anaBina: { cpPerLevel:2,
    name:'Ana Bina', category:'merkez', icon:'🏛️',
    description:'Köyün kalbi. Her seviye +1 üretim alanı slotu açar. Lvl 1: 6 slot, Lvl 20: 25 slot (maks).',
    unique:true, maxLevel:20,
    buildBaseWork:50, buildMultiplier:1.8,
    upgradeCostBase:{ kereste:60, tugla:80, yontmaTas:50, demirKulce:30 },
    upgradeCostMultiplier:1.7,
    cost:{ kereste:0, tugla:0, yontmaTas:0, demirKulce:0 }
  },

  // ── İşleme Binaları ─────────────────────────────────────────────
  keresteci: { cpPerLevel:1,
    name:'Keresteci', category:'isleme', icon:'🪚',
    description:'Odunu keresteye dönüştürür. 1 işçi: 8 odun -> 6 kereste/sa.',
    unique:true, maxLevel:20, workersPerLevel:5,
    processes:{ input:'odun', inputPerHour:8, output:'kereste', outputPerHour:6 },
    buildBaseWork:20, buildMultiplier:1.8, cost:{ odun:100, tas:40 }
  },
  tuglaci: { cpPerLevel:1,
    name:'Tuğlacı', category:'isleme', icon:'🧱',
    description:'Kili pişirerek tuğla üretir. 1 işçi: 8 kil -> 6 tuğla/sa.',
    unique:true, maxLevel:20, workersPerLevel:5,
    processes:{ input:'kil', inputPerHour:8, output:'tugla', outputPerHour:6 },
    buildBaseWork:20, buildMultiplier:1.7, cost:{ odun:60, kil:50 }
  },
  tasci: { cpPerLevel:1,
    name:'Taşçı', category:'isleme', icon:'🪨',
    description:'Ham taşı yontar. 1 işçi: 8 taş -> 6 yontma taş/sa.',
    unique:true, maxLevel:20, workersPerLevel:5,
    processes:{ input:'tas', inputPerHour:8, output:'yontmaTas', outputPerHour:6 },
    buildBaseWork:20, buildMultiplier:1.7, cost:{ odun:70, tas:40 }
  },
  demirci: { cpPerLevel:1,
    name:'Demirci', category:'isleme', icon:'🔨',
    description:'Demir cevherini külçe demire dönüştürür. 1 işçi: 5 demir -> 4 külçe/sa.',
    unique:true, maxLevel:20, workersPerLevel:5,
    processes:{ input:'demir', inputPerHour:5, output:'demirKulce', outputPerHour:4 },
    buildBaseWork:20, buildMultiplier:1.8, cost:{ odun:80, tas:40 }
  },
  degirmen: { cpPerLevel:1,
    name:'Değirmen', category:'isleme', icon:'⚙️',
    description:'Tahılı una öğütür. 1 işçi: 90 tahıl -> 72 un/sa. Darboğaz tahıl üretimidir.',
    unique:true, maxLevel:20, workersPerLevel:5,
    processes:{ input:'tahil', inputPerHour:90, output:'un', outputPerHour:72 },
    buildBaseWork:20, buildMultiplier:1.7, cost:{ odun:90, tas:30 }
  },
  firin: { cpPerLevel:1,
    name:'Fırın', category:'isleme', icon:'🔥',
    description:'Unu ekmek hâline getirir. 1 işçi: 72 un -> 54 ekmek/sa.',
    unique:true, maxLevel:20, workersPerLevel:5,
    processes:{ input:'un', inputPerHour:72, output:'ekmek', outputPerHour:54 },
    buildBaseWork:20, buildMultiplier:1.7, cost:{ odun:60, kil:40 }
  },

  // ── Askeri ──────────────────────────────────────────────────────
  zirh:         { cpPerLevel:1, name:'Zırhçı',          category:'askeri', icon:'🛡️', description:'Zırh ve kalkan üretir. İşçi sayısı üretim hızını belirler (süre = temel / işçi).',
                   unique:true, maxLevel:20, workersPerLevel:3, buildBaseWork:25, buildMultiplier:1.8, upgradeCostBase:{ kereste:70, yontmaTas:30, demirKulce:20 }, upgradeCostMultiplier:1.6, cost:{ kereste:70, yontmaTas:30, demirKulce:20 } },
  silahci:      { cpPerLevel:1, name:'Silahçı',         category:'askeri', icon:'⚔️', description:'Kılıç ve mızrak üretir. İşçi sayısı üretim hızını belirler (süre = temel / işçi).',
                   unique:true, maxLevel:20, workersPerLevel:3, buildBaseWork:25, buildMultiplier:1.8, upgradeCostBase:{ kereste:70, yontmaTas:30, demirKulce:20 }, upgradeCostMultiplier:1.6, cost:{ kereste:70, yontmaTas:30, demirKulce:20 } },
  ahir:         { cpPerLevel:1, name:'Ahır',            category:'askeri', icon:'🐎', description:'At yetiştirir ve süvari birliklerini eğitir. Seviye × 5 at kapasitesi.',
                   unique:true, maxLevel:20, workersPerLevel:3, horseCapPerLevel:5, buildBaseWork:35, buildMultiplier:1.9, upgradeCostBase:{ kereste:100, tahil:60 }, upgradeCostMultiplier:1.7, cost:{ kereste:100, tahil:60 } },
  runSalonu:    { cpPerLevel:2, name:'Rún Salonu',       category:'askeri',   icon:'\u16b1', description:'Birimler burada araştırılır. Bir birimi eğitebilmek için hem kışla/ahır seviyesi hem BURADAKİ araştırma gerekir. Araştırmacı sayısı süreyi kısaltır.',
                   unique:true,  maxLevel:10, workersPerLevel:3, researches:true,
                   buildBaseWork:40, buildMultiplier:1.9, cost:{ kereste:140, yontmaTas:90, demirKulce:40 },
                   upgradeCostBase:{ kereste:140, yontmaTas:90, demirKulce:40 }, upgradeCostMultiplier:1.7 },
  kisla:        { cpPerLevel:1, name:'Kışla',           category:'askeri', icon:'🛡️', description:'Piyade askerlerini eğitir. İşçi sayısı eğitim süresini kısaltır.',
                   unique:true, maxLevel:20, workersPerLevel:3, buildBaseWork:35, buildMultiplier:1.9, upgradeCostBase:{ kereste:100, yontmaTas:60 }, upgradeCostMultiplier:1.7, cost:{ kereste:100, yontmaTas:60 } },
  atolye:       { cpPerLevel:1, name:'Atölye',          category:'askeri', icon:'🏗️', description:'Kuşatma silahları üreten bina.',
                   unique:true, maxLevel:20, workersPerLevel:3, buildBaseWork:30, buildMultiplier:1.9, upgradeCostBase:{ kereste:120, demirKulce:40 }, upgradeCostMultiplier:1.7, cost:{ kereste:120, demirKulce:40 } },
  cephane:      { cpPerLevel:1, name:'Cephanelik',      category:'askeri', icon:'🏹', description:'Kılıç/mızrak/kalkan/zırh depolar. Her seviye +50 kapasite.',
                   unique:true, maxLevel:20, equipmentCapPerLevel:50, poolCapPerLevel:200, buildBaseWork:30, buildMultiplier:1.8, upgradeCostBase:{ kereste:100, yontmaTas:60, demirKulce:20 }, upgradeCostMultiplier:1.6, cost:{ kereste:100, yontmaTas:60, demirKulce:20 } },
  saglikCadiri: { cpPerLevel:1, name:'Sağlık Çadırı',   category:'askeri', icon:'⛺', description:'Yaralı askerleri iyileştiren bina.',             unique:true, maxLevel:20, buildBaseWork:25, buildMultiplier:1.7, cost:{ kereste:60, tahil:30 } },

  // ── Depo ────────────────────────────────────────────────────────
  hammaddeDepo: { cpPerLevel:1,
    name:'Hammadde Deposu', category:'depo', icon:'📦',
    description:'Ham odun, kil, taş ve demir depolar.',
    unique:true, repeatableWhenMaxed:true, maxLevel:20,
    stores:['odun','kil','tas','demir'],
    baseCapacity:3000, capacityPerLevel:1500,
    buildBaseWork:30, buildMultiplier:1.8, cost:{ kereste:100, yontmaTas:50, tugla:30 }
  },
  islenmisMalDepo: { cpPerLevel:1,
    name:'İşlenmiş Mal Deposu', category:'depo', icon:'🏭',
    description:'Kereste, tuğla, yontma taş ve külçe demir depolar.',
    unique:true, repeatableWhenMaxed:true, maxLevel:20,
    stores:['kereste','tugla','yontmaTas','demirKulce'],
    baseCapacity:2400, capacityPerLevel:1200,
    buildBaseWork:30, buildMultiplier:1.8, cost:{ kereste:80, yontmaTas:50, tugla:40 }
  },
  tahilAmbar: { cpPerLevel:1,
    name:'Tahıl Ambarı', category:'depo', icon:'🌾',
    description:'Ham tahıl depolar.',
    unique:true, repeatableWhenMaxed:true, maxLevel:20,
    stores:['tahil'],
    baseCapacity:12000, capacityPerLevel:6000,
    buildBaseWork:25, buildMultiplier:1.7, cost:{ kereste:80, yontmaTas:40 }
  },
  granary: { cpPerLevel:1,
    name:'Granary', category:'depo', icon:'🍞',
    description:'Un ve ekmek depolar.',
    unique:true, repeatableWhenMaxed:true, maxLevel:20,
    stores:['un','ekmek'],
    baseCapacity:2500, capacityPerLevel:1250,
    buildBaseWork:25, buildMultiplier:1.7, cost:{ kereste:80, tugla:50 }
  },

  // ── Ekonomik ────────────────────────────────────────────────────
  pazar:      { cpPerLevel:2, name:'Pazar',              category:'ekonomik', icon:'🏪', description:'Hammadde al-sat.',                              unique:true, maxLevel:20, buildBaseWork:40, buildMultiplier:1.8, cost:{ kereste:100, yontmaTas:80 } },
  loncaDemir: { cpPerLevel:2, name:'Demirciler Loncası', category:'ekonomik', icon:'🔩', description:'Demir üretimini artırır. +%5/seviye. Maks 5.', unique:true, maxLevel:5, bonusPerLevel:5, affects:'demir',  buildBaseWork:30, buildMultiplier:2.0, cost:{ kereste:80, demirKulce:50 } },
  loncaOdun:  { cpPerLevel:2, name:'Oduncular Loncası',  category:'ekonomik', icon:'🪓', description:'Odun üretimini artırır. +%5/seviye. Maks 5.',  unique:true, maxLevel:5, bonusPerLevel:5, affects:'odun',   buildBaseWork:30, buildMultiplier:2.0, cost:{ kereste:100, yontmaTas:40 } },
  loncaTas:   { cpPerLevel:2, name:'Taşçılar Loncası',   category:'ekonomik', icon:'⛏️', description:'Taş üretimini artırır. +%5/seviye. Maks 5.',   unique:true, maxLevel:5, bonusPerLevel:5, affects:'tas',    buildBaseWork:30, buildMultiplier:2.0, cost:{ kereste:80, yontmaTas:60 } },
  loncaKil:   { cpPerLevel:2, name:'Kilciler Loncası',   category:'ekonomik', icon:'🟫', description:'Kil üretimini artırır. +%5/seviye. Maks 5.',   unique:true, maxLevel:5, bonusPerLevel:5, affects:'kil',    buildBaseWork:30, buildMultiplier:2.0, cost:{ kereste:80, tugla:60 } },
  loncaTahil: { cpPerLevel:2, name:'Tahılcılar Loncası', category:'ekonomik', icon:'🌾', description:'Tahıl üretimini artırır. +%5/seviye. Maks 5.', unique:true, maxLevel:5, bonusPerLevel:5, affects:'tahil',  buildBaseWork:30, buildMultiplier:2.0, cost:{ kereste:80, tahil:60 } },

  // ── Yönetim ─────────────────────────────────────────────────────
  // Köşk ve Saray yeni köy KURMA HAKKI verir; ikisi bir arada olamaz
  // (Travian kuralı). Saray yalnız MERKEZ köye kurulabilir ve yıkılıp
  // başka köyde kurulunca merkez oraya taşınır.
  kosk: {
    name:'Köşk', category:'yonetim', icon:'🏯',
    description:'Yeni köy kurma hakkı verir: Lvl 10 ve Lvl 20\'de birer hak. Göçmen burada eğitilir. Sarayla birlikte olamaz.',
    unique:true, maxLevel:20, cpPerLevel:3,
    expansionAt:[10, 20], trainsSettlers:true, excludes:'saray',
    buildBaseWork:40, buildMultiplier:1.8,
    upgradeCostBase:{ kereste:120, tugla:100, yontmaTas:80, demirKulce:40 },
    upgradeCostMultiplier:1.7,
    cost:{ kereste:120, tugla:100, yontmaTas:80, demirKulce:40 }
  },
  saray: {
    name:'Saray', category:'yonetim', icon:'👑',
    description:'Oyuncunun YALNIZ BİR köyünde olabilir. Lvl 10, 15 ve 20\'de birer yeni köy hakkı verir. Göçmen burada da eğitilir. İçinden "bu köyü merkez yap" denilebilir. Köşkle birlikte olamaz.',
    unique:true, maxLevel:20, cpPerLevel:4,
    expansionAt:[10, 15, 20], trainsSettlers:true, excludes:'kosk',
    // Oyuncu capinda tek: baska koye kurmak icin once buradaki yikilmali.
    oncePerPlayer:true, canSetCapital:true,
    buildBaseWork:60, buildMultiplier:1.9,
    upgradeCostBase:{ kereste:200, tugla:180, yontmaTas:150, demirKulce:100 },
    upgradeCostMultiplier:1.7,
    cost:{ kereste:200, tugla:180, yontmaTas:150, demirKulce:100 }
  },
  taverna: {
    name:'Taverna', category:'yonetim', icon:'🍺',
    description:'Şölen düzenleyip kültür puanı üretir. Küçük şölen bu köyün, büyük şölen bütün köylerin günlük üretimi kadar puan verir.',
    unique:true, maxLevel:20, cpPerLevel:3,
    festival:true,
    buildBaseWork:35, buildMultiplier:1.7,
    upgradeCostBase:{ kereste:150, tugla:120, tahil:100 },
    upgradeCostMultiplier:1.6,
    cost:{ kereste:150, tugla:120, tahil:100 }
  },

  // ── Nüfus ───────────────────────────────────────────────────────
  ev: { cpPerLevel:1,
    name:'Ev', category:'nufus', icon:'🏠',
    description:'Her seviye 100 nüfus kapasitesi ekler.',
    unique:false, maxLevel:5, populationPerLevel:100,
    buildBaseWork:15, buildMultiplier:1.6, cost:{ kereste:80, tugla:50 }
  },

  // ── Savunma ─────────────────────────────────────────────────────
  sur:    { cpPerLevel:1, name:'Sur',            category:'savunma', icon:'🏰', description:'Savunmacılara savunma bonusu. Maks Lvl 20.',  unique:true,  maxLevel:20, buildBaseWork:50, buildMultiplier:2.0, bonusTable:SUR_BONUS, cost:{ yontmaTas:160, kereste:40 } },
  hendek: { cpPerLevel:1, name:'Hendek',         category:'savunma', icon:'〰️', description:'Sur ile birleşik, yarı bonus. Maks Lvl 20.', unique:true,  maxLevel:20, buildBaseWork:40, buildMultiplier:1.9, bonusTable:HENDEK_BONUS, cost:{ kereste:40, yontmaTas:80 } },
  kule:   { cpPerLevel:1, name:'Savunma Kulesi', category:'savunma', icon:'🗼', description:'Kuleye atanan askerlere iki kat bonus.',      unique:false, maxLevel:20, buildBaseWork:45, buildMultiplier:2.0, bonusTable:KULE_BONUS, maxInstances:6, workersPerLevel:4, cost:{ kereste:80, yontmaTas:80, demirKulce:40 } }
};

/** Evsiz köyün taban nüfus kapasitesi — sunucudaki BASE_POPULATION ile aynı */
export const BASE_POPULATION = 50;

export default VILLAGE_DEFS;
