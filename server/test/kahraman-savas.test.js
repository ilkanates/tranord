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

test('ham güç PİYADE sayılıyor — süvari oranı kaymıyor', () => {
  const yok = simulateBattle({ demirAtli: 20 }, SAVUNMA, {});
  const var_ = simulateBattle({ demirAtli: 20 }, SAVUNMA, { kahramanSaldiriGucu: 1000 });
  assert.ok(var_.infRatio > yok.infRatio,
    'kahraman yaya savaşıyor; piyade oranı artmalı');
  assert.ok(var_.cavRatio < yok.cavRatio,
    'süvari oranı kahraman yüzünden düşmeli — aksi hâlde savunanın '
    + 'atlı/yaya dengesi bedavaya kayardı');
  assert.ok(Math.abs(var_.infRatio + var_.cavRatio - 1) < 1e-6, 'oranlar 1 etmeli');
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

  const temiz = HERO.savasSonucu(100, 0);
  const kirim = HERO.savasSonucu(100, 1);
  assert.equal(temiz.hasar, 0, 'kayıpsız zaferde kahraman yıpranmamalı');
  assert.equal(kirim.hasar, HERO.SAVAS_HASAR_TAVANI);
  assert.equal(temiz.xp, kirim.xp,
    'XP sonuca değil büyüklüğe bağlı — yoksa riskli savaş hiç denenmezdi');
});

test('kaybedilen savaş bile XP veriyor', () => {
  // Yalnız zaferi ödüllendirseydik kahraman ancak kazanılacağı belli
  // savaşlara sokulurdu
  const r = HERO.savasSonucu(30, 1);
  assert.ok(r.xp > 0);
  assert.equal(r.hasar, HERO.SAVAS_HASAR_TAVANI);
});

test('tam hasar alan kahraman ÖLÜR — ama kaydı silinmez', () => {
  const k = HERO.yeniKahraman('0,0');
  k.can = 10;
  const r = HERO.savasSonucu(50, 1);
  const h = HERO.hasarVer(k, r.hasar);
  assert.equal(h.oldu, true);
  assert.equal(k.olu, true);
  assert.equal(k.var, true,
    'kahraman KAYDI silinmemeli — hammadde ya da iksirle diriltilebilmeli');
  assert.ok(HERO.dirilt(k).ok, 'ölü kahraman diriltilebilmeli');
});
