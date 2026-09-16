/**
 * GRUP MESAJLAŞMASI — UÇTAN UCA.
 *
 * Kurallar `mesaj-grup.test.js`'te kilitli; burada KATMANLARIN ARASI
 * sınanıyor: soket olayı kuralı gerçekten çağırıyor mu, yayın doğru
 * kişilere gidiyor mu, gruba ait olmayan biri akışı çekebiliyor mu.
 *
 * Bu projede bulunan hataların çoğu tek bir fonksiyonda değil tam da
 * burada yaşıyordu (paket alanının delta'da silinmemesi, iki yerde
 * hesaplanan sayılar). Kuralın doğru olması, çağrıldığı anlamına gelmiyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const { sunucuBaslat, baglan, bekle } = require('./sunucu');

async function oyuncular(sunucu, t, sayi = 3) {
  const damga = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const liste = [];
  for (const etiket of ['a', 'b', 'c'].slice(0, sayi)) {
    const username = `g${etiket}${damga}`.slice(0, 18);
    const yanit = await fetch(sunucu.taban + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `grup-${etiket}-${damga}@ornek.test`,
        password: 'parola123', username }),
    }).then(r => r.json());
    assert.ok(yanit.token, 'kayıt: ' + JSON.stringify(yanit));
    const oturum = await baglan(sunucu, yanit.token);
    t.after(() => oturum.kapat());
    liste.push({ username, oturum });
  }
  return liste;
}

/** Bir olayı bekle — gelmezse null (testin kendisi karar versin) */
async function olayBekle(oturum, ad, sure = 4000) {
  let sonuc = null;
  const al = (d) => { if (sonuc === null) sonuc = d; };
  oturum.soket.on(ad, al);
  for (let i = 0; i < sure / 100 && sonuc === null; i++) await bekle(100);
  oturum.soket.off(ad, al);
  return sonuc;
}

async function listeAl(oturum) {
  let sonuc = null;
  const al = (d) => { sonuc = d; };
  oturum.soket.on('grup_listesi', al);
  oturum.soket.emit('grup_listesi');
  for (let i = 0; i < 30 && !sonuc; i++) await bekle(100);
  oturum.soket.off('grup_listesi', al);
  return sonuc?.gruplar || [];
}

test('ozel grup kuruluyor, uyeler goruyor, yabanci goremiyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const [a, b, c] = await oyuncular(sunucu, t);

  a.oturum.soket.emit('grup_kur',
    { konu: 'Defans çağrısı', adlar: [b.username] });
  const kuruldu = await olayBekle(a.oturum, 'grup_sonuc');
  assert.equal(kuruldu?.ok, true, 'grup kurulmalı: ' + JSON.stringify(kuruldu));
  const grupId = kuruldu.id;

  // ── Üye listede görüyor ──
  const bListe = await listeAl(b.oturum);
  assert.equal(bListe.length, 1, 'davet edilen üye grubu listesinde görmeli');
  assert.equal(bListe[0].konu, 'Defans çağrısı');
  assert.equal(bListe[0].tip, 'ozel');

  /*
    YABANCI GÖREMİYOR — kuralın çağrıldığının kanıtı. Kural doğru olup
    soket olayında hiç sorulmasaydı burada grup listede çıkardı.
  */
  const cListe = await listeAl(c.oturum);
  assert.equal(cListe.length, 0, 'gruba ait olmayan oyuncu grubu görmemeli');

  // ── Yabancı akışı da çekemiyor ──
  c.oturum.soket.emit('grup_ac', { id: grupId });
  const red = await olayBekle(c.oturum, 'grup_sonuc');
  assert.equal(red?.ok, false, 'yabancının grup_ac isteği reddedilmeli');
  assert.equal(red.reason, 'grup_yok');

  // ── Yabancı yazamıyor ──
  c.oturum.soket.emit('grup_gonder', { id: grupId, govde: 'sızdım' });
  const red2 = await olayBekle(c.oturum, 'grup_sonuc');
  assert.equal(red2?.ok, false, 'yabancı gruba yazamamalı');

  /*
    VE YAZAMADIĞI GERÇEKTEN VERİYE YANSIYOR: reddedildiğini söyleyip
    yine de kaydeden bir sunucu, bu testi başka türlü geçerdi.
  */
  b.oturum.soket.emit('grup_ac', { id: grupId });
  const akis = await olayBekle(b.oturum, 'grup_akis');
  assert.ok(akis, 'üye akışı alabilmeli');
  assert.equal(akis.mesajlar.length, 0, 'yabancının mesajı kaydedilmemeli');
});

