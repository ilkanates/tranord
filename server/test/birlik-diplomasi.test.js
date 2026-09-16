/**
 * BİRLİK DİPLOMASİSİ — kurallar ve uçtan uca akış.
 *
 * İlkan: *"elçilik binasına birlik ile alakalı her şeyi ekle. Travian'da
 * ne varsa bizim elçilikte de olsun."*
 *
 * Korunan kararlar:
 *
 * 1) KONFEDERASYON ve SALDIRMAZLIK karşılıklı, SAVAŞ tek taraflı.
 *    Savaşı da onaya bağlasaydık hiç kimseye savaş ilan edilemezdi —
 *    düşman sadece "kabul etme"yi seçerdi.
 * 2) TEKLİFİ YALNIZ KARŞI TARAF cevaplayabilir. Gönderen kendi
 *    teklifini kabul edip ilişkiyi tek başına kurabilseydi
 *    karşılıklılık diye bir şey kalmazdı.
 * 3) İKİ BİRLİK ARASINDA TEK İLİŞKİ. Aynı anda hem müttefik hem
 *    savaşta olmak okunamaz bir durum olurdu.
 * 4) DİPLOMASİ YALNIZ KONUNG'UN. Savaş bütün birliği bağlayan ve geri
 *    alınması pahalı bir karar.
 */
const test = require('node:test');
const assert = require('node:assert');
const B = require('../game/birlik');

test('uc iliski turu: ikisi karsilikli, savas tek tarafli', () => {
  assert.deepEqual(B.ILISKI_ANAHTARLARI,
    ['konfederasyon', 'saldirmazlik', 'savas']);
  assert.equal(B.ILISKILER.konfederasyon.karsilikli, true);
  assert.equal(B.ILISKILER.saldirmazlik.karsilikli, true);
  /*
    SAVAŞ BİR BİLDİRİM, ANLAŞMA DEĞİL. Onaya bağlasaydık kimseye savaş
    ilan edilemezdi.
  */
  assert.equal(B.ILISKILER.savas.karsilikli, false);
});

test('diplomasi yalniz Konung yetkisinde', () => {
  assert.equal(B.yetkiler('konung').diplomasi, true);
  assert.equal(B.yetkiler('jarl').diplomasi, false);
  assert.equal(B.yetkiler('karl').diplomasi, false);
  /*
    PROFİL Jarl'a AÇIK: geri alınabilir bir metin. Konung'a kilitlemek
    birliğin tanıtımını tek kişinin çevrimiçi olmasına bağlardı.
  */
  assert.equal(B.yetkiler('jarl').profilYazar, true);
  assert.equal(B.yetkiler('karl').profilYazar, false);
});

test('yetkisiz diplomasi hamlesi reddediliyor', () => {
  const r = B.diplomasiYapabilirMi({
    tur: 'savas', benimBirlikId: 1, hedefBirlikId: 2, yetkim: false });
  assert.equal(r.ok, false);
  assert.equal(r.sebep, 'yetki_yok');
});

test('kendi birligiyle iliski kurulamiyor', () => {
  /*
    Teorik değil: birlik listesi kendi birliğini de içeriyor ve
    istemciden gelen kimliğe güvenmiyoruz.
  */
  const r = B.diplomasiYapabilirMi({
    tur: 'konfederasyon', benimBirlikId: 7, hedefBirlikId: 7, yetkim: true });
  assert.equal(r.ok, false);
  assert.equal(r.sebep, 'kendi_birligin');
});

test('bilinmeyen iliski turu reddediliyor', () => {
  const r = B.diplomasiYapabilirMi({
    tur: 'dostluk', benimBirlikId: 1, hedefBirlikId: 2, yetkim: true });
  assert.equal(r.ok, false);
  assert.equal(r.sebep, 'tur_yok');
});

test('karsilikli bayragi hamlenin sonucunu belirliyor', () => {
  const konf = B.diplomasiYapabilirMi({
    tur: 'konfederasyon', benimBirlikId: 1, hedefBirlikId: 2, yetkim: true });
  assert.equal(konf.ok, true);
  assert.equal(konf.karsilikli, true, 'konfederasyon teklif olarak beklemeli');

  const savas = B.diplomasiYapabilirMi({
    tur: 'savas', benimBirlikId: 1, hedefBirlikId: 2, yetkim: true });
  assert.equal(savas.ok, true);
  assert.equal(savas.karsilikli, false, 'savaş ilan edildiği an yürürlükte');
});

test('teklifi yalniz KARSI taraf cevaplayabiliyor', () => {
  const teklif = { durum: 'teklif', tur: 'saldirmazlik', hedefId: 2 };
  // Hedef olan birlik cevaplayabilir
  assert.equal(B.teklifCevaplanabilirMi(
    { teklif, benimBirlikId: 2, yetkim: true }).ok, true);
  /*
    Gönderen kendi teklifini kabul edip ilişkiyi tek başına kurabilseydi
    karşılıklılık diye bir şey kalmazdı.
  */
  const kendi = B.teklifCevaplanabilirMi(
    { teklif, benimBirlikId: 1, yetkim: true });
  assert.equal(kendi.ok, false);
  assert.equal(kendi.sebep, 'senin_teklifin');
});

test('yururlukteki iliski yeniden cevaplanamiyor', () => {
  const kabul = { durum: 'kabul', tur: 'konfederasyon', hedefId: 2 };
  const r = B.teklifCevaplanabilirMi({ teklif: kabul, benimBirlikId: 2, yetkim: true });
  assert.equal(r.ok, false);
  assert.equal(r.sebep, 'teklif_yok');
});

test('birlik aciklamasi: gorunmez karakter suzuluyor, uzunluk kirpiliyor', () => {
  const gorunmez = String.fromCharCode(0x200b);
  const r = B.aciklamaDogrula(`  Kuzeyin${gorunmez} kurtları  `);
  assert.equal(r.aciklama, 'Kuzeyin kurtları');
  /* Boş açıklama GEÇERLİ: silmek de bir seçim */
  assert.equal(B.aciklamaDogrula('   ').aciklama, '');
  assert.equal(B.aciklamaDogrula('x'.repeat(2000)).aciklama.length, B.ACIKLAMA_EN_COK);
});

test('aciklamada satir sonu korunuyor, asiri bosluk kirpiliyor', () => {
  /*
    Ad tek satır olmak zorunda (adDogrula boşlukları teke indiriyor);
    açıklama bir TANITIM METNİ, paragrafı olabilmeli.
  */
  const r = B.aciklamaDogrula('Birinci satır\n\n\n\n\n\nİkinci satır');
  assert.ok(r.aciklama.includes('\n'), 'satır sonu korunmalı');
  assert.equal(r.aciklama.includes('\n\n\n\n'), false, 'aşırı boş satır kırpılmalı');
});

test('gunluk turleri tanimli ve diplomasi olaylarini kapsiyor', () => {
  /*
    Günlük türü eklenip listeye yazılmazsa arayüz o satırı tanımayan
    bir rozetle çizer. Liste tek kaynak.
  */
  for (const t of ['katildi', 'ayrildi', 'atildi', 'jarl_oldu', 'jarl_indi',
    'savas_ilan', 'diplomasi_teklif', 'diplomasi_kabul', 'diplomasi_red',
    'diplomasi_bitti', 'profil_degisti']) {
    assert.ok(B.GUNLUK_TURLERI.includes(t), `${t} günlük türlerinde olmalı`);
  }
});
