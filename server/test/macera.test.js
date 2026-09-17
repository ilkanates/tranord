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
      } else if (o.tur === 'gumus') {
        /* Gümüş keseye yazılıyor, köye değil (bkz. index.js · keseYaz) */
        assert.ok(Number.isInteger(o.adet) && o.adet > 0,
          `gümüş ödülü tam sayı ve pozitif olmalı: ${o.adet}`);
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

    ORANLAR BİR KEZ DAHA YÜKSELTİLDİ (İlkan aynı şikâyeti tekrarladı).
    Ham tempo ile İLERLEME temposu aynı şey değil: düşenlerin %56'sı
    SIRADAN nadirlikte ve aynı slota ikinci kez sıradan bir eşya düşmek
    hiçbir şey ilerletmiyor. Seyrekliği nadirlik kurası taşıyor, tempo
    değil.
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
  assert.ok(kisa > 3.5 && kisa < 7,
    `kısa macerada parça ${kisa.toFixed(1)} macerada bir — 3,5-7 aralığında olmalı`);
  assert.ok(uzun > 1.3 && uzun < 2.6,
    `uzun macerada parça ${uzun.toFixed(1)} macerada bir — 1,3-2,6 aralığında olmalı`);
  assert.ok(uzun < kisa,
    'uzun macera eşya avının asıl yolu olmalı: canın dört katını götürüyor');
});

test('eşya kurası SLOTLARI eşit dağıtıyor — at havuzu diğerlerini bastırmıyor', () => {
  /*
    GERÇEK BİR HATANIN KİLİDİ. İlkan: *"attan başka bir şey düşmedi,
    bir enayilik var"*. Haklıydı: kura eşya listesinden DÜZ çekiyordu
    ve at slotunda 6 eşya var, diğer slotlarda 3 (kolyede 2). Ölçüldü:
    düşen her kuşanılabilir eşyanın %20,7'si at çıkıyordu — herhangi
    bir silahın tam iki katı. Oysa oyuncunun TEK at slotu var.

    Bu test kuralı kilitliyor: kura önce SLOTU seçiyor, sonra o
    slottaki eşyayı. Böylece bir slota yeni eşya eklemek dengeyi
    sessizce kaydıramıyor.
  */
  const N = 60000;
  const sayac = {};
  for (let i = 0; i < N; i++) {
    for (const o of M.maceraSonucu('uzun').oduller) {
      /* Sarf malzemesinin slotu yok — slot dağılımına girmemeli */
      if (o.tur !== 'esya' || !HERO_ITEMS[o.key].slot) continue;
      const slot = HERO_ITEMS[o.key].slot;
      sayac[slot] = (sayac[slot] || 0) + 1;
    }
  }
  const slotlar = Object.keys(sayac);
  assert.equal(slotlar.length, 9, 'dokuz slotun hepsinden eşya düşmeli');

  const toplam = Object.values(sayac).reduce((a, b) => a + b, 0);
  const beklenen = 100 / slotlar.length;                  // %11,1
  for (const [slot, n] of Object.entries(sayac)) {
    const pay = 100 * n / toplam;
    assert.ok(Math.abs(pay - beklenen) < 1.5,
      `${slot} payı %${pay.toFixed(1)} — beklenen ~%${beklenen.toFixed(1)}`);
  }
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
  /*
    LİSTE YERİNE DAVRANIŞ ÖLÇÜLÜYOR. Eskiden burada elle yazılmış bir
    liste vardı (['asker','hammadde']); havuza gümüş eklenince test
    kırmızıya döndü ama tuttuğu hata oluşmamıştı — gümüş kurada
    GERÇEKTEN var. Liste, kuranın ikizi olmuş ve her yeni ödül türünde
    elle güncellenmesi gereken ikinci bir tanım hâline gelmişti: bu
    projedeki en sık hata sınıfı.

    Artık kura ÇEKİLİYOR: ağırlığı olan her tür gerçekten çıkmalı ve
    çıkan her tür ağırlık listesinde olmalı. Ölü ağırlık da, listede
    olmayan sürpriz bir tür de buradan geçemez.
  */
  const gorulen = new Set();
  for (let n = 0; n < 4000; n++) {
    for (const o of M.maceraSonucu('uzun').oduller) gorulen.add(o.tur);
  }
  gorulen.delete('esya');          // eşyanın kapısı ayrı zar (esyaSansi)

  for (const tur of Object.keys(M.ODUL_AGIRLIK)) {
    assert.ok(gorulen.has(tur),
      `${tur} ağırlığı var ama kurada HİÇ çıkmıyor — ölü ağırlık`);
  }
  for (const tur of gorulen) {
    assert.ok(M.ODUL_AGIRLIK[tur],
      `${tur} kurada çıkıyor ama ağırlık listesinde yok`);
  }
});

