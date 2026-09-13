/**
 * MESAJLAŞMA — kurallar ve uçtan uca akış.
 *
 * Korunan kararlar:
 *
 * 1) SİLME İKİ TARAFLI. Gönderenin silmesi alıcının kutusundan mesajı
 *    kaldırmıyor; aksi hâlde şikâyet edilen bir mesaj tek tıkla yok
 *    edilebilirdi.
 * 2) ENGELLEME SESSİZ. Engellenen kişi gönderirken hata almıyor —
 *    "engellendin" demek taciz edene hangi hesabın çalıştığını
 *    söylemek olurdu. Mesaj kutuya düşmüyor.
 * 3) HIZ SINIRI engellemeden bağımsız işliyor: engelli gönderim de
 *    hakkı yakıyor, yoksa bedava deneme hakkı olurdu.
 * 4) Okundu işaretini YALNIZ alıcı koyabilir.
 */
const test = require('node:test');
const assert = require('node:assert');
const MESAJ = require('../game/mesaj');
const { sunucuBaslat, baglan, bekle } = require('./sunucu');

// ── Kurallar (sunucu gerekmiyor) ──────────────────────────────────

test('boş mesaj reddediliyor, konu gövdeden türetiliyor', () => {
  assert.equal(MESAJ.mesajDogrula({ konu: 'x', govde: '   ' }).ok, false);
  const r = MESAJ.mesajDogrula({ konu: '', govde: 'İlk satır\nikinci satır' });
  assert.equal(r.ok, true);
  assert.equal(r.konu, 'İlk satır', 'konu boşsa ilk satırdan alınmalı');
});

test('konu ve gövde sınırları kırpılıyor', () => {
  const r = MESAJ.mesajDogrula({
    konu: 'k'.repeat(500), govde: 'g'.repeat(5000) });
  assert.equal(r.konu.length, MESAJ.KONU_EN_COK);
  assert.equal(r.govde.length, MESAJ.GOVDE_EN_COK);
});

test('kontrol karakterleri temizleniyor, satır sonu korunuyor', () => {
  const kirli = 'Selam' + String.fromCharCode(0, 7) + ' dost\nsatir';
  const r = MESAJ.mesajDogrula({ konu: 'k', govde: kirli });
  assert.equal(r.govde, 'Selam dost\nsatir');
});

test('hız sınırı: dakikada 5, sonrası reddediliyor', () => {
  const uid = 900000 + Math.floor(Math.random() * 1000);
  const t0 = Date.now();
  for (let i = 0; i < MESAJ.DAKIKA_TAVANI; i++) {
    assert.equal(MESAJ.hizSiniri(uid, t0).ok, true, `${i}. gönderim geçmeli`);
    MESAJ.gonderimiKaydet(uid, t0);
  }
  const asan = MESAJ.hizSiniri(uid, t0);
  assert.equal(asan.ok, false);
  assert.equal(asan.reason, 'cok_hizli');
  // Bir dakika sonra pencere kayıyor
  assert.equal(MESAJ.hizSiniri(uid, t0 + 61_000).ok, true);
});

// ── Uçtan uca ─────────────────────────────────────────────────────

async function ikiOyuncu(sunucu, t) {
  const damga = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const hesaplar = [];
  for (const etiket of ['a', 'b']) {
    const username = `m${etiket}${damga}`.slice(0, 18);
    const yanit = await fetch(sunucu.taban + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `mesaj-${etiket}-${damga}@ornek.test`,
        password: 'parola123', username }),
    }).then(r => r.json());
    assert.ok(yanit.token, 'kayıt: ' + JSON.stringify(yanit));
    const oturum = await baglan(sunucu, yanit.token);
    t.after(() => oturum.kapat());
    hesaplar.push({ username, oturum });
  }
  return hesaplar;
}

/** Bir kutu isteyip listeyi döndür */
async function kutu(oturum, yon = 'gelen') {
  let sonuc = null;
  const al = (d) => { if (d?.yon === yon) sonuc = d; };
  oturum.soket.on('mesaj_listesi', al);
  oturum.soket.emit('mesaj_kutusu', { yon });
  for (let i = 0; i < 30 && !sonuc; i++) await bekle(100);
  oturum.soket.off('mesaj_listesi', al);
  return sonuc;
}

