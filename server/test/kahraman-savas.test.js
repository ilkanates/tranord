/**
 * KAHRAMAN SAVAŞTA — üç kanal ve sınırları.
 *
 * Kilitlenen kararlar:
 *
 * 1) Kahraman savaşa ÜÇ kanaldan giriyor: kendi ham gücü, ordunun
 *    saldırısına yüzde ek, savunanın toplamına yüzde ek.
 * 2) Ham güç PİYADE sayılıyor — süvari oranını kaydırıp savunanın
 *    atlı/yaya dengesini bozmamalı.
 * 3) Kahraman yüzdesi SUR bonusundan AYRI çarpan. Toplansaydı ikisinin
 *    tavanı tek tavana sıkışır ve "surum yüksek, kahraman hiçbir şey
 *    katmıyor" gibi görünmez bir etki doğardı.
 * 4) Kahramansız savaş ESKİSİYLE BİREBİR aynı — alan verilmezse hesap
 *    hiç değişmemeli.
 * 5) Canı biten kahraman ÖLÜR; kaydı silinmez, diriltilir.
 */
const test = require('node:test');
const assert = require('node:assert');
const { simulateBattle } = require('../game/combat');
const HERO = require('../game/kahraman');

const ORDU = { fjordvakt: 50 };
const SAVUNMA = { fjordvakt: 40 };

test('kahraman verilmezse savaş ESKİSİYLE birebir aynı', () => {
  const a = simulateBattle(ORDU, SAVUNMA, { surLevel: 5 });
  const b = simulateBattle(ORDU, SAVUNMA, {
    surLevel: 5,
    kahramanSaldiriGucu: 0, kahramanSaldiriYuzde: 0, kahramanSavunmaYuzde: 0,
  });
  assert.equal(a.attackTotal, b.attackTotal);
  assert.equal(a.defenseTotal, b.defenseTotal);
  assert.equal(a.winner, b.winner);
});

test('kahramanın ham gücü saldırı toplamına EKLENİYOR', () => {
  const yok = simulateBattle(ORDU, SAVUNMA, {});
  const var_ = simulateBattle(ORDU, SAVUNMA, { kahramanSaldiriGucu: 800 });
  assert.equal(+(var_.attackTotal - yok.attackTotal).toFixed(2), 800,
    'ham güç doğrudan toplama girmeli');
});

test('ATSIZ kahraman PİYADE sayılıyor', () => {
  const yok = simulateBattle({ demirAtli: 20 }, SAVUNMA, {});
  const var_ = simulateBattle({ demirAtli: 20 }, SAVUNMA, { kahramanSaldiriGucu: 1000 });
  assert.ok(var_.infRatio > yok.infRatio,
    'at kuşanmamış kahraman yaya savaşıyor; piyade oranı artmalı');
  assert.ok(var_.cavRatio < yok.cavRatio);
  assert.ok(Math.abs(var_.infRatio + var_.cavRatio - 1) < 1e-6, 'oranlar 1 etmeli');
});

test('ATLI kahraman SÜVARİ sayılıyor — savunanın dengesi kayıyor', () => {
  /*
    İlkan'ın kararı: "kahraman atlı ise atlı gibi vursun, at yoksa yaya
    askeri gibi". Sınıf savunanın atlı/yaya dengesini belirliyor: atlı
    kahramana karşı mızrakçı, yaya kahramana karşı kalkancı işe yarıyor.
    Hep piyade saysaydık at kuşanmanın savaşta hiçbir anlamı olmazdı.
  */
  const yaya = simulateBattle({ fjordvakt: 50 }, SAVUNMA, { kahramanSaldiriGucu: 1000 });
  const atli = simulateBattle({ fjordvakt: 50 }, SAVUNMA, {
    kahramanSaldiriGucu: 1000, kahramanSuvari: true,
  });
  assert.ok(atli.cavRatio > yaya.cavRatio, 'atlı kahraman süvari oranını büyütmeli');
  assert.equal(yaya.cavRatio, 0, 'yaya kahraman + yaya ordu: hiç süvari yok');
  assert.equal(atli.attackTotal, yaya.attackTotal,
    'sınıf TOPLAM gücü değiştirmemeli — yalnız hangi tarafa yazıldığını');
  assert.equal(atli.kahramanSuvari, true, 'sınıf raporlanabilmeli');
  assert.equal(yaya.kahramanSuvari, false);
});

test('saldırı yüzdesi ORDUNUN TOPLAMINA işliyor', () => {
  const yok = simulateBattle(ORDU, SAVUNMA, {});
  const var_ = simulateBattle(ORDU, SAVUNMA, { kahramanSaldiriYuzde: 20 });
  assert.equal(+(var_.attackTotal / yok.attackTotal).toFixed(4), 1.2);
});

