/**
 * GRUP MESAJLAŞMASI — konu, üyelik ve erişim kuralları.
 *
 * İlkan'ın tarifi: *"yeni mesaj grubu oluşturulabilsin, bu bir kişi ya da
 * birden fazla kişi olabilsin ya da direk birlik seçilebilsin. mesaj
 * gruplarında konu yazılabilmeli."*
 *
 * Buradaki en kritik kilit BİRLİK GRUBUNUN ÜYE LİSTESİ TUTMAMASI:
 * katılımcı birliğin O ANKİ üyeleridir. Kuruluşta kopyalansaydı
 * birlikten atılan biri savunma yazışmasını okumaya devam ederdi.
 */
const test = require('node:test');
const assert = require('node:assert');
const G = require('../game/mesajGrup');

test('konu zorunlu: bos ya da tek harf kabul edilmiyor', () => {
  assert.equal(G.konuDogrula('').ok, false);
  assert.equal(G.konuDogrula('   ').reason, 'konu_kisa');
  assert.equal(G.konuDogrula('a').reason, 'konu_kisa');
  assert.deepEqual(G.konuDogrula('  Defans  '), { ok: true, konu: 'Defans' });
});

test('konu tek satira iniyor ve uzunlugu kirpiliyor', () => {
  const c = G.konuDogrula('Defans\nçağrısı');
  assert.equal(c.ok, true);
  assert.equal(c.konu.includes('\n'), false, 'konu tek satır olmalı');
  const uzun = G.konuDogrula('x'.repeat(200));
  assert.equal(uzun.konu.length, G.KONU_EN_COK);
});

test('ozel grup: en az bir uye, kurucu listeden dusuyor', () => {
  assert.equal(G.grupDogrula({ konu: 'Defans', uyeIdler: [], kurucuId: 1 }).reason,
    'uye_yok');
  /*
    Kurucu kendini de seçse listeye iki kez girmemeli — üyelik tablosuna
    kurucu ayrıca yazılıyor.
  */
  const g = G.grupDogrula({ konu: 'Defans', uyeIdler: [1, 2, 2, 3], kurucuId: 1 });
  assert.equal(g.ok, true);
  assert.equal(g.tip, 'ozel');
  assert.deepEqual(g.uyeIdler, [2, 3]);
});

test('ozel grupta uye tavani var, birlik grubunda yok', () => {
  const cok = Array.from({ length: G.EN_COK_UYE + 1 }, (_, i) => i + 2);
  assert.equal(G.grupDogrula({ konu: 'Defans', uyeIdler: cok, kurucuId: 1 }).reason,
    'cok_uye');
  /*
    Birlik grubunda tavan aranmıyor: orada birliğin kendi tavanı (elçilik
    seviyesi × 3) geçerli.
  */
  const b = G.grupDogrula({ konu: 'Defans', uyeIdler: cok, birlikId: 7, kurucuId: 1 });
  assert.equal(b.ok, true);
  assert.equal(b.tip, 'birlik');
  assert.deepEqual(b.uyeIdler, [], 'birlik grubu elle üye listesi taşımaz');
});

test('birlik grubuna erisim O ANKI birlik uyeligine bakiyor', () => {
  const grup = { tip: 'birlik', birlikId: 7, uyeIdler: [], kurucuId: 1 };
  assert.equal(G.erisebilirMi(grup, 42, 7), true, 'birlikteyken görür');
  /*
    BİRLİKTEN ÇIKAN ANINDA ERİŞİMİNİ KAYBEDİYOR. Üye listesi kuruluşta
    kopyalansaydı burada hâlâ true dönerdi — savunma yazışmasını atılmış
    bir üyenin okuması.
  */
  assert.equal(G.erisebilirMi(grup, 42, null), false, 'birlikten çıkınca görmez');
  assert.equal(G.erisebilirMi(grup, 42, 9), false, 'başka birlikteyken görmez');
});

test('ozel gruba erisim yalniz listedekilere', () => {
  const grup = { tip: 'ozel', birlikId: null, uyeIdler: [1, 2, 3], kurucuId: 1 };
  assert.equal(G.erisebilirMi(grup, 2, null), true);
  assert.equal(G.erisebilirMi(grup, 9, 7), false, 'birlik üyeliği özel gruba kapı değil');
});

test('birlik yazismasindan tek tek ayrilinmiyor', () => {
  const ozel = { tip: 'ozel', uyeIdler: [1, 2], kurucuId: 1 };
  const birlik = { tip: 'birlik', birlikId: 7, uyeIdler: [], kurucuId: 1 };
  assert.equal(G.ayrilabilirMi(ozel, 2), true);
  /*
    İzin verseydik "birlikte ama grubu görmeyen üye" hâli doğardı ve
    Konung'un "herkese duyurdum" varsayımı yalan olurdu.
  */
  assert.equal(G.ayrilabilirMi(birlik, 2), false);
});

test('grubu yalniz kuran dagitabilir', () => {
  const grup = { tip: 'ozel', uyeIdler: [1, 2, 3], kurucuId: 1 };
  assert.equal(G.dagitabilirMi(grup, 1), true);
  assert.equal(G.dagitabilirMi(grup, 2), false);
});

test('bos govde reddediliyor, kontrol karakterleri temizleniyor', () => {
  assert.equal(G.govdeDogrula('   ').reason, 'bos_mesaj');
  // Kontrol karakteri KOD NOKTASIYLA üretiliyor: kaynağa ham bayt gömmek
  // dosyayı okunamaz yapıyor, bir düzenleyici de sessizce kırpabiliyor.
  const zil = String.fromCharCode(7);
  const g = G.govdeDogrula(`Saldırı geliyor${zil}!`);
  assert.equal(g.ok, true);
  assert.equal(g.govde, 'Saldırı geliyor!');
});

test('her hata kodunun oyuncu diline cevirisi var', () => {
  /*
    Sunucu ham kod gönderiyor, ekranda çevirisi çıkıyor. Kodu ekleyip
    çeviriyi unutmak oyuncuya "undefined" göstermek demek.
  */
  const kodlar = ['konu_kisa', 'uye_yok', 'oyuncu_yok', 'cok_uye', 'bos_mesaj',
    'grup_yok', 'birlik_yok', 'yetki_yok', 'birlikten_ayrilinmaz'];
  for (const k of kodlar) {
    assert.equal(typeof G.HATA_METNI[k], 'string', `${k} çevirisi yok`);
    assert.ok(G.HATA_METNI[k].length > 5);
  }
});
