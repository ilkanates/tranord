/**
 * SALDIRI İZLERİ — haritada "buraya vurmuştum" rozeti.
 *
 * İlkan: *"harita üzerinde saldırdığım yağmaladığım yerleri görmek
 * istiyorum, üzerinde bir kılıç vs olsun"*.
 *
 * RAPORDAN TÜRETİLEMEZ: raporlar son 25 ile sınırlı, yani yirmi beş yeni
 * rapordan sonra rozet sebepsizce kaybolurdu. Hedef başına TEK kayıt
 * tutuluyor ve saldıranın köyünde duruyor — "ben kime vurdum" benim
 * bilgim, hedefin değil.
 */
const test = require('node:test');
const assert = require('node:assert');
const ARMY = require('../game/army');
const { createVillage } = require('../game/villageState');

function sefer({ mod = 'raid', saldiran = { demirAtli: 200 }, savunan = {} } = {}) {
  const o = createVillage(0, 0);
  o.army = { ...saldiran };
  const t = createVillage(5, 5);
  t.army = { ...savunan };
  t.resources = { ...t.resources, odun: 5000, kil: 5000 };
  const m = {
    id: 1, mode: mod, units: { ...saldiran }, distance: 3,
    phase: 'outbound', legHours: 1, remainingHours: 0,
    fromKey: '0,0', fromName: 'A', toKey: '5,5', toName: 'Hedef',
  };
  ARMY.resolveArrival(m, o, t, { targetName: 'Hedef' });
  return { o, t, m };
}

test('YAĞMA ve SALDIRI iz bırakıyor', () => {
  for (const mod of ['raid', 'attack']) {
    const { o } = sefer({ mod });
    const iz = o.saldirilarim?.['5,5'];
    assert.ok(iz, `${mod}: iz bırakmalı`);
    assert.equal(iz.mode, mod);
    assert.equal(iz.toName, 'Hedef');
    assert.equal(iz.kez, 1);
    assert.ok(iz.at > 0, 'ne zaman vurduğum yazılı olmalı');
  }
});

test('KEŞİF iz bırakmıyor — o ayrı bir kayıt', () => {
  // Keşfin kendi kaydı var (origin.intel); kılıç rozeti saldırı demek.
  const { o } = sefer({ mod: 'scout', saldiran: { kuzeyIzcisi: 10 } });
  assert.equal(o.saldirilarim, undefined);
});

test('AYNI HEDEFE tekrar vurunca sayaç artıyor, kayıt tek kalıyor', () => {
  const o = createVillage(0, 0);
  const t = createVillage(5, 5);
  t.resources = { ...t.resources, odun: 9000 };
  for (let i = 0; i < 3; i++) {
    o.army = { demirAtli: 200 };
    ARMY.resolveArrival({
      id: i, mode: 'raid', units: { demirAtli: 200 }, distance: 3,
      phase: 'outbound', legHours: 1, remainingHours: 0,
      fromKey: '0,0', fromName: 'A', toKey: '5,5', toName: 'Hedef',
    }, o, t, { targetName: 'Hedef' });
  }
  assert.equal(Object.keys(o.saldirilarim).length, 1, 'hedef başına tek kayıt');
  assert.equal(o.saldirilarim['5,5'].kez, 3);
});

test('SONUÇ yazılıyor — kaybedilen hedef ayırt edilebilmeli', () => {
  /*
    Rozetin rengi buna bakıyor: kazandığın hedef kırmızı, kaybettiğin
    gri. Tek renk olsaydı rozet yalnız "buraya gitmiştim" derdi.
  */
  const kazanan = sefer({ savunan: {} });
  assert.equal(kazanan.o.saldirilarim['5,5'].winner, 'attacker');

  const kaybeden = sefer({ saldiran: { demirAtli: 5 }, savunan: { fjordvakt: 900 } });
  assert.equal(kaybeden.o.saldirilarim['5,5'].winner, 'defender');
});

test('GANİMET ve KAYIP birikiyor', () => {
  const o = createVillage(0, 0);
  const t = createVillage(5, 5);
  t.resources = { ...t.resources, odun: 9000, kil: 9000 };
  const vur = () => {
    o.army = { demirAtli: 200 };
    ARMY.resolveArrival({
      id: Math.random(), mode: 'raid', units: { demirAtli: 200 }, distance: 3,
      phase: 'outbound', legHours: 1, remainingHours: 0,
      fromKey: '0,0', fromName: 'A', toKey: '5,5', toName: 'Hedef',
    }, o, t, { targetName: 'Hedef' });
  };
  vur();
  const ilk = o.saldirilarim['5,5'].ganimet;
  vur();
  assert.ok(ilk > 0, 'boş olmayan köyden ganimet gelmeli');
  assert.ok(o.saldirilarim['5,5'].ganimet >= ilk,
    'ganimet birikmeli, üzerine yazılmamalı');
});

test('kayıt TAVANI var — en eski hedefler düşüyor', () => {
  /*
    Aktif bir oyuncu yüzlerce köye vurabiliyor; hepsini tutmak kaydı
    şişirir ve haritayı kılıç tarlasına çevirirdi.
  */
  const o = createVillage(0, 0);
  const n = ARMY.MAX_SALDIRI_IZI + 5;
  for (let i = 0; i < n; i++) {
    const t = createVillage(20 + i, 20);
    o.army = { demirAtli: 50 };
    ARMY.resolveArrival({
      id: i, mode: 'raid', units: { demirAtli: 50 }, distance: 3,
      phase: 'outbound', legHours: 1, remainingHours: 0,
      fromKey: '0,0', fromName: 'A', toKey: `t${i}`, toName: `H${i}`,
    }, o, t, { targetName: `H${i}` });
  }
  assert.equal(Object.keys(o.saldirilarim).length, ARMY.MAX_SALDIRI_IZI);
  assert.ok(!o.saldirilarim.t0, 'en eski hedef düşmüş olmalı');
  assert.ok(o.saldirilarim[`t${n - 1}`], 'en yeni hedef durmalı');
});
