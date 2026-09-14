/**
 * SAĞLIK ÇADIRI — savunanın yaralıları çadıra alınır, ZAMANLA iyileşir.
 *
 * Bina aylardır tanımlıydı ama HİÇBİR ŞEY YAPMIYORDU: oyuncu kuruyor,
 * kaynak harcıyor, karşılığında hiçbir şey almıyordu. Satılan bir oyunda
 * duran ama işlemeyen bir bina, eksik bir özellikten daha kötü.
 *
 * TEMEL KARARLAR
 *
 * 1) YALNIZ SAVUNANA işliyor. Çadır köyde; saldırıda ölen asker günlerce
 *    uzakta, kimse onu sedyeyle geri getirmiyor. Saldırana da işleseydi
 *    saldırmanın bedeli düşer ve savunma avantajı ters dönerdi.
 *
 * 2) SONUCU DEĞİŞTİRMİYOR. Savaş bitmiş, kazanan belli; çadır yalnız
 *    yaralıları topluyor. Sonucu değiştirseydi savaş hesabı iki aşamalı
 *    olur ve oyuncu saldırmadan önce ne olacağını kestiremezdi.
 *
 * 3) ASKER PAT DİYE DÖNMÜYOR (İlkan'ın kararı). Yaralı çadırda YATIYOR ve
 *    eğitim süresinin İKİ KATI kadar sürede iyileşiyor. Anında dönseydi
 *    savunmak neredeyse bedava olur, savaşın ertesinde ordunun eksildiği
 *    an diye bir şey kalmazdı. İki kat: yeniden eğitmekten pahalı değil
 *    ama bedava da değil — yaralıyı beklemek gerçek bir maliyet.
 *
 * 4) ÇADIR DOLABİLİR (İlkan'ın kararı). Yatak sayısı seviyeyle sınırlı;
 *    sığmayan yaralı ölür. Sınırsız olsaydı Lvl 20 çadır on bin kişilik
 *    bir savaşta dört bin askeri kurtarır, çadır tek başına savunmayı
 *    belirlerdi. Kapasite oyuncuya "bu savaşı çadırım kaldırır mı?"
 *    sorusunu sorduruyor.
 *
 * 5) HİÇBİR ŞEY REQUIRE ETMİYOR. Kural önce `koyKurallari.js`e yazılmıştı
 *    ama o dosya `army.js`i require ediyor; army'nin de onu require
 *    etmesi DÖNGÜ oluşturdu ve yükleme sırasına göre bağlantı boş kalıp
 *    savaşı çökertti (ölçüldü). Bu dosya yalnız veri tanımı okuyor.
 */
const { UNIT_DEFS } = require('../data');

/**
 * İYİLEŞME ORANI — kayıpların en çok ne kadarı yaralı sayılır.
 *
 * Seviyeyle doğrusal, tavan %40. TODO'daki ilk öneri (seviye × 0,05,
 * tavan %50) Lvl 10'da tavana dayanıyordu; o hâlde 11-20 arası
 * seviyelerin hiçbir karşılığı olmazdı. Seviye başına %2 bütün aralığı
 * kullanıyor ve Lvl 20'de %40'a varıyor.
 */
const SAGLIK_PER_SEVIYE = 0.02;
const SAGLIK_TAVAN = 0.40;

/**
 * YATAK SAYISI — seviye başına. Lvl 1'de 10, Lvl 20'de 200.
 *
 * Aynı anda çadırda yatabilecek asker sayısı. Yataklar iyileşme bitene
 * kadar DOLU kalıyor: arka arkaya gelen iki saldırıda ikincinin
 * yaralıları için yer kalmayabilir. Bu bilerek — çadır bir tampon,
 * sınırsız bir diriliş makinesi değil.
 */
const YATAK_PER_SEVIYE = 10;

/**
 * İYİLEŞME SÜRESİ = eğitim süresinin bu katı (İlkan'ın kararı).
 * Yeniden eğitmekten pahalı değil ama bedava da değil.
 */
const IYILESME_KAT = 2;

function saglikIyilesmeOrani(seviye) {
  if (!(seviye >= 1)) return 0;
  return Math.min(SAGLIK_TAVAN, seviye * SAGLIK_PER_SEVIYE);
}

/** Çadırın toplam yatak sayısı */
function yatakKapasitesi(seviye) {
  return seviye >= 1 ? Math.floor(seviye * YATAK_PER_SEVIYE) : 0;
}

/** Şu an çadırda yatan asker sayısı */
function yatanSayisi(village) {
  return (village?.saglikYatan || [])
    .reduce((s, y) => s + Math.max(0, Math.floor(y.adet) || 0), 0);
}

