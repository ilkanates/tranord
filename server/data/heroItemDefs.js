/**
 * KAHRAMAN EŞYALARI — slotlar, nadirlik ve bonus türleri.
 *
 * İlkan'ın tarifi: *"itemler tek tek birimlerin saldırı ve def puanlarını
 * arttırabilsin... baya item çeşitleri olsun kılıç kalkan zırh bileklik
 * miğfer ayakkabı pantolon vs."*
 *
 * TEMEL KARARLAR
 *
 * 1) BONUS İKİ KANALDA: kahramanın kendisine (KAHRAMAN_BONUSLARI) ve
 *    ORDUYA (birim tiplerinin saldırı/savunmasına). İkincisi sistemin
 *    asıl derinliği — ordu kompozisyonunu eşyaya bağlıyor.
 *
 * 2) ORDU BONUSU EKİPMAN HAVUZUNDAN AYRI hesaplanıyor. İkisi aynı yerden
 *    geçseydi mevcut ekipman dengesi (kılıç/kalkan seviyeleri) bozulur ve
 *    oyuncu iki sistemi ayırt edemezdi.
 *
 * 3) NADİRLİK bonusu ÖLÇEKLİYOR, yeni bonus EKLEMİYOR. "Efsane kılıç"ın
 *    sıradan kılıçtan farkı sayının büyüklüğü olmalı; farklı bir etki
 *    olsaydı her nadirlik ayrı bir eşya gibi öğrenilmek zorunda kalırdı.
 *
 * 4) ANAHTARLAR KALICI. Oyuncunun envanterinde bu anahtarlar duruyor;
 *    görünen adı değiştir, anahtarı asla.
 */

/**
 * KUŞAM SLOTLARI — her slota tek eşya.
 *
 * Diziliş insan silueti (istemcideki ızgara buna göre): baş üstte, ayak
 * altta, eller iki yanda. `satir`/`sutun` İSTEMCİ İÇİN burada duruyor ki
 * iki taraf ayrışmasın.
 *
 * `ikon` BOŞ SLOTUN ikonu. Hepsi aynı ikonu gösterseydi (ilk hâlde miğfer
 * gösteriyordu) ızgara dokuz özdeş kutuya dönerdi ve oyuncu hangi kutunun
 * ne olduğunu ancak yazıyı okuyarak anlardı.
 */
const HERO_SLOTS = {
  migfer:   { ad: 'Miğfer',    satir: 0, sutun: 1, ikon: 'migfer' },
  sagEl:    { ad: 'Silah',     satir: 1, sutun: 0, ikon: 'kilic' },
  zirh:     { ad: 'Zırh',      satir: 1, sutun: 1, ikon: 'zirh' },
  solEl:    { ad: 'Kalkan',    satir: 1, sutun: 2, ikon: 'kalkan' },
  bileklik: { ad: 'Bileklik',  satir: 2, sutun: 0, ikon: 'kilicKalkan' },
  pantolon: { ad: 'Pantolon',  satir: 2, sutun: 1, ikon: 'zirhci' },
  kolye:    { ad: 'Kolye',     satir: 2, sutun: 2, ikon: 'mizrak' },
  ayakkabi: { ad: 'Ayakkabı',  satir: 3, sutun: 1, ikon: 'tekerlek' },
  at:       { ad: 'At',        satir: 3, sutun: 2, ikon: 'at' },
};

/**
 * NADİRLİK — BEŞ SINIF, renkle ayrılıyor (İlkan'ın kararı):
 * gri · yeşil · mavi · mor · turuncu.
 *
 * RENK SIRASI oyuncunun hiç öğrenmeden bildiği bir dil: envanterde
 * turuncu bir çerçeve gördüğü an neye baktığını anlıyor. Dört sınıfta
 * mor yoktu; "epik" kademesi eklendi ki nadir ile efsanevi arasındaki
 * uçurum (11'de bir → 3'te bir) tek adımda atlanmasın.
 *
 * ÇARPANLAR doğrusal değil (1 · 1,5 · 2,1 · 2,8 · 3,6): efsanevinin
 * sıradandan 3,6 kat iyi olması onu aranır kılıyor; 10 kat olsaydı
 * efsanevi düşmeden hiçbir şeyin anlamı kalmazdı.
 *
 * DÜŞME AĞIRLIKLARI — "efsanevi ÇOK nadir düşsün" (İlkan). Yüzdeye
 * çevirince: %55,8 · %26,9 · %12 · %4 · %1,2. Uzun macerada eşya düşme
 * şansı zaten %12 olduğu için efsanevi bir eşya birkaç yüz maceralık bir
 * hedef — bir sunucu ömrüne yayılmış, ama ulaşılabilir. %0,1 yapsaydık
 * hiç kimse göremez, o hâlde var olmasının bir anlamı kalmazdı.
 *
 * ANAHTARLAR KALICI: oyuncuların envanterinde `siradan/iyi/nadir/efsane`
 * yazıyor. Görünen adları ve renkleri değişti, anahtarlar DEĞİŞMEDİ —
 * değişseydi kayıtlı bütün eşyalar geçersiz olurdu.
 */
