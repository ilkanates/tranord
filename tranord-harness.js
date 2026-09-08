/**
 * TraNord — bağımlılıksız oyun motoru harness'i
 *
 * Kullanım:  node tranord-harness.js        (repo kökünden)
 *
 * server/index.js'i, socket.io'yu ve PostgreSQL'i devreye sokmadan
 * tick motorunu doğrudan oynatır. Hiçbir npm paketi gerekmez.
 *
 * Sanal saat: Date.now() her tick'te tickMs kadar ilerletilir; böylece
 * "1 tick = 1 oyun saati" varsayımı inşaat/kuyruk timer'ları için de geçerli olur.
 * (Gerçek sunucuda bu böyle DEĞİL — TEST 5 bunu gösteriyor.)
 */

const path = require('path');
const SRV = path.join(__dirname, 'server');

// ── Sanal saat ────────────────────────────────────────────────────
const REAL_NOW = Date.now.bind(Date);
let CLOCK = REAL_NOW();
Date.now = () => CLOCK;

const { createVillage } = require(path.join(SRV, 'game/villageState'));
const { processTick, getConsumptionRates, getEquipmentCap } = require(path.join(SRV, 'game/tick'));
const { simulateBattle } = require(path.join(SRV, 'game/combat'));
const { PRODUCTION_DEFS, VILLAGE_DEFS, UNIT_DEFS, EQUIPMENT_DEFS, SUR_BONUS } = require(path.join(SRV, 'data'));

