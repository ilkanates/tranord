/**
 * SIĞINAK — yağmadan kaçırılan hammadde.
 *
 * Binanın tek işi var ve o iş TEK CÜMLEDE yazılı (game/siginak.js);
 * burada o cümlenin gerçekten uygulandığı sınanıyor: yağma hesabı,
 * baskın payı ve keşif raporu.
 *
 * Kilitlenen kararlar:
 *
 * 1) Sığınak yoksa hiçbir şey değişmiyor — bina bir OPSİYON, yağmanın
 *    varsayılanı değil.
 * 2) HER kaynaktan ayrı ayrı gizleniyor. Tek havuz olsaydı yalnız
 *    tahılı yağmalanan oyuncu korumasının tamamını orada harcar, geri
 *    döndüğünde bina yapacak keresteyi bulamazdı.
 * 3) İşlenmiş mallar da korunuyor: yalnız ham korunsaydı saldırgan
 *    değerli yarıyı tam olarak sıyırırdı.
 * 4) Gizlenen miktar STOKTAN BÜYÜKSE kaynak eksiye düşmüyor, sadece
 *    tamamen gizleniyor.
 * 5) SIRA: önce gizleme, sonra baskın payı. Tersi olsaydı sığınak
 *    baskında yarı yarıya korurdu — oyuncuya öyle söylemedik.
 * 6) Keşif raporu gizleneni GÖSTERMİYOR; göstersaydi saldırgan keşif
 *    ile yağmayı karşılaştırıp sığınağın seviyesini çıkarırdı.
 */
const test = require('node:test');
const assert = require('node:assert');
const A = require('../game/army');
const S = require('../game/siginak');
const { VILLAGE_DEFS } = require('../data/villageDefs');

const DEF = VILLAGE_DEFS.siginak;

function koy(seviye, stok = 1000) {
  const resources = {};
  for (const r of A.LOOTABLE) resources[r] = stok;
  const villageBuildings = {};
  if (seviye > 0) villageBuildings['1,0'] = { type: 'siginak', level: seviye };
  return { resources, villageBuildings, productionTiles: {} };
}

test('sığınak tanımı depolarla aynı dili konuşuyor', () => {
  assert.ok(DEF, 'siginak tanımı yok');
  assert.equal(DEF.unique, true, 'sığınak tekil olmalı');
  assert.ok(!DEF.repeatableWhenMaxed,
    'ikinci sığınak kurulabilirse yağma tamamen ölür');
  assert.ok(DEF.baseCapacity > 0 && DEF.capacityPerLevel > 0);
});

test('sığınak yoksa yağma hiç değişmiyor', () => {
  const v = koy(0, 500);
  const loot = A.takeLoot(v, 100000, 'attack');
  const toplam = Object.values(loot).reduce((a, b) => a + b, 0);
  assert.equal(toplam, 500 * A.LOOTABLE.length, 'bina yokken stok tam gitmeli');
  for (const r of A.LOOTABLE) assert.equal(v.resources[r], 0);
});

test('her kaynaktan AYRI AYRI gizleniyor — işlenmişler dahil', () => {
  const v = koy(1, 1000);
  const gizli = S.gizlenen(v, VILLAGE_DEFS);
  assert.equal(gizli, DEF.baseCapacity);

  A.takeLoot(v, 1e9, 'attack');              // sınırsız kapasiteyle süpür
  for (const r of A.LOOTABLE) {
    assert.equal(v.resources[r], gizli,
      `${r}: gizlenen miktar köyde kalmalıydı`);
  }
  /* Ham ve işlenmiş AYNI tabanı alıyor — biri ayrıcalıklı değil */
  assert.equal(v.resources.odun, v.resources.kereste);
  assert.equal(v.resources.tahil, v.resources.ekmek);
});

