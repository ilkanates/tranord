/**
 * TICK KUYRUKLARI — iş BAŞLADIKTAN sonraki tick'ler.
 *
 * Bu dosyanın varlık sebebi somut: Rún Salonu'ndan bir araştırma başlatınca
 * canlı sunucu ölüyordu. Sebep `processResearchQueue` içinde `const arastirmaci`
 * tanımının `if` bloğunda kalması; `else` dalı (isciyeGoreOlcekle) onu
 * kullandığı için iş başladıktan SONRAKİ her tick
 * "ReferenceError: arastirmaci is not defined" fırlatıyordu. Aynı hata
 * `processUpgradeQueues` içinde `isci` için de vardı.
 *
 * Neden başlatma anı değil de SONRAKİ tick? Çünkü ilk tick `if` dalına
 * giriyor (iş henüz başlamamış) ve orada değişken tanımlı. Hata ancak iş
 * yürürken, yani ikinci tick'ten itibaren çıkıyor — bu yüzden "araştırmaya
 * bastım, birkaç saniye sonra bağlantı koptu" diye görünüyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const { sunucuBaslat, hesapAc, baglan, bekle } = require('./sunucu');

/** Köy merkezinde kule olmayan boş hex'ler (kule slotları hariç) */
const BOS_SLOTLAR = ['2,0', '1,1', '2,-2', '1,-2', '-1,-1', '-2,0', '-2,2', '-1,2', '3,0', '0,3'];
const KULE_SLOTLARI = new Set(['0,-2', '2,-1', '0,2', '-2,1']);

function bosSlotBul(koy, kullanilan) {
  return BOS_SLOTLAR.find((k) =>
    !KULE_SLOTLARI.has(k) && !koy.villageBuildings[k] && !kullanilan.has(k));
}

/** Binayı kur, anında bitir ve seviyesini yükselt */
async function binaKur(oturum, tip, kullanilan) {
  const slot = bosSlotBul(oturum.koy, kullanilan);
  assert.ok(slot, `${tip} için boş hex bulunamadı`);
  kullanilan.add(slot);
  oturum.soket.emit('build_village', { slotKey: slot, buildingType: tip, workers: 1 });
  await bekle(500);
  return slot;
}

test('Rún Salonu araştırması sunucuyu düşürmez', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  // Depolar + bol kaynak: inşaat kaynak yetmezliğinden reddedilmesin
  oturum.soket.emit('dev_setup', { level: 15, fill: true });
  await bekle(1200);
  oturum.soket.emit('dev_grant', {
    resources: {
      odun: 200000, kil: 200000, tas: 200000, demir: 200000, tahil: 200000,
      kereste: 100000, tugla: 100000, yontmaTas: 100000, demirKulce: 100000,
    },
  });
  await bekle(800);

  const kullanilan = new Set();
  const salonSlot = await binaKur(oturum, 'runSalonu', kullanilan);
  await binaKur(oturum, 'kisla', kullanilan);

  // İnşaatları anında bitir ve seviyeleri yükselt (skjoldvakt Lvl 3 istiyor)
  oturum.soket.emit('dev_max_buildings', { level: 20, tiles: false });
  await bekle(1500);

  const salon = oturum.koy.villageBuildings[salonSlot];
  assert.ok(salon && salon.type === 'runSalonu' && salon.level >= 3,
    'Rún Salonu kurulamadı: ' + JSON.stringify(salon));

  // Araştırmacı olmadan iş "bekliyor"da kalır ve hata dalına hiç girilmez
  oturum.soket.emit('assign_village_workers', { slotKey: salonSlot, workers: 5 });
  await bekle(600);
  assert.ok(oturum.koy.villageBuildings[salonSlot].workers > 0,
    'Rún Salonu\'na araştırmacı atanamadı — test hatayı tetikleyemez');

  oturum.soket.emit('research_unit', { unitType: 'skjoldvakt' });

  /*
    Hata İLK tick'te değil, iş yürürken çıkıyor. Birkaç saniye beklemek
    şart: bir tick'te iş başlıyor, sonrakinde else dalına giriliyor.
  */
  await bekle(6000);

  assert.ok(!/arastirmaci is not defined/.test(sunucu.kayit),
    'processResearchQueue hâlâ ReferenceError atıyor:\n' + sunucu.kayit.slice(-1200));
  assert.ok(await sunucu.ayaktaMi(),
    'araştırma sunucuyu düşürdü — çıkış kodu: ' + sunucu.cikisKodu
    + '\n' + sunucu.kayit.slice(-1500));
});

test('ekipman yükseltmesi sunucuyu düşürmez', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  oturum.soket.emit('dev_setup', { level: 15, fill: true });
  await bekle(1200);
  oturum.soket.emit('dev_grant', {
    resources: {
      odun: 200000, kil: 200000, tas: 200000, demir: 200000, tahil: 200000,
      kereste: 100000, tugla: 100000, yontmaTas: 100000, demirKulce: 100000,
    },
  });
  await bekle(800);

  const kullanilan = new Set();
  const silahciSlot = await binaKur(oturum, 'silahci', kullanilan);
  oturum.soket.emit('dev_max_buildings', { level: 20, tiles: false });
  await bekle(1500);

  const silahci = oturum.koy.villageBuildings[silahciSlot];
  assert.ok(silahci && silahci.type === 'silahci' && silahci.level >= 1,
    'silahçı kurulamadı: ' + JSON.stringify(silahci));

  oturum.soket.emit('assign_village_workers', { slotKey: silahciSlot, workers: 5 });
  await bekle(600);

  // processUpgradeQueues içindeki `isci` ile aynı dal
  oturum.soket.emit('upgrade_equipment', { buildingType: 'silahci', equipment: 'kilic' });
  await bekle(6000);

  assert.ok(!/isci is not defined/.test(sunucu.kayit),
    'processUpgradeQueues hâlâ ReferenceError atıyor:\n' + sunucu.kayit.slice(-1200));
  assert.ok(await sunucu.ayaktaMi(),
    'ekipman yükseltmesi sunucuyu düşürdü — çıkış kodu: ' + sunucu.cikisKodu
    + '\n' + sunucu.kayit.slice(-1500));
});
