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

/**
 * KEŞİF GİZLİ GELİR — savunan yolda olan casusu GÖRMEMELİ.
 *
 * Gelen sefer uyarısı keşifleri de listeliyordu: oyuncu casusun yolda
 * olduğunu görüp izcilerini toplayabiliyordu. Casusluğun tamamı sürprize
 * dayanır; yaklaşan casusu görmek onu anlamsız kılar.
 */
test('yoldaki casus savunanın uyarı listesinde çıkmaz', () => {
  const { userSessions, WORLD } = require('../durum');
  const { incomingMarchesFor, gelenSeferSayilari } = require('../game/seferTakip');

  const koy = {
    marches: [
      { id: 'a', phase: 'outbound', mode: 'scout', toKey: '1,1', fromKey: '0,0',
        fromName: 'Casus Köyü', units: { kuzeyIzcisi: 5 }, remainingHours: 2 },
      { id: 'b', phase: 'outbound', mode: 'raid', toKey: '1,1', fromKey: '0,0',
        fromName: 'Yağmacı', units: { fjordvakt: 50 }, remainingHours: 2 },
      { id: 'c', phase: 'outbound', mode: 'yerlesim', toKey: '1,1', fromKey: '0,0',
        fromName: 'Göçmen', units: { gocmen: 3 }, remainingHours: 2 },
    ],
  };
  const oturum = { villages: new Map([['0,0', koy]]), dirtySlots: new Set() };
  userSessions.set(999, oturum);
  try {
    const gelen = incomingMarchesFor('1,1');
    assert.deepEqual(gelen.map((m) => m.mode), ['raid'],
      'yalnız saldırı görünmeli; casus ve göçmen listede olmamalı');

    const say = gelenSeferSayilari(new Set(['1,1']));
    assert.equal(say.get('1,1'), 1, 'sayaç da yalnız saldırıyı saymalı');
  } finally {
    userSessions.delete(999);
    WORLD.npcs.clear?.();
  }
});

/**
 * BAŞARILI KEŞFİN RAPORU — kayıp ve karşı izci sayısı YAZILI olmalı.
 *
 * İlkan bildirdi: *"keşife adam yolladım ama çoğu gelmedi ve raporda
 * kaçı öldü ya da karşıda kaç keşifçi vardı yazmıyor"*. Sunucu bu
 * alanları gönderiyordu, ekran göstermiyordu; bu test sunucu tarafını
 * kilitliyor ki kayıp bilgisi ilerde sessizce düşmesin.
 */
test('başarılı keşif raporu kaybı ve karşı izci sayısını taşıyor', () => {
  const ARMY = require('../game/army');
  const { createVillage } = require('../game/villageState');

  const saldiran = createVillage(0, 0);
  const hedef = createVillage(4, 4);
  // Savunanda izci VAR: çarpışma olsun ve saldıran kayıp versin
  hedef.army = { kuzeyIzcisi: 6 };
  saldiran.army = {};

  const m = {
    id: 7, mode: 'scout', units: { kuzeyIzcisi: 60 }, distance: 3,
    phase: 'outbound', legHours: 1, remainingHours: 0,
    fromKey: '0,0', fromName: 'A', toKey: '4,4', toName: 'B',
  };
  ARMY.resolveArrival(m, saldiran, hedef, { targetName: 'B' });

  const r = (saldiran.reports || []).find(x => x.dir === 'out');
  assert.ok(r, 'saldırana rapor düşmeli');
  assert.equal(r.outcome, 'kesif', 'bu güçle keşif geçmeli');
  assert.ok(r.intel, 'başarılı keşifte istihbarat olmalı');

  const kayip = Object.values(r.myLosses || {}).reduce((a, b) => a + b, 0);
  assert.ok(kayip > 0, 'altı izciye karşı kayıpsız geçilmemeli — test anlamlı olsun');
  assert.equal(r.savunanIzci, 6, 'karşıda kaç izci olduğu yazılı olmalı');
  assert.equal(r.karsiIzci, 6, 'eski alan adı da korunmalı (eski raporlar bozulmasın)');

  /*
    DÖNEN İZCİ SAYISI kayıpla tutarlı olmalı: oyuncu "çoğu gelmedi"
    derken sefere kalan birlikten bahsediyor.
  */
  const donen = Object.values(m.units || {}).reduce((a, b) => a + b, 0);
  assert.equal(donen, 60 - kayip, 'dönen sefer gönderilen eksi kayıp olmalı');
  assert.equal(m.phase, 'return');
});

