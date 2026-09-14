/**
 * KUŞAM — eşya kuşanma ve bonusların iki kanala dağılması.
 *
 * Kilitlenen kararlar:
 *
 * 1) İKİ KANAL: kahramanın kendisi ve ORDU (birim sınıflarının
 *    saldırı/savunma yüzdesi). İlkan'ın özel isteği ikincisi.
 * 2) Dolu slota kuşanmak TAKAS — eskisi envantere döner. Reddetmek
 *    oyuncuyu iki adıma zorlardı, sürükle-bırakta bu beklenmez.
 * 3) NADİRLİK ÖLÇEKLER, yeni etki eklemez.
 * 4) Eşyanın saldırı katkısı HAM GÜÇ; skil yüzde tavanına girmez. Girseydi
 *    tam yatırımlı kahramanda efsane kılıç hiçbir şey katmazdı.
 * 5) Bozuk/bilinmeyen envanter girdisi ÇÖKMEZ, sessizce yok sayılır —
 *    eski kayıtlar oyuncunun ekranını kilitlemesin.
 */
const test = require('node:test');
const assert = require('node:assert');
const KUSAM = require('../game/kusam');
const HERO = require('../game/kahraman');
const { HERO_ITEMS, HERO_SLOTS, NADIRLIK } = require('../data/heroItemDefs');

function kahramanla(envanter = []) {
  const k = HERO.yeniKahraman('0,0');
  k.envanter = envanter;
  return k;
}

test('kuşanma eşyayı envanterden slota taşıyor', () => {
  const k = kahramanla([{ key: 'fjordKilici', nadirlik: 'siradan' }]);
  const r = KUSAM.kusan(k, 0);
  assert.equal(r.ok, true);
  assert.equal(r.slot, 'sagEl');
  assert.equal(k.envanter.length, 0, 'kuşanılan eşya envanterde kalmamalı');
  assert.equal(k.kusanilan.sagEl.key, 'fjordKilici');
});

test('dolu slota kuşanmak TAKAS — eskisi envantere döner', () => {
  const k = kahramanla([
    { key: 'fjordKilici', nadirlik: 'siradan' },
    { key: 'savasBaltasi', nadirlik: 'efsane' },
  ]);
  KUSAM.kusan(k, 0);
  const r = KUSAM.kusan(k, 0);            // artık balta 0. sırada
  assert.equal(r.ok, true);
  assert.equal(k.kusanilan.sagEl.key, 'savasBaltasi');
  assert.equal(k.envanter.length, 1, 'eski eşya kaybolmamalı');
  assert.equal(k.envanter[0].key, 'fjordKilici');
});

test('çıkarma eşyayı envantere geri koyuyor', () => {
  const k = kahramanla([{ key: 'zincirZirh', nadirlik: 'nadir' }]);
  KUSAM.kusan(k, 0);
  const r = KUSAM.cikar(k, 'zirh');
  assert.equal(r.ok, true);
  assert.equal(k.envanter.length, 1);
  assert.equal(k.kusanilan.zirh, undefined);
  assert.equal(KUSAM.cikar(k, 'zirh').sebep, 'slot_bos', 'boş slot çıkarılamaz');
  assert.equal(KUSAM.cikar(k, 'olmayanSlot').sebep, 'slot_yok');
});

test('atmak KALICI siliyor — ama yalnız istenen girdiyi', () => {
  const k = kahramanla([
    { key: 'fjordKilici', nadirlik: 'siradan' },
    { key: 'pulZirh', nadirlik: 'iyi' },
  ]);
  const r = KUSAM.at(k, 0);
  assert.equal(r.ok, true);
  assert.equal(r.atilan.key, 'fjordKilici');
  assert.equal(k.envanter.length, 1);
  assert.equal(k.envanter[0].key, 'pulZirh');
  assert.equal(KUSAM.at(k, 99).sebep, 'esya_yok');
});

test('bonus İKİ KANALA ayrılıyor — kahraman ve ORDU', () => {
  const k = kahramanla([
    { key: 'fjordKilici', nadirlik: 'siradan' },   // kahramana saldırı
    { key: 'kuleKalkani', nadirlik: 'siradan' },   // piyadeye savunma
  ]);
  KUSAM.kusan(k, 0);
  KUSAM.kusan(k, 0);
  const b = KUSAM.kusamBonuslari(k);
  assert.equal(b.kahraman.saldiri, HERO_ITEMS.fjordKilici.kahramanBonus.saldiri);
  assert.equal(b.birim.piyade.savunma, HERO_ITEMS.kuleKalkani.birimBonus.piyade.savunma);
  assert.equal(b.birim.suvari.savunma, 0, 'süvariye dokunmamalı');
});

