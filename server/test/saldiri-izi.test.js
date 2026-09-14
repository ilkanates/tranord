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

/**
 * GERİ DOLDURMA — sürüm öncesi saldırılar da haritada görünsün.
 *
 * İz kaydı yeni; bu sürümden önce vurulan köylerde hiç kayıt yok ve
 * harita boş görünüyor. Oyuncu için bu "özellik çalışmıyor" demek
 * (İlkan bildirdi). Raporlar diskte duruyor ve saldıranın kendi raporu
 * hedefin anahtarını taşıyor.
 */
test('eski saldırılar RAPORLARDAN geri dolduruluyor', () => {
  const v = createVillage(0, 0);
  v.reports = [
    { dir: 'out', mode: 'raid', toKey: '5,5', toName: 'Hedef', winner: 'attacker',
      at: 200, loot: { odun: 100, kil: 50 }, attackerDead: 3 },
    { dir: 'out', mode: 'raid', toKey: '5,5', toName: 'Hedef', winner: 'defender',
      at: 100, loot: {}, attackerDead: 40 },
    { dir: 'in', mode: 'attack', fromKey: '9,9', at: 150 },
    { dir: 'out', mode: 'scout', toKey: '7,7', at: 120 },
  ];
  assert.equal(ARMY.saldiriIzleriniGeriDoldur(v), true);

  const iz = v.saldirilarim['5,5'];
  assert.equal(iz.kez, 2, 'aynı hedefe iki sefer tek kayıtta birleşmeli');
  assert.equal(iz.ganimet, 150, 'ganimet toplanmalı');
  assert.equal(iz.kayip, 43);
  /*
    Raporlar yeniden eskiye sıralı; sonuç EN YENİ seferden alınıyor —
    rozetin rengi "en son ne oldu" demeli.
  */
  assert.equal(iz.winner, 'attacker');
  assert.equal(iz.at, 200);

  assert.equal(v.saldirilarim['9,9'], undefined, 'gelen saldırı benim izim değil');
  assert.equal(v.saldirilarim['7,7'], undefined, 'keşif kılıç rozeti almamalı');
});

test('geri doldurma BİR KEZ çalışıyor ve mevcut kaydı EZMİYOR', () => {
  /*
    Gerçek saldırıdan gelen kayıt rapordan türetilenden doğru: ganimet
    ve kayıp orada birikmiş. Bayrak ayrı tutuluyor çünkü kayıt, sürüm
    çıktıktan sonraki ilk saldırıda zaten oluşuyor — varlığına baksaydık
    o tek saldırıdan öncesi sonsuza dek geri doldurulamazdı.
  */
  const v = createVillage(0, 0);
  v.saldirilarim = {
    '5,5': { at: 900, mode: 'raid', toName: 'Yeni', winner: 'attacker',
      kez: 1, ganimet: 500, kayip: 0 },
  };
  v.reports = [
    { dir: 'out', mode: 'raid', toKey: '5,5', toName: 'Eskisi', winner: 'defender',
      at: 100, loot: {}, attackerDead: 9 },
    { dir: 'out', mode: 'attack', toKey: '8,8', toName: 'Eski', winner: 'attacker',
      at: 80, loot: { odun: 20 }, attackerDead: 2 },
  ];
  assert.equal(ARMY.saldiriIzleriniGeriDoldur(v), true);
  assert.equal(v.saldirilarim['5,5'].ganimet, 500, 'mevcut kayıt korunmalı');
  assert.equal(v.saldirilarim['5,5'].winner, 'attacker');
  assert.ok(v.saldirilarim['8,8'], 'raporda olup kayıtta olmayan hedef eklenmeli');

  assert.equal(ARMY.saldiriIzleriniGeriDoldur(v), false, 'ikinci çağrı iş yapmamalı');
});
