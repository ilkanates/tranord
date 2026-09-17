/**
 * RAPOR FİLTRESİ VE SAYIMI — sayfalamanın dayandığı kural.
 *
 * Sayfalama gelince şu üç şey AYNI cümleden çıkmak zorunda kaldı:
 * sekmelerin süzmesi, rozetlerdeki sayılar ve "kaç sayfa var" hesabı.
 * Ayrı yerlerden çıktıklarında 200 raporluk bir hesapta rozet "HEPSİ 15"
 * diyordu — istemcinin elindeki tek sayfa.
 *
 * Kilitlenen kararlar:
 *
 * 1) Keşif raporları SALDIRILARIM / BANA GELENLER sekmelerinin DIŞINDA.
 *    İzci gönderdiğim her köy saldırı listemi doldursaydı gerçek
 *    saldırılarımı aramak zorunda kalırdım.
 * 2) Sayılar TÜM raporlardan — sayfadan değil.
 * 3) Bilinmeyen filtre anahtarı HER ŞEYİ döndürüyor. Sayfalama bir
 *    gezinme aracı; sınır ya da yazım hatası bir hata ekranı doğurmamalı.
 */
const test = require('node:test');
const assert = require('node:assert');
const R = require('../game/raporTur');

const rapor = (dir, outcome) => ({ dir, outcome });

/* Dört keşif sonucunun DÖRDÜ de keşif sayılıyor — listeden çekiliyor */
test('keşif sonuçlarının hepsi keşif sayılır', () => {
  for (const o of R.KESIF_SONUCLARI) {
    assert.equal(R.kesifMi({ outcome: o }), true, `${o} keşif sayılmadı`);
  }
  assert.equal(R.kesifMi({ outcome: 'saldiri' }), false);
  assert.equal(R.kesifMi(null), false);
});

test('keşif, saldırı ve savunma sekmelerine karışmıyor', () => {
  const liste = [
    rapor('out', 'saldiri'),
    rapor('out', 'kesif'),
    rapor('out', 'kesif_basarisiz'),
    rapor('in', 'savunma'),
    rapor('in', 'kesfedildim'),
  ];
  assert.equal(R.filtrele(liste, 'out').length, 1);
  assert.equal(R.filtrele(liste, 'in').length, 1);
  assert.equal(R.filtrele(liste, 'scout').length, 3);
  assert.equal(R.filtrele(liste, 'all').length, 5);
});

test('sayılar filtrelerle birebir aynı sonucu veriyor', () => {
  const liste = [];
  /* Karışık ama belirli bir liste — her türden birkaç tane */
  for (let i = 0; i < 23; i++) liste.push(rapor('out', 'saldiri'));
  for (let i = 0; i < 11; i++) liste.push(rapor('in', 'savunma'));
  for (let i = 0; i < 7; i++) liste.push(rapor('out', 'kesif'));
  for (let i = 0; i < 3; i++) liste.push(rapor('in', 'kesfedildim'));

  const s = R.sayilar(liste);
  for (const k of ['all', 'out', 'in', 'scout']) {
    assert.equal(s[k], R.filtrele(liste, k).length, `${k} sayısı süzmeyle uyuşmuyor`);
  }
  assert.equal(s.all, 44);
  assert.equal(s.scout, 10);
});

test('bilinmeyen filtre hata değil, tam liste', () => {
  const liste = [rapor('out', 'saldiri'), rapor('in', 'savunma')];
  assert.equal(R.filtrele(liste, 'ne-bu').length, 2);
  assert.equal(R.filtrele(liste, undefined).length, 2);
});
