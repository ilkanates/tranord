/**
 * SAĞLIK ÇADIRI — savunanın ölülerinin bir kısmı yaralı sayılıp çadıra
 * alınır, ZAMANLA iyileşip orduya döner.
 *
 * Bina aylardır tanımlıydı ama hiçbir şey yapmıyordu. Bu testler kuralın
 * sınırlarını kilitliyor:
 *
 * 1) YALNIZ SAVUNANA işler. Çadır köyde; saldırıda ölen asker uzakta.
 * 2) Savaşın SONUCUNU değiştirmez — kazanan, ganimet ve kuşatma aynı.
 * 3) Oran seviyeyle doğrusal, TAVANI var; Lvl 20 bütün aralığı kullanır.
 * 4) Yuvarlama AŞAĞI: 1 kayıplı savaşta Lvl 1 çadır kimseyi kurtarmaz.
 * 5) ASKER PAT DİYE DÖNMEZ: yaralı çadırda yatar, eğitim süresinin İKİ
 *    KATI kadar sürede iyileşir (İlkan'ın kararı).
 * 6) ÇADIR DOLABİLİR: yatak sayısı seviyeyle sınırlı, sığmayan yaralı
 *    ölür (İlkan'ın kararı).
 * 7) YALNIZ EV SAHİBİNİN askerini alır — misafirin askeri başka bir
 *    oyuncunun, çadır onu kendi ordumuza katamaz.
 * 8) TEDAVİ KENDİLİĞİNDEN BAŞLAMAZ: yaralı çadırda bekler, sayaç ancak
 *    oyuncu o birliği seçince işler (İlkan'ın kararı).
 */
const test = require('node:test');
const assert = require('node:assert');
const S = require('../game/saglik');
const ARMY = require('../game/army');
const TICK = require('../game/tick');
const { createVillage } = require('../game/villageState');
const { UNIT_DEFS } = require('../data');

