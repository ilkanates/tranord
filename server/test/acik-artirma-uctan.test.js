/**
 * AÇIK ARTIRMA — UÇTAN UCA, iki gerçek oyuncu.
 *
 * Kural dosyası ayrı test ediliyor (acik-artirma.test.js). Burada
 * ölçülen şey PARANIN ve EŞYANIN gerçekten yer değiştirdiği: blokaj,
 * iade ve envanter. Bir eşya pazarında en pahalı hata paranın
 * kaybolması ya da iki kez ödenmesidir; saf kural testi onu göremez.
 *
 * Ölçüm PAKETTE yapılıyor (oyuncunun gördüğü şey paket), veritabanında
 * değil: "sunucuda doğru ama ekrana gitmiyor" hatası bu projede
 * defalarca oldu.
 */
const test = require('node:test');
const assert = require('node:assert');
const { sunucuBaslat, hesapAc, baglan, bekle } = require('./sunucu');

/** İki oyuncu, ikisinin de kahramanı ve eşyası var */
async function ikiOyuncu(sunucu, t) {
  const out = [];
  for (let i = 0; i < 2; i++) {
    const { token } = await hesapAc(sunucu);
    const oturum = await baglan(sunucu, token);
    t.after(() => oturum.kapat());
    oturum.soket.emit('dev_max_buildings', { level: 20, tiles: true });
    await bekle(2000);
    oturum.soket.emit('dev_kahraman', { esya: 4, macera: true });
    await bekle(2500);
    /*
      GÜMÜŞ VERİLİYOR. Başlangıç bakiyesi (500) olgun bir dünyada tek
      bir efsanevi eşyanın taban fiyatına bile yetmiyor — dünya
      yaşlandıkça düşen eşyaların seviyesi ve fiyatı büyüyor. Test
      kendi kuralını doğru ölçtüğü hâlde "yetersiz" diye kırmızıya
      dönüyordu.
    */
    oturum.soket.emit('dev_grant', { gumus: 50000 });
    await bekle(1500);
    assert.equal(oturum.koy.kahraman?.var, true, 'kahraman doğmadı');
    out.push(oturum);
  }
  return out;
}

/*
  AYNI SÜREÇTE koşan testler dev veri dosyasını PAYLAŞIYOR: önceki
  testten kalan ilanlar listede duruyor. O yüzden ilan hep ARANARAK
  seçiliyor — listenin ilk satırını almak testi komşusuna bağımlı kılardı ve
  sırayla koşarken sessizce kırılırdı (bir kez kırıldı).
*/
const yabanciIlan = (liste) => liste.find(i => !i.benimIlanim && !i.bitti);

const ilanBekle = (oturum) => new Promise((res) => {
  oturum.soket.once('artirma_listesi', (d) => res(d?.ilanlar || []));
  oturum.soket.emit('artirma_liste');
  setTimeout(() => res([]), 3000);
});

const sonucBekle = (oturum, olay, veri) => new Promise((res) => {
  oturum.soket.once('artirma_sonuc', (d) => res(d || {}));
  oturum.soket.emit(olay, veri);
  setTimeout(() => res({ ok: false, sebep: 'cevap_yok' }), 4000);
});

test('SATIŞA KOYUNCA eşya çantadan çıkıyor ve ilan listede görünüyor', async (t) => {
  /*
    EŞYA ENVANTERDE KALSAYDI aynı eşya hem satışta hem kuşanılmış
    olabilirdi; satış bitince hangisinin gideceği de belirsiz kalırdı.
  */
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const [a] = await ikiOyuncu(sunucu, t);

  const once = (a.oturum?.koy || a.koy).kahraman.envanter.length;
  const r = await sonucBekle(a, 'artirma_sat', { indeks: 0 });
  assert.equal(r.ok, true, `satış reddedildi: ${r.sebep}`);
  assert.ok(r.taban > 0, 'taban fiyat dönmeli');

  await bekle(1200);
  assert.equal(a.koy.kahraman.envanter.length, once - 1,
    'satılan eşya çantadan çıkmalı');

  const liste = await ilanBekle(a);
  const benimki = liste.filter(i => i.benimIlanim);
  assert.ok(benimki.length >= 1, 'ilan listede görünmeli');
  assert.ok(benimki[0].ad, 'ilan eşyanın ADINI taşımalı, ham anahtarı değil');
});

test('TEKLİF VERİNCE gümüş BLOKE oluyor', async (t) => {
  /*
    Blokaj olmasaydı aynı gümüşle on açık artırma kazanılır, dokuzu
    karşılıksız kalırdı.
  */
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const [a, b] = await ikiOyuncu(sunucu, t);

  await sonucBekle(a, 'artirma_sat', { indeks: 0 });
  await bekle(1000);
  const ilan = yabanciIlan(await ilanBekle(b));
  assert.ok(ilan, 'teklif verilecek yabancı ilan bulunamadı');

  const oncekiGumus = b.koy.kese.gumus;
  const r = await sonucBekle(b, 'artirma_teklif', { id: ilan.id, miktar: ilan.enAzTeklif });
  assert.equal(r.ok, true, `teklif reddedildi: ${r.sebep}`);

  await bekle(1200);
  assert.equal(b.koy.kese.gumus, oncekiGumus - ilan.enAzTeklif,
    'teklif kadar gümüş bloke olmalı');
});

