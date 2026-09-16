/**
 * BİRLİK — rütbe merdiveni, yetkiler ve tavanlar.
 *
 * İlkan'ın tarifi: *"kurucu birliğe adam alabilir çıkartabilir, 2
 * yetkili alt yönetici seçilebilir. buradaki kral ve alt yöneticilerini
 * Nord mitolojisine göre ayarla, yarl vs gibi terimler kullan."*
 *
 * Rütbeler İskandinav toplum düzeninden: Rígsþula'nın Jarl (soylu) ve
 * Karl (hür adam) sınıfları, üstlerinde Konungr (kral).
 *
 * Bu dosya SAF KURALLARI kilitliyor (game/birlik.js). Veritabanı ve
 * bellek tarafı (birlikServis.js) oturum gerektirdiği için burada
 * değil; oradaki kararlar da bu kuralları çağırıyor, yani kural bir
 * kez bozulursa iki taraf birden bozuluyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const B = require('../game/birlik');

test('rütbe merdiveni Konung > Jarl > Karl', () => {
  assert.deepEqual(B.RUTBE_SIRA, ['konung', 'jarl', 'karl']);
  assert.equal(B.RUTBELER.konung.ad, 'Konung');
  assert.equal(B.RUTBELER.jarl.ad, 'Jarl');
  assert.equal(B.RUTBELER.karl.ad, 'Karl');
});

test('yetkiler: Konung her şeyi, Jarl davet ve Karl atma, Karl hiçbiri', () => {
  const k = B.yetkiler('konung');
  const j = B.yetkiler('jarl');
  const a = B.yetkiler('karl');

  assert.ok(k.davetEder && k.uyeAtar && k.jarlSecer && k.dagitir && k.adDegistirir);
  assert.ok(j.davetEder && j.uyeAtar);
  assert.ok(!j.jarlSecer && !j.dagitir && !j.adDegistirir,
    'Jarl yönetimi devralamaz — yoksa Konung diye bir rütbe kalmaz');
  assert.ok(!a.davetEder && !a.uyeAtar && !a.jarlSecer);

  /*
    KONUNG AYRILAMAZ. Ayrılabilseydi birlik kralsız kalır, kimse davet
    gönderemez, kimse atamaz — kimsenin çözemediği ölü bir kayıt.
  */
  assert.equal(k.ayrilir, false, 'Konung ayrılamamalı');
  assert.ok(j.ayrilir && a.ayrilir);
});

test('atma zinciri: Jarl yalnız Karl atar, Konung atılamaz', () => {
  assert.equal(B.atabilirMi('konung', 'jarl'), true);
  assert.equal(B.atabilirMi('konung', 'karl'), true);
  assert.equal(B.atabilirMi('jarl', 'karl'), true);
  /*
    JARL JARL'I ATAMAZ. İzin verseydik iki yönetici birbirini atmaya
    çalışır ve sonucu kimin daha hızlı tıkladığı belirlerdi.
  */
  assert.equal(B.atabilirMi('jarl', 'jarl'), false);
  assert.equal(B.atabilirMi('jarl', 'konung'), false);
  assert.equal(B.atabilirMi('karl', 'karl'), false);
  assert.equal(B.atabilirMi('konung', 'konung'), false, 'Konung atılamaz');
});

test('Jarl tavanı İKİ — İlkan\'ın kararı', () => {
  assert.equal(B.JARL_TAVANI, 2);
  assert.equal(B.jarlSecilebilirMi(0), true);
  assert.equal(B.jarlSecilebilirMi(1), true);
  assert.equal(B.jarlSecilebilirMi(2), false, 'üçüncü Jarl seçilememeli');
});

test('üye tavanı elçilik seviyesinden — seviye başına üç', () => {
  assert.equal(B.uyeTavani(0), 0, 'elçiliksiz birlik olmaz');
  assert.equal(B.uyeTavani(1), 3);
  assert.equal(B.uyeTavani(10), 30);
  assert.equal(B.uyeTavani(20), 60);
  /*
    Tavan ölçütü KONUNG'un elçiliği (bkz. birlikServis · tavan). Bütün
    üyelerin elçilikleri toplansaydı her yeni üye tavanı da açar ve
    tavan diye bir şey kalmazdı; bu test o kararın SAYISINI kilitliyor.
  */
});

