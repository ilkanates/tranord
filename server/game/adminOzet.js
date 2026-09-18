/**
 * adminOzet — dünyanın sayısal röntgeni.
 *
 * İlkan: *"admin ekranı tam bir ayrıntılı inceleme ekranı olsun,
 * olabildiğin kadar bilgi ver."*
 *
 * ── NEDEN AYRI DOSYA ───────────────────────────────────────────────
 *
 * Bu sayılar bir süs değil, TEŞHİS ARACI. Bugün tam olarak bu eksikti:
 * 700 NPC köyü haftalarca hiç gelişmedi ve kimse fark etmedi, çünkü
 * "köylerin kaçında fırın var" sorusunu soracak bir yer yoktu. Cevabı
 * ancak elle yazdığım ölçüm betikleriyle alabildim — o betikler artık
 * bu dosya.
 *
 * Saf fonksiyonlar: içeride ne ağ var ne oturum. Böylece sayıların
 * DOĞRU olduğu testle kilitlenebiliyor; yanlış bir ortalama, hiç
 * olmayan bir ortalamadan daha tehlikeli çünkü ona güvenip karar
 * veriliyor.
 *
 * ── ORTANCA, ORTALAMANIN YANINDA ───────────────────────────────────
 *
 * İkisi birlikte veriliyor çünkü tek başına ortalama YALAN SÖYLER.
 * Bugünkü gerçek örnek: sıfırlamadan önce dünyanın ortalama ordusu
 * sıfırdan büyüktü (birkaç köyde asker vardı) ama ORTANCA 0'dı — yani
 * köylerin yarısından fazlasının hiç askeri yoktu. Karar ortancadan
 * çıktı.
 */

const { UNIT_DEFS, VILLAGE_DEFS } = require('../data');

/**
 * BİR SAYI DİZİSİNİN ÖZETİ.
 *
 * `sifir` alanı özellikle duruyor: "kaç tanesinde hiç yok" sorusu bu
 * oyunda defalarca asıl soru oldu (kaç köyde fırın yok, kaç köyde ordu
 * yok). Ortalamanın içinde kaybolur, ayrı sayılınca görünür.
 */
function dagilim(sayilar) {
  const d = [...sayilar].sort((a, b) => a - b);
  if (!d.length) {
    return { adet: 0, toplam: 0, ortalama: 0, ortanca: 0, p90: 0, enCok: 0, sifir: 0 };
  }
  const ham = d.reduce((s, n) => s + n, 0);
  /*
    KESİR GÜRÜLTÜSÜ YUVARLANIYOR. Ondalıklı ölçülerde (tarla ortalama
    seviyesi gibi) toplam ekrana `4642.2000000000035` diye çıkıyordu;
    kayan noktalı toplamanın birikmiş hatası. Sayı doğru ama okunamaz
    hâli panele güveni düşürüyor.
  */
  const toplam = Math.round(ham * 10) / 10;
  const yuzde = (p) => d[Math.min(d.length - 1, Math.floor(d.length * p))];
  return {
    adet: d.length,
    toplam,
    ortalama: Math.round((ham / d.length) * 10) / 10,
    ortanca: yuzde(0.5),
    p90: yuzde(0.9),
    enCok: d[d.length - 1],
    sifir: d.filter(x => x === 0).length,
  };
}

/**
 * SEFERDEKİ ASKERLER — bu köyden çıkmış, yolda ya da hedefte.
 *
 * `village.army` bunları İÇERMİYOR: sefer açılırken ordudan düşülüyor
 * (army.js · "Askerleri köyden çıkar — yoldayken savunmaya katılmazlar").
 */
function seferdekiler(village) {
  const out = {};
  for (const m of village.marches || []) {
    for (const [k, n] of Object.entries(m.units || {})) {
      if (n > 0) out[k] = (out[k] || 0) + n;
    }
  }
  return out;
}

/**
 * MİSAFİR ASKERLER — bu köyde duran ama BAŞKASINA ait takviyeler.
 *
 * Köyün savunmasına katılıyorlar ama köyün ordusu değiller; sahiplerinin
 * hanesine yazılmaları gerekiyor (bkz. army.js · savunanBirlikler).
 */
function misafirler(village) {
  const out = {};
  for (const t of village.takviyeler || []) {
    for (const [k, n] of Object.entries(t.units || {})) {
      if (n > 0) out[k] = (out[k] || 0) + n;
    }
  }
  return out;
}

/** Ordunun toplam asker sayısı */
const orduSayisi = (army) => Object.values(army || {}).reduce((s, n) => s + (n || 0), 0);

/** Ordunun ham saldırı gücü (ekipman/kahraman bonusu YOK — kaba karşılaştırma) */
const saldiriGucu = (army) => Object.entries(army || {}).reduce(
  (s, [t, n]) => s + (UNIT_DEFS[t]?.stats?.saldiri || 0) * n, 0);

/** Ordunun ham savunma gücü (yaya savunması) */
const savunmaGucu = (army) => Object.entries(army || {}).reduce(
  (s, [t, n]) => s + (UNIT_DEFS[t]?.stats?.yayaSav || 0) * n, 0);

/*
  İŞLEME ZİNCİRİ — bugünkü hatanın tam olarak durduğu yer.

  Bu beş bina olmadan köy ham maddeyi işlenmiş mala çeviremez; ekmek
  olmayınca nüfus, nüfus olmayınca ordu yok. 700 köyde hiçbirinin
  olmadığını görmek, hatayı bulan ölçümdü. Panelde ayrı bir satır
  olarak duruyor ki bir daha sessizce kaybolmasın.
*/
const ISLEME = ['degirmen', 'firin', 'keresteci', 'tuglaci', 'tasci', 'demirci'];
/** Askerî binalar — ordunun kaynağı */
const ASKERI = ['kisla', 'ahir', 'atolye', 'silahci', 'zirh', 'cephane', 'runSalonu'];
/** Savunma yapıları */
const SAVUNMA = ['sur', 'hendek', 'kule'];