test('mesaj gidiyor, gelen kutusunda çıkıyor, okundu işaretleniyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const [a, b] = await ikiOyuncu(sunucu, t);

  a.oturum.soket.emit('mesaj_gonder', {
    alici: b.username, konu: 'Selam', govde: 'Komşu olalım mı?' });
  await bekle(1200);

  const gelen = await kutu(b.oturum, 'gelen');
  assert.equal(gelen.liste.length, 1, 'alıcının kutusunda 1 mesaj olmalı');
  assert.equal(gelen.liste[0].konu, 'Selam');
  assert.equal(gelen.liste[0].karsiAd, a.username, 'gönderen adı görünmeli');
  assert.equal(gelen.liste[0].okundu, false);

  const giden = await kutu(a.oturum, 'giden');
  assert.equal(giden.liste.length, 1, 'gönderenin giden kutusunda durmalı');
  assert.equal(giden.liste[0].karsiAd, b.username);

  // Okunmamış sayacı payload'da
  assert.equal(b.oturum.koy.mesajOkunmamis, 1, 'rozet sayacı 1 olmalı');

  b.oturum.soket.emit('mesaj_okundu', { id: gelen.liste[0].id });
  await bekle(1200);
  const sonra = await kutu(b.oturum, 'gelen');
  assert.equal(sonra.liste[0].okundu, true);
  assert.equal(b.oturum.koy.mesajOkunmamis, 0, 'okununca sayaç sıfırlanmalı');
});

test('kendine mesaj ve olmayan oyuncu reddediliyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const [a] = await ikiOyuncu(sunucu, t);

  const sonuclar = [];
  a.oturum.soket.on('mesaj_sonuc', (d) => sonuclar.push(d));

  a.oturum.soket.emit('mesaj_gonder', { alici: a.username, govde: 'kendime' });
  await bekle(800);
  a.oturum.soket.emit('mesaj_gonder', { alici: 'HicKimse12345', govde: 'selam' });
  await bekle(800);

  assert.equal(sonuclar[0]?.reason, 'kendine');
  assert.equal(sonuclar[1]?.reason, 'alici_yok');
});

test('engellenen kişinin mesajı SESSİZCE düşüyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const [a, b] = await ikiOyuncu(sunucu, t);

  b.oturum.soket.emit('mesaj_engelle', { ad: a.username });
  await bekle(800);

  let sonuc = null;
  a.oturum.soket.on('mesaj_sonuc', (d) => { sonuc = d; });
  a.oturum.soket.emit('mesaj_gonder', { alici: b.username, govde: 'gecmeyecek' });
  await bekle(1200);

  assert.equal(sonuc?.ok, true, 'gönderene BAŞARILI görünmeli — engel gizli');
  const gelen = await kutu(b.oturum, 'gelen');
  assert.equal(gelen.liste.length, 0, 'mesaj kutuya DÜŞMEMELİ');

  // Engel kaldırılınca yeniden geçiyor
  b.oturum.soket.emit('mesaj_engelle', { ad: a.username, kaldir: true });
  await bekle(800);
  a.oturum.soket.emit('mesaj_gonder', { alici: b.username, govde: 'simdi gecer' });
  await bekle(1200);
  const sonra = await kutu(b.oturum, 'gelen');
  assert.equal(sonra.liste.length, 1);
});

test('silme İKİ TARAFLI değil: gönderen silince alıcıda duruyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const [a, b] = await ikiOyuncu(sunucu, t);

  a.oturum.soket.emit('mesaj_gonder', { alici: b.username, govde: 'kalici mesaj' });
  await bekle(1200);

  const giden = await kutu(a.oturum, 'giden');
  assert.equal(giden.liste.length, 1);
  a.oturum.soket.emit('mesaj_sil', { id: giden.liste[0].id });
  await bekle(1000);

  const gidenSonra = await kutu(a.oturum, 'giden');
  assert.equal(gidenSonra.liste.length, 0, 'gönderenin kutusundan kalkmalı');

  const gelen = await kutu(b.oturum, 'gelen');
  assert.equal(gelen.liste.length, 1, 'alıcıda OLDUĞU GİBİ durmalı');
});