test('GÜMÜŞ maceradan çıkıyor — kahramanın parası kahramanın emeğinden', () => {
  /*
    İlkan: *"gümüşün asıl kazanma olasılığı kahramanın maceraları
    olsun."* Gümüş yağmadan ya da üretimden gelmiyor; büyük oyuncunun
    köy ekonomisi kahraman ekonomisini satın alamamalı.
  */
  const topla = (tip) => {
    let adet = 0, kez = 0;
    for (let n = 0; n < 3000; n++) {
      for (const o of M.maceraSonucu(tip).oduller) {
        if (o.tur === 'gumus') { adet += o.adet; kez++; }
      }
    }
    return kez ? adet / kez : 0;
  };
  const kisa = topla('kisa');
  const uzun = topla('uzun');
  assert.ok(kisa > 0 && uzun > 0, 'iki macera tipi de gümüş verebilmeli');
  assert.ok(uzun > kisa * 2,
    `uzun macera belirgin daha çok gümüş vermeli (kısa ${kisa.toFixed(0)}, uzun ${uzun.toFixed(0)})`);
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

test('SARF MALZEMELERİ havuzda ama SEYREK — kitap en seyrek', () => {
  /*
    Kuşanılabilir eşyalarla aynı ağırlıkta olsalardı ölümün bedeli
    neredeyse ortadan kalkardı; hiç düşmeselerse "maceradan bulduğu
    diriltici iksir" yolu kapalı kalırdı.

    BİLGELİK KİTABI EN SEYREK OLAN (17 Eylül 2026): skil sıfırlamanın
    sınırı artık fiyat değil BULUNURLUK. Kitap bollaşırsa "her savaştan
    önce skil değiştir" istismarı fiyatsız hâlde geri gelir.
  */
  let esya = 0;
  const sayac = { diriltmeIksiri: 0, canIksiri: 0, bilgeKitabi: 0 };
  for (let i = 0; i < 6000; i++) {
    for (const o of M.maceraSonucu('uzun').oduller) {
      if (o.tur !== 'esya') continue;
      esya++;
      if (o.key in sayac) sayac[o.key] += 1;
    }
  }
  assert.ok(esya > 0, 'hiç eşya düşmüyorsa ölçüm anlamsız');

  const sarf = sayac.diriltmeIksiri + sayac.canIksiri + sayac.bilgeKitabi;
  const oran = sarf / esya;
  assert.ok(oran > 0.08 && oran < 0.35,
    `düşen eşyaların %${(oran * 100).toFixed(1)}'i sarf — %8-35 aralığında olmalı`);

  for (const k of Object.keys(sayac)) {
    assert.ok(sayac[k] > 0, `${k} havuzda ama hiç düşmüyor — ölü ağırlık`);
  }
  assert.ok(sayac.bilgeKitabi < sayac.canIksiri,
    `kitap en seyrek olmalı (kitap ${sayac.bilgeKitabi}, can iksiri ${sayac.canIksiri})`);
  assert.deepEqual(Object.keys(M.SARF_AGIRLIK).sort(), Object.keys(sayac).sort(),
    'ağırlık listesi ile kurada çıkanlar ayrışmamalı');
});

test('BULUNAN ASKER dünyanın ortalama ordusuyla ölçekleniyor', () => {
  /*
    İlkan: *"kahramanın macerada bulduğu asker sayıları serverdaki
    ortalama asker sayısına göre olmalı. 5k askerim var, maceradan
    1 asker bulup getiriyor."*

    Sabit sayı (kısa 1-3, uzun 1-6) oyunun ilk gününde hediye, olgun
    bir dünyada gürültüydü — macera ödülünün üç kanalından biri ölü
    doğuyordu.
  */
  const ort = (tip, ordu) => {
    let t = 0;
    for (let i = 0; i < 3000; i++) t += M.maceraAskerAdedi(tip, ordu);
    return t / 3000;
  };

  const kucukDunya = ort('uzun', 500);
  const buyukDunya = ort('uzun', 5000);
  assert.ok(buyukDunya > kucukDunya * 5,
    `dünya büyüdükçe ödül de büyümeli (${kucukDunya.toFixed(1)} → ${buyukDunya.toFixed(1)})`);

  /* Uzun macera kısadan cömert — canın dört katını götürüyor */
  assert.ok(ort('uzun', 5000) > ort('kisa', 5000) * 2);
});

test('TAZE DÜNYADA bile asker ödülü var — taban tutuyor', () => {
  /*
    Ortalama sıfırken oran sıfır verir ve ilk oyuncular için asker
    ödülü hiç yokmuş gibi olurdu.
  */
  assert.ok(M.maceraAskerAdedi('kisa', 0) >= 1);
  assert.ok(M.maceraAskerAdedi('uzun', 0) >= 2);
});

test('ÖDÜL KENDİ ORDUNA BAĞLI DEĞİL — bileşik döngü yok', () => {
  /*
    Kendi ordusuna bağlasaydık çok askeri olan daha çok asker bulur,
    aradaki fark her maceradan sonra açılırdı. Ölçü DIŞARIDAN: dünyanın
    ortalaması.

    İmza bunu tutuyor: fonksiyon oyuncuyu hiç görmüyor, yalnız ortalamayı.
  */
  const pay = (ordu) => {
    let t = 0;
    for (let i = 0; i < 4000; i++) t += M.maceraAskerAdedi('uzun', ordu);
    return (t / 4000) / ordu;
  };
  /*
    ÖDÜL ORTALAMANIN SABİT BİR YÜZDESİ: 2.000 ve 20.000 ortalamada aynı
    pay çıkıyor. Kendi orduya bağlı bir kural burada bozulurdu — büyük
    oyuncu için pay büyürdü.
  */
  const kucuk = pay(2000);
  const buyuk = pay(20000);
  assert.ok(Math.abs(kucuk - buyuk) < kucuk * 0.15,
    `pay ölçekten bağımsız olmalı (${kucuk.toFixed(4)} / ${buyuk.toFixed(4)})`);
  assert.equal(M.ASKER_ORANI.uzun > M.ASKER_ORANI.kisa, true,
    'uzun macera daha cömert olmalı — canın dört katını götürüyor');
});