test('gruba yazilan mesaj oteki uyeye ulasiyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const [a, b] = await oyuncular(sunucu, t, 2);

  a.oturum.soket.emit('grup_kur', { konu: 'Kuzey sınırı', adlar: [b.username] });
  const kuruldu = await olayBekle(a.oturum, 'grup_sonuc');
  assert.equal(kuruldu?.ok, true);
  const id = kuruldu.id;

  a.oturum.soket.emit('grup_gonder', { id, govde: 'Mızrakçı yollayın.' });
  await bekle(900);

  const bListe = await listeAl(b.oturum);
  assert.equal(bListe.length, 1);
  assert.equal(bListe[0].son?.govde, 'Mızrakçı yollayın.',
    'liste son mesajı taşımalı');
  /*
    OKUNMAMIŞ SAYISI ALICIDA 1, YAZANDA 0. Kendi yazdığın mesaj sana
    okunmamış görünürse rozet hiç sönmez.
  */
  assert.equal(bListe[0].okunmamis, 1, 'alıcıda okunmamış 1 olmalı');
  const aListe = await listeAl(a.oturum);
  assert.equal(aListe[0].okunmamis, 0, 'yazanda okunmamış 0 olmalı');

  // Açınca okunmuş sayılıyor
  b.oturum.soket.emit('grup_ac', { id });
  const akis = await olayBekle(b.oturum, 'grup_akis');
  assert.equal(akis.mesajlar.length, 1);
  assert.equal(akis.mesajlar[0].ad, a.username, 'grupta gönderen adı görünmeli');
  b.oturum.soket.emit('grup_okundu', { id, sonId: akis.mesajlar[0].id });
  await bekle(600);
  const bListe2 = await listeAl(b.oturum);
  assert.equal(bListe2[0].okunmamis, 0, 'açtıktan sonra okunmamış sıfırlanmalı');
});

test('birlikte olmayan oyuncu birlik grubu kuramiyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const [a] = await oyuncular(sunucu, t, 1);

  a.oturum.soket.emit('grup_kur', { konu: 'Defans', birlik: true });
  const red = await olayBekle(a.oturum, 'grup_sonuc');
  assert.equal(red?.ok, false);
  assert.equal(red.reason, 'birlik_yok');
  assert.ok(red.message?.includes('birlik'), 'oyuncuya sebep yazılmalı');
});

test('konusuz grup kurulamiyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const [a, b] = await oyuncular(sunucu, t, 2);

  a.oturum.soket.emit('grup_kur', { konu: '  ', adlar: [b.username] });
  const red = await olayBekle(a.oturum, 'grup_sonuc');
  assert.equal(red?.ok, false);
  assert.equal(red.reason, 'konu_kisa');
});

test('gruptan ayrilan artik gormuyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const [a, b] = await oyuncular(sunucu, t, 2);

  a.oturum.soket.emit('grup_kur', { konu: 'Geçici konu', adlar: [b.username] });
  const kuruldu = await olayBekle(a.oturum, 'grup_sonuc');
  const id = kuruldu.id;

  b.oturum.soket.emit('grup_ayril', { id });
  const ayrildi = await olayBekle(b.oturum, 'grup_sonuc');
  assert.equal(ayrildi?.ok, true);

  assert.equal((await listeAl(b.oturum)).length, 0, 'ayrılan grubu görmemeli');
  assert.equal((await listeAl(a.oturum)).length, 1, 'kalan grubu görmeli');

  b.oturum.soket.emit('grup_ac', { id });
  const red = await olayBekle(b.oturum, 'grup_sonuc');
  assert.equal(red?.ok, false, 'ayrılan akışı da çekememeli');
});

test('grubu yalniz kuran dagitiyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const [a, b] = await oyuncular(sunucu, t, 2);

  a.oturum.soket.emit('grup_kur', { konu: 'Dağılacak', adlar: [b.username] });
  const id = (await olayBekle(a.oturum, 'grup_sonuc')).id;

  b.oturum.soket.emit('grup_dagit', { id });
  const red = await olayBekle(b.oturum, 'grup_sonuc');
  assert.equal(red?.ok, false, 'kurucu olmayan dağıtamamalı');
  assert.equal(red.reason, 'yetki_yok');
  assert.equal((await listeAl(a.oturum)).length, 1, 'grup hâlâ durmalı');

  a.oturum.soket.emit('grup_dagit', { id });
  const oldu = await olayBekle(a.oturum, 'grup_sonuc');
  assert.equal(oldu?.ok, true);
  await bekle(500);
  assert.equal((await listeAl(a.oturum)).length, 0, 'dağıtılan grup kalmamalı');
  assert.equal((await listeAl(b.oturum)).length, 0, 'öteki üyeden de kalkmalı');
});
