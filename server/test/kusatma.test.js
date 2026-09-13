/**
 * KUŞATMA — koç başı sur/hendeği, mancınık binayı yıkar.
 *
 * Korunan davranışlar:
 *
 * 1) Yalnız SAĞ KALAN makineler iş yapar. Ölen mancınık vurursa kuşatma
 *    savunmadan bağımsız hâle gelir.
 * 2) Seviye maliyeti ARTAR: Lvl 20'yi indirmek Lvl 2'yi indirmekten
 *    pahalı. Sabit maliyet olsaydı yüksek sur yatırımı anlamsızlaşırdı.
 * 3) ANA BİNA Lvl 1'in altına inmez — köy yıkımı KAPALI. Açılacaksa tek
 *    yer `ANA_BINA_TABAN`; bu test o kararı kilitliyor.
 * 4) Yıkılan binanın işçileri havuza döner. Dönmezse işçiler artık var
 *    olmayan bir binada "çalışıyor" görünür ve nüfus muhasebesi bozulur.
 */
const test = require('node:test');
const assert = require('node:assert');
const K = require('../game/kusatma');
const { UNIT_DEFS, EQUIPMENT_DEFS, EQUIPMENT_BY_BUILDING } = require('../data');

function koy(binalar = {}) {
  return { villageBuildings: binalar, freeWorkers: 0, population: 100 };
}
const bina = (type, level, workers = 0) => ({ type, level, workers });

test('kuşatma ekipmanları TANIMLI ve atölyede üretiliyor', () => {
  // Bu ikisi eksikti: birimler tanımlıydı ama ekipmanları yoktu,
  // dolayısıyla kuşatma birimi HİÇ üretilemiyordu.
  assert.ok(EQUIPMENT_DEFS.koc_basi, 'koc_basi tanımlı olmalı');
  assert.ok(EQUIPMENT_DEFS.mancinik, 'mancinik tanımlı olmalı');
  assert.equal(EQUIPMENT_DEFS.koc_basi.producedAt, 'atolye');
  assert.equal(EQUIPMENT_DEFS.mancinik.producedAt, 'atolye');
  assert.deepEqual([...(EQUIPMENT_BY_BUILDING.atolye || [])].sort(),
    ['koc_basi', 'mancinik'], 'atölye bu ikisini üretmeli');

  // Birimlerin istediği ekipman gerçekten üretilebilir olmalı
  for (const u of ['kaleKiran', 'alevMancınıgı']) {
    for (const eq of UNIT_DEFS[u].equipment) {
      assert.ok(EQUIPMENT_DEFS[eq], `${u} için ${eq} tanımsız`);
      assert.ok(EQUIPMENT_DEFS[eq].producedAt, `${eq} hiçbir binada üretilmiyor`);
    }
  }
});

test('kusatmaSinifi: ekipmandan anlaşılıyor, addan değil', () => {
  assert.equal(K.kusatmaSinifi('kaleKiran'), 'koc');
  assert.equal(K.kusatmaSinifi('alevMancınıgı'), 'mancinik');
  assert.equal(K.kusatmaSinifi('fjordvakt'), null, 'normal asker kuşatma değil');
});

test('seviyeDusur: maliyet seviyeyle artıyor', () => {
  // Lvl 5 → 4 : 30×5 = 150 puan
  assert.deepEqual(K.seviyeDusur(5, 149), { dusen: 0, kalanPuan: 149 });
  assert.deepEqual(K.seviyeDusur(5, 150), { dusen: 1, kalanPuan: 0 });
  // 150 + 120 = 270 → iki seviye
  assert.equal(K.seviyeDusur(5, 270).dusen, 2);
  // Aynı puan DÜŞÜK seviyede daha çok iş görür — artan maliyetin anlamı bu
  assert.ok(K.seviyeDusur(3, 270).dusen > K.seviyeDusur(10, 270).dusen);
});

test('koç başı YALNIZ suru indiriyor — hendeğe dokunmuyor', () => {
  const v = koy({ sur: bina('sur', 3), hendek: bina('hendek', 2) });
  // kaleKiran saldırı 60 → 10 adet = 600 puan
  // sur 3: 90+60+30 = 180 → sur 0'a iner. Artan 420 puan BOŞA GİDER:
  // eskiden hendeğe geçiyordu ve tek sefer iki yapıyı birden siliyordu.
  const s = K.uygula(v, { kaleKiran: 10 });
  assert.equal(v.villageBuildings.sur.level, 0);
  assert.equal(v.villageBuildings.hendek.level, 2, 'hendek el değmeden kalmalı');
  assert.equal(s.sur, 3);
  assert.equal(s.hendek, 0);
});

