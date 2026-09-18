/**
 * YAĞMA LİSTESİ — kurallar.
 *
 * İlkan: *"toplu yağmaya gönder tuşu olsun… dolu dönenlere saldır tuşu
 * olsun… şu an saldıramadıklarıma saldır tuşu olsun."*
 *
 * Bu dosyanın asıl işi ÜÇ SÜZGECİ kilitlemek. Süzgeçler sessizce
 * bozulabilen cinsten: yanlış çalışan "dolu dönenlere saldır", oyuncunun
 * ordusunu boş köylere gönderip saatlerce boşa yürütür ve hiçbir hata
 * mesajı çıkmaz. Yanlış çalışan "gönderilemeyenlere saldır" ise aynı
 * hedefe ikinci kez sefer açıp sefer limitini yer.
 *
 * "DOLU" tanımı da burada kilitli: ganimet taşıma kapasitesini
 * doldurduysa hedefte daha fazlası kalmıştır. Oyunun bütün yağma
 * döngüsü bu tek bitlik bilgiye dayanıyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const Y = require('../game/yagmaListesi');

const koy = () => ({});
const listeliKoy = () => {
  const v = koy();
  Y.listeEkle(v, 'Kuzey');
  return v;
};
const id = (v) => v.yagmaListeleri[0].id;
const hedefler = (v) => v.yagmaListeleri[0].hedefler;

test('liste ve hedef eklenebiliyor, ad temizleniyor', () => {
  const v = koy();
  const r = Y.listeEkle(v, '   Batı   yakası   ');
  assert.equal(r.ok, true);
  assert.equal(r.liste.ad, 'Batı yakası', 'fazla boşluklar temizlenmedi');

  Y.hedefEkle(v, r.liste.id, { slotKey: '1,2', ad: 'Ornvik', birimler: { fjordvakt: 10 } });
  assert.equal(hedefler(v).length, 1);
  assert.deepEqual(hedefler(v)[0].birimler, { fjordvakt: 10 });
});

test('ayni hedef IKINCI SATIR acmiyor, secimi guncelliyor', () => {
  /*
    Aynı köye iki satırdan sefer, toplu gönderimde sefer limitini boşuna
    yiyen ve oyuncunun fark etmediği bir hata olurdu.
  */
  const v = listeliKoy();
  Y.hedefEkle(v, id(v), { slotKey: '1,2', birimler: { fjordvakt: 10 } });
  const r = Y.hedefEkle(v, id(v), { slotKey: '1,2', birimler: { fjordvakt: 25 } });
  assert.equal(r.zatenVardi, true);
  assert.equal(hedefler(v).length, 1, 'ikinci satır açıldı');
  assert.deepEqual(hedefler(v)[0].birimler, { fjordvakt: 25 }, 'seçim güncellenmedi');
});

test('sifir ve bozuk birim secimleri temizleniyor', () => {
  const v = listeliKoy();
  Y.hedefEkle(v, id(v), {
    slotKey: '1,2',
    birimler: { fjordvakt: 10, spydvakt: 0, hayalet: 5, bozuk: 'abc', eksi: -3 },
  }, { fjordvakt: {}, spydvakt: {}, eksi: {} });
  /* Bilinmeyen birim düşer, sıfır ve negatif düşer */
  assert.deepEqual(hedefler(v)[0].birimler, { fjordvakt: 10 });
});

test('ASKERSIZ satir hicbir suzgecte gonderilmiyor', () => {
  /*
    "0 asker yolla" sessizce başarısız olan bir sefer olurdu ve oyuncu
    listenin neden eksik gittiğini anlamazdı.
  */
  const v = listeliKoy();
  Y.hedefEkle(v, id(v), { slotKey: '1,2', birimler: {} });
  assert.equal(Y.gonderilecekler(v, id(v), 'hepsi').length, 0);
  hedefler(v)[0].sonSonuc = Y.SONUC.DOLU;
  assert.equal(Y.gonderilecekler(v, id(v), 'dolu').length, 0);
});

test('DOLU suzgeci yalniz dolu donenleri veriyor', () => {
  const v = listeliKoy();
  for (const [k, sonuc] of [['1,1', Y.SONUC.DOLU], ['1,2', Y.SONUC.EKSIK],
    ['1,3', Y.SONUC.BOS], ['1,4', null], ['1,5', Y.SONUC.DOLU]]) {
    Y.hedefEkle(v, id(v), { slotKey: k, birimler: { fjordvakt: 5 } });
    hedefler(v).find(h => h.slotKey === k).sonSonuc = sonuc;
  }
  const dolu = Y.gonderilecekler(v, id(v), 'dolu').map(h => h.slotKey);
  assert.deepEqual(dolu, ['1,1', '1,5']);
  assert.equal(Y.gonderilecekler(v, id(v), 'hepsi').length, 5);
});

