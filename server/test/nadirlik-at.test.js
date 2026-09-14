/**
 * NADİRLİK SINIFLARI ve AT HIZI.
 *
 * İlkan'ın iki kararı:
 *
 *  1) "hero itemleri gri yeşil mavi mor ve turuncu olarak sınıflansın...
 *     düşme şanslarına göre olsun. efsanevi çok nadir düşsün"
 *  2) "kahramana at verince normal birimler attan ne hız bonusu alıyorsa
 *     alsın. atın nadirliği daha da hızlandırsın ve macera da kısalsın
 *     hıza göre"
 *
 * Bu testler ikisinin de sınırlarını kilitliyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const { NADIRLIK, NADIRLIK_SIRA, HERO_ITEMS } = require('../data/heroItemDefs');
const HERO = require('../game/kahraman');
const MACERA = require('../game/macera');
const KUSAM = require('../game/kusam');
const { UNIT_DEFS } = require('../data');

const kahramanla = (at, nadirlik) => ({
  var: true, olu: false, skiller: {}, envanter: [],
  kusanilan: at ? { at: { key: at, nadirlik } } : {},
});
const hizi = (at, nadirlik) => HERO.hizi(kahramanla(at, nadirlik));
const maceraSaat = (tip, at, nadirlik) => {
  const k = kahramanla(at, nadirlik);
  return MACERA.maceraSuresi(tip, HERO.hizi(k), HERO.KAHRAMAN_TABAN_HIZ,
    KUSAM.kusamBonuslari(k).kahraman.maceraHizi || 0);
};

// ── NADİRLİK ────────────────────────────────────────────────────────

test('BEŞ sınıf var ve renkleri gri/yeşil/mavi/mor/turuncu', () => {
  assert.equal(NADIRLIK_SIRA.length, 5);
  assert.deepEqual(NADIRLIK_SIRA, ['siradan', 'iyi', 'nadir', 'epik', 'efsane']);
  for (const key of NADIRLIK_SIRA) {
    assert.ok(NADIRLIK[key], `${key} tanımlı olmalı`);
    assert.match(NADIRLIK[key].renk, /^#[0-9a-f]{6}$/i, `${key} rengi geçerli olmalı`);
  }
  /*
    RENKLER BİRBİRİNDEN AYRI OLMALI. Aynı renkten iki sınıf, oyuncunun
    çerçeveye bakıp neye baktığını anlamasını imkânsız kılardı — sınıfın
    var olma sebebi tam olarak bu.
  */
  const renkler = new Set(NADIRLIK_SIRA.map(k => NADIRLIK[k].renk.toLowerCase()));
  assert.equal(renkler.size, 5, 'her sınıfın rengi kendine ait olmalı');
});

test('ANAHTARLAR KALICI — eski kayıtlar geçerli kalmalı', () => {
  /*
    Oyuncuların envanterinde bu anahtarlar yazılı. Değiştirseydik kayıtlı
    bütün eşyalar bir anda geçersiz olurdu (kusam.js · gecerli).
  */
  for (const eski of ['siradan', 'iyi', 'nadir', 'efsane']) {
    assert.ok(NADIRLIK[eski], `${eski} anahtarı korunmalı`);
  }
});

test('çarpan ve düşme şansı sınıfla birlikte gidiyor', () => {
  for (let i = 1; i < NADIRLIK_SIRA.length; i++) {
    const onceki = NADIRLIK[NADIRLIK_SIRA[i - 1]];
    const simdi = NADIRLIK[NADIRLIK_SIRA[i]];
    assert.ok(simdi.carpan > onceki.carpan,
      `${NADIRLIK_SIRA[i]} bir öncekinden güçlü olmalı`);
    assert.ok(simdi.dusmeAgirligi < onceki.dusmeAgirligi,
      `${NADIRLIK_SIRA[i]} bir öncekinden NADİR olmalı — yoksa sınıf bir anlam taşımaz`);
  }
  assert.equal(NADIRLIK.siradan.carpan, 1, 'sıradan ölçek birimi olmalı');
});

