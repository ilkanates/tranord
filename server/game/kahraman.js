/**
 * KAHRAMAN — oyuncunun TEK ve kalıcı savaşçısı.
 *
 * Bu dosya kahramanın SAF KURALLARI: deneyim eğrisi, seviye, skil puanı
 * dağıtımı, bonus hesabı, can ve iyileşme. Oturum/soket/kayıt işleri
 * burada YOK — index.js'in işi. Böylece kuralların tamamı test edilebiliyor
 * ve denge ayarı tek dosyadan yapılıyor.
 *
 * TEMEL KARARLAR
 *
 * 1) KAHRAMAN OYUNCUYA AİT, KÖYE DEĞİL.
 *    Köy bazında olsaydı beş köylü oyuncunun beş kahramanı olurdu ve
 *    "tek ve kalıcı kahraman" fikri çökerdi. Kahramanın bir ÜSSÜ var
 *    (Kahraman Konağı'nın bulunduğu köy); üs taşınabilir, kahraman
 *    taşınmaz.
 *
 * 2) KAHRAMAN ÖLMEZ, BAYILIR.
 *    Canı 0'a inince belli bir süre kullanılamaz, sonra üssünde
 *    iyileşir. Kalıcı ölüm olsaydı kimse kahramanı riske atmazdı ve
 *    sistem "yatırım yap ama asla kullanma"ya dönerdi.
 *
 * 3) SKİL PUANI GERİ ALINABİLİR — AMA BEDELLİ.
 *    Geri alınamaz olsaydı yeni oyuncu ilk yanlış dağıtımda kalıcı ceza
 *    yerdi; bedava olsaydı skil seçimi bir karar olmaktan çıkardı.
 *
 * 4) YÜZDE BONUSLARIN TAVANI VAR.
 *    Tavansız bir kahraman tek başına savaşı belirler ve ordu
 *    anlamsızlaşır. Kahraman orduyu GÜÇLENDİRİR, orduNUN YERİNE GEÇMEZ.
 */

// ── Deneyim ve seviye ──────────────────────────────────────────────

/**
 * Seviye atlamak için gereken TOPLAM deneyim.
 *
 * Üstel değil KUVVET eğrisi (^1.6). Üstel eğride 20. seviyeden sonra
 * ilerleme tamamen durur, doğrusal eğride ise yüksek seviye değersizleşir.
 *
 * Ölçek macera ödülüne göre seçildi (kısa macera ~40 XP, uzun ~120):
 *   Lvl 2 → 100 · Lvl 10 → ~3.400 · Lvl 20 → ~11.000 · Lvl 100 → ~156.000
 * Yani ilk seviyeler birkaç macerada geliyor, 20'den sonrası aylara
 * yayılıyor. Denge ayarı BU İKİ SABİTTEN yapılır.
 */
const XP_TABAN = 100;
const XP_US = 1.6;
const EN_YUKSEK_SEVIYE = 100;

function seviyeIcinToplamXp(seviye) {
  if (seviye <= 1) return 0;
  return Math.round(XP_TABAN * Math.pow(seviye - 1, XP_US));
}

/** Verilen toplam deneyimin karşılığı olan seviye (1 tabanlı). */
function xpSeviyesi(xp) {
  let s = 1;
  while (s < EN_YUKSEK_SEVIYE && xp >= seviyeIcinToplamXp(s + 1)) s++;
  return s;
}

/** Bir sonraki seviyeye ilerleme — arayüzdeki çubuk için. */
function seviyeIlerlemesi(xp) {
  const seviye = xpSeviyesi(xp);
  if (seviye >= EN_YUKSEK_SEVIYE) {
    return { seviye, simdiki: 0, gereken: 0, oran: 1 };
  }
  const alt = seviyeIcinToplamXp(seviye);
  const ust = seviyeIcinToplamXp(seviye + 1);
  const simdiki = xp - alt;
  const gereken = ust - alt;
  return { seviye, simdiki, gereken, oran: gereken > 0 ? simdiki / gereken : 1 };
}

// ── Skiller ────────────────────────────────────────────────────────

/**
 * DÖRT SKİL — İlkan'ın tarifi: "def bonusu, saldırı bonusu, saldırı puanı
 * ve hammadde üretimi, aynı Travian'daki gibi".
 *
 * Her seviye 4 PUAN veriyor; her skil en çok SKIL_PUAN_TAVANI puan alıyor.
 * Tavan 100 ve seviye tavanı da 100 olduğu için 100. seviyedeki oyuncu
 * tam olarak dört skili de doldurabiliyor — yani uzun vadede "her şeyi
 * alırsın", kısa vadede "ne önce" sorusu var. Bu bilerek: geri alınamaz
 * bir uzmanlaşma, oyuncuyu ilk saatte verdiği kararla aylarca cezalandırır.
 */
