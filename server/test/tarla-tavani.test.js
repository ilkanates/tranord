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

/**
 * MERKEZ TAŞININCA ESKİ MERKEZİN TARLALARI KIRPILIR.
 *
 * İlkan'ın kararı: *"merkezi başka yere taşıdığında binaların Lvl'i 10'a
 * düşer"*.
 *
 * KIRPMASAYDIK TAVAN DELİNİRDİ: oyuncu merkezi köyden köye taşıyıp her
 * köyün tarlalarını sırayla 20'ye çıkarır, sonunda hepsi 20 olurdu.
 */
const { createVillage } = require('../game/villageState');

function koy(tiles, bosIsci = 0) {
  const v = createVillage(0, 0);
  v.freeWorkers = bosIsci;
  v.productionTiles = tiles;
  return v;
}

test('tavan üstü tarlalar iniyor, altındakilere DOKUNULMUYOR', () => {
  const v = koy({
    a: { type: 'odun', level: 20, workers: 0 },
    b: { type: 'tahil', level: 8, workers: 0 },
    c: { type: 'kil', level: 10, workers: 0 },
  });
  const r = KOY.tarlalariTavanaKirp(v, KOY.TARLA_TAVANI);
  assert.equal(v.productionTiles.a.level, 10);
  assert.equal(v.productionTiles.b.level, 8, 'tavanın altındaki değişmemeli');
  assert.equal(v.productionTiles.c.level, 10, 'tam tavandaki değişmemeli');
  assert.equal(r.dusenTarla, 1);
  assert.equal(r.kaybedilenSeviye, 10);
});

test('İŞÇİ de kırpılıyor ve havuza dönüyor', () => {
  /*
    Düşen seviyenin işçi kapasitesi daha küçük. Kırpmasaydık tarla
    kapasitesinin üstünde işçi tutar, nüfus muhasebesi sessizce şişerdi.
  */
  const v = koy({ a: { type: 'odun', level: 20, workers: 60 } }, 0);
  KOY.tarlalariTavanaKirp(v, KOY.TARLA_TAVANI);
  const maxW = PRODUCTION_DEFS.odun.levels[KOY.TARLA_TAVANI - 1].workers;
  assert.equal(v.productionTiles.a.workers, maxW);
  assert.equal(v.freeWorkers, 60 - maxW, 'fazla işçi havuza dönmeli');
});

test('SÜREN YÜKSELTME iptal ediliyor, işçileri geri geliyor', () => {
  /*
    İptal edilmeseydi taşımanın hemen ardından biten yükseltme kuralı
    atlatırdı: merkez artık burası değil ama tarla 11'e çıkardı.
  */
  const v = koy({
    a: { type: 'kil', level: 10, workers: 0, upgrading: true,
      upgradeWorkersAssigned: 7, upgradeEndTime: 123 },
  }, 0);
  const r = KOY.tarlalariTavanaKirp(v, KOY.TARLA_TAVANI);
  assert.equal(v.productionTiles.a.upgrading, false);
  assert.equal(v.productionTiles.a.upgradeEndTime, null);
  assert.equal(v.freeWorkers, 7, 'ayrılan işçiler havuza dönmeli');
  assert.equal(r.iptalEdilen, 1);
});

test('tavanın ALTINDAKİ yükseltme sürüyor', () => {
  // Lvl 5'ten 6'ya çıkan bir tarlanın taşımayla bir ilgisi yok.
  const v = koy({
    a: { type: 'kil', level: 5, workers: 0, upgrading: true,
      upgradeWorkersAssigned: 3, upgradeEndTime: 999 },
  }, 0);
  const r = KOY.tarlalariTavanaKirp(v, KOY.TARLA_TAVANI);
  assert.equal(v.productionTiles.a.upgrading, true);
  assert.equal(r.iptalEdilen, 0);
  assert.equal(v.freeWorkers, 0);
});

test('bozuk girdi çökertmiyor', () => {
  assert.deepEqual(KOY.tarlalariTavanaKirp(null, 10),
    { dusenTarla: 0, kaybedilenSeviye: 0, iptalEdilen: 0 });
  assert.deepEqual(KOY.tarlalariTavanaKirp(koy({}), 0),
    { dusenTarla: 0, kaybedilenSeviye: 0, iptalEdilen: 0 });
});
