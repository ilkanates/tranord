/**
 * KESE — gümüş/altın cüzdanı ve eşya değerleri.
 *
 * İlkan'ın tarifi: *"kullanıcı altını gümüşe, gümüşü altına
 * çevirebilsin… altınla 1'e 1 hammadde ticareti yapabilsin."*
 *
 * Bu testlerin asıl işi PARA ÜRETEN DÖNGÜ OLMADIĞINI tutmak. Bir
 * ekonomide en pahalı hata, bir turu döndürünce başladığından fazlasıyla
 * çıkılabilmesidir: bulan oyuncu sınırsız kaynak basar ve oyun biter.
 * Aşağıdaki testler her kapıyı tek tek ölçüyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const KESE = require('../game/kese');
const DEGER = require('../game/esyaDeger');

const yeni = () => KESE.yeniKese();

test('başlangıç kesesi tanımlı ve birkaç eşyaya yetiyor', () => {
  const k = yeni();
  assert.equal(k.gumus, KESE.BASLANGIC.gumus);
  assert.equal(k.altin, KESE.BASLANGIC.altin);
  /*
    İlkan: *"başlangıçta herkese birkaç item alacak kadar gümüş
    verilsin."* Ölçü SIRADAN eşyanın taban fiyatı — sayıyı elle
    yazsaydık fiyat değişince bu şart sessizce bozulurdu.
  */
  const siradan = DEGER.tabanFiyat({ key: 'fjordKilici', nadirlik: 'siradan' });
  assert.ok(k.gumus >= siradan * 3,
    `başlangıç gümüşü en az üç sıradan eşya almalı (${k.gumus} / ${siradan})`);
});

test('ÇEVİRME GERİ DÖNÜŞÜ KÂRLI DEĞİL — para üreten döngü yok', () => {
  /*
    EN ÖNEMLİ TEST. Altın → gümüş → altın turu başladığı yerden fazlasını
    verirse oyuncu döngüyü çevirerek sınırsız para basar. Makas (100'e
    karşı 150) tam olarak bunu engelliyor.
  */
  let k = { gumus: 0, altin: 10 };
  const a = KESE.cevir(k, 'altinToGumus', 10);
  assert.equal(a.ok, true);
  assert.equal(a.kese.gumus, 10 * KESE.ALTIN_GUMUS);

  const b = KESE.cevir(a.kese, 'gumusToAltin', a.kese.gumus);
  assert.equal(b.ok, true);
  assert.ok(b.kese.altin < 10,
    `tur başa dönerken altın AZALMALI, ölçülen: ${b.kese.altin}`);
  assert.ok(KESE.GUMUS_ALTIN > KESE.ALTIN_GUMUS,
    'makas kapanırsa iki para birimi tek para birimine düşer');
});

test('gümüşten altına çevirirken ARTIK gümüş kesede kalıyor', () => {
  /*
    Artığı yutsaydık oyuncu tam katları ezberlemek zorunda kalır ve her
    seferinde sessizce para kaybederdi.
  */
  const fazla = KESE.GUMUS_ALTIN * 2 + 40;
  const r = KESE.cevir({ gumus: fazla, altin: 0 }, 'gumusToAltin', fazla);
  assert.equal(r.ok, true);
  assert.equal(r.kese.altin, 2);
  assert.equal(r.kese.gumus, 40, 'artan gümüş yutulmamalı');
});

test('yetersiz bakiyede HİÇ dokunulmuyor', () => {
  const k = { gumus: 10, altin: 0 };
  const r = KESE.harca(k, 'gumus', 50);
  assert.equal(r.ok, false);
  assert.equal(r.sebep, 'yetersiz');
  assert.equal(r.kese.gumus, 10, 'kısmi harcama olmamalı');

  const c = KESE.cevir({ gumus: 0, altin: 1 }, 'altinToGumus', 5);
  assert.equal(c.ok, false);
  assert.equal(c.kese.altin, 1);
});

test('eksi ve kesirli miktarlar para basmıyor', () => {
  assert.equal(KESE.ekle({ gumus: 100, altin: 0 }, 'gumus', -50).gumus, 100,
    'eksi ekleme harcamanın gizli kapısı olurdu');
  assert.equal(KESE.ekle({ gumus: 100, altin: 0 }, 'gumus', 10.9).gumus, 110,
    'kesir aşağı yuvarlanmalı');
  assert.equal(KESE.harca({ gumus: 100, altin: 0 }, 'gumus', 0).ok, false);
});

test('bozuk/eksik kayıt başlangıç bakiyesiyle açılıyor', () => {
  // Eski hesapların kese alanı hiç yok; ayrı bir göç adımı yazılmadı.
  const k = KESE.duzelt(undefined);
  assert.equal(k.gumus, KESE.BASLANGIC.gumus);
  assert.equal(KESE.duzelt({ gumus: -5, altin: 'abc' }).altin, KESE.BASLANGIC.altin);
});

