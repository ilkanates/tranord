/**
 * EĞİTİLEBİLİR BİRİMLER — UNIT_DEFS'ten türetilen iki tablo.
 *
 * server/index.js'ten AYNEN taşındı. Türetme mantığı tek yerde dursun diye
 * ayrıldı: hem birim eğitme handler'ı hem istemciye giden paket bunlara
 * bakıyor, ve ikisinin farklı bir listeden okuması sessiz bir tutarsızlık
 * olurdu (arayüz eğitilebilir gösterir, sunucu reddeder).
 */
const { UNIT_DEFS, EQUIPMENT_DEFS } = require('../data');

const TRAINABLE_UNITS = Object.fromEntries(
  Object.entries(UNIT_DEFS).filter(([_, def]) => {
    if (def.category === 'kusatma') return false;
    return (def.equipment || []).every(eq => EQUIPMENT_DEFS[eq]);
  })
);

// trainedAt tek ad ya da dizi olabilir (göçmen hem köşkte hem sarayda)
const UNITS_BY_BUILDING = Object.entries(TRAINABLE_UNITS).reduce((acc, [key, def]) => {
  if (!def.trainedAt) return acc;
  for (const bt of [].concat(def.trainedAt)) (acc[bt] ||= []).push(key);
  return acc;
}, {});

module.exports = { TRAINABLE_UNITS, UNITS_BY_BUILDING };
