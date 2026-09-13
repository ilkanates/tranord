/**
 * TAKVİYE — başka köye savunma askeri gönderme.
 *
 * Korunan davranışlar ve neden önemli oldukları:
 *
 * 1) Misafir asker SAVUNMAYA katılır. Katılmazsa takviye hiçbir işe yaramaz.
 * 2) Misafiri EV SAHİBİ besler (İlkan'ın kararı). Kısıt zaten tahıl olduğu
 *    için bu, takviyenin gerçek bedeli. Hesaba katılmazsa takviye bedava
 *    kalkan olur ve ambar sessizce fazla gösterir.
 * 3) Kayıp ÖNCE ev sahibinin ordusundan düşer. Tersi olsaydı "takviye çağır,
 *    kendi askerin ölmesin" sömürüsü doğardı.
 * 4) Misafir kaybı ev sahibinin NÜFUSUNDAN düşmez — o asker sahibinin
 *    köyünün nüfusunda sayılıyor. Düşülürse ev sahibi, hiç sahip olmadığı
 *    nüfusu kaybeder.
 * 5) Geri çağırma IŞINLAMAZ: yürüyüş süresi kadar yolda. Anında olsaydı
 *    takviye risksiz olurdu — saldırı gelince tek tuşla geri alınırdı.
 */
const test = require('node:test');
const assert = require('node:assert');
const ARMY = require('../game/army');
const { getConsumptionRates } = require('../game/tick');

/** Sade köy iskeleti — yalnız bu testin dokunduğu alanlar */
function koy(over = {}) {
  return {
    name: 'Test', army: {}, population: 100, marches: [],
    villageBuildings: {}, productionTiles: {}, resources: {},
    equipment: {}, reports: [], takviyeler: [],
    ...over,
  };
}

test('savunanBirlikler: kendi ordusu ile misafirleri birleştiriyor', () => {
  const v = koy({
    army: { fjordvakt: 10, spydvakt: 5 },
    takviyeler: [
      { id: 1, userId: 7, slotKey: '1,1', units: { fjordvakt: 3 } },
      { id: 2, userId: 9, slotKey: '2,2', units: { spydvakt: 4, isbjorn: 2 } },
    ],
  });
  assert.deepEqual(ARMY.savunanBirlikler(v),
    { fjordvakt: 13, spydvakt: 9, isbjorn: 2 });
  assert.deepEqual(ARMY.takviyeBirlikleri(v),
    { fjordvakt: 3, spydvakt: 4, isbjorn: 2 }, 'yalnız misafirler');
});

test('boş köyde savunanBirlikler kendi ordusunu bozmuyor', () => {
  const v = koy({ army: { fjordvakt: 4 } });
  const out = ARMY.savunanBirlikler(v);
  out.fjordvakt = 999;                       // dönen nesne kopya olmalı
  assert.equal(v.army.fjordvakt, 4, 'kaynak ordu değişmemeli');
});

test('EV SAHİBİ besler: misafir asker tüketime giriyor, nüfusa girmiyor', () => {
  const yalniz = koy({ army: { fjordvakt: 10 }, population: 100 });
  const misafirli = koy({
    army: { fjordvakt: 10 }, population: 100,
    takviyeler: [{ id: 1, userId: 7, slotKey: '1,1', units: { fjordvakt: 10 } }],
  });

  const a = getConsumptionRates(yalniz);
  const b = getConsumptionRates(misafirli);

  assert.equal(a.soldiers, 10);
  assert.equal(b.soldiers, 20, 'misafir asker yemeğe dahil');
  assert.ok(b.foodPerHour > a.foodPerHour, 'takviye ambara maliyet bindirmeli');

  // Sivil sayısı DEĞİŞMEMELİ: misafir bu köyün nüfusunda değil
  assert.equal(a.villagers, b.villagers,
    'misafir sivil hesabından düşülmemeli — o nüfus sahibinin köyünde');
});