/** Köyde bu türden bina var mı */
const varMi = (v, tur) =>
  Object.values(v.villageBuildings || {}).some(b => b && b.type === tur);

/** Köydeki bu türün en yüksek seviyesi (yoksa 0) */
const seviye = (v, tur) =>
  Object.values(v.villageBuildings || {})
    .filter(b => b && b.type === tur)
    .reduce((en, b) => Math.max(en, b.level || 0), 0);

/**
 * TEK KÖYÜN ÖZETİ — toplulaştırmanın yapı taşı.
 *
 * Ham köy nesnesi yerine bu dar özet toplanıyor: panelde gösterilecek
 * her sayı burada bir kez tanımlanıyor, iki farklı yerde iki farklı
 * "ordu" hesabı çıkmıyor.
 */
function koyOzeti(v) {
  const binalar = Object.values(v.villageBuildings || {});
  const tarlalar = Object.values(v.productionTiles || {});
  return {
    nufus: v.population || 0,
    maxNufus: v.maxPopulation || 0,
    bosIsci: v.freeWorkers || 0,
    ac: !!v.isStarving,

    /*
      ÜÇ SAYI AYRI DURUYOR. Toplayıp tek "ordu" yapmak yanlış olurdu:
      evdeki asker burayı savunuyor, yoldaki hiçbir yeri savunmuyor,
      misafir başkasının askeri. Üçü farklı şeyler.
    */
    ordu: orduSayisi(v.army),
    yolda: orduSayisi(seferdekiler(v)),
    misafir: orduSayisi(misafirler(v)),
    saldiri: saldiriGucu(v.army),
    savunma: savunmaGucu(v.army),
    /* Bu köy saldırıya uğrasa sahaya çıkacak toplam savunma */
    savunanToplam: orduSayisi(v.army) + orduSayisi(misafirler(v)),

    anaBina: seviye(v, 'anaBina'),
    binaSayisi: binalar.length,
    binaSeviyeToplam: binalar.reduce((s, b) => s + (b.level || 0), 0),

    tarlaSayisi: tarlalar.length,
    tarlaSeviyeToplam: tarlalar.reduce((s, t) => s + (t.level || 0), 0),
    tarlaOrtSeviye: tarlalar.length
      ? Math.round(tarlalar.reduce((s, t) => s + (t.level || 0), 0) / tarlalar.length * 10) / 10
      : 0,

    isleme: ISLEME.filter(t => varMi(v, t)).length,
    askeri: ASKERI.filter(t => varMi(v, t)).length,
    sur: seviye(v, 'sur'),
    hendek: seviye(v, 'hendek'),
    siginak: seviye(v, 'siginak'),

    seferSayisi: (v.marches || []).length,
    hammadde: ['odun', 'kil', 'tas', 'demir', 'tahil']
      .reduce((s, k) => s + Math.floor(v.resources?.[k] || 0), 0),
  };
}

/**
 * KÖY LİSTESİNİN TOPLU ÖZETİ.
 *
 * `binaVarlik` "kaç köyde bu bina var" diyor — YÜZDE değil SAYI, çünkü
 * "%0,3'ünde fırın var" cümlesi "700 köyün 2'sinde fırın var" kadar
 * çarpmıyor ve karar aldırmıyor.
 */
function toplulukOzeti(koyler) {
  const ozetler = koyler.map(koyOzeti);
  const al = (alan) => dagilim(ozetler.map(o => o[alan]));

  const binaVarlik = {};
  for (const tur of [...ISLEME, ...ASKERI, ...SAVUNMA, 'kahramanKonagi', 'pazar', 'elcilik']) {
    binaVarlik[tur] = {
      ad: VILLAGE_DEFS[tur]?.name || tur,
      koy: koyler.filter(v => varMi(v, tur)).length,
      ortSeviye: (() => {
        const s = koyler.map(v => seviye(v, tur)).filter(x => x > 0);
        return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length * 10) / 10 : 0;
      })(),
    };
  }

  /* Birim dağılımı — dünyada hangi askerden kaç tane var */
  const birimler = {};
  for (const v of koyler) {
    for (const [tur, n] of Object.entries(v.army || {})) {
      if (!n) continue;
      birimler[tur] = (birimler[tur] || 0) + n;
    }
  }

  return {
    koySayisi: koyler.length,
    nufus: al('nufus'),
    ordu: al('ordu'),
    yolda: al('yolda'),
    misafir: al('misafir'),
    savunanToplam: al('savunanToplam'),
    saldiri: al('saldiri'),
    savunma: al('savunma'),
    anaBina: al('anaBina'),
    binaSayisi: al('binaSayisi'),
    tarlaSayisi: al('tarlaSayisi'),
    tarlaOrtSeviye: al('tarlaOrtSeviye'),
    isleme: al('isleme'),
    askeri: al('askeri'),
    sur: al('sur'),
    siginak: al('siginak'),
    hammadde: al('hammadde'),
    acKoy: ozetler.filter(o => o.ac).length,
    binaVarlik,
    birimler,
  };
}

module.exports = {
  dagilim, koyOzeti, toplulukOzeti,
  orduSayisi, saldiriGucu, savunmaGucu,
  seferdekiler, misafirler,
  ISLEME, ASKERI, SAVUNMA,
};
