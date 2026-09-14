/**
 * DENGE PAKETİ — dış denge raporunun uygulanan maddeleri.
 *
 * Bu dosya tek tek sayıları değil, maddelerin KURDUĞU İLİŞKİYİ
 * kilitliyor. Sayılar ileride elbette ayarlanacak; ilişki bozulursa
 * paket amacını kaybeder ve bunu ancak aylar sonra oyunda fark ederiz.
 */
const test = require('node:test');
const assert = require('node:assert');

const { UNIT_DEFS, EQUIPMENT_DEFS, VILLAGE_DEFS, PRODUCTION_DEFS, BASE_STATS } = require('../data');
const { birimYemi } = require('../game/tick');
const { moralBonusPct, MORAL_TAVAN } = require('../game/combat');
const { eksikOnKosullar } = require('../game/insaat');
const { createVillage } = require('../game/villageState');
const K = require('../game/koyKurallari');

/** Tahıl bol olduğu için 0,25 ağırlıkla sayılıyor — rapordaki ölçüt */
const TAHIL_AGIRLIK = 0.25;
const kaynakAgirligi = (cost) => Object.entries(cost)
  .reduce((s, [r, v]) => s + v * (r === 'tahil' ? TAHIL_AGIRLIK : 1), 0);

const birimKaynagi = (key) => (UNIT_DEFS[key].equipment || [])
  .reduce((s, eq) => s + kaynakAgirligi(EQUIPMENT_DEFS[eq].cost), 0);

const birimStati = (key) => {
  const s = UNIT_DEFS[key].stats;
  return s.saldiri + s.yayaSav + s.atliSav;
};

/** Ekipmandan türeyen, kademeli normal birimler (izci ve kuşatma hariç) */
const NORMAL = Object.keys(UNIT_DEFS)
  .filter(k => !UNIT_DEFS[k].statSabit && (UNIT_DEFS[k].equipment || []).length > 0);

// ══ MADDE 5 — ekipman stat/kaynak dengesi ═════════════════════════
test('her ekipman kaynak başına yakın stat veriyor', () => {
  /*
    Eskiden kılıç 4,00 · zırh 1,20 idi: zırh kılıcın ÜÇTE BİRİ kadar
    verimliydi ve üstelik en uzun süren ekipmandı. Zırh giymek hiçbir
    koşulda mantıklı olmayınca zırh taşıyan bütün üst kademe birimler
    de mantıksız oluyordu.
  */
  const oranlar = [];
  for (const [k, e] of Object.entries(EQUIPMENT_DEFS)) {
    if (k === 'koc_basi' || k === 'mancinik') continue;   // kuşatma ayrı denge
    const stat = e.saldiri + e.yayaSav + e.atliSav;
    oranlar.push([k, stat / kaynakAgirligi(e.cost)]);
  }
  const en = Math.max(...oranlar.map(o => o[1]));
  const az = Math.min(...oranlar.map(o => o[1]));
  assert.ok(en / az < 1.15,
    'ekipmanlar arası verim farkı açılmış: '
      + oranlar.map(([k, o]) => `${k}=${o.toFixed(2)}`).join(' · '));
});

// ══ MADDE 6 — set bonusu ══════════════════════════════════════════
test('birim statı ekipman toplamı × set bonusu', () => {
  for (const key of NORMAL) {
    const def = UNIT_DEFS[key];
    const n = def.equipment.length;
    const beklenen = { ...BASE_STATS };
    for (const eq of def.equipment) {
      const e = EQUIPMENT_DEFS[eq];
      beklenen.saldiri += e.saldiri; beklenen.yayaSav += e.yayaSav;
      beklenen.atliSav += e.atliSav;
    }
    const kat = 1 + 0.04 * (n - 1);
    assert.equal(def.stats.saldiri, Math.round(beklenen.saldiri * kat), key + '.saldiri');
    assert.equal(def.stats.yayaSav, Math.round(beklenen.yayaSav * kat), key + '.yayaSav');
    assert.equal(def.stats.atliSav, Math.round(beklenen.atliSav * kat), key + '.atliSav');
  }
});

