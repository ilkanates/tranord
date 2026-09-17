/**
 * KULLANILABİLİR EŞYALAR — can iksiri ve bilgelik kitabı.
 *
 * İlkan: *"biri canını arttıran potion, bunu da ekle oyuna. Diğeri de
 * skilleri sıfırlamana yarayan kitap, onu da maceradan düşecek gibi
 * ayarla. Artık skill sıfırlama sadece bu kitapla."*
 *
 * En kritik nokta SKİL SIFIRLAMANIN KAPISI: hammadde ödeme yolu
 * kapandı ve tek yol kitap oldu. O yol da geri açılırsa "her savaştan
 * önce skil değiştir" istismarı geri gelir — burada kilitleniyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const HERO = require('../game/kahraman');
const KUSAM = require('../game/kusam');
const { HERO_ITEMS, KULLANILABILIR } = require('../data/heroItemDefs');
const M = require('../game/macera');

test('İKİ YENİ EŞYA tanımlı ve KULLANILABİLİR sayılıyor', () => {
  for (const key of ['canIksiri', 'bilgeKitabi']) {
    assert.ok(HERO_ITEMS[key], `${key} tanımsız`);
    assert.ok(KULLANILABILIR.has(key), `${key} kullanılabilir sayılmıyor`);
    assert.equal(HERO_ITEMS[key].slot, null,
      'kullanılabilir eşyanın slotu olmaz — ızgaraya sürüklenmemeli');
  }
});

test('MACERADAN DÜŞÜYORLAR — havuza gerçekten girdiler', () => {
  /*
    İlkan: *"onu da maceradan düşecek gibi ayarla."* Tanımlı olmak
    yetmez, KURAYA girmesi gerekiyor: bu projede "sabit tanımlı ama hiç
    okunmuyor" hatası daha önce yaşandı.
  */
  const gorulen = new Set();
  for (let n = 0; n < 30000; n++) {
    for (const o of M.maceraSonucu('uzun').oduller) {
      if (o.tur === 'esya') gorulen.add(o.key);
    }
  }
  assert.ok(gorulen.has('bilgeKitabi'), 'bilgelik kitabı maceradan hiç düşmüyor');
  assert.ok(gorulen.has('canIksiri'), 'can iksiri maceradan hiç düşmüyor');
});

test('SIFIRLAMANIN HAMMADDE YOLU KAPALI — tek yol kitap', () => {
  /*
    Bedel her seferinde katlanıyordu ama istismara yalnız FİYATLA
    direniyordu: kaynağı bol oyuncu için sınır diye bir şey yoktu.
    Artık sınır BULUNURLUK.
  */
  assert.equal(HERO.sifirlamaBedeli, undefined,
    'hammadde bedeli geri gelirse istismar kapısı yeniden açılır');
  assert.equal(HERO.SIFIRLAMA_TABAN, undefined);
  assert.equal(HERO.SKIL_KITABI_KEY, 'bilgeKitabi');
  assert.equal(HERO.CAN_IKSIRI_KEY, 'canIksiri');
});

test('KİTAP puanları geri veriyor ve ÇANTADAN ÇIKIYOR', () => {
  const k = HERO.yeniKahraman('0,0');
  HERO.xpEkle(k, 5000);
  HERO.puanDagit(k, 'saldiriBonus', 5);
  assert.equal(k.skiller.saldiriBonus, 5);

  k.envanter = [{ key: 'bilgeKitabi', nadirlik: 'siradan' }];
  const kullanim = KUSAM.kullan(k, 'bilgeKitabi');
  assert.equal(kullanim.ok, true);
  assert.equal(k.envanter.length, 0, 'kitap tükenmeli');

  const r = HERO.skilleriSifirla(k);
  assert.equal(r.geriVerilen, 5);
  assert.equal(k.skiller.saldiriBonus, 0);
});

test('KİTAP YOKSA sıfırlama yapılamıyor', () => {
  const k = HERO.yeniKahraman('0,0');
  k.envanter = [];
  assert.equal(KUSAM.kullan(k, 'bilgeKitabi').ok, false,
    'çantada kitap yokken kullanılabilmemeli');
});

