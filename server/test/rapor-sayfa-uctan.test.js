/**
 * RAPOR SAYFALAMA — UÇTAN UCA.
 *
 * Kural `rapor-filtre.test.js`'te kilitli. Burada KATMAN ARASI sınanıyor,
 * çünkü bu projede bulunan hataların çoğu kuralın kendisinde değil
 * aradaki boşlukta yaşıyordu:
 *
 *   · paket alanı `opts`ta duruyor ama payload.js'e yazılmamış → null
 *     olarak gidiyor (bu depoda tekrarlayan hata sınıfı),
 *   · sayfa olayı var ama cevap dönmüyor,
 *   · filtre anahtarı yolda kayboluyor ve sunucu hep 'all' süzüyor.
 *
 * Taze hesapta rapor YOK; sınanan şey sayıların doğruluğu değil
 * BAĞLANTININ varlığı: alanlar pakette mi, olay cevap veriyor mu,
 * filtre geri yankılanıyor mu.
 */
const test = require('node:test');
const assert = require('node:assert');
const { sunucuBaslat, hesapAc, baglan, bekle } = require('./sunucu');

async function sayfaIste(oturum, istek) {
  let sonuc = null;
  const al = (d) => { if (sonuc === null) sonuc = d; };
  oturum.soket.on('rapor_sayfasi', al);
  oturum.soket.emit('rapor_sayfa', istek);
  for (let i = 0; i < 40 && sonuc === null; i++) await bekle(100);
  oturum.soket.off('rapor_sayfasi', al);
  return sonuc;
}

test('sayfalama alanlari pakette ve sayfa olayi cevap veriyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  const koy = oturum.koy;

  /* PAKET ALANLARI — null gelirse istemci sayfalayıcıyı hiç çizmez */
  assert.equal(typeof koy.raporToplam, 'number', 'raporToplam pakete girmemiş');
  assert.ok(koy.raporSayfaBoyu > 0, 'raporSayfaBoyu pakete girmemiş');
  assert.ok(koy.raporSayilari, 'raporSayilari pakete girmemiş');
  for (const k of ['all', 'out', 'in', 'scout']) {
    assert.equal(typeof koy.raporSayilari[k], 'number', `${k} sayısı yok`);
  }
  /* Paketteki liste bir sayfadan uzun olamaz — bütün raporlar gitmemeli */
  assert.ok((koy.reports || []).length <= koy.raporSayfaBoyu,
    'paket bir sayfadan fazla rapor taşıyor');
  assert.equal(koy.raporSayilari.all, koy.raporToplam,
    'rozet toplamı ile sayfa toplamı ayrı yerlerden geliyor');

  /* OLAY CEVAP VERİYOR ve filtreyi yankılıyor */
  for (const filtre of ['all', 'out', 'in', 'scout']) {
    const cevap = await sayfaIste(oturum, { sayfa: 0, filtre });
    assert.ok(cevap, `${filtre}: rapor_sayfasi gelmedi`);
    assert.equal(cevap.filtre, filtre, `${filtre}: filtre yankılanmadı`);
    assert.equal(cevap.sayfa, 0);
    assert.equal(cevap.sayfaBoyu, koy.raporSayfaBoyu);
    assert.ok(Array.isArray(cevap.raporlar));
    assert.equal(cevap.toplam, cevap.sayilar[filtre],
      `${filtre}: sayfa toplamı rozet sayısıyla uyuşmuyor`);
  }

  /*
    SINIR AŞIMI HATA DEĞİL. Sayfalama bir gezinme aracı; 9999. sayfayı
    isteyen istemci boş liste almalı, sunucu ayakta kalmalı.
  */
  const uzak = await sayfaIste(oturum, { sayfa: 9999, filtre: 'all' });
  assert.ok(uzak, 'uzak sayfa cevapsız kaldı');
  assert.equal(uzak.raporlar.length, 0);
  assert.equal(await sunucu.ayaktaMi(), true, 'sunucu sınır aşımında düştü');

  /* Bozuk girdi de sunucuyu düşürmemeli */
  const bozuk = await sayfaIste(oturum, { sayfa: 'abc', filtre: 42 });
  assert.ok(bozuk, 'bozuk girdi cevapsız kaldı');
  assert.equal(bozuk.sayfa, 0, 'sayısal olmayan sayfa sıfıra düşmedi');
  assert.equal(await sunucu.ayaktaMi(), true, 'sunucu bozuk girdide düştü');
});