// ══ MADDE 6 + 7 — ÇİFT PARA BİRİMİ KROSSOVERİ ═════════════════════
test('kaynak başına ucuz birim, tahıl başına pahalı birim önde', () => {
  /*
    DENGENİN ASIL TESTİ BU. İki eksen ZIT yönde sıralanmalı:
      · kaynak başına en iyi  → EN AZ ekipmanlı birim (erken oyun)
      · ekmek başına en iyi   → EN ÇOK ekipmanlı birim (geç oyun)
    Aynı yöne dönerlerse kademe sistemi anlamını kaybeder: ya ucuz
    birim her şeyi yener (eski hâli) ya da pahalı birim (set bonusu
    tek başına uygulanırsa).
  */
  const veri = NORMAL.map(k => ({
    k, n: UNIT_DEFS[k].equipment.length,
    sk: birimStati(k) / birimKaynagi(k),
    se: birimStati(k) / birimYemi(k),
  }));

  const enKaynak = veri.reduce((a, b) => (b.sk > a.sk ? b : a));
  const enEkmek = veri.reduce((a, b) => (b.se > a.se ? b : a));

  assert.equal(enKaynak.n, 1,
    `kaynak başına en verimli birim tek ekipmanlı olmalı, ${enKaynak.k} (n=${enKaynak.n}) çıktı`);
  assert.ok(enEkmek.n >= 3,
    `ekmek başına en verimli birim üst kademe olmalı, ${enEkmek.k} (n=${enEkmek.n}) çıktı`);

  // Jernridder, Fjordvakt'tan tahıl başına belirgin şekilde güçlü olmalı
  const ucuz = veri.find(v => v.k === 'fjordvakt');
  const pahali = veri.find(v => v.k === 'jernridder');
  const fark = pahali.se / ucuz.se - 1;
  assert.ok(fark > 0.5 && fark < 0.8,
    `tahıl ekseni avantajı %65 civarında olmalı, %${Math.round(fark * 100)} çıktı`);
  assert.ok(ucuz.sk > pahali.sk, 'kaynak ekseninde ucuz birim önde kalmalı');
});

test('asker yemeği ekipman sayısıyla artıyor ama güçten yavaş', () => {
  assert.equal(birimYemi('fjordvakt'), 6);
  assert.equal(birimYemi('skjoldvakt'), 8);
  assert.equal(birimYemi('ulvSavasci'), 10);
  assert.equal(birimYemi('jernridder'), 12);

  const gucOrani = birimStati('jernridder') / birimStati('fjordvakt');
  const yemOrani = birimYemi('jernridder') / birimYemi('fjordvakt');
  assert.ok(gucOrani > yemOrani,
    'güç yemekten hızlı artmalı, yoksa üst kademeye geçmenin anlamı kalmaz');
});

// ══ MADDE 7 — tahıl gerçek bir fren mi ════════════════════════════
test('bir tarla işçisi makul sayıda asker besliyor', () => {
  /*
    Eskiden 1 tarla işçisi 77 asker besliyordu (Travian karşılığı ~5-10)
    ve ordunun hiçbir üst sınırı yoktu. Zincir: 90 tahıl → 72 un → 54
    ekmek, yani 1 ekmek 1,667 tahıl.
  */
  const tahilSaat = PRODUCTION_DEFS.tahil.baseProductionPerWorker;
  const tahilGun = tahilSaat * 24;
  const un = VILLAGE_DEFS.degirmen.processes;
  const ekmekFirini = VILLAGE_DEFS.firin.processes;
  const ekmekGun = tahilGun
    * (un.outputPerHour / un.inputPerHour)
    * (ekmekFirini.outputPerHour / ekmekFirini.inputPerHour);

  const ucuzAsker = ekmekGun / birimYemi('fjordvakt');
  const pahaliAsker = ekmekGun / birimYemi('jernridder');
  assert.ok(ucuzAsker < 45,
    `1 tarla işçisi ${Math.round(ucuzAsker)} ucuz asker besliyor — fren yok demek`);
  assert.ok(pahaliAsker > 10 && pahaliAsker < 25,
    `1 tarla işçisi ${Math.round(pahaliAsker)} Jernridder besliyor — aralık dışı`);
});

