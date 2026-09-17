/**
 * KAHRAMAN SEFERE KATILABİLİR Mİ — TEK KAYNAK.
 *
 * İlkan: *"kahramanı şu an saldırıya ekleyemiyorum, başka köyde diyor."*
 *
 * Bu kural ÜÇ yerde elle yazılıydı (istemcide bir, sunucuda iki) ve
 * ayrışmıştı: konağı olmayan kahramanda arayüz kutuyu AÇIK gösteriyor,
 * sunucu ise kahramanı sessizce almıyordu — oyuncu kahramanını
 * yolladığını sanıp savaşı kahramansız veriyordu.
 *
 * Artık tek kaynak `HERO.seferEngeli()`. Bu dosya o kaynağın her dalını
 * kilitliyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const HERO = require('../game/kahraman');

const EV = '-8,-4';
const OTEKI = '-14,0';
const kahraman = (ek = {}) => ({
  var: true, olu: false, nerede: 'koy', usSlot: EV, misafirSlot: null, ...ek,
});

test('kendi koyunden cikabiliyor, baska koyden cikamiyor', () => {
  assert.equal(HERO.seferEngeli(kahraman(), EV), null);
  assert.equal(HERO.seferEngeli(kahraman(), OTEKI), 'baska_koyde');
});

test('TAKVIYEDEYKEN BULUNDUGU koyden cikabiliyor', () => {
  /*
    ESKİ KURALIN AÇTIĞI ÇIKMAZ: kahraman kendi başka köyüne takviyeye
    gönderilebiliyordu ama oradan sefere çıkamıyordu; tek seçenek geri
    çağırmaktı. Artık FİİLEN bulunduğu köyden yürüyor.
  */
  const k = kahraman({ nerede: 'takviye', misafirSlot: OTEKI });
  assert.equal(HERO.seferEngeli(k, OTEKI), null, 'bulunduğu köyden çıkabilmeli');
  assert.equal(HERO.seferEngeli(k, EV), 'baska_koyde', 'üssünden çıkamaz — orada değil');
  assert.equal(HERO.bulunduguSlot(k), OTEKI);
});

test('seferde, macerada ve donus yolunda cikamiyor', () => {
  for (const [nerede, beklenen] of [['sefer', 'seferde'], ['macera', 'macerada'],
    ['donuyor', 'donuyor']]) {
    assert.equal(HERO.seferEngeli(kahraman({ nerede }), EV), beklenen);
  }
});

test('olu kahraman cikamiyor', () => {
  assert.equal(HERO.seferEngeli(kahraman({ olu: true }), EV), 'olu');
});

test('konagi yoksa yuruyecek yeri de yok', () => {
  /*
    Konak yıkılınca `usSlot` null oluyor ama kahraman kaydı SİLİNMİYOR
    (bir mancınık dalgası aylarca biriken kahramanı sıfırlamasın).
    Eski istemci kuralı "usSlot doluysa karşılaştır" diyordu, yani
    null'da kutuyu açık bırakıyordu; sunucu ise almıyordu. Sessiz
    ayrışma tam buradaydı.
  */
  const k = kahraman({ usSlot: null });
  assert.equal(HERO.bulunduguSlot(k), null);
  assert.equal(HERO.seferEngeli(k, EV), 'konak_yok');
});

test('kahramani olmayan oyuncuda cokmuyor', () => {
  assert.equal(HERO.seferEngeli(null, EV), 'kahraman_yok');
  assert.equal(HERO.seferEngeli({ var: false }, EV), 'kahraman_yok');
  assert.equal(HERO.bulunduguSlot(null), null);
});

test('slot verilmezse yalnizca DURUM sorgulaniyor', () => {
  /*
    Arayüz bazen "kahraman genel olarak müsait mi" diye soruyor (hangi
    köyden yollanacağı henüz belli değilken). Slot verilmeyince köy
    karşılaştırması atlanıyor.
  */
  assert.equal(HERO.seferEngeli(kahraman(), null), null);
  assert.equal(HERO.seferEngeli(kahraman({ nerede: 'macera' }), null), 'macerada');
});

test('ozet bulundugu slotu da tasiyor', () => {
  /*
    Arayüz "kahraman Bergsund köyünde" diyebilmek için bunu görmek
    zorunda; yalnız `usSlot` gönderilirken takviyedeki kahramanın yeri
    yanlış görünüyordu.
  */
  const k = kahraman({ nerede: 'takviye', misafirSlot: OTEKI });
  const o = HERO.ozet(k, 5);
  assert.equal(o.usSlot, EV);
  assert.equal(o.misafirSlot, OTEKI);
  assert.equal(o.bulunduguSlot, OTEKI);
});
