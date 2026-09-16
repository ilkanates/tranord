/**
 * KAHRAMAN SEFERDE MAHSUR KALMASIN.
 *
 * İlkan: *"kahraman bir yere gitmiş dönmemiş, seferde gözüküyor"*.
 *
 * Kahraman seferle birlikte YÜRÜMÜYOR (bilinçli tasarım): savaş
 * çözülür çözülmez üssünde sayılıyor, dönüş yolu yalnız orduya ait.
 * Eve dönüşü yazan tek satır `m.kahramanSonuc` doluysa çalışıyor —
 * yani ancak GERÇEKTEN BİR SAVAŞ olduysa.
 *
 * Savaşın hiç olmadığı iki yol var:
 *   1. sefer ilk 90 saniyede GERİ ÇAĞRILDI
 *   2. HEDEF YOK OLDU (köy yıkılmış, kayıt gitmiş)
 *
 * İkisinde de kahraman `nerede: 'sefer'` olarak kalıyordu ve bir daha
 * ne sefere ne maceraya çıkabiliyordu (ikisi de `nerede === 'koy'`
 * şartına bakıyor) — yani kahraman kalıcı olarak kullanılamaz oluyordu.
 *
 * Bu dosya MAHSUR KALMA KOŞULUNU kilitliyor. Emniyet ağının kendisi
 * (`kahramanMahsurKaldiysaOnar`) index.js'te ve oturum gerektiriyor;
 * burada onun dayandığı iki gerçek kontrol ediliyor.
 */
const test = require('node:test');
const assert = require('node:assert');

const ARMY = require('../game/army');
const HERO = require('../game/kahraman');
const MACERA = require('../game/macera');
const { createVillage } = require('../game/villageState');

/** Kahramanı sefere çıkmış gibi işaretle */
function seferdekiKahraman() {
  const k = HERO.yeniKahraman(null);
  k.usSlot = '0,0';
  k.nerede = 'sefer';
  return k;
}

test('geri çağrılan sefer savaş ÇÖZMÜYOR — kahraman sonucu üretilmiyor', () => {
  /*
    Hatanın kökü bu: geri çağırma seferi döndürüyor ama savaş hiç
    olmadığı için `kahramanSonuc` yazılmıyor. Kahramanı eve alan satır
    da yalnız o alan doluyken çalıştığı için hiç çalışmıyordu.
  */
  const koy = createVillage(0, 0);
  koy.army = { fjordvakt: 50 };

  const res = ARMY.createMarch(koy, {
    mode: 'attack', units: { fjordvakt: 50 }, distance: 5,
    fromKey: '0,0', fromName: 'Üs', toKey: '5,5', toName: 'Hedef',
  });
  assert.ok(res.ok, 'sefer kurulamadı: ' + res.reason);

  const march = res.march;
  march.kahraman = { gucu: 100, saldiriYuzde: 5, suvari: false, birim: null };
  march.kahramanUserId = 1;

  const geri = ARMY.seferGeriCagir(koy, march.id);
  assert.ok(geri.ok, 'geri çağrılamadı: ' + geri.reason);
  assert.equal(march.phase, 'return');
  assert.ok(!march.kahramanSonuc,
    'geri çağrılan seferde savaş sonucu olmamalı — mahsur kalmanın sebebi bu');
});

test('hedefi olmayan sefer de savaş ÇÖZMÜYOR', () => {
  /*
    İkinci yol: hedef köy yok olmuş. resolveArrival "hedef_yok"
    raporuyla orduyu geri döndürüyor, savaş yok, kahraman sonucu yok.
  */
  const koy = createVillage(0, 0);
  const march = {
    id: 9, mode: 'attack', units: { fjordvakt: 10 }, distance: 4,
    phase: 'outbound', legHours: 2, remainingHours: 0,
    fromKey: '0,0', fromName: 'Üs', toKey: '9,9', toName: 'Yok Olan',
    kahraman: { gucu: 100 }, kahramanUserId: 1,
  };

  ARMY.resolveArrival(march, koy, null, { targetName: 'Yok Olan' });

  assert.equal(march.phase, 'return', 'ordu geri dönmeli');
  assert.ok(!march.kahramanSonuc,
    'hedefsiz seferde savaş sonucu olmamalı — mahsur kalmanın ikinci sebebi');
  const rapor = (koy.reports || [])[0];
  assert.equal(rapor?.outcome, 'hedef_yok');
});

test('seferde sayılan kahraman ne sefere ne maceraya çıkabiliyor', () => {
  /*
    MAHSUR KALMANIN BEDELİ. İki kapı da `nerede === 'koy'` şartına
    bakıyor; kahraman yanlışlıkla "seferde" kalırsa oyuncu onu bir
    daha hiç kullanamıyor. Emniyet ağının neden gerekli olduğunu bu
    test anlatıyor.
  */
  const k = seferdekiKahraman();
  k.maceraSayisi = 3;
  k.can = 500;
  const uygun = MACERA.maceraUygunMu(k, 'kisa', 100);
  assert.equal(uygun.ok, false, 'seferdeki kahraman maceraya çıkmamalı');
  assert.equal(uygun.sebep, 'mesgul');

  k.nerede = 'koy';
  assert.notEqual(MACERA.maceraUygunMu(k, 'kisa', 100).sebep, 'mesgul',
    'eve dönünce macera kapısı açılmalı');
});

test('kahraman öldüğünde de üssüne dönüyor — mahsur kalmıyor', () => {
  /*
    Üçüncü bir yol olabilirdi: seferde ölen kahraman. hasarVer ölümde
    `nerede`yi üsse çekiyor, yani bu yol zaten kapalı. Kilitli kalsın.
  */
  const k = seferdekiKahraman();
  k.can = 5;
  const sonuc = HERO.hasarVer(k, 9999);
  assert.equal(sonuc.oldu, true);
  assert.equal(k.nerede, 'koy', 'ölen kahraman üssünde sayılmalı');
  assert.equal(k.macera, null);
});
