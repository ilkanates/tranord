/**
 * DÜNYANIN YAŞI — eşya kademesi ve macera hammaddesi.
 *
 * İlkan: *"bulunan hammaddelerde serverın zamanına göre olmalı, oyun
 * başlayalı ne kadar olmuş gibi bir hesaptan yapılmalı. Item lvl'leri de
 * yine server zamanına göre: ilk ay Lvl 1'ler, ikinci ay Lvl 2'ler
 * düşmeye başlasın gibi."* ve *"oyun zamanına göre — oyun 1× ise
 * gerçekten 1 ay, 10× ise 3 gün."*
 *
 * ÖLÇÜ OYUN ZAMANI. Gerçek zamanı ölçseydik hızlı bir sunucuda oyuncular
 * her şeyi on kat hızlı yaşarken eşya kademesi takvimi bekler, dünya
 * olgunlaşmışken hâlâ Lvl 1 eşya düşerdi. Bu dosya kuralın bu yanını da
 * ölçüyor: girdisi OYUN saati, gerçek saat değil.
 */
const test = require('node:test');
const assert = require('node:assert');
const DUNYA = require('../game/dunyaYasi');
const DEGER = require('../game/esyaDeger');
const M = require('../game/macera');

const AY = DUNYA.AY_SAAT;      // 720 oyun saati = 30 oyun günü

test('10x DÜNYADA bir ay ÜÇ GERÇEK GÜN eder', () => {
  /*
    İlkan'ın cümlesinin birebir ölçümü. Kural oyun saatiyle yazıldığı
    için hız çarpanı kendiliğinden içinde: 3 gerçek gün × 10 = 30 oyun
    günü = 1 ay.
  */
  const gercekGun = 3;
  const hiz = 10;
  const oyunSaati = gercekGun * 24 * hiz;
  assert.equal(Math.round(DUNYA.oyunAyi(oyunSaati) * 100) / 100, 1,
    '10× sunucuda 3 gerçek gün bir oyun ayı etmeli');

  /* 1× sunucuda aynı ay 30 gerçek gün sürüyor */
  assert.equal(Math.round(DUNYA.oyunAyi(30 * 24 * 1) * 100) / 100, 1);
});

test('EŞYA KADEMESİ aylarla açılıyor — ilk ay yalnız Lvl 1', () => {
  const tavan = (ay) => DUNYA.esyaSeviyeTavani(ay, DEGER.MAKS_SEVIYE);
  assert.equal(tavan(0), 1, 'ilk ay yalnız Lvl 1 düşmeli');
  assert.equal(tavan(0.9), 1, 'ay dolmadan kademe açılmamalı');
  assert.equal(tavan(1), 2, 'ikinci ay Lvl 2 açılmalı');
  assert.equal(tavan(2), 3);
  assert.equal(tavan(4), DEGER.MAKS_SEVIYE);
  assert.equal(tavan(50), DEGER.MAKS_SEVIYE,
    'dünya yaşlansa da eşyanın kendi seviye sınırı aşılamaz');
});

test('DÜŞEN SEVİYE tavanı aşmıyor ve ALT SEVİYELERE ağırlıklı', () => {
  /*
    Düz kura olsaydı tavanın açıldığı gün eşyaların beşte biri anında en
    üst seviyede düşerdi ve yükseltme diye bir iş kalmazdı.
  */
  let i = 0;
  const rnd = () => { i += 1; return ((i * 2654435761) % 4294967296) / 4294967296; };

  for (const ay of [0, 1, 2, 4, 9]) {
    const tavan = DUNYA.esyaSeviyeTavani(ay, DEGER.MAKS_SEVIYE);
    const sayac = {};
    for (let n = 0; n < 4000; n++) {
      const s = DUNYA.dusenEsyaSeviyesi(ay, DEGER.MAKS_SEVIYE, rnd);
      assert.ok(s >= 1 && s <= tavan, `ay ${ay}: seviye ${s} tavanı (${tavan}) aşıyor`);
      sayac[s] = (sayac[s] || 0) + 1;
    }
    if (tavan > 1) {
      assert.ok((sayac[1] || 0) > (sayac[tavan] || 0) * 2,
        `ay ${ay}: alt seviye baskın olmalı (Lvl 1 ${sayac[1]}, Lvl ${tavan} ${sayac[tavan]})`);
    }
  }
});

test('MACERA HAMMADDESİ dünyayla büyüyor — tavanı var', () => {
  const c = DUNYA.hammaddeCarpani;
  assert.equal(c(0), 1, 'ilk gün taban miktar');
  assert.ok(c(3) > c(1), 'dünya yaşlandıkça artmalı');
  assert.equal(c(999), DUNYA.HAMMADDE_TAVAN,
    'tavansız çarpan yıllarca açık bir dünyada macerayı sınırsız kılardı');
});

test('MACERA ÖDÜLÜ dünyanın yaşını GERÇEKTEN kullanıyor', () => {
  /*
    Kuralın tanımlı olması yetmez, kuraya bağlanmış olması gerekiyor —
    bu projede "sabit tanımlı ama hiç okunmuyor" hatası daha önce
    yaşandı (bkz. macera.test.js · ölü ağırlık).
  */
  const topla = (ay) => {
    let ham = 0, kez = 0, enYuksekSeviye = 0;
    for (let n = 0; n < 3000; n++) {
      for (const o of M.maceraSonucu('uzun', undefined, 0, 0, ay).oduller) {
        if (o.tur === 'hammadde') { ham += o.adet; kez++; }
        if (o.tur === 'esya' && !o.kullanilir) {
          enYuksekSeviye = Math.max(enYuksekSeviye, o.seviye || 1);
        }
      }
    }
    return { ortHam: kez ? ham / kez : 0, enYuksekSeviye };
  };

  const yeni = topla(0);
  const olgun = topla(3);
  assert.ok(olgun.ortHam > yeni.ortHam * 2,
    `olgun dünyada hammadde belirgin fazla olmalı (${yeni.ortHam.toFixed(0)} → ${olgun.ortHam.toFixed(0)})`);
  assert.equal(yeni.enYuksekSeviye, 1, 'ilk ay yalnız Lvl 1 eşya düşmeli');
  assert.ok(olgun.enYuksekSeviye > 1, 'olgun dünyada üst seviye eşya da düşmeli');
});

test('İKSİRİN SEVİYESİ OLMAZ — kuşanılmayan eşyanın bonusu yok', () => {
  let bulundu = false;
  for (let n = 0; n < 6000 && !bulundu; n++) {
    for (const o of M.maceraSonucu('uzun', undefined, 0, 0, 9).oduller) {
      if (o.tur === 'esya' && o.kullanilir) {
        assert.equal(o.seviye, 1, 'iksir hep Lvl 1 kalmalı');
        bulundu = true;
      }
    }
  }
  assert.equal(bulundu, true, 'test için iksir düşmedi — havuz değişmiş olabilir');
});