test('kayıp önce EV SAHİBİNDEN, artanı misafirlerden', () => {
  const v = koy({
    army: { fjordvakt: 5 }, population: 100,
    takviyeler: [
      { id: 1, userId: 7, slotKey: '1,1', units: { fjordvakt: 4 } },
      { id: 2, userId: 9, slotKey: '2,2', units: { fjordvakt: 6 } },
    ],
  });

  const pay = ARMY.savunmaKayiplariniPayEt(v, { fjordvakt: 12 });

  assert.equal(v.army.fjordvakt, undefined, 'ev sahibinin 5 askeri de ölmeli');
  assert.equal(pay.evSahibiOlu, 5);
  assert.equal(v.population, 95, 'yalnız kendi ölüsü nüfustan düşer');

  // Kalan 7 misafirlere: ilk girdi 4, ikinciden 3
  assert.equal(pay.misafirKayip.length, 2);
  assert.equal(pay.misafirKayip[0].userId, 7);
  assert.equal(pay.misafirKayip[0].olu, 4);
  assert.equal(pay.misafirKayip[1].userId, 9);
  assert.equal(pay.misafirKayip[1].olu, 3);

  // Tamamen eriyen girdi listeden düşer, kısmen erien kalır
  assert.equal(v.takviyeler.length, 1);
  assert.equal(v.takviyeler[0].units.fjordvakt, 3);
});

test('misafir kaybı ev sahibinin nüfusunu DÜŞÜRMÜYOR', () => {
  const v = koy({
    army: {}, population: 50,
    takviyeler: [{ id: 1, userId: 7, slotKey: '1,1', units: { fjordvakt: 8 } }],
  });
  ARMY.savunmaKayiplariniPayEt(v, { fjordvakt: 8 });
  assert.equal(v.population, 50,
    'ev sahibi hiç sahip olmadığı nüfusu kaybetmemeli');
  assert.equal(v.takviyeler.length, 0, 'eriyen girdi silinmeli');
});

test('createMarch: takviye saldırı gücü aramaz, savunma gücü arar', () => {
  const v = koy({ army: { kuzeyIzcisi: 5 } });
  const res = ARMY.createMarch(v, {
    mode: 'takviye', units: { kuzeyIzcisi: 5 }, distance: 3,
    fromKey: '0,0', fromName: 'A', toKey: '1,1', toName: 'B', toKind: 'player',
  });
  assert.equal(res.ok, true, 'izcinin saldırısı düşük ama savunması var');
  assert.equal(v.army.kuzeyIzcisi, undefined, 'asker köyden çıkmalı');

  const v2 = koy({ army: { gocmen: 3 } });
  const res2 = ARMY.createMarch(v2, {
    mode: 'takviye', units: { gocmen: 3 }, distance: 3,
    fromKey: '0,0', fromName: 'A', toKey: '1,1', toName: 'B', toKind: 'player',
  });
  assert.equal(res2.ok, false, 'savunması 0 olan göçmen takviye olamaz');
  assert.equal(res2.reason, 'savunma_gucu_yok');
});

test('varışta misafir listeye giriyor, sefer bitiyor, iki tarafa rapor', () => {
  const gonderen = koy({ name: 'Gönderen' });
  const hedef = koy({ name: 'Hedef' });
  const march = {
    id: 1, mode: 'takviye', fromKey: '0,0', fromName: 'Gönderen',
    toKey: '1,1', toName: 'Hedef', units: { fjordvakt: 6 },
    phase: 'outbound', remainingHours: 0, legHours: 1,
  };

  ARMY.resolveArrival(march, gonderen, hedef, { ownerUserId: 42 });

  assert.equal(march.bitti, true, 'dönüş ayağı olmamalı');
  assert.equal(hedef.takviyeler.length, 1);
  assert.equal(hedef.takviyeler[0].userId, 42);
  assert.equal(hedef.takviyeler[0].units.fjordvakt, 6);
  assert.equal(hedef.takviyeler[0].slotKey, '0,0', 'geri dönüş adresi');

  assert.equal(gonderen.reports[0].outcome, 'takviye_vardi');
  assert.equal(gonderen.reports[0].dir, 'out');
  assert.equal(hedef.reports[0].dir, 'in', 'ev sahibi de haberdar olmalı');
});

test('KISMÎ geri çağırma: istenen kadarı döner, kalanı orada savunur', () => {
  const host = { takviyeler: [
    { id: 1, userId: 7, slotKey: '0,0', fromName: 'Benim', units: { fjordvakt: 10 }, at: 1 },
    { id: 2, userId: 7, slotKey: '0,0', fromName: 'Benim', units: { fjordvakt: 6, spydvakt: 4 }, at: 2 },
  ] };
  const benim = { name: 'Benim', marches: [], nextMarchId: 1 };

  const r = ARMY.takviyeGeriCagir(host, benim,
    { userId: 7, slotKey: '0,0', units: { fjordvakt: 12 } }, 3);
  assert.equal(r.ok, true);
  assert.deepEqual(r.march.units, { fjordvakt: 12 }, 'yalnız istenen kadar dönmeli');

  /*
    ESKİDEN YENİYE tüketiliyor: ilk girdi (10) tamamen, ikinciden 2 asker.
    Sıra önemli — savunma kayıpları da geliş sırasına göre pay ediliyor.
  */
  assert.equal(host.takviyeler.length, 1, 'boşalan girdi listeden düşmeli');
  assert.deepEqual(host.takviyeler[0].units, { fjordvakt: 4, spydvakt: 4 });
});