// ══ MADDE 13 — fren tarlada olmalı, işleme binasında değil ════════
test('işleme binası tarlayı boğmuyor', () => {
  /*
    Ölçüm (eski): Orman Lvl 20 = 42 × 22 = 924 odun/sa, Keresteci Lvl 20
    = 100 × 8 = 800 odun/sa. MAX işleme binası tek bir MAX tarlayı bile
    yetiştiremiyordu; odun zincirinde işçilerin %73'ü keresteci'deydi.
  */
  const cift = [
    ['odun', 'keresteci'], ['kil', 'tuglaci'], ['tas', 'tasci'],
    ['demir', 'demirci'], ['tahil', 'degirmen'],
  ];
  for (const [tarla, bina] of cift) {
    const p = PRODUCTION_DEFS[tarla];
    const tarlaIsci = p.levels[19].workers;
    const tarlaCikti = tarlaIsci * p.baseProductionPerWorker;
    const islemeIsci = tarlaCikti / VILLAGE_DEFS[bina].processes.inputPerHour;
    const oran = islemeIsci / tarlaIsci;
    assert.ok(oran < 0.5,
      `${bina}: 1 tarla işçisine ${oran.toFixed(2)} işleme işçisi düşüyor — fren yanlış yerde`);
  }
});

// ══ MADDE 4 — ön koşul ağacı ═════════════════════════════════════
test('yeni köyde saray kurulamaz, sur kurulabilir', () => {
  const v = createVillage(0, 0);
  assert.ok(eksikOnKosullar(v, 'saray').length, 'ilk günden saray dikilebiliyor');
  assert.ok(eksikOnKosullar(v, 'kisla').length, 'kışla Rún Salonu istemeli');
  assert.equal(eksikOnKosullar(v, 'sur').length, 0, 'sur ana bina Lvl 1 ile açık olmalı');
});

test('ön koşul ağacında döngü yok', () => {
  /*
    Bir döngü (A → B → A) o iki binayı SONSUZA KADAR kilitler ve hata
    hiçbir yerde görünmez: oyuncu ikisini de kuramaz, sebep olarak da
    birbirlerini görür.
  */
  const cozulen = new Set();
  let ilerledi = true;
  while (ilerledi) {
    ilerledi = false;
    for (const [tip, d] of Object.entries(VILLAGE_DEFS)) {
      if (cozulen.has(tip)) continue;
      const gerekli = (d.requires || []).every(k => {
        if (k.tarla) return true;                        // tarlalar ön koşulsuz
        if (k.biri) return k.biri.some(t => cozulen.has(t));
        return cozulen.has(k.tip);
      });
      if (gerekli) { cozulen.add(tip); ilerledi = true; }
    }
  }
  const kilitli = Object.keys(VILLAGE_DEFS).filter(t => !cozulen.has(t));
  assert.deepEqual(kilitli, [], 'bu binalara hiçbir sırayla ulaşılamıyor: ' + kilitli.join(', '));
});

// ══ MADDE 12 — moral bonusu ══════════════════════════════════════
test('moral bonusu ezileni koruyor, küçük saldırganı cezalandırmıyor', () => {
  assert.equal(moralBonusPct(100, 100), 0, 'eşit nüfusta moral olmamalı');
  assert.equal(moralBonusPct(100, 500), 0, 'küçük saldıran ceza almamalı');
  assert.ok(moralBonusPct(200, 100) > 10, 'iki katı büyük saldırgana karşı bonus olmalı');
  assert.equal(moralBonusPct(100000, 100), MORAL_TAVAN, 'tavan aşılmamalı');
  // Eğri monoton: büyüdükçe bonus artmalı
  let onceki = -1;
  for (const a of [100, 150, 300, 600, 1200]) {
    const b = moralBonusPct(a, 100);
    assert.ok(b >= onceki, 'moral eğrisi monoton olmalı');
    onceki = b;
  }
});

