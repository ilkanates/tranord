/**
 * ORDU DENGESİ — kışla ve ahır BİRLİKTE çalışmalı.
 *
 * İlkan bildirdi: *"hem kışla hem ahır full olmalı; senin bahsettiğin
 * senaryoda diğer birimlere hiç gerek yok."* Haklıydı.
 *
 * ÖLÇÜLEN DENGESİZLİK (ekipman Lvl 20, düzeltmeden önce): Jernridder
 * en iyi piyadeyi HER BAŞLIKTA yeniyordu — saldırı 124.8'e 107.3,
 * savunma 124.0'a 92.0, hız 7'ye 3, taşıma 85'e 35 — ve AYNI silahçı +
 * zırhçı yükünü kullanıyordu. Tek farkı 2 ekmekti.
 *
 * KÖK SEBEP: köyde silahçı, zırhçı ve ahırın üçü de Lvl 20'de 60 işçi
 * alıyor ve PARALEL çalışıyor. Piyade üç atölyeden ikisini kullanıyor,
 * süvari üçünü. Atölyeler paralel olduğu için at, boşta duran bir
 * fabrikayı açmaktan ibaretti — zaman olarak bedava.
 *
 * Bu test o hatayı geri gelmekten koruyor: at kılıçtan uzun sürmeli ve
 * KARIŞIK ordu saf ordulardan iyi olmalı. Sayılar dengelenirken bu iki
 * cümle korunduğu sürece kışla anlamını kaybetmiyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const { UNIT_DEFS, EQUIPMENT_DEFS } = require('../data');
const { unitStats } = require('../data/militaryDefs');

/** Ekipman Lvl 20 — dengenin sınandığı nokta, çünkü orada uçlar açılıyor */
const TAM = { kilic: 20, mizrak: 20, kalkan: 20, zirh: 20, at: 20 };

const ATOLYE = {
  kilic: 'silahci', mizrak: 'silahci',
  kalkan: 'zirhci', zirh: 'zirhci',
  at: 'ahir',
};

/** Bir birimin atölyelere bindirdiği saat yükü */
function yuk(birim) {
  const s = { silahci: 0, zirhci: 0, ahir: 0 };
  for (const e of UNIT_DEFS[birim]?.equipment || []) {
    if (ATOLYE[e]) s[ATOLYE[e]] += EQUIPMENT_DEFS[e]?.productionHours || 0;
  }
  return s;
}

/**
 * Bir ordunun atölye saati başına saldırısı.
 *
 * ÖLÇÜT EN YOĞUN ATÖLYE: üçü paralel çalıştığı için ordu, en çok
 * yüklenen atölye kadar hızlı çıkıyor. Toplam saati bölmek, boşta duran
 * atölyeyi çalışıyormuş gibi sayardı.
 */
function verim(...birimler) {
  const t = { silahci: 0, zirhci: 0, ahir: 0 };
  let saldiri = 0;
  for (const b of birimler) {
    const s = yuk(b);
    t.silahci += s.silahci; t.zirhci += s.zirhci; t.ahir += s.ahir;
    saldiri += unitStats(b, TAM).saldiri;
  }
  const yogun = Math.max(t.silahci, t.zirhci, t.ahir) || 1;
  return { yuk: t, saldiri, verim: saldiri / yogun };
}

test('at, kılıçtan UZUN sürüyor — süvarinin gerçek bedeli burada', () => {
  const at = EQUIPMENT_DEFS.at.productionHours;
  const kilic = EQUIPMENT_DEFS.kilic.productionHours;
  assert.ok(at > kilic,
    `at (${at}s) kılıçtan (${kilic}s) uzun olmalı — eşit olduğunda ahır `
    + 'boşta duran bedava bir fabrikaya dönüyor ve süvari her başlıkta kazanıyor');
});

test('KARIŞIK ordu saf süvariden de saf piyadeden de iyi', () => {
  const safSuvari = verim('jernridder');
  const safPiyade = verim('ulvSavasci');
  const karisik = verim('jernridder', 'ulvSavasci');

  assert.ok(karisik.verim > safSuvari.verim,
    `karışık (${karisik.verim.toFixed(1)}) saf süvariyi (${safSuvari.verim.toFixed(1)}) geçmeli`);
  assert.ok(karisik.verim > safPiyade.verim,
    `karışık (${karisik.verim.toFixed(1)}) saf piyadeyi (${safPiyade.verim.toFixed(1)}) geçmeli`);
});

test('1:1 karışımda ÜÇ ATÖLYE de tam dolu — hiçbiri beklemiyor', () => {
  const { yuk: t } = verim('jernridder', 'ulvSavasci');
  assert.equal(t.silahci, t.zirhci,
    'silahçı ve zırhçı eşit yüklenmeli, yoksa biri boş bekler');
  assert.equal(t.silahci, t.ahir,
    'ahır da aynı yükte olmalı — dengenin tamamı bu eşitlikte');
});

test('süvari hâlâ en güçlü asker — bedeli üretim hızı, gücü değil', () => {
  /*
    DÜZELTME GÜCE DOKUNMADI. Süvariyi zayıflatmak da bir çözümdü ama
    o zaman at takmanın anlamı kalmazdı; burada bedel ÜRETİM HIZINA
    konuldu. Bu test, ileride birinin gücü kısarak "dengelemesini"
    fark edilir kılıyor.
  */
  const suvari = unitStats('jernridder', TAM);
  const piyade = unitStats('ulvSavasci', TAM);
  assert.ok(suvari.saldiri > piyade.saldiri, 'en iyi süvari en güçlü asker olmaya devam etmeli');
  assert.ok(suvari.hiz > piyade.hiz, 'süvarinin hız üstünlüğü korunmalı');
  assert.ok(suvari.kapasite > piyade.kapasite, 'süvarinin taşıma üstünlüğü korunmalı');
});
