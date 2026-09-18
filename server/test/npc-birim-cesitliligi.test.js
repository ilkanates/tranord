/**
 * NPC BİRİM ÇEŞİTLİLİĞİ — dünyadaki her asker aynı tip olmasın.
 *
 * Admin panelinin ilk bulgusu: 700 köy, 297 bin asker, TEK TÜR
 * (`fjordvakt`). Sebep `tryMilitary` içinde üç satırdı ve üçü de aynı
 * desende: **"listenin ilkini al, hiç çeşitlendirme."**
 *
 *   · ekipmanda `list[0]`  → yalnız kılıç ve kalkan üretiliyordu,
 *     mızrak ve zırh hiç yapılmadığı için onları isteyen birimler
 *     dünyada hiç doğamıyordu
 *   · birimde `.find(...)` → tanım sırasındaki ilk uygun birim
 *   · yalnız `kisla` eğitiyordu → 477 köyde ahır vardı ve dünyada
 *     SIFIR süvari
 *
 * Bu hatanın hiçbir testi yoktu ve **hiçbir zaman hata da vermiyordu**:
 * ordu büyüyor, savaşlar oluyor, her şey çalışıyor gibi görünüyordu.
 * Ancak dağılıma bakan biri fark edebilirdi. Bu dosya o bakışı
 * kalıcılaştırıyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const NPC = require('../game/npcAi');
const { UNIT_DEFS, EQUIPMENT_DEFS } = require('../data');

/** Asker eğitebilecek durumda, dar bir sahte köy */
function koy({ binalar = ['kisla'], ekipman = {}, worldQ = 3, worldR = -2 } = {}) {
  return {
    worldQ, worldR,
    population: 500, freeWorkers: 200, tickCount: 0,
    isStarving: false,
    resources: Object.fromEntries(
      ['odun', 'kil', 'tas', 'demir', 'tahil', 'kereste', 'tugla', 'yontmaTas', 'demirKulce']
        .map(k => [k, 99999])),
    equipment: { kilic: 0, mizrak: 0, kalkan: 0, zirh: 0, at: 0, ...ekipman },
    equipmentQueues: { silahci: [], zirh: [], ahir: [], atolye: [] },
    unitQueues: { kisla: [], ahir: [], atolye: [] },
    nextOrderId: 1, nextUnitOrderId: 1,
    villageBuildings: Object.fromEntries(
      binalar.map((t, i) => [`${i},0`, { type: t, level: 10, workers: 5 }])),
    productionTiles: {},
    army: {},
  };
}

test('egitilebilirler TEK birim degil, TUM uygunlari veriyor', () => {
  /*
    Hatanın kalbi buydu: `.find` her zaman bir tane döndürüyordu ve o da
    hep aynısıydı.
  */
  const v = koy({ ekipman: { kilic: 50, kalkan: 50, zirh: 50 } });
  const adaylar = NPC.egitilebilirler(v, 'kisla');
  assert.ok(adaylar.length > 1,
    `kışlada tek aday döndü: ${adaylar.map(a => a.key).join(', ')}`);

  /* Hepsi gerçekten kışla birimi ve ekipmanı depoda olmalı */
  for (const a of adaylar) {
    assert.equal(UNIT_DEFS[a.key].trainedAt, 'kisla');
    for (const e of UNIT_DEFS[a.key].equipment || []) {
      assert.ok((v.equipment[e] || 0) >= 1, `${a.key} için ${e} yokken aday oldu`);
    }
  }
});

test('ekipmani olmayan birim aday OLMUYOR', () => {
  /* Yalnız kılıç varsa kalkan/zırh isteyen birimler listede olmamalı */
  const v = koy({ ekipman: { kilic: 50 } });
  const adaylar = NPC.egitilebilirler(v, 'kisla').map(a => a.key);
  assert.ok(adaylar.includes('fjordvakt'), 'kılıçla eğitilen birim düştü');
  assert.ok(!adaylar.includes('skjoldvakt'), 'kalkanı yokken kalkanlı birim aday oldu');
});

test('IZCI ve GOCMEN NPC adayi degil', () => {
  /*
    İzcinin saldırısı ve savunması yok; NPC'nin keşif diye bir kararı da
    yok. Rastgele seçim izciye düşerse köy kaynağını hiçbir işe
    yaramayan bir birime harcardı.
  */
  const v = koy({ binalar: ['ahir'], ekipman: { at: 99, kilic: 99, kalkan: 99, zirh: 99 } });
  const adaylar = NPC.egitilebilirler(v, 'ahir').map(a => a.key);
  assert.ok(!adaylar.includes('kuzeyIzcisi'), 'izci aday oldu');
  assert.ok(!adaylar.includes('gocmen'), 'göçmen aday oldu');
  assert.ok(adaylar.length > 0, 'ahırda hiç aday kalmadı');
});

