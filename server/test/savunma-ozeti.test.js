/**
 * SAVUNMA YAPILARININ KATKISI — yapı yapı, yüzde olarak.
 *
 * İlkan: *"ordu menüsünde mevcut defans binalarımın katkısını yüzde
 * olarak ayrı ayrı göster"*.
 *
 * Bu özet EKRAN İÇİN üretiliyor ama SAVAŞ HESABIYLA aynı sayıyı
 * vermek zorunda: oyuncuya "savunmam %115" deyip savaşta başka bir
 * çarpan uygulamak, ekranı yalancı yapar. Testler ikisini
 * karşılaştırıyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const { savunmaOzeti, wallBonusPct, towerBonusPct } = require('../game/combat');
const { createVillage } = require('../game/villageState');
const { SUR_BONUS, HENDEK_BONUS, DEF_BONUS_CAP } = require('../data');

function koy({ sur = 0, hendek = 0, kuleler = [] } = {}) {
  const v = createVillage(2, 2);
  if (sur > 0) v.villageBuildings.sur = { type: 'sur', level: sur, workers: 0 };
  if (hendek > 0) v.villageBuildings.hendek = { type: 'hendek', level: hendek, workers: 0 };
  kuleler.forEach((k, i) => {
    v.villageBuildings[`kule${i + 1}`] = { type: 'kule', level: k.seviye, workers: k.okcu || 0 };
  });
  return v;
}

test('özet SAVAŞ HESABIYLA aynı sayıyı veriyor', () => {
  const senaryolar = [
    { sur: 0, hendek: 0, kuleler: [] },
    { sur: 12, hendek: 8, kuleler: [] },
    { sur: 20, hendek: 20, kuleler: [{ seviye: 10, okcu: 40 }, { seviye: 10, okcu: 20 }] },
    { sur: 5, hendek: 0, kuleler: [{ seviye: 20, okcu: 80 }] },
  ];
  for (const s of senaryolar) {
    const v = koy(s);
    const o = savunmaOzeti(v);
    const gercek = wallBonusPct(s.sur, s.hendek, towerBonusPct(v));
    assert.equal(o.etkin, gercek,
      `${JSON.stringify(s)}: ekrandaki sayı savaş hesabıyla aynı olmalı`);
  }
});

test('her yapı AYRI yazılıyor ve toplamları etkin bonusu veriyor', () => {
  const v = koy({ sur: 12, hendek: 8, kuleler: [{ seviye: 10, okcu: 40 }] });
  const o = savunmaOzeti(v);
  assert.equal(o.sur.katki, SUR_BONUS[12]);
  assert.equal(o.hendek.katki, HENDEK_BONUS[8]);
  assert.equal(o.kuleler.length, 1);
  const toplam = Math.round((o.sur.katki + o.hendek.katki + o.kuleToplam) * 10) / 10;
  assert.equal(o.ham, toplam);
  assert.equal(o.etkin, Math.min(DEF_BONUS_CAP, toplam));
});

test('BOŞ KULE sıfır veriyor, dolu kadrosu tam katkıyı', () => {
  /*
    Kulesi olup okçusu olmayan oyuncunun kaybettiği bonus, yükseltmeden
    önce bakması gereken ilk yer; kart onu "dolu olsa +%X" diye yazıyor.
  */
  const bos = savunmaOzeti(koy({ kuleler: [{ seviye: 20, okcu: 0 }] }));
  assert.equal(bos.kuleler[0].katki, 0);
  assert.ok(bos.kuleler[0].tamKatki > 0, 'dolu olsaydı ne verecekti — yazılmalı');
  assert.equal(bos.kuleler[0].doluluk, 0);

  const dolu = savunmaOzeti(koy({ kuleler: [{ seviye: 20, okcu: 999 }] }));
  assert.equal(dolu.kuleler[0].katki, dolu.kuleler[0].tamKatki);
  assert.equal(dolu.kuleler[0].doluluk, 100);
  assert.equal(dolu.kuleler[0].okcu, dolu.kuleler[0].maxOkcu,
    'okçu sayısı kapasiteyi aşamaz');
});

test('TAM KADRO savunma tavanın hemen ALTINDA kalıyor', () => {
  /*
    ÖLÇÜM: sur 20 (%80) + hendek 20 (%35) + altı dolu kule (%35) = %149,8.
    Yani DEF_BONUS_CAP (%150) bugün ULAŞILAMAZ bir tavan — tabloların
    toplamı zaten oraya nişan almış. Tavan, tablolar elle değiştirilirse
    diye duran bir emniyet (bkz. combat.js · wallBonusPct).

    Bu test iki şeyi birden tutuyor: kırpma kuralının çalıştığını ve
    dengenin tavana YASLANDIĞINI. Biri bozulursa diğeri de fark edilir.
  */
  const v = koy({
    sur: 20, hendek: 20,
    kuleler: Array.from({ length: 6 }, () => ({ seviye: 20, okcu: 80 })),
  });
  const o = savunmaOzeti(v);
  assert.ok(o.ham <= DEF_BONUS_CAP,
    'tam kadro tavanı aşmamalı — aşarsa oyuncu boşa kaynak yakıyor demektir');
  assert.ok(o.ham > DEF_BONUS_CAP * 0.95,
    'tam kadro tavanın hemen altında olmalı; çok altındaysa tavan anlamsızdır');
  assert.equal(o.kirpilan, 0);
  assert.equal(o.etkin, wallBonusPct(20, 20, towerBonusPct(v)));
});

test('tavan aşılsa KIRPILAN doğru yazılır', () => {
  // Kırpma kuralı bugün hiç devreye girmiyor (yukarıdaki teste bakınız),
  // ama tablolar yeniden dengelenirse ekranın doğru şeyi söylemesi lazım.
  const v = koy({ sur: 20, hendek: 20 });
  v.villageBuildings.kule1 = { type: 'kule', level: 20, workers: 80 };
  const o = savunmaOzeti(v);
  assert.equal(o.etkin, Math.min(DEF_BONUS_CAP, o.ham));
  assert.equal(o.kirpilan, Math.round((o.ham - o.etkin) * 10) / 10);
});

test('yapısız köyde her şey sıfır, çökme yok', () => {
  const o = savunmaOzeti(koy());
  assert.equal(o.sur.var, false);
  assert.equal(o.hendek.var, false);
  assert.deepEqual(o.kuleler, []);
  assert.equal(o.etkin, 0);
  assert.equal(o.kirpilan, 0);
  assert.deepEqual(savunmaOzeti(null).kuleler, [], 'köy yoksa da çökmemeli');
});

test('İNŞAAT HÂLİNDEKİ (Lvl 0) yapı katkı vermiyor', () => {
  // Seviye 0 = henüz bir sur değil; sayılsaydı oyuncu inşaatı başlatır
  // başlatmaz savunmasının arttığını sanırdı.
  const v = createVillage(3, 3);
  v.villageBuildings.sur = { type: 'sur', level: 0, building: true, workers: 0 };
  const o = savunmaOzeti(v);
  assert.equal(o.sur.var, false);
  assert.equal(o.etkin, 0);
});
