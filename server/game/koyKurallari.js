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
const { VILLAGE_DEFS, PRODUCTION_DEFS } = require('../data');
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
const POP_PER_HOUR_BASE = 3.0;

/**
 * Seviye başına artış 0,6 → 2 → 4.
 *
 * İkinci artış İlkan'ın bildirimiyle geldi: *"dünya kadar kılıcım var ama
 * adam yokluğundan asker basamıyorum."* Lvl 20'de 39 kişi/oyun saatiydi;
 * bin kişilik bir ordu için gereken nüfus tek başına 26 oyun saati
 * sürüyordu.
 *
 * Yeni hızda Lvl 11 = 43, Lvl 20 = 79 kişi/oyun saati. Ana binayı
 * yükseltmek hâlâ en değerli nüfus yatırımı.
 */
const POP_PER_HOUR_STEP = 4.0;

function popPerGameHour(anaBinaLevel) {
  const lv = Math.max(0, Math.floor(anaBinaLevel || 0));
  if (lv < 1) return 0;                       // ana bina yoksa büyüme yok
  return POP_PER_HOUR_BASE + (lv - 1) * POP_PER_HOUR_STEP;
}

/**
 * KÖYÜN TOPLAM İŞÇİ KAPASİTESİ — tarlalar + işçi alan binalar.
 *
 * Nüfus büyüme frenini bundan türetiyoruz (bkz. isciTamponu). Dolu ya
 * da boş olmasına bakmıyor: kapasite, köyün "kaç kişiye iş verebildiği".
 */
function isciKapasitesi(village) {
  let toplam = 0;
  for (const t of Object.values(village?.productionTiles || {})) {
    if (!t || !(t.level >= 1)) continue;
    toplam += PRODUCTION_DEFS[t.type]?.levels?.[t.level - 1]?.workers || 0;
  }
  for (const b of Object.values(village?.villageBuildings || {})) {
    if (!b || !(b.level >= 1)) continue;
    toplam += b.level * (VILLAGE_DEFS[b.type]?.workersPerLevel || 3);
  }
  return toplam;
}

/**
 * BOŞ İŞÇİ TAMPONU — köyün taşımasına izin verilen işsiz sayısı.
 *
 * Sabit bir sayı olsaydı büyük köyde anlamsız kalırdı; kapasiteyle
 * ölçekleniyor.
 *
 * ── ASIL DARBOĞAZ BURASIYDI (İlkan bildirdi) ────────────────────────
 *
 * 20 + %10 iken ölçüldü: 906 işçi kapasiteli bir köyde tampon 111. Köy
 * 4.550 kişi taşıyabildiği hâlde boşta 111 kişi birikince büyüme
 * TAMAMEN duruyordu. Asker eğitimi boş işçi tüketiyor, yani bin asker
 * basmak isteyen oyuncu 111'erlik dokuz dalga beklemek zorundaydı.
 *
 * 100 + %40 ile aynı köyde tampon 462 — dört kat daha derin bir havuz.
 *
 * TAMAMEN KALDIRILMADI: siviller de yiyecek tüketiyor (bkz. tick.js ·
 * getConsumptionRates), yani gerçek tavan zaten tahılda. Ama tamponsuz
 * bir köy bir gecede on binlerce boş sivil biriktirip aç kalır ve oyuncu
 * neden köylü kaybettiğini anlamazdı.
 */
const ISCI_TAMPON_TABAN = 100;
const ISCI_TAMPON_ORAN  = 0.40;

function isciTamponu(village) {
  return ISCI_TAMPON_TABAN + ISCI_TAMPON_ORAN * isciKapasitesi(village);
}

/**
 * NÜFUS BÜYÜME ÇARPANI — boş işçi tamponu doldukça 1'den 0'a iner.
 * Tampon dolunca büyüme tamamen durur; asker basıp sivil tüketince
 * kendiliğinden yeniden açılır.
 */
