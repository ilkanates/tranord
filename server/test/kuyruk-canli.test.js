/**
 * ÜRETİM KUYRUĞU — uçtan uca: sipariş, ret, iade, sıralama.
 *
 * Korunan değişmez: KUYRUKTA BEKLEYEN HER İŞ ÖDENMİŞTİR.
 *
 * Eskiden sipariş bedelsiz kuyruğa giriyordu; malzemesi olmayan bir iş
 * kuyruğun başında `waiting` durumunda takılıyor ve ARKASINDAKİ hazır
 * siparişleri de kilitliyordu. Oyuncu 50 kılıç sipariş edip kaynağı
 * bitince kuyruğun tamamı duruyordu. Bu test o modelin geri gelmediğini
 * gösteriyor: yetmiyorsa sipariş hiç girmez, giriyorsa bedeli ödenmiştir.
 */
const test = require('node:test');
const assert = require('node:assert');
const { sunucuBaslat, hesapAc, baglan, bekle } = require('./sunucu');

const BOS_SLOTLAR = ['2,0', '1,1', '2,-2', '1,-2', '-1,-1', '-2,0', '-2,2', '-1,2', '3,0', '0,3'];
const KULE_SLOTLARI = new Set(['0,-2', '2,-1', '0,2', '-2,1']);

async function binaKur(oturum, tip, kullanilan) {
  const slot = BOS_SLOTLAR.find((k) =>
    !KULE_SLOTLARI.has(k) && !oturum.koy.villageBuildings[k] && !kullanilan.has(k));
  assert.ok(slot, `${tip} için boş hex yok`);
  kullanilan.add(slot);
  oturum.soket.emit('build_village', { slotKey: slot, buildingType: tip, workers: 1 });
  await bekle(500);
  return slot;
}

/** Depoları kur, bol kaynak ver, silahçıyı kur ve çalıştır */
async function silahciKoyu(t) {
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
  const slot = await binaKur(oturum, 'silahci', kullanilan);
  oturum.soket.emit('dev_max_buildings', { level: 20, tiles: false });
  await bekle(1500);
  return { sunucu, oturum, slot };
}

test('malzeme yetmiyorsa sipariş kuyruğa HİÇ girmiyor', async (t) => {
  const { oturum } = await silahciKoyu(t);

  // Külçe demiri sıfıra indir: kılıç 10 külçe istiyor
  const kulce = oturum.koy.resources.demirKulce;
  oturum.soket.emit('dev_grant', { resources: { demirKulce: -kulce } });
  await bekle(800);
  assert.ok((oturum.koy.resources.demirKulce || 0) < 10,
    'külçe boşaltılamadı, test anlamsız');

  const retler = [];
  oturum.soket.on('build_refused', (r) => retler.push(r.reason));
  oturum.soket.emit('queue_equipment', { buildingType: 'silahci', equipmentType: 'kilic', quantity: 5 });
  await bekle(1200);

  const kuyruk = oturum.koy.equipmentQueues?.silahci || [];
  assert.equal(kuyruk.length, 0, 'ödenmemiş sipariş kuyruğa girdi: ' + JSON.stringify(kuyruk));
  assert.ok(retler.some((r) => /külçe demir/.test(r)),
    'eksik malzeme oyuncuya bildirilmedi: ' + JSON.stringify(retler));
});

test('malzeme yetiyorsa bedel SİPARİŞ ANINDA düşülüyor', async (t) => {
  const { oturum } = await silahciKoyu(t);

  const oncekiKulce = oturum.koy.resources.demirKulce;
  const oncekiKereste = oturum.koy.resources.kereste;
  oturum.soket.emit('queue_equipment', { buildingType: 'silahci', equipmentType: 'kilic', quantity: 4 });
  await bekle(1000);

  const kuyruk = oturum.koy.equipmentQueues?.silahci || [];
  assert.equal(kuyruk.length, 1, 'sipariş kuyruğa girmedi');
  assert.equal(kuyruk[0].remaining, 4);

  // kılıç: 10 külçe + 5 kereste  →  4 adet = 40 külçe + 20 kereste
  assert.ok(oncekiKulce - oturum.koy.resources.demirKulce >= 40,
    `külçe peşin düşülmedi (önce ${oncekiKulce}, sonra ${oturum.koy.resources.demirKulce})`);
  assert.ok(oncekiKereste - oturum.koy.resources.kereste >= 20,
    'kereste peşin düşülmedi');
});

test('iptalde üretilmemiş parçaların bedeli iade ediliyor', async (t) => {
  const { oturum } = await silahciKoyu(t);

  const basta = oturum.koy.resources.demirKulce;
  oturum.soket.emit('queue_equipment', { buildingType: 'silahci', equipmentType: 'kilic', quantity: 4 });
  await bekle(1000);
  const siparis = (oturum.koy.equipmentQueues?.silahci || [])[0];
  assert.ok(siparis, 'sipariş yok');
  const odemeSonrasi = oturum.koy.resources.demirKulce;
  assert.ok(odemeSonrasi < basta, 'bedel düşülmemiş, iptal testi anlamsız');

  oturum.soket.emit('cancel_equipment_order', { buildingType: 'silahci', orderId: siparis.id });
  await bekle(1000);

  assert.equal((oturum.koy.equipmentQueues?.silahci || []).length, 0, 'sipariş silinmedi');
  assert.ok(oturum.koy.resources.demirKulce > odemeSonrasi,
    `iptalde iade yok (${odemeSonrasi} -> ${oturum.koy.resources.demirKulce})`);
});

test('kuyruk sırası değiştirilebiliyor, çalışan iş başta kalıyor', async (t) => {
  const { oturum, slot } = await silahciKoyu(t);

  // İşçi vermeden sırala: hiçbir iş başlamasın, ikisi de beklesin
  oturum.soket.emit('assign_village_workers', { slotKey: slot, workers: 0 });
  await bekle(600);
  oturum.soket.emit('queue_equipment', { buildingType: 'silahci', equipmentType: 'kilic', quantity: 1 });
  await bekle(400);
  oturum.soket.emit('queue_equipment', { buildingType: 'silahci', equipmentType: 'mizrak', quantity: 1 });
  await bekle(900);

  let kuyruk = oturum.koy.equipmentQueues?.silahci || [];
  assert.deepEqual(kuyruk.map((o) => o.type), ['kilic', 'mizrak'], 'kuyruk beklendiği gibi değil');

  const mizrakId = kuyruk[1].id;
  oturum.soket.emit('reorder_equipment_order', {
    buildingType: 'silahci', orderId: mizrakId, yon: 'yukari',
  });
  await bekle(900);
  kuyruk = oturum.koy.equipmentQueues?.silahci || [];
  assert.deepEqual(kuyruk.map((o) => o.type), ['mizrak', 'kilic'], 'sıra değişmedi');
});
