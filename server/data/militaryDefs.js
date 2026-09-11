/**
 * Askeri sistem tanımları
 * Ekipman bazlı birim sistemi — köylü ne kuşanırsa o olur.
 *
 * Temel değerler (ekipsiz asker):
 *   Saldırı: 0 | Yaya Sav: 10 | Atlı Sav: 10 | Hız: 10 | Kapasite: 60
 *
 * Ekipman katkıları toplanarak birim değerleri oluşur.
 * Her asker 1 tahıl/gün tüketir.
 */

// ── Ekipman katkı tablosu ──────────────────────────────────────────
// cost: işlenmiş bileşenlerle ödenir (kereste/tugla/yontmaTas/demirKulce).
// productionHours: test modunda 1sn = 1sa → gerçek süre = ceil(hours).
// producedAt: hangi köy merkezi binasında üretilir.
const EQUIPMENT_DEFS = {
  kilic: {
    name: 'Kılıç', icon: '🗡️',
    saldiri: +30, yayaSav: +20, atliSav: +10, hiz: -3, kapasite: -10,
    cost: { demirKulce: 10, kereste: 5 }, productionHours: 2,
    producedAt: 'silahci'
  },
  mizrak: {
    name: 'Mızrak', icon: '🔱',
    saldiri: +10, yayaSav: +10, atliSav: +30, hiz: -2, kapasite: -5,
    cost: { demirKulce: 5, kereste: 10 }, productionHours: 1,
    producedAt: 'silahci'
  },
  kalkan: {
    name: 'Kalkan', icon: '🛡️',
    saldiri: +5,  yayaSav: +25, atliSav: +15, hiz: -2, kapasite: -10,
    cost: { kereste: 15, demirKulce: 5 }, productionHours: 1.5,
    producedAt: 'zirh',
    kural: 'Yalnızca kılıçlı askerlerle kullanılabilir'
  },
  zirh: {
    name: 'Zırh', icon: '🎽',
    saldiri: +20, yayaSav: +5,  atliSav: +5,  hiz: -2, kapasite: -5,
    cost: { demirKulce: 20, kereste: 5 }, productionHours: 3,
    producedAt: 'zirh'
  },
  at: {
    name: 'At', icon: '🐎',
    saldiri: +10, yayaSav: +20, atliSav: +20, hiz: +4, kapasite: +50,
    cost: { tahil: 40, kereste: 10 }, productionHours: 4,
    producedAt: 'ahir'
  }
};

// ── Hangi bina hangi ekipmanları üretebilir? ───────────────────────
const EQUIPMENT_BY_BUILDING = Object.entries(EQUIPMENT_DEFS).reduce((acc, [key, def]) => {
  if (!def.producedAt) return acc;
  (acc[def.producedAt] ||= []).push(key);
  return acc;
}, {});

// ── Temel asker değerleri ──────────────────────────────────────────
const BASE_STATS = { saldiri: 0, yayaSav: 10, atliSav: 10, hiz: 10, kapasite: 60 };

