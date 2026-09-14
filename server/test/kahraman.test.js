/**
 * KAHRAMAN — seviye, skil, can ve bonus kuralları.
 *
 * Kilitlenen kararlar:
 *
 * 1) Seviye başına 4 puan, skil başına en çok 100 puan. Kısmî dağıtım
 *    YOK — yarısı uygulanmış bir dağıtım oyuncunun geri alamayacağı
 *    sessiz bir hata olurdu.
 * 2) Yüzde bonusların TAVANI var: kahraman orduyu güçlendirir, ordunun
 *    yerine geçmez.
 * 3) Kahraman ÖLÜR ama DİRİLTİLEBİLİR (hammadde ya da iksir). Ölüyken
 *    HİÇBİR bonus vermez ve kendiliğinden iyileşmez.
 * 4) Kahraman Lvl 1'de 4 dağıtılabilir puanla DOĞAR.
 * 5) XP eğrisi macera ödülüne göre ölçeklendi; sabitler denge kapısı.
 */
const test = require('node:test');
const assert = require('node:assert');
const K = require('../game/kahraman');

const yeni = () => K.yeniKahraman('0,0');

test('seviye eğrisi artan ve makul ölçekte', () => {
  assert.equal(K.seviyeIcinToplamXp(1), 0, 'Lvl 1 bedava');
  assert.equal(K.xpSeviyesi(0), 1);
  for (let s = 2; s <= 40; s++) {
    assert.ok(K.seviyeIcinToplamXp(s) > K.seviyeIcinToplamXp(s - 1),
      `Lvl ${s} eşiği bir öncekinden büyük olmalı`);
  }
  /*
    ÖLÇEK KAPISI. Kısa macera ~40 XP: ilk seviyeler birkaç macerada
    gelmeli, 20'den sonrası aylara yayılmalı. Bu aralık kayarsa eğri
    ya anlamsız hızlı ya ulaşılmaz olur.
  */
  assert.ok(K.seviyeIcinToplamXp(2) <= 200, 'Lvl 2 ilk maceralarda gelmeli');
  assert.ok(K.seviyeIcinToplamXp(20) > 5000 && K.seviyeIcinToplamXp(20) < 30000,
    'Lvl 20 orta vadeli bir hedef olmalı');
  assert.ok(K.seviyeIcinToplamXp(100) < 500000, 'Lvl 100 ulaşılabilir kalmalı');
});

test('kahraman Lvl 1 de 4 puanla DOĞAR', () => {
  /*
    İlkan'ın kararı. Sıfır puanla doğsaydı kahraman ekranı ilk açıldığında
    yapılacak hiçbir şey olmaz, sistem "sonra bir şeyler olacak" gibi
    görünürdü.
  */
  assert.equal(yeni().harcanmamisPuan, K.PUAN_PER_SEVIYE);
});

test('seviye atlayınca 4 puan daha gelir, atlamayınca gelmez', () => {
  const k = yeni();
  const baslangic = k.harcanmamisPuan;
  const a = K.xpEkle(k, K.seviyeIcinToplamXp(2));
  assert.equal(a.seviye, 2);
  assert.equal(a.kazanilanPuan, K.PUAN_PER_SEVIYE);
  assert.equal(k.harcanmamisPuan, baslangic + K.PUAN_PER_SEVIYE);

  const b = K.xpEkle(k, 1);          // aynı seviyede kaldı
  assert.equal(b.kazanilanPuan, 0);
  assert.equal(k.harcanmamisPuan, baslangic + K.PUAN_PER_SEVIYE, 'puan artmamalı');
});

test('çok seviye birden atlanınca puanlar BİRİKİR', () => {
  // Oyuncu çevrimdışıyken seviye atlarsa puanı kaybetmemeli
  const k = yeni();
  const baslangic = k.harcanmamisPuan;
  const r = K.xpEkle(k, K.seviyeIcinToplamXp(6));
  assert.equal(r.seviye, 6);
  assert.equal(r.kazanilanPuan, 5 * K.PUAN_PER_SEVIYE);
  assert.equal(k.harcanmamisPuan, baslangic + 5 * K.PUAN_PER_SEVIYE);
});

test('seviye atlayınca can TAVANI büyür ve fark hediye edilir', () => {
  const k = yeni();
  const oncekiTavan = K.canTavani(1);
  assert.equal(k.can, oncekiTavan, 'yeni kahraman tam canlı');
  K.xpEkle(k, K.seviyeIcinToplamXp(5));
  assert.equal(K.canTavani(5), oncekiTavan + 4 * K.CAN_PER_SEVIYE);
  assert.equal(k.can, K.canTavani(5),
    'seviye atlamak kahramanı daha yaralı göstermemeli');
});

