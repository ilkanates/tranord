/**
 * KESE — oyuncunun İKİ parası: GÜMÜŞ ve ALTIN.
 *
 * İlkan'ın tarifi: *"kahramanlar itemlerini satabilmeli gümüş
 * karşılığında… oyunda bir de altın olsun… kullanıcı altını gümüşe,
 * gümüşü altına çevirebilsin… altınla 1'e 1 hammadde ticareti
 * yapabilsin… üretim bonusu, depo bonusu ve bina yapımını hızlı
 * bitirme gibi şeylerde de kullanabilsin."*
 *
 * ── NEDEN İKİ PARA ──────────────────────────────────────────────────
 *
 * GÜMÜŞ oyunun içinden kazanılıyor (asıl kaynağı macera) ve yalnız
 * kahraman ekonomisinde harcanıyor: açık artırmadan eşya almak, eşya
 * yükseltmek. ALTIN oyunun dışından geliyor (hediye, ileride satın
 * alma).
 *
 * ALTINLA HAMMADDE ALINAMIYOR (İlkan'ın kararı: *"parayla hammadde
 * alınamamalı"*). Alınabilseydi oyun "para öde, kaynak al" hâline
 * gelir, ödeyenin üretim yapmaya ihtiyacı kalmazdı. Kaynak dönüştürmenin
 * yeri pazar ve bedeli oranın kendisi (bkz. pazar.js · npcTakas).
 *
 * İkisini tek para yapsaydık, dışarıdan alınan her birim doğrudan
 * kahramanın gücüne çevrilebilirdi; ayrı tutunca aradaki geçiş TEK bir
 * kapıdan (aşağıdaki kur) geçiyor ve o kapının maliyeti görünür oluyor.
 *
 * ── KESE HESABA AİT, KÖYE DEĞİL ─────────────────────────────────────
 *
 * Köy başına cüzdan olsaydı oyuncu parasını köyler arasında taşımak
 * zorunda kalırdı ve "hangi köydeyim" sorusu alışverişin önüne geçerdi.
 * Kahraman ve görev zinciri gibi merkez köyün state'inde duruyor;
 * merkez değişince birlikte taşınıyor (bkz. hesapKaydi.js).
 *
 * ── SAYILAR TAM SAYI ────────────────────────────────────────────────
 *
 * Kesir para, "0,3 gümüşüm var ama alamıyorum" gibi hiçbir zaman
 * açıklanamayan durumlar üretir. Her giriş/çıkış aşağı yuvarlanıyor;
 * yuvarlama HEP oyuncunun aleyhine değil, kazançta da aşağı — iki yönde
 * farklı yuvarlamak bir tur döndürüp para üretme yolu açardı.
 */

/** Yeni hesabın başlangıç kesesi */
const BASLANGIC = {
  /*
    BEŞ YÜZ GÜMÜŞ — İlkan: *"başlangıçta herkese birkaç item alacak
    kadar gümüş verilsin."*

    Sıradan eşyanın taban fiyatı 40 (bkz. esyaDeger.js): beş yüz gümüş
    on sıradan ya da bir epik eşya demek. "Birkaç eşya" bu; oyuncu ilk
    açık artırmaya seyirci değil alıcı olarak giriyor.
  */
  gumus: 500,
  /*
    YÜZ ALTIN — İlkan: *"canlıya alınca bir miktar altın verelim."*

    Şimdilik HERKESE veriliyor: ödeme sağlayıcısı yok, altının tek
    kaynağı bu. Yüz altın, kurla 10.000 gümüş eder — yani altın gerçek
    bir başlangıç avantajı ama oyunu bitirmiyor.
  */
  altin: 100,
};

/**
 * ALTIN → GÜMÜŞ: 1 altın = 100 gümüş.
 * GÜMÜŞ → ALTIN: 150 gümüş = 1 altın.
 *
 * MAKAS ZORUNLU. Çift yönlü ve AYNI kurda çevrilseydi iki para birimi
 * tek para birimine düşerdi: altının "dışarıdan gelen, kıt olan"
 * anlamı kalmaz, oyuncu ikisini tek bir havuz gibi kullanırdı.
 * %50'lik makas geri dönüşü pahalı yapıyor — gümüşü altına çevirmek
 * bir kaçış kapısı olarak duruyor, günlük bir hamle değil.
 *
 * Yön adları kurun ANLAMINI taşıyor: "bir altın kaç gümüş eder" ve
 * "bir altın kaç gümüşe mal olur".
 */
