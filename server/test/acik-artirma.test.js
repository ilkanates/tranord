/**
 * AÇIK ARTIRMA KURALLARI — saf mantık, veritabanı yok.
 *
 * İlkan: *"itemlerin min tutarları olsun, kimse almasa bile açık
 * artırma bitince o parayı kullanıcı alsın, item NPC'ye satılmış olsun.
 * her satış 24 saat açık artırmada dursun, fazla parayı veren alsın."*
 *
 * Bir eşya pazarında en pahalı hatalar SÖMÜRÜLEBİLİR kurallardır:
 * kendi ilanına teklif verip fiyatı şişirmek, taban fiyatı kendin
 * yazıp NPC'ye milyona satmak, son saniyede kapmak. Aşağıdaki testler
 * her birini tek tek kapıyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const AA = require('../game/acikArtirma');
const DEGER = require('../game/esyaDeger');

const T0 = 1_700_000_000_000;
const esya = (n = 'nadir', s = 1) => ({ key: 'fjordKilici', nadirlik: n, seviye: s });

function yeniIlan(n = 'nadir', s = 1, saticiId = 1) {
  const r = AA.ilanKur(esya(n, s), saticiId, T0);
  assert.equal(r.ok, true);
  return { ...r.ilan, id: 1 };
}

test('TABAN FİYATI SİSTEM koyuyor — satıcı yazamıyor', () => {
  /*
    EN ÖNEMLİ SÖMÜRÜ KAPISI. Satıcı tabanı kendi yazsaydı ve teklif
    gelmeyince NPC o tabanı ödeseydi, herkes tabana milyon yazıp
    bedava para basardı. Taban eşyanın kendisinden türüyor.
  */
  const r = AA.ilanKur({ ...esya('epik'), taban: 999999 }, 1, T0);
  assert.equal(r.ilan.taban, DEGER.tabanFiyat(esya('epik')),
    'taban eşyadan türemeli, ilandan gelen sayı yok sayılmalı');
});

test('süre 24 GERÇEK saat — oyun saati değil', () => {
  /*
    Dünya 10× hızda: 24 oyun saati 2,4 gerçek saat eder ve günde bir
    giren oyuncu hiçbir açık artırmayı göremezdi. Pazar insanların
    görebildiği bir saatte durmalı.
  */
  const ilan = yeniIlan();
  assert.equal(ilan.bitis - ilan.baslangic, 24 * 3600 * 1000);
  assert.equal(AA.SURE_SAAT, 24);
});

test('KENDİ İLANINA teklif veremezsin — fiyat şişirme kapalı', () => {
  /*
    Kendi eşyanın fiyatını yükseltip başka birine ödetmek açık
    artırmanın en bilinen dolandırıcılığı. Gümüş bloke edildiği için
    risksiz de olurdu: kaybetse bile parası kendine dönerdi.
  */
  const ilan = yeniIlan('nadir', 1, 7);
  assert.equal(AA.teklifEngeli(ilan, 7, 99999, 99999, T0), 'kendi_ilanin');
});

test('ilk teklif TABANDAN başlıyor, sonrakiler %5 artıyor', () => {
  let ilan = yeniIlan();
  assert.equal(AA.enAzTeklif(ilan), ilan.taban, 'ilk teklif taban olmalı');
  assert.equal(AA.teklifEngeli(ilan, 2, ilan.taban - 1, 99999, T0), 'teklif_dusuk');

  ilan = AA.teklifUygula(ilan, 2, ilan.taban, T0).ilan;
  const beklenen = ilan.teklif + Math.max(1, Math.round(ilan.teklif * AA.ARTIS_YUZDE));
  assert.equal(AA.enAzTeklif(ilan), beklenen);
  /*
    Yüzde olmasaydı 500 gümüşlük bir eşyada birer birer artıran biri
    açık artırmayı yüzlerce teklife boğardı.
  */
  assert.ok(beklenen > ilan.teklif + 1, 'artış birer birer olmamalı');
});

test('ÖNDEKİ TEKLİFÇİ üstüne teklif veremiyor', () => {
  // Kendi kendini artırmak yalnız parasını fazladan bloke etmeye yarardı
  let ilan = yeniIlan();
  ilan = AA.teklifUygula(ilan, 2, ilan.taban, T0).ilan;
  assert.equal(AA.teklifEngeli(ilan, 2, 99999, 99999, T0), 'zaten_ondesin');
});