test('EKIPMANDA en az olan uretiliyor — hep list[0] degil', () => {
  /*
    Eskiden silahçı yalnız KILIÇ, zırhçı yalnız KALKAN üretiyordu.
    Mızrak ve zırh hiç yapılmadığı için spydvakt, nordkamper ve isbjorn
    dünyada hiç doğamıyordu.
  */
  /* Cephanelik havuz kapasitesini açıyor — havuz doluysa üretim hiç başlamaz */
  const v = koy({ binalar: ['silahci', 'cephane'], ekipman: { kilic: 40, mizrak: 0 } });
  assert.equal(NPC.tryMilitary(v, false), true, 'ekipman siparişi açılmadı');
  const siparis = v.equipmentQueues.silahci[0];
  assert.equal(siparis.type, 'mizrak',
    `stoğu bol olan üretildi: ${siparis.type}`);

  /* Tersine çevir — kural stoka bakıyor, sabit bir tercihe değil */
  const v2 = koy({ binalar: ['silahci', 'cephane'], ekipman: { kilic: 0, mizrak: 40 } });
  NPC.tryMilitary(v2, false);
  assert.equal(v2.equipmentQueues.silahci[0].type, 'kilic');
});

test('ASKER UC BINADA DA egitiliyor — ahir artik bos durmuyor', () => {
  /*
    Ölçüldü: 477 NPC köyünde ahır vardı (ortalama Lvl 5,2) ve dünyada
    SIFIR süvari. O ahırlar at üretip duruyor, nüfus ve kaynak yiyordu.
  */
  const kullanilan = new Set();
  /* Farklı köyler farklı sıralar denesin — seçim köye sabit rastgele */
  for (let i = 0; i < 40; i++) {
    const v = koy({
      binalar: ['kisla', 'ahir'],
      ekipman: { kilic: 999, mizrak: 999, kalkan: 999, zirh: 999, at: 999 },
      worldQ: i, worldR: -i,
    });
    /* Ekipman havuzu dolu olduğu için doğrudan asker sırasına düşüyor */
    NPC.tryMilitary(v, false);
    for (const bina of ['kisla', 'ahir', 'atolye']) {
      if ((v.unitQueues[bina] || []).length) kullanilan.add(bina);
    }
  }
  assert.ok(kullanilan.has('ahir'), 'ahırda hiç asker eğitilmedi — süvari yok demek');
  assert.ok(kullanilan.has('kisla'), 'kışlada hiç asker eğitilmedi');
});

test('DUNYA TEK TIPE COKMUYOR — dagilim olculuyor', () => {
  /*
    ASIL İDDİA. Tek bir köye bakmak yetmez: hata dünya ölçeğinde
    görünüyordu (700 köy, tek tür). Burada 60 farklı köy, her biri
    kendi konumuyla, asker seçiyor ve kaç FARKLI tür çıktığı sayılıyor.
  */
  const turler = new Map();
  for (let i = 0; i < 60; i++) {
    const v = koy({
      binalar: ['kisla', 'ahir'],
      ekipman: { kilic: 999, mizrak: 999, kalkan: 999, zirh: 999, at: 999 },
      worldQ: i * 3 - 40, worldR: 17 - i,
    });
    NPC.tryMilitary(v, false);
    for (const bina of ['kisla', 'ahir', 'atolye']) {
      for (const s of v.unitQueues[bina] || []) {
        turler.set(s.type, (turler.get(s.type) || 0) + 1);
      }
    }
  }
  assert.ok(turler.size >= 4,
    `dünya ${turler.size} tipe çöktü: ${[...turler.keys()].join(', ')}`);

  /* Hiçbir tip her şeyi kapmasın — "çeşitlilik" tek bir tipin %95'i olmasın */
  const enCok = Math.max(...turler.values());
  const toplam = [...turler.values()].reduce((a, b) => a + b, 0);
  assert.ok(enCok / toplam < 0.75,
    `tek tip baskın: %${Math.round(enCok / toplam * 100)}`);
});

test('ac koy ve kucuk koy asker basmiyor', () => {
  /* Ekonomi kırılganken ordu kurmak köyü açlığa sokuyordu (eski ölçüm) */
  const v = koy({ ekipman: { kilic: 999 } });
  assert.equal(NPC.tryMilitary(v, true), false, 'aç köy asker bastı');

  const kucuk = koy({ ekipman: { kilic: 999 } });
  kucuk.population = 50;
  assert.equal(NPC.tryMilitary(kucuk, false), false, 'nüfusu yetmeyen köy asker bastı');
});

test('bekleyen siparis varken ustune yigilmiyor', () => {
  const v = koy({ ekipman: { kilic: 999, kalkan: 999, zirh: 999 } });
  NPC.tryMilitary(v, false);
  const ilk = (v.unitQueues.kisla || []).length + (v.equipmentQueues.silahci || []).length;
  NPC.tryMilitary(v, false);
  NPC.tryMilitary(v, false);
  const son = (v.unitQueues.kisla || []).length + (v.equipmentQueues.silahci || []).length;
  assert.ok(son <= ilk + 2, `kuyruğa yığıldı: ${ilk} → ${son}`);
});

test('EQUIPMENT_DEFS ile tanimlar tutarli — aday ekipmani gercekten var', () => {
  /*
    Tanımlarda olmayan bir ekipman isteyen birim hiçbir zaman
    eğitilemez ve sessizce ölü kalır — bu dosyanın anlattığı hatanın
    tam kardeşi.
  */
  for (const [key, d] of Object.entries(UNIT_DEFS)) {
    for (const e of d.equipment || []) {
      assert.ok(EQUIPMENT_DEFS[e], `${key} tanımsız ekipman istiyor: ${e}`);
    }
  }
});