test('puan dağıtımı KISMÎ uygulanmaz', () => {
  const k = yeni();
  k.harcanmamisPuan = 0;                  // ölçüm net olsun
  K.xpEkle(k, K.seviyeIcinToplamXp(3));   // 8 puan
  assert.equal(k.harcanmamisPuan, 8);

  const r = K.puanDagit(k, 'savunmaBonus', 9);
  assert.equal(r.ok, false);
  assert.equal(r.sebep, 'puan_yetmiyor');
  assert.equal(k.skiller.savunmaBonus, 0, 'reddedilen istek hiç uygulanmamalı');
  assert.equal(k.harcanmamisPuan, 8);

  assert.equal(K.puanDagit(k, 'olmayanSkil', 1).ok, false);
  assert.equal(K.puanDagit(k, 'savunmaBonus', 0).ok, false);
  assert.equal(K.puanDagit(k, 'savunmaBonus', -3).ok, false);

  assert.equal(K.puanDagit(k, 'savunmaBonus', 8).ok, true);
  assert.equal(k.skiller.savunmaBonus, 8);
  assert.equal(k.harcanmamisPuan, 0);
});

test('skil puan tavanı aşılamaz', () => {
  const k = yeni();
  k.harcanmamisPuan = 500;
  assert.equal(K.puanDagit(k, 'saldiriPuani', K.SKIL_PUAN_TAVANI).ok, true);
  const r = K.puanDagit(k, 'saldiriPuani', 1);
  assert.equal(r.ok, false);
  assert.equal(r.sebep, 'skil_tavani');
  assert.equal(k.skiller.saldiriPuani, K.SKIL_PUAN_TAVANI);
});

test('yüzde bonusların TAVANI var — kahraman ordunun yerine geçmez', () => {
  const k = yeni();
  k.harcanmamisPuan = 400;
  K.puanDagit(k, 'saldiriBonus', 100);
  K.puanDagit(k, 'savunmaBonus', 100);
  const b = K.bonuslar(k);
  assert.equal(b.saldiriYuzde, K.SKILLER.saldiriBonus.tavanYuzde);
  assert.equal(b.savunmaYuzde, K.SKILLER.savunmaBonus.tavanYuzde);
  assert.ok(b.saldiriYuzde <= 25 && b.savunmaYuzde <= 25,
    'tavan %25 üstüne çıkarsa ordu anlamsızlaşır — bilinçli değişiklik gerekir');
});

test('ÖLÜ kahraman HİÇBİR bonus vermez', () => {
  const k = yeni();
  k.harcanmamisPuan = 400;
  K.puanDagit(k, 'saldiriPuani', 50);
  K.puanDagit(k, 'uretim', 50);
  const once = K.bonuslar(k);
  assert.ok(once.saldiriGucu > 0 && once.uretimSaatlik > 0);

  const h = K.hasarVer(k, 99999);
  assert.equal(h.oldu, true);
  assert.equal(k.olu, true);
  const sonra = K.bonuslar(k);
  assert.equal(sonra.saldiriGucu, 0);
  assert.equal(sonra.saldiriYuzde, 0);
  assert.equal(sonra.savunmaYuzde, 0);
  assert.equal(sonra.uretimSaatlik, 0);
  assert.deepEqual(sonra.birim.piyade, { saldiri: 0, savunma: 0 },
    'ölümün canı yakmalı; yarım bonus ölümü sıradanlaştırırdı');
});

test('ÖLÜ kahraman zamanla İYİLEŞMEZ — diriltilmesi gerekir', () => {
  /*
    Kendiliğinden geri gelseydi diriltme bedeli bir seçenek değil,
    yalnız sabırsızlık vergisi olurdu.
  */
  const k = yeni();
  K.hasarVer(k, 99999);
  assert.equal(k.olu, true);
  assert.equal(k.can, 0);

  K.ilerlet(k, 1000, 20);
  assert.equal(k.can, 0, 'ölü kahraman zamanla iyileşmemeli');
  assert.equal(k.olu, true);
});

