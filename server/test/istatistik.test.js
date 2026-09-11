/**
 * İSTATİSTİK — sıralama oyuncuya göre, ordu bilgisi yok.
 *
 * İki değişmez korunuyor:
 *   1) Bir oyuncunun bütün köyleri TEK satırda toplanır. Köy başına satır
 *      açıldığında iki köylü oyuncu listede iki kez görünüyor ve gerçek
 *      gücü hiçbir yerde okunmuyordu.
 *   2) Asker sayısı sıralamaya hiçbir yoldan sızmaz — ne kendi tablosu
 *      olarak, ne de "köy puanı" gibi bir formülün içinde. Ordu ancak
 *      izci göndererek öğrenilir.
 */
const test = require('node:test');
const assert = require('node:assert');
const IST = require('../game/istatistik');

const koy = (o = {}) => ({
  v: {
    population: o.pop || 0,
    productionTiles: Object.fromEntries((o.tarlalar || []).map((lv, i) => [`t${i}`, { level: lv }])),
    villageBuildings: Object.fromEntries((o.binalar || []).map((lv, i) => [`b${i}`, { level: lv }])),
    army: o.army || {},
    stats: o.stats || {},
  },
  slotKey: o.slot || '0,0',
  adi: o.adi || 'Köy',
});

test('tablolar istenen sırada', () => {
  const b = IST.tablolariKur(new Map([[1, { name: 'A', koyler: [koy()] }]]), 1);
  assert.deepEqual(b.map((x) => x.label), [
    'En büyük nüfus', 'En iyi saldıran', 'En iyi savunan',
    'En çok yağma', 'En büyük alan', 'En büyük köy',
  ]);
});

test('ordu hiçbir tabloda yok', () => {
  const b = IST.tablolariKur(new Map([[1, { name: 'A', koyler: [koy()] }]]), 1);
  const anahtarlar = b.map((x) => x.key);
  for (const yasak of ['army', 'attack', 'defense']) {
    assert.ok(!anahtarlar.includes(yasak), `${yasak} tablosu geri gelmiş`);
  }
  const metin = JSON.stringify(b).toLowerCase();
  assert.ok(!/ordu|asker sayısı/.test(metin.replace(/öldürdüğü asker/g, '')),
    'tablo metinlerinde ordu geçiyor: ' + metin.slice(0, 300));
});

test('köy puanı ORDUYA BAKMAZ — iki köy yalnız orduyla ayrışıyorsa eşit', () => {
  const bos = { population: 100, villageBuildings: { a: { level: 5 } }, productionTiles: {}, army: {} };
  const dolu = { ...bos, army: { kilic: 5000, at: 900 } };
  assert.equal(IST.koyPuani(bos), IST.koyPuani(dolu),
    'puan farkından ordu tahmin edilebilir hâle gelmiş');
});

test('bir oyuncunun köyleri TEK satırda toplanıyor', () => {
  const oyuncular = new Map([
    [1, { name: 'İki Köylü', koyler: [
      koy({ pop: 100, tarlalar: [1, 1], stats: { killsOffense: 10, lootTotal: 300 }, slot: '0,0' }),
      koy({ pop: 80, tarlalar: [1], stats: { killsOffense: 5, lootTotal: 200 }, slot: '1,0' }),
    ] }],
    [2, { name: 'Tek Köylü', koyler: [koy({ pop: 150, tarlalar: [1], slot: '2,0' })] }],
  ]);
  const b = IST.tablolariKur(oyuncular, 1);
  const nufus = b.find((x) => x.key === 'population');
  assert.equal(nufus.rows.length, 2, 'her oyuncu bir satır olmalı');
  assert.deepEqual(nufus.rows.map((r) => [r.name, r.value]),
    [['İki Köylü', 180], ['Tek Köylü', 150]],
    '180 = 100 + 80; köyler toplanmazsa tek köylü öne geçerdi');
  assert.equal(nufus.rows[0].sub, '2 köy', 'kaç köyü olduğu yazmalı');

  const yagma = b.find((x) => x.key === 'lootTotal');
  assert.equal(yagma.rows[0].value, 500, 'ganimet de toplanmalı');
});

test('En büyük köy tablosu köy başına, sahibi yazılı', () => {
  const oyuncular = new Map([
    [1, { name: 'Ali', koyler: [
      koy({ pop: 100, binalar: [10], slot: '0,0', adi: 'Büyük' }),
      koy({ pop: 10, binalar: [1], slot: '1,0', adi: 'Küçük' }),
    ] }],
  ]);
  const b = IST.tablolariKur(oyuncular, 1);
  const koyT = b.find((x) => x.key === 'koyPuani');
  assert.deepEqual(koyT.rows.map((r) => r.name), ['Büyük', 'Küçük'],
    'burada satır KÖY, oyuncu değil');
  assert.equal(koyT.rows[0].sub, 'Ali', 'köyün sahibi yazmalı');
});

test('kendi satırım ilk ona giremesem de geliyor', () => {
  const oyuncular = new Map();
  for (let i = 1; i <= 12; i++) {
    oyuncular.set(i, { name: `O${i}`, koyler: [koy({ pop: 1000 - i * 10, slot: `${i},0` })] });
  }
  const b = IST.tablolariKur(oyuncular, 12);        // en düşük nüfus bende
  const nufus = b.find((x) => x.key === 'population');
  assert.equal(nufus.rows.length, 10);
  assert.equal(nufus.inTop, false);
  assert.equal(nufus.me.rank, 12);
  assert.equal(nufus.me.name, 'O12');
});
