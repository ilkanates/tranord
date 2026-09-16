/**
 * DENGE EĞRİSİ — maliyet ve süre aynı hızda büyüyor mu, depoya sığıyor mu?
 *
 * Eskiden süre çarpanı beş aileye (1,40–2,00), maliyet çarpanı üç aileye
 * (1,25 / 1,60 / 1,70) dağılmıştı ve ikisi birbirini tutmuyordu. Somut
 * sonuçları şunlardı:
 *
 *   · Sur Lvl 19→20 tek işçiyle 24,9 YIL sürüyordu.
 *   · Saray'ın Lvl 10→11 maliyeti (32.019 tuğla) MAKSİMUM DEPODAN büyüktü,
 *     yani kaynak hiç biriktirilemiyor ve bina orada duruyordu. On bir
 *     binanın gerçek tavanı Lvl 11–15 arasındaydı; Lvl 16–20 tabloları
 *     oyuncunun asla göremeyeceği ölü içerikti.
 *   · Ana Bina Lvl 12'de durduğu için 25 üretim slotu hiç açılmıyor,
 *     Saray Lvl 15/20 kilitli kaldığı için oyuncu 3 köyden fazlasını
 *     kuramıyordu.
 *
 * Bu test o duvarın geri gelmesini engelliyor. Tek bir çarpan sayısı
 * elle değiştirildiğinde sessizce kaymasın diye eşikler açıkça yazılı.
 */
const test = require('node:test');
const assert = require('node:assert');

const { VILLAGE_DEFS, PRODUCTION_DEFS } = require('../data');
const { getScaledUpgradeCost, getVillageBuildMinutes, UPGRADE_MULT_DEFAULT } =
  require('../game/koyKurallari');

/**
 * TEK DEPOYLA ulaşılabilen tavanlar (bkz. tick.js · getStorageCaps):
 * depo binasının Lvl 20 kapasitesi + deposuz taban.
 * İkinci depo kurmak mümkün ama ZORUNLU olmamalı.
 */
const TEK_DEPO = {
  odun: 32500, kil: 32500, tas: 32500, demir: 32500,
  kereste: 26000, tugla: 26000, yontmaTas: 26000, demirKulce: 26000,
  tahil: 127000, un: 26850, ekmek: 26850,
};

const CARPAN = 1.28;

test('bütün binalarda maliyet ve süre çarpanı aynı', () => {
  assert.equal(UPGRADE_MULT_DEFAULT, CARPAN, 'varsayılan maliyet çarpanı kaymış');

  const sapan = [];
  for (const [tip, d] of Object.entries(VILLAGE_DEFS)) {
    if (d.buildMultiplier !== CARPAN) sapan.push(`${tip}.buildMultiplier = ${d.buildMultiplier}`);
    const kc = d.upgradeCostMultiplier || UPGRADE_MULT_DEFAULT;
    if (kc !== CARPAN) sapan.push(`${tip}.upgradeCostMultiplier = ${kc}`);
  }
  assert.deepEqual(sapan, [], 'çarpan ailesine geri dönülmüş:\n  ' + sapan.join('\n  '));
});

test('hiçbir bina yükseltmesi TEK deponun üstüne çıkmıyor', () => {
  const asan = [];
  for (const [tip, d] of Object.entries(VILLAGE_DEFS)) {
    for (let lv = 1; lv < (d.maxLevel || 1); lv++) {
      const c = getScaledUpgradeCost(tip, lv);
      if (!c) continue;
      for (const [res, v] of Object.entries(c)) {
        const tavan = TEK_DEPO[res];
        if (tavan && v > tavan) {
          asan.push(`${d.name} Lvl ${lv}→${lv + 1}: ${v} ${res} > ${tavan}`);
        }
      }
    }
  }
  assert.deepEqual(asan, [],
    'bu yükseltmeler için kaynak biriktirilemez, bina orada durur:\n  ' + asan.join('\n  '));
});

test('hiçbir tarla yükseltmesi TEK deponun üstüne çıkmıyor', () => {
  const asan = [];
  for (const d of Object.values(PRODUCTION_DEFS)) {
    d.levels.forEach((lv, i) => {
      for (const [res, v] of Object.entries(lv.cost || {})) {
        const tavan = TEK_DEPO[res];
        if (tavan && v > tavan) asan.push(`${d.name} Lvl ${i}→${i + 1}: ${v} ${res} > ${tavan}`);
      }
    });
  }
  assert.deepEqual(asan, [], 'tarla maliyeti depoyu aşıyor:\n  ' + asan.join('\n  '));
});