const NADIRLIK = {
  siradan: { ad: 'Sıradan',   carpan: 1,   renk: '#8fa3b8', dusmeAgirligi: 56 },
  // Yeşil kademenin adı: dövmesi düzgün, ustasının elinden çıkmış mal.
  iyi:     { ad: 'Ustaişi',   carpan: 1.5, renk: '#57c98a', dusmeAgirligi: 27 },
  nadir:   { ad: 'Nadir',     carpan: 2.1, renk: '#5b9cff', dusmeAgirligi: 12 },
  epik:    { ad: 'Epik',      carpan: 2.8, renk: '#a970ff', dusmeAgirligi: 4 },
  efsane:  { ad: 'Efsanevi',  carpan: 3.6, renk: '#ff8a3d', dusmeAgirligi: 1.2 },
};

const NADIRLIK_SIRA = ['siradan', 'iyi', 'nadir', 'epik', 'efsane'];

/**
 * KAHRAMANIN KENDİSİNE işleyen bonuslar.
 * Değerler TABAN — nadirlik çarpanıyla ölçekleniyor.
 */
const KAHRAMAN_BONUSLARI = {
  saldiri:     { ad: 'Kahraman saldırısı', birim: 'guc' },
  can:         { ad: 'Can tavanı',         birim: 'guc' },
  /*
    ZIRHLANMA — ALINAN HASARI yüzde azaltıyor (macerada da savaşta da).

    Can tavanından FARKLI bir eksen: can tavanı "kaç darbe dayanırım",
    zırhlanma "her darbe ne kadar acıtır". İkisi aynı şeyin iki ölçüsü
    gibi görünse de birlikte çarpım etkisi yapıyor ve oyuncuya gerçek bir
    tercih veriyor — büyük can havuzu mu, az yıpranma mı.

    TAVANI VAR (bkz. kahraman.js · ZIRHLANMA_TAVANI): tavansız bir
    yığılma kahramanı ölümsüz yapar ve macera riskini sıfırlardı.
  */
  zirhlanma:   { ad: 'Alınan hasar',       birim: 'yuzde' },
  /*
    HIZ — YALNIZ AT SLOTUNDAN gelir (İlkan'ın kararı: "kahramanın bir hızı
    olsun ve at bu hızı artırsın SADECE").

    Başka slotlara dağıtılsaydı hız görünmez bir yerden birikir ve oyuncu
    kahramanının neden hızlandığını anlamazdı. Kural testle kilitli:
    at dışındaki hiçbir eşya `hiz` taşıyamaz.
  */
  hiz:         { ad: 'Hız',                 birim: 'guc' },
  iyilesme:    { ad: 'İyileşme hızı',      birim: 'saatlik' },
  maceraHizi:  { ad: 'Macera hızı',        birim: 'yuzde' },
  ganimet:     { ad: 'Ganimet',            birim: 'yuzde' },
};

/**
 * EŞYA TANIMLARI.
 *
 * `birimBonus` = { birimAnahtari: { saldiri?, savunma? } } — İlkan'ın
 * istediği "tek tek birimlerin saldırı ve def puanları". Yüzde olarak
 * uygulanıyor: düz sayı olsaydı 10 askerlik orduda devasa, 1000 askerlik
 * orduda görünmez olurdu.
 *
 * `kahramanBonus` = { alan: taban } — yukarıdaki KAHRAMAN_BONUSLARI.
 *
 * Her eşya İKİSİNDEN BİRİNE ağırlık veriyor, ikisine birden değil: "hem
 * kahramanı hem orduyu büyüten" eşya, seçim yapmayı gerektirmeyen bir
 * eşya olurdu.
 */
/**
 * KULLANILABİLİR EŞYALAR — kuşanılmaz, TÜKETİLİR.
 *
 * Diriltici İksir bunun ilk örneği: kahraman ölünce hammadde ödemenin
 * alternatifi. İki yol olması bilinçli — biriktiren oyuncu kaynağını
 * korur, macera oynamayan oyuncu da yine de kahramanını geri alabilir.
 *
 * Slotu YOK: `slot: null` olan eşya ızgaraya sürüklenmiyor, çantada
 * "KULLAN" düğmesiyle duruyor.
 */