const PUAN_PER_SEVIYE = 4;
const SKIL_PUAN_TAVANI = 100;

const SKILLER = {
  saldiriPuani: {
    ad: 'Saldırı Puanı',
    aciklama: 'Kahramanın KENDİ saldırı gücü. Seferde tek bir birim gibi '
      + 'savaşır; bu puan onun vuruşudur.',
    puanBasina: 80,        // ham saldırı gücü
    birim: 'guc',
  },
  saldiriBonus: {
    ad: 'Saldırı Bonusu',
    aciklama: 'Kahraman sefere katıldığında ORDUNUN saldırısına yüzde ek.',
    puanBasina: 0.2,       // yüzde
    birim: 'yuzde',
    tavanYuzde: 20,
  },
  savunmaBonus: {
    ad: 'Savunma Bonusu',
    aciklama: 'Kahraman köydeyken o köyün TÜM savunmasına yüzde ek.',
    puanBasina: 0.2,       // yüzde
    birim: 'yuzde',
    tavanYuzde: 20,
  },
  uretim: {
    ad: 'Hammadde Üretimi',
    aciklama: 'Kahramanın bulunduğu köyün ham kaynak üretimine saatlik ek.',
    puanBasina: 3,         // saatte adet, her ham kaynak için
    birim: 'saatlik',
  },
};

const SKIL_ANAHTARLARI = Object.keys(SKILLER);

// ── Can ve iyileşme ────────────────────────────────────────────────

/**
 * Can TAVANI seviyeyle artıyor. Sabit olsaydı yüksek seviyeli kahraman
 * her savaşta aynı oranda bayılır ve seviyenin savaş dayanıklılığına
 * hiçbir katkısı olmazdı.
 */
const CAN_TABAN = 100;
const CAN_PER_SEVIYE = 10;

function canTavani(seviye) {
  return CAN_TABAN + CAN_PER_SEVIYE * Math.max(0, seviye - 1);
}

/**
 * İyileşme OYUN SAATİ üzerinden — gerçek saat olsaydı hız çarpanı
 * değişen bir dünyada kahraman ya hiç iyileşmez ya anında iyileşirdi.
 * Konak seviyesi hızı artırıyor: konak kahramanın yatırım hedefi olmalı.
 */
const IYILESME_TABAN_SAATLIK = 2;      // can / oyun saati, konak yokken
const IYILESME_KONAK_SAATLIK = 1.5;    // konak seviyesi başına ek

function iyilesmeHizi(konakSeviyesi = 0) {
  return IYILESME_TABAN_SAATLIK + IYILESME_KONAK_SAATLIK * Math.max(0, konakSeviyesi);
}

/**
 * BAYILMA: can 0'a inince kahraman bu kadar oyun saati kullanılamaz.
 * Sıfır olsaydı bayılmak yalnız bir can kaybı olurdu; çok uzun olsaydı
 * tek kötü savaş oyuncuyu günlerce kahramansız bırakırdı.
 */
const BAYGIN_SAAT = 12;

// ── Durum ──────────────────────────────────────────────────────────

/**
 * Yeni kahraman. Kahraman KONAK KURULUNCA doğuyor — konaksız oyuncunun
 * kahramanı yok. Aksi hâlde "kahraman var ama hiçbir şey yapamıyor"
 * gibi anlaşılmaz bir ara durum çıkardı.
 */
function yeniKahraman(usKoyu = null) {
  return {
    var: true,
    usSlot: usKoyu,
    xp: 0,
    can: CAN_TABAN,
    baygunKalanSaat: 0,
    skiller: { saldiriPuani: 0, saldiriBonus: 0, savunmaBonus: 0, uretim: 0 },
    harcanmamisPuan: 0,
    sifirlamaSayisi: 0,
    /** Kuşanılmış eşyalar — slot → eşya kimliği (Aşama 4) */
    kusanilan: {},
    /** Envanter — eşya kimliği → adet (Aşama 4) */
    envanter: {},
    nerede: 'koy',   // koy | sefer | macera
  };
}

/**
 * Deneyim ekle ve seviye atlamalarını işle.
 *
 * Harcanmamış puan BİRİKİR: oyuncu çevrimdışıyken seviye atlarsa puanı
 * kaybetmemeli. Puanı otomatik dağıtmak da olmaz — hangi skile gideceği
 * oyuncunun kararı.
 *
 * @returns {{oncekiSeviye:number, seviye:number, kazanilanPuan:number}}
 */
