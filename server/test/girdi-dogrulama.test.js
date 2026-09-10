/**
 * GİRDİ DOĞRULAMA — sessiz veri bozulması.
 *
 * Komut kalkanı çökmeyi tutuyor ama bu sınıfı YAKALAMAZ: hata fırlamıyor,
 * bozuk değer sessizce yayılıyor. NaN her karşılaştırmada false döndüğü için
 * bütün korumaları geçiyor:
 *     Math.max(0, Math.min(5, NaN))  ->  NaN
 *     NaN > freeWorkers              ->  false   (koruma devreye girmiyor)
 *     freeWorkers -= NaN             ->  freeWorkers artık NaN
 * Oradan sonra köy bu hâliyle diske yazılıyor — kurtarılamaz.
 *
 * ÖLÇÜM NOKTASI: JSON.stringify(NaN) === 'null'. Yani bozulma istemciye
 * `freeWorkers: null` olarak geliyor; testler tam olarak buna bakıyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const { sunucuBaslat, hesapAc, baglan, bekle } = require('./sunucu');

/** Yayın yapısal değişiklikte gidiyor — birini zorla ve paketi tazele */
async function paketiTazele(oturum, tarla) {
  oturum.soket.emit('assign_production_workers', { slotKey: tarla, workers: 1 });
  await bekle(1200);
}

function sayiMi(x) { return typeof x === 'number' && Number.isFinite(x); }

test('bozuk işçi sayısı köyü NaN yapmaz', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  const tarlalar = Object.keys(oturum.koy.productionTiles || {});
  const hedef = tarlalar[0];
  const baslangic = oturum.koy.freeWorkers;
  assert.ok(sayiMi(baslangic), 'başlangıç freeWorkers sayı olmalı');

  /*
    Bir bozuk istemci ya da elle atılan olay bunların herhangi birini
    gönderebilir. Hiçbiri hata fırlatmıyor — hepsi sessizce NaN üretiyordu.
  */
  const bozukDegerler = ['abc', null, undefined, {}, [], NaN, Infinity, '', '3abc'];
  for (const deger of bozukDegerler) {
    oturum.soket.emit('assign_production_workers', { slotKey: hedef, workers: deger });
    oturum.soket.emit('upgrade_production', { slotKey: tarlalar[1], workers: deger });
    oturum.soket.emit('build_village', { slotKey: '2,0', buildingType: 'ev', workers: deger });
    await bekle(120);
  }
  await bekle(1500);
  await paketiTazele(oturum, hedef);

  assert.ok(sayiMi(oturum.koy.freeWorkers),
    `freeWorkers bozuldu: ${JSON.stringify(oturum.koy.freeWorkers)}`
    + ' (JSON\'da null = sunucuda NaN)');
  assert.ok(sayiMi(oturum.koy.population),
    `population bozuldu: ${JSON.stringify(oturum.koy.population)}`);

  for (const [k, t2] of Object.entries(oturum.koy.productionTiles || {})) {
    assert.ok(sayiMi(t2.workers), `${k} tarlasının işçisi bozuldu: ${JSON.stringify(t2.workers)}`);
    assert.ok(sayiMi(t2.level), `${k} tarlasının seviyesi bozuldu: ${JSON.stringify(t2.level)}`);
  }
  for (const [res, miktar] of Object.entries(oturum.koy.resources || {})) {
    assert.ok(sayiMi(miktar), `${res} kaynağı bozuldu: ${JSON.stringify(miktar)}`);
  }
});

test('kesirli işçi sayısı tam sayıya iniyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  const hedef = Object.keys(oturum.koy.productionTiles || {})[0];
  const once = oturum.koy.freeWorkers;

  // 2,7 işçi hiçbir zaman anlamlı değildi ama eski koşullar (workers < 1)
  // onu geçiriyor ve havuzu kesirli bırakıyordu
  oturum.soket.emit('assign_production_workers', { slotKey: hedef, workers: 2.7 });
  await bekle(1500);

  const isci = oturum.koy.productionTiles[hedef].workers;
  assert.ok(Number.isInteger(isci), `tarla işçisi tam sayı değil: ${isci}`);
  assert.equal(isci, 2, '2,7 aşağı yuvarlanmalıydı');
  assert.ok(Number.isInteger(oturum.koy.freeWorkers),
    `havuz kesirli kaldı: ${oturum.koy.freeWorkers}`);
  assert.equal(oturum.koy.freeWorkers, once - 2);
});

test('geçerli işçi ataması çalışmaya devam ediyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  const hedef = Object.keys(oturum.koy.productionTiles || {})[0];
  const once = oturum.koy.freeWorkers;

  oturum.soket.emit('assign_production_workers', { slotKey: hedef, workers: 3 });
  await bekle(1500);

  assert.equal(oturum.koy.productionTiles[hedef].workers, 3,
    'doğrulama geçerli atamayı da engelliyor');
  assert.equal(oturum.koy.freeWorkers, once - 3);
});
