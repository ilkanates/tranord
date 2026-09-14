/**
 * TARLA SEVİYE TAVANI — merkezde 20, diğer köylerde 10.
 *
 * İlkan'ın kararı: *"üretim alanlarını her zaman Lvl 10 ile sınırla,
 * tarlaları yani — ama merkez ise Lvl 20'ye kadar çıkabilsin"*.
 *
 * NEDEN: tarlalar her köyde 20'ye çıkabilirken MERKEZ KÖY diye bir şeyin
 * anlamı kalmıyordu; çoklu köy, birbirinin kopyası yirmi kasabaya
 * dönüşüyordu. Tavanı ikiye ayırmak merkeze gerçek bir üstünlük veriyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const KOY = require('../game/koyKurallari');
const { PRODUCTION_DEFS } = require('../data');

test('merkez 20, diğer köyler 10', () => {
  assert.equal(KOY.tarlaTavani({ isCapital: true }), KOY.TARLA_TAVANI_MERKEZ);
  assert.equal(KOY.tarlaTavani({ isCapital: false }), KOY.TARLA_TAVANI);
  assert.equal(KOY.TARLA_TAVANI, 10);
  assert.equal(KOY.TARLA_TAVANI_MERKEZ, 20);
});

test('köy bilgisi yoksa DÜŞÜK tavan uygulanıyor', () => {
  /*
    Emniyetli taraf: bilinmeyen bir köyü merkez saymak, kuralı sessizce
    delen bir yol açardı.
  */
  assert.equal(KOY.tarlaTavani(null), KOY.TARLA_TAVANI);
  assert.equal(KOY.tarlaTavani({}), KOY.TARLA_TAVANI);
});

test('TANIM TABLOSU 20 seviye taşımaya devam ediyor', () => {
  /*
    Tavan bir KURAL, tablo değil. Tablo kısaltılsaydı merkezin 11-20
    aralığı da yok olurdu; maliyet ve süre satırları orada duruyor.
  */
  for (const [ad, def] of Object.entries(PRODUCTION_DEFS)) {
    assert.equal((def.levels || []).length, KOY.TARLA_TAVANI_MERKEZ,
      `${ad}: tablo merkez tavanı kadar seviye taşımalı`);
  }
});

test('merkez tavanı tablonun sonunu AŞMIYOR', () => {
  // Aşsaydı merkezde "yükselt" düğmesi olmayan bir seviyeye basardı.
  const enUzun = Math.max(...Object.values(PRODUCTION_DEFS).map(d => (d.levels || []).length));
  assert.ok(KOY.TARLA_TAVANI_MERKEZ <= enUzun);
  assert.ok(KOY.TARLA_TAVANI < KOY.TARLA_TAVANI_MERKEZ,
    'iki tavan farklı olmalı, yoksa merkezin bir üstünlüğü kalmaz');
});