// tick.js'in console.log'larını sustur
const _log = console.log;
let QUIET = false;
console.log = (...a) => { if (!QUIET || !/^\[(STARVE|EQUIPMENT|UNIT|UPGRADE)/.test(String(a[0]))) _log(...a); };

let TICK_MS = 1000;

// ── server/index.js mantığının harness kopyası ─────────────────────
function assignProd(v, k, w) {
  const b = v.productionTiles[k]; if (!b || b.upgrading) return;
  const max = PRODUCTION_DEFS[b.type].levels[b.level - 1]?.workers || 1;
  const nw = Math.min(max, w), d = nw - (b.workers || 0);
  if (d > v.freeWorkers) return; v.freeWorkers -= d; b.workers = nw;
}
function assignVil(v, k, w) {
  const b = v.villageBuildings[k]; if (!b || b.building || b.level < 1) return;
  const def = VILLAGE_DEFS[b.type]; if (!def) return;
  const max = b.level * (def.workersPerLevel || 3);
  const nw = Math.min(max, w), d = nw - (b.workers || 0);
  if (d > v.freeWorkers) return; v.freeWorkers -= d; b.workers = nw;
}
function buildSecs(t, l, w) {
  const d = VILLAGE_DEFS[t]; if (!d || w <= 0) return Infinity;
  return Math.ceil(Math.round(d.buildBaseWork * Math.pow(d.buildMultiplier, l - 1)) / w);
}
function buildVillage(v, slot, type, workers) {
  const def = VILLAGE_DEFS[type]; if (!def) return 'tanım yok';
  if (v.villageBuildings[slot]) return 'slot dolu';
  if (workers > v.freeWorkers) return 'işçi yok';
  for (const [r, a] of Object.entries(def.cost || {}))
    if ((v.resources[r] || 0) < a) return `kaynak yok (${r} ${Math.round(v.resources[r] || 0)}/${a})`;
  for (const [r, a] of Object.entries(def.cost || {})) v.resources[r] -= a;
  v.freeWorkers -= workers;
  v.villageBuildings[slot] = { type, level: 0, workers: 0, building: true,
    buildEndTime: Date.now() + buildSecs(type, 1, workers) * 1000, buildWorkers: workers };
  return `ok (${buildSecs(type, 1, workers)} tick)`;
}
function advance(v, n) {
  for (let i = 0; i < n; i++) {
    CLOCK += TICK_MS;
    processTick(v);
    const now = Date.now();
    Object.values(v.villageBuildings).forEach(b => {
      if (b.building && now >= b.buildEndTime) {
        b.level++; v.freeWorkers += b.buildWorkers;
        delete b.building; delete b.buildEndTime; delete b.buildWorkers;
      }
    });
    const ev = Object.values(v.villageBuildings).filter(b => b.type === 'ev' && !(b.building && b.level === 0));
    v.maxPopulation = 50 + ev.reduce((s, b) => s + 50 * b.level, 0);
    v.tickCount++;
    if (v.tickCount % 10 === 0 && !v.isStarving && v.population < v.maxPopulation) {
      v.population++; v.freeWorkers++;
    }
  }
}
function fullEconomy(v) {
  Object.keys(v.productionTiles).forEach(k => assignProd(v, k, 99));
  Object.entries(v.villageBuildings).forEach(([k, b]) => {
    if (VILLAGE_DEFS[b.type]?.processes) assignVil(v, k, 99);
  });
}
const RES = ['odun','kil','tas','demir','tahil','kereste','tugla','yontmaTas','demirKulce','un','ekmek'];
const head = () => '  tick | ' + RES.map(k => k.padStart(7)).join(' ') + ' | nüfus  işçi';
const row  = (v, t) => `${String(t).padStart(6)} | ` +
  RES.map(k => String(Math.round((v.resources[k] || 0) * 10) / 10).padStart(7)).join(' ') +
  ` | ${String(v.population).padStart(3)}/${String(v.maxPopulation).padEnd(3)} ${String(v.freeWorkers).padStart(3)}` +
  (v.isStarving ? '  ⚠AÇLIK' : '');

const title = s => _log(`\n${'═'.repeat(78)}\n${s}\n${'═'.repeat(78)}`);
QUIET = true;

// ══════════════════════════════════════════════════════════════════
title('TEST 1 — Yeni köy ilk tick\'te açlığa giriyor (300 tahıl cebinde dururken)');
{
  const v = createVillage();
  _log(`  başlangıç       tahil=${v.resources.tahil}  un=${v.resources.un}  ekmek=${v.resources.ekmek}`);
  advance(v, 1);
  _log(`  1 tick sonra    tahil=${v.resources.tahil}  isStarving=${v.isStarving}`);
  advance(v, 59);
  _log(`  60 tick sonra   nüfus=${v.population} (başlangıç 50)`);
  _log('\n  Sebep: processFoodConsumption yalnızca "ekmek" tüketiyor.');
  _log('  Fonksiyonun kendi yorumu "ekmek → un → ham tahıl" diyor ama fallback kodda yok.');
  _log('  Sonuç: fırına işçi atamayan her yeni oyuncu ilk 10 saniyede nüfus kaybetmeye başlar.');
}

title('TEST 2 — Tam kadro ekonomi: 300 tick');
{
  const v = createVillage(); fullEconomy(v);
  _log(`  atama sonrası boşta kalan işçi: ${v.freeWorkers}/50`);
  _log(head());
  for (const t of [1, 5, 10, 25, 50, 100, 300]) { advance(v, t - v.tickCount); _log(row(v, t)); }
  _log('\n  • Ham maddeler kalıcı olarak 0: işleme binaları (3 işçi × 8/sa = 24/sa) üretim');
  _log('    tile\'larını (1 işçi × 7/sa) 3 katı hızda tüketiyor. Ham depo hiç dolmuyor,');
  _log('    dolayısıyla hammaddeDepo binası pratikte işlevsiz.');
  _log('  • Ekmek granary tavanında (150) sabitleniyor, fazla tahıl ziyan oluyor.');
  _log(`  • ${v.freeWorkers} işçi kalıcı olarak boşta — L1 tile başına max 1 işçi sınırı yüzünden.`);
}

title('TEST 3 — İlerleme: depo + ev inşası');
{
  const v = createVillage(); fullEconomy(v); advance(v, 30);
  _log(`  t=30  kereste=${Math.round(v.resources.kereste)} tugla=${Math.round(v.resources.tugla)} yontmaTas=${Math.round(v.resources.yontmaTas)}`);
  _log('  inşa denemeleri:');
  for (const [slot, type] of [['2,0','hammaddeDepo'], ['2,-2','islenmisMalDepo'], ['-2,0','granary'], ['1,1','ev']])
    _log(`    ${type.padEnd(16)} @${slot.padEnd(6)} → ${buildVillage(v, slot, type, 5)}`);
  advance(v, 260);
  _log(`\n  t=290 ${RES.slice(5,9).map(k => `${k}:${Math.round(v.resources[k])}`).join(' ')}`);
  _log(`        nüfus ${v.population}/${v.maxPopulation}, boş işçi ${v.freeWorkers}`);
  _log('\n  Not: iki depo kereste stokunu 20\'ye düşürdüğü için "ev" aynı turda kurulamıyor');
  _log('  → nüfus 50\'de kilitli kalıyor. Sıralama oyuncuya net anlatılmalı.');
}

title('TEST 4 — Asker eğitimi: köylü askere gidiyor ama nüfustan düşmüyor');
{
  const v = createVillage(); fullEconomy(v); advance(v, 40);
  v.villageBuildings['2,0']  = { type: 'silahci', level: 3, workers: 3 };
  v.villageBuildings['-2,0'] = { type: 'kisla',   level: 3, workers: 3 };
  v.villageBuildings['-2,2'] = { type: 'cephane', level: 3, workers: 0 };
  v.freeWorkers -= 6;
  v.equipmentQueues.silahci.push({ id: 1, type: 'kilic', total: 20, remaining: 20, waiting: true, startTime: null, endTime: null });
  advance(v, 40);
  _log(`  ekipman üretimi → kılıç ${v.equipment.kilic} (cephanelik tavanı ${getEquipmentCap(v, 'kilic')})`);
  const pop0 = v.population, free0 = v.freeWorkers;
  v.unitQueues.kisla.push({ id: 1, type: 'fjordvakt', total: 10, remaining: 10, waiting: true, startTime: null, endTime: null, workerReserved: false });
  advance(v, 60);
  const c = getConsumptionRates(v);
  _log(`  ordu ${JSON.stringify(v.army)}`);
  _log(`  nüfus ${pop0} → ${v.population}   |   boş işçi ${free0} → ${v.freeWorkers}`);
  _log(`  tüketim: köylü ${c.villagers}×3/gün + asker ${c.soldiers}×6/gün = ${c.foodPerHour}/sa`);
  _log('\n  BUG: freeWorkers düşüyor ama population düşmüyor. Aynı kişi hem köylü hem asker');
  _log('  sayıldığı için asker günde 3+6 = 9 yiyecek tüketiyor. Beklenen: 6.');
  _log('  Düzeltme: processUnitQueues içinde army[type]++ ile birlikte village.population--.');
}

title('TEST 5 — İki ayrı saat: hız ayarı üretimi hızlandırıyor, timer\'ları hızlandırmıyor');
{
  for (const ms of [1000, 100]) {
    TICK_MS = ms; CLOCK = REAL_NOW();
    const v = createVillage(); fullEconomy(v); advance(v, 40);
    v.villageBuildings['2,0'] = { type: 'silahci', level: 3, workers: 3 };
    v.villageBuildings['-2,2'] = { type: 'cephane', level: 3, workers: 0 };
    v.freeWorkers -= 3;
    v.equipmentQueues.silahci.push({ id: 1, type: 'kilic', total: 60, remaining: 60, waiting: true, startTime: null, endTime: null });
    advance(v, 100);
    _log(`  tickMs=${String(ms).padStart(4)} (${String(1000/ms).padStart(2)}× hız) → 100 tick'te kılıç: ${v.equipment.kilic}`);
  }
  TICK_MS = 1000;
  _log('\n  Aynı sayıda tick, farklı sonuç: üretim/tüketim tick sayar, inşaat ve kuyruk');
  _log('  timer\'ları Date.now() sayar. Hız kaydırıcısı 10×\'a çekilince kaynaklar 10× hızlanıyor,');
  _log('  inşaat ve ekipman üretimi hızlanmıyor. Ayrıca set_speed client\'tan sınırsız →');
  _log('  çok oyunculuda doğrudan hile. Timer\'ları tick sayısına bağlamak bunu tek hamlede çözer.');
}

title('TEST 6 — Savaş formülü');
{
  const units = Object.entries(UNIT_DEFS).filter(([, d]) => d.category !== 'kusatma');
  const piyade = units.filter(([, d]) => d.category === 'piyade');
  _log(`  birim havuzu: ${piyade.length} piyade, ${units.length - piyade.length} süvari`);
  const A = piyade[0][0], D = piyade[1][0];
  _log(`  saldıran: ${A} ${JSON.stringify(UNIT_DEFS[A].stats)}`);
  _log(`  savunan:  ${D} ${JSON.stringify(UNIT_DEFS[D].stats)}\n`);
  const cases = [
    ['eşit sayı, sursuz',   { [A]: 100 },  { [D]: 100 }, 0,  0],
    ['eşit sayı, sur 20',   { [A]: 100 },  { [D]: 100 }, 20, 20],
    ['2× sayı üstünlüğü',   { [A]: 200 },  { [D]: 100 }, 0,  0],
    ['5× sayı üstünlüğü',   { [A]: 500 },  { [D]: 100 }, 0,  0],
    ['10× sayı üstünlüğü',  { [A]: 1000 }, { [D]: 100 }, 0,  0],
    ['boş köy + sur 20',    { [A]: 10 },   {},           20, 20]
  ];
  for (const [label, a, d, s, h] of cases) {
    const r = simulateBattle(a, d, { surLevel: s, hendekLevel: h });
    _log(`  ${label.padEnd(20)} atk ${String(r.attackTotal).padStart(6)} vs def ${String(r.defenseTotal).padStart(8)}` +
         `  → ${r.winner.padEnd(8)} kayıp  saldıran %${(r.attackerLossRate*100).toFixed(1).padStart(5)}  savunan %${(r.defenderLossRate*100).toFixed(1)}`);
  }
  const raid = simulateBattle({ [A]: 200 }, { [D]: 100 }, { mode: 'raid' });
  _log(`  ${'yağma (2× üstünlük)'.padEnd(20)} → kayıp  saldıran %${(raid.attackerLossRate*100).toFixed(1)}  savunan %${(raid.defenderLossRate*100).toFixed(1)}`);
  _log(`\n  Sur tavanı: L20 → %${SUR_BONUS[20]} + hendek %${(SUR_BONUS[20]/2).toFixed(1)} = %${(SUR_BONUS[20]*1.5).toFixed(1)}`);
  const stats = units.map(([, d]) => d.stats);
  const avgAtk = (stats.reduce((s, x) => s + x.saldiri, 0) / stats.length).toFixed(1);
  const avgDef = (stats.reduce((s, x) => s + x.yayaSav, 0) / stats.length).toFixed(1);
  _log(`  • Tablo genelinde ortalama saldırı ${avgAtk}, ortalama yaya savunma ${avgDef}`);
  _log('    → eşit sayıda birimle savunan kazanıyor; saldırganın ~2× sayıya, sur 20\'de ~4×\'e');
  _log('    ihtiyacı var. Bu Travian mantığıyla uyumlu, ama sur bonusu üstüne geliyor.');
  _log('  • KAYIP MODELİ: kaybeden taraf normal modda %100 siliniyor — kısmi kayıp yok.');
  _log('    Kirilloid üsteli yalnızca kazananın kaybını yumuşatıyor. Yağma modu %50\'ye çekiyor.');
  _log('    Gerçek Travian\'da kaybeden de güç oranına göre kısmen sağ kalır; şu haliyle');
  _log('    tek bir başarısız savunma tüm orduyu yok ediyor.');
}

_log('\n' + '─'.repeat(78));
_log('Özet: 1) yeni köy anında açlıkta  2) ham madde depoları işlevsiz  3) asker çifte yiyor');
_log('      4) üretim tick, timer\'lar gerçek saat  5) eşit güçte savunan kazanıyor');
_log('─'.repeat(78));
