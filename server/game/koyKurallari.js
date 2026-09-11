/**
 * KÖY KURALLARI — sayıları belirleyen küçük hesaplar.
 *
 * server/index.js'ten AYNEN taşındı. Ortak yanları: hepsi köyün durumuna
 * bakıp tek bir sayı üretiyor ve hiçbiri dünyayı ya da oturumu bilmiyor.
 * Bu yüzden birlikte duruyorlar ve test etmesi kolay.
 *
 * UPGRADE_MULT_DEFAULT burada: istemci de aynı sayıyı kendi kopyasında
 * tutuyor (client/src/data/villageDefs.js) ve ikisi ayrışırsa arayüz bir
 * fiyat gösterip sunucu başka fiyat keser. test/tanim-ikizleri.test.js
 * iki tarafı karşılaştırıyor — bu dosya taşınırsa o test de güncellenmeli.
 */
const { VILLAGE_DEFS } = require('../data');
// settlerCapacity gocmen birim adini ve gerekli sayiyi buradan okuyor
const ARMY = require('./army');
/** Aç değilken ve tavan altındayken saatte kaç kişi katılır */
/**
 * NÜFUS ARTIŞ HIZI — ANA BİNA SEVİYESİNE BAĞLI.
 *
 * Eskiden sabit 1 kişi/oyun saatiydi; ana binayı yükseltmenin nüfusa hiçbir
 * etkisi yoktu. Artık hız ana binadan gelir, TAVAN ise evlerden (bkz.
 * maxPopulation). Yani ana bina "ne kadar hızlı büyürüm", ev "ne kadar
 * büyüyebilirim" sorusunu cevaplıyor.
 *
 * Lvl 1'de eski hızın aynısı (1/saat = 24/gün), her seviye +0.6:
 *   lvl 1 → 1.0/sa   lvl 5 → 3.4/sa   lvl 10 → 6.4/sa   lvl 11 → 7.0/sa
 */
const POP_PER_HOUR_BASE = 1.0;

/**
 * Seviye başına artış 0,6 → 2. Eski hızda (Lvl 11'de 7 kişi/oyun saati)
 * tahılın besleyebildiği ~9.500 kişilik orduyu kurmak 56 oyun günü sürüyordu.
 * Yeni hızda Lvl 11 = 21, Lvl 20 = 39 kişi/saat; ana binayı yükseltmek de
 * gerçekten değerli oluyor.
 */
const POP_PER_HOUR_STEP = 2.0;

function popPerGameHour(anaBinaLevel) {
  const lv = Math.max(0, Math.floor(anaBinaLevel || 0));
  if (lv < 1) return 0;                       // ana bina yoksa büyüme yok
  return POP_PER_HOUR_BASE + (lv - 1) * POP_PER_HOUR_STEP;
}

/**
 * Köy binası inşa/yükseltme süresi — oyun DAKİKASI.
 * `buildBaseWork` bir "iş" sayısı; işçi sayısına bölünür. Değerler dakika
 * cetveline oturuyor (ana bina lvl1→2: 50 dk / işçi sayısı).
 */
function getVillageBuildMinutes(type, level, workers) {
  const def = VILLAGE_DEFS[type];
  if (!def || workers <= 0) return Infinity;
  const work = def.buildBaseWork * Math.pow(def.buildMultiplier, level - 1);
  return work / workers;
}

/**
 * YÜKSELTME MALİYETİ — HER SEVİYE İÇİN.
 *
 * Eskiden yalnızca `upgradeCostBase` tanımlı binalar ücret alıyordu ve o alan
 * SADECE anaBina'da vardı: diğer 27 bina Lvl 1'den sonra BEDAVA yükseliyordu.
 * Artık taban yok ise binanın İNŞA maliyeti taban kabul edilir, yani her
 * binanın her seviye artışının bir bedeli var.
 *
 * Maliyet = taban × çarpan^(mevcut seviye - 1). Çarpan bina tanımında
 * verilmezse UPGRADE_MULT_DEFAULT. 1.25 seçildi: Lvl 10'da ~7.5×, Lvl 20'de
 * ~73× taban — depo kapasitesinin (seviye × 500) ulaşabileceği aralıkta kalır.
 * anaBina kendi çarpanını (1.7) korur, dengesi elle ayarlanmış.
 */
const UPGRADE_MULT_DEFAULT = 1.25;

function getScaledUpgradeCost(type, currentLevel) {
  const def = VILLAGE_DEFS[type];
  const base = def?.upgradeCostBase || def?.cost;
  if (!base) return null;
  const mult = Math.pow(def.upgradeCostMultiplier || UPGRADE_MULT_DEFAULT,
    Math.max(0, currentLevel - 1));
  return Object.fromEntries(
    Object.entries(base).map(([k, v]) => [k, Math.round(v * mult)])
  );
}

/**
 * BU KÖYÜN YERLEŞİM HAKKI.
 *
 * Köşk/sarayın ULAŞTIĞI eşikler hak kazandırır (köşk 10/20, saray
 * 10/15/20). Kazanılan hak yüksek su seviyesi gibi tutulur: bina
 * yıkılsa da düşmez, ama yeni hak için bir sonraki eşiğe çıkmak
 * gerekir. Harcanan hak = bu köyden kurulan köy sayısı.
 */
function refreshExpansionCredits(village) {
  let reached = 0;
  for (const b of Object.values(village.villageBuildings || {})) {
    const at = VILLAGE_DEFS[b.type]?.expansionAt;
    if (!Array.isArray(at) || !(b.level >= 1)) continue;
    for (const lv of at) if (b.level >= lv) reached++;
  }
  village.expansionEarned = Math.max(village.expansionEarned || 0, reached);
  return village.expansionEarned;
}

/** Kalan hak (kurulabilecek köy sayısı) */
function expansionFree(village) {
  return Math.max(0, refreshExpansionCredits(village) - (village.expansionUsed || 0));
}

/**
 * Göçmen tavanı: her hak 3 göçmen. Mevcut göçmenler, yoldakiler ve
 * kuyruktakiler birlikte sayılır — hak bitince yeni göçmen basılamaz.
 */
function settlerCapacity(village) {
  const izin = expansionFree(village) * ARMY.SETTLERS_REQUIRED;
  let mevcut = village.army?.[ARMY.SETTLER_UNIT] || 0;
  for (const m of village.marches || []) mevcut += m.units?.[ARMY.SETTLER_UNIT] || 0;
  for (const q of Object.values(village.unitQueues || {})) {
    for (const o of q) if (o.type === ARMY.SETTLER_UNIT) mevcut += o.remaining || 0;
  }
  return { izin, mevcut, bos: Math.max(0, izin - mevcut) };
}

/**
 * BİR İNŞAATA KONABİLECEK EN FAZLA İŞÇİ.
 *
 * Eskiden tek sınır boş işçi sayısıydı: 2000 işçiyle her bina anında
 * bitiyordu. Tavan = inşa edilecek SEVİYE + 2 (yeni bina için 3).
 * Yüksek seviye inşaatlar zaten uzun; kural kendi kendini dengeliyor.
 */
const MAX_BUILDERS = (mevcutSeviye) => Math.max(1, (mevcutSeviye || 0) + 2);

module.exports = {
  POP_PER_HOUR_BASE, POP_PER_HOUR_STEP, popPerGameHour,
  getVillageBuildMinutes, UPGRADE_MULT_DEFAULT, getScaledUpgradeCost,
  refreshExpansionCredits, expansionFree, settlerCapacity, MAX_BUILDERS,
};
