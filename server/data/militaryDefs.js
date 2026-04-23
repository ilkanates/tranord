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
    equipment: ['kilic'],
    stats: { saldiri: 30, yayaSav: 30, atliSav: 20, hiz: 7, kapasite: 50 }
  },
  skjoldvakt: {
    name: 'Skjoldvakt',
    category: 'piyade',
    trainedAt: 'kisla',
    equipment: ['kilic', 'kalkan'],
    stats: { saldiri: 35, yayaSav: 55, atliSav: 35, hiz: 5, kapasite: 40 }
  },
  nordkamper: {
    name: 'Nordkamper',
    category: 'piyade',
    trainedAt: 'kisla',
    equipment: ['kilic', 'zirh'],
    stats: { saldiri: 50, yayaSav: 35, atliSav: 25, hiz: 5, kapasite: 45 }
  },
  ulvSavasci: {
    name: 'Ulv Savaşçısı',
    category: 'piyade',
    trainedAt: 'kisla',
    equipment: ['kilic', 'zirh', 'kalkan'],
    stats: { saldiri: 55, yayaSav: 60, atliSav: 40, hiz: 3, kapasite: 35 }
  },
  spydvakt: {
    name: 'Spydvakt',
    category: 'piyade',
    trainedAt: 'kisla',
    equipment: ['mizrak'],
    stats: { saldiri: 10, yayaSav: 20, atliSav: 40, hiz: 8, kapasite: 55 }
  },
  isbjorn: {
    name: 'Isbjørn',
    category: 'piyade',
    trainedAt: 'kisla',
    equipment: ['mizrak', 'zirh'],
    stats: { saldiri: 30, yayaSav: 25, atliSav: 45, hiz: 6, kapasite: 50 }
  },

  // Süvari
  kuzeyIzcisi: {
    name: 'Kuzey İzcisi',
    category: 'suvari',
    trainedAt: 'ahir',
    equipment: ['at'],
    stats: { saldiri: 10, yayaSav: 30, atliSav: 30, hiz: 14, kapasite: 110 }
  },
  demirAtli: {
    name: 'Demir Atlı',
    category: 'suvari',
    trainedAt: 'ahir',
    equipment: ['at', 'kilic'],
    stats: { saldiri: 40, yayaSav: 50, atliSav: 40, hiz: 11, kapasite: 100 }
  },
  skjoldreiter: {
    name: 'Skjoldreiter',
    category: 'suvari',
    trainedAt: 'ahir',
    equipment: ['at', 'kilic', 'kalkan'],
    stats: { saldiri: 45, yayaSav: 75, atliSav: 55, hiz: 9, kapasite: 90 }
  },
  buzSuvarisi: {
    name: 'Buz Süvarisi',
    category: 'suvari',
    trainedAt: 'ahir',
    equipment: ['at', 'kilic', 'zirh'],
    stats: { saldiri: 60, yayaSav: 55, atliSav: 45, hiz: 9, kapasite: 95 }
  },
  jernridder: {
    name: 'Jernridder',
    category: 'suvari',
    trainedAt: 'ahir',
    equipment: ['at', 'kilic', 'kalkan', 'zirh'],
    stats: { saldiri: 65, yayaSav: 80, atliSav: 60, hiz: 7, kapasite: 85 }
  },
  vindreiter: {
    name: 'Vindreiter',
    category: 'suvari',
    trainedAt: 'ahir',
    equipment: ['at', 'mizrak'],
    stats: { saldiri: 20, yayaSav: 40, atliSav: 60, hiz: 12, kapasite: 105 }
  },
  stormridder: {
    name: 'Stormridder',
    category: 'suvari',
    trainedAt: 'ahir',
    equipment: ['at', 'mizrak', 'zirh'],
    stats: { saldiri: 30, yayaSav: 45, atliSav: 65, hiz: 10, kapasite: 100 }
  },

  // Kuşatma
  kaleKiran: {
    name: 'Kale Kıran',
    category: 'kusatma',
    trainedAt: 'atolye',
    equipment: ['koc_basi'],
    stats: { saldiri: 60, yayaSav: 30, atliSav: 75, hiz: 4, kapasite: 0 }
  },
  alevMancınıgı: {
    name: 'Alev Mancınığı',
    category: 'kusatma',
    trainedAt: 'atolye',
    equipment: ['mancinik'],
    stats: { saldiri: 75, yayaSav: 60, atliSav: 10, hiz: 3, kapasite: 0 }
  }
};

// ── Ekipman kuralları ──────────────────────────────────────────────
const EQUIPMENT_RULES = [
  'Her asker Kılıç veya Mızrak\'tan birini taşır; ikisini birden taşıyamaz.',
  'Mızrak kullanan asker Kalkan taşıyamaz.',
  'Kalkan yalnızca kılıçlı askerlerle kullanılabilir.',
  'Her asker Zırh giyebilir (kılıçlı da, mızraklı da).',
  'Süvariler ekipmanlarını atla birlikte alır.'
];

module.exports = { EQUIPMENT_DEFS, EQUIPMENT_BY_BUILDING, UNIT_DEFS, BASE_STATS, EQUIPMENT_RULES };