/**
 * Bir birimin iyileşme süresi — OYUN SAATİ.
 *
 * Eğitim süresi `getUnitTrainMinutes` ile aynı kuraldan türüyor ama o
 * fonksiyon tick.js'te ve tick.js army.js'i çağırıyor; buraya kopyalamak
 * yerine aynı TANIMDAN (ekipman sayısı) hesaplıyoruz. İki yerin
 * ayrışmaması için test ikisini karşılaştırıyor.
 */
function iyilesmeSaati(unitType) {
  const def = UNIT_DEFS[unitType];
  if (!def) return 0;
  const dakika = def.trainMinutes || Math.max(3, (def.equipment || []).length * 5);
  return (dakika * IYILESME_KAT) / 60;
}

/**
 * YARALILARI ÇADIRA AL.
 *
 * Kayıpların `oran` kadarı yaralı sayılıyor, ama YALNIZ BOŞ YATAK KADARI
 * çadıra giriyor; kalanı ölü. Yuvarlama AŞAĞI: yarım asker diye bir şey
 * yok ve yukarı yuvarlamak 1 kayıplı bir savaşta Lvl 1 çadırın (%2) o
 * tek askeri de kurtarmasına yol açardı — oranın elli katı bir etki.
 *
 * @returns {{kalanKayip, yatanlar, alinan, sigmayan, kapasite, bosYatak}}
 *   `kalanKayip` gerçekten ölenler; `yatanlar` çadıra giren girdiler.
 */
function yaralilariAl(kayiplar, seviye, village) {
  const oran = saglikIyilesmeOrani(seviye);
  const kapasite = yatakKapasitesi(seviye);
  const bosYatak = Math.max(0, kapasite - yatanSayisi(village));
  const bos = {
    kalanKayip: { ...(kayiplar || {}) }, yatanlar: [],
    alinan: 0, sigmayan: 0, kapasite, bosYatak,
  };
  if (!(oran > 0) || bosYatak <= 0) return bos;

  const toplamKayip = Object.values(kayiplar || {})
    .reduce((s, n) => s + Math.max(0, Math.floor(n) || 0), 0);
  if (toplamKayip <= 0) return bos;

  /*
    KAPASİTE ORANI ORANTILI KIRPIYOR. Yataktan fazla yaralı çıkarsa
    "hangi birim yatağa girsin" diye keyfî bir sıra gerekirdi; oran
    üzerinden kırpmak her birime kendi kaybı oranında yer veriyor.
  */
  const etkinOran = Math.min(oran, bosYatak / toplamKayip);

  const kalanKayip = {}; const yatanlar = [];
  let alinan = 0;
  for (const [k, n] of Object.entries(kayiplar || {})) {
    const olu = Math.max(0, Math.floor(n) || 0);
    if (olu <= 0) continue;
    const yarali = Math.floor(olu * etkinOran);
    if (yarali > 0) {
      /*
        BAŞLAMAMIŞ GELİYOR (İlkan'ın kararı: "ben seçince iyileşmeye
        başlasınlar"). Yaralı çadıra alınıyor ama tedavisi kendiliğinden
        işlemiyor; oyuncu Sağlık Çadırı ekranından hangi birliği ne zaman
        ayağa kaldıracağına kendisi karar veriyor.

        `toplamSaat` ayrıca saklanıyor: kart "ne kadar sürer" sorusunu
        tedavi başlamadan da cevaplamalı, yoksa oyuncu neyi seçtiğini
        bilmeden seçerdi.
      */
      yatanlar.push({
        birim: k, adet: yarali,
        kalanSaat: iyilesmeSaati(k), toplamSaat: iyilesmeSaati(k),
        basladi: false,
      });
      alinan += yarali;
    }
    if (olu - yarali > 0) kalanKayip[k] = olu - yarali;
  }

  /*
    SIĞMAYAN = oran yetseydi kurtulacak ama yatak bulamayan asker.
    Rapora yazılıyor: "çadırım doluydu" bilgisi olmadan oyuncu onu
    yükseltmek için bir sebep göremez.
  */
  const oranlaCikan = Math.floor(toplamKayip * oran);
  const sigmayan = Math.max(0, oranlaCikan - alinan);

  return { kalanKayip, yatanlar, alinan, sigmayan, kapasite, bosYatak };
}

