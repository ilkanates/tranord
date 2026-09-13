/**
 * YİYECEK ÖNGÖRÜSÜ — "ne zaman aç kalacağım ve NEDEN?"
 *
 * Ölçüm (bu testin varlık sebebi): yeni bir köy hiçbir şey yapılmazsa
 * 36 oyun saatinde açlığa giriyor, 45. saatte ilk köylüsünü kaybediyor.
 * Arayüz o ana kadar hiçbir şey söylemiyordu. Uyarının doğru zamanı ve
 * doğru SEBEBİ vermesi burada kilitli.
 */
const test = require('node:test');
const assert = require('node:assert');
const TICK = require('../game/tick');
const { createVillage } = require('../game/villageState');

/** Köye tahıl işçisi ata — ilk tahıl tarlasını kullanır */
function tahilIsciAta(v, adet) {
  for (const t of Object.values(v.productionTiles || {})) {
    if (t.type === 'tahil') { t.level = Math.max(1, t.level || 1); t.workers = adet; return t; }
  }
  throw new Error('tahıl tarlası yok');
}
function binaKur(v, slot, tip, isci) {
  v.villageBuildings[slot] = { type: tip, level: 1, workers: isci };
}

test('yeni köy: akış eksi, sebep tahıl işçisi, stok saati sonlu', () => {
  const v = createVillage(0, 0);
  const o = TICK.getFoodOutlook(v);
  assert.ok(o.netSaat < 0, 'yeni köyde akış eksi olmalı');
  assert.equal(o.sebep, 'tahilIsci', 'kimse tarlada çalışmıyor');
  assert.equal(o.uretim, 0);
  assert.ok(o.stokSaat > 0 && o.stokSaat < 100,
    `stok saati makul olmalı, ${o.stokSaat} geldi`);
  assert.equal(o.aclik, false, 'daha açlık BAŞLAMAMIŞ olmalı');
});

test('sebep zincirin akış yönünde: tahıl → değirmen → fırın', () => {
  const v = createVillage(0, 0);
  tahilIsciAta(v, 6);
  assert.equal(TICK.getFoodOutlook(v).sebep, 'degirmen',
    'tarla dolu ama değirmen yok');

  binaKur(v, '1,0', 'degirmen', 1);
  assert.equal(TICK.getFoodOutlook(v).sebep, 'firin',
    'değirmen çalışıyor ama fırın yok');

  binaKur(v, '1,-1', 'firin', 1);
  const o = TICK.getFoodOutlook(v);
  assert.ok(o.uretim > 0, 'zincir tamamlanınca ekmek çıkmalı');
});

test('zincir tam kadroluyken akış ARTIYA dönüyor — uyarı kaybolur', () => {
  const v = createVillage(0, 0);
  tahilIsciAta(v, 18);
  binaKur(v, '1,0', 'degirmen', 1);
  binaKur(v, '1,-1', 'firin', 1);
  const o = TICK.getFoodOutlook(v);
  assert.ok(o.netSaat > 0, `akış artı olmalı, ${o.netSaat} geldi`);
  assert.equal(o.stokSaat, null, 'tükenmiyorsa stok saati verilmemeli');
  assert.equal(o.sebep, null, 'sorun yoksa sebep de olmamalı');
});

test('ordu büyüyünce sebep ORDU olur — zincir çalışsa bile', () => {
  const v = createVillage(0, 0);
  tahilIsciAta(v, 18);
  binaKur(v, '1,0', 'degirmen', 1);
  binaKur(v, '1,-1', 'firin', 1);
  v.army = { fjordvakt: 400 };            // asker köylünün İKİ KATI yer
  const o = TICK.getFoodOutlook(v);
  assert.ok(o.netSaat < 0, 'büyük ordu akışı eksiye çevirmeli');
  assert.equal(o.sebep, 'ordu');
});

test('öngörü GERÇEK tüketimle tutuyor (takviye ve at dahil)', () => {
  const v = createVillage(0, 0);
  v.army = { fjordvakt: 10 };
  v.takviyeler = [{ id: 1, userId: 7, slotKey: '3,0', units: { fjordvakt: 20 }, at: Date.now() }];
  const o = TICK.getFoodOutlook(v);
  const c = TICK.getConsumptionRates(v);
  assert.equal(o.tuketim, c.foodPerHour,
    'öngörünün tüketimi getConsumptionRates ile aynı olmalı');
  assert.equal(c.soldiers, 30, 'misafir asker de ev sahibinin ekmeğini yiyor');
});

test('açlık başlayınca bayrak dönüyor', () => {
  const v = createVillage(0, 0);
  v.resources.ekmek = 0; v.resources.un = 0; v.resources.tahil = 0;
  TICK.processTick(v, 1);
  assert.equal(TICK.getFoodOutlook(v).aclik, true);
});