// ── Birim listesi ──────────────────────────────────────────────────
// Piyade (Kışla), Süvari (Ahır), Kuşatma (Atölye)
const UNIT_DEFS = {
  // Piyade
  fjordvakt: {
    name: 'Fjordvakt',
    category: 'piyade',
    trainedAt: 'kisla',
    minLevel: 1,
    equipment: ['kilic'],
    stats: { saldiri: 30, yayaSav: 30, atliSav: 20, hiz: 7, kapasite: 50 }
  },
  skjoldvakt: {
    name: 'Skjoldvakt',
    category: 'piyade',
    trainedAt: 'kisla',
    minLevel: 3,
    equipment: ['kilic', 'kalkan'],
    stats: { saldiri: 35, yayaSav: 55, atliSav: 35, hiz: 5, kapasite: 40 }
  },
  nordkamper: {
    name: 'Nordkamper',
    category: 'piyade',
    trainedAt: 'kisla',
    minLevel: 7,
    equipment: ['kilic', 'zirh'],
    stats: { saldiri: 50, yayaSav: 35, atliSav: 25, hiz: 5, kapasite: 45 }
  },
  ulvSavasci: {
    name: 'Ulv Savaşçısı',
    category: 'piyade',
    trainedAt: 'kisla',
    minLevel: 10,
    equipment: ['kilic', 'zirh', 'kalkan'],
    stats: { saldiri: 55, yayaSav: 60, atliSav: 40, hiz: 3, kapasite: 35 }
  },
  spydvakt: {
    name: 'Spydvakt',
    category: 'piyade',
    trainedAt: 'kisla',
    minLevel: 1,
    equipment: ['mizrak'],
    stats: { saldiri: 10, yayaSav: 20, atliSav: 40, hiz: 8, kapasite: 55 }
  },
  isbjorn: {
    name: 'Isbjørn',
    category: 'piyade',
    trainedAt: 'kisla',
    minLevel: 5,
    equipment: ['mizrak', 'zirh'],
    stats: { saldiri: 30, yayaSav: 25, atliSav: 45, hiz: 6, kapasite: 50 }
  },

  // Süvari
  kuzeyIzcisi: {
    name: 'Kuzey İzcisi',
    category: 'suvari',
    trainedAt: 'ahir',
    minLevel: 1,
    equipment: ['at'],
    /*
      SALDIRI = SAVUNMA = 10. Savunma eskiden 30'du, yani izci savunmada
      saldırısının üç katı güçlüydü; casus düellosunda 5 izci 2 izciye
      yeniliyordu. İzci bir savaşçı değil: köye ordu geldiğinde de
      savunmaya ciddi katkı vermemeli.
    */
    stats: { saldiri: 10, yayaSav: 10, atliSav: 10, hiz: 14, kapasite: 110 }
  },
  demirAtli: {
    name: 'Demir Atlı',
    category: 'suvari',
    trainedAt: 'ahir',
    minLevel: 3,
    equipment: ['at', 'kilic'],
    stats: { saldiri: 40, yayaSav: 50, atliSav: 40, hiz: 11, kapasite: 100 }
  },
  skjoldreiter: {
    name: 'Skjoldreiter',
    category: 'suvari',
    trainedAt: 'ahir',
    minLevel: 6,
    equipment: ['at', 'kilic', 'kalkan'],
    stats: { saldiri: 45, yayaSav: 75, atliSav: 55, hiz: 9, kapasite: 90 }
  },
  buzSuvarisi: {
    name: 'Buz Süvarisi',
    category: 'suvari',
    trainedAt: 'ahir',
    minLevel: 8,
    equipment: ['at', 'kilic', 'zirh'],
    stats: { saldiri: 60, yayaSav: 55, atliSav: 45, hiz: 9, kapasite: 95 }
  },
  jernridder: {
    name: 'Jernridder',
    category: 'suvari',
    trainedAt: 'ahir',
    minLevel: 10,
    equipment: ['at', 'kilic', 'kalkan', 'zirh'],
    stats: { saldiri: 65, yayaSav: 80, atliSav: 60, hiz: 7, kapasite: 85 }
  },
  vindreiter: {
    name: 'Vindreiter',
    category: 'suvari',
    trainedAt: 'ahir',
    minLevel: 4,
    equipment: ['at', 'mizrak'],
    stats: { saldiri: 20, yayaSav: 40, atliSav: 60, hiz: 12, kapasite: 105 }
  },
  stormridder: {
    name: 'Stormridder',
    category: 'suvari',
    trainedAt: 'ahir',
    minLevel: 7,
    equipment: ['at', 'mizrak', 'zirh'],
    stats: { saldiri: 30, yayaSav: 45, atliSav: 65, hiz: 10, kapasite: 100 }
  },

  // Kuşatma
  kaleKiran: {
    name: 'Kale Kıran',
    category: 'kusatma',
    trainedAt: 'atolye',
    minLevel: 1,
    equipment: ['koc_basi'],
    stats: { saldiri: 60, yayaSav: 30, atliSav: 75, hiz: 4, kapasite: 0 }
  },
  alevMancınıgı: {
    name: 'Alev Mancınığı',
    category: 'kusatma',
    trainedAt: 'atolye',
    minLevel: 10,
    equipment: ['mancinik'],
    stats: { saldiri: 75, yayaSav: 60, atliSav: 10, hiz: 3, kapasite: 0 }
  },

  /**
   * GÖÇMEN — yeni köy kurar, savaşmaz.
   *
   * Köşk ya da sarayda eğitilir (ikisi birden olamaz, tanımlar birbirini
   * dışlıyor). Ekipmanı yok; bedeli doğrudan KAYNAK (`cost`) ve bir boş
   * işçi. Üçü birden boş bir dünya slotuna gönderilince orada köy kurulur
   * ve göçmenler harcanır.
   *
   * Savaş gücü sıfır ve `category: 'gocmen'` savaş hesabının dışında
   * (bkz. combat.js isCombatUnit): göçmen ne saldırır ne savunur.
   */
  gocmen: {
    name: 'Göçmen',
    category: 'gocmen',
    trainedAt: ['kosk', 'saray'],
    minLevel: 10,
    equipment: [],
    cost: { kereste: 400, tugla: 350, yontmaTas: 350, demirKulce: 200 },
    trainMinutes: 240,
    stats: { saldiri: 0, yayaSav: 0, atliSav: 0, hiz: 5, kapasite: 0 }
  }
};

