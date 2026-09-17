/**
 * KAHRAMANIN GANİMET PAYI.
 *
 * Kahraman sefere katılıyor, savaşıyor, yara alıyor — ama ganimet
 * hesabında hiç yoktu: tek bir odun taşımıyordu.
 *
 * Kilitlenen kararlar:
 *
 * 1) SAYI UYDURULMADI, BİRİM TANIMLARINDAN TÜRETİLDİ. Hızda İlkan'ın
 *    kuralı "kahramana at verince normal birimler attan ne bonus
 *    alıyorsa alsın"dı; taşıma da aynı cümlenin devamı. Sabit yazsaydık
 *    birim kapasiteleri dengelenirken kahraman sessizce ayrışırdı.
 * 2) ORDUYA EKLENİYOR, yerine geçmiyor.
 * 3) SEVİYEYLE BÜYÜMÜYOR — hız da büyümüyor. Seviyeye bağlasaydık
 *    ganimet, savaş gücünün yanında ikinci bir seviye ödülü olurdu.
 * 4) BAYILAN KAHRAMAN TAŞIMIYOR: canı biten kahraman eve ışınlanıyor,
 *    yükü omzunda götürmesi tuhaf olurdu.
 */
const test = require('node:test');
const assert = require('node:assert');
const H = require('../game/kahraman');
const A = require('../game/army');
const { UNIT_DEFS } = require('../data');

const yaya = { var: true, kusanilan: {} };
const atli = { var: true, kusanilan: { at: { key: 'koyBeygiri', nadirlik: 'siradan' } } };

test('taşıma birim tanımlarından türetiliyor, sabit değil', () => {
  const ort = (tur) => {
    const k = Object.values(UNIT_DEFS)
      .filter(d => d.category === tur && d.stats?.kapasite > 0)
      .map(d => d.stats.kapasite);
    return Math.round(k.reduce((a, b) => a + b, 0) / k.length);
  };
  assert.equal(H.TASIMA_TABAN.yaya, ort('piyade'),
    'yaya kahraman ortalama bir piyade kadar taşımalı');
  assert.equal(H.TASIMA_TABAN.atli, ort('suvari'),
    'atlı kahraman ortalama bir süvari kadar taşımalı');
});

test('at taşımayı büyütüyor, kahraman yoksa sıfır', () => {
  assert.equal(H.tasimaKapasitesi(null), 0);
  assert.equal(H.tasimaKapasitesi({ var: false }), 0);
  assert.equal(H.tasimaKapasitesi(yaya), H.TASIMA_TABAN.yaya);
  assert.equal(H.tasimaKapasitesi(atli), H.TASIMA_TABAN.atli);
  assert.ok(H.tasimaKapasitesi(atli) > H.tasimaKapasitesi(yaya));
});

test('seviye taşımayı değiştirmiyor — hızda da değiştirmiyor', () => {
  const dusuk = { ...yaya, xp: 0 };
  const yuksek = { ...yaya, xp: 500000 };
  assert.ok(H.xpSeviyesi(yuksek.xp) > H.xpSeviyesi(dusuk.xp), 'test kurulumu');
  assert.equal(H.tasimaKapasitesi(yuksek), H.tasimaKapasitesi(dusuk));
});

/**
 * UÇTAN UCA: kapasite gerçekten ganimete dönüşüyor mu?
 *
 * Kural doğru olabilir ama çağrılmıyorsa hiçbir şey ifade etmez — bu
 * depodaki hataların çoğu tam da orada yaşıyordu.
 */
test('kahraman ordunun taşımasına EKLENİYOR', () => {
  const { createVillage } = require('../game/villageState');

  const kur = (kahraman) => {
    const saldiran = createVillage(0, 0);
    const hedef = createVillage(4, 4);
    hedef.army = {};                       // savaş olmasın, ganimet net ölçülsün
    for (const r of A.LOOTABLE) hedef.resources[r] = 100000;
    const m = {
      id: 1, mode: 'attack', units: { fjordvakt: 1 }, distance: 3,
      phase: 'outbound', legHours: 1, remainingHours: 0,
      fromKey: '0,0', fromName: 'A', toKey: '4,4', toName: 'B',
      ...(kahraman ? { kahraman } : {}),
    };
    saldiran.army = {};
    A.resolveArrival(m, saldiran, hedef, { targetName: 'B' });
    return Object.values(m.loot || {}).reduce((a, b) => a + b, 0);
  };

  const kahramansiz = kur(null);
  const birimKapasitesi = UNIT_DEFS.fjordvakt.stats.kapasite;
  assert.equal(kahramansiz, birimKapasitesi, 'kahramansız ganimet birimin kapasitesi kadar');

  const tasima = H.TASIMA_TABAN.atli;
  const kahramanli = kur({ gucu: 0, canTavani: 1000, can: 1000, tasima, suvari: true });
  assert.equal(kahramanli, birimKapasitesi + tasima,
    'kahramanın payı orduya EKLENMELİ');
});

test('bayılan kahraman yük taşımıyor', () => {
  const { createVillage } = require('../game/villageState');

  const saldiran = createVillage(0, 0);
  const hedef = createVillage(4, 4);
  /* Savunanda ordu VAR: kahraman hasar alsın ve canı bitsin */
  hedef.army = { fjordvakt: 200 };
  saldiran.army = {};
  for (const r of A.LOOTABLE) hedef.resources[r] = 100000;

  const m = {
    id: 2, mode: 'attack', units: { fjordvakt: 1 }, distance: 3,
    phase: 'outbound', legHours: 1, remainingHours: 0,
    fromKey: '0,0', fromName: 'A', toKey: '4,4', toName: 'B',
    /* Canı 1: bu savaşta kesin bayılır */
    kahraman: { gucu: 0, canTavani: 1000, can: 1, tasima: 500, suvari: true },
  };
  A.resolveArrival(m, saldiran, hedef, { targetName: 'B' });

  assert.ok((m.kahramanSonuc?.hasar || 0) > 0, 'test kurulumu: kahraman yara almalı');
  const ganimet = Object.values(m.loot || {}).reduce((a, b) => a + b, 0);
  assert.equal(ganimet, 0,
    'ordu yok olmuş ve kahraman bayılmışken ganimet çıkmamalı');
});