test('nadirlik ÖLÇEKLER, yeni etki EKLEMEZ', () => {
  const taban = kahramanla([{ key: 'savasBaltasi', nadirlik: 'siradan' }]);
  const efsane = kahramanla([{ key: 'savasBaltasi', nadirlik: 'efsane' }]);
  KUSAM.kusan(taban, 0);
  KUSAM.kusan(efsane, 0);
  const a = KUSAM.kusamBonuslari(taban);
  const b = KUSAM.kusamBonuslari(efsane);

  assert.equal(b.birim.piyade.saldiri,
    Math.round(a.birim.piyade.saldiri * NADIRLIK.efsane.carpan * 10) / 10);
  // Aynı alanlar, farklı büyüklük: efsanenin dokunduğu alan sayısı değişmemeli
  const alanlar = (x) => Object.entries(x.birim.piyade)
    .filter(([, v]) => v > 0).map(([kk]) => kk).sort();
  assert.deepEqual(alanlar(b), alanlar(a));
});

test('kuşanılan eşya kahramanın SALDIRI GÜCÜNE ham olarak giriyor', () => {
  const k = kahramanla([{ key: 'fjordKilici', nadirlik: 'efsane' }]);
  const once = HERO.bonuslar(k).saldiriGucu;
  KUSAM.kusan(k, 0);
  const sonra = HERO.bonuslar(k).saldiriGucu;
  const beklenen = HERO_ITEMS.fjordKilici.kahramanBonus.saldiri * NADIRLIK.efsane.carpan;
  assert.ok(Math.abs(sonra - once - beklenen) < 0.5,
    'eşyanın saldırısı ham güç olarak eklenmeli — yüzde tavanına değil');
});

test('tam yatırımlı kahramanda bile eşya HÂLÂ bir şey katıyor', () => {
  /*
    Eşya yüzde tavanına girseydi tam yatırımlı kahramanda efsane kılıç
    hiçbir şey katmaz, oyuncu topladığı eşyanın işe yaramadığını görürdü.
  */
  const k = kahramanla([{ key: 'fjordKilici', nadirlik: 'efsane' }]);
  k.harcanmamisPuan = 400;
  HERO.puanDagit(k, 'saldiriPuani', HERO.SKIL_PUAN_TAVANI);
  HERO.puanDagit(k, 'saldiriBonus', HERO.SKIL_PUAN_TAVANI);
  const once = HERO.bonuslar(k).saldiriGucu;
  KUSAM.kusan(k, 0);
  assert.ok(HERO.bonuslar(k).saldiriGucu > once);
});

test('can ve iyileşme eşyayla büyüyor', () => {
  const k = kahramanla([{ key: 'zincirZirh', nadirlik: 'siradan' }]);
  const onceTavan = HERO.ozet(k, 5).canTavan;
  const onceIyi = HERO.ozet(k, 5).iyilesmeSaatlik;
  KUSAM.kusan(k, 0);
  const o = HERO.ozet(k, 5);
  assert.ok(o.canTavan > onceTavan, 'zırh can tavanını büyütmeli');
  assert.ok(o.iyilesmeSaatlik > onceIyi, 'zırh iyileşmeyi hızlandırmalı');
});

test('ÖLÜ kahramanın eşya bonusları da işlemiyor', () => {
  const k = kahramanla([{ key: 'savasBaltasi', nadirlik: 'efsane' }]);
  KUSAM.kusan(k, 0);
  assert.ok(HERO.bonuslar(k).birim.piyade.saldiri > 0);
  HERO.hasarVer(k, 99999);
  const b = HERO.bonuslar(k);
  assert.equal(b.birim.piyade.saldiri, 0,
    'ölümün canı yakmalı — eşya bonusu da durmalı');
});

test('bozuk envanter girdisi çökertmiyor, sessizce yok sayılıyor', () => {
  const k = kahramanla([
    { key: 'olmayanEsya', nadirlik: 'siradan' },
    { key: 'fjordKilici', nadirlik: 'olmayanNadirlik' },
    null,
  ]);
  assert.equal(KUSAM.kusan(k, 0).sebep, 'esya_yok');
  assert.equal(KUSAM.kusan(k, 1).sebep, 'esya_yok');
  assert.deepEqual(KUSAM.envanterOzeti(k), [],
    'eski kayıttan gelen bozuk girdi ekranı kilitlememeli');
  // Kuşanılanda bozuk girdi varsa bonus hesabı da sağlam kalmalı
  k.kusanilan = { sagEl: { key: 'yok', nadirlik: 'yok' } };
  assert.deepEqual(KUSAM.kusamBonuslari(k).birim.piyade, { saldiri: 0, savunma: 0 });
  assert.deepEqual(KUSAM.kusanilanOzeti(k), {});
});

