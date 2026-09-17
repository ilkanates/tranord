/**
 * KAHRAMAN SAVAŞTAN YIPRANARAK DÖNÜYOR — ve rapor karşı tarafın
 * ORDUSUNU yazıyor.
 *
 * İlkan iki şey bildirdi:
 *   *"normal köye saldırdığımda kahramanın da canı düşmeli."*
 *   *"raporda karşı tarafın kaç askeri vardı onu göremiyorum."*
 *
 * İkisi de gerçek bir sefer koşturularak ölçülüyor. Saf kural testi
 * (kahraman-savas.test.js) formülü tutuyor; burada tutulan şey formülün
 * GERÇEKTEN uygulanıyor olması: sefere iliştirilen can tavanı, varışta
 * uygulanan hasar ve rapora yazılan ordu.
 *
 * HEDEF KENDİ İKİNCİ KÖYÜM, komşu NPC değil. NPC'lerin ordusu taze bir
 * dünyada boş çıkabiliyor ve boş köye girmek savaş sayılmıyor — test o
 * hâlde kendi kuralını doğru ölçtüğü hâlde kırmızıya dönüyordu.
 * Kendi köyüme garnizon koyunca savunan ordu KESİN oluyor.
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

/** Seferi hızlandırarak varışını bekle — gerçek zamanda beklenemez */
async function seferVarsin(oturum, saniye) {
  oturum.soket.emit('set_speed', { tickMs: 8 });      // ~125× dünya hızı
  await bekle(Math.min((saniye || 0) * 1000 / 100 + 6000, 40000));
  oturum.soket.emit('set_speed', { tickMs: 1000 });
  await bekle(800);
}

/**
 * Kahramanı doğmuş, ordusu olan bir oyuncu + GARNİZONLU ikinci köy.
 * Saldırı ikinci köye yapılıyor; savunan ordu böylece kesin oluyor.
 */
async function savasSahnesi(sunucu, t) {
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  const ilkSlot = oturum.koy.activeSlot;
  oturum.soket.emit('dev_new_village');
  await bekle(2500);
  const ikinciSlot = (oturum.koy.villages || [])
    .map(k => k.slotKey).find(k => k !== ilkSlot);
  assert.ok(ikinciSlot, 'ikinci köy kurulamadı');

  /*
    HEDEFE KÜÇÜK BİR GARNİZON, SUR YOK.

    Savunması olan bir hedef gerekiyor (savaşsız köyde kahraman
    yıpranmıyor) ama EZİCİ bir zafer de gerekiyor: ilk kurgu hedefe
    Lvl 20 sur + 40 asker veriyordu, saldıran kaybediyor ve YENİ hasar
    eğrisiyle kahraman ÖLÜYORDU. Ölen kahraman tasarım gereği anında
    üssüne döner (bkz. hasarVer), yani "ordusuyla birlikte dönüyor"
    testi kendi kurgusu yüzünden kırmızıya dönüyordu.

    Sur yok, garnizon küçük: savaş oluyor, saldıran ezici biçimde
    kazanıyor, kahraman yalnız taban hasarı alıp hayatta kalıyor.
  */
  oturum.soket.emit('switch_village', { slotKey: ikinciSlot });
  await bekle(1400);
  oturum.soket.emit('dev_grant', { army: { spydvakt: 5 } });
  await bekle(1600);

  /* Saldıran köye dön: kahraman ve saldırı ordusu */
  oturum.soket.emit('switch_village', { slotKey: ilkSlot });
  await bekle(1400);
  oturum.soket.emit('dev_max_buildings', { level: 20, tiles: true });
  await bekle(2200);
  oturum.soket.emit('dev_kahraman', { esya: 3, macera: true });
  await bekle(2500);
  oturum.soket.emit('dev_grant', { army: { fjordvakt: 60 } });
  await bekle(1600);

  assert.equal(oturum.koy.kahraman?.var, true, 'kahraman doğmadı');
  assert.ok((oturum.koy.army?.fjordvakt || 0) >= 30, 'saldırı ordusu verilemedi');
  return { oturum, ilkSlot, ikinciSlot };
}

test('SALDIRIDA kahramanın canı DÜŞÜYOR — ezici zaferde bile', async (t) => {
  /*
    Hasar yalnız ordunun kayıp oranına bağlıyken ezici üstünlükle vurmak
    kahramana HİÇ dokunmuyordu: kayıp oranı sıfıra yuvarlanıyordu.
    Kahramanı sefere katmak bedavaydı — bedava olan bir seçim seçim
    değildir.
  */
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { oturum, ikinciSlot } = await savasSahnesi(sunucu, t);

  const oncekiCan = oturum.koy.kahraman.can;
  assert.ok(oncekiCan > 0, 'kahraman yaralı başlamamalı');

  const r = await seferDene(oturum.soket, {
    targetKey: ikinciSlot, mode: 'attack', units: { fjordvakt: 50 }, kahraman: true,
  });
  assert.equal(r.ok, true, `sefer reddedildi: ${r.sebep}`);
  assert.equal(r.veri.kahramanAtlandi, null, 'kahraman sefere katılmalı');

  await seferVarsin(oturum, r.veri.seconds);

  const sonrakiCan = oturum.koy.kahraman.can;
  assert.ok(sonrakiCan < oncekiCan,
    `savaştan sonra can düşmeli (önce ${oncekiCan}, sonra ${sonrakiCan})`);
});