test('savunmasız köye keşifte çarpışma bilgisi SIFIR', () => {
  // Karşıda izci yoksa çarpışma da yok; ekran o zaman kayıp kutusu
  // göstermemeli (istemci kesifCarpismasi ile bunu ayırıyor).
  const ARMY = require('../game/army');
  const { createVillage } = require('../game/villageState');
  const saldiran = createVillage(0, 0);
  const hedef = createVillage(4, 4);
  hedef.army = { fjordvakt: 500 };            // izci YOK, normal ordu var

  const m = {
    id: 8, mode: 'scout', units: { kuzeyIzcisi: 3 }, distance: 3,
    phase: 'outbound', legHours: 1, remainingHours: 0,
    fromKey: '0,0', fromName: 'A', toKey: '4,4', toName: 'B',
  };
  ARMY.resolveArrival(m, saldiran, hedef, { targetName: 'B' });

  const r = (saldiran.reports || []).find(x => x.dir === 'out');
  assert.equal(r.outcome, 'kesif');
  assert.equal(r.savunanIzci, 0, 'karşıda izci yoktu');
  assert.equal(Object.values(r.myLosses || {}).reduce((a, b) => a + b, 0), 0,
    'izcisiz köyde kayıp olmamalı');
  assert.equal((hedef.reports || []).length, 0,
    'izcisi olmayan köy keşfedildiğini fark etmemeli');
});

/**
 * İZCİNİN ROLÜ YÜKÜNDEN TÜRETİLMİYOR — gerçek bir hatanın kilidi.
 *
 * SCOUT_UNITS bir zamanlar "kapasite >= 100 && saldiri <= 10" diye
 * hesaplanıyordu. Denge düzeltmesinde izcinin yükü 110'dan 0'a
 * indirilince izci bu kümeden düştü ve KEŞİF TAMAMEN BOZULDU: keşif
 * seferi hiç gönderilemiyordu. Artık rol tanımdaki `kesif` bayrağından
 * geliyor; bu test bayrağın yerinde durduğunu ve yükten bağımsız
 * olduğunu kilitliyor.
 */
test('keşif birimi yükünden değil kesif bayrağından tanınır', () => {
  const { UNIT_DEFS } = require('../data');

  const izci = UNIT_DEFS.kuzeyIzcisi;
  assert.equal(izci.kesif, true, 'Kuzey İzcisi keşif birimi olarak işaretli olmalı');
  assert.equal(izci.stats.kapasite, 0,
    'İzci ganimet taşımaz — en ucuz, en hızlı ve en çok taşıyan birim aynı anda olamaz');

  const kesifciler = Object.entries(UNIT_DEFS)
    .filter(([, d]) => d.kesif === true).map(([k]) => k);
  assert.deepEqual(kesifciler, ['kuzeyIzcisi'],
    'keşif birimi listesi beklenmedik şekilde değişmiş');

  // Ve gerçekten gönderilebiliyor mu: kabul kapısı ROL'e bakmalı
  const ARMY = require('../game/army');
  const { createVillage } = require('../game/villageState');
  const saldiran = createVillage(0, 0);
  saldiran.army = { kuzeyIzcisi: 5 };
  const sonuc = ARMY.createMarch(saldiran, {
    mode: 'scout', units: { kuzeyIzcisi: 5 }, distance: 3,
    fromKey: '0,0', fromName: 'A', toKey: '4,4', toName: 'B',
  });
  assert.ok(sonuc?.ok !== false,
    'yükü 0 olan izciyle keşif gönderilebilmeli: ' + (sonuc && sonuc.reason));
});