test('birlik kurmak ELÇİLİK istiyor ve ikinci birlik kurulamıyor', () => {
  assert.deepEqual(B.kurabilirMi({ elcilikSeviyesi: 0 }),
    { ok: false, sebep: 'elcilik_yok' });
  assert.deepEqual(B.kurabilirMi({ elcilikSeviyesi: 1 }), { ok: true });
  assert.deepEqual(B.kurabilirMi({ elcilikSeviyesi: 5, mevcutBirlikId: 3 }),
    { ok: false, sebep: 'zaten_birlikte' });
});

test('katılma tavanı KABUL ANINDA bakılıyor', () => {
  /*
    Davet gönderildikten sonra birlik dolabilir. Tavanı yalnız davet
    anında sayarsak dolu birliğe katılma mümkün olur ve üye tavanı
    davet sayısı kadar aşılabilir.
  */
  assert.deepEqual(B.katilabilirMi({ uyeSayisi: 2, tavan: 3 }), { ok: true });
  assert.deepEqual(B.katilabilirMi({ uyeSayisi: 3, tavan: 3 }),
    { ok: false, sebep: 'birlik_dolu' });
  assert.deepEqual(B.katilabilirMi({ uyeSayisi: 1, tavan: 3, mevcutBirlikId: 9 }),
    { ok: false, sebep: 'zaten_birlikte' });
});

test('birlik adı: boşluk serbest, görünmez karakter ve uç boşluk değil', () => {
  assert.deepEqual(B.adDogrula('  Kuzey   Kurtları  '), { ad: 'Kuzey Kurtları' },
    'boşluklar sadeleşmeli, ad SANCAK adı olduğu için boşluk serbest');
  assert.ok(B.adDogrula('ab').hata, 'üç karakterden kısa ad olmamalı');
  assert.ok(B.adDogrula('x'.repeat(40)).hata, 'çok uzun ad olmamalı');
  assert.ok(B.adDogrula('   ').hata);
  assert.ok(B.adDogrula('...').hata, 'en az bir harf ya da rakam olmalı');

  /*
    GÖRÜNMEZ KARAKTER ELENİYOR. Sıfır genişlikli birleştirici iki farklı
    adı aynı gösterir; benzersizlik denetimini böyle atlatmak mümkün
    olurdu ("Kuzey" ile "Ku<zwj>zey" haritada ayırt edilemez).
  */
  const gizli = `Kuzey${String.fromCharCode(0x200b)} Kurtları`;
  assert.equal(B.adDogrula(gizli).ad, 'Kuzey Kurtları');
});

test('amblem listeden seçiliyor', () => {
  assert.ok(B.AMBLEMLER.length >= 8, 'seçilecek kadar amblem olmalı');
  assert.ok(B.amblemGecerli(B.AMBLEMLER[0]));
  assert.equal(B.amblemGecerli('olmayanAmblem'), false);
  assert.equal(B.amblemGecerli(''), false);
  assert.equal(B.amblemGecerli(null), false);
});

test('BİRLİK İÇİ SALDIRI SERBEST — İlkan\'ın kararı', () => {
  /*
    Kuralın kodda bir yeri olsun diye tek satırlık bir fonksiyon var;
    ileride "acaba yasak mıydı" diye kimse aramasın. Yasak konacaksa
    değişecek tek yer orası ve bu test.

    Gerekçe: birlik bir askerî anlaşma değil, kimlik ve iletişim
    çatısı. Saldırıyı yasaklamak birliği aynı zamanda saldırmazlık
    paktına çevirirdi ve oyuncular birliği yalnız o yüzden kurardı.
  */
  assert.equal(B.birlikIciSaldiriSerbest(), true);
});

test('Elçilik binası tanımlı: birlik kurmanın tek kapısı', () => {
  const { VILLAGE_DEFS } = require('../data');
  const def = VILLAGE_DEFS[B.ELCILIK_TIPI];
  assert.ok(def, 'elcilik binası tanımlı olmalı');
  assert.equal(def.unique, true, 'köy başına tek elçilik');
  assert.ok(def.maxLevel >= 20);
  /*
    Üye tavanı elçilik seviyesinden çıkıyor; bina tavanı ile birlik
    tavanı birbirini tutmalı.
  */
  assert.equal(B.uyeTavani(def.maxLevel), def.maxLevel * B.UYE_PER_ELCILIK_SEVIYESI);
});