test('ZIRHLANMA alınan hasarı azaltıyor — macerada da savaşta da', () => {
  /*
    Tek kapı `hasarVer`: savaş da macera da oradan geçiyor, o yüzden
    azaltma da orada. Her çağırana ayrı azaltma yazmak er geç birinde
    unutulacak bir tekrar olurdu.
  */
  const zirhsiz = kahramanla();
  zirhsiz.can = 300;
  const a = HERO.hasarVer(zirhsiz, 100);
  assert.equal(a.uygulanan, 100, 'zırhsız kahraman hasarın tamamını alır');

  const zirhli = kahramanla([{ key: 'aynaZirh', nadirlik: 'siradan' }]);
  KUSAM.kusan(zirhli, 0);
  zirhli.can = 300;
  const b = HERO.hasarVer(zirhli, 100);
  assert.ok(b.uygulanan < 100, 'zırh hasarı azaltmalı');
  assert.equal(b.hamHasar, 100, 'ham hasar raporlanabilmeli');
  assert.equal(zirhli.can, 300 - b.uygulanan);
});

test('ZIRHLANMA TAVANI aşılamıyor — kahraman ölümsüz olmuyor', () => {
  /*
    Tavansız olsaydı yeterince eşya yığan oyuncunun kahramanı hiç hasar
    almaz, macera ve savaş risksizleşirdi.
  */
  const k = kahramanla([
    { key: 'aynaZirh', nadirlik: 'efsane' },
    { key: 'demirKalkan', nadirlik: 'efsane' },
    { key: 'demirMigfer', nadirlik: 'efsane' },
    { key: 'zincirEtek', nadirlik: 'efsane' },
  ]);
  for (let i = 0; i < 4; i++) KUSAM.kusan(k, 0);

  const ham = KUSAM.kusamBonuslari(k).kahraman.zirhlanma;
  assert.ok(ham > HERO.ZIRHLANMA_TAVANI,
    'bu set tavanı aşmalı ki kırpma gerçekten ölçülsün');
  assert.equal(HERO.zirhlanmaYuzdesi(k), HERO.ZIRHLANMA_TAVANI);
  assert.ok(HERO.ZIRHLANMA_TAVANI < 100, 'tavan %100 olursa kahraman ölümsüz olur');

  k.can = 1000;
  assert.equal(HERO.hasarVer(k, 100).uygulanan,
    Math.round(100 * (1 - HERO.ZIRHLANMA_TAVANI / 100)));
});

test('zırhlanma bonusu ÖLÜ kahramanda da hesaba girmiyor', () => {
  // Bonusların tamamı ölümle duruyor; zırhlanma da o kuralın dışında değil
  const k = kahramanla([{ key: 'aynaZirh', nadirlik: 'efsane' }]);
  KUSAM.kusan(k, 0);
  assert.ok(HERO.bonuslar(k).zirhlanmaYuzde > 0);
  HERO.hasarVer(k, 99999);
  assert.equal(HERO.bonuslar(k).zirhlanmaYuzde, 0);
});

test('her slotta hasar azaltan ya da iyileştiren bir seçenek var', () => {
  /*
    İlkan sordu: "sağlık yenileme hızını ya da aldığı hasarı azaltan
    eşyalar var mı?" Bu test o cevabı kilitliyor — dayanıklılık ekseni
    tek bir slota sıkışmasın, oyuncu ne kuşanacağını seçebilsin.
  */
  const dayaniklilik = new Set();
  for (const def of Object.values(HERO_ITEMS)) {
    const b = def.kahramanBonus || {};
    if ((b.zirhlanma || 0) > 0 || (b.iyilesme || 0) > 0 || (b.can || 0) > 0) {
      dayaniklilik.add(def.slot);
    }
  }
  for (const slot of ['migfer', 'zirh', 'solEl', 'pantolon', 'ayakkabi', 'bileklik']) {
    assert.ok(dayaniklilik.has(slot),
      `${slot} slotunda dayanıklılık veren hiç eşya yok`);
  }
});

test('HIZ yalnız AT slotundan gelir', () => {
  /*
    İlkan'ın kararı: "kahramanın bir hızı olsun ve at bu hızı artırsın
    SADECE". Başka slotlara dağıtılsaydı hız görünmez bir yerden birikir
    ve oyuncu kahramanının neden hızlandığını anlamazdı.
  */
  for (const [key, def] of Object.entries(HERO_ITEMS)) {
    if ((def.kahramanBonus?.hiz || 0) > 0) {
      assert.equal(def.slot, 'at', `${key} hız veriyor ama at slotunda değil`);
    }
  }
  const atlar = Object.entries(HERO_ITEMS).filter(([, d]) => d.slot === 'at');
  assert.ok(atlar.length >= 2, 'en az iki at olmalı ki seçim olsun');
  for (const [key, def] of atlar) {
    assert.ok((def.kahramanBonus?.hiz || 0) > 0, `${key} bir at ama hız vermiyor`);
  }
});

