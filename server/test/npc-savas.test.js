/**
 * NPC ↔ NPC SAVAŞI — hedefi kim seçiyor.
 *
 * İlkan: *"NPC'ler saldırsınlar, yapay zekâ gibi yapılsınlar."*
 *
 * Kodun eski notu *"NPC-NPC savaşı dengelenmiş ekonomiyi bozar"* diyordu
 * ve endişe haklıydı. Bu testler o endişeyi karşılayan DÖRT SINIRI
 * kilitliyor; sayılar ileride değişebilir, sınırlar değişmemeli.
 */
const test = require('node:test');
const assert = require('node:assert');
const S = require('../game/npcSavas');

/** Düz bir hat üzerinde köyler — mesafe = |q farkı| */
const uzaklik = (a, b) => Math.abs(a.q - b.q);
const koy = (key, q, ordu) => ({ key, slot: { q, name: key }, ordu });

const sec = (saldiran, adaylar, gonder, opt = {}) =>
  S.hedefSec(saldiran, adaylar, gonder, opt.sonSaldiri || (() => 0),
    { now: 1_000_000, beklemeMs: 10_000, uzaklik, ...opt });

test('kendinden ZAYIF olanı seçiyor, güçlüye koşmuyor', () => {
  const saldiran = { key: 'A', slot: { q: 0 } };
  const secilen = sec(saldiran, [
    koy('guclu', 1, 500),     // yakın ama GÜÇLÜ — seçilmemeli
    koy('zayif', 3, 40),      // uzak ama zayıf
  ], 100);

  assert.equal(secilen?.key, 'zayif',
    'kendinden güçlü köye saldırmak ordusunu eritmek olurdu');
});

test('EZİLMİŞ köy farm olmuyor — dünyanın boşalmasını engelleyen sınır', () => {
  const saldiran = { key: 'A', slot: { q: 0 } };
  const ezilmis = koy('ezilmis', 1, S.MIN_SAVUNMA - 1);
  const secilen = sec(saldiran, [ezilmis], 100);

  assert.equal(secilen, null,
    'ordusu bitmiş köye saldırılırsa bir daha toparlanamaz ve dünya boşalır');

  /* Eşiğin üstüne çıkınca yeniden hedef olabiliyor — kalıcı dokunulmazlık değil */
  const toparlanan = koy('ezilmis', 1, S.MIN_SAVUNMA + 5);
  assert.equal(sec(saldiran, [toparlanan], 100)?.key, 'ezilmis');
});

test('aynı köy arka arkaya vurulmuyor', () => {
  const saldiran = { key: 'A', slot: { q: 0 } };
  const hedef = koy('B', 1, 40);

  /* Az önce vuruldu → atlanıyor */
  assert.equal(sec(saldiran, [hedef], 100, { sonSaldiri: () => 995_000 }), null);
  /* Bekleme dolmuş → yeniden hedef */
  assert.equal(sec(saldiran, [hedef], 100, { sonSaldiri: () => 980_000 })?.key, 'B');
});

test('uzaktaki köy görünmüyor — komşuyla uğraşılıyor', () => {
  const saldiran = { key: 'A', slot: { q: 0 } };
  const uzak = koy('uzak', S.MESAFE + 1, 40);
  const yakin = koy('yakin', S.MESAFE - 1, 40);

  assert.equal(sec(saldiran, [uzak], 100), null);
  assert.equal(sec(saldiran, [yakin], 100)?.key, 'yakin');
});

test('birden çok uygun aday varsa EN YAKIN seçiliyor', () => {
  const saldiran = { key: 'A', slot: { q: 0 } };
  const secilen = sec(saldiran, [
    koy('uzakUygun', 9, 30),
    koy('yakinUygun', 2, 30),
    koy('ortaUygun', 5, 30),
  ], 100);
  assert.equal(secilen?.key, 'yakinUygun');
});

test('kendine saldırmıyor ve gönderecek askeri yoksa hedef seçmiyor', () => {
  const saldiran = { key: 'A', slot: { q: 0 } };
  assert.equal(sec(saldiran, [koy('A', 0, 30)], 100), null, 'kendine saldırdı');
  assert.equal(sec(saldiran, [koy('B', 1, 30)], 0), null, 'askersiz sefer açtı');
});