test('ÖZET kitabın ve iksirin VARLIĞINI taşıyor — düğme buna bakıyor', () => {
  /*
    Ekran "bedel şu kadar" yerine "kitabın var mı" sorusunu soruyor.
    Alan pakette olmasaydı düğme neden kapalı olduğunu söyleyemezdi.
  */
  const k = HERO.yeniKahraman('0,0');
  k.envanter = [];
  assert.equal(HERO.ozet(k, 1).sifirlamaKitabi, false);
  assert.equal(HERO.ozet(k, 1).canIksiriVar, false);

  k.envanter = [
    { key: 'bilgeKitabi', nadirlik: 'siradan' },
    { key: 'canIksiri', nadirlik: 'siradan' },
  ];
  assert.equal(HERO.ozet(k, 1).sifirlamaKitabi, true);
  assert.equal(HERO.ozet(k, 1).canIksiriVar, true);
});

test('CAN İKSİRİ tavanı BÜYÜTMÜYOR — yalnız dolduruyor', () => {
  /*
    Tavanı kalıcı büyütseydi sınırsız birikebilen bir istatistik olurdu
    ve yeterince macera yapan kahraman ölümsüzleşirdi. Kural sunucuda
    (index.js · kahraman_can_iksiri) ama tavanın kaynağı burası: iksirin
    tavana dokunacak bir alanı hiç yok.
  */
  assert.equal(HERO_ITEMS.canIksiri.kahramanBonus, undefined,
    'can iksirinin kalıcı bonusu olmamalı');
  const k = HERO.yeniKahraman('0,0');
  const oncekiTavan = HERO.canTavani(HERO.xpSeviyesi(k.xp),
    KUSAM.kusamBonuslari(k).kahraman.can || 0);
  k.envanter = [{ key: 'canIksiri', nadirlik: 'efsane' }];
  const sonrakiTavan = HERO.canTavani(HERO.xpSeviyesi(k.xp),
    KUSAM.kusamBonuslari(k).kahraman.can || 0);
  assert.equal(sonrakiTavan, oncekiTavan,
    'çantadaki iksir can tavanını değiştirmemeli');
});

test('EŞYA SEVİYESİ kuşanıp çıkarınca KAYBOLMUYOR', () => {
  /*
    İlkan: *"bir itemi lvl atlatıp giyip çıkardığımda lvl'i kayboluyor."*

    `kusan` slota alanları TEK TEK kopyalayarak yeni bir nesne
    yazıyordu (`{ key, nadirlik }`); seviye alanı sonradan eklendiği
    için sessizce düşüyordu. Oyuncu gümüş ödeyip yükselttiği eşyayı bir
    kez kuşanınca Lvl 1'e dönüyordu — geri alınamaz bir kayıp.

    Alan listesi yerine nesnenin kendisi taşınıyor; bu test o kararı
    kilitliyor, yani eşyaya ileride eklenen her alan da korunuyor.
  */
  const k = HERO.yeniKahraman('0,0');
  k.envanter = [{ key: 'fjordKilici', nadirlik: 'nadir', seviye: 4 }];

  const takildi = KUSAM.kusan(k, 0);
  assert.equal(takildi.ok, true);
  assert.equal(k.kusanilan.sagEl.seviye, 4, 'kuşanınca seviye korunmalı');

  const cikti = KUSAM.cikar(k, 'sagEl');
  assert.equal(cikti.ok, true);
  assert.equal(k.envanter[0].seviye, 4, 'çıkarınca da seviye korunmalı');
});

test('KUŞANILAN eşyanın BONUSU seviyesiyle büyüyor', () => {
  /*
    Seviye taşınsa bile bonusa girmiyorsa oyuncu ödediği gümüşün
    karşılığını hiçbir yerde göremezdi. İki ayrı şey: alanın korunması
    ve o alanın HESABA girmesi.
  */
  const lv1 = HERO.yeniKahraman('0,0');
  lv1.kusanilan = { sagEl: { key: 'fjordKilici', nadirlik: 'nadir', seviye: 1 } };
  const lv5 = HERO.yeniKahraman('0,0');
  lv5.kusanilan = { sagEl: { key: 'fjordKilici', nadirlik: 'nadir', seviye: 5 } };

  const a = KUSAM.kusamBonuslari(lv1).kahraman.saldiri;
  const b = KUSAM.kusamBonuslari(lv5).kahraman.saldiri;
  assert.ok(b > a, `Lvl 5 daha çok vurmalı (${a} → ${b})`);
});
