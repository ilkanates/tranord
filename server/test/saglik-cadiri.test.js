/**
 * SAĞLIK ÇADIRI — savunanın kayıplarının bir kısmı iyileşir.
 *
 * Bina aylardır tanımlıydı ama hiçbir şey yapmıyordu. Bu testler yeni
 * kuralın sınırlarını kilitliyor:
 *
 * 1) YALNIZ SAVUNANA işler. Çadır köyde; saldırıda ölen asker uzakta.
 * 2) Savaşın SONUCUNU değiştirmez — kazanan, ganimet ve kuşatma aynı.
 * 3) Oran seviyeyle doğrusal, TAVANI var; Lvl 20 bütün aralığı kullanır.
 * 4) Yuvarlama AŞAĞI: 1 kayıplı savaşta Lvl 1 çadır kimseyi kurtarmaz.
 * 5) İyileşme PAY EDİLMEDEN ÖNCE uygulanır: çadır kimin askeri olduğuna
 *    bakmadan TOPLAM kaybı azaltıyor. Kalan kaybın kime yazılacağını
 *    yine eski kural belirliyor (önce ev sahibi, artanı misafirler).
 */
const test = require('node:test');
const assert = require('node:assert');
const S = require('../game/saglik');
const ARMY = require('../game/army');
const { createVillage } = require('../game/villageState');

function savas({ cadirSeviye = 0, savunan = { fjordvakt: 100 },
  saldiran = { demirAtli: 200 }, misafir = null } = {}) {
  const t = createVillage(5, 5);
  t.army = { ...savunan };
  if (cadirSeviye > 0) {
    t.villageBuildings['1,0'] = { type: 'saglikCadiri', level: cadirSeviye };
  }
  if (misafir) {
    t.takviyeler = [{ id: 1, userId: 7, slotKey: '9,9', units: { ...misafir } }];
  }
  const o = createVillage(0, 0);
  o.army = { ...saldiran };
  const m = {
    id: 1, mode: 'attack', units: { ...saldiran }, distance: 3,
    phase: 'outbound', legHours: 1, remainingHours: 0,
    fromKey: '0,0', fromName: 'A', toKey: '5,5', toName: 'B',
  };
  ARMY.resolveArrival(m, o, t, { targetName: 'B' });
  return {
    march: m, saldiranKoy: o, savunanKoy: t,
    rapor: (t.reports || []).find(r => r.dir === 'in'),
    saldiranRapor: (o.reports || []).find(r => r.dir === 'out'),
  };
}

test('oran seviyeyle artıyor, tavanı var, çadırsız sıfır', () => {
  assert.equal(S.saglikIyilesmeOrani(0), 0, 'çadır yoksa iyileşme yok');
  assert.equal(S.saglikIyilesmeOrani(-3), 0);
  for (let s = 2; s <= 20; s++) {
    assert.ok(S.saglikIyilesmeOrani(s) >= S.saglikIyilesmeOrani(s - 1),
      `Lvl ${s} bir öncekinden küçük olmamalı`);
  }
  assert.equal(S.saglikIyilesmeOrani(20), S.SAGLIK_TAVAN);
  assert.ok(S.SAGLIK_TAVAN < 1, 'tavan %100 olursa savunmak bedava olur');
  /*
    TAVAN EN SON SEVİYEDE DOLMALI. İlk öneri (seviye × 0,05, tavan %50)
    Lvl 10'da tavana dayanıyordu; o hâlde 11-20 arası seviyelerin hiçbir
    karşılığı olmazdı.
  */
  assert.ok(S.saglikIyilesmeOrani(19) < S.SAGLIK_TAVAN,
    'tavan 20. seviyeden önce dolmamalı — sonraki seviyeler ölü kalır');
});

test('yuvarlama AŞAĞI — küçük kayıpta çadır kimseyi kurtarmıyor', () => {
  /*
    Yukarı yuvarlasaydık 1 kayıplı bir savaşta Lvl 1 çadır (%2) o tek
    askeri de kurtarırdı — oranın elli katı bir etki.
  */
  const r = S.saglikIyilestir({ fjordvakt: 1 }, 0.02);
  assert.deepEqual(r.iyilesen, {});
  assert.deepEqual(r.kalanKayip, { fjordvakt: 1 });
  assert.equal(r.iyilesenToplam, 0);
});

test('iyileşen askerler kayıptan DÜŞÜLÜYOR, toplam korunuyor', () => {
  const r = S.saglikIyilestir({ fjordvakt: 100, spydvakt: 7 }, 0.4);
  assert.equal(r.iyilesen.fjordvakt, 40);
  assert.equal(r.kalanKayip.fjordvakt, 60);
  assert.equal(r.iyilesen.spydvakt, 2, '7 × 0,4 = 2,8 → aşağı yuvarlanır');
  assert.equal(r.kalanKayip.spydvakt, 5);
  assert.equal(r.iyilesenToplam, 42);
});