test('kısmî çağrıda olmayan birim istenirse yalnız var olan çekilir', () => {
  const host = { takviyeler: [
    { id: 1, userId: 7, slotKey: '0,0', fromName: 'B', units: { fjordvakt: 3 }, at: 1 },
  ] };
  const benim = { name: 'B', marches: [], nextMarchId: 1 };
  const r = ARMY.takviyeGeriCagir(host, benim,
    { userId: 7, slotKey: '0,0', units: { fjordvakt: 99, jernridder: 5 } }, 2);
  assert.equal(r.ok, true);
  assert.deepEqual(r.march.units, { fjordvakt: 3 });
  assert.equal(host.takviyeler.length, 0);
});

test('BAŞKASININ takviyesi çekilemiyor', () => {
  const host = { takviyeler: [
    { id: 1, userId: 9, slotKey: '5,5', fromName: 'Yabanci', units: { fjordvakt: 5 }, at: 1 },
  ] };
  const benim = { name: 'B', marches: [], nextMarchId: 1 };
  const r = ARMY.takviyeGeriCagir(host, benim, { userId: 7, slotKey: '0,0' }, 2);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'takviye_yok');
  assert.equal(host.takviyeler.length, 1, 'yabancının askeri yerinde kalmalı');
});

test('AYNI hedefe iki köyden gönderilen asker karışmıyor', () => {
  const host = { takviyeler: [
    { id: 1, userId: 7, slotKey: '0,0', fromName: 'Koy A', units: { fjordvakt: 5 }, at: 1 },
    { id: 2, userId: 7, slotKey: '4,4', fromName: 'Koy B', units: { spydvakt: 7 }, at: 2 },
  ] };
  const koyA = { name: 'Koy A', marches: [], nextMarchId: 1 };
  const r = ARMY.takviyeGeriCagir(host, koyA, { userId: 7, slotKey: '0,0' }, 2);
  assert.equal(r.ok, true);
  assert.deepEqual(r.march.units, { fjordvakt: 5 }, 'yalnız A köyünün askeri dönmeli');
  assert.equal(host.takviyeler.length, 1);
  assert.equal(host.takviyeler[0].slotKey, '4,4', 'B köyünün askeri orada kalmalı');
});

test('geri çağırma: girdi silinir, dönüş seferi YOLA çıkar (ışınlanmaz)', () => {
  const host = koy({
    name: 'Ev sahibi',
    takviyeler: [{
      id: 3, userId: 42, slotKey: '0,0', fromName: 'Gönderen',
      units: { fjordvakt: 6 }, at: Date.now(),
    }],
  });
  const sahip = koy({ name: 'Gönderen', army: {} });

  // Miktar verilmezse HEPSİ çekilir (eski davranış korunuyor)
  const res = ARMY.takviyeGeriCagir(host, sahip, { userId: 42, slotKey: '0,0' }, 5);

  assert.equal(res.ok, true);
  assert.equal(host.takviyeler.length, 0, 'misafir artık orada savunmuyor');
  assert.equal(sahip.army.fjordvakt, undefined,
    'asker HEMEN orduya dönmemeli — yolda');
  assert.equal(sahip.marches.length, 1);
  assert.equal(sahip.marches[0].phase, 'return');
  assert.ok(sahip.marches[0].remainingHours > 0, 'yürüyüş süresi olmalı');

  // Dönüş çözülünce orduya katılır
  ARMY.resolveReturn(sahip.marches[0], sahip);
  assert.equal(sahip.army.fjordvakt, 6);
});

test('geri çağırma: olmayan takviye reddedilir', () => {
  const host = koy({ takviyeler: [] });
  const sahip = koy();
  assert.equal(
    ARMY.takviyeGeriCagir(host, sahip, { userId: 42, slotKey: '0,0' }, 5).reason,
    'takviye_yok');
});
