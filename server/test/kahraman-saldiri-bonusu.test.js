/**
 * KAHRAMANIN SALDIRI BONUSU ORDUYA YANSIYOR MU?
 *
 * İlkan sordu: *"başka bir köye saldırırken kahramanımı da
 * gönderdiğimde saldırı bonusu orduya yansıyor mu, kesin kontrol yap."*
 *
 * Cevap ölçülerek verildi ve bu dosya ölçümü kilitliyor. Kahramanın
 * savaşa ÜÇ ayrı katkısı var ve üçü farklı çalışıyor:
 *
 *   1) SALDIRI PUANI — kahramanın kendi vuruşu, orduya HAM olarak
 *      ekleniyor ve kahraman atlıysa atlı tarafına yazılıyor.
 *   2) SALDIRI BONUSU — ORDUNUN TAMAMINI yüzdeyle çarpıyor. Asıl
 *      soru buydu: kahraman orduyu güçlendiriyor mu, yoksa yalnız
 *      kendisi mi vuruyor?
 *   3) EŞYA BİRİM BONUSU — belirli birim sınıflarına ek.
 *
 * Üçünü ayrı ayrı ölçmek şart: ikisi birden açıkken bir tanesi hiç
 * çalışmasa bile toplam yine büyür ve hata görünmez.
 */
const test = require('node:test');
const assert = require('node:assert');
const { simulateBattle } = require('../game/combat');

const ORDU = { fjordvakt: 200, nordkamper: 100 };
const SAVUNAN = { fjordvakt: 150 };
const TEMEL = { surLevel: 0, mode: 'normal' };
const coz = (ek = {}) => simulateBattle(ORDU, SAVUNAN, { ...TEMEL, ...ek });
const say = (o) => Object.values(o || {}).reduce((a, c) => a + c, 0);

test('kahramanin ham gucu orduya BIREBIR ekleniyor', () => {
  const yok = coz();
  const ile = coz({ kahramanSaldiriGucu: 252, kahramanSuvari: true });
  assert.ok(Math.abs((ile.attackTotal - yok.attackTotal) - 252) < 0.02,
    `ham güç birebir eklenmeli: ${yok.attackTotal} → ${ile.attackTotal}`);
});

test('SALDIRI BONUSU ORDUNUN TAMAMINI carpiyor', () => {
  /*
    BU DOSYANIN ASIL KİLİDİ. Yüzde yalnız kahramanın kendi vuruşuna
    uygulansaydı çarpan 1'e çok yakın çıkardı ve kahramana skil puanı
    yatırmak neredeyse hiçbir işe yaramazdı.
  */
  const yok = coz();
  for (const yuzde of [10, 20, 50]) {
    const r = coz({ kahramanSaldiriYuzde: yuzde });
    const carpan = r.attackTotal / yok.attackTotal;
    assert.ok(Math.abs(carpan - (1 + yuzde / 100)) < 0.0005,
      `%${yuzde} için çarpan ${carpan.toFixed(4)} olmalıydı ${(1 + yuzde / 100)}`);
  }
});

test('ham guc ve yuzde birlikte: yuzde HAM GUCU de kapsiyor', () => {
  /*
    Sıra önemli: önce kahramanın vuruşu toplama giriyor, sonra yüzde
    TOPLAMI çarpıyor. Tersi olsaydı kahramanın kendi gücü bonusundan
    yararlanmazdı ve iki ayrı skile yatırım yapmak birbirini beslemezdi.
  */
  const yok = coz();
  const r = coz({ kahramanSaldiriGucu: 252, kahramanSaldiriYuzde: 25 });
  const beklenen = (yok.attackTotal + 252) * 1.25;
  assert.ok(Math.abs(r.attackTotal - beklenen) < 0.05,
    `beklenen ${beklenen.toFixed(2)}, ölçülen ${r.attackTotal}`);
});

test('bonus savasin SONUCUNU degistiriyor', () => {
  /*
    Toplamın büyümesi tek başına yetmez: sayı bir yerde hesaplanıp
    kayıp hesabına hiç girmeseydi bu testler yine geçerdi.
  */
  const yok = coz();
  const ile = coz({ kahramanSaldiriGucu: 252, kahramanSaldiriYuzde: 25 });
  assert.ok(say(ile.attackerLosses) < say(yok.attackerLosses),
    `kahramanlı saldırıda kayıp azalmalı: ${say(yok.attackerLosses)} → ${say(ile.attackerLosses)}`);
});

test('kahraman atliysa gucu ATLI tarafina yaziliyor', () => {
  /*
    Savunanın atlı/yaya dengesini kaydırıyor: atlı kahramana karşı
    mızrakçı, yaya kahramana karşı kalkancı işe yarıyor. Hep piyade
    saysaydık at bonusu savaşta hiçbir şey ifade etmezdi.
  */
  const yaya = coz({ kahramanSaldiriGucu: 2000, kahramanSuvari: false });
  const atli = coz({ kahramanSaldiriGucu: 2000, kahramanSuvari: true });
  assert.ok(atli.cavRatio > yaya.cavRatio,
    'atlı kahraman süvari oranını yükseltmeli');
  assert.ok(Math.abs(atli.attackTotal - yaya.attackTotal) < 0.02,
    'toplam güç aynı kalmalı — değişen yalnız sınıf dağılımı');
});

test('rapor kahramanin katkisini AYRI satirda tasiyor', () => {
  /*
    Oyuncu savaşı neden kazandığını görebilmeli; sur bonusuyla tek
    sayıya karıştırılsaydı kahramana yatırım yapmanın işe yarayıp
    yaramadığı hiç ölçülemezdi.
  */
  const r = coz({ kahramanSaldiriGucu: 252, kahramanSaldiriYuzde: 20, kahramanSuvari: true });
  assert.equal(r.kahramanSaldiriGucu, 252);
  assert.equal(r.kahramanSaldiriYuzde, 20);
  assert.equal(r.kahramanSuvari, true);
});

test('bonus yoksa savas kahramansiz sonucla BIREBIR ayni', () => {
  /*
    Sıfır bonusun sessizce bir şeyleri değiştirmediğinin kanıtı —
    "kahramanı ekledim ama hiçbir şey değişmedi" şikâyetinin tersten
    kontrolü.
  */
  const yok = coz();
  const sifir = coz({ kahramanSaldiriGucu: 0, kahramanSaldiriYuzde: 0 });
  assert.equal(sifir.attackTotal, yok.attackTotal);
  assert.deepEqual(sifir.attackerLosses, yok.attackerLosses);
});
