/**
 * KAHRAMANIN ÜSSÜ — TRAVIAN MODELİ.
 *
 * İlkan: *"kahramanın köyünü nasıl değiştireceğim… Travian gibi olsun."*
 *
 * ESKİ MODELDE üs, Kahraman Konağı'nın olduğu köydü ve HER TİKTE oradan
 * yeniden yazılıyordu; kahraman başka köyüne gitse bile üssü konakta
 * kalıyor, taşınmanın hiçbir yolu olmuyordu.
 *
 * YENİ MODELDE üs, kahramanın YAŞADIĞI köy. Bu dosya modelin
 * değişmeyen tarafını — "kahraman nerede" sorusunun tek cevabını —
 * kilitliyor; taşınmanın kendisi sunucu tarafında (takviye varışı).
 */
const test = require('node:test');
const assert = require('node:assert');
const HERO = require('../game/kahraman');

const EV = '-8,-4';
const OTEKI = '-14,0';
const kah = (ek = {}) => ({
  var: true, olu: false, nerede: 'koy', usSlot: EV, misafirSlot: null, ...ek,
});

test('kendi koyune tasinan kahramanin ussu orasi olur', () => {
  /*
    Taşınma sunucuda takviye VARIŞINDA yapılıyor: kendi köyüme giden
    kahraman misafir kalmıyor, orası üssü oluyor. Burada sonucun
    şeklini kilitliyoruz — üs değişince "nerede" de 'koy' olmalı,
    yoksa kahraman kendi köyünde misafir görünürdü.
  */
  const k = kah({ usSlot: OTEKI, nerede: 'koy', misafirSlot: null });
  assert.equal(HERO.bulunduguSlot(k), OTEKI);
  assert.equal(HERO.seferEngeli(k, OTEKI), null, 'yeni üssünden sefere çıkabilmeli');
  assert.equal(HERO.seferEngeli(k, EV), 'baska_koyde', 'eski üssünden çıkamaz');
});

test('BASKASININ koyunde misafir kalir, orasi us olmaz', () => {
  /*
    Üs saysaydık kahraman başkasının toprağında yaşıyor olurdu ve ev
    sahibi onu istemediğinde gidecek yeri kalmazdı.
  */
  const k = kah({ nerede: 'takviye', misafirSlot: '3,3' });
  assert.equal(k.usSlot, EV, 'üs değişmemeli');
  assert.equal(HERO.bulunduguSlot(k), '3,3', 'ama fiilen orada');
});

test('us artik konaga bagli degil: konaksiz koyde de bir yeri var', () => {
  /*
    Eski modelde konak yıkılınca `usSlot` null oluyor ve kahraman
    "yürüyecek yeri yok" durumuna düşüyordu. Artık üs kahramanın
    yaşadığı köy; konak yalnız iyileşme ve diriliş için.
  */
  const k = kah();
  assert.equal(HERO.bulunduguSlot(k), EV);
  assert.equal(HERO.seferEngeli(k, EV), null);
});

test('iyilesme konak seviyesiyle buyur, konaksiz da durmaz', () => {
  /*
    Konaksız köyde kahraman yine iyileşiyor ama yalnız TABAN hızıyla —
    konağa yatırım yapmanın karşılığı bu. Sıfır olsaydı konaksız köye
    taşınmak kahramanı kalıcı olarak sakat bırakırdı.
  */
  const konaksiz = HERO.iyilesmeHizi(0, 0);
  const konakli = HERO.iyilesmeHizi(10, 0);
  assert.ok(konaksiz > 0, 'konaksız köyde de iyileşme sürmeli');
  assert.ok(konakli > konaksiz, 'konak iyileşmeyi hızlandırmalı');
});

test('ozet bulundugu slotu tasiyor — arayuz hangi koy oldugunu yazabilsin', () => {
  const k = kah({ nerede: 'takviye', misafirSlot: '3,3' });
  const o = HERO.ozet(k, 5);
  assert.equal(o.usSlot, EV);
  assert.equal(o.misafirSlot, '3,3');
  assert.equal(o.bulunduguSlot, '3,3');
});