function buyumeCarpani(village) {
  const tampon = isciTamponu(village);
  if (!(tampon > 0)) return 1;
  const bos = Math.max(0, village?.freeWorkers || 0);
  return Math.min(1, Math.max(0, 1 - bos / tampon));
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
 * YIKIM SÜRESİ — o seviyenin inşa süresinin ONDA BİRİ.
 *
 * Yıkım eskiden anındaydı; saldırı görünce bina silip nüfus/puan
 * oynatmak bedava bir hamleydi. Artık bir karar: başlattığın an
 * işçilerin çıkıyor, bina bir süre yıkık hâlde duruyor.
 *
 * Süre TAM KADROYLA hesaplanıyor (MAX_BUILDERS) — yıkıma işçi atanmıyor,
 * "kaç işçiyle yıkıyorum" diye bir seçim yok. Yıkmak yapmaktan ucuz:
 * ondalık oran oyuncuya yanlış yatırımı düzeltme şansı bırakıyor ama
 * bedavaya getirmiyor.
 */
const YIKIM_ORANI = 0.1;

function getVillageDemolishMinutes(type, level) {
  const lvl = Math.max(1, level || 1);
  return getVillageBuildMinutes(type, lvl, MAX_BUILDERS(lvl)) * YIKIM_ORANI;
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
 * verilmezse UPGRADE_MULT_DEFAULT. 1.28 seçildi: Lvl 10'da ~9.2×, Lvl 20'de
 * ~106× taban — depo kapasitesinin (seviye × 500) ulaşabileceği aralıkta kalır.
 * anaBina kendi çarpanını (1.7) korur, dengesi elle ayarlanmış.
 */
const UPGRADE_MULT_DEFAULT = 1.28;

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

/**
 * ÜRETİM ALANI (TARLA) SEVİYE TAVANI.
 *
 * İlkan'ın kararı: *"üretim alanlarını her zaman Lvl 10 ile sınırla,
 * tarlaları yani — ama merkez ise Lvl 20'ye kadar çıkabilsin"*.
 *
 * NEDEN: tarlalar 20'ye kadar açıkken her köy kendi başına yetiyordu ve
 * MERKEZ KÖY diye bir şeyin anlamı kalmıyordu — çoklu köy, birbirinin
 * kopyası yirmi kasabaya dönüşüyordu. Tavanı ikiye ayırmak merkeze
 * gerçek bir üstünlük veriyor: ham üretimin ağırlığı orada, uçtaki
 * köyler asker ve mevzi için.
 *
 * TANIMDAKİ 20 SEVİYE DURUYOR: tavan bir KURAL, tablo değil. Tablo
 * kısaltılsaydı merkezin 11-20 aralığı da yok olurdu.
 */
const TARLA_TAVANI = 10;
const TARLA_TAVANI_MERKEZ = 20;

/** Bu köyde tarlalar en fazla kaçıncı seviyeye çıkar */
function tarlaTavani(village) {
  return village?.isCapital ? TARLA_TAVANI_MERKEZ : TARLA_TAVANI;
}

/**
 * TARLALARI TAVANA KIRP — merkez başka köye taşınınca çağrılıyor.
 *
 * İlkan'ın kararı: *"merkezi başka yere taşıdığında binaların Lvl'i 10'a
 * düşer"*.
 *
 * KIRPMASAYDIK TAVAN DELİNİRDİ: oyuncu merkezi köyden köye taşıyıp her
 * köyün tarlalarını sırayla 20'ye çıkarır, sonunda hepsi 20 olurdu —
 * yani merkezin üstünlüğü diye bir şey kalmazdı. Kural ancak merkez
 * DEĞİŞTİĞİNDE de uygulanırsa kural.
 *
 * SÜRMEKTE OLAN YÜKSELTME DE İPTAL: tavanın üstüne çıkacak bir inşaat
 * yarıda bırakılmasaydı, taşımanın hemen ardından biten yükseltme
 * kuralı atlatırdı. Ayrılan işçiler havuza geri dönüyor; harcanan
 * kaynak geri gelmiyor — merkezi taşımak bir karar, bedeli olmalı.
 *
 * @returns {{dusenTarla:number, kaybedilenSeviye:number, iptalEdilen:number}}
 */
function tarlalariTavanaKirp(village, tavan) {
  const out = { dusenTarla: 0, kaybedilenSeviye: 0, iptalEdilen: 0 };
  if (!village || !(tavan >= 1)) return out;

  for (const t of Object.values(village.productionTiles || {})) {
    if (t.upgrading && (t.level || 0) >= tavan) {
      village.freeWorkers = (village.freeWorkers || 0) + (t.upgradeWorkersAssigned || 0);
      t.upgrading = false;
      t.upgradeEndTime = null;
      t.upgradeWorkersAssigned = 0;
      out.iptalEdilen++;
    }
    if ((t.level || 0) > tavan) {
      out.kaybedilenSeviye += t.level - tavan;
      out.dusenTarla++;
      t.level = tavan;
      /*
        İŞÇİ SAYISI DA KIRPILIYOR: düşen seviyenin işçi kapasitesi daha
        küçük. Kırpmasaydık tarla kapasitesinin üstünde işçi tutar,
        nüfus muhasebesi sessizce şişerdi.
      */
      const def = PRODUCTION_DEFS[t.type];
      const maxW = def?.levels?.[tavan - 1]?.workers;
      if (maxW != null && (t.workers || 0) > maxW) {
        village.freeWorkers = (village.freeWorkers || 0) + (t.workers - maxW);
        t.workers = maxW;
      }
    }
  }
  return out;
}

module.exports = {
  TARLA_TAVANI, TARLA_TAVANI_MERKEZ, tarlaTavani, tarlalariTavanaKirp,
  POP_PER_HOUR_BASE, POP_PER_HOUR_STEP, popPerGameHour,
  isciKapasitesi, isciTamponu, buyumeCarpani,
  ISCI_TAMPON_TABAN, ISCI_TAMPON_ORAN,
  getVillageBuildMinutes, getVillageDemolishMinutes, YIKIM_ORANI,
  UPGRADE_MULT_DEFAULT, getScaledUpgradeCost,
  refreshExpansionCredits, expansionFree, settlerCapacity, MAX_BUILDERS,
};
