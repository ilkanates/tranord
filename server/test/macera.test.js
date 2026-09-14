/**
 * MACERA — birikme, uygunluk ve ödül kurası.
 *
 * Kilitlenen kararlar:
 *
 * 1) Macera BİRİKİR ama tavanı var; tavan doluyken ilerleme SAKLANMAZ.
 *    Saklansaydı bir hafta girmeyen oyuncu onlarca macerayı tek seferde
 *    patlatırdı; sıfırlansaydı tavana bir adım kala giren oyuncu
 *    ilerlemesini kaybederdi.
 * 2) Konaksız oyuncunun macerası YOK — tavan 0.
 * 3) Can eşiği: canı düşük kahraman maceraya gönderilemez. Sınır
 *    olmasaydı ÖLÜM bir risk değil rutin olurdu.
 * 4) XP GARANTİ, ödül kura. Boş dönen macera "zamanımı boşa harcadım"
 *    dedirtirdi.
 * 5) Uzun macera daha çok XP veriyor ama daha çok can götürüyor — oran
 *    bilerek aleyhte, yoksa seçim diye bir şey kalmazdı.
 */
const test = require('node:test');
const assert = require('node:assert');
const M = require('../game/macera');
const HERO = require('../game/kahraman');
const { HERO_ITEMS, HERO_SLOTS, NADIRLIK,
  KULLANILABILIR } = require('../data/heroItemDefs');

const yeni = () => HERO.yeniKahraman('0,0');

/** Sabit diziyi sırayla döndüren sahte rastgelelik */
function sahteRnd(degerler) {
  let i = 0;
  return () => degerler[i++ % degerler.length];
}

test('konak yoksa macera da yok', () => {
  assert.equal(M.maceraTavani(0), 0);
  const k = yeni();
  M.maceraBiriktir(k, 1000, 0);
  assert.equal(k.maceraSayisi, 0, 'konaksız oyuncuya macera birikmemeli');
});

test('konak seviyesi tavanı ve hızı iyileştiriyor', () => {
  assert.ok(M.maceraTavani(20) > M.maceraTavani(1), 'tavan seviyeyle büyümeli');
  assert.ok(M.maceraSaati(20) < M.maceraSaati(1), 'bekleme seviyeyle kısalmalı');
  assert.ok(M.maceraSaati(100) >= 2, 'süre sıfıra inmemeli — taban korunmalı');
});

test('macera birikiyor, tavanda duruyor, ilerleme SAKLANMIYOR', () => {
  const k = yeni();
  const tavan = M.maceraTavani(5);
  const gereken = M.maceraSaati(5);

  M.maceraBiriktir(k, gereken * 1.5, 5);
  assert.equal(k.maceraSayisi, 1);
  assert.ok(Math.abs(k.maceraIlerleme - gereken * 0.5) < 1e-9,
    'artan zaman bir sonrakine sayılmalı');

  M.maceraBiriktir(k, gereken * 100, 5);
  assert.equal(k.maceraSayisi, tavan, 'tavan aşılmamalı');
  assert.equal(k.maceraIlerleme, 0,
    'tavan doluyken ilerleme saklanmamalı — yoksa dönüşte toplu patlama olur');
});

test('uygunluk: ölü, meşgul, hakkı yok, canı düşük', () => {
  const canTavan = HERO.canTavani(1);
  const k = yeni(); k.maceraSayisi = 2;
  assert.equal(M.maceraUygunMu(k, 'kisa', canTavan).ok, true);

  assert.equal(M.maceraUygunMu(k, 'olmayanTip', canTavan).sebep, 'gecersiz_tip');

  const olu = yeni(); olu.maceraSayisi = 2;
  HERO.hasarVer(olu, 99999);
  assert.equal(M.maceraUygunMu(olu, 'kisa', canTavan).sebep, 'olu',
    'ölü kahraman maceraya çıkamaz — önce diriltilmeli');

  const seferde = yeni(); seferde.maceraSayisi = 2; seferde.nerede = 'sefer';
  assert.equal(M.maceraUygunMu(seferde, 'kisa', canTavan).sebep, 'mesgul');

  const haksiz = yeni(); haksiz.maceraSayisi = 0;
  assert.equal(M.maceraUygunMu(haksiz, 'kisa', canTavan).sebep, 'macera_yok');

  const yorgun = yeni(); yorgun.maceraSayisi = 2;
  yorgun.can = canTavan * M.MACERA_CAN_ESIGI - 1;
  assert.equal(M.maceraUygunMu(yorgun, 'kisa', canTavan).sebep, 'can_dusuk');

  const ussuz = yeni(); ussuz.maceraSayisi = 2; ussuz.usSlot = null;
  assert.equal(M.maceraUygunMu(ussuz, 'kisa', canTavan).sebep, 'konak_yok');
});