/** Yeni köy için gereken göçmen sayısı — tek doğruluk kaynağı */
const SETTLER_UNIT = 'gocmen';
const SETTLERS_REQUIRED = 3;

/**
 * ARAŞTIRMA — Rún Salonu.
 *
 * Bir birimi eğitebilmek için İKİ kapı birden açılmalı: eğitildiği binanın
 * (kışla/ahır/atölye) seviyesi VE Rún Salonu'nda o birimin araştırılmış
 * olması. İki ayrı yatırım hattı: kışla kadro ve hız verir, Rún Salonu
 * neyin eğitilebileceğini belirler.
 *
 * Başlangıç birimleri (minLevel 1) araştırma İSTEMEZ — yeni oyuncu Rún
 * Salonu'nu kuramadan da asker basabilmeli, yoksa oyun ilk saatlerde durur.
 *
 * Gereken Rún Salonu seviyesi birimin minLevel'ıyla AYNI: Lvl 10 birim hem
 * Lvl 10 kışla hem Lvl 10 salon ister. Maliyet ve süre seviyeyle katlanarak
 * artıyor (1.45× ve 1.4×); tek yerden ayarlanabilsin diye tabloyla değil
 * formülle üretiliyor.
 */
const RESEARCH_COST_BASE = { kereste: 120, tugla: 90, yontmaTas: 90, demirKulce: 120 };
const RESEARCH_COST_STEP = 1.45;
const RESEARCH_MINUTES_BASE = 30;
const RESEARCH_MINUTES_STEP = 1.4;

function researchFor(minLevel) {
  const lv = Math.max(1, minLevel || 1);
  if (lv <= 1) return null;                       // başlangıç birimi: serbest
  const k = lv - 2;
  const cost = {};
  for (const [res, amt] of Object.entries(RESEARCH_COST_BASE)) {
    cost[res] = Math.round(amt * Math.pow(RESEARCH_COST_STEP, k));
  }
  return {
    level: lv,
    cost,
    minutes: Math.round(RESEARCH_MINUTES_BASE * Math.pow(RESEARCH_MINUTES_STEP, k)),
  };
}

for (const def of Object.values(UNIT_DEFS)) {
  def.research = researchFor(def.minLevel);
}
/*
  Göçmen Rún Salonu araştırması İSTEMEZ: kapısı zaten köşk/saray Lvl 10.
  İkinci bir kapı koymak yeni köyü gereksiz yere kilitler.
*/
UNIT_DEFS[SETTLER_UNIT].research = null;

/** Bu birim eğitilmeden önce araştırılmalı mı? */
const needsResearch = (unitType) => !!UNIT_DEFS[unitType]?.research;

/**
 * EKİPMAN YÜKSELTMESİ — silahçı ve zırhçıda, 20 seviye.
 *
 * Her seviye o ekipmanın KENDİ KATKISINI %1,75 artırıyor; Lvl 20'de katkı
 * %35 daha fazla. Kılıç saldırı ağırlıklı olduğu için kılıç yükseltmesi
 * saldırıyı, kalkan savunmayı büyütüyor — ayrı tablo tutmaya gerek yok,
 * mevcut ekipman katkı tablosu zaten bunu söylüyor.
 *
 * NEDEN "katkının üstüne" değil de "tanımlı stat'ın üstüne" ekleniyor:
 * birimlerin `stats` değerleri elle ayarlanmış ve biri (Stormridder) taban+
 * ekipman toplamından bilerek sapıyor. Stat'ı formülden yeniden üretsek o
 * elle ayar sessizce kaybolurdu. Bu yüzden Lvl 0'da sonuç TANIMIN AYNISI,
 * seviye yalnız üstüne ekliyor.
 *
 * Hız ve kapasite yükselmiyor: kılıcı bilemek askeri hızlandırmaz.
 */
