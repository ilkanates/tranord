/**
 * KAHRAMAN SEFERDE — sefere iliştirilen anlık görüntü ve savaş sonucu.
 *
 * Kilitlenen kararlar:
 *
 * 1) Kahramanın GÜCÜ sefer çıkarken DONDURULUYOR. Sefer yola çıktıktan
 *    sonra skil dağıtıp saldırıyı büyütmek mümkün olmamalı.
 * 2) Savaş sonucu (XP ve hasar) BURADA hesaplanıp sefere yazılıyor,
 *    uygulanmıyor: kahraman kaydı saldıranın oturumunda ve army.js
 *    oturumu görmüyor.
 * 3) Kahramansız sefer hiçbir ek alan üretmiyor — eski raporlar bozulmaz.
 */
const test = require('node:test');
const assert = require('node:assert');
const ARMY = require('../game/army');
const HERO = require('../game/kahraman');

function koy(over = {}) {
  return {
    name: 'Test', army: {}, population: 500, marches: [],
    villageBuildings: {}, productionTiles: {}, resources: {},
    equipment: {}, reports: [], takviyeler: [], stats: {},
    ...over,
  };
}

/** Saldıran ordunun kesin kazandığı, savunanın kırıldığı bir savaş kur */
function seferKur(kahraman = null) {
  const saldiran = koy({ name: 'Saldiran' });
  const savunan = koy({ name: 'Savunan', army: { fjordvakt: 30 } });
  const march = {
    id: 1, mode: 'attack', ownerKind: 'player',
    fromKey: '0,0', fromName: 'Saldiran', toKey: '5,5', toName: 'Savunan',
    units: { demirAtli: 200 },
    distance: 3, phase: 'outbound', legHours: 1, remainingHours: 0,
    loot: null, intel: null,
    ...(kahraman ? { kahraman, kahramanUserId: 42 } : {}),
  };
  ARMY.resolveArrival(march, saldiran, savunan, { targetName: 'Savunan' });
  return { march, saldiran, savunan };
}

test('kahramansız sefer HİÇ kahraman alanı üretmiyor', () => {
  const { march, saldiran } = seferKur(null);
  assert.equal(march.kahramanSonuc, undefined);
  const rapor = saldiran.reports.find(r => r.mode === 'attack');
  assert.ok(rapor, 'saldırı raporu yazılmalı');
  assert.equal('kahraman' in rapor, false,
    'alan hiç yazılmamalı — eski raporlar bozulmasın');
});

test('kahraman iliştirildiyse savaş sonucu sefere yazılıyor', () => {
  const { march, saldiran } = seferKur({ gucu: 800, saldiriYuzde: 12 });
  assert.ok(march.kahramanSonuc, 'sonuç sefere yazılmalı');
  assert.ok(march.kahramanSonuc.xp > 0,
    'savunan kırıldıysa kahraman deneyim kazanmalı');
  assert.ok(march.kahramanSonuc.hasar >= 0);

  const rapor = saldiran.reports.find(r => r.mode === 'attack');
  assert.equal(rapor.kahraman.gucu, 800, 'raporda ham güç görünmeli');
  assert.equal(rapor.kahraman.saldiriYuzde, 12);
  assert.equal(rapor.kahraman.xp, march.kahramanSonuc.xp);
  assert.equal(rapor.kahraman.hasar, march.kahramanSonuc.hasar);
});

test('kahraman SALDIRI TOPLAMINA gerçekten giriyor', () => {
  const yok = seferKur(null);
  const var_ = seferKur({ gucu: 5000, saldiriYuzde: 0 });
  const a = yok.saldiran.reports.find(r => r.mode === 'attack');
  const b = var_.saldiran.reports.find(r => r.mode === 'attack');
  assert.ok(b.attackTotal > a.attackTotal,
    'kahramanın gücü savaşın kendisine yansımalı, yalnız rapora değil');
});

test('savunanın raporunda da kahraman görünüyor', () => {
  const { savunan } = seferKur({ gucu: 800, saldiriYuzde: 12 });
  const rapor = savunan.reports.find(r => r.dir === 'in');
  assert.ok(rapor.kahraman, 'savunan "neden bu kadar güçlüydü" sorusunu görebilmeli');
  assert.equal(rapor.kahraman.saldiranGucu, 800);
  assert.equal(rapor.kahraman.saldiranYuzde, 12);
});

test('sonuç kahramana uygulanınca seviye ve can hareket ediyor', () => {
  /*
    index.js sefer dönünce bu iki çağrıyı yapıyor. Burada aynı çağrıları
    gerçek bir savaş sonucuyla yürütüp zincirin uçtan uca tuttuğunu
    doğruluyoruz: sefer → savaş → sonuç → kahraman.
  */
  const { march } = seferKur({ gucu: 800, saldiriYuzde: 12 });
  const kah = HERO.yeniKahraman('0,0');
  kah.nerede = 'sefer';
  const oncekiCan = kah.can;

  kah.nerede = 'koy';
  HERO.xpEkle(kah, march.kahramanSonuc.xp);
  HERO.hasarVer(kah, march.kahramanSonuc.hasar);

  assert.ok(kah.xp > 0, 'deneyim kahramana işlemeli');
  assert.ok(kah.can <= oncekiCan, 'savaş kahramanı yıpratabilmeli');
  assert.equal(kah.nerede, 'koy', 'sefer bitince kahraman üssünde sayılmalı');
});