test('GONDERILEMEYEN suzgeci ve basarida hatanin TEMIZLENMESI', () => {
  const v = listeliKoy();
  Y.hedefEkle(v, id(v), { slotKey: '1,1', birimler: { fjordvakt: 5 } });
  Y.hedefEkle(v, id(v), { slotKey: '1,2', birimler: { fjordvakt: 5 } });

  Y.gonderimIsle(v, id(v), '1,1', { ok: false, sebep: 'yetersiz_asker' });
  Y.gonderimIsle(v, id(v), '1,2', { ok: true, at: 1000 });
  assert.deepEqual(Y.gonderilecekler(v, id(v), 'gonderilemeyen').map(h => h.slotKey), ['1,1']);

  /*
    TEMİZLENMESEYDİ bir kez gönderilemeyen hedef "gönderilemeyen"
    süzgecinde sonsuza kadar kalır, her basışta tekrar gönderilirdi.
  */
  Y.gonderimIsle(v, id(v), '1,1', { ok: true, at: 2000 });
  assert.equal(Y.gonderilecekler(v, id(v), 'gonderilemeyen').length, 0);
  assert.equal(hedefler(v)[0].sonGonderim, 2000);
});

test('sonucIsle: DOLU = ganimet kapasiteyi doldurdu', () => {
  const v = listeliKoy();
  Y.hedefEkle(v, id(v), { slotKey: '1,1', birimler: { fjordvakt: 5 } });

  Y.sonucIsle(v, { toKey: '1,1', loot: { odun: 150, kil: 150 }, units: { fjordvakt: 5 }, yagmaKapasite: 300 });
  assert.equal(hedefler(v)[0].sonSonuc, Y.SONUC.DOLU);
  assert.equal(hedefler(v)[0].sonGanimet, 300);

  /* Kapasitenin altında → hedef boşalmış */
  Y.sonucIsle(v, { toKey: '1,1', loot: { odun: 40 }, units: { fjordvakt: 5 }, yagmaKapasite: 300 });
  assert.equal(hedefler(v)[0].sonSonuc, Y.SONUC.EKSIK);

  /* Hiç ganimet yok */
  Y.sonucIsle(v, { toKey: '1,1', loot: {}, units: { fjordvakt: 5 }, yagmaKapasite: 300 });
  assert.equal(hedefler(v)[0].sonSonuc, Y.SONUC.BOS);

  /* Asker dönmediyse kayıp — ganimetten önce gelir */
  Y.sonucIsle(v, { toKey: '1,1', loot: { odun: 300 }, units: {}, yagmaKapasite: 300 });
  assert.equal(hedefler(v)[0].sonSonuc, Y.SONUC.KAYIP);
});

test('sonucIsle: bir-iki birim eksik de DOLU sayiliyor', () => {
  /*
    Ganimet kaynak başına bölünüp yuvarlanıyor; katı eşitlik aransaydı
    "dolu" sonucu neredeyse hiç oluşmazdı.
  */
  const v = listeliKoy();
  Y.hedefEkle(v, id(v), { slotKey: '1,1', birimler: { fjordvakt: 5 } });
  Y.sonucIsle(v, { toKey: '1,1', loot: { odun: 99, kil: 99 }, units: { fjordvakt: 5 }, yagmaKapasite: 200 });
  assert.equal(hedefler(v)[0].sonSonuc, Y.SONUC.DOLU);
});

test('sonucIsle AYNI HEDEFI BUTUN listelerde guncelliyor', () => {
  /*
    Tek listeyi güncellemek, aynı köyü iki listede tutan oyuncuya iki
    farklı gerçek göstermek olurdu.
  */
  const v = koy();
  Y.listeEkle(v, 'A'); Y.listeEkle(v, 'B');
  const [a, b] = v.yagmaListeleri;
  Y.hedefEkle(v, a.id, { slotKey: '9,9', birimler: { fjordvakt: 5 } });
  Y.hedefEkle(v, b.id, { slotKey: '9,9', birimler: { fjordvakt: 5 } });

  Y.sonucIsle(v, { toKey: '9,9', loot: { odun: 100 }, units: { fjordvakt: 5 }, yagmaKapasite: 100 });
  assert.equal(a.hedefler[0].sonSonuc, Y.SONUC.DOLU);
  assert.equal(b.hedefler[0].sonSonuc, Y.SONUC.DOLU);
});

test('sinirlar: liste ve hedef sayisi tavanli', () => {
  /*
    Liste köyün kayıtlı durumunun içinde ve her kayıtta diske yazılıyor;
    sınırsız bırakmak köy kaydını megabaytlara çıkarırdı.
  */
  const v = koy();
  for (let i = 0; i < Y.MAX_LISTE; i++) assert.equal(Y.listeEkle(v, `L${i}`).ok, true);
  assert.deepEqual(Y.listeEkle(v, 'fazla'), { ok: false, sebep: 'liste_limiti' });

  const lid = v.yagmaListeleri[0].id;
  for (let i = 0; i < Y.MAX_HEDEF; i++) {
    assert.equal(Y.hedefEkle(v, lid, { slotKey: `h${i}`, birimler: { fjordvakt: 1 } }).ok, true);
  }
  assert.deepEqual(
    Y.hedefEkle(v, lid, { slotKey: 'fazla', birimler: { fjordvakt: 1 } }),
    { ok: false, sebep: 'hedef_limiti' });
});