test('RAPOR karşı tarafın ORDUSUNU yazıyor, yalnız kaybını değil', async (t) => {
  /*
    Yalnız kayıp yazılıyordu; savunan kazandıysa kaybı küçük olur ve
    oyuncu neye çarptığını hiç öğrenemezdi. "40 öldürdüm" tek başına
    anlamsız: 40/45 ile 40/900 tamamen farklı iki savaş.
  */
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { oturum, ikinciSlot } = await savasSahnesi(sunucu, t);

  const r = await seferDene(oturum.soket, {
    targetKey: ikinciSlot, mode: 'attack', units: { fjordvakt: 50 },
  });
  assert.equal(r.ok, true, `sefer reddedildi: ${r.sebep}`);
  await seferVarsin(oturum, r.veri.seconds);

  const savas = (oturum.koy.reports || []).find(x => x.outcome === 'savas');
  assert.ok(savas, 'savaş raporu oluşmadı');
  assert.ok(savas.theirSent, 'raporda savunanın ordusu olmalı');

  const toplam = Object.values(savas.theirSent).reduce((a, b) => a + b, 0);
  const kayip = Object.values(savas.theirLosses || {}).reduce((a, b) => a + b, 0);
  assert.ok(toplam > 0, 'savunanın ordusu sıfır görünmemeli');
  assert.ok(toplam >= kayip,
    `ordu kayıptan küçük olamaz (ordu ${toplam}, kayıp ${kayip})`);
});

test('KAHRAMAN ORDUSUYLA DÖNÜYOR — yolda maceraya çıkamıyor', async (t) => {
  /*
    İlkan: *"kahraman başka köye saldırdı, geri geliyor; daha gelmeden
    maceraya yolladım. Yollayamamam lazım."*

    Eskiden savaş biter bitmez kahraman "üssünde" sayılıyordu: seferin
    dönüş ayağı kahraman için hiç yoktu ve uzaklık kahramanın
    maliyetine girmiyordu.

    ÖLÇÜM SAVAŞ İLE VARIŞ ARASINDA yapılıyor: dünyayı hızlandırıp gidiş
    ayağını geçiyoruz, dönüş ayağı sürerken soruyoruz.
  */
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { oturum, ikinciSlot } = await savasSahnesi(sunucu, t);

  const r = await seferDene(oturum.soket, {
    targetKey: ikinciSlot, mode: 'attack', units: { fjordvakt: 50 }, kahraman: true,
  });
  assert.equal(r.ok, true, `sefer reddedildi: ${r.sebep}`);

  /*
    DEĞİŞMEZ ÖLÇÜLÜYOR, AN DEĞİL.

    Önce "savaştan sonra, varıştan önce" penceresini yakalamaya
    çalışıyorduk: hızlı dünyada o pencere milisaniyelerle ölçülüyor ve
    test makinenin o anki yüküne göre bir yeşil bir kırmızı dönüyordu
    (iki kez döndü). Yakalanacak bir an aramak yerine KURALIN KENDİSİ
    örnekleniyor:

        SEFER LİSTEDE DURDUĞU SÜRECE kahraman 'sefer' olmalı.

    Eski davranışta bu değişmez savaş biter bitmez bozuluyordu (sefer
    hâlâ dönüş yolunda ama kahraman 'koy'), yani test hatayı kesin
    yakalıyor — üstelik pencere ne kadar dar olursa olsun.
  */
  oturum.soket.emit('set_speed', { tickMs: 8 });          // ~125× dünya hızı

  let ihlal = null;
  let seferBitti = false;
  for (let i = 0; i < 600 && !seferBitti; i++) {
    const seferVar = (oturum.koy.marches || []).some(m => m.id === r.veri.id);
    if (!seferVar) { seferBitti = true; break; }
    if (oturum.koy.kahraman.nerede !== 'sefer') {
      ihlal = oturum.koy.kahraman.nerede;
      break;
    }
    await bekle(50);
  }
  oturum.soket.emit('set_speed', { tickMs: 1000 });
  await bekle(1200);

  assert.equal(ihlal, null,
    `sefer yoldayken kahraman "${ihlal}" oldu — ordusuyla dönmeli`);
  assert.equal(seferBitti, true, 'sefer süresinde tamamlanmadı');
  assert.equal(oturum.koy.kahraman.nerede, 'koy',
    'sefer eve varınca kahraman serbest kalmalı');

  /* Serbest kalan kahraman yeniden emir alabilmeli — kilitli kalmasın */
  const hata = await new Promise((res) => {
    oturum.soket.once('kahraman_error', (e) => res(e?.reason));
    oturum.soket.emit('macera_baslat', { tip: 'kisa' });
    setTimeout(() => res(null), 2500);
  });
  assert.notEqual(hata, 'mesgul',
    'eve varan kahraman maceraya çıkabilmeli — aksi hâlde kilitli kalırdı');
});
