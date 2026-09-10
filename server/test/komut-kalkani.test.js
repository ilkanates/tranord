/**
 * KOMUT KALKANI — bir oyuncunun komutu sunucuyu düşürebiliyor muydu?
 *
 * Socket.io handler hatalarını YAKALAMAZ: fırlayan hata uncaughtException'a
 * kadar çıkar ve süreç ölür, o an oynayan herkesle birlikte. Buradaki her
 * test tek bir şeyi ölçüyor: komuttan sonra sunucu HÂLÂ CEVAP VERİYOR MU.
 *
 * Her testin kendi sunucusu var; biri çökerse diğerlerinin ölçümü bozulmasın.
 */
const test = require('node:test');
const assert = require('node:assert');
const { sunucuBaslat, hesapAc, baglan, bekle } = require('./sunucu');

/** Komutu yolla, sunucuya nefes aldır, ayakta mı diye bak */
async function komutSonrasiAyaktaMi(sunucu, oturum, gonder) {
  gonder(oturum.soket);
  await bekle(2500);
  return sunucu.ayaktaMi();
}

test('havuzdan fazla işçi isteyen atama sunucuyu düşürmez', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  /*
    Kırılan dal `diff > freeWorkers`. `newW` önce tarlanın maxW'sine
    kırpıldığı için dala ancak maxW havuzdan BÜYÜKKEN girilir — yani
    "havuzu boşalmış oyuncu, kadrosu geniş bir tarlaya işçi istiyor".
    Kurulum: tarlaları Lvl 20 yap (maxW 42), havuzu 42'nin altına indir.
  */
  oturum.soket.emit('dev_max_buildings', { level: 20, tiles: true });
  await bekle(1200);

  const tarlalar = Object.keys(oturum.koy.productionTiles || {});
  assert.ok(tarlalar.length >= 2, 'en az iki üretim tarlası bekleniyordu');
  const [hedef, komsu] = tarlalar;

  oturum.soket.emit('assign_production_workers', { slotKey: hedef, workers: 0 });
  oturum.soket.emit('assign_production_workers', { slotKey: komsu, workers: 40 });
  await bekle(800);

  const havuz = oturum.koy.freeWorkers;
  const maxW = 42;   // odun/kil/taş Lvl 20 kadrosu (data/productionDefs.js)
  assert.ok(havuz < maxW, `havuz ${maxW}'nin altına inmeliydi, ${havuz} kaldı`);

  const ayakta = await komutSonrasiAyaktaMi(sunucu, oturum, (s) =>
    s.emit('assign_production_workers', { slotKey: hedef, workers: 99 }));

  assert.ok(!/ReferenceError/.test(sunucu.kayit),
    'sunucu günlüğünde ReferenceError var:\n' + sunucu.kayit.slice(-1500));
  assert.ok(ayakta, 'sunucu çöktü — çıkış kodu: ' + sunucu.cikisKodu);
});

test('eksik ya da bozuk yük gönderen komutlar sunucuyu düşürmez', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  /*
    Handler'ların çoğu yükü doğrudan parçalıyor — ({ slotKey, workers }) —
    ve varsayılan `= {}` yok. Argümansız ya da null bir olay, tanımsızı
    parçalamaya kalkıp TypeError fırlatıyor. İstemciden tek satır:
      socket.emit('demolish_village')
    Kalkan olmadan bu, oynayan herkes için sunucunun sonu demekti.
  */
  const kotuYukler = [
    ['demolish_village', undefined],
    ['build_village', null],
    ['upgrade_production', undefined],
    ['assign_village_workers', null],
    ['queue_equipment', undefined],
    ['train_unit', null],
    ['build_production', 'metin-degil-nesne'],
    ['assign_production_workers', 42],
  ];

  for (const [olay, yuk] of kotuYukler) {
    if (yuk === undefined) oturum.soket.emit(olay);
    else oturum.soket.emit(olay, yuk);
  }
  await bekle(3000);

  assert.ok(await sunucu.ayaktaMi(),
    'bozuk yükler sunucuyu düşürdü — çıkış kodu: ' + sunucu.cikisKodu
    + '\n' + sunucu.kayit.slice(-2000));

  // Sunucu sadece "ayakta" değil, komut da işlemeye devam etmeli
  const oncekiHavuz = oturum.koy.freeWorkers;
  oturum.soket.emit('request_stats');
  const istatistik = await new Promise((res) => {
    oturum.soket.once('stats_snapshot', res);
    setTimeout(() => res(null), 8000);
  });
  assert.ok(istatistik, 'sunucu ayakta ama komutlara cevap vermiyor');
  assert.equal(typeof oncekiHavuz, 'number');
});