test('EFSANEVİ çok nadir — ama imkânsız değil', () => {
  const toplam = NADIRLIK_SIRA.reduce((s, k) => s + NADIRLIK[k].dusmeAgirligi, 0);
  const yuzde = (k) => (NADIRLIK[k].dusmeAgirligi / toplam) * 100;
  assert.ok(yuzde('efsane') < 2, 'efsanevi %2 den seyrek düşmeli (İlkan: çok nadir)');
  assert.ok(yuzde('efsane') > 0.2,
    'ama %0,2 den seyrek olmamalı — hiç kimsenin göremediği sınıfın var olma sebebi kalmaz');
  assert.ok(yuzde('siradan') > 40, 'çoğu düşen sıradan olmalı');
});

test('kura gerçekten bu ağırlıklara uyuyor', () => {
  /*
    Ağırlıkları tanımlamak yetmiyor: kura onları OKUMALI. Kurayı sabit
    tohumla değil, çok sayıda çekimle ölçüyoruz — beklenen yüzdeye
    yaklaşması yeterli kanıt.
  */
  const sayim = {};
  let x = 12345;
  const rnd = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  const N = 200000;
  for (let i = 0; i < N; i++) {
    const n = MACERA.nadirlikSec(rnd);
    sayim[n] = (sayim[n] || 0) + 1;
  }
  const toplamAg = NADIRLIK_SIRA.reduce((s, k) => s + NADIRLIK[k].dusmeAgirligi, 0);
  for (const key of NADIRLIK_SIRA) {
    const beklenen = NADIRLIK[key].dusmeAgirligi / toplamAg;
    const olculen = (sayim[key] || 0) / N;
    assert.ok(Math.abs(olculen - beklenen) < beklenen * 0.25 + 0.005,
      `${key}: beklenen ~%${(beklenen * 100).toFixed(2)}, ölçülen %${(olculen * 100).toFixed(2)}`);
  }
  assert.ok(sayim.efsane > 0, 'efsanevi bir kere bile düşmüyorsa kura kırık demektir');
});

// ── AT HIZI ─────────────────────────────────────────────────────────

test('at eki BİRİM TANIMLARINDAN ölçülüyor, uydurulmuyor', () => {
  const ort = (tur) => {
    const h = Object.values(UNIT_DEFS)
      .filter(d => d.category === tur && d.stats?.hiz > 0).map(d => d.stats.hiz);
    return h.reduce((a, b) => a + b, 0) / h.length;
  };
  const beklenen = Math.round((ort('suvari') - ort('piyade')) * 10) / 10;
  assert.equal(HERO.AT_HIZ_EKI, beklenen,
    'at eki süvari-piyade hız farkından türemeli — sabit yazılsaydı '
    + 'birimler dengelenirken kahraman sessizce ayrışırdı');
  assert.ok(HERO.AT_HIZ_EKI > 0, 'at hızlandırmalı');
});

test('atlı kahraman bir SÜVARİ mertebesinde hızlı', () => {
  const yaya = hizi(null);
  assert.equal(yaya, HERO.KAHRAMAN_TABAN_HIZ, 'atsız kahraman yaya hızında');
  const suvariHizlari = Object.values(UNIT_DEFS)
    .filter(d => d.category === 'suvari').map(d => d.stats.hiz);
  const enYavasSuvari = Math.min(...suvariHizlari);
  const atli = hizi('koyBeygiri', 'siradan');
  assert.ok(atli > yaya, 'at takınca hızlanmalı');
  assert.ok(atli >= enYavasSuvari,
    'en sıradan atlı kahraman bile en yavaş süvari kadar hızlı olmalı');
});

test('atın NADİRLİĞİ daha da hızlandırıyor', () => {
  for (const at of Object.keys(HERO_ITEMS).filter(k => HERO_ITEMS[k].slot === 'at')) {
    let onceki = 0;
    for (const n of NADIRLIK_SIRA) {
      const h = hizi(at, n);
      assert.ok(h > onceki, `${at}: ${n} bir önceki sınıftan hızlı olmalı`);
      onceki = h;
    }
  }
});

