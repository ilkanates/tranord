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

/**
 * GÖSTERİLEN TÜKETİM ile AMBARDAN DÜŞEN AYNI OLMALI.
 *
 * Eski test yalnız iki GÖSTERİM fonksiyonunu (`getFoodOutlook` ve
 * `getConsumptionRates`) karşılaştırıyordu; ikisi de takviyeyi
 * sayıyordu, dolayısıyla test yeşil yanıyordu. Ekmeği GERÇEKTEN düşen
 * `processFoodConsumption` ise takviyeyi hiç saymıyordu.
 *
 * Ölçüldü (hata duruyorken): 10 kendi + 20 misafir askerli köyde ekran
 * 12,50 ekmek/sa diyordu, ambardan 7,50 düşüyordu — 20 misafir bedava
 * yiyordu ve ekran doğru sayıyı gösterdiği için hata görünmüyordu.
 *
 * Bu test ekranı değil AMBARI ölçüyor: bir tik işletip kaybolan
 * yiyeceği sayıyor.
 */
test('gösterilen tüketim AMBARDAN DÜŞENLE aynı (misafir ve yoldaki asker dahil)', () => {
  const kur = ({ misafir = false, seferde = false } = {}) => {
    const v = createVillage(0, 0);
    v.army = { fjordvakt: 10 };
    v.takviyeler = misafir
      ? [{ id: 1, userId: 7, slotKey: '3,0', units: { fjordvakt: 20 }, at: Date.now() }]
      : [];
    v.marches = seferde
      ? [{ id: 1, mode: 'takviye', phase: 'return', units: { fjordvakt: 15 },
          remainingHours: 3 }]
      : [];
    // Üretim sıfır olsun ki ölçüm yalnız TÜKETİMİ görsün
    for (const t of Object.values(v.productionTiles)) t.workers = 0;
    v.resources.ekmek = 500; v.resources.un = 0; v.resources.tahil = 0;
    return v;
  };

  for (const durum of [{}, { misafir: true }, { seferde: true },
    { misafir: true, seferde: true }]) {
    const v = kur(durum);
    const gosterilen = TICK.getConsumptionRates(v).foodPerHour;
    const once = v.resources.ekmek;
    TICK.processTick(v, 1);
    const dusen = once - v.resources.ekmek;
    assert.ok(Math.abs(gosterilen - dusen) < 0.02,
      `${JSON.stringify(durum)} → ekranda ${gosterilen}/sa ama ambardan `
      + `${dusen.toFixed(2)}/sa düştü`);
  }
});

/**
 * BİR ASKER HER ZAMAN BİR KÖYÜN EKMEĞİNİ YER.
 *
 * İlkan: *"askerler desteğe gittikleri köye ulaştıkları an o köyden
 * ekmek yemeye başlarlar. aynı şekilde ben desteğimi geri çektiğim anda
 * da benim köyden ekmek tüketmeye başlarlar."*
 *
 * Kural üç kümeye birden bakmayı gerektiriyor:
 *   · köyde duran        → o köy         (army)
 *   · misafir olarak duran → EV SAHİBİ   (takviyeler)
 *   · yolda olan         → seferi TAŞIYAN köy (marches)
 *
 * Üçüncüsü İlkan'ın ikinci cümlesinin karşılığı: geri çağırma askeri
 * ev sahibinin `takviyeler`inden alıp sahibinin `marches`ine koyuyor,
 * yani devir teslim geri çağırma ANINDA oluyor. Yoldaki asker
 * sayılmasaydı o an asker kimsenin beslemediği kümeye düşerdi —
 * ayrıca "orduyu uzun sefere yolla, ekmekten kaç" deliği açılırdı.
 */
test('yoldaki ve misafir asker de bir köyün faturasına yazılıyor', () => {
  const bos = createVillage(0, 0);
  bos.army = {};
  const taban = TICK.koyunAskerYemi(bos);

  const evde = createVillage(0, 0);
  evde.army = { fjordvakt: 20 };

  const yolda = createVillage(0, 0);
  yolda.army = {};
  yolda.marches = [{ id: 1, mode: 'takviye', phase: 'return',
    units: { fjordvakt: 20 }, remainingHours: 3 }];

  const misafirli = createVillage(0, 0);
  misafirli.army = {};
  misafirli.takviyeler = [{ id: 1, userId: 7, slotKey: '3,0',
    units: { fjordvakt: 20 }, at: Date.now() }];

  const evdeYem = TICK.koyunAskerYemi(evde) - taban;
  assert.ok(evdeYem > 0, 'evdeki asker yemeli');
  assert.equal(TICK.koyunAskerYemi(yolda) - taban, evdeYem,
    'YOLDAKİ asker, evdekiyle aynı yemi seferi taşıyan köye yazmalı');
  assert.equal(TICK.koyunAskerYemi(misafirli) - taban, evdeYem,
    'MİSAFİR asker, evdekiyle aynı yemi EV SAHİBİNE yazmalı');
});
