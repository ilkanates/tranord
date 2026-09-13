/**
 * PAYLOAD'DAKİ KUŞATMA ALANLARI.
 *
 * İkisi de arayüzün GÖRÜNÜRLÜK kararını veriyor:
 *   marchInfo.atolyeSeviye  → mancınığın ikinci hedef kutusu açılır mı
 *   kusatmaHavuz            → sağ raydaki "Kuşatma" bloğu çizilir mi
 *
 * Alan adı sessizce değişirse ekranda hiçbir hata görünmez: kutu ve blok
 * yalnızca ÇIKMAZ. Bu test onu yakalıyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const { buildPayload } = require('../game/payload');
const { createVillage } = require('../game/villageState');

function koy(atolyeSeviye, ekipman = {}) {
  const v = createVillage();
  v.villageBuildings['2,-1'] = { type: 'atolye', level: atolyeSeviye, workers: 0 };
  v.equipment = { ...(v.equipment || {}), ...ekipman };
  return v;
}

test('marchInfo atölye seviyesini ve ikinci hedef eşiğini taşıyor', () => {
  const p = buildPayload(koy(10), 1000, { statics: true });
  assert.equal(p.marchInfo.atolyeSeviye, 10);
  assert.equal(p.marchInfo.ikiHedefMinAtolye, 10);
  assert.ok(p.marchInfo.geriCagirmaSaniye > 0);
});

test('kuşatma havuzu: kapasite atölye seviyesinden, doluluk iki makineden', () => {
  const p = buildPayload(koy(4, { koc_basi: 3, mancinik: 2 }), 1000, { statics: true });
  assert.equal(p.kusatmaHavuz.capacity, 20, 'atölye Lvl 4 × 5');
  assert.equal(p.kusatmaHavuz.used, 5, 'koç başı + mancınık ORTAK sayılır');
  assert.equal(p.kusatmaHavuz.free, 15);
  assert.equal(p.equipmentCaps.koc_basi, 20);
  assert.equal(p.equipmentCaps.mancinik, 20);
});

test('atölye yoksa kuşatma kapasitesi 0 — ray bloğu hiç çizilmez', () => {
  const v = createVillage();
  const p = buildPayload(v, 1000, { statics: true });
  assert.equal(p.kusatmaHavuz.capacity, 0);
  assert.equal(p.marchInfo.atolyeSeviye, 0);
});

test('seferin geri çağırma sayacı payload\'da', () => {
  const v = koy(1);
  v.marches = [{
    id: 1, mode: 'attack', phase: 'outbound', toKey: '3,0', toName: 'X',
    units: { fjordvakt: 5 }, distance: 3, legHours: 2, remainingHours: 2,
    legSeconds: 100, departAt: Date.now(), loot: null,
  }];
  const p = buildPayload(v, 1000, { statics: true });
  assert.ok(p.marches[0].geriCagirTimeLeft > 85,
    'yeni sefer ~90 saniyelik pencereyle gelmeli');
});