test('HER ATIN HIZI FARKLI ve hız tek eksen değil', () => {
  /*
    İlkan'ın kararı: "farklı atlar düşme ihtimalini de unutma, her atın
    hızı aynı olmayacak". Ayrıca tek bir "en iyi at" olmamalı — en hızlı
    at savaşa bir şey katmamalı, yoksa diğerleri çöp olur.
  */
  const atlar = Object.entries(HERO_ITEMS).filter(([, d]) => d.slot === 'at');
  assert.ok(atlar.length >= 4, 'at çeşidi en az dört olmalı');

  const hizlar = atlar.map(([, d]) => d.kahramanBonus.hiz);
  assert.ok(new Set(hizlar).size >= 3,
    'atların hızları birbirinden ayrışmalı: ' + hizlar.join(', '));

  // EN HIZLI AT en güçlü at OLMAMALI — yoksa seçim diye bir şey kalmaz
  const enHizli = atlar.reduce((a, b) =>
    (b[1].kahramanBonus.hiz > a[1].kahramanBonus.hiz ? b : a));
  const baskaFayda = Object.entries(enHizli[1].kahramanBonus)
    .filter(([alan, v]) => alan !== 'hiz' && v > 0);
  assert.deepEqual(baskaFayda, [],
    `en hızlı at (${enHizli[0]}) başka bir fayda da veriyor — diğer atlar çöp olur`);
});

test('AT KUŞANINCA kahraman SÜVARİ olur ve hızlanır', () => {
  const k = kahramanla([{ key: 'bozkirAti', nadirlik: 'siradan' }]);
  assert.equal(HERO.suvariMi(k), false, 'at kuşanmadan yaya');
  const yayaHiz = HERO.hizi(k);
  assert.equal(yayaHiz, HERO.KAHRAMAN_TABAN_HIZ);

  KUSAM.kusan(k, 0);
  assert.equal(HERO.suvariMi(k), true, 'at slotu dolunca süvari');
  assert.ok(HERO.hizi(k) > yayaHiz, 'at hızlandırmalı');

  KUSAM.cikar(k, 'at');
  assert.equal(HERO.suvariMi(k), false, 'at çıkarılınca yine yaya');
  assert.equal(HERO.hizi(k), yayaHiz);
});

test('HIZ TAVANI aşılamıyor — kahraman yakalanamaz olmuyor', () => {
  /*
    Nadirlik bütün bonusları ölçeklediği için efsane bir at kahramanı
    oyunun en hızlı biriminden de hızlı yapabiliyordu (ölçüldü: 21).
    Haritada hiçbir şeyin yakalayamadığı bir birim, keşif ve savunma
    tepkisini anlamsız kılardı.
  */
  const k = kahramanla([{ key: 'bozkirAti', nadirlik: 'efsane' }]);
  KUSAM.kusan(k, 0);
  assert.ok(HERO.hizi(k) <= HERO.KAHRAMAN_HIZ_TAVANI);

  // Tavanı zorlayan uydurma bir bonusla da kırpılmalı
  k.kusanilan.at = { key: 'bozkirAti', nadirlik: 'efsane' };
  const sahte = { ...k, kusanilan: k.kusanilan };
  assert.ok(HERO.hizi(sahte) <= HERO.KAHRAMAN_HIZ_TAVANI);
});

test('iki at arasında GERÇEK bir tercih var', () => {
  // Biri diğerinin üstün hâli olsaydı seçim diye bir şey kalmazdı
  const bozkir = kahramanla([{ key: 'bozkirAti', nadirlik: 'siradan' }]);
  const savas = kahramanla([{ key: 'savasAti', nadirlik: 'siradan' }]);
  KUSAM.kusan(bozkir, 0);
  KUSAM.kusan(savas, 0);
  assert.ok(HERO.hizi(bozkir) > HERO.hizi(savas), 'bozkır atı daha hızlı');
  assert.ok(HERO.bonuslar(savas).saldiriGucu > HERO.bonuslar(bozkir).saldiriGucu,
    'savaş atı daha çok vuruyor');
});

test('özetteki slot listesi tanımla aynı — istemci ızgarası bundan besleniyor', () => {
  const o = HERO.ozet(kahramanla(), 1);
  assert.deepEqual(Object.keys(o.slotlar).sort(), Object.keys(HERO_SLOTS).sort());
});