test('seviye arttıkça daha çok gizleniyor', () => {
  const bir = S.gizlenen(koy(1), VILLAGE_DEFS);
  const on = S.gizlenen(koy(10), VILLAGE_DEFS);
  const yirmi = S.gizlenen(koy(20), VILLAGE_DEFS);
  assert.equal(bir, DEF.baseCapacity);
  assert.equal(on, DEF.baseCapacity + 9 * DEF.capacityPerLevel);
  assert.equal(yirmi, DEF.baseCapacity + 19 * DEF.capacityPerLevel);
  assert.ok(yirmi > on && on > bir);
});

test('stok gizlenenden azsa hiç yağmalanamıyor, eksiye de düşmüyor', () => {
  const gizli = S.gizlenen(koy(1), VILLAGE_DEFS);
  const v = koy(1, Math.floor(gizli / 2));
  const loot = A.takeLoot(v, 1e9, 'attack');
  assert.deepEqual(loot, {}, 'tamamı gizliyken ganimet çıkmamalı');
  for (const r of A.LOOTABLE) {
    assert.equal(v.resources[r], Math.floor(gizli / 2), `${r} eksiye düştü ya da azaldı`);
  }
});

test('baskında ÖNCE gizleniyor, sonra pay alınıyor', () => {
  const stok = 1000;
  const v = koy(1, stok);
  const gizli = S.gizlenen(v, VILLAGE_DEFS);
  A.takeLoot(v, 1e9, 'raid');

  /*
    Doğru sıra: (stok − gizli) × pay alınır, gerisi kalır.
    Ters sırada (stok × pay − gizli) kalırdı ve sığınak baskında
    olduğundan az koruyor görünürdü.
  */
  const beklenen = stok - Math.floor((stok - gizli) * A.RAID_LOOT_SHARE);
  for (const r of A.LOOTABLE) assert.equal(v.resources[r], beklenen, r);
  assert.ok(beklenen > gizli, 'baskında gizlenenden fazlası kalmalı');
});

test('sığınak yıkılınca koruma da bitiyor', () => {
  const v = koy(5);
  assert.ok(S.gizlenen(v, VILLAGE_DEFS) > 0);
  v.villageBuildings['1,0'].level = 0;        // mancınık yıktı
  assert.equal(S.gizlenen(v, VILLAGE_DEFS), 0,
    'yıkılmış sığınak hâlâ koruyorsa mancınığın anlamı kalmaz');
});

/**
 * KEŞİF DE GÖREMİYOR.
 *
 * Bu ayrı bir test değil "aynı kuralın ikinci okuyucusu" testi: izci
 * raporu gerçek stoku gösterseydi saldırgan keşifle yağmayı
 * karşılaştırıp sığınağın seviyesini çıkarır, savunmayı gizleyen bina
 * savunmayı ELE VEREN binaya dönerdi.
 */
test('izci raporu gizlenen kısmı göstermiyor', () => {
  const { createVillage } = require('../game/villageState');

  const saldiran = createVillage(0, 0);
  const hedef = createVillage(4, 4);
  saldiran.army = {};
  hedef.army = {};                                  // çarpışma olmasın, keşif geçsin
  hedef.villageBuildings['1,0'] = { type: 'siginak', level: 3 };
  const gizli = S.gizlenen(hedef, VILLAGE_DEFS);
  assert.ok(gizli > 0, 'test kurulumu: sığınak çalışmalı');

  const STOK = gizli + 750;
  for (const r of A.LOOTABLE) hedef.resources[r] = STOK;

  A.resolveArrival({
    id: 1, mode: 'scout', units: { kuzeyIzcisi: 20 }, distance: 3,
    phase: 'outbound', legHours: 1, remainingHours: 0,
    fromKey: '0,0', fromName: 'A', toKey: '4,4', toName: 'B',
  }, saldiran, hedef, { targetName: 'B' });

  const rapor = (saldiran.reports || []).find(x => x.dir === 'out');
  assert.ok(rapor?.intel, 'keşif geçmeliydi');
  for (const r of A.LOOTABLE) {
    assert.equal(rapor.intel.resources[r], STOK - gizli,
      `${r}: izci gizlenen kısmı görüyor`);
  }
  /* Köyün gerçek stoku değişmedi — keşif bir okuma, bir el koyma değil */
  assert.equal(hedef.resources.odun, STOK);
});
