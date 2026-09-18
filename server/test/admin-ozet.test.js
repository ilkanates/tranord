/**
 * ADMİN ÖZETİ — panelin gösterdiği sayılar DOĞRU mu.
 *
 * Bu testin sebebi tek cümleyle: **yanlış bir ortalama, hiç olmayan bir
 * ortalamadan daha tehlikelidir.** Panel bir teşhis aracı; ona bakıp
 * "dünya iyi durumda" denip 700 köylük bir hata gözden kaçabilir. Sayı
 * yoksa kimse karar vermez, sayı yanlışsa herkes yanlış karar verir.
 *
 * ORTANCA ayrıca kilitleniyor çünkü asıl iş onda: sıfırlamadan önce
 * dünyanın ORTALAMA ordusu sıfırdan büyüktü (birkaç köyde asker vardı)
 * ama ORTANCA 0'dı — köylerin yarısından fazlasının hiç askeri yoktu.
 * Karar ortancadan çıktı.
 */
const test = require('node:test');
const assert = require('node:assert');
const OZET = require('../game/adminOzet');

/** Dar bir sahte köy — özetin okuduğu alanlar kadarı */
const koy = ({ nufus = 0, army = {}, binalar = [], tarlalar = [] } = {}) => ({
  population: nufus,
  maxPopulation: nufus,
  freeWorkers: 0,
  isStarving: false,
  army,
  villageBuildings: Object.fromEntries(
    binalar.map((b, i) => [`${i},0`, { type: b.type, level: b.level }])),
  productionTiles: Object.fromEntries(
    tarlalar.map((t, i) => [`${i},1`, { type: 'odun', level: t }])),
  marches: [],
  resources: {},
});

test('dagilim: ortanca ve "hic yok" ayri ayri dogru', () => {
  const d = OZET.dagilim([0, 0, 0, 10, 100]);
  assert.equal(d.adet, 5);
  assert.equal(d.toplam, 110);
  assert.equal(d.ortalama, 22);
  /*
    ASIL İDDİA: ortalama 22 ama ortanca 0. İkisi birlikte verilmeseydi
    "ortalama 22 asker" cümlesi köylerin çoğunun ordusuz olduğunu
    gizlerdi — canlıda tam olarak bu oldu.
  */
  assert.equal(d.ortanca, 0, 'ortanca ortalamayla karıştırılmış');
  assert.equal(d.sifir, 3, '"hiç yok" sayısı yanlış');
  assert.equal(d.enCok, 100);
});

test('dagilim: bos liste cokmeden sifir donuyor', () => {
  const d = OZET.dagilim([]);
  assert.deepEqual(d, { adet: 0, toplam: 0, ortalama: 0, ortanca: 0, p90: 0, enCok: 0, sifir: 0 });
});

test('dagilim: kesir gurultusu yuvarlaniyor', () => {
  /*
    Ondalıklı ölçülerde toplam ekrana `4642.2000000000035` diye
    çıkıyordu — kayan noktalı toplamanın birikmiş hatası. Sayı doğru
    ama okunamaz hâli panele güveni düşürüyor.
  */
  const d = OZET.dagilim([6.3, 6.3, 6.3]);
  assert.equal(d.toplam, 18.9);
  assert.ok(String(d.toplam).length < 8, `toplam okunamaz: ${d.toplam}`);
});

test('koyOzeti: ordu, saldiri ve savunma ayni ordudan turuyor', () => {
  const o = OZET.koyOzeti(koy({ army: { fjordvakt: 10 } }));
  assert.equal(o.ordu, 10);
  /* Güç değerleri birim tanımlarından geliyor; sıfır olmamalı */
  assert.ok(o.saldiri > 0, 'saldırı gücü hesaplanmadı');
  assert.ok(o.savunma > 0, 'savunma gücü hesaplanmadı');

  /* Ordusuz köy her üçünde de sıfır — "hiç yok" sayımı buna dayanıyor */
  const bos = OZET.koyOzeti(koy());
  assert.equal(bos.ordu, 0);
  assert.equal(bos.saldiri, 0);
  assert.equal(bos.savunma, 0);
});

test('koyOzeti: ISLEME zinciri sayiliyor — bugunku hatanin durdugu yer', () => {
  /*
    700 köyde değirmen/fırın/işlik olmaması haftalarca fark edilmedi.
    Bu sayının doğru olması, aynı hatanın bir daha sessiz kalmamasının
    tek güvencesi.
  */
  const bos = OZET.koyOzeti(koy({ binalar: [{ type: 'anaBina', level: 5 }] }));
  assert.equal(bos.isleme, 0, 'işleme binası olmayan köy sıfır saymalı');

  const tam = OZET.koyOzeti(koy({
    binalar: OZET.ISLEME.map(t => ({ type: t, level: 3 })),
  }));
  assert.equal(tam.isleme, OZET.ISLEME.length);
});

test('koyOzeti: seviye ve tarla olculeri', () => {
  const o = OZET.koyOzeti(koy({
    nufus: 120,
    binalar: [{ type: 'anaBina', level: 7 }, { type: 'sur', level: 4 }],
    tarlalar: [2, 4, 6],
  }));
  assert.equal(o.nufus, 120);
  assert.equal(o.anaBina, 7);
  assert.equal(o.sur, 4);
  assert.equal(o.tarlaSayisi, 3);
  assert.equal(o.tarlaOrtSeviye, 4);
  assert.equal(o.binaSeviyeToplam, 11);
});

test('toplulukOzeti: "kac koyde var" SAYI olarak veriliyor', () => {
  const koyler = [
    koy({ binalar: [{ type: 'firin', level: 2 }] }),
    koy({ binalar: [{ type: 'firin', level: 4 }] }),
    koy({ binalar: [{ type: 'kisla', level: 1 }] }),
  ];
  const t = OZET.toplulukOzeti(koyler);
  assert.equal(t.koySayisi, 3);
  /*
    "3 köyün 2'sinde fırın var" cümlesi, aynı bilgiyi yüzde olarak
    vermekten kat kat anlaşılır ve karar aldırır.
  */
  assert.equal(t.binaVarlik.firin.koy, 2);
  assert.equal(t.binaVarlik.firin.ortSeviye, 3, 'ortalama seviye YALNIZ o binası olanlardan');
  assert.equal(t.binaVarlik.kisla.koy, 1);
  assert.equal(t.binaVarlik.degirmen.koy, 0);
});

test('toplulukOzeti: birim dagilimi butun koyleri topluyor', () => {
  const t = OZET.toplulukOzeti([
    koy({ army: { fjordvakt: 10, kuzeyIzcisi: 2 } }),
    koy({ army: { fjordvakt: 5 } }),
    koy(),
  ]);
  assert.equal(t.birimler.fjordvakt, 15);
  assert.equal(t.birimler.kuzeyIzcisi, 2);
  assert.equal(t.ordu.sifir, 1, 'ordusuz köy sayılmadı');
  assert.equal(t.ordu.toplam, 17);
});

test('toplulukOzeti: bos dunya cokmeden cevap veriyor', () => {
  const t = OZET.toplulukOzeti([]);
  assert.equal(t.koySayisi, 0);
  assert.equal(t.ordu.toplam, 0);
  assert.deepEqual(t.birimler, {});
  /* Bina varlığı tablosu yine dolu gelmeli — satırlar kaybolmasın */
  assert.ok(Object.keys(t.binaVarlik).length > 0);
  assert.equal(t.binaVarlik.firin.koy, 0);
});