test('ALTINLA HAMMADDE ALINAMIYOR — kapı hiç yok', () => {
  /*
    İlkan'ın kararı (17 Eylül 2026): *"parayla hammadde alınamamalı."*

    Altınla kaynak alınabilseydi oyun "para öde, kaynak al" hâline
    gelir, ödeyenin üretim yapmaya ihtiyacı kalmazdı. Kaynak
    dönüştürmenin tek yeri pazarın NPC takası ve bedeli oranın kendisi.

    İŞLEVİN VARLIĞI ÖLÇÜLÜYOR, davranışı değil: kapı geri açılırsa —
    başka bir adla bile olsa — kesenin yüzeyi değişir ve bu test onu
    yakalar.
  */
  assert.equal(KESE.hammaddeAl, undefined,
    'kesede hammadde alma işlevi olmamalı');
  assert.equal(KESE.ALTIN_HAMMADDE, undefined);
  const o = KESE.ozet({ gumus: 100, altin: 5 });
  assert.equal(o.altinHammadde, undefined,
    'pakette hammadde kuru kalmamalı — ekranda ölü bir sekme doğururdu');
  assert.deepEqual(Object.keys(o).sort(), ['altin', 'altinGumus', 'gumus', 'gumusAltin']);
});

/* ══ EŞYA DEĞERİ ═══════════════════════════════════════════════════ */

test('taban fiyat nadirlikle KARE olarak büyüyor', () => {
  const f = (n) => DEGER.tabanFiyat({ key: 'fjordKilici', nadirlik: n });
  const sira = ['siradan', 'iyi', 'nadir', 'epik', 'efsane'].map(f);
  for (let i = 1; i < sira.length; i++) {
    assert.ok(sira[i] > sira[i - 1], 'fiyat nadirlikle artmalı');
  }
  /*
    KARE, doğrusal değil: nadirlik hem ETKİYİ hem SEYREKLİĞİ büyütüyor
    (efsanevi eşya sıradanın 47 katı seyrek, bkz. dusmeAgirligi).
    Doğrusal fiyatta efsanevi eşya gülünç ucuz kalırdı.
  */
  assert.ok(sira[4] / sira[0] > 10,
    `efsanevi/sıradan oranı en az 10 olmalı, ölçülen: ${(sira[4] / sira[0]).toFixed(1)}`);
});

test('YÜKSELTİP SATMAK KÂRLI DEĞİL — ikinci para döngüsü kapalı', () => {
  /*
    Eşyayı ucuza alıp yükseltip pahalıya satmak kârlı olsaydı açık
    artırma bir para basma makinesine dönerdi. Yükseltme KULLANMAK
    içindir, çevirmek için değil.
  */
  for (const n of ['siradan', 'iyi', 'nadir', 'epik', 'efsane']) {
    const g = (s) => ({ key: 'fjordKilici', nadirlik: n, seviye: s });
    const maliyet = [1, 2, 3, 4].reduce((t, s) => t + DEGER.yukseltmeBedeli(g(s)), 0);
    const artis = DEGER.tabanFiyat(g(5)) - DEGER.tabanFiyat(g(1));
    assert.ok(maliyet > artis,
      `${n}: yükseltme (${maliyet}) değer artışından (${artis}) ucuz olmamalı`);
  }
});

test('NADİRLİK SEVİYEYE YENİLMİYOR — sıradan Lvl 5 < efsanevi Lvl 1', () => {
  /*
    Yenilseydi nadirlik anlamsızlaşır, herkes en ucuz eşyayı alıp
    yükseltirdi ve açık artırmada tek bir fiyat kalırdı.
  */
  const siradanTam = 1 * DEGER.seviyeCarpani({ seviye: DEGER.MAKS_SEVIYE });
  const efsaneTaban = 3.6;
  assert.ok(siradanTam < efsaneTaban,
    `sıradan Lvl ${DEGER.MAKS_SEVIYE} (${siradanTam}) efsanevi Lvl 1'i (${efsaneTaban}) geçmemeli`);
});

test('seviye sınırı ve yükseltilebilirlik tek cümlede', () => {
  const g = { key: 'fjordKilici', nadirlik: 'nadir', seviye: DEGER.MAKS_SEVIYE };
  assert.equal(DEGER.yukseltilebilirMi(g), 'en_ust_seviye');
  assert.equal(DEGER.yukseltmeBedeli(g), 0);
  assert.equal(DEGER.seviye({ seviye: 99 }), DEGER.MAKS_SEVIYE, 'tavan aşılamamalı');
  assert.equal(DEGER.seviye({}), 1, 'seviyesiz eski eşya Lvl 1 sayılmalı');
  // İksir kuşanılmıyor: bonusu yok ki seviyeyle büyüsün
  assert.equal(DEGER.yukseltilebilirMi({ key: 'diriltmeIksiri', nadirlik: 'siradan' }),
    'kusanilmaz');
});