const EQUIPMENT_MAX_LEVEL   = 20;
const EQUIPMENT_UPGRADE_STEP = 0.0175;          // seviye başına katkı artışı
const EQUIPMENT_UPGRADE_COST_BASE = { kereste: 150, tugla: 110, yontmaTas: 110, demirKulce: 150 };
const EQUIPMENT_UPGRADE_COST_STEP = 1.25;
const EQUIPMENT_UPGRADE_MINUTES_BASE = 20;
const EQUIPMENT_UPGRADE_MINUTES_STEP = 1.25;

/** `level` (0-19) seviyesinden bir üstüne çıkmanın bedeli */
function equipmentUpgradeCost(level) {
  const cost = {};
  for (const [res, amt] of Object.entries(EQUIPMENT_UPGRADE_COST_BASE)) {
    cost[res] = Math.round(amt * Math.pow(EQUIPMENT_UPGRADE_COST_STEP, level));
  }
  return cost;
}
function equipmentUpgradeMinutes(level) {
  return Math.round(EQUIPMENT_UPGRADE_MINUTES_BASE
    * Math.pow(EQUIPMENT_UPGRADE_MINUTES_STEP, level));
}

/** Yükseltilebilir ekipmanlar — at hariç (at bir alet değil) */
const UPGRADABLE_EQUIPMENT = Object.keys(EQUIPMENT_DEFS).filter(k => k !== 'at');

/**
 * Birimin YÜKSELTMELERLE birlikte savaş değerleri.
 * Lvl 0'da tanımdaki `stats` ile birebir aynı döner.
 */
function unitStats(unitKey, levels = {}) {
  const def = UNIT_DEFS[unitKey];
  if (!def) return null;
  const out = { ...def.stats };
  for (const eq of def.equipment || []) {
    const katki = EQUIPMENT_DEFS[eq];
    const lv = Math.max(0, Math.min(EQUIPMENT_MAX_LEVEL, Math.floor(levels?.[eq] || 0)));
    if (!katki || lv <= 0) continue;
    const k = EQUIPMENT_UPGRADE_STEP * lv;
    out.saldiri = Math.round((out.saldiri + (katki.saldiri || 0) * k) * 100) / 100;
    out.yayaSav = Math.round((out.yayaSav + (katki.yayaSav || 0) * k) * 100) / 100;
    out.atliSav = Math.round((out.atliSav + (katki.atliSav || 0) * k) * 100) / 100;
  }
  return out;
}

/** Rún Salonu'nda araştırılabilir birimler — seviyeye göre sıralı */
const RESEARCHABLE = Object.entries(UNIT_DEFS)
  .filter(([, d]) => d.research)
  .sort((a, b) => a[1].research.level - b[1].research.level)
  .map(([k]) => k);

// ── Ekipman kuralları ──────────────────────────────────────────────
const EQUIPMENT_RULES = [
  'Her asker Kılıç veya Mızrak\'tan birini taşır; ikisini birden taşıyamaz.',
  'Mızrak kullanan asker Kalkan taşıyamaz.',
  'Kalkan yalnızca kılıçlı askerlerle kullanılabilir.',
  'Her asker Zırh giyebilir (kılıçlı da, mızraklı da).',
  'Süvariler ekipmanlarını atla birlikte alır.'
];

module.exports = {
  EQUIPMENT_DEFS, EQUIPMENT_BY_BUILDING, UNIT_DEFS, BASE_STATS, EQUIPMENT_RULES,
  needsResearch, RESEARCHABLE, researchFor,
  unitStats, equipmentUpgradeCost, equipmentUpgradeMinutes,
  UPGRADABLE_EQUIPMENT, EQUIPMENT_MAX_LEVEL, EQUIPMENT_UPGRADE_STEP,
  SETTLER_UNIT, SETTLERS_REQUIRED,
};
