/**
 * KEŞİF DÜELLOSU — casus sayısı belirleyici, yalnız kule söz sahibi.
 *
 * Oyuncunun bildirdiği hata: köyüne 5 izci geldi, savunmada 2 izci vardı
 * ve saldıran hiçbir şey göremedi. Sebebi iki katmanlıydı:
 *   1) İzcinin savunması (30) saldırısının (10) ÜÇ KATIydı — 5 izci (50)
 *      2 izciye (60) yeniliyordu.
 *   2) Üstüne sur + hendek + kule bonusu biniyordu.
 * Ölçülmüştü: savunanda 5 izci + Lvl 10 sur varken keşfi geçmek 23 izci
 * istiyordu.
 *
 * Yeni kural: izci 10/10 (savunmada güçlü değil), keşifte sur ve hendek
 * işlemiyor, YALNIZ kule bonus veriyor — içinde okçu olan, gece gözcülük
 * yapan tek yapı o.
 */
const test = require('node:test');
const assert = require('node:assert');
const { simulateBattle } = require('../game/combat');
const { UNIT_DEFS } = require('../data');

const izci = (n) => ({ kuzeyIzcisi: n });

test('izcinin savunması saldırısına eşit (10/10)', () => {
  const s = UNIT_DEFS.kuzeyIzcisi.stats;
  assert.equal(s.saldiri, 10);
  assert.equal(s.yayaSav, 10, 'izci savunmada üç kat güçlü olmamalı');
  assert.equal(s.atliSav, 10);
});

test('5 casus 2 casusu yener', () => {
  const r = simulateBattle(izci(5), izci(2), { mode: 'scout' });
  assert.equal(r.winner, 'attacker',
    `5 izci 2 izciye yenildi (saldırı ${r.attackTotal}, savunma ${r.defenseTotal})`);
});

test('sur ve hendek keşfi engellemez — casus duvardan atlar', () => {
  const susuz = simulateBattle(izci(5), izci(2), { mode: 'scout' });
  const surlu = simulateBattle(izci(5), izci(2), {
    mode: 'scout', surLevel: 20, hendekLevel: 20,
  });
  assert.equal(surlu.winner, 'attacker', 'Lvl 20 sur keşfi durduruyor');
  assert.equal(surlu.defenseTotal, susuz.defenseTotal,
    'keşifte sur/hendek savunmaya eklenmemeli');
  assert.equal(surlu.wallBonusPct, 0, 'sur/hendek raporda da 0 görünmeli');
});

test('KULE keşfe karşı işler', () => {
  const kulesiz = simulateBattle(izci(5), izci(2), { mode: 'scout' });
  const kuleli = simulateBattle(izci(5), izci(2), { mode: 'scout', kulePct: 60 });
  assert.ok(kuleli.defenseTotal > kulesiz.defenseTotal,
    'kule bonusu keşif savunmasına eklenmemiş');
  assert.equal(kuleli.wallBonusPct, 60, 'raporda kule bonusu görünmeli');
});

test('yeterince kule keşfi durdurabilir', () => {
  // 5 izci = 50 saldırı, 2 izci = 20 savunma → durdurmak için +150% gerek
  const az = simulateBattle(izci(5), izci(2), { mode: 'scout', kulePct: 100 });
  assert.equal(az.winner, 'attacker', '%100 kule 5 izciyi durdurmamalı');
  const cok = simulateBattle(izci(5), izci(4), { mode: 'scout', kulePct: 100 });
  assert.equal(cok.winner, 'defender', '4 izci + %100 kule 5 izciyi durdurmalı');
});

test('az casusla çok casusa gidilmez', () => {
  const r = simulateBattle(izci(2), izci(5), { mode: 'scout' });
  assert.equal(r.winner, 'defender');
  assert.equal(r.attackerLosses.kuzeyIzcisi, 2, 'kaybeden izciler ölür');
});

test('savunmada casus yoksa keşif kayıpsız geçer', () => {
  const r = simulateBattle(izci(1), {}, { mode: 'scout' });
  assert.equal(r.winner, 'attacker');
  assert.equal(r.attackerLosses.kuzeyIzcisi || 0, 0, 'boş köyde izci ölmemeli');
});

test('kazanan da kayıp verir — yakın sayıda daha çok', () => {
  const acik = simulateBattle(izci(20), izci(2), { mode: 'scout' });
  const yakin = simulateBattle(izci(5), izci(4), { mode: 'scout' });
  const oranAcik = (acik.attackerLosses.kuzeyIzcisi || 0) / 20;
  const oranYakin = (yakin.attackerLosses.kuzeyIzcisi || 0) / 5;
  assert.equal(acik.winner, 'attacker');
  assert.equal(yakin.winner, 'attacker');
  assert.ok(oranYakin > oranAcik,
    `yakın savaş daha ucuza gelmiş (yakın %${(oranYakin * 100).toFixed(0)}, açık %${(oranAcik * 100).toFixed(0)})`);
});

test('NORMAL savaşta sur hâlâ işliyor — keşif düzeltmesi onu bozmadı', () => {
  const susuz = simulateBattle({ fjordvakt: 100 }, { fjordvakt: 20 }, { mode: 'normal' });
  const surlu = simulateBattle({ fjordvakt: 100 }, { fjordvakt: 20 }, {
    mode: 'normal', surLevel: 20, hendekLevel: 20, kulePct: 50,
  });
  assert.ok(surlu.defenseTotal > susuz.defenseTotal,
    'normal savaşta sur bonusu kaybolmuş');
});