// ══ MADDE 14 — nüfus büyüme freni ════════════════════════════════
test('boş işçi birikince büyüme duruyor, işe koşunca açılıyor', () => {
  const v = createVillage(0, 0);
  v.freeWorkers = 1000;
  assert.equal(K.buyumeCarpani(v), 0, 'binlerce boş işçi varken köy büyümemeli');
  v.freeWorkers = 0;
  assert.equal(K.buyumeCarpani(v), 1, 'herkes işteyken büyüme tam hızda olmalı');
  // Tampon kapasiteyle ölçekleniyor: büyük köyde daha çok boşa izin var
  const kucukTampon = K.isciTamponu(v);
  for (const t of Object.values(v.productionTiles)) t.level = 20;
  assert.ok(K.isciTamponu(v) > kucukTampon, 'tampon kapasiteyle büyümeli');
});

// ══ MADDE 15 — kademe kapısı ═════════════════════════════════════
test('eğitim binası seviyesi ekipman sayısının kapısı', () => {
  /*
    İlkan: *"Lvl 10 binalarla max basılsın"* — kademe tam Lvl 10'da
    bitiyor: 1 ekipman Lvl 1, 2 → Lvl 4, 3 → Lvl 7, 4 → Lvl 10.
  */
  for (const [k, u] of Object.entries(UNIT_DEFS)) {
    if (u.category === 'kusatma' || u.category === 'gocmen') continue;
    const n = (u.equipment || []).length;
    const beklenen = Math.max(1, 1 + 3 * (n - 1));
    assert.equal(u.minLevel, beklenen,
      `${k}: ${n} ekipman için Lvl ${beklenen} bekleniyordu, ${u.minLevel} yazılı`);
  }
  assert.equal(UNIT_DEFS.jernridder.minLevel, 10, 'Jernridder Ahır Lvl 10 istemeli');
});

test('HER birim gerçekten araştırılabiliyor — Rún Salonu tavanı aşılmıyor', () => {
  /*
    GERÇEK BİR HATANIN KİLİDİ, ve pahalı bir dersin.

    `research` alanı `minLevel`den TÜRETİLİYOR. Kademe kapısı 5×n
    yapıldığında altı birimin araştırma seviyesi 15 ve 20'ye çıktı ama
    Rún Salonu'nun tavanı Lvl 10: Ulv Savaşçısı, Skjoldreiter, Buz
    Süvarisi, Stormridder ve Jernridder HİÇ araştırılamaz oldu — zor
    değil, imkânsız. Oyuncu bunu oyunda fark etti, test etmedi.

    Önceki test yalnız "minLevel kurala uyuyor mu" diye bakıyordu, yani
    KURALI kilitliyordu ama SONUCUNU değil. Bu test sonucu kilitliyor:
    bir birimin kapısı, o kapıyı açan binanın tavanını geçemez.
  */
  const salonTavani = VILLAGE_DEFS.runSalonu.maxLevel;
  const ulasilmaz = [];
  for (const [k, u] of Object.entries(UNIT_DEFS)) {
    if (u.research && u.research.level > salonTavani) {
      ulasilmaz.push(`${k} → Rún Salonu Lvl ${u.research.level} (tavan ${salonTavani})`);
    }
    const bina = Array.isArray(u.trainedAt) ? u.trainedAt[0] : u.trainedAt;
    const binaTavani = VILLAGE_DEFS[bina]?.maxLevel;
    if (binaTavani && u.minLevel > binaTavani) {
      ulasilmaz.push(`${k} → ${bina} Lvl ${u.minLevel} (tavan ${binaTavani})`);
    }
  }
  assert.deepEqual(ulasilmaz, [],
    'bu birimler hiç eğitilemez:\n  ' + ulasilmaz.join('\n  '));
});

test('ahır at deposu günlük üretimi taşıyabiliyor', () => {
  /*
    Lvl 20 ahır günde ~360 at üretiyor; eski 100'lük depo 6,7 saatte
    dolup üretimi durduruyordu.
  */
  assert.ok(VILLAGE_DEFS.ahir.horseCapPerLevel * 20 >= 360,
    'ahır deposu günlük at üretiminden küçük');
});