test('teklif geçilince ÖNCEKİ oyuncunun parası iade listesine düşüyor', () => {
  /*
    İade ANINDA olmalı: "kaybettim ama param birkaç saat kilitli"
    cezası kimsenin teklif vermek istememesine yol açardı. Paranın
    kendisi çağıranda taşınıyor; bu dosya kimin alacağını söylüyor.
  */
  let ilan = yeniIlan();
  const a = AA.teklifUygula(ilan, 2, ilan.taban, T0);
  assert.equal(a.iade, null, 'ilk teklifte iade edilecek kimse yok');

  const b = AA.teklifUygula(a.ilan, 3, AA.enAzTeklif(a.ilan), T0);
  assert.deepEqual(b.iade, { userId: 2, miktar: a.ilan.teklif });
  assert.equal(b.ilan.teklifVerenId, 3);
});

test('SON DAKİKA teklifi süreyi uzatıyor — snipe koruması', () => {
  /*
    Uzatma olmasaydı kazanan, eşyayı en çok isteyen değil son saniyede
    bağlantısı en hızlı olan olurdu.
  */
  const ilan = yeniIlan();
  const sonAn = ilan.bitis - 60 * 1000;                 // bitişe 1 dk
  const r = AA.teklifUygula(ilan, 2, ilan.taban, sonAn);
  assert.equal(r.uzadi, true);
  assert.equal(r.ilan.bitis, sonAn + AA.UZATMA_ESIGI_MS);

  /* Erken teklif süreyi UZATMIYOR — yoksa açık artırma hiç bitmezdi */
  const erken = AA.teklifUygula(ilan, 2, ilan.taban, T0 + 1000);
  assert.equal(erken.uzadi, false);
  assert.equal(erken.ilan.bitis, ilan.bitis);
});

test('SÜRE DOLDUKTAN sonra teklif kabul edilmiyor', () => {
  const ilan = yeniIlan();
  assert.equal(AA.teklifEngeli(ilan, 2, 99999, 99999, ilan.bitis), 'bitti');
  assert.equal(AA.teklifEngeli(ilan, 2, 99999, 99999, ilan.bitis + 1), 'bitti');
});

test('bakiyesi yetmeyen teklif veremiyor', () => {
  // Blokaj olmasaydı aynı gümüşle on açık artırma kazanılırdı
  const ilan = yeniIlan();
  assert.equal(AA.teklifEngeli(ilan, 2, ilan.taban, ilan.taban - 1, T0), 'yetersiz');
  assert.equal(AA.teklifEngeli(ilan, 2, ilan.taban, ilan.taban, T0), null);
});

test('TEKLİF GELMEZSE NPC alıyor ve satıcı TABANI kazanıyor', () => {
  /*
    İlkan'ın açık isteği: *"kimse almasa bile açık artırma bitince o
    parayı kullanıcı alsın, item NPC'ye satılmış olsun."* Satılmazsa
    oyuncu emeğinin karşılığını hiç alamaz, değersiz eşyalar envanterde
    çöp olarak birikirdi.
  */
  const ilan = yeniIlan('siradan');
  const s = AA.sonuclandir(ilan);
  assert.equal(s.tur, 'npc');
  assert.equal(s.aliciId, null);
  assert.equal(s.saticiKazanc, ilan.taban);
});

test('teklif varsa EN YÜKSEĞİ alıyor, satıcı o parayı kazanıyor', () => {
  let ilan = yeniIlan();
  ilan = AA.teklifUygula(ilan, 2, ilan.taban, T0).ilan;
  ilan = AA.teklifUygula(ilan, 3, AA.enAzTeklif(ilan), T0).ilan;
  const s = AA.sonuclandir(ilan);
  assert.equal(s.tur, 'satildi');
  assert.equal(s.aliciId, 3, 'fazla parayı veren almalı');
  assert.equal(s.saticiKazanc, ilan.teklif);
  assert.ok(s.saticiKazanc > ilan.taban, 'rekabet fiyatı tabanın üstüne çıkarmalı');
});

test('SEVİYELİ eşya daha yüksek tabanla çıkıyor', () => {
  /*
    Aksi hâlde oyuncu yükselttiği eşyayı yatırdığı gümüşün altında
    satmak zorunda kalır, yükseltme tek yönlü bir kayıp olurdu.
  */
  const lv1 = yeniIlan('nadir', 1);
  const lv5 = yeniIlan('nadir', DEGER.MAKS_SEVIYE);
  assert.ok(lv5.taban > lv1.taban, `${lv5.taban} > ${lv1.taban} olmalı`);
});

test('tanımsız eşya satışa konamıyor', () => {
  assert.equal(AA.ilanKur({ key: 'yokBoyleBirSey', nadirlik: 'nadir' }, 1, T0).ok, false);
  assert.equal(AA.satilabilirMi(null), 'esya_yok');
});
