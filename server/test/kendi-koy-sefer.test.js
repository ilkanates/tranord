/**
 * KENDİ KÖYÜNE SEFER — her kip açık.
 *
 * İlkan iki adımda istedi:
 *   1. *"kendi köyümden kendi köyüme destek atamıyorum"*
 *   2. *"KENDİ KÖYÜNDE YAĞMA VS DE GÖNDEREBİLMELİSİN, DİĞER KÖYLER
 *      İLE AYNI OLMALI"*
 *
 * Eski kural kendi köyüne yalnız TAKVİYE'ye izin veriyordu
 * (`p.userId === userId && mode !== 'takviye'` → `kendi_koyun`).
 * Gerekçesi "yağma kendi kaynağını taşımak olur" idi; karar değişti.
 *
 * AÇILAN KAPI BİLEREK AÇIK: kendi köyüne yağma, tüccar kapasitesini
 * atlayarak ordunun taşıma kapasitesi kadar kaynak taşımanın yolu;
 * kendi köyüne saldırı ise iki taraftaki askeri birden öldürür. Bu
 * test o kararı kilitliyor — sessizce geri gelmesin diye.
 *
 * TEK İSTİSNA DURUYOR: İÇİNDE bulunduğun köye sefer. Orada mesafe
 * sıfır, sefer diye bir şey yok.
 */
const test = require('node:test');
const assert = require('node:assert');
const { sunucuBaslat, hesapAc, baglan, bekle } = require('./sunucu');

/** Bir sefer emri yolla, sunucunun cevabını (ok / hata sebebi) döndür */
function seferDene(soket, veri) {
  return new Promise((res) => {
    const tamam = (e) => { soket.off('army_error', hata); res({ ok: true, veri: e }); };
    const hata  = (e) => { soket.off('army_sent', tamam); res({ ok: false, sebep: e?.reason }); };
    soket.once('army_sent', tamam);
    soket.once('army_error', hata);
    soket.emit('send_army', veri);
    setTimeout(() => res({ ok: false, sebep: 'cevap_yok' }), 4000);
  });
}

test('kendi ikinci köyüne YAĞMA, SALDIRI, KEŞİF ve TAKVİYE gönderilebiliyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  const ilkSlot = oturum.koy.activeSlot;

  // İkinci köy + gönderecek ordu
  oturum.soket.emit('dev_new_village');
  await bekle(2500);
  oturum.soket.emit('dev_max_buildings', { level: 20, tiles: true });
  await bekle(2000);
  /*
    ASKER BÜTÇESİ DAR. `dev_grant` boş işçi + nüfus tavanına kalan yer
    kadar veriyor; ilk denemede 160 asker istenince izciler bütçe bitince
    "atlandı" ve keşif seferi `yetersiz_asker` yiyordu. Testin ölçtüğü
    şey kip izni, asker muhasebesi değil — az ve yeterli istiyoruz.
  */
  oturum.soket.emit('dev_grant', { army: { fjordvakt: 20, spydvakt: 10, kuzeyIzcisi: 10 } });
  await bekle(2000);

  const koyler = oturum.koy.villages || [];
  assert.ok(koyler.length >= 2, 'ikinci köy kurulamadı: ' + JSON.stringify(koyler));
  const hedef = koyler.map(k => k.slotKey).find(k => k !== ilkSlot);
  assert.ok(hedef, 'ikinci köyün slotu bulunamadı');

  const ordu = oturum.koy.army || {};
  for (const birim of ['fjordvakt', 'spydvakt', 'kuzeyIzcisi']) {
    assert.ok((ordu[birim] || 0) >= 5,
      `test için ${birim} verilemedi (nüfus tavanı?): ` + JSON.stringify(ordu));
  }

  /*
    DÖRT KİP DE GEÇMELİ. Eskiden yalnız sonuncusu geçiyor, ilk üçü
    `kendi_koyun` ile reddediliyordu.
  */
  for (const [kip, birimler] of [
    ['raid',    { fjordvakt: 5 }],
    ['attack',  { fjordvakt: 5 }],
    ['scout',   { kuzeyIzcisi: 3 }],
    ['takviye', { spydvakt: 5 }],
  ]) {
    const r = await seferDene(oturum.soket, { targetKey: hedef, mode: kip, units: birimler });
    assert.ok(r.ok, `kendi köyüme ${kip} reddedildi: ${r.sebep}`);
    assert.equal(r.veri.mode, kip);
    await bekle(400);
  }
});

test('İÇİNDE bulunduğun köye sefer hâlâ reddediliyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  /*
    Bu yasak KALDIRILMADI ve kaldırılmamalı: aktif köye sefer sıfır
    mesafeli olurdu, ordu çıktığı yere "varırdı". `kendi_koyun` sebebi
    artık yalnız bu duruma ait.
  */
  oturum.soket.emit('dev_grant', { army: { fjordvakt: 40 } });
  await bekle(1500);

  const r = await seferDene(oturum.soket, {
    targetKey: oturum.koy.activeSlot, mode: 'raid', units: { fjordvakt: 5 },
  });
  assert.equal(r.ok, false, 'kendi bulunduğun köye sefer kabul edildi');
  assert.equal(r.sebep, 'kendi_koyun');
});
