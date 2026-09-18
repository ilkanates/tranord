/**
 * NPC → OYUNCU YAĞMASI — hedef seçimi ve BEKLEMENİN ÖLÇEĞİ.
 *
 * Bu testin asıl sebebi bir ÖLÇEKLEME hatası. Bekleme süresi küresel tek
 * bir sayaçtı: bütün dünyada 6 oyun saatinde bir yağma, kaç oyuncu olursa
 * olsun. Yani oyun büyüdükçe herkesin gördüğü saldırı sıklığı düşüyordu.
 *
 * Bu hatanın kendini göstermesi için oyunun kalabalıklaşması gerekirdi —
 * yani canlıda, aylar sonra, kimse "bugün az saldırı geldi" demeden. Tam
 * olarak testin yakalaması gereken cinsten bir hata.
 */
const test = require('node:test');
const assert = require('node:assert');
const Y = require('../game/npcYagma');

/* Düz bir doğru üstünde mesafe — hex matematiği burada sınanmıyor */
const uzaklik = (a, b) => Math.abs(a.x - b.x);
const npc = (x) => ({ slot: { x } });
const oyuncu = (key, x, userId) => ({ key, slot: { x }, userId, ad: key });

test('en yakin oyuncu seciliyor', () => {
  const secim = Y.hedefSec(npc(0), [oyuncu('uzak', 15, 1), oyuncu('yakin', 3, 2)],
    () => 0, { uzaklik });
  assert.equal(secim.key, 'yakin');
  assert.equal(secim.dist, 3);
});

test('MESAFE disindaki oyuncu gorunmuyor', () => {
  const secim = Y.hedefSec(npc(0), [oyuncu('cokUzak', Y.MESAFE + 1, 1)],
    () => 0, { uzaklik });
  assert.equal(secim, null, 'menzil dışındaki oyuncuya sefer açıldı');

  /* Tam sınırda olan GÖRÜNÜR — sınır kapalı değil */
  const sinir = Y.hedefSec(npc(0), [oyuncu('sinirda', Y.MESAFE, 1)],
    () => 0, { uzaklik });
  assert.equal(sinir?.key, 'sinirda');
});

test('bekleme suresi OYUNCU BASINA — kuresel degil', () => {
  /*
    ASIL İDDİA. Az önce A'ya saldırılmış; B'ye hiç saldırılmamış. Küresel
    sayaçta B de kapalı kalırdı ve dünya oyuncu sayısı arttıkça
    sessizleşirdi.
  */
  const now = 1_000_000;
  const bekleme = 60_000;
  const sonSaldiri = (id) => (id === 1 ? now - 1000 : 0);   // yalnız A yeni vuruldu

  const a = oyuncu('A', 2, 1);
  const b = oyuncu('B', 5, 2);

  const secim = Y.hedefSec(npc(0), [a, b], sonSaldiri,
    { now, beklemeMs: bekleme, uzaklik });
  assert.equal(secim?.key, 'B',
    'yakın oyuncu beklemedeyken uzaktaki oyuncuya da saldırılmıyor — sayaç küresel kalmış');

  /* İkisi de yeni vurulmuşsa hedef yok */
  const hepsiBekliyor = Y.hedefSec(npc(0), [a, b], () => now - 1000,
    { now, beklemeMs: bekleme, uzaklik });
  assert.equal(hepsiBekliyor, null);
});

test('beklemesi dolan oyuncu tekrar hedef olabiliyor', () => {
  const now = 1_000_000;
  const bekleme = 60_000;
  const secim = Y.hedefSec(npc(0), [oyuncu('A', 2, 1)],
    () => now - bekleme - 1, { now, beklemeMs: bekleme, uzaklik });
  assert.equal(secim?.key, 'A');
});

test('aday yoksa cokmeden null donuyor', () => {
  assert.equal(Y.hedefSec(npc(0), [], () => 0, { uzaklik }), null);
  assert.equal(Y.hedefSec(npc(0), [null, undefined], () => 0, { uzaklik }), null);
  assert.equal(Y.hedefSec(npc(0), [{ key: 'slotsuz', userId: 9 }], () => 0, { uzaklik }), null);
});

test('sayilar tek kaynakta ve makul', () => {
  /*
    Sayılar index.js'te kopyalanıyordu. Burada değerlerin KENDİSİ değil,
    anlamlı bir aralıkta olduğu kilitleniyor: biri yanlışlıkla 0 ya da
    devasa bir değer alırsa özellik sessizce ölür ya da dünyayı boğar.
  */
  assert.ok(Y.MESAFE > 0 && Y.MESAFE <= 40, 'menzil makul değil');
  assert.ok(Y.MIN_ORDU >= 1, 'ordusuz NPC sefer açamamalı');
  assert.ok(Y.GONDERME_ORANI > 0 && Y.GONDERME_ORANI < 1,
    'NPC ordusunun TAMAMINI yollamamalı — köyü savunmasız kalır');
  assert.ok(Y.OYUNCU_BEKLEME_SAAT > 0, 'bekleme yoksa oyuncu sürekli vurulur');
});