test('savunma yüzdesi SUR bonusundan AYRI çarpan', () => {
  const surlu = simulateBattle(ORDU, SAVUNMA, { surLevel: 10 });
  const surluKah = simulateBattle(ORDU, SAVUNMA, { surLevel: 10, kahramanSavunmaYuzde: 20 });
  /*
    AYRI ÇARPAN: sur bonusu %X ise toplam savunma tam 1.2 katına çıkmalı.
    Toplansaydı (sur% + kahraman%) oran surun büyüklüğüne göre değişirdi.
  */
  assert.equal(+(surluKah.defenseTotal / surlu.defenseTotal).toFixed(4), 1.2);
  assert.equal(surluKah.wallBonusPct, surlu.wallBonusPct,
    'sur bonusu kahramandan etkilenmemeli');
});

test('savaş sonucu raporlanabilir alanlarda duruyor', () => {
  const r = simulateBattle(ORDU, SAVUNMA, {
    kahramanSaldiriGucu: 500, kahramanSaldiriYuzde: 10, kahramanSavunmaYuzde: 5,
  });
  assert.equal(r.kahramanSaldiriGucu, 500);
  assert.equal(r.kahramanSaldiriYuzde, 10);
  assert.equal(r.kahramanSavunmaYuzde, 5);
});

test('kahraman savaşı TEK BAŞINA çevirmiyor — tavanlar tutuyor', () => {
  /*
    100 puanlık tam yatırımla bile ordunun yerine geçmemeli: sıfır orduyla
    gönderilen bir kahraman, kayda değer bir savunmayı yenememeli.
  */
  const k = HERO.yeniKahraman('0,0');
  k.harcanmamisPuan = 400;
  HERO.puanDagit(k, 'saldiriPuani', HERO.SKIL_PUAN_TAVANI);
  HERO.puanDagit(k, 'saldiriBonus', HERO.SKIL_PUAN_TAVANI);
  const b = HERO.bonuslar(k);

  const r = simulateBattle({ fjordvakt: 1 }, { fjordvakt: 300 }, {
    surLevel: 10,
    kahramanSaldiriGucu: b.saldiriGucu, kahramanSaldiriYuzde: b.saldiriYuzde,
  });
  assert.equal(r.winner, 'defender',
    'tam yatırımlı kahraman + 1 asker, 300 savunanı yenmemeli');
});

test('savaş kazancı: XP savaşın BÜYÜKLÜĞÜNE, hasar KAYIP ORANINA bağlı', () => {
  const buyuk = HERO.savasSonucu(200, 0.1);
  const kucuk = HERO.savasSonucu(5, 0.1);
  assert.ok(buyuk.xp > kucuk.xp, 'büyük savaş daha çok XP vermeli');
  assert.equal(buyuk.hasar, kucuk.hasar, 'hasar öldürülen sayısına bağlı olmamalı');

  const temiz = HERO.savasSonucu(100, 0, 1000, true);
  const kirim = HERO.savasSonucu(100, 1, 1000, true);
  assert.ok(kirim.hasar > temiz.hasar, 'kırılan orduda kahraman daha çok yıpranmalı');
  assert.equal(temiz.xp, kirim.xp,
    'XP sonuca değil büyüklüğe bağlı — yoksa riskli savaş hiç denenmezdi');
});

test('SAVAŞA GİREN KAHRAMAN her hâlükârda yıpranıyor', () => {
  /*
    İlkan: *"normal köye saldırdığımda kahramanın da canı düşmeli."*

    Hasar YALNIZ kayıp oranına bağlıyken ezici bir orduyla küçük bir
    köye vurmak kahramana HİÇ dokunmuyordu; kahramanı her sefere katmak
    bedavaydı ve bedava olan bir seçim seçim değildir.
  */
  const temiz = HERO.savasSonucu(100, 0, 1000, true);
  assert.ok(temiz.hasar > 0,
    `kayıpsız zaferde bile hasar olmalı, ölçülen: ${temiz.hasar}`);
  assert.equal(temiz.hasar, Math.round(1000 * HERO.SAVAS_TABAN_YUZDE / 100),
    'taban hasar can tavanının yüzdesi olmalı');
});

test('TABAN HASAR CAN TAVANIYLA ölçekleniyor — sabit sayı değil', () => {
  /*
    Sabit 30 hasar, 100 canlı yeni kahramanı üç seferde bayıltır,
    1.100 canlı kahramana hiçbir şey yapmazdı. Yüzde iki uçta da aynı
    anlamı taşıyor.
  */
  const kucuk = HERO.savasSonucu(10, 0, 100, true).hasar;
  const buyuk = HERO.savasSonucu(10, 0, 2000, true).hasar;
  assert.ok(buyuk > kucuk * 10,
    `taban tavanla büyümeli (küçük ${kucuk}, büyük ${buyuk})`);
  assert.equal(buyuk / 2000, kucuk / 100, 'oran iki uçta da aynı olmalı');
});

test('SAVAŞ OLMADIYSA hasar da YOK — boş köye girmek savaş değil', () => {
  /*
    Savunmasız bir köye yürüyen kahramanı yaralamak, oyuncuyu hiç
    olmamış bir çarpışmanın bedelini ödemeye zorlardı.
  */
  const r = HERO.savasSonucu(0, 0, 1000, false);
  assert.equal(r.hasar, 0);
});