const KULLANILABILIR = new Set(['diriltmeIksiri', 'canIksiri', 'bilgeKitabi']);

const HERO_ITEMS = {
  // ── Kullanılabilir ───────────────────────────────────────────────
  diriltmeIksiri: {
    ad: 'Diriltme İksiri', slot: null, ikon: 'kupa', kullanilir: true,
    aciklama: 'Ölen kahramanı hammadde ödemeden diriltir. Kullanılınca biter.',
    /*
      NADİRLİK BONUSU YOK — iksir ya işe yarar ya yaramaz; "efsane iksir"
      daha çok diriltemez. Nadirlik yine de düşüyor ama yalnız ad ve
      renk olarak, çünkü tek bir eşyayı kura sisteminin dışına almak
      havuzu ikiye bölerdi.
    */
  },

  /*
    CAN İKSİRİ — canı DOLDURUR, tavanı büyütmez.

    Tavanı kalıcı büyütseydi sınırsız birikebilen bir istatistik olurdu
    ve yeterince macera yapan kahraman ölümsüzleşirdi. Doldurmak zaten
    oyuncunun istediği şey: yaralı dönen kahramanı iyileşmeyi beklemeden
    yeniden yollamak.

    ÖLÜ KAHRAMANA İŞLEMEZ — o diriltme iksirinin işi. İkisi aynı şeyi
    yapsaydı diriltme iksirinin nadirliği anlamsız kalırdı.
  */
  canIksiri: {
    ad: 'Can İksiri', slot: null, ikon: 'kupa', kullanilir: true,
    aciklama: 'Kahramanın canını tamamen doldurur. Ölü kahramana işlemez; '
      + 'kullanılınca biter.',
  },

  /*
    BİLGELİK KİTABI — skil puanlarını geri verir.

    Skil sıfırlamanın TEK yolu (İlkan'ın kararı). Hammadde ödeyerek
    sıfırlama kalktı: bedel katlanıyordu ama "her savaştan önce skil
    değiştir" istismarına yalnız fiyatla direniyordu. Kitap seyrek bir
    eşya, yani sınır fiyat değil BULUNURLUK.
  */
  bilgeKitabi: {
    ad: 'Bilgelik Kitabı', slot: null, ikon: 'kitap', kullanilir: true,
    aciklama: 'Dağıttığın bütün skil puanlarını geri verir. Skilleri '
      + 'sıfırlamanın tek yolu; kullanılınca biter.',
  },

  // ── Silah (sağ el) ───────────────────────────────────────────────
  fjordKilici: {
    ad: 'Fjord Kılıcı', slot: 'sagEl', ikon: 'kilic',
    aciklama: 'Kahramanın kendi vuruşunu büyüten dövme kılıç.',
    kahramanBonus: { saldiri: 120 },
  },
  savasBaltasi: {
    ad: 'Savaş Baltası', slot: 'sagEl', ikon: 'kilic',
    aciklama: 'Ağır balta: piyadenin saldırısını büyütür.',
    birimBonus: { piyade: { saldiri: 6 } },
  },
  avMizragi: {
    ad: 'Av Mızrağı', slot: 'sagEl', ikon: 'mizrak',
    aciklama: 'Uzun menzil: süvarinin saldırısını büyütür.',
    birimBonus: { suvari: { saldiri: 6 } },
  },

  // ── Kalkan (sol el) ──────────────────────────────────────────────
  yuvarlakKalkan: {
    ad: 'Yuvarlak Kalkan', slot: 'solEl', ikon: 'kalkan',
    aciklama: 'Kahramanın canını büyütür.',
    kahramanBonus: { can: 60 },
  },
  demirKalkan: {
    ad: 'Demir Kalkan', slot: 'solEl', ikon: 'kalkan',
    aciklama: 'Kahramanın ALDIĞI HASARI azaltır — macerada da savaşta da.',
    kahramanBonus: { zirhlanma: 6 },
  },
  kuleKalkani: {
    ad: 'Kule Kalkanı', slot: 'solEl', ikon: 'kalkan',
    aciklama: 'Piyadenin savunmasını büyütür.',
    birimBonus: { piyade: { savunma: 7 } },
  },

  // ── Zırh ─────────────────────────────────────────────────────────
  zincirZirh: {
    ad: 'Zincir Zırh', slot: 'zirh', ikon: 'zirh',
    aciklama: 'Kahramanın canını ve iyileşmesini büyütür.',
    kahramanBonus: { can: 80, iyilesme: 1 },
  },
  aynaZirh: {
    ad: 'Ayna Zırh', slot: 'zirh', ikon: 'zirh',
    aciklama: 'Ağır levha zırh: alınan hasarı belirgin şekilde azaltır.',
    kahramanBonus: { zirhlanma: 9 },
  },
  pulZirh: {
    ad: 'Pul Zırh', slot: 'zirh', ikon: 'zirh',
    aciklama: 'Bütün birimlerin savunmasını büyütür.',
    birimBonus: { piyade: { savunma: 4 }, suvari: { savunma: 4 } },
  },

  // ── Miğfer ───────────────────────────────────────────────────────
  boynuzluMigfer: {
    ad: 'Boynuzlu Miğfer', slot: 'migfer', ikon: 'migfer',
    aciklama: 'Kahramanın saldırısını büyütür.',
    kahramanBonus: { saldiri: 70 },
  },
  gozlukluMigfer: {
    ad: 'Gözlüklü Miğfer', slot: 'migfer', ikon: 'migfer',
    aciklama: 'Süvarinin savunmasını büyütür.',
    birimBonus: { suvari: { savunma: 6 } },
  },
  demirMigfer: {
    ad: 'Demir Miğfer', slot: 'migfer', ikon: 'migfer',
    aciklama: 'Alınan hasarı azaltır ve canı biraz büyütür.',
    kahramanBonus: { zirhlanma: 4, can: 25 },
  },

  // ── Pantolon ─────────────────────────────────────────────────────
  deriPantolon: {
    ad: 'Deri Pantolon', slot: 'pantolon', ikon: 'zirh',
    aciklama: 'Kahramanın canını büyütür.',
    kahramanBonus: { can: 40 },
  },
  zincirEtek: {
    ad: 'Zincir Etek', slot: 'pantolon', ikon: 'zirh',
    aciklama: 'Alınan hasarı azaltır.',
    kahramanBonus: { zirhlanma: 4 },
  },
  zirhliPantolon: {
    ad: 'Zırhlı Pantolon', slot: 'pantolon', ikon: 'zirh',
    aciklama: 'Piyadenin savunmasını büyütür.',
    birimBonus: { piyade: { savunma: 4 } },
  },

  // ── Ayakkabı ─────────────────────────────────────────────────────
  kurtPostuCizme: {
    ad: 'Kurt Postu Çizme', slot: 'ayakkabi', ikon: 'tekerlek',
    aciklama: 'Maceraları kısaltır.',
    kahramanBonus: { maceraHizi: 15 },
  },
  demirNalliCizme: {
    ad: 'Demir Nallı Çizme', slot: 'ayakkabi', ikon: 'tekerlek',
    aciklama: 'Kahramanın iyileşmesini hızlandırır.',
    kahramanBonus: { iyilesme: 2 },
  },
  kutupTilkisiPostu: {
    ad: 'Kutup Tilkisi Postu', slot: 'ayakkabi', ikon: 'tekerlek',
    aciklama: 'Hem iyileşmeyi hızlandırır hem alınan hasarı biraz azaltır — '
      + 'uzun maceralar için.',
    kahramanBonus: { iyilesme: 1.5, zirhlanma: 3 },
  },

  // ── Bileklik ─────────────────────────────────────────────────────
  runBileklik: {
    ad: 'Rún Bilekliği', slot: 'bileklik', ikon: 'kilicKalkan',
    aciklama: 'Piyadenin saldırısını büyütür.',
    birimBonus: { piyade: { saldiri: 5 } },
  },
  gumusBileklik: {
    ad: 'Gümüş Bileklik', slot: 'bileklik', ikon: 'kilicKalkan',
    aciklama: 'Maceradan dönen ganimeti büyütür.',
    kahramanBonus: { ganimet: 20 },
  },
  sifaTasi: {
    ad: 'Şifa Taşı', slot: 'bileklik', ikon: 'kupa',
    aciklama: 'Kahramanın iyileşmesini belirgin şekilde hızlandırır.',
    kahramanBonus: { iyilesme: 3 },
  },

  // ── Kolye ────────────────────────────────────────────────────────
  kurtDisiKolye: {
    ad: 'Kurt Dişi Kolye', slot: 'kolye', ikon: 'kalkan',
    aciklama: 'Süvarinin saldırısını büyütür.',
    birimBonus: { suvari: { saldiri: 5 } },
  },
  amberKolye: {
    ad: 'Amber Kolye', slot: 'kolye', ikon: 'kalkan',
    aciklama: 'Kahramanın canını ve saldırısını dengeli büyütür.',
    kahramanBonus: { can: 35, saldiri: 40 },
  },

  // ── At ───────────────────────────────────────────────────────────
  /*
    ATLAR — hem kahramanı SÜVARİ yapıyor hem hızını büyütüyor.

    AT TAKAN KAHRAMAN, NORMAL BİR BİRİMİN ATTAN ALDIĞI HIZI ALIYOR
    (İlkan'ın kararı). O fark uydurulmuyor, birim tanımlarından
    ÖLÇÜLÜYOR: süvarilerin ortalama hızı eksi piyadelerin ortalama hızı
    (bkz. kahraman.js · AT_HIZ_EKI). Bugün ≈4,6 — yani atlı kahraman
    demirAtli mertebesinde. Sabit bir sayı yazsaydık birim hızları
    değiştiğinde kahraman sessizce ayrışırdı.

    ATIN KENDİ HIZI bunun ÜSTÜNE biniyor ve NADİRLİK onu ölçekliyor
    (İlkan: "atın nadirliği daha da hızlandırsın"). Sıralama yavaştan
    hızlıya:

      Zırhlı At 0,4 · Köy Beygiri 0,8 · Savaş Atı 0,8
      · Fiyort Midillisi 1,2 · Bozkır Atı 1,6 · Kuzey Rüzgârı 2,2

    Hız tek eksen DEĞİL: hızlı at savaşa bir şey katmıyor, ağır at yavaş
    ama vuruyor ya da koruyor. Tek bir "en iyi at" olsaydı diğerleri çöp
    olur, at slotu bir seçim olmaktan çıkardı.

    Gerçek aralık: yaya 7 · sıradan zırhlı at ≈12 · efsanevi Kuzey
    Rüzgârı ≈19,5 (tavan 20).
  */
  koyBeygiri: {
    ad: 'Köy Beygiri', slot: 'at', ikon: 'at',
    aciklama: 'Sıradan bir yük atı — ama yürümekten iyidir. Kahramanı '
      + 'SÜVARİ yapar ve biraz dayanıklılık katar.',
    kahramanBonus: { hiz: 0.8, can: 20 },
  },
  zirhliAt: {
    ad: 'Zırhlı At', slot: 'at', ikon: 'at',
    aciklama: 'Örtü zırhlı ağır at: yavaş ama binicisini koruyor.',
    kahramanBonus: { hiz: 0.4, zirhlanma: 5 },
  },
  savasAti: {
    ad: 'Savaş Atı', slot: 'at', ikon: 'at',
    aciklama: 'Ağır savaş atı: kahramanın ve süvarinin saldırısını büyütür. '
      + 'Hızı vasat.',
    kahramanBonus: { hiz: 0.8, saldiri: 60 },
    birimBonus: { suvari: { saldiri: 3 } },
  },
  fiyortMidillisi: {
    ad: 'Fiyort Midillisi', slot: 'at', ikon: 'at',
    aciklama: 'Dayanıklı dağ midillisi: orta hızlı, kahramanın iyileşmesini '
      + 'hızlandırır.',
    kahramanBonus: { hiz: 1.2, iyilesme: 1 },
  },
  bozkirAti: {
    ad: 'Bozkır Atı', slot: 'at', ikon: 'at',
    aciklama: 'Hızlı bozkır atı: yolu kısaltır ve maceraları hızlandırır.',
    kahramanBonus: { hiz: 1.6, maceraHizi: 25 },
  },
  kuzeyRuzgari: {
    ad: 'Kuzey Rüzgârı', slot: 'at', ikon: 'at',
    aciklama: 'En hızlı at. Savaşa hiçbir şey katmaz — tek işi yolu yutmak.',
    kahramanBonus: { hiz: 2.2 },
  },
};

const HERO_ITEM_KEYS = Object.keys(HERO_ITEMS);
/** Kuşanılabilir (slotu olan) eşyalar — macera kurası bunlardan çekiyor */
const KUSANILABILIR_KEYS = HERO_ITEM_KEYS.filter(k => HERO_ITEMS[k].slot);

module.exports = {
  HERO_SLOTS, NADIRLIK, NADIRLIK_SIRA,
  KAHRAMAN_BONUSLARI, HERO_ITEMS, HERO_ITEM_KEYS,
  KULLANILABILIR, KUSANILABILIR_KEYS,
};