test('hiçbir at tavana ÇARPMIYOR — nadirlik sonuna kadar işliyor', () => {
  /*
    Tavana çarpan bir at, epik ile efsaneviyi aynı hıza indirir; oyuncu
    daha nadir olanı bulduğunda hiçbir fark göremezdi. Tavan yine de
    duruyor: ilerde eklenecek bir at ya da bonus onu aşabilir.
  */
  for (const at of Object.keys(HERO_ITEMS).filter(k => HERO_ITEMS[k].slot === 'at')) {
    assert.ok(hizi(at, 'efsane') < HERO.KAHRAMAN_HIZ_TAVANI,
      `${at} efsanevi hâliyle tavana çarpıyor — nadirliğin karşılığı kayboluyor`);
  }
});

test('HIZ YALNIZ AT SLOTUNDAN geliyor', () => {
  // Başka slotlara dağılsaydı hız görünmez bir yerden birikir ve oyuncu
  // kahramanının neden hızlandığını anlayamazdı.
  for (const [key, def] of Object.entries(HERO_ITEMS)) {
    if (def.kahramanBonus?.hiz) {
      assert.equal(def.slot, 'at', `${key} hız veriyor ama at değil`);
    }
  }
});

// ── MACERA SÜRESİ ───────────────────────────────────────────────────

test('macera HIZLA kısalıyor, yaya kahramanda hiç değişmiyor', () => {
  for (const tip of Object.keys(MACERA.MACERA_TIPLERI)) {
    const ham = MACERA.MACERA_TIPLERI[tip].saat;
    assert.equal(maceraSaat(tip, null), ham,
      'yaya kahramanda tanımdaki süre aynen kalmalı — yeni kural mevcut '
      + 'dengeyi yalnız at takıldığında değiştirmeli');
    assert.ok(maceraSaat(tip, 'koyBeygiri', 'siradan') < ham, 'at süreyi kısaltmalı');
    assert.ok(maceraSaat(tip, 'kuzeyRuzgari', 'efsane')
      < maceraSaat(tip, 'kuzeyRuzgari', 'siradan'),
      'aynı atın nadiri daha da kısaltmalı');
  }
});

test('macera süresinin ZEMİNİ var', () => {
  /*
    Sınırsız olsaydı efsanevi atlı kahraman maceraları anında bitirir,
    asıl sınır olan macera SAYISI (konak) anlamsızlaşırdı.
  */
  const enHizli = MACERA.maceraSuresi('uzun', 1000, HERO.KAHRAMAN_TABAN_HIZ, 100);
  const ham = MACERA.MACERA_TIPLERI.uzun.saat;
  assert.ok(enHizli >= ham * MACERA.MACERA_SURE_ZEMINI - 0.01,
    'zemin altına inmemeli');
  assert.ok(MACERA.MACERA_SURE_ZEMINI > 0.2 && MACERA.MACERA_SURE_ZEMINI < 1);
});

test('zemin çoğu atta DOLMUYOR — yoksa nadirlik süreye yansımaz', () => {
  const zemin = MACERA.MACERA_TIPLERI.uzun.saat * MACERA.MACERA_SURE_ZEMINI;
  const tavandakiAt = maceraSaat('uzun', 'kuzeyRuzgari', 'efsane');
  assert.ok(tavandakiAt > zemin + 0.01,
    'en hızlı at bile zemine dayanıyorsa hız ile süre arasındaki bağ kopar');
});

test('süre bozuk girdiyle çökertmiyor', () => {
  assert.equal(MACERA.maceraSuresi('boyleBirTipYok', 10, 7, 0), 0);
  assert.equal(MACERA.maceraSuresi('kisa', 0, 7, 0), MACERA.MACERA_TIPLERI.kisa.saat,
    'hız 0 ise taban süre — bölme hatası olmamalı');
  assert.equal(MACERA.sureCarpani(7, 0, 0), 1);
});