const ALTIN_GUMUS = 100;   // 1 altın satınca alınan gümüş
const GUMUS_ALTIN = 150;   // 1 altın almak için verilen gümüş

/** Kaydı çalışır hâle getir — eski hesapta kese alanı hiç yok. */
function duzelt(kese) {
  const k = kese && typeof kese === 'object' ? kese : {};
  return {
    gumus: tamSayi(k.gumus, BASLANGIC.gumus),
    altin: tamSayi(k.altin, BASLANGIC.altin),
  };
}

/** Yeni hesabın kesesi */
function yeniKese() {
  return { ...BASLANGIC };
}

function tamSayi(v, varsayilan) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : varsayilan;
}

/**
 * PARA EKLE. Negatif miktar sessizce yok sayılıyor: "eksi ekleme"
 * harcamanın gizli kapısı olurdu, harcama kendi fonksiyonundan geçer.
 */
function ekle(kese, tur, miktar) {
  const k = duzelt(kese);
  const n = Math.floor(Number(miktar) || 0);
  if (!(tur in BASLANGIC) || n <= 0) return k;
  k[tur] += n;
  return k;
}

/**
 * PARA HARCA — yetmezse HİÇ dokunmuyor.
 *
 * Kısmi harcama yok: yarısını alıp "yetmedi" demek oyuncunun parasını
 * karşılıksız yakmak olurdu.
 */
function harca(kese, tur, miktar) {
  const k = duzelt(kese);
  const n = Math.floor(Number(miktar) || 0);
  if (!(tur in BASLANGIC)) return { ok: false, sebep: 'gecersiz_para', kese: k };
  if (n <= 0) return { ok: false, sebep: 'miktar_sifir', kese: k };
  if (k[tur] < n) return { ok: false, sebep: 'yetersiz', kese: k, eksik: n - k[tur] };
  k[tur] -= n;
  return { ok: true, kese: k };
}

/** Yetecek mi — harcamadan sor (istemci düğmeyi kapatabilsin diye) */
function yeter(kese, tur, miktar) {
  const k = duzelt(kese);
  return (k[tur] || 0) >= Math.floor(Number(miktar) || 0);
}

/**
 * ÇEVİR — altın ↔ gümüş.
 *
 * @param yon 'altinToGumus' | 'gumusToAltin'
 * @param adet KAYNAK paradan verilecek miktar (altın adedi / gümüş adedi)
 *
 * GÜMÜŞ → ALTIN'da artık gümüş GERİ VERİLİYOR: 400 gümüşle 2 altın
 * alınıyor ve 100 gümüş kesede kalıyor. Artığı yutsaydık oyuncu tam
 * katları ezberlemek zorunda kalırdı ve her seferinde sessizce para
 * kaybederdi.
 */
function cevir(kese, yon, adet) {
  const k = duzelt(kese);
  const n = Math.floor(Number(adet) || 0);
  if (n <= 0) return { ok: false, sebep: 'miktar_sifir', kese: k };

  if (yon === 'altinToGumus') {
    if (k.altin < n) return { ok: false, sebep: 'yetersiz', kese: k };
    k.altin -= n;
    const kazanc = n * ALTIN_GUMUS;
    k.gumus += kazanc;
    return { ok: true, kese: k, verilen: { altin: n }, alinan: { gumus: kazanc } };
  }

  if (yon === 'gumusToAltin') {
    const alinacak = Math.floor(n / GUMUS_ALTIN);
    if (alinacak < 1) return { ok: false, sebep: 'miktar_az', enAz: GUMUS_ALTIN, kese: k };
    const harcanan = alinacak * GUMUS_ALTIN;    // artık gümüş kesede kalıyor
    if (k.gumus < harcanan) return { ok: false, sebep: 'yetersiz', kese: k };
    k.gumus -= harcanan;
    k.altin += alinacak;
    return { ok: true, kese: k, verilen: { gumus: harcanan }, alinan: { altin: alinacak } };
  }

  return { ok: false, sebep: 'gecersiz_yon', kese: k };
}

/** İstemciye giden özet — kurlar da gidiyor, istemci kendi hesaplamasın */
function ozet(kese) {
  const k = duzelt(kese);
  return {
    gumus: k.gumus, altin: k.altin,
    altinGumus: ALTIN_GUMUS,
    gumusAltin: GUMUS_ALTIN,
  };
}

module.exports = {
  BASLANGIC, ALTIN_GUMUS, GUMUS_ALTIN,
  duzelt, yeniKese, ekle, harca, yeter, cevir, ozet,
};
