/**
 * HAMMADDE GÖNDERİSİ İKİ KÖY ARASINDA — her iki yön de çalışmalı.
 *
 * İlkan bildirdi: *"ilk köyümden ikinciye hammadde yollayabiliyorum ama
 * tam tersini yapamıyorum."*
 *
 * İKİ AYRI HATA ÜST ÜSTE BİNMİŞTİ ve ikisi de SESSİZDİ:
 *
 *   1) Pazar özeti kendi slotunu göndermiyordu (`pazar.slotKey`), o
 *      yüzden istemcinin "hedef zaten bulunduğum köy mü" denetimi hep
 *      `undefined` ile karşılaştırma yapıyor, yani hiç çalışmıyordu.
 *      Oyuncu köy değiştirmeden ilk köyüne "gönder" diyebiliyordu;
 *      sunucu haklı olarak reddediyordu.
 *
 *   2) Panel sunucunun cevabını BEKLEMEDEN kapanıyordu; reddedilen
 *      gönderi hiçbir iz bırakmıyordu.
 *
 * Bu testler SUNUCU ucundan bakıyor: gönderi gerçekten yola çıkıyor mu,
 * ret sebebi gerçekten söyleniyor mu ve pakette denetimin dayandığı alan
 * var mı. Paketteki alanı ölçmek şart: "sunucu doğru ama ekrana gitmiyor"
 * hatası bu projede defalarca oldu.
 */
const test = require('node:test');
const assert = require('node:assert');
const { sunucuBaslat, hesapAc, baglan, bekle } = require('./sunucu');

/** Hammadde gönder, sunucunun cevabını döndür */
function gonderDene(soket, veri) {
  return new Promise((res) => {
    soket.once('hammadde_sonuc', (d) => res(d || {}));
    soket.emit('pazar_hammadde_gonder', veri);
    setTimeout(() => res({ ok: false, sebep: 'cevap_yok' }), 4000);
  });
}

/** İki köylü, her köyde pazarı olan bir oturum kur */
async function ikiKoyluOturum(sunucu, t) {
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  const ilkSlot = oturum.koy.activeSlot;
  oturum.soket.emit('dev_new_village');
  await bekle(2500);

  const koyler = (oturum.koy.villages || []).map(k => k.slotKey);
  assert.ok(koyler.length >= 2, 'ikinci köy kurulamadı: ' + JSON.stringify(koyler));
  const ikinciSlot = koyler.find(k => k !== ilkSlot);

  /*
    HER İKİ KÖYDE DE PAZAR: gönderi GÖNDEREN köyün pazarından çıkıyor.
    `dev_max_buildings` yalnız AKTİF köye işliyor, o yüzden iki kez —
    ilk yazışta ikinci köy pazarsız kalıyor ve test doğru sebeple ama
    yanlış gerekçeyle kırmızıya dönüyordu.
  */
  for (const slot of [ikinciSlot, ilkSlot]) {
    oturum.soket.emit('switch_village', { slotKey: slot });
    await bekle(1200);
    oturum.soket.emit('dev_max_buildings', { level: 20, tiles: true });
    await bekle(2500);
  }
  return { oturum, ilkSlot, ikinciSlot };
}

test('HER İKİ YÖNDE de hammadde gönderilebiliyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { oturum, ilkSlot, ikinciSlot } = await ikiKoyluOturum(sunucu, t);

  // 1 → 2 (İlkan'da çalışan yön)
  const ileri = await gonderDene(oturum.soket,
    { targetKey: ikinciSlot, kaynaklar: { odun: 100 } });
  assert.equal(ileri.ok, true, `ilk köyden ikinciye reddedildi: ${ileri.sebep}`);

  // İkinci köye geç ve TERS yönü dene — bildirilen hata tam burada
  oturum.soket.emit('switch_village', { slotKey: ikinciSlot });
  await bekle(1500);
  assert.equal(oturum.koy.activeSlot, ikinciSlot, 'köy değiştirilemedi');

  const geri = await gonderDene(oturum.soket,
    { targetKey: ilkSlot, kaynaklar: { odun: 100 } });
  assert.equal(geri.ok, true, `ikinci köyden ilkine reddedildi: ${geri.sebep}`);
});

test('BULUNDUĞUN KÖYE gönderi reddediliyor — ve sebebi söyleniyor', async (t) => {
  /*
    Yasak kalkmıyor: sıfır mesafeli gönderi anlamsız. Değişen şey RET
    SEBEBİ. Eskiden "Hedef köy seç" diyordu; oysa oyuncu hedefi seçmişti,
    sorun seçtiği köyün içinde durduğu köy olmasıydı. Panel de bu cevabı
    beklemeden kapandığı için oyuncu hiçbir şey görmüyordu.
  */
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { oturum, ilkSlot } = await ikiKoyluOturum(sunucu, t);

  const r = await gonderDene(oturum.soket,
    { targetKey: ilkSlot, kaynaklar: { odun: 100 } });
  assert.equal(r.ok, false, 'bulunduğun köye gönderi kabul edildi');
  assert.match(r.sebep, /bu köydesin/i,
    `sebep açık olmalı, gelen: ${r.sebep}`);
});

test('PAKET pazarın kendi slotunu taşıyor — istemcinin denetimi buna dayanıyor', async (t) => {
  /*
    Alan YOKKEN istemcideki karşılaştırma `undefined` ile yapılıyor ve
    sessizce hep `false` dönüyordu: "bulunduğun köye gönderemezsin"
    denetimi hiç çalışmadı. Sunucuda doğru olması yetmez, PAKETTE
    olmalı — oyuncunun gördüğü şey paket.
  */
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { oturum, ilkSlot, ikinciSlot } = await ikiKoyluOturum(sunucu, t);

  assert.equal(oturum.koy.pazar?.slotKey, oturum.koy.activeSlot,
    'pazar özeti bulunduğu köyün slotunu taşımalı');

  oturum.soket.emit('switch_village', { slotKey: ikinciSlot });
  await bekle(1500);
  assert.equal(oturum.koy.pazar?.slotKey, ikinciSlot,
    'köy değişince pazar slotu da değişmeli — yoksa denetim eski köye bakar');
  assert.notEqual(oturum.koy.pazar?.slotKey, ilkSlot);
});