test('son seviye yükseltmesi tek işçiyle bile makul sürede bitiyor', () => {
  /*
    EŞİK 5 OYUN GÜNÜ, tek işçiyle. Tam kadroyla (10 işçi) onda birine
    iner. Eskiden Sur 24,9 yıl, Kule 22,4 yıl, Saray 11,9 yıldı — yani
    bu binaların üst seviyeleri hiç var olmamıştı.
  */
  const SINIR_DK = 5 * 24 * 60;
  const uzun = [];
  for (const [tip, d] of Object.entries(VILLAGE_DEFS)) {
    const dk = getVillageBuildMinutes(tip, d.maxLevel, 1);
    if (dk > SINIR_DK) uzun.push(`${d.name} Lvl ${d.maxLevel}: ${(dk / 60 / 24).toFixed(1)} gün`);
  }
  assert.deepEqual(uzun, [], 'süre duvarı geri gelmiş:\n  ' + uzun.join('\n  '));
});

test('en pahalı binalar hâlâ en pahalı — düz bir eğri değil', () => {
  /*
    Duvar kalktı diye her şey ucuzlamasın: Saray Ana Bina'dan, Ana Bina
    Ev'den pahalı kalmalı. Bu test eğrinin EĞİMİNİ değil SIRASINI
    koruyor; taban maliyetler elle ayarlanmış dengedir.
  */
  const toplam = (tip, lv) => Object.values(getScaledUpgradeCost(tip, lv) || {})
    .reduce((a, b) => a + b, 0);
  assert.ok(toplam('saray', 10) > toplam('anaBina', 10), 'Saray Ana Bina dan pahalı olmalı');
  assert.ok(toplam('anaBina', 5) > toplam('ev', 4), 'Ana Bina Ev den pahalı olmalı');
  assert.ok(toplam('kisla', 10) > toplam('runSalonu', 10) / 10, 'kışla bedavaya düşmemeli');
});

/**
 * EKİPMAN YÜKSELTME SÜRESİ — İŞÇİYE BÖLÜNDÜĞÜ İÇİN ÖLÇÜLÜYOR.
 *
 * İlkan: *"ekipman update lerini uzat şu an çok kısa."*
 *
 * Tablodaki ham dakika tek başına yanıltıcı: gerçek süre
 * `equipmentUpgradeMinutes(lvl) / işçi` (tick.js) ve silahçı seviye
 * başına 3 işçi alıyor, Lvl 20'de 60 işçi. Eski değerlerle (taban 20,
 * adım 1,25) 30 işçili bir atölye tam Lvl 20'yi **23 dakikada**
 * bitiriyordu — ordunun tamamına işleyen kalıcı bir güç için çok kısa.
 *
 * Bu test HAM SABİTİ değil OYUNCUNUN GÖRDÜĞÜ SÜREYİ kilitliyor;
 * taban ya da adım değişirse hangi yönde kaydığını söylüyor.
 */
test('ekipman Lvl 20 yolu işçiyle bile kısa değil', () => {
  const M = require('../data/militaryDefs');
  const ISCI = 30;                 // Lvl 10 atölyenin kadrosu

  let toplamDk = 0;
  for (let l = 0; l < 20; l++) toplamDk += M.equipmentUpgradeMinutes(l);

  const tamSaat = (toplamDk / ISCI) / 60;          // OYUN saati
  assert.ok(tamSaat > 20 && tamSaat < 60,
    `30 işçiyle tam Lvl 20 ${tamSaat.toFixed(1)} oyun saati — `
    + '20-60 aralığında olmalı (eskiden 3,8 idi, yani 23 gerçek dakika)');

  const sonSaat = (M.equipmentUpgradeMinutes(19) / ISCI) / 60;
  assert.ok(sonSaat > 5,
    `son seviye ${sonSaat.toFixed(1)} oyun saati — en az 5 olmalı`);

  /*
    ERKEN OYUN BOZULMAMALI. Yeni kurulmuş Lvl 1 atölyede 3 işçi var;
    ilk yükseltme oyuncuyu beklemekten bıktırmamalı.
  */
  const ilkDk = M.equipmentUpgradeMinutes(0) / 3;
  assert.ok(ilkDk <= 30,
    `ilk yükseltme 3 işçiyle ${ilkDk.toFixed(0)} oyun dakikası — `
    + 'erken oyun için 30 dakikayı aşmamalı');

  /*
    EĞRİ MONOTON: her seviye bir öncekinden uzun olmalı, yoksa
    "hangi seviyede takıldım" hissi kaybolur.
  */
  let onceki = 0;
  for (let l = 0; l < 20; l++) {
    const dk = M.equipmentUpgradeMinutes(l);
    assert.ok(dk >= onceki, `Lvl ${l + 1} süresi bir öncekinden kısa`);
    onceki = dk;
  }
});
