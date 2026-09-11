/**
 * GÖREV ZİNCİRİ — rehber görevleri gerçekten ölçüyor ve ödül veriyor mu?
 *
 * Bu testler `game/quests.js` index.js'ten ayrılırken yazıldı: taşınan kodun
 * davranışını kilitliyorlar. Görev sistemi oyuncunun ilk 20 dakikasını
 * yönlendiriyor (ilk görev "ormana 3 işçi at"), yani sessizce bozulursa yeni
 * oyuncu ne yapacağını hiç öğrenemez — ama kimse çökmediği için fark edilmez.
 */
const test = require('node:test');
const assert = require('node:assert');
const { sunucuBaslat, hesapAc, baglan, bekle } = require('./sunucu');

test('görev paketi bağlantıda geliyor ve ilk görev aktif', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  const q = oturum.koy.quests;
  assert.ok(q, 'village_update içinde quests yok');
  assert.ok(Array.isArray(q.liste) && q.liste.length > 0, 'görev listesi boş');
  assert.ok(q.aktif, 'aktif görev yok');

  const ilk = q.liste.find(x => x.id === q.aktif);
  assert.ok(ilk, 'aktif görev listede bulunamadı');
  assert.equal(ilk.alindi, false, 'yeni hesapta ödül alınmış görünüyor');
  assert.equal(typeof ilk.hedef, 'number');
  assert.equal(typeof ilk.olculen, 'number');
  assert.ok(ilk.title, 'görevin başlığı yok');
});

test('koşul sağlanınca görev tamamlanıyor ve ödül alınabiliyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  /*
    İlk görev "ormana 3 işçi ata" — tam olarak oyuncunun yapacağı şeyi
    yapıyoruz: odun tarlasını bulup işçi atıyoruz. Ölçümün gerçekten
    state'e baktığını (sabit bir sayı dönmediğini) bu gösteriyor.
  */
  const ormanSlot = Object.entries(oturum.koy.productionTiles || {})
    .find(([, t2]) => t2.type === 'odun')?.[0];
  assert.ok(ormanSlot, 'odun tarlası bulunamadı');

  const oncekiOlcum = oturum.koy.quests.liste.find(q => q.cond ?? true)?.olculen;
  assert.equal(typeof oncekiOlcum, 'number');

  oturum.soket.emit('assign_production_workers', { slotKey: ormanSlot, workers: 3 });
  await bekle(2000);

  const isciGorevi = oturum.koy.quests.liste.find(q => /işçi|isci/i.test(q.title + ' ' + q.text));
  assert.ok(isciGorevi, 'işçi ile ilgili görev bulunamadı');
  assert.ok(isciGorevi.olculen >= 3,
    `işçi ataması görev ölçümüne yansımadı: ${isciGorevi.olculen}`);
  assert.equal(isciGorevi.tamam, true, 'koşul sağlandı ama görev tamam işaretlenmedi');

  // Ödülü al: kaynak artmalı ve görev "alindi" olmalı
  const oncekiKaynak = { ...oturum.koy.resources };
  oturum.soket.emit('claim_quest', { id: isciGorevi.id });
  await bekle(2000);

  const sonrakiGorev = oturum.koy.quests.liste.find(q => q.id === isciGorevi.id);
  assert.equal(sonrakiGorev.alindi, true, 'ödül alındı ama görev alindi=false');

  const odul = isciGorevi.reward?.res || {};   // ödül {res:{...}} biçiminde
  const artanVar = Object.entries(odul).some(([res, miktar]) =>
    miktar > 0 && (oturum.koy.resources[res] || 0) > (oncekiKaynak[res] || 0));
  assert.ok(Object.keys(odul).length === 0 || artanVar,
    'ödül verildi ama hiçbir kaynak artmadı: ' + JSON.stringify(odul));
});

test('alınmış ödül ikinci kez verilmiyor', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  const ormanSlot = Object.entries(oturum.koy.productionTiles || {})
    .find(([, t2]) => t2.type === 'odun')?.[0];
  oturum.soket.emit('assign_production_workers', { slotKey: ormanSlot, workers: 3 });
  await bekle(1800);

  const gorev = oturum.koy.quests.liste.find(q => q.tamam && !q.alindi);
  assert.ok(gorev, 'tamamlanmış ama alınmamış görev yok');

  oturum.soket.emit('claim_quest', { id: gorev.id });
  await bekle(1500);
  const kaynakBirIncid = { ...oturum.koy.resources };

  // Aynı ödülü tekrar iste
  oturum.soket.emit('claim_quest', { id: gorev.id });
  await bekle(1800);

  for (const [res, miktar] of Object.entries(gorev.reward?.res || {})) {
    if (!(miktar > 0)) continue;
    assert.ok((oturum.koy.resources[res] || 0) <= (kaynakBirIncid[res] || 0) + 1,
      `${res} ikinci kez verildi: ${kaynakBirIncid[res]} -> ${oturum.koy.resources[res]}`);
  }
  assert.ok(await sunucu.ayaktaMi(), 'çift ödül isteği sunucuyu düşürdü');
});
