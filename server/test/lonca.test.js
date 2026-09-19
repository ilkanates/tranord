/**
 * LONCALAR — tanımdaki vaat ile gerçek üretim tutuyor mu.
 *
 * Beş lonca binası (demir/odun/taş/kil/tahıl) tanımda duruyordu,
 * görseli ve videosu vardı, oyuncuya *"her seviye +%5, en fazla +%25"*
 * diye yazıyordu — ve motorda `bonusPerLevel` ile `affects` alanlarını
 * **hiçbir kod okumuyordu.** Oyuncu kurar, kaynağını öder, hiçbir şey
 * olmazdı.
 *
 * BU HATA HİÇ HATA VERMİYORDU. Bina kuruluyor, ekranda duruyor, sayılar
 * akıyor. Yalnız "kurmadan önce ve sonra üretimi ölç" diyen biri fark
 * edebilirdi — bu dosyanın yaptığı tam olarak o.
 *
 * Testin ikinci işi vaadi TANIMDAN okumak: sayıyı buraya kopyalasaydım
 * lonca dengesi değiştiğinde test yeşil kalır ama oyuncuya söylenen ile
 * olan yine ayrışırdı.
 */
const test = require('node:test');
const assert = require('node:assert');
const { createVillage } = require('../game/villageState');
const TICK = require('../game/tick');
const { VILLAGE_DEFS } = require('../data');

/** Loncası olan/olmayan, aynı tarlalara sahip iki köy */
function koy({ lonca = null, seviye = 0, tarla = 'demir' } = {}) {
  const v = createVillage(0, 0);
  v.villageBuildings['0,0'] = { type: 'anaBina', level: 10 };
  for (const key of ['1,0', '2,0', '1,-1', '2,-1']) {
    v.productionTiles[key] = {
      type: tarla, level: 10, workers: 99,
      upgrading: false, upgradeEndTime: null, upgradeWorkersAssigned: 0,
    };
  }
  if (lonca) v.villageBuildings['3,0'] = { type: lonca, level: seviye };
  v.population = 500; v.freeWorkers = 200;
  return v;
}

/**
 * SAATLİK ÜRETİM — stoktan değil, üretim oranından.
 *
 * Stok farkını ölçmek iki kez yanılttı: depo tavanı dolunca iki köy aynı
 * sayıyı veriyordu, tahılda ise nüfusun tükettiği pay "taban × 1,25"
 * beklentisini kaydırıyordu. Aranan şey tarlanın ÜRETİMİ; paket zaten
 * onu hesaplıyor ve aynı çarpandan geçiyor.
 */
const { buildPayload } = require('../game/payload');
const saatlikUretim = (v, kaynak) =>
  buildPayload(v, 1000, { statics: true }).productionPerHour[kaynak] || 0;

/** Tanımdaki vaat — sayı buraya kopyalanmıyor */
const vaat = (tip) => {
  const d = VILLAGE_DEFS[tip];
  return { perLevel: d.bonusPerLevel, max: d.maxLevel, affects: d.affects };
};

test('LONCA GERCEKTEN URETIMI ARTIRIYOR — tanimdaki kadar', () => {
  const v = vaat('loncaDemir');
  const taban = saatlikUretim(koy(), 'demir');
  assert.ok(taban > 0, 'ölçüm kurulamadı: loncasız köy üretmiyor');

  for (const seviye of [1, 3, v.max]) {
    const ile = saatlikUretim(koy({ lonca: 'loncaDemir', seviye }), 'demir');
    const beklenen = taban * (1 + (v.perLevel * seviye) / 100);
    assert.ok(Math.abs(ile - beklenen) < taban * 0.001,
      `Lvl ${seviye}: beklenen ${Math.round(beklenen)}, ölçülen ${Math.round(ile)}`);
  }
});

test('LONCA YALNIZ KENDI KAYNAGINI artiriyor', () => {
  /*
    `affects` alanı okunmasaydı ya hiçbir şey ya da her şey artardı;
    ikisi de tanımdaki cümleyi yalanlardı.
  */
  const tabanOdun = saatlikUretim(koy({ tarla: 'odun' }), 'odun');
  const demirLoncasiyla = saatlikUretim(
    koy({ tarla: 'odun', lonca: 'loncaDemir', seviye: 5 }), 'odun');
  assert.equal(demirLoncasiyla, tabanOdun, 'demir loncası odunu da artırdı');
});

test('INSA HALINDEKI lonca (level 0) bonus VERMIYOR', () => {
  /* Yarım bina üretim artırırsa, kurmadan kazanmak mümkün olur */
  const taban = saatlikUretim(koy(), 'demir');
  const insaHalinde = saatlikUretim(koy({ lonca: 'loncaDemir', seviye: 0 }), 'demir');
  assert.equal(insaHalinde, taban);
});

test('BES LONCANIN BESI DE calisiyor ve DOGRU kaynagi vuruyor', () => {
  /*
    Biri unutulsa kimse fark etmezdi: dördü çalışırken beşincisi sessizce
    ölü kalır ve yalnız o loncayı kuran oyuncu kandırılmış olurdu.
  */
  const loncalar = Object.keys(VILLAGE_DEFS).filter(k => VILLAGE_DEFS[k].bonusPerLevel);
  assert.equal(loncalar.length, 5, `lonca sayısı beklenenden farklı: ${loncalar.join(', ')}`);

  for (const tip of loncalar) {
    const { affects, perLevel, max } = vaat(tip);
    assert.ok(affects, `${tip}: affects tanımsız`);
    const taban = saatlikUretim(koy({ tarla: affects }), affects);
    const ile = saatlikUretim(koy({ tarla: affects, lonca: tip, seviye: max }), affects);
    const beklenen = taban * (1 + (perLevel * max) / 100);
    assert.ok(Math.abs(ile - beklenen) < taban * 0.001,
      `${tip} (${affects}): beklenen ${Math.round(beklenen)}, ölçülen ${Math.round(ile)}`);
  }
});

test('loncaYuzdesi: bina yokken 0, tavan asilmiyor', () => {
  assert.equal(TICK.loncaYuzdesi(koy(), 'demir'), 0);
  const { perLevel, max } = vaat('loncaDemir');
  assert.equal(TICK.loncaYuzdesi(koy({ lonca: 'loncaDemir', seviye: max }), 'demir'),
    perLevel * max);
  /*
    SEVİYE TAVANI AŞILAMAZ: bozuk bir kayıt Lvl 99 yazsa bile bonus
    tanımdaki tavanla sınırlı kalmalı.
  */
  assert.equal(TICK.loncaYuzdesi(koy({ lonca: 'loncaDemir', seviye: 99 }), 'demir'),
    perLevel * max);
});

test('paketteki loncaBonus ile motorun hesabi AYNI', () => {
  /*
    İstemci yeni tarla önizlemesinde bu sayıyı kullanıyor. Ayrışırsa
    oyuncu loncayı kurar, önizleme eski sayıyı gösterir ve "lonca
    çalışmıyor" der — yani hata aynı yerden geri gelir.
  */
  const v = koy({ lonca: 'loncaDemir', seviye: 5 });
  const p = buildPayload(v, 1000, { statics: true });
  assert.ok(p.loncaBonus, 'paket loncaBonus taşımıyor');
  assert.equal(p.loncaBonus.demir, TICK.loncaYuzdesi(v, 'demir'));
  assert.equal(p.loncaBonus.odun, 0);
});