test('hydrate: eski ve BOZUK kayit cokertmiyor', () => {
  /*
    "Eski kayıt yeni alanı bilmiyor" hatası bu depoda defalarca canlıda
    patladı; bozuk bir liste bütün köyü açılmaz yapmamalı.
  */
  const bos = Y.hydrate({});
  assert.deepEqual(bos.yagmaListeleri, []);

  const bozuk = Y.hydrate({
    yagmaListeleri: [
      null,
      { ad: '', hedefler: [{ slotKey: '1,1', birimler: { a: 'x' }, sonSonuc: 'uydurma' }, {}] },
      'dize',
    ],
  });
  assert.equal(bozuk.yagmaListeleri.length, 1);
  assert.equal(bozuk.yagmaListeleri[0].ad, 'Liste', 'boş ad varsayılana dönmedi');
  assert.equal(bozuk.yagmaListeleri[0].hedefler.length, 1, 'slotKey\'siz hedef düşmedi');
  assert.deepEqual(bozuk.yagmaListeleri[0].hedefler[0].birimler, {});
  assert.equal(bozuk.yagmaListeleri[0].hedefler[0].sonSonuc, null, 'uydurma sonuç geçti');
});

test('liste silinince hedefleri de gidiyor, digeri duruyor', () => {
  const v = koy();
  Y.listeEkle(v, 'A'); Y.listeEkle(v, 'B');
  const [a, b] = v.yagmaListeleri;
  Y.hedefEkle(v, a.id, { slotKey: '1,1', birimler: { fjordvakt: 1 } });
  Y.hedefEkle(v, b.id, { slotKey: '2,2', birimler: { fjordvakt: 1 } });

  assert.equal(Y.listeSil(v, a.id).ok, true);
  assert.equal(v.yagmaListeleri.length, 1);
  assert.equal(v.yagmaListeleri[0].hedefler[0].slotKey, '2,2');
  assert.deepEqual(Y.listeSil(v, 'yok'), { ok: false, sebep: 'liste_yok' });
});

/**
 * KAYIP VE GANİMET DÖKÜMÜ — İlkan: *"son raporuna da o ekrandan üzerine
 * gelince ne almışım, asker kaybetmiş miyim gözükmeli."*
 *
 * Kayıp AYRI bir bilgi, sonucun içinde eriyemez: "dolu döndü ama 12
 * asker kaybettim" ile "dolu döndü, kayıpsız" aynı satırda aynı
 * görünürse, asker kaybettiren bir hedef farkında olmadan tekrar tekrar
 * vurulur.
 */
test('sonucIsle kaybi ve ganimet dokumunu ayri ayri yaziyor', () => {
  const v = listeliKoy();
  Y.hedefEkle(v, id(v), { slotKey: '1,1', birimler: { fjordvakt: 50 } });

  Y.sonucIsle(v, {
    toKey: '1,1',
    loot: { odun: 120, kil: 80, tahil: 0 },
    units: { fjordvakt: 38 },
    yagmaKapasite: 200,
    yagmaKayip: 12,
  });
  const h = hedefler(v)[0];
  assert.equal(h.sonSonuc, Y.SONUC.DOLU);
  assert.equal(h.sonGanimet, 200);
  assert.equal(h.sonKayip, 12, 'kayıp yazılmadı');
  /* Sıfır kalemler dökümde yer kaplamamalı */
  assert.deepEqual(h.sonGanimetler, { odun: 120, kil: 80 });
});

test('kayipsiz sefer sonKayip 0 yaziyor, eskisini birakmiyor', () => {
  const v = listeliKoy();
  Y.hedefEkle(v, id(v), { slotKey: '1,1', birimler: { fjordvakt: 50 } });

  Y.sonucIsle(v, { toKey: '1,1', loot: { odun: 10 }, units: { fjordvakt: 40 }, yagmaKapasite: 200, yagmaKayip: 12 });
  assert.equal(hedefler(v)[0].sonKayip, 12);

  /*
    İKİNCİ SEFER TEMİZ DÖNDÜ. Eski kayıp kalsaydı satır sonsuza kadar
    kırmızı görünür ve oyuncu artık güvenli olan bir hedefi atlardı.
  */
  Y.sonucIsle(v, { toKey: '1,1', loot: { odun: 10 }, units: { fjordvakt: 50 }, yagmaKapasite: 200, yagmaKayip: 0 });
  assert.equal(hedefler(v)[0].sonKayip, 0, 'eski kayıp silinmedi');
});

test('hydrate bozuk dokum ve kaybi temizliyor', () => {
  const d = Y.hydrate({
    yagmaListeleri: [{
      ad: 'A',
      hedefler: [{
        slotKey: '1,1',
        sonGanimetler: { odun: 50, kil: -3, bozuk: 'x' },
        sonKayip: -7,
      }],
    }],
  });
  const h = d.yagmaListeleri[0].hedefler[0];
  assert.deepEqual(h.sonGanimetler, { odun: 50 }, 'negatif/bozuk kalem geçti');
  assert.equal(h.sonKayip, 0, 'negatif kayıp geçti');
});