test('az sayıda koç başı yüksek suru indiremiyor', () => {
  const v = koy({ sur: bina('sur', 20) });
  // 1 koç = 60 puan; Lvl 20'yi indirmek 600 puan istiyor
  const s = K.uygula(v, { kaleKiran: 1 });
  assert.equal(v.villageBuildings.sur.level, 20, 'sur dokunulmamalı');
  assert.equal(s, null, 'hiçbir şey olmadıysa sonuç yok');
});

test('mancınık SEÇİLEN binayı vuruyor', () => {
  const v = koy({
    '1,0': bina('hammaddeDepo', 4),
    '2,0': bina('kisla', 5),
  });
  // alevMancınıgı saldırı 75 → 8 adet = 600 puan
  // depo 4: 120+90+60+30 = 300 → 0'a iner
  const s = K.uygula(v, { 'alevMancınıgı': 8 }, 'hammaddeDepo');
  assert.equal(v.villageBuildings['1,0'].level, 0);
  assert.equal(v.villageBuildings['2,0'].level, 5, 'seçilmeyen bina bozulmamalı');
  assert.equal(s.binalar[0].tip, 'hammaddeDepo');
  assert.equal(s.binalar[0].onceki, 4);
  assert.equal(s.binalar[0].sonraki, 0);
});

test('hedef bina yoksa RASTGELE bina vuruluyor — sefer boşa gitmiyor', () => {
  const v = koy({ '1,0': bina('kisla', 2) });
  const s = K.uygula(v, { 'alevMancınıgı': 8 }, 'pazar');   // pazar yok
  assert.ok(s, 'hedef bulunamadı diye sefer boşa çıkmamalı');
  assert.equal(s.binalar[0].tip, 'kisla');
});

test('ANA BİNA Lvl 1 altına inmiyor — köy yıkımı kapalı', () => {
  const v = koy({ '0,0': bina('anaBina', 3) });
  // 20 mancınık = 1500 puan, fazlasıyla yeter
  K.uygula(v, { 'alevMancınıgı': 20 }, 'anaBina');
  assert.equal(v.villageBuildings['0,0'].level, K.ANA_BINA_TABAN);
  assert.equal(K.ANA_BINA_TABAN, 1,
    'köy yıkımı açılacaksa bu sabit 0 yapılır — karar burada kilitli');
});

test('yıkılan binanın işçileri havuza dönüyor', () => {
  const v = koy({ '1,0': bina('kisla', 2, 7) });
  v.freeWorkers = 3;
  K.uygula(v, { 'alevMancınıgı': 8 }, 'kisla');
  assert.equal(v.villageBuildings['1,0'].level, 0);
  assert.equal(v.villageBuildings['1,0'].workers, 0);
  assert.equal(v.freeWorkers, 10, '3 + 7 işçi havuza dönmeli');
});

test('kuşatma birimi yoksa hiçbir şey olmuyor', () => {
  const v = koy({ sur: bina('sur', 5) });
  assert.equal(K.uygula(v, { fjordvakt: 100 }), null);
  assert.equal(v.villageBuildings.sur.level, 5);
});

test('atölye kuşatma kapasitesi tanımlı ve iki tarafta aynı', async () => {
  const path = require('node:path');
  const url = require('node:url');
  const { VILLAGE_DEFS: S } = require('../data/villageDefs');
  const istemci = await import(url.pathToFileURL(
    path.join(__dirname, '..', '..', 'client', 'src', 'data', 'villageDefs.js')).href);
  const C = istemci.default || istemci.VILLAGE_DEFS;
  assert.ok(S.atolye.siegeCapPerLevel > 0, 'sunucuda tanımlı olmalı');
  assert.equal(C.atolye.siegeCapPerLevel, S.atolye.siegeCapPerLevel,
    'ikiz tanım ayrışmış');
});

/**
 * İKİ HEDEF — atölye Lvl 10 kuralı.
 *
 * Güç BÖLÜNÜYOR (%60/%40), artmıyor. Testin kilitlediği şey bu: ikinci
 * hedef bir bonus olarak yazılırsa mancınık sessizce iki katına çıkar.
 */