test('TEKLİFİ GEÇİLEN oyuncunun gümüşü ANINDA dönüyor', async (t) => {
  /*
    "Kaybettim ama param bir gün kilitli" cezası kimsenin teklif
    vermek istememesine yol açardı.
  */
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const [a, b] = await ikiOyuncu(sunucu, t);

  await sonucBekle(a, 'artirma_sat', { indeks: 0 });
  await bekle(1000);
  const ilan = yabanciIlan(await ilanBekle(b));
  assert.ok(ilan, 'teklif verilecek yabancı ilan bulunamadı');

  const bBasta = b.koy.kese.gumus;
  const ilk = await sonucBekle(b, 'artirma_teklif', { id: ilan.id, miktar: ilan.enAzTeklif });
  assert.equal(ilk.ok, true, `ilk teklif reddedildi: ${ilk.sebep}`);
  await bekle(1200);
  assert.ok(b.koy.kese.gumus < bBasta, 'önce bloke olmalı');

  /* Satıcı kendi ilanına teklif veremez; üçüncü bir oyuncu gerekiyor */
  const { token } = await hesapAc(sunucu);
  const c = await baglan(sunucu, token);
  t.after(() => c.kapat());
  /*
    ÜÇÜNCÜ OYUNCUYA DA GÜMÜŞ. Başlangıç bakiyesiyle bırakınca teklif
    bazen "yetersiz" diye reddediliyor ve test eşyanın o turda ne
    kadar pahalı düştüğüne göre bir yeşil bir kırmızı dönüyordu.
  */
  c.soket.emit('dev_grant', { gumus: 50000 });
  await bekle(1500);

  const guncel = (await ilanBekle(c)).find(i => i.id === ilan.id);
  assert.ok(guncel, 'ilan üçüncü oyuncuya da görünmeli');
  const r = await sonucBekle(c, 'artirma_teklif', { id: guncel.id, miktar: guncel.enAzTeklif });
  assert.equal(r.ok, true, `üçüncü oyuncunun teklifi reddedildi: ${r.sebep}`);

  await bekle(1500);
  assert.equal(b.koy.kese.gumus, bBasta,
    'geçilen oyuncunun gümüşü tam olarak geri dönmeli');
});

test('KENDİ İLANINA teklif REDDEDİLİYOR — fiyat şişirme kapalı', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const [a] = await ikiOyuncu(sunucu, t);

  await sonucBekle(a, 'artirma_sat', { indeks: 0 });
  await bekle(1000);
  const ilan = (await ilanBekle(a)).find(i => i.benimIlanim);
  assert.ok(ilan, 'kendi ilanım bulunamadı');

  const r = await sonucBekle(a, 'artirma_teklif', { id: ilan.id, miktar: ilan.enAzTeklif });
  assert.equal(r.ok, false);
  assert.equal(r.sebep, 'kendi_ilanin');
});

test('GÜMÜŞÜ YETMEYEN teklif veremiyor ve bakiyesi bozulmuyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const [a, b] = await ikiOyuncu(sunucu, t);

  await sonucBekle(a, 'artirma_sat', { indeks: 0 });
  await bekle(1000);
  const ilan = yabanciIlan(await ilanBekle(b));
  assert.ok(ilan, 'teklif verilecek yabancı ilan bulunamadı');

  const basta = b.koy.kese.gumus;
  const r = await sonucBekle(b, 'artirma_teklif', { id: ilan.id, miktar: basta + 1000 });
  assert.equal(r.ok, false);
  assert.equal(r.sebep, 'yetersiz');
  await bekle(1000);
  assert.equal(b.koy.kese.gumus, basta, 'reddedilen teklif bakiyeye dokunmamalı');
});

test('EŞYA YÜKSELTME gümüş harcıyor ve seviyeyi artırıyor', async (t) => {
  /*
    İlkan: *"itemlerin de lvl'leri 5 lvl arttırılabilecek."* Bedel ve
    seviye PAKETTE ölçülüyor — ekrandaki düğme bu iki sayıyı okuyor.
  */
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const [a] = await ikiOyuncu(sunucu, t);

  const esya = a.koy.kahraman.envanter.find(e => !e.kullanilir && !e.yukseltmeEngeli);
  assert.ok(esya, 'yükseltilebilir eşya bulunamadı');
  const bedel = esya.yukseltmeBedeli;
  const gumus = a.koy.kese.gumus;
  assert.ok(bedel > 0 && gumus >= bedel, `bedel ${bedel}, bakiye ${gumus}`);

  a.soket.emit('kusam_yukselt', { indeks: esya.indeks });
  await bekle(1500);

  const sonra = a.koy.kahraman.envanter.find(e => e.indeks === esya.indeks);
  assert.equal(sonra.seviye, esya.seviye + 1, 'seviye bir artmalı');
  assert.equal(a.koy.kese.gumus, gumus - bedel, 'bedel kadar gümüş düşmeli');
  assert.ok(sonra.tabanFiyat > esya.tabanFiyat,
    'yükselen eşyanın taban fiyatı da artmalı, yoksa yükseltmek tek yönlü kayıp olurdu');
});