test('diriltme: bedel seviyeyle büyür, kahraman YARI canla kalkar', () => {
  const k = yeni();
  const ucuz = K.dirilmeBedeli(k);
  K.xpEkle(k, K.seviyeIcinToplamXp(15));
  const pahali = K.dirilmeBedeli(k);
  for (const key of Object.keys(ucuz)) {
    assert.ok(pahali[key] > ucuz[key],
      `${key}: bedel seviyeyle büyümeli — sabit olsaydı yüksek seviyede ölüm bedava olurdu`);
  }

  K.hasarVer(k, 99999);
  const r = K.dirilt(k);
  assert.equal(r.ok, true);
  assert.equal(k.olu, false);
  const tavan = K.canTavani(K.xpSeviyesi(k.xp));
  assert.ok(k.can > 0 && k.can < tavan,
    'tam canla kalkarsa ölüm yalnız bir fatura, sıfır canla kalkarsa anında yeniden ölür');
  assert.equal(K.dirilt(k).sebep, 'olu_degil', 'yaşayan kahraman diriltilemez');
});

test('ölüm seviyeyi ve eşyayı SİLMİYOR', () => {
  // Aylarca biriktirilen yatırımı tek savaşta yok etmek, ölümü ceza
  // değil oyundan kopma sebebi yapardı; ceza bedelin kendisi.
  const k = yeni();
  K.xpEkle(k, K.seviyeIcinToplamXp(8));
  k.kusanilan = { sagEl: { key: 'fjordKilici', nadirlik: 'efsane' } };
  const xp = k.xp;
  K.hasarVer(k, 99999);
  assert.equal(k.xp, xp, 'deneyim kaybolmamalı');
  assert.ok(k.kusanilan.sagEl, 'eşya kaybolmamalı');
  assert.equal(k.olumSayisi, 1);
});

test('iyileşme oyun saatiyle ve konak seviyesiyle hızlanır', () => {
  const yavas = yeni(); yavas.can = 10;
  const hizli = yeni(); hizli.can = 10;
  K.ilerlet(yavas, 5, 0);
  K.ilerlet(hizli, 5, 20);
  assert.ok(hizli.can > yavas.can, 'konak seviyesi iyileşmeyi hızlandırmalı');
  assert.ok(K.iyilesmeHizi(20) > K.iyilesmeHizi(0));
  // Can tavanı aşılmamalı
  const dolu = yeni();
  K.ilerlet(dolu, 1000, 20);
  assert.equal(dolu.can, K.canTavani(1));
});

test('macerada/seferde olan kahraman köyde iyileşmez', () => {
  const k = yeni(); k.can = 10; k.nerede = 'macera';
  K.ilerlet(k, 24, 20);
  assert.equal(k.can, 10, 'iyileşme yalnız üste dönünce işler');
});

test('skil sıfırlama puanları geri verir, bedeli KATLANIR', () => {
  const k = yeni();
  k.harcanmamisPuan = 12;
  K.puanDagit(k, 'saldiriBonus', 7);
  K.puanDagit(k, 'uretim', 5);
  assert.equal(k.harcanmamisPuan, 0);

  const ilkBedel = K.sifirlamaBedeli(k);
  const r = K.skilleriSifirla(k);
  assert.equal(r.geriVerilen, 12);
  assert.equal(k.harcanmamisPuan, 12);
  assert.equal(k.skiller.saldiriBonus, 0);
  assert.equal(k.skiller.uretim, 0);

  const ikinciBedel = K.sifirlamaBedeli(k);
  for (const key of Object.keys(ilkBedel)) {
    assert.equal(ikinciBedel[key], ilkBedel[key] * K.SIFIRLAMA_CARPANI,
      'her sıfırlama bir öncekinin iki katı olmalı — savaş öncesi skil '
      + 'değiştirip hem saldırı hem savunma bonusunu kullanmak istismardır');
  }
});

test('dört skilin tamamı tanımlı ve seviye tavanıyla tutarlı', () => {
  assert.deepEqual(K.SKIL_ANAHTARLARI.sort(),
    ['saldiriBonus', 'saldiriPuani', 'savunmaBonus', 'uretim'],
    'İlkan dört skil istedi: def bonusu, saldırı bonusu, saldırı puanı, üretim');
  /*
    100. seviyede toplam puan = 4 × 99 = 396, dört skilin tavanı 4 × 100 = 400.
    Yani en yüksek seviyede bile hepsi TAM dolmuyor: son ana kadar bir
    tercih kalıyor, ama uzmanlaşma da kalıcı bir ceza olmuyor.
  */
  const toplamPuan = (K.EN_YUKSEK_SEVIYE - 1) * K.PUAN_PER_SEVIYE;
  const toplamTavan = K.SKIL_ANAHTARLARI.length * K.SKIL_PUAN_TAVANI;
  assert.ok(toplamPuan <= toplamTavan,
    'kazanılan puan skil tavanlarının toplamını aşmamalı — aşarsa puan çöpe gider');
});