test('kaybedilen savaş bile XP veriyor', () => {
  // Yalnız zaferi ödüllendirseydik kahraman ancak kazanılacağı belli
  // savaşlara sokulurdu
  const r = HERO.savasSonucu(30, 1, 1000, true);
  assert.ok(r.xp > 0);
  assert.ok(r.hasar > 1000, 'ordusu kırılan kahraman ağır yaralanmalı');
});

test('ORDU TAMAMEN KIRILINCA kahraman ZIRHSIZ kurtulamıyor', () => {
  /*
    İlkan: *"gönderdiğim ordu tamamen öldüyse kahraman kolay kolay
    canlı çıkamaz."*

    Eski eğride hasar tavanı SABİT 70'ti: 1.090 canlı bir kahraman için
    ordusunun tamamen kırıldığı savaş canının %11'i ediyordu ve kahraman
    sapasağlam dönüyordu.
  */
  const tavan = 1090;
  const tamKayip = HERO.savasSonucu(10, 1, tavan, true).hasar;
  assert.ok(tamKayip > tavan,
    `ordu yok olunca hasar can tavanını geçmeli (${tamKayip} / ${tavan})`);

  const k = HERO.yeniKahraman('0,0');
  k.can = tavan;
  assert.equal(HERO.hasarVer(k, tamKayip).oldu, true, 'zırhsız kahraman ölmeli');
});

test('TAM ZIRH ordusu yok olan kahramanı KIL PAYI kurtarıyor', () => {
  /*
    "Kolay kolay canlı çıkamaz" — imkânsız değil. Zırh tavanı %50 ve
    tam zırhlı kahraman canının onda biriyle çıkıyor. Zırh yatırımı tam
    olarak bu anda karşılığını veriyor; her zaman ölseydi zırhın en
    kritik anda hiçbir anlamı kalmazdı.
  */
  const tavan = 1090;
  const ham = HERO.savasSonucu(10, 1, tavan, true).hasar;
  const uygulanan = ham * (1 - HERO.ZIRHLANMA_TAVANI / 100);
  assert.ok(uygulanan < tavan,
    `tam zırhlı kahraman kurtulabilmeli (${Math.round(uygulanan)} / ${tavan})`);
  assert.ok(uygulanan > tavan * 0.8,
    'ama kıl payı olmalı — kolayca kurtulursa zırh savaşı risksiz yapar');
});

test('RUTİN YAĞMA ucuz — eğri düşük kayıplarda yatık', () => {
  /*
    Doğrusal bir eğride ordusunun %2'sini kaybeden rutin bir yağma da
    kahramanın canından ciddi pay alırdı ve kahramanı sefere katmak
    günlük oyunda cezalandırılırdı. Üs (bkz. SAVAS_HASAR_USSU) eğriyi
    düşük kayıplarda yatırıp yüksek kayıplarda dikleştiriyor.
  */
  const tavan = 1090;
  const rutin = HERO.savasSonucu(10, 0.02, tavan, true).hasar;
  const felaket = HERO.savasSonucu(10, 1, tavan, true).hasar;
  assert.ok(rutin < tavan * 0.1,
    `rutin yağma canın %10'undan az götürmeli, ölçülen: ${rutin}`);
  assert.ok(felaket > rutin * 25,
    'felaket ile rutin arasındaki fark büyük olmalı');
});

test('HASAR İKİ ORDUNUN GÜÇ ORANINA bağlı — kayıp oranı o oranın kendisi', () => {
  /*
    İlkan: *"karşılaştığı ordu ile kendi yanındaki ordunun gücüne
    bağlı."* `attackerLossRate` zaten bu oran (bkz. combat.js):
    kazanınca (savunma/saldırı)^K, kaybedince 1. Ayrı bir güç hesabı
    yazmak aynı şeyi ikinci kez tanımlamak olurdu.

    Burada ölçülen: oran büyüdükçe hasar MONOTON artıyor.
  */
  const tavan = 500;
  let onceki = -1;
  for (const oran of [0, 0.1, 0.25, 0.5, 0.75, 1]) {
    const h = HERO.savasSonucu(10, oran, tavan, true).hasar;
    assert.ok(h > onceki, `hasar oranla artmalı (oran ${oran} → ${h})`);
    onceki = h;
  }
});

test('tam hasar alan kahraman ÖLÜR — ama kaydı silinmez', () => {
  const k = HERO.yeniKahraman('0,0');
  k.can = 10;
  const r = HERO.savasSonucu(50, 1, 1000, true);
  const h = HERO.hasarVer(k, r.hasar);
  assert.equal(h.oldu, true);
  assert.equal(k.olu, true);
  assert.equal(k.var, true,
    'kahraman KAYDI silinmemeli — hammadde ya da iksirle diriltilebilmeli');
  assert.ok(HERO.dirilt(k).ok, 'ölü kahraman diriltilebilmeli');
});