test('uzun macera daha çok XP veriyor ama daha çok can götürüyor', () => {
  const kisa = M.MACERA_TIPLERI.kisa;
  const uzun = M.MACERA_TIPLERI.uzun;
  assert.ok(uzun.xp > kisa.xp);
  assert.ok(uzun.can > kisa.can);
  assert.ok(uzun.saat > kisa.saat);
  /*
    ORAN ALEYHTE: uzun maceranın XP artışı, can artışından KÜÇÜK olmalı.
    Tersi olsaydı uzun macera her zaman daha iyi olur ve seçim kalmazdı.
  */
  assert.ok(uzun.xp / kisa.xp < uzun.can / kisa.can,
    'uzun macera "her zaman daha iyi" olmamalı');
});

test('XP garanti — ödüller boş çıksa bile', () => {
  for (const tip of ['kisa', 'uzun']) {
    const r = M.maceraSonucu(tip, sahteRnd([0.99]));
    assert.equal(r.xp, M.MACERA_TIPLERI[tip].xp, 'XP her zaman gelmeli');
    assert.equal(r.oduller.length, M.MACERA_TIPLERI[tip].odulSayisi);
  }
});

test('ödül türleri geçerli ve tanımlı şeyler veriyor', () => {
  for (let i = 0; i < 400; i++) {
    for (const o of M.maceraSonucu('uzun').oduller) {
      if (o.tur === 'esya') {
        assert.ok(HERO_ITEMS[o.key], `tanımsız eşya: ${o.key}`);
        assert.ok(NADIRLIK[o.nadirlik], `tanımsız nadirlik: ${o.nadirlik}`);
      } else if (o.tur === 'asker') {
        assert.ok(M.MACERA_BIRIMLERI.includes(o.birim));
        assert.ok(o.adet >= 1);
      } else if (o.tur === 'hammadde') {
        assert.ok(M.HAMMADDELER.includes(o.res));
        assert.ok(o.adet > 0);
      } else {
        assert.fail(`bilinmeyen ödül türü: ${o.tur}`);
      }
    }
  }
});

test('KUŞANILABİLİR eşya makul bir tempoda düşüyor', () => {
  /*
    OYUNCUNUN GÖRDÜĞÜ SAYI BU. Eski test yalnız "eşya düştü mü" diye
    bakıyordu ama düşenlerin bir kısmı diriltme iksiri; oyuncunun
    peşinde olduğu kuşanılabilir parça değil. İlkan'ın şikâyeti tam
    buradaydı: *"çok maceraya çıktım ama birkaç birim bir de attan
    başka bir şey düşmedi"* — ölçüm onu doğruladı, kısa macerada
    kuşanılabilir eşya 24 macerada bir geliyordu.

    Kahramanın on küsur slotu var; bir seti toplamak makul sürmeli ama
    bir haftada bitmemeli.
  */
  const N = 20000;
  const tempo = (tip) => {
    let parca = 0;
    for (let i = 0; i < N; i++) {
      for (const o of M.maceraSonucu(tip).oduller) {
        if (o.tur === 'esya' && o.key !== 'diriltmeIksiri') parca++;
      }
    }
    return N / parca;                       // kaç macerada bir parça
  };

  const kisa = tempo('kisa');
  const uzun = tempo('uzun');
  assert.ok(kisa > 6 && kisa < 14,
    `kısa macerada parça ${kisa.toFixed(1)} macerada bir — 6-14 aralığında olmalı`);
  assert.ok(uzun > 1.8 && uzun < 4,
    `uzun macerada parça ${uzun.toFixed(1)} macerada bir — 1,8-4 aralığında olmalı`);
  assert.ok(uzun < kisa,
    'uzun macera eşya avının asıl yolu olmalı: canın dört katını götürüyor');
});

test('ödül havuzunda ÖLÜ eşya ağırlığı yok', () => {
  /*
    GERÇEK BİR HATANIN KİLİDİ. ODUL_AGIRLIK bir zamanlar `esya: 15`
    taşıyordu ama ağırlıklı kura yalnız hammadde ile asker arasında
    çekiliyordu — sabit kuraya HİÇ girmiyordu. Dengeyi okuyan herkese
    eşyanın havuzda %15 ağırlığı varmış gibi görünüyor, oysa eşyanın
    tek kapısı macera tipindeki `esyaSansi`.

    Ağırlık geri eklenecekse kuraya da girmeli; bu test ikisinin
    ayrışmasını engelliyor.
  */
  assert.deepEqual(Object.keys(M.ODUL_AGIRLIK).sort(), ['asker', 'hammadde'],
    'ODUL_AGIRLIK yalnız kuraya GİREN türleri taşımalı');
});

test('SALDIRI GÜCÜ macerada alınan hasarı azaltıyor', () => {
  /*
    İlkan'ın kararı: "kahramanın saldırı gücü arttıkça maceralarda daha
    az hasar almalı". Mantığı: macerada yıpratan şey yol boyunca
    karşılaşılan tehlike; daha güçlü vuran kahraman onu daha çabuk
    bertaraf eder. Azaltma AYRI bir skile değil, saldırı gücünün
    KENDİSİNE bağlı.
  */
  const ham = M.MACERA_TIPLERI.uzun.can;
  assert.equal(M.maceraCanKaybi('uzun', 0), ham, 'güçsüz kahraman tam hasar alır');
  assert.ok(M.maceraCanKaybi('uzun', 4000) < ham, 'güç hasarı azaltmalı');
  assert.ok(M.maceraCanKaybi('uzun', 8000) < M.maceraCanKaybi('uzun', 2000),
    'daha çok güç daha az hasar');
});