function xpEkle(k, miktar) {
  const once = xpSeviyesi(k.xp || 0);
  k.xp = Math.max(0, (k.xp || 0) + Math.max(0, miktar));
  const sonra = xpSeviyesi(k.xp);
  const kazanilan = Math.max(0, sonra - once) * PUAN_PER_SEVIYE;
  if (kazanilan) {
    k.harcanmamisPuan = (k.harcanmamisPuan || 0) + kazanilan;
    // Can tavanı büyüdü: farkı HEDİYE ET. Seviye atlamak kahramanı
    // "daha yaralı" göstermemeli.
    k.can = Math.min(canTavani(sonra), (k.can || 0) + (canTavani(sonra) - canTavani(once)));
  }
  return { oncekiSeviye: once, seviye: sonra, kazanilanPuan: kazanilan };
}

/**
 * Puan dağıt. Kısmî dağıtım YOK: istenen puan yoksa ya da skil tavanı
 * aşılıyorsa istek tamamen reddediliyor — yarısı uygulanmış bir dağıtım
 * oyuncunun geri alamayacağı sessiz bir hata olurdu.
 */
function puanDagit(k, skil, adet) {
  const n = Math.floor(adet);
  if (!SKILLER[skil]) return { ok: false, sebep: 'skil_yok' };
  if (!(n > 0)) return { ok: false, sebep: 'gecersiz_adet' };
  if ((k.harcanmamisPuan || 0) < n) return { ok: false, sebep: 'puan_yetmiyor' };
  const yeni = (k.skiller[skil] || 0) + n;
  if (yeni > SKIL_PUAN_TAVANI) return { ok: false, sebep: 'skil_tavani' };
  k.skiller[skil] = yeni;
  k.harcanmamisPuan -= n;
  return { ok: true, skil, adet: n, kalanPuan: k.harcanmamisPuan };
}

/**
 * SIFIRLAMA BEDELİ her seferinde katlanıyor: ilk sıfırlama ucuz (yeni
 * oyuncunun hatası), onuncusu pahalı (her savaştan önce skil değiştirip
 * hem saldırı hem savunma bonusunu kullanmak istismar olurdu).
 */
const SIFIRLAMA_TABAN = { demirKulce: 200, tahil: 200 };
const SIFIRLAMA_CARPANI = 2;

function sifirlamaBedeli(k) {
  const c = Math.pow(SIFIRLAMA_CARPANI, k.sifirlamaSayisi || 0);
  const out = {};
  for (const [key, val] of Object.entries(SIFIRLAMA_TABAN)) out[key] = Math.round(val * c);
  return out;
}

/** Bütün puanları geri ver. Bedeli ÇAĞIRAN tahsil eder (kaynak burada yok). */
function skilleriSifirla(k) {
  const toplam = SKIL_ANAHTARLARI.reduce((s, key) => s + (k.skiller[key] || 0), 0);
  for (const key of SKIL_ANAHTARLARI) k.skiller[key] = 0;
  k.harcanmamisPuan = (k.harcanmamisPuan || 0) + toplam;
  k.sifirlamaSayisi = (k.sifirlamaSayisi || 0) + 1;
  return { geriVerilen: toplam, kalanPuan: k.harcanmamisPuan };
}

// ── Bonuslar ───────────────────────────────────────────────────────

/**
 * Kahramanın dünyaya yansıyan etkileri.
 *
 * BAYGIN KAHRAMAN HİÇBİR BONUS VERMEZ. Vermeseydi bile "biraz verse"
 * demek, bayılmayı yalnız bir sayı düşüşü yapardı; bayılmanın canı
 * yakmalı ki savaşa sokma kararı bir risk olsun.
 *
 * CAN ORANI bonusları ölçeklemiyor — yaralı kahraman tam bonus veriyor.
 * Ölçekleseydi savaş hesabı "kahramanın canı" gibi görünmez bir değişkene
 * bağlanır, oyuncu savaş öncesi gücünü kestiremezdi.
 */
function bonuslar(k) {
  const bos = { saldiriGucu: 0, saldiriYuzde: 0, savunmaYuzde: 0, uretimSaatlik: 0 };
  if (!k || !k.var || (k.baygunKalanSaat || 0) > 0) return bos;
  const s = k.skiller || {};
  const yuzdeKap = (puan, def) =>
    Math.min(def.tavanYuzde, (puan || 0) * def.puanBasina);
  return {
    saldiriGucu: (s.saldiriPuani || 0) * SKILLER.saldiriPuani.puanBasina,
    saldiriYuzde: yuzdeKap(s.saldiriBonus, SKILLER.saldiriBonus),
    savunmaYuzde: yuzdeKap(s.savunmaBonus, SKILLER.savunmaBonus),
    uretimSaatlik: (s.uretim || 0) * SKILLER.uretim.puanBasina,
  };
}

/**
 * Zaman ilerlet — baygınlık sayacı ve iyileşme.
 *
 * Sıra ÖNEMLİ: önce baygınlık biter, sonra iyileşme başlar. Aynı anda
 * işleseydi kahraman bayılma süresi boyunca da iyileşir, bayılma yalnız
 * "kullanılamama" olurdu; oysa ceza ikisi birden.
 */