test('kahraman TAKVİYEDE başka köyü savunabiliyor', () => {
  /*
    İlkan'ın kararı: "kahramanı tek başına saldırıya YA DA SAVUNMAYA
    yollayabilirim". Takviyedeki kahraman gittiği köyde duruyor ve
    savunma bonusunu ORAYA veriyor.
  */
  const k = yeni();
  k.harcanmamisPuan = 100;
  K.puanDagit(k, 'savunmaBonus', 50);
  k.nerede = 'takviye';
  k.misafirSlot = '5,5';

  const o = K.ozet(k, 5);
  assert.equal(o.nerede, 'takviye');
  assert.equal(o.misafirSlot, '5,5');
  assert.ok(K.bonuslar(k).savunmaYuzde > 0,
    'takviyedeki kahraman bonus vermeye devam etmeli — savunmaya gitti');
});

test('takviyedeki kahraman ÜSSÜNDE iyileşmiyor', () => {
  // İyileşme üssüne bağlı: başka köyde savunurken de iyileşseydi
  // kahramanı orada bırakmanın hiçbir bedeli kalmazdı
  const k = yeni();
  k.can = 10; k.nerede = 'takviye'; k.misafirSlot = '5,5';
  K.ilerlet(k, 50, 20);
  assert.equal(k.can, 10);
});

test('ÖLÜM misafirliği de bitiriyor', () => {
  const k = yeni();
  k.nerede = 'takviye'; k.misafirSlot = '5,5'; k.donusKalanSaat = 3;
  K.hasarVer(k, 99999);
  assert.equal(k.olu, true);
  assert.equal(k.misafirSlot, null,
    'ölen kahraman ev sahibinin köyünde asılı kalmamalı');
  assert.equal(k.donusKalanSaat, 0);
  assert.equal(k.nerede, 'koy');
});

test('özet MACERADA BEKLENEN GERÇEK hasarı veriyor', () => {
  /*
    Ekranda ham sayıyı göstermek oyuncuya yatırımının karşılığını
    gizlemek olurdu: "−32 can" yazarken gerçekte 13 kaybediyorsa hangi
    maceraya çıkacağını yanlış hesaplar.
  */
  const zayif = yeni();
  const guclu = yeni();
  guclu.harcanmamisPuan = 100;
  K.puanDagit(guclu, 'saldiriPuani', 100);

  const a = K.ozet(zayif, 5);
  const b = K.ozet(guclu, 5);
  assert.ok(a.maceraHasari.uzun > 0);
  assert.ok(b.maceraHasari.uzun < a.maceraHasari.uzun,
    'güçlü kahraman macerada daha az yıpranmalı');
  assert.ok(b.maceraGucAzaltma > 0, 'azaltma yüzdesi ekranda yazılabilmeli');
  assert.equal(a.maceraGucAzaltma, 0, 'güçsüz kahramanda azaltma yok');
});

test('özet istemciye gereken her şeyi veriyor', () => {
  const k = yeni();
  K.xpEkle(k, 1000);
  const o = K.ozet(k, 5);
  for (const alan of ['var', 'seviye', 'xp', 'xpSimdiki', 'xpGereken', 'can',
    'canTavan', 'skiller', 'harcanmamisPuan', 'bonuslar', 'nerede',
    'kusanilan', 'envanter', 'sifirlamaBedeli', 'iyilesmeSaatlik',
    'olu', 'dirilmeBedeli', 'maceraSayisi', 'maceraTavan', 'slotlar',
    'misafirSlot', 'donusKalanSaat', 'maceraHasari', 'maceraGucAzaltma']) {
    assert.ok(alan in o, `özette ${alan} eksik`);
  }
  assert.equal(K.ozet(null).var, false, 'konağı olmayan oyuncunun kahramanı yok');
  assert.equal(o.xpGereken > 0, true);
});

test('Kahraman Konağı binası tanımlı ve iki tarafta aynı', async () => {
  const path = require('node:path');
  const url = require('node:url');
  const { VILLAGE_DEFS: S } = require('../data/villageDefs');
  const istemci = await import(url.pathToFileURL(
    path.join(__dirname, '..', '..', 'client', 'src', 'data', 'villageDefs.js')).href);
  const C = istemci.default || istemci.VILLAGE_DEFS;
  assert.ok(S.kahramanKonagi, 'sunucuda kahramanKonagi tanımlı olmalı');
  assert.ok(C.kahramanKonagi, 'istemcide kahramanKonagi tanımlı olmalı');
  assert.equal(S.kahramanKonagi.unique, true, 'kahraman tek — konak da tek');
  assert.equal(C.kahramanKonagi.maxLevel, S.kahramanKonagi.maxLevel);
  assert.deepEqual(C.kahramanKonagi.cost, S.kahramanKonagi.cost);
});
