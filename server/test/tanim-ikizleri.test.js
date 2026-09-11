/**
 * TANIM İKİZLERİ — sunucu ile istemci aynı sayıları mı kullanıyor?
 *
 * İstemci `client/src/data/` altında maliyetlerin ve üretim oranlarının KENDİ
 * kopyasını tutuyor; inşa menüsü, bina paneli ve yardım ekranı onu okuyor.
 * Sunucu ise `server/data/` altındakini uyguluyor. İki taraf ayrışırsa arayüz
 * bir fiyat gösterir, sunucu başka bir fiyat keser — oyuncu düğmeye basar,
 * hiçbir şey olmaz ve sebebi hiçbir yerde yazmaz.
 *
 * Bu gerçek bir tehlike, teorik değil: denge ayarı yapılırken sunucu tarafı
 * güncellenip istemci unutulduğunda tam olarak bu oluyor. Dosyaların kendi
 * yorumları da "İKİ dosyayı da birlikte güncelle" diyor — bu test o notu
 * zorunlu kılıyor.
 *
 * NOT: karşılaştırma DEĞERLER üzerinden; dosyaların biçimi/sırası serbest.
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const url = require('node:url');

const ISTEMCI = path.join(__dirname, '..', '..', 'client', 'src', 'data');

/** İstemci dosyaları ESM (client/package.json → type: module) */
const istemciYukle = (dosya) =>
  import(url.pathToFileURL(path.join(ISTEMCI, dosya)).href);

/** Maliyet nesnelerini karşılaştırılabilir düz metne çevir */
const duz = (o) => Object.entries(o || {}).sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `${k}=${v}`).join(',');

test('köy binası maliyetleri sunucu ve istemcide aynı', async () => {
  const { VILLAGE_DEFS: S } = require('../data/villageDefs');
  const istemci = await istemciYukle('villageDefs.js');
  const C = istemci.default || istemci.VILLAGE_DEFS;
  assert.ok(C, 'istemci villageDefs bir tanım dışa aktarmıyor');

  const eksik = Object.keys(S).filter(k => !C[k]);
  assert.deepEqual(eksik, [], 'istemcide olmayan bina: ' + eksik.join(', '));

  const farklar = [];
  for (const [tip, sd] of Object.entries(S)) {
    const cd = C[tip];
    for (const alan of ['cost', 'upgradeCostBase']) {
      const a = duz(sd[alan]), b = duz(cd[alan]);
      if (a !== b) farklar.push(`${tip}.${alan}\n      sunucu : ${a || '(yok)'}\n      istemci: ${b || '(yok)'}`);
    }
    if ((sd.upgradeCostMultiplier || null) !== (cd.upgradeCostMultiplier || null)) {
      farklar.push(`${tip}.upgradeCostMultiplier: sunucu ${sd.upgradeCostMultiplier} · istemci ${cd.upgradeCostMultiplier}`);
    }
    if ((sd.maxLevel || null) !== (cd.maxLevel || null)) {
      farklar.push(`${tip}.maxLevel: sunucu ${sd.maxLevel} · istemci ${cd.maxLevel}`);
    }
  }
  assert.equal(farklar.length, 0,
    'Sunucu ile istemci maliyetleri ayrışmış:\n    ' + farklar.join('\n    '));
});

test('varsayılan yükseltme çarpanı iki tarafta aynı', async () => {
  const istemci = await istemciYukle('villageDefs.js');
  // Beklenen değer burada AÇIKÇA yazılı: iki taraf birlikte değiştirilip
  // sessizce kayarsa bu sabit yakalasın diye üçüncü bir tanık.
  const SUNUCU_VARSAYILAN = 1.25;
  assert.equal(istemci.UPGRADE_MULT_DEFAULT, SUNUCU_VARSAYILAN,
    'istemcideki UPGRADE_MULT_DEFAULT sunucudakiyle aynı olmalı');

  // Sunucu tarafı: metin eşleştirmek yerine modülden GERÇEK değeri al.
  // (Eskiden server/index.js kaynağı okunuyordu; sabit game/koyKurallari.js'e
  //  taşınınca test düştü ve doğru yeri gösterdi — sistem çalıştı.)
  const { UPGRADE_MULT_DEFAULT } = require('../game/koyKurallari');
  assert.equal(UPGRADE_MULT_DEFAULT, SUNUCU_VARSAYILAN,
    'game/koyKurallari.js değişmiş — bu testteki sabiti ve istemciyi de güncelle');
});

test('üretim tarlası tanımları sunucu ve istemcide aynı', async () => {
  const S = require('../data/productionDefs');
  const istemci = await istemciYukle('buildingDefs.js');
  const C = istemci.default;
  assert.ok(C, 'istemci buildingDefs bir tanım dışa aktarmıyor');

  const farklar = [];
  for (const [tip, sd] of Object.entries(S)) {
    const cd = C[tip];
    if (!cd) { farklar.push(`${tip}: istemcide yok`); continue; }
    if (sd.baseProductionPerWorker !== cd.baseProductionPerWorker) {
      farklar.push(`${tip}.baseProductionPerWorker: sunucu ${sd.baseProductionPerWorker} · istemci ${cd.baseProductionPerWorker}`);
    }
    // Seviye tablosu: işçi sayısı ve maliyet
    const sl = sd.levels || [], cl = cd.levels || [];
    if (sl.length !== cl.length) { farklar.push(`${tip}.levels uzunlugu: ${sl.length} ≠ ${cl.length}`); continue; }
    for (let i = 0; i < sl.length; i++) {
      if (sl[i].workers !== cl[i].workers) farklar.push(`${tip}.levels[${i}].workers: ${sl[i].workers} ≠ ${cl[i].workers}`);
      const a = duz(sl[i].cost), b = duz(cl[i].cost);
      if (a !== b) farklar.push(`${tip}.levels[${i}].cost\n      sunucu : ${a}\n      istemci: ${b}`);
    }
  }
  assert.equal(farklar.length, 0,
    'Üretim tanımları ayrışmış:\n    ' + farklar.join('\n    '));
});

test('savunma bonusu eğrileri iki tarafta aynı', async () => {
  const { SUR_BONUS, HENDEK_BONUS, KULE_BONUS, DEF_BONUS_CAP } = require('../data/villageDefs');
  const c = await istemciYukle('villageDefs.js');
  assert.equal(c.DEF_BONUS_CAP, DEF_BONUS_CAP, 'DEF_BONUS_CAP ayrışmış');
  assert.deepEqual(c.SUR_BONUS, SUR_BONUS, 'SUR_BONUS ayrışmış');
  assert.deepEqual(c.HENDEK_BONUS, HENDEK_BONUS, 'HENDEK_BONUS ayrışmış');
  assert.deepEqual(c.KULE_BONUS, KULE_BONUS, 'KULE_BONUS ayrışmış');
});
