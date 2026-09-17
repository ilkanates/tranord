/**
 * KAHRAMANI KÖYDEN KÖYE TAŞIMA — takviye ile, yuva seçimiyle.
 *
 * İlkan: *"hâlâ kahramanı bir köyden başka köye yollayamıyorum; destek
 * olarak yolla demem lazım ve o köyü kalıcı köyü yap işareti çıkması
 * lazım desteğe yollarken."*
 *
 * ÖLÇÜM ÖNCE SUNUCUYU TEMİZE ÇIKARDI: kahramanın TEK BAŞINA takviyeye
 * çıkması zaten kabul ediliyordu. Engel istemcideydi — gönder düğmesi
 * "asker seçilmedi" diye kapalıydı. Bu dosya sunucu tarafındaki sözü
 * tutuyor ki arayüz düzeltmesi boşa düşmesin.
 *
 * YUVA SEÇİMİ yeni: kendi köyüne giden kahraman ORAYI kendiliğinden üs
 * yapıyordu, dolayısıyla kahramanı geçici savunmaya yollamak imkânsızdı.
 */
const test = require('node:test');
const assert = require('node:assert');
const { sunucuBaslat, hesapAc, baglan, bekle } = require('./sunucu');

function seferDene(soket, veri) {
  return new Promise((res) => {
    const tamam = (e) => { soket.off('army_error', hata); res({ ok: true, veri: e }); };
    const hata = (e) => { soket.off('army_sent', tamam); res({ ok: false, sebep: e?.reason }); };
    soket.once('army_sent', tamam);
    soket.once('army_error', hata);
    soket.emit('send_army', veri);
    setTimeout(() => res({ ok: false, sebep: 'cevap_yok' }), 5000);
  });
}

/**
 * SEFER VARSIN — dünyayı hızlandırıp bekle.
 *
 * Gerçek zamanda beklemek olmuyordu: iki köy arası yürüyüş 1.000 gerçek
 * saniyenin üzerinde ve test bunu bekleyemez. `set_speed` DÜNYA hızını
 * değiştiriyor (bkz. index.js), yani sefer de aynı oranda hızlanıyor.
 * Hile kapısı yalnız TRANORD_DEV_CHEATS ile açık — test sunucusu onu
 * açarak başlıyor, üretimde böyle bir yüzey yok.
 */
async function seferVarsin(oturum, saniye) {
  oturum.soket.emit('set_speed', { tickMs: 8 });      // ~125× dünya hızı
  await bekle(Math.min((saniye || 0) * 1000 / 100 + 5000, 40000));
  oturum.soket.emit('set_speed', { tickMs: 1000 });   // dünyayı geri yavaşlat
  await bekle(600);
}

/** Kahramanı doğmuş, iki köyü olan bir oturum */
async function ikiKoyKahraman(sunucu, t) {
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  const ilkSlot = oturum.koy.activeSlot;
  oturum.soket.emit('dev_new_village');
  await bekle(2500);
  oturum.soket.emit('dev_max_buildings', { level: 20, tiles: true });
  await bekle(2500);
  /* Konak tek başına yetmiyor: kahraman bir tik sonra doğuyor */
  oturum.soket.emit('dev_kahraman', { esya: 2, macera: true });
  await bekle(3000);

  const koyler = (oturum.koy.villages || []).map(k => k.slotKey);
  assert.ok(koyler.length >= 2, 'ikinci köy kurulamadı');
  assert.equal(oturum.koy.kahraman?.var, true, 'kahraman doğmadı');
  return { oturum, ilkSlot, ikinciSlot: koyler.find(k => k !== ilkSlot) };
}

test('KAHRAMAN TEK BAŞINA takviyeye çıkabiliyor — asker şartı yok', async (t) => {
  /*
    İstemcideki gönder düğmesi bunu engelliyordu; sunucunun sözü burada
    kilitleniyor, yoksa arayüz düzeltmesi bir gün sessizce geri alınır.
  */
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { oturum, ikinciSlot } = await ikiKoyKahraman(sunucu, t);

  const r = await seferDene(oturum.soket,
    { targetKey: ikinciSlot, mode: 'takviye', units: {}, kahraman: true });
  assert.equal(r.ok, true, `askersiz kahraman seferi reddedildi: ${r.sebep}`);
  assert.equal(r.veri.kahramanAtlandi, null,
    `kahraman sessizce atlanmamalı: ${r.veri.kahramanAtlandi}`);

  await bekle(1200);
  assert.equal(oturum.koy.kahraman?.nerede, 'sefer', 'kahraman yola çıkmalı');
});

test('ASKERSİZ ve KAHRAMANSIZ sefer hâlâ reddediliyor', async (t) => {
  /*
    Gevşeme yalnız kahraman varken geçerli. Boş sefer kabul edilseydi
    mesafe ölçmek için bedava keşif aracı olurdu.
  */
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { oturum, ikinciSlot } = await ikiKoyKahraman(sunucu, t);

  const r = await seferDene(oturum.soket,
    { targetKey: ikinciSlot, mode: 'takviye', units: {}, kahraman: false });
  assert.equal(r.ok, false);
  assert.equal(r.sebep, 'asker_secilmedi');
});

test('YUVA İŞARETLİ: kahraman vardığı kendi köyüne taşınıyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { oturum, ilkSlot, ikinciSlot } = await ikiKoyKahraman(sunucu, t);

  assert.equal(oturum.koy.kahraman?.usSlot, ilkSlot, 'kahraman ilk köyde başlamalı');

  const r = await seferDene(oturum.soket, {
    targetKey: ikinciSlot, mode: 'takviye', units: {}, kahraman: true, kahramanYuva: true,
  });
  assert.equal(r.ok, true, r.sebep);

  await seferVarsin(oturum, r.veri.seconds);

  assert.equal(oturum.koy.kahraman?.usSlot, ikinciSlot,
    'yuva işaretliyken üs yeni köye taşınmalı');
  assert.equal(oturum.koy.kahraman?.nerede, 'koy',
    'kendi köyünde misafir değil, evinde sayılmalı');
});

test('YUVA İŞARETSİZ: kahraman MİSAFİR kalıyor, evi taşınmıyor', async (t) => {
  /*
    İlkan'ın istediği seçim bu: kahramanı ikinci köye geçici savunmaya
    yollayıp geri çağırabilmek. Tek davranış "taşın" olduğu sürece
    bu mümkün değildi.
  */
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { oturum, ilkSlot, ikinciSlot } = await ikiKoyKahraman(sunucu, t);

  const r = await seferDene(oturum.soket, {
    targetKey: ikinciSlot, mode: 'takviye', units: {}, kahraman: true, kahramanYuva: false,
  });
  assert.equal(r.ok, true, r.sebep);

  await seferVarsin(oturum, r.veri.seconds);

  assert.equal(oturum.koy.kahraman?.usSlot, ilkSlot,
    'yuva işaretsizken üs ESKİ köyde kalmalı');
  assert.equal(oturum.koy.kahraman?.misafirSlot, ikinciSlot,
    'kahraman gittiği köyde misafir sayılmalı');
});