test('güç azaltmasının TAVANI var — macera risksizleşmiyor', () => {
  assert.equal(M.gucAzaltmasi(1e9), M.GUC_AZALTMA_TAVANI);
  assert.ok(M.GUC_AZALTMA_TAVANI < 100,
    'tavan %100 olursa macera tamamen bedava olur');
  assert.ok(M.maceraCanKaybi('uzun', 1e9) > 0,
    'en güçlü kahraman bile macerada bir şey kaybetmeli');
});

test('maceraSonucu güç verilince AZALTILMIŞ canı döndürüyor, hamı da tutuyor', () => {
  const zayif = M.maceraSonucu('uzun', sahteRnd([0.99]), 0);
  const guclu = M.maceraSonucu('uzun', sahteRnd([0.99]), 8000);
  assert.equal(zayif.hamCan, M.MACERA_TIPLERI.uzun.can);
  assert.equal(guclu.hamCan, M.MACERA_TIPLERI.uzun.can,
    'ham hasar raporda gösterilebilmeli — yatırımın karşılığı görünsün');
  assert.ok(guclu.can < zayif.can);
  assert.equal(zayif.xp, guclu.xp, 'güç XP kazancını değiştirmemeli');
});

test('nadirlik kurası: efsane SEYREK, sıradan sık', () => {
  const say = {};
  for (let i = 0; i < 5000; i++) {
    const n = M.nadirlikSec(Math.random);
    say[n] = (say[n] || 0) + 1;
  }
  assert.ok(say.siradan > say.iyi, 'sıradan en sık olmalı');
  assert.ok(say.iyi > say.nadir);
  assert.ok((say.efsane || 0) / 5000 < 0.08, 'efsane %8 altında kalmalı');
  assert.ok((say.efsane || 0) > 0, 'efsane hiç düşmüyorsa kademe anlamsız');
});

test('eşya adı nadirlikle öneklenir, sıradan olan çıplak kalır', () => {
  const key = Object.keys(HERO_ITEMS)[0];
  const ad = HERO_ITEMS[key].ad;
  assert.equal(M.esyaAdi(key, 'siradan'), ad, 'sıradan eşya önek almamalı');
  assert.equal(M.esyaAdi(key, 'efsane'), `${NADIRLIK.efsane.ad} ${ad}`);
  assert.equal(M.esyaAdi('olmayan', 'iyi'), 'olmayan', 'tanımsız anahtar çökmemeli');
});

test('her KUŞANILABİLİR eşya geçerli bir slota ait, her slot dolu', () => {
  const slotlar = new Set();
  for (const [key, def] of Object.entries(HERO_ITEMS)) {
    assert.ok(def.ad && def.aciklama, `${key} adı/açıklaması eksik`);
    if (KULLANILABILIR.has(key)) {
      /*
        KULLANILABİLİR eşyanın slotu YOK ve bonusu da yok: kuşanılmıyor,
        tüketiliyor (iksir). Kuşanılabilirlerle aynı kurallara sokmak,
        onu olmadığı bir şey gibi tarif etmek olurdu.
      */
      assert.equal(def.slot, null, `${key} kullanılabilir ama slotu var`);
      continue;
    }
    assert.ok(HERO_SLOTS[def.slot], `${key} tanımsız slota ait: ${def.slot}`);
    assert.ok(def.kahramanBonus || def.birimBonus,
      `${key} hiçbir bonus vermiyor — kuşanmanın anlamı kalmaz`);
    slotlar.add(def.slot);
  }
  for (const slot of Object.keys(HERO_SLOTS)) {
    assert.ok(slotlar.has(slot), `${slot} slotuna hiç eşya tanımlanmamış`);
  }
});

test('diriltme iksiri havuzda ama SEYREK', () => {
  /*
    Kuşanılabilir eşyalarla aynı ağırlıkta olsaydı ölümün bedeli
    neredeyse ortadan kalkardı; hiç düşmeseydi "maceradan bulduğu
    diriltici iksir" yolu kapalı kalırdı.
  */
  let esya = 0, iksir = 0;
  for (let i = 0; i < 3000; i++) {
    for (const o of M.maceraSonucu('uzun').oduller) {
      if (o.tur !== 'esya') continue;
      esya++;
      if (o.key === 'diriltmeIksiri') iksir++;
    }
  }
  assert.ok(esya > 0, 'hiç eşya düşmüyorsa ölçüm anlamsız');
  const oran = iksir / esya;
  assert.ok(oran > 0.08 && oran < 0.35,
    `düşen eşyaların %${(oran * 100).toFixed(1)}'i iksir — %8-35 aralığında olmalı`);
});