function savas({ cadirSeviye = 0, savunan = { fjordvakt: 100 },
  saldiran = { demirAtli: 200 }, misafir = null, yatan = null } = {}) {
  const t = createVillage(5, 5);
  t.army = { ...savunan };
  if (cadirSeviye > 0) {
    t.villageBuildings['1,0'] = { type: 'saglikCadiri', level: cadirSeviye };
  }
  if (yatan) t.saglikYatan = yatan;
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

const ordu = (v) => Object.values(v.army || {}).reduce((a, b) => a + b, 0);
const revir = (v) => S.yatanSayisi(v);

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

test('yatak sayısı seviyeyle artıyor, çadırsız sıfır', () => {
  assert.equal(S.yatakKapasitesi(0), 0);
  assert.equal(S.yatakKapasitesi(1), S.YATAK_PER_SEVIYE);
  assert.equal(S.yatakKapasitesi(20), 20 * S.YATAK_PER_SEVIYE);
  for (let s = 2; s <= 20; s++) {
    assert.ok(S.yatakKapasitesi(s) > S.yatakKapasitesi(s - 1),
      `Lvl ${s} bir öncekinden fazla yatak vermeli`);
  }
});

test('iyileşme süresi eğitim süresinin TAM 2 KATI', () => {
  /*
    İki hesap iki dosyada (tick.js eğitim, saglik.js iyileşme) ve aynı
    tanımdan türüyor. Ayrışırlarsa oyuncuya söylenen "2 katı" yalan olur.
  */
  for (const birim of Object.keys(UNIT_DEFS)) {
    const egitim = TICK.getUnitTrainMinutes(birim);
    if (!Number.isFinite(egitim)) continue;
    assert.equal(S.iyilesmeSaati(birim), (egitim * 2) / 60,
      `${birim}: iyileşme eğitimin 2 katı olmalı`);
  }
  assert.equal(S.IYILESME_KAT, 2);
  assert.equal(S.iyilesmeSaati('boyleBirBirimYok'), 0, 'tanımsız birim çökertmemeli');
});

test('yuvarlama AŞAĞI — küçük kayıpta çadır kimseyi almıyor', () => {
  /*
    Yukarı yuvarlasaydık 1 kayıplı bir savaşta Lvl 1 çadır (%2) o tek
    askeri de kurtarırdı — oranın elli katı bir etki.
  */
  const v = createVillage(1, 1);
  const r = S.yaralilariAl({ fjordvakt: 1 }, 1, v);
  assert.equal(r.alinan, 0);
  assert.deepEqual(r.yatanlar, []);
});

test('yaralılar çadıra giriyor, kalanı ölüyor', () => {
  const v = createVillage(1, 1);
  const r = S.yaralilariAl({ fjordvakt: 100, spydvakt: 7 }, 20, v);
  assert.equal(r.alinan, 42, '100×0,4 + 7×0,4 → 40 + 2');
  assert.equal(r.kalanKayip.fjordvakt, 60);
  assert.equal(r.kalanKayip.spydvakt, 5, '7 × 0,4 = 2,8 → aşağı yuvarlanır');
  assert.equal(r.sigmayan, 0, 'Lvl 20 çadırda 200 yatak var, hepsi sığar');
});

test('ÇADIR DOLABİLİR — sığmayan yaralı ölüyor', () => {
  /*
    Sınırsız olsaydı Lvl 20 çadır on bin kişilik bir savaşta dört bin
    askeri kurtarır, çadır tek başına savunmayı belirlerdi.
  */
  const v = createVillage(1, 1);
  const r = S.yaralilariAl({ fjordvakt: 10000 }, 20, v);
  assert.equal(r.kapasite, 200);
  assert.equal(r.alinan, 200, 'yatak kadarı alınır');
  assert.ok(r.sigmayan > 0, 'oran 4000 diyordu, 200 yatak var — kalanı ölmeli');
  assert.equal(r.alinan + r.sigmayan, 4000, 'oranla çıkan sayı korunmalı');
  assert.equal(r.kalanKayip.fjordvakt, 9800, 'çadıra girmeyen herkes kayıpta');
});

test('DOLU ÇADIR yeni yaralı almıyor', () => {
  // Yataklar iyileşme bitene kadar dolu kalıyor: arka arkaya iki saldırıda
  // ikincinin yaralılarına yer kalmayabilir.
  const v = createVillage(1, 1);
  v.saglikYatan = [{ birim: 'fjordvakt', adet: 100, kalanSaat: 1 }];
  const r = S.yaralilariAl({ fjordvakt: 1000 }, 10, v);
  assert.equal(r.kapasite, 100);
  assert.equal(r.bosYatak, 0);
  assert.equal(r.alinan, 0);
  assert.deepEqual(r.kalanKayip, { fjordvakt: 1000 }, 'hepsi ölmeli');
});

test('savaşta yaralı ÇADIRA giriyor, orduya HEMEN dönmüyor', () => {
  /*
    İlkan'ın kararı: "askerler pat diye iyileşmesin". Anında dönseydi
    savunmak neredeyse bedava olur, savaşın ertesinde ordunun eksildiği
    an diye bir şey kalmazdı.
  */
  const yok = savas({ cadirSeviye: 0 });
  const var_ = savas({ cadirSeviye: 20 });
  assert.equal(ordu(yok.savunanKoy), 0, 'çadırsız savunan tamamen kırılıyor');
  assert.equal(ordu(var_.savunanKoy), 0, 'çadırlı savunanın ordusu da o an boş');
  assert.ok(revir(var_.savunanKoy) > 0, 'ama yaralılar çadırda olmalı');
  assert.equal(revir(yok.savunanKoy), 0, 'çadırsız köyde revir boş');
  assert.equal(var_.rapor.saglikCadiri.toplam, revir(var_.savunanKoy));
});

test('TEDAVİ SEÇMEDEN başlamıyor — sayaç işlemiyor', () => {
  /*
    İlkan'ın kararı: "ben seçince iyileşmeye başlasınlar". Kendiliğinden
    başlasaydı çadır bir karar noktası değil, arka planda işleyen bir
    sayaç olurdu.
  */
  const v = savas({ cadirSeviye: 20 }).savunanKoy;
  const yatan = revir(v);
  assert.ok(yatan > 0);
  assert.ok(v.saglikYatan.every(y => y.basladi === false),
    'çadıra giren yaralının tedavisi başlamamış olmalı');

  TICK.processRevir(v, 1000);
  assert.equal(ordu(v), 0, 'seçilmeden kimse iyileşmemeli');
  assert.equal(revir(v), yatan, 'yatanlar yerinde durmalı');
});

test('SEÇİLEN başlıyor, seçilmeyen bekliyor', () => {
  const v = createVillage(4, 4);
  v.saglikYatan = [
    { birim: 'fjordvakt', adet: 10, kalanSaat: 1, toplamSaat: 1, basladi: false },
    { birim: 'spydvakt', adet: 5, kalanSaat: 1, toplamSaat: 1, basladi: false },
  ];
  const r = S.iyilesmeyeBasla(v, [1]);
  assert.equal(r.baslayan, 1);
  assert.equal(r.asker, 5);
  assert.equal(v.saglikYatan[0].basladi, false, 'seçilmeyen beklemeli');
  assert.equal(v.saglikYatan[1].basladi, true);

  TICK.processRevir(v, 2);
  assert.deepEqual(v.army, { spydvakt: 5 }, 'yalnız seçilen orduya dönmeli');
  assert.equal(revir(v), 10, 'seçilmeyen hâlâ çadırda');
});

test('indeks verilmezse HEPSİ başlıyor', () => {
  const v = createVillage(4, 4);
  v.saglikYatan = [
    { birim: 'fjordvakt', adet: 10, kalanSaat: 1, toplamSaat: 1, basladi: false },
    { birim: 'spydvakt', adet: 5, kalanSaat: 1, toplamSaat: 1, basladi: true },
  ];
  const r = S.iyilesmeyeBasla(v, null);
  assert.equal(r.baslayan, 1, 'zaten başlamış olan yeniden sayılmamalı');
  assert.equal(r.asker, 10);
  assert.ok(v.saglikYatan.every(y => y.basladi));
});

test('başlamış tedavi YENİDEN başlatılamıyor — sayaç sıfırlanmamalı', () => {
  /*
    Sıfırlasaydık iki kere düğmeye basan oyuncunun beklediği süre
    uzardı: hiç kimsenin beklemediği bir ceza.
  */
  const v = createVillage(4, 4);
  v.saglikYatan = [
    { birim: 'fjordvakt', adet: 10, kalanSaat: 0.2, toplamSaat: 1, basladi: true },
  ];
  S.iyilesmeyeBasla(v, [0]);
  assert.equal(v.saglikYatan[0].kalanSaat, 0.2);
});

test('zaman geçince yaralı orduya VE nüfusa dönüyor', () => {
  const r = savas({ cadirSeviye: 20 });
  const v = r.savunanKoy;
  const yatan = revir(v);
  assert.ok(yatan > 0);
  const nufusOnce = v.population;
  S.iyilesmeyeBasla(v, null);   // oyuncu "hepsini iyileştir" dedi

  // Bir saat yetmiyor: fjordvakt'ın iyileşmesi eğitiminin 2 katı
  const gereken = S.iyilesmeSaati('fjordvakt');
  assert.ok(gereken > 0, 'iyileşme bir süre almalı — anında olsaydı test anlamsız olurdu');
  TICK.processRevir(v, gereken / 2);
  assert.equal(ordu(v), 0, 'süre dolmadan kimse dönmemeli');
  assert.equal(revir(v), yatan, 'yatanlar çadırda kalmalı');

  TICK.processRevir(v, gereken);
  assert.equal(ordu(v), yatan, 'süre dolunca hepsi orduya dönmeli');
  assert.equal(revir(v), 0, 'çadır boşalmalı');
  assert.equal(v.population, nufusOnce + yatan,
    'nüfus da geri gelmeli — yoksa çadır orduyu büyütüp nüfusu eksiltirdi');
});

test('çadır SALDIRANA işlemiyor', () => {
  /*
    Çadır köyde; saldırıda ölen asker günlerce uzakta. Saldırana da
    işleseydi saldırmanın bedeli düşer ve savunma avantajı ters dönerdi.
  */
  const zayifSavunma = { fjordvakt: 400 };   // saldıran kaybetsin
  const yok = savas({ cadirSeviye: 0, savunan: zayifSavunma });
  const var_ = savas({ cadirSeviye: 20, savunan: zayifSavunma });
  assert.equal(ordu(yok.saldiranKoy), ordu(var_.saldiranKoy),
    'savunanın çadırı saldıranın kaybını değiştirmemeli');
  assert.equal(revir(var_.saldiranKoy), 0, 'saldıranın revirine kimse girmemeli');
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
  assert.deepEqual(yok.rapor.myLosses, var_.rapor.myLosses,
    'savunanın raporundaki kayıp da aynı — yaralı da o an orduda değil');
});

test('çadır MİSAFİRİN askerini almıyor', () => {
  /*
    Misafir askeri başka bir oyuncunun. Çadıra alsaydık iyileşince BİZİM
    ordumuza katılırdı — başka bir oyuncunun ordusunu devralmak olurdu.
    (Önceki sürüm kaybı pay etmeden önce azaltıyordu ve tam bunu yapıyordu.)
  */
  const r = savas({
    cadirSeviye: 20,
    savunan: { fjordvakt: 10 },        // ev sahibi çabuk kırılır
    misafir: { fjordvakt: 300 },
    saldiran: { demirAtli: 400 },
  });
  const evSahibiOlu = r.rapor.myLosses.fjordvakt || 0;
  assert.ok((r.savunanKoy.takviyeler || []).length > 0 ||
    r.march.misafirKayip?.length > 0, 'misafir gerçekten savaşmalı');
  assert.ok(revir(r.savunanKoy) <= evSahibiOlu,
    'çadırdaki yaralı sayısı ev sahibinin kendi ölüsünü aşamaz');
  assert.ok(revir(r.savunanKoy) <= 10, 'ev sahibinin toplam ordusundan fazlası olamaz');
});

test('ev sahibi kırılmadığı savaşta çadır ONUN askerini alıyor', () => {
  const kur = (cadir) => savas({
    cadirSeviye: cadir,
    savunan: { fjordvakt: 500 },
    saldiran: { demirAtli: 60 },
  });
  const yok = kur(0);
  const var_ = kur(20);
  assert.ok(ordu(yok.savunanKoy) > 0, 'bu savaşta ev sahibi kırılmamalı');
  assert.equal(ordu(yok.savunanKoy), ordu(var_.savunanKoy),
    'savaşın hemen ardından ordu iki durumda da aynı');
  assert.ok(revir(var_.savunanKoy) > 0, 'çadır yaralı almalı');

  // ...ve iyileşince gerçekten ONUN ordusuna dönmeli
  const yatan = revir(var_.savunanKoy);
  S.iyilesmeyeBasla(var_.savunanKoy, null);
  TICK.processRevir(var_.savunanKoy, 100);
  assert.equal(ordu(var_.savunanKoy), ordu(yok.savunanKoy) + yatan);
});

test('çadır yoksa raporda ALAN HİÇ YAZILMIYOR', () => {
  // Eski raporlar bozulmasın; "0 iyileşti" satırı da gürültü olurdu
  const r = savas({ cadirSeviye: 0 });
  assert.equal('saglikCadiri' in r.rapor, false);
});

test('çadır DOLDUYSA rapor bunu söylüyor', () => {
  /*
    "Çadırım doluydu" bilgisi olmadan oyuncu askerinin neden öldüğünü ve
    binayı neden yükseltmesi gerektiğini göremez.
  */
  const r = savas({
    cadirSeviye: 1,                    // 10 yatak
    savunan: { fjordvakt: 2000 },
    saldiran: { demirAtli: 4000 },
  });
  assert.ok(r.rapor.saglikCadiri, 'çadır bölümü yazılmalı');
  assert.ok(r.rapor.saglikCadiri.sigmayan > 0, 'sığmayan yazılmalı');
  assert.equal(r.rapor.saglikCadiri.kapasite, 10);
});

test('özet karta gereken her şeyi taşıyor', () => {
  /*
    Kart "kim, kaç kişi, ne kadar sürer, başladı mı" sorularını
    cevaplamalı — ve hangi girdiyi seçtiğini sunucuya indeks alanı ile
    söylemeli. Süzülmüş bir listenin kendi sırasını gönderseydik yanlış
    birlik tedaviye alınırdı.
  */
  const v = createVillage(6, 6);
  v.villageBuildings['1,0'] = { type: 'saglikCadiri', level: 5 };
  v.saglikYatan = [
    { birim: 'fjordvakt', adet: 7, kalanSaat: 0.5, toplamSaat: 1, basladi: true },
    { birim: 'spydvakt', adet: 3, kalanSaat: 1, toplamSaat: 1, basladi: false },
  ];
  const o = S.ozet(v, 5);
  assert.equal(o.kapasite, 50);
  assert.equal(o.dolu, 10);
  assert.equal(o.bekleyen, 3, 'tedavisi başlamamış asker sayısı');
  assert.deepEqual(o.yatanlar.map(y => y.indeks), [0, 1]);
  assert.equal(o.yatanlar[0].basladi, true);
  assert.equal(o.yatanlar[1].basladi, false);
  assert.equal(o.yatanlar[0].toplamSaat, 1);
});

test('eski kayıtta toplamSaat yoksa türetiliyor', () => {
  // Revir, tedavi seçiminden ÖNCE yayınlanmış olabilir
  const v = createVillage(7, 7);
  v.saglikYatan = [{ birim: 'fjordvakt', adet: 4, kalanSaat: 0.9 }];
  S.iyilesmeyeBasla(v, null);
  assert.equal(v.saglikYatan[0].toplamSaat, 0.9);
  assert.equal(v.saglikYatan[0].basladi, true);
});

test('boş revirde ilerletme çökertmiyor', () => {
  const v = createVillage(2, 2);
  assert.deepEqual(S.ilerlet(v, 5), {});
  delete v.saglikYatan;
  assert.deepEqual(S.ilerlet(v, 5), {}, 'eski kayıtta alan hiç olmayabilir');
  assert.equal(S.yatanSayisi(v), 0);
});
