/**
 * ÜRETİM KUYRUĞU — peşin ödeme ve sıralama.
 *
 * Korunan davranış: kuyrukta bekleyen her iş ÖDENMİŞTİR. Bu değişmez
 * bozulursa eski hata geri gelir — malzemesi olmayan bir sipariş kuyruğun
 * başında takılır ve arkasındaki hazır siparişleri de kilitler.
 */
const test = require('node:test');
const assert = require('node:assert');
const K = require('../game/kuyruk');

test('carp: bedel adetle çarpılıyor', () => {
  assert.deepEqual(K.carp({ demirKulce: 10, kereste: 5 }, 3),
    { demirKulce: 30, kereste: 15 });
  assert.deepEqual(K.carp({}, 5), {}, 'bedelsiz iş için boş bedel');
});

test('eksikler: yalnız YETMEYEN kalemi bildiriyor', () => {
  const havuz = { demirKulce: 25, kereste: 100 };
  assert.deepEqual(K.eksikler(havuz, { demirKulce: 30, kereste: 15 }),
    { demirKulce: 5 }, 'yeterli kalem listeye girmemeli');
  assert.deepEqual(K.eksikler(havuz, { demirKulce: 25 }), {},
    'tam yeterli eksik sayılmaz');
  assert.equal(K.yeterMi(havuz, { demirKulce: 25, kereste: 100 }), true);
  assert.equal(K.yeterMi(havuz, { demirKulce: 26 }), false);
});

test('ekipmanBedeli: aynı parçadan iki tane isteyen birim', () => {
  assert.deepEqual(K.ekipmanBedeli({ equipment: ['kilic', 'kalkan'] }),
    { kilic: 1, kalkan: 1 });
  assert.deepEqual(K.ekipmanBedeli({ equipment: ['kilic', 'kilic'] }),
    { kilic: 2 }, 'tekrar eden parça toplanmalı');
  assert.deepEqual(K.ekipmanBedeli({}), {}, 'ekipmansız birim (göçmen)');
});

test('iade depo tavanını aşmıyor', () => {
  const havuz = { odun: 90, kil: 10 };
  const kayip = K.iadeEt(havuz, { odun: 30, kil: 30 }, { odun: 100, kil: 100 });
  assert.equal(havuz.odun, 100, 'tavana kadar iade');
  assert.equal(havuz.kil, 40);
  assert.deepEqual(kayip, { odun: 20 }, 'sığmayan kısım bildiriliyor');
});

test('iade tavansız havuzda (ekipman) tam ekleniyor', () => {
  const havuz = { kilic: 3 };
  K.iadeEt(havuz, { kilic: 7 }, null);
  assert.equal(havuz.kilic, 10);
});

test('sıralama: bekleyen işler yer değiştirebiliyor', () => {
  const q = [{ id: 1 }, { id: 2 }, { id: 3 }];
  assert.deepEqual(K.tasi(q, 3, 'yukari'), { ok: true, yeniSira: 1 });
  assert.deepEqual(q.map((o) => o.id), [1, 3, 2]);
  K.tasi(q, 1, 'asagi');
  assert.deepEqual(q.map((o) => o.id), [3, 1, 2]);
});

test('sıralama: ÜRETİMİ SÜREN iş ilk sırada kalır', () => {
  // Baştaki işin sayacı işliyor: yerini değiştirmek onu baştan başlatırdı
  const q = [{ id: 1, startTime: 5000, waiting: false }, { id: 2 }, { id: 3 }];
  assert.deepEqual(K.tasi(q, 2, 'yukari'), { ok: false, sebep: 'calisan_is' });
  assert.deepEqual(K.tasi(q, 1, 'asagi'), { ok: false, sebep: 'calisan_is' });
  assert.deepEqual(q.map((o) => o.id), [1, 2, 3], 'kuyruk hiç değişmemeli');
  // Arkadakiler yine de sıralanabiliyor
  assert.equal(K.tasi(q, 3, 'yukari').ok, true);
  assert.deepEqual(q.map((o) => o.id), [1, 3, 2]);
});

test('sıralama: BEKLEYEN baştaki işin önüne geçilebilir', () => {
  // Eğitmen yokken baştaki iş başlamamış sayılır — kilit yok
  const q = [{ id: 1, startTime: null, waiting: true }, { id: 2 }];
  assert.equal(K.tasi(q, 2, 'yukari').ok, true);
  assert.deepEqual(q.map((o) => o.id), [2, 1]);
});

test('sıralama: sınırların dışına taşınmıyor', () => {
  const q = [{ id: 1 }, { id: 2 }];
  assert.deepEqual(K.tasi(q, 1, 'yukari'), { ok: false, sebep: 'sinirda' });
  assert.deepEqual(K.tasi(q, 2, 'asagi'), { ok: false, sebep: 'sinirda' });
  assert.deepEqual(K.tasi(q, 99, 'yukari'), { ok: false, sebep: 'siparis_yok' });
});

test('eksik metni oyuncunun okuyacağı gibi yazılıyor', () => {
  assert.equal(K.eksikMetni({ demirKulce: 5, kereste: 12 }),
    '5 külçe demir, 12 kereste');
  assert.equal(K.eksikMetni({ kilic: 2 }), '2 kılıç');
});
