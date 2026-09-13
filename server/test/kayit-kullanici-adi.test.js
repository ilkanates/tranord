/**
 * KAYITTA KULLANICI ADI — zorunlu, benzersiz ve KALICI.
 *
 * Ad haritada, savaş raporlarında ve sıralamada görünüyor; sonradan
 * değişebilseydi başkalarının gördüğü geçmiş yalan olurdu. Bu test üç
 * kararı kilitliyor: ad olmadan kayıt yok, aynı ad iki kişide olamaz,
 * oyun içinden değiştirilemez.
 */
const test = require('node:test');
const assert = require('node:assert');
const { sunucuBaslat, baglan, bekle } = require('./sunucu');

async function kayit(sunucu, govde) {
  const r = await fetch(sunucu.taban + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(govde),
  });
  return { durum: r.status, govde: await r.json().catch(() => ({})) };
}

test('kullanıcı adı olmadan kayıt reddediliyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());

  const yok = await kayit(sunucu, {
    email: `adsiz-${Date.now()}@ornek.test`, password: 'parola123' });
  assert.equal(yok.durum, 400);
  assert.match(yok.govde.error, /Kullanıcı adı/);

  const kisa = await kayit(sunucu, {
    email: `kisa-${Date.now()}@ornek.test`, password: 'parola123', username: 'ab' });
  assert.equal(kisa.durum, 400, '3 karakterden kısa ad kabul edilmemeli');
});

test('aynı kullanıcı adı ikinci kez alınamaz', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());

  const ad = `Ad${Date.now()}`.slice(0, 18);
  const ilk = await kayit(sunucu, {
    email: `bir-${Date.now()}@ornek.test`, password: 'parola123', username: ad });
  assert.ok(ilk.govde.token, 'ilk kayıt geçmeli: ' + JSON.stringify(ilk.govde));
  assert.equal(ilk.govde.name, ad, 'ad kayıtla birlikte yazılmalı');

  const ikinci = await kayit(sunucu, {
    email: `iki-${Date.now()}@ornek.test`, password: 'parola123', username: ad });
  assert.equal(ikinci.durum, 409);
  assert.equal(ikinci.govde.alan, 'username');
});

test('oyun içinden kullanıcı adı DEĞİŞTİRİLEMİYOR', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());

  const ad = `Sabit${Date.now()}`.slice(0, 18);
  const kyt = await kayit(sunucu, {
    email: `sabit-${Date.now()}@ornek.test`, password: 'parola123', username: ad });
  assert.ok(kyt.govde.token);

  const oturum = await baglan(sunucu, kyt.govde.token);
  t.after(() => oturum.kapat());

  let sonuc = null;
  oturum.soket.on('name_result', (r) => { sonuc = r; });
  oturum.soket.emit('set_player_name', { name: 'BaskaBirAd' });
  await bekle(1500);

  assert.ok(sonuc, 'sunucu cevap vermeli');
  assert.equal(sonuc.ok, false);
  assert.match(sonuc.message, /değiştirilemez/);
  assert.equal(oturum.koy.playerName, ad, 'ad olduğu gibi kalmalı');
});