/**
 * TEDAVİYE BAŞLA — oyuncunun seçtiği yatan(lar) için sayaç işlemeye başlar.
 *
 * İlkan'ın kararı: "ben seçince iyileşmeye başlasınlar". Yaralı çadıra
 * kendiliğinden giriyor ama TEDAVİ bir karar: oyuncu hangi birliği önce
 * ayağa kaldıracağını kendisi söylüyor.
 *
 * `indeksler` boşsa HEPSİ başlatılıyor — "hepsini iyileştir" düğmesi
 * için. Zaten başlamış olan girdiye dokunulmuyor: yeniden başlatmak
 * sayacı sıfırlayıp oyuncunun beklediği süreyi uzatırdı.
 *
 * @returns {{baslayan:number, asker:number}}
 */
function iyilesmeyeBasla(village, indeksler = null) {
  const liste = village?.saglikYatan;
  if (!Array.isArray(liste) || !liste.length) return { baslayan: 0, asker: 0 };
  const secim = Array.isArray(indeksler) && indeksler.length
    ? new Set(indeksler.map(Number)) : null;

  let baslayan = 0, asker = 0;
  liste.forEach((y, i) => {
    if (secim && !secim.has(i)) return;
    if (y.basladi) return;
    y.basladi = true;
    // Eski kayıtta toplamSaat olmayabilir — kalan süreden türet
    if (!(y.toplamSaat > 0)) y.toplamSaat = y.kalanSaat || iyilesmeSaati(y.birim);
    baslayan += 1;
    asker += Math.max(0, Math.floor(y.adet) || 0);
  });
  return { baslayan, asker };
}

/**
 * ZAMANI İLERLET — iyileşen askerler orduya döner.
 *
 * YALNIZ TEDAVİSİ BAŞLAMIŞ girdiler ilerliyor: başlamamış yaralı çadırda
 * bekliyor ve oyuncu onu seçene kadar sayacı işlemiyor.
 *
 * @returns {object} bu adımda taburcu olan birimler { birim: adet }
 */
function ilerlet(village, oyunSaati) {
  const liste = village?.saglikYatan;
  if (!Array.isArray(liste) || !liste.length || !(oyunSaati > 0)) return {};

  const taburcu = {};
  const kalan = [];
  for (const y of liste) {
    const adet = Math.max(0, Math.floor(y.adet) || 0);
    if (adet <= 0) continue;
    if (!y.basladi) { kalan.push({ ...y, adet }); continue; }
    const sure = Math.max(0, (y.kalanSaat || 0) - oyunSaati);
    if (sure <= 0) {
      taburcu[y.birim] = (taburcu[y.birim] || 0) + adet;
      /*
        ASKER ORDUYA BURADA DÖNMÜYOR — çağıran döndürüyor. Bu dosya köy
        nesnesinin ordusuna yazarsa nüfus muhasebesini de üstlenmesi
        gerekir; o hesap index.js'te.
      */
    } else {
      kalan.push({ ...y, adet, kalanSaat: sure });
    }
  }
  village.saglikYatan = kalan;
  return taburcu;
}

/** İstemciye giden özet — revirde kim var, ne kadar kaldı */
function ozet(village, seviye) {
  const kapasite = yatakKapasitesi(seviye);
  return {
    kapasite,
    dolu: yatanSayisi(village),
    oran: Math.round(saglikIyilesmeOrani(seviye) * 100),
    /*
      `indeks` ALANI ŞART. İstemci hangi girdiyi seçtiğini bu sayıyla
      söylüyor; süzülmüş ya da sıralanmış bir listenin kendi sırasını
      gönderseydi yanlış birlik tedaviye alınırdı (kuşam envanterinde
      aynı tuzağa düşülmüştü).
    */
    yatanlar: (village?.saglikYatan || []).map((y, i) => ({
      indeks: i,
      birim: y.birim,
      adet: Math.max(0, Math.floor(y.adet) || 0),
      kalanSaat: Math.round((y.kalanSaat || 0) * 100) / 100,
      toplamSaat: Math.round((y.toplamSaat || y.kalanSaat || 0) * 100) / 100,
      basladi: !!y.basladi,
    })).filter(y => y.adet > 0),
    bekleyen: (village?.saglikYatan || [])
      .filter(y => !y.basladi).reduce((s, y) => s + (Math.floor(y.adet) || 0), 0),
  };
}

module.exports = {
  SAGLIK_PER_SEVIYE, SAGLIK_TAVAN, YATAK_PER_SEVIYE, IYILESME_KAT,
  saglikIyilesmeOrani, yatakKapasitesi, yatanSayisi, iyilesmeSaati,
  yaralilariAl, iyilesmeyeBasla, ilerlet, ozet,
};