function ilerlet(k, oyunSaati, konakSeviyesi = 0) {
  if (!k || !k.var || !(oyunSaati > 0)) return k;
  let kalan = oyunSaati;
  if ((k.baygunKalanSaat || 0) > 0) {
    const dusen = Math.min(k.baygunKalanSaat, kalan);
    k.baygunKalanSaat -= dusen;
    kalan -= dusen;
    if (k.baygunKalanSaat <= 0) {
      k.baygunKalanSaat = 0;
      // Bayılmadan çıkan kahraman canının dörtte biriyle ayağa kalkar —
      // sıfır canla kalkarsa bir sonraki savaşta anında yeniden bayılır.
      k.can = Math.max(k.can || 0, Math.round(canTavani(xpSeviyesi(k.xp)) * 0.25));
    }
  }
  if (kalan > 0 && k.nerede === 'koy') {
    const tavan = canTavani(xpSeviyesi(k.xp));
    k.can = Math.min(tavan, (k.can || 0) + iyilesmeHizi(konakSeviyesi) * kalan);
  }
  return k;
}

// ── Savaş ──────────────────────────────────────────────────────────

/**
 * Kahramanın SAVAŞ KAZANCI ve BEDELİ.
 *
 * XP öldürülen birim başına: savaşın büyüklüğüyle ölçekleniyor, sonucuyla
 * değil. Yalnız zaferi ödüllendirseydik kahraman ancak kazanılacağı belli
 * savaşlara sokulur, riskli savaş hiç denenmezdi.
 *
 * HASAR ordunun kayıp oranına bağlı: ordu sıyrık almadan kazandıysa
 * kahraman da az yıpranır, ordu kırıldıysa kahraman bayılır. Sabit hasar
 * olsaydı kahramanı ezici üstünlükle küçük hedeflere sürmek bedava olurdu.
 */
const XP_OLDURULEN_BASINA = 2;
const SAVAS_HASAR_TAVANI = 70;

function savasSonucu(oldurulenBirim = 0, kayipOrani = 0) {
  return {
    xp: Math.round(Math.max(0, oldurulenBirim) * XP_OLDURULEN_BASINA),
    hasar: Math.round(Math.min(1, Math.max(0, kayipOrani)) * SAVAS_HASAR_TAVANI),
  };
}

/** Hasar uygula; can biterse kahraman bayılır. */
function hasarVer(k, hasar) {
  if (!k || !k.var) return { bayildi: false, can: 0 };
  k.can = Math.max(0, (k.can || 0) - Math.max(0, hasar));
  if (k.can <= 0 && (k.baygunKalanSaat || 0) <= 0) {
    k.baygunKalanSaat = BAYGIN_SAAT;
    k.nerede = 'koy';
    return { bayildi: true, can: 0 };
  }
  return { bayildi: false, can: k.can };
}

/** İstemciye gidecek özet. */
function ozet(k, konakSeviyesi = 0) {
  if (!k || !k.var) return { var: false };
  const ilerleme = seviyeIlerlemesi(k.xp || 0);
  return {
    var: true,
    usSlot: k.usSlot || null,
    xp: Math.round(k.xp || 0),
    seviye: ilerleme.seviye,
    xpSimdiki: Math.round(ilerleme.simdiki),
    xpGereken: Math.round(ilerleme.gereken),
    can: Math.round(k.can || 0),
    canTavan: canTavani(ilerleme.seviye),
    baygunKalanSaat: Math.round((k.baygunKalanSaat || 0) * 10) / 10,
    iyilesmeSaatlik: iyilesmeHizi(konakSeviyesi),
    skiller: { ...k.skiller },
    harcanmamisPuan: k.harcanmamisPuan || 0,
    sifirlamaBedeli: sifirlamaBedeli(k),
    bonuslar: bonuslar(k),
    nerede: k.nerede || 'koy',
    kusanilan: { ...(k.kusanilan || {}) },
    envanter: { ...(k.envanter || {}) },
  };
}

module.exports = {
  SKILLER, SKIL_ANAHTARLARI, PUAN_PER_SEVIYE, SKIL_PUAN_TAVANI,
  EN_YUKSEK_SEVIYE, CAN_TABAN, CAN_PER_SEVIYE, BAYGIN_SAAT,
  SIFIRLAMA_TABAN, SIFIRLAMA_CARPANI,
  XP_OLDURULEN_BASINA, SAVAS_HASAR_TAVANI, savasSonucu,
  seviyeIcinToplamXp, xpSeviyesi, seviyeIlerlemesi,
  canTavani, iyilesmeHizi,
  yeniKahraman, xpEkle, puanDagit, sifirlamaBedeli, skilleriSifirla,
  bonuslar, ilerlet, hasarVer, ozet,
};