test('iki hedef: güç %60/%40 bölünüyor, ikisi de vuruluyor', () => {
  const v = koy({ '1,0': bina('kisla', 3), '2,0': bina('depo', 3) });
  // 8 mancınık = 600 puan. %60 = 360, %40 = 240.
  // Lvl 3 → 2 için 90, 2 → 1 için 60, 1 → 0 için 30 puan.
  K.uygula(v, { 'alevMancınıgı': 8 }, ['kisla', 'depo']);
  assert.equal(v.villageBuildings['1,0'].level, 0, '360 puan Lvl 3 kışlayı sıfırlar');
  assert.equal(v.villageBuildings['2,0'].level, 0, '240 puan Lvl 3 depoyu sıfırlar');
});

test('iki hedef bölünmesi TEK hedeften zayıf — bonus değil tercih', () => {
  const tek = koy({ '1,0': bina('kisla', 6) });
  const cift = koy({ '1,0': bina('kisla', 6), '2,0': bina('depo', 1) });
  K.uygula(tek,  { 'alevMancınıgı': 8 }, 'kisla');
  K.uygula(cift, { 'alevMancınıgı': 8 }, ['kisla', 'depo']);
  assert.ok(cift.villageBuildings['1,0'].level > tek.villageBuildings['1,0'].level,
    'bölünmüş güç aynı binayı daha az indirmeli');
});

test('tek hedef verilince eski davranış aynen sürüyor (dizi şart değil)', () => {
  const dizi = koy({ '1,0': bina('kisla', 3) });
  const metin = koy({ '1,0': bina('kisla', 3) });
  K.uygula(dizi,  { 'alevMancınıgı': 8 }, ['kisla']);
  K.uygula(metin, { 'alevMancınıgı': 8 }, 'kisla');
  assert.equal(dizi.villageBuildings['1,0'].level,
    metin.villageBuildings['1,0'].level);
});

test('ikinci hedef bulunamazsa rastgele seçim BİRİNCİYİ tekrar vurmuyor', () => {
  // 'pazar' köyde yok; ikinci atış rastgeleye düşer ve tek aday depo kalır
  for (let i = 0; i < 20; i++) {
    const v = koy({ '1,0': bina('kisla', 1), '2,0': bina('depo', 1) });
    const s = K.uygula(v, { 'alevMancınıgı': 8 }, ['kisla', 'pazar']);
    const slotlar = s.binalar.map(b => b.slotKey);
    assert.equal(new Set(slotlar).size, slotlar.length,
      'aynı slot iki atışta da seçilmiş');
  }
});

test('iki hedef eşiği ve paylar sabitlerde — denge buradan ayarlanır', () => {
  assert.equal(K.IKI_HEDEF_MIN_ATOLYE, 10);
  assert.deepEqual(K.IKI_HEDEF_PAY, [0.6, 0.4]);
  assert.equal(K.IKI_HEDEF_PAY[0] + K.IKI_HEDEF_PAY[1], 1,
    'paylar toplamı 1 olmalı — yoksa ikinci hedef gizli bir bonus/ceza olur');
});

/**
 * KUŞATMA BİRİMLERİ ARAŞTIRMA İSTER.
 *
 * Koç başının minLevel'i 1 olduğu için araştırma türetilmiyordu: atölye
 * kurulur kurulmaz sur kırma makinesi üretilebiliyordu. Kapı elle eklendi;
 * bu test onu ve "atölye şartı yükselmesin" kararını kilitliyor.
 */
test('koç başı Rún Salonu araştırması istiyor, atölye şartı Lvl 1 kalıyor', () => {
  const { UNIT_DEFS: U, needsResearch, RESEARCHABLE } = require('../data/militaryDefs');
  assert.ok(needsResearch('kaleKiran'), 'koç başı araştırma istemeli');
  assert.equal(U.kaleKiran.research.level, 2, 'Rún Salonu Lvl 2');
  assert.equal(U.kaleKiran.minLevel, 1,
    'atölye şartı yükselmemeli — tek istek için iki kapı olmaz');
  assert.ok(RESEARCHABLE.includes('kaleKiran'), 'araştırma listesinde olmalı');
  assert.ok(needsResearch('alevMancınıgı'), 'mancınık zaten istiyordu');
});