test('çadır SAVUNANIN ordusunu gerçekten kurtarıyor', () => {
  const yok = savas({ cadirSeviye: 0 });
  const var_ = savas({ cadirSeviye: 20 });
  const kalan = (o) => Object.values(o.savunanKoy.army || {}).reduce((a, b) => a + b, 0);
  assert.equal(kalan(yok), 0, 'çadırsız savunan tamamen kırılıyor');
  assert.ok(kalan(var_) > 0, 'çadırlı savunanın bir kısmı ayakta kalmalı');
  assert.equal(var_.rapor.saglikCadiri.toplam, kalan(var_));
});

test('çadır SALDIRANA işlemiyor', () => {
  /*
    Çadır köyde; saldırıda ölen asker günlerce uzakta. Saldırana da
    işleseydi saldırmanın bedeli düşer ve savunma avantajı ters dönerdi.
  */
  const zayifSavunma = { fjordvakt: 400 };   // saldıran kaybetsin
  const yok = savas({ cadirSeviye: 0, savunan: zayifSavunma });
  const var_ = savas({ cadirSeviye: 20, savunan: zayifSavunma });
  const saldiranKalan = (o) =>
    Object.values(o.saldiranKoy.army || {}).reduce((a, b) => a + b, 0);
  assert.equal(saldiranKalan(yok), saldiranKalan(var_),
    'savunanın çadırı saldıranın kaybını değiştirmemeli');
});

test('çadır savaşın SONUCUNU değiştirmiyor', () => {
  /*
    Savaş bitmiş, kazanan belli; çadır yalnız yaralıları topluyor.
    Sonucu değiştirseydi oyuncu saldırmadan önce ne olacağını
    kestiremezdi.
  */
  const yok = savas({ cadirSeviye: 0 });
  const var_ = savas({ cadirSeviye: 20 });
  assert.equal(yok.rapor.winner, var_.rapor.winner);
  assert.equal(yok.saldiranRapor.attackTotal, var_.saldiranRapor.attackTotal);
  assert.equal(yok.saldiranRapor.defenseTotal, var_.saldiranRapor.defenseTotal);
  assert.deepEqual(yok.saldiranRapor.myLosses, var_.saldiranRapor.myLosses,
    'saldıranın kaybı aynı kalmalı');
});

test('iyileşme TOPLAM kaybı azaltıyor — misafirli savunmada da', () => {
  /*
    Çadır kimin askeri olduğuna bakmadan yaralıyı topluyor: iyileşme PAY
    EDİLMEDEN ÖNCE uygulanıyor. Kalan kaybın kime yazılacağını ise eski
    kural belirliyor — "önce ev sahibinin ordusundan, artanı
    misafirlerden" (bkz. savunmaKayiplariniPayEt).

    Yani ev sahibi tamamen kırıldığı bir savaşta çadırın kazancı
    misafirlere yansıyor. Bu bir yan etki değil, iki kuralın doğru
    birleşimi: çadır savunmanın TOPLAM kaybını azaltıyor.
  */
  const kur = (cadir) => savas({
    cadirSeviye: cadir,
    savunan: { fjordvakt: 100 },
    misafir: { fjordvakt: 100 },
    saldiran: { demirAtli: 400 },
  });
  const yok = kur(0);
  const var_ = kur(20);

  const savunanKalan = (r) =>
    Object.values(r.savunanKoy.army || {}).reduce((a, b) => a + b, 0)
    + (r.savunanKoy.takviyeler || []).reduce((s, t) =>
      s + Object.values(t.units || {}).reduce((a, b) => a + b, 0), 0);

  assert.ok(var_.rapor.saglikCadiri.toplam > 0, 'çadır bir şeyler kurtarmalı');
  assert.ok(savunanKalan(var_) > savunanKalan(yok),
    'çadırlı savunmada TOPLAM hayatta kalan daha çok olmalı');
  assert.equal(savunanKalan(var_) - savunanKalan(yok),
    var_.rapor.saglikCadiri.toplam,
    'raporda yazan sayı gerçekten kurtarılan asker olmalı');
});

test('ev sahibi kırılmadığı savaşta çadır ONUN askerini kurtarıyor', () => {
  /*
    Yukarıdaki testte ev sahibi tamamen kırıldığı için kazanç misafire
    gidiyordu. Kaybın ev sahibini bitirmediği bir savaşta kazanç doğrudan
    ona yansımalı — yoksa çadırı kuran oyuncu ondan hiç faydalanmazdı.
  */
  const kur = (cadir) => savas({
    cadirSeviye: cadir,
    savunan: { fjordvakt: 500 },
    saldiran: { demirAtli: 60 },
  });
  const yok = kur(0);
  const var_ = kur(20);
  const evKalan = (r) => Object.values(r.savunanKoy.army || {}).reduce((a, b) => a + b, 0);
  assert.ok(evKalan(yok) > 0, 'bu savaşta ev sahibi kırılmamalı — ölçüm anlamlı olsun');
  assert.ok(evKalan(var_) > evKalan(yok),
    'çadır ev sahibinin kendi askerini kurtarmalı');
});

test('çadır yoksa raporda ALAN HİÇ YAZILMIYOR', () => {
  // Eski raporlar bozulmasın; "0 iyileşti" satırı da gürültü olurdu
  const r = savas({ cadirSeviye: 0 });
  assert.equal('saglikCadiri' in r.rapor, false);
});
