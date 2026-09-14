/**
 * HAMMADDE GÖNDERİSİ — karşılıksız sevkiyatın yükü.
 *
 * İlkan: *"pazardan istediğime hammadde yollayabilmeliyim"*.
 *
 * Takas tek kaynağı tek kaynakla değişiyordu; hediye BEŞ kaynağı birden
 * yollayabiliyor ve hepsi TEK kervanla gidiyor. Beşi için beş ayrı
 * gönderi açsaydık her biri kendi tüccarını bağlardı — 100'er birimlik
 * beş kaynak, 500 birimlik tek sevkiyatın BEŞ KATI tüccar tutardı.
 *
 * Bu testler iki yük biçiminin de (tek kaynak / karışık) aynı yoldan
 * geçtiğini ve eski kayıtların bozulmadığını tutuyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const YOL = require('../game/pazarYol');

test('KARIŞIK YÜK tek gönderide taşınıyor', () => {
  const g = YOL.gonderi({
    hedefSlot: '3,3', hedefAd: 'Hedef',
    yuk: { odun: 1500, kil: 900 }, tuccar: 2, saat: 1, mesafe: 6,
  });
  assert.deepEqual(g.yuk, { odun: 1500, kil: 900 });
  assert.equal(g.tuccar, 2, 'iki kaynak için tek kervan, tek tüccar hesabı');
});

test('TEK KAYNAK biçimi de yuk alanını dolduruyor', () => {
  /*
    Takas hâlâ kaynak+miktar veriyor. Okuma yolunun tek biçim görmesi
    için gönderi onu da `yuk` olarak yazıyor; `kaynak` alanı eski
    istemci görünümü için yerinde duruyor.
  */
  const g = YOL.gonderi({
    hedefSlot: '1,1', hedefAd: 'H', kaynak: 'demir', miktar: 700,
    tuccar: 1, saat: 1,
  });
  assert.deepEqual(g.yuk, { demir: 700 });
  assert.equal(g.kaynak, 'demir');
  assert.equal(g.miktar, 700);
});

test('yük SIFIR ve eksi değerlerden temizleniyor', () => {
  // İstemciden gelen sözlüğe güvenilmiyor; sunucu da ayrıca süzüyor ama
  // gönderi nesnesi kendi başına da tutarlı olmalı.
  const g = YOL.gonderi({
    hedefSlot: '1,1', hedefAd: 'H',
    yuk: { odun: 100, kil: 0, tas: -50, demir: 12.7 }, tuccar: 1, saat: 1,
  });
  assert.deepEqual(g.yuk, { odun: 100, demir: 12 });
});

test('varışta HER KAYNAK ayrı ayrı teslim ediliyor', () => {
  const v = {
    gonderiler: [YOL.gonderi({
      hedefSlot: '9,9', hedefAd: 'H',
      yuk: { odun: 300, kil: 200, tahil: 50 }, tuccar: 1, saat: 1,
    })],
  };
  const teslim = [];
  YOL.ilerlet(v, 1, (slot, kaynak, miktar) => teslim.push([slot, kaynak, miktar]));
  assert.deepEqual(teslim, [
    ['9,9', 'odun', 300], ['9,9', 'kil', 200], ['9,9', 'tahil', 50],
  ]);
  assert.equal(v.gonderiler[0].faz, 'donus', 'mal indi, kervan dönüyor');
});

test('TÜCCAR DÖNÜNCE serbest kalıyor — tek yön yetmiyor', () => {
  /*
    Gidiş biter bitmez serbest bırakmak mesafeyi bedava yapardı: uzak
    köyle ticaret yakınla aynı maliyete gelirdi.
  */
  const v = {
    gonderiler: [YOL.gonderi({
      hedefSlot: '9,9', hedefAd: 'H', yuk: { odun: 100 }, tuccar: 3, saat: 2,
    })],
  };
  YOL.ilerlet(v, 2, () => {});
  assert.equal(v.gonderiler.length, 1, 'gidiş bitti ama kervan hâlâ yolda');
  assert.equal(v.gonderiler[0].faz, 'donus');
  YOL.ilerlet(v, 2, () => {});
  assert.equal(v.gonderiler.length, 0, 'dönüş bitince tüccarlar serbest');
});

test('ESKİ KAYIT (yuk alanı yok) yine teslim ediliyor', () => {
  // Sürüm öncesi gönderiler diskte kaynak+miktar olarak duruyor.
  const v = {
    gonderiler: [{
      id: 'eski', hedefSlot: '2,2', hedefAd: 'H',
      kaynak: 'kereste', miktar: 400, tuccar: 1,
      faz: 'gidis', legSaat: 1, kalanSaat: 1,
    }],
  };
  const teslim = [];
  YOL.ilerlet(v, 1, (slot, kaynak, miktar) => teslim.push([kaynak, miktar]));
  assert.deepEqual(teslim, [['kereste', 400]]);
});

test('özet yükü de taşıyor', () => {
  const v = {
    gonderiler: [YOL.gonderi({
      hedefSlot: '4,4', hedefAd: 'Dost', yuk: { tas: 250 }, tuccar: 1, saat: 1,
    })],
  };
  const o = YOL.ozet(v, 1)[0];
  assert.deepEqual(o.yuk, { tas: 250 });
  assert.equal(o.hedefAd, 'Dost');
  assert.ok(o.kalanSn > 0);
});

test('mesafe süreyi belirliyor, en az bir alt sınır var', () => {
  assert.ok(YOL.saat(20) > YOL.saat(5), 'uzak köy daha uzun sürmeli');
  assert.equal(YOL.saat(0), YOL.EN_AZ_DAKIKA / 60,
    'komşu köye bile en az bir süre — ışınlanma yok');
});
