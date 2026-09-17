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
 * 2) KAHRAMAN ÖLÜR — ama DİRİLTİLEBİLİR (İlkan'ın kararı).
 *    Canı 0'a inince ölür ve kendiliğinden geri gelmez: oyuncu ya
 *    HAMMADDE ödeyip diriltir ya da maceradan düşen DİRİLTİCİ İKSİRİ
 *    kullanır. Bedel seviyeyle büyüyor, çünkü kaybedilen de seviyeyle
 *    büyüyor: ölüm bir gecikme değil bir bedel olmalı.
 *
 *    SEVİYE VE EŞYA KAYBOLMUYOR. Onları da silmek, aylarca biriktirilen
 *    bir yatırımı tek savaşta yok etmek olurdu; ceza bedelin kendisi.
 *
 * 3) SKİL PUANI GERİ ALINABİLİR — AMA BEDELLİ.
 *    Geri alınamaz olsaydı yeni oyuncu ilk yanlış dağıtımda kalıcı ceza
 *    yerdi; bedava olsaydı skil seçimi bir karar olmaktan çıkardı.
 *
 * 4) YÜZDE BONUSLARIN TAVANI VAR.
 *    Tavansız bir kahraman tek başına savaşı belirler ve ordu
 *    anlamsızlaşır. Kahraman orduyu GÜÇLENDİRİR, orduNUN YERİNE GEÇMEZ.
 */

/*
  MACERA kendi dosyasında (game/macera.js): birikme, tipler, ödül kurası.
  Burada yalnız özet paketine giren alanlar için kullanılıyor — kahramanın
  KİM olduğu ile NE YAPTIĞI ayrı dosyalarda dursun.
*/
const MACERA = require('./macera');
/*
  KUŞAM ayrı dosyada: eşyanın ne YAPTIĞI (bonus toplamı) ile kahramanın
  KİM olduğu (seviye, skil, can) ayrı kalsın. Buradaki her fonksiyon
  kuşamı hesaba katarken o dosyaya soruyor.
*/
const KUSAM = require('./kusam');
// Birim hızları: atın kahramana verdiği hız ekini buradan ÖLÇÜYORUZ
// (bkz. AT_HIZ_EKI) — sabit bir sayı yazsaydık birimler dengelenirken
// kahraman sessizce ayrışırdı.
const { UNIT_DEFS } = require('../data');

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
 * Her seviye 4 PUAN veriyor ve kahraman DOĞARKEN de 4 puanla geliyor;
 * her skil en çok SKIL_PUAN_TAVANI puan alıyor. Tavan 100 ve seviye
 * tavanı da 100 olduğu için 100. seviyedeki oyuncu tam olarak dört skili
 * de doldurabiliyor — uzun vadede "her şeyi alırsın", kısa vadede "ne
 * önce" sorusu var. Bu bilerek: geri alınamaz bir uzmanlaşma, oyuncuyu
 * ilk saatte verdiği kararla aylarca cezalandırırdı.
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
  /*
    ÜRETİM SKİLİ YÜZDE (İlkan'ın kararı). Eskiden puan başına +3/saat
    düz ekti: altı Lvl 1 tarlalı yeni köyde saatlik üretimi beşe
    katlıyor, maxlı köyde ise %6,5'te kalıyordu. Yüzde ters yönde
    çalışıyor ve tarla yatırımını ödüllendiriyor.

    TAVAN ÖLÇÜLEREK SEÇİLDİ: maxlı merkez köy ham kaynak başına
    ~4.620/saat üretiyor, %20'si +924/saat — İlkan'ın istediği
    "max seviyede 1000" tam buraya düşüyor.
  */
  uretim: {
    ad: 'Hammadde Üretimi',
    aciklama: 'Kahramanın bulunduğu köyün ham kaynak üretimine YÜZDE ek. '
      + 'Tarlaların üretimiyle birlikte büyür; tahıla işlemez.',
    puanBasina: 0.2,       // yüzde
    birim: 'yuzde',
    tavanYuzde: 20,
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

function canTavani(seviye, kusamCan = 0) {
  return CAN_TABAN + CAN_PER_SEVIYE * Math.max(0, seviye - 1) + Math.max(0, kusamCan);
}

/**
 * İyileşme OYUN SAATİ üzerinden — gerçek saat olsaydı hız çarpanı
 * değişen bir dünyada kahraman ya hiç iyileşmez ya anında iyileşirdi.
 * Konak seviyesi hızı artırıyor: konak kahramanın yatırım hedefi olmalı.
 */
const IYILESME_TABAN_SAATLIK = 2;      // can / oyun saati, konak yokken
const IYILESME_KONAK_SAATLIK = 1.5;    // konak seviyesi başına ek

function iyilesmeHizi(konakSeviyesi = 0, kusamIyilesme = 0) {
  return IYILESME_TABAN_SAATLIK + IYILESME_KONAK_SAATLIK * Math.max(0, konakSeviyesi)
    + Math.max(0, kusamIyilesme);
}

/**
 * DİRİLTME BEDELİ — seviyeyle büyür.
 *
 * Taban + seviye başına ek. Lvl 1'de ucuz (yeni oyuncu ilk ölümünde
 * oyundan kopmasın), Lvl 30'da ciddi bir yatırım. Sabit olsaydı yüksek
 * seviyeli oyuncu için ölüm bedava, düşük seviyeli için ezici olurdu.
 */
const DIRILTME_TABAN = { tahil: 300, demirKulce: 200 };
const DIRILTME_PER_SEVIYE = { tahil: 90, demirKulce: 60 };

/**
 * Diriltilen kahraman can tavanının bu oranıyla kalkar. Tam canla
 * kalksaydı ölüm yalnız bir fatura olurdu; sıfır canla kalksaydı bir
 * sonraki savaşta anında yeniden ölürdü.
 */
const DIRILME_CAN_ORANI = 0.5;

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
    /** Ölü mü — diriltilene kadar hiçbir şey yapamaz, bonus da vermez */
    olu: false,
    /** Kaç kez öldü — bilgi amaçlı, bedele girmiyor */
    olumSayisi: 0,
    skiller: { saldiriPuani: 0, saldiriBonus: 0, savunmaBonus: 0, uretim: 0 },
    /*
      LVL 1 DE 4 PUANLA GELİYOR (İlkan'ın kararı). Sıfır puanla doğsaydı
      kahraman ekranı ilk açıldığında yapılacak hiçbir şey olmaz, sistem
      "sonra bir şeyler olacak" gibi görünürdü. Dört puan, oyuncunun daha
      ilk bakışta bir karar vermesini sağlıyor.
    */
    harcanmamisPuan: PUAN_PER_SEVIYE,
    sifirlamaSayisi: 0,
    /** Kuşanılmış eşyalar — slot → { key, nadirlik } */
    kusanilan: {},
    /**
     * Envanter — eşya listesi. DİZİ, sözlük değil: aynı eşyanın farklı
     * nadirlikleri ayrı ayrı durabilmeli ve oyuncu hangisini kuşanacağına
     * karar verebilmeli.
     */
    envanter: [],
    /** Biriken macera hakkı ve bir sonrakine kalan ilerleme */
    maceraSayisi: 0,
    maceraIlerleme: 0,
    /**
     * TAMAMLANAN MACERA SAYISI — biriken HAK (`maceraSayisi`) değil,
     * bitirilen macera. İkisi ayrı: hak harcandıkça azalıyor, bu
     * yalnız artıyor. Görev zinciri "ilk maceranı tamamla" adımını
     * bununla ölçüyor; haktan ölçseydik macerayı başlatmak yeterli
     * sayılırdı ve oyuncu ödülü sonucu görmeden alırdı.
     */
    maceraTamamlanan: 0,
    /** Yoldaki macera — { tip, kalanSaat } ya da null */
    macera: null,
    /**
     * TAKVİYEDE DURDUĞU KÖY. Kahraman başka bir köye savunmaya
     * gönderilebiliyor (İlkan'ın kararı); orada savunma bonusunu O KÖYE
     * veriyor ve sahibi geri çağırana kadar orada kalıyor.
     */
    misafirSlot: null,
    /** Eve dönüş yolundaysa kalan oyun saati */
    donusKalanSaat: 0,
    nerede: 'koy',   // koy | sefer | macera | takviye | donuyor
  };
}

/**
 * KAHRAMAN ŞU AN HANGİ KÖYDE?
 *
 * Takviyedeyse misafir olduğu köyde, değilse üssünde (konağının olduğu
 * köy). İki ayrı alan olduğu için "kahraman nerede" sorusunun tek bir
 * cevabı olmalı — yoksa her çağıran kendi yorumunu yapar.
 */
function bulunduguSlot(k) {
  if (!k || !k.var) return null;
  if ((k.nerede || 'koy') === 'takviye' && k.misafirSlot) return k.misafirSlot;
  return k.usSlot || null;
}

/**
 * BU KÖYDEN SEFERE KATILABİLİR Mİ?
 *
 * TEK KAYNAK: hem sunucu denetimi hem arayüzün kutuyu açıp kapaması
 * buradan okuyor. Kural iki yerde yazılıyken ayrışmıştı — konağı
 * olmayan kahramanda arayüz kutuyu açık gösteriyor, sunucu kahramanı
 * sessizce almıyordu.
 *
 * @param {object} k kahraman kaydı
 * @param {string|null} slotKey seferin ÇIKTIĞI köy
 * @returns {string|null} engel anahtarı ya da null (uygun)
 */
function seferEngeli(k, slotKey = null) {
  if (!k || !k.var) return 'kahraman_yok';
  if (k.olu) return 'olu';
  const nerede = k.nerede || 'koy';
  if (nerede === 'sefer') return 'seferde';
  if (nerede === 'macera') return 'macerada';
  if (nerede === 'donuyor') return 'donuyor';
  /*
    KONAĞI YOKSA ÜSSÜ DE YOK. Kahraman kaydı duruyor (konak yıkılsa bile
    silinmiyor — bir mancınık dalgası aylarca biriken kahramanı
    sıfırlamasın) ama yürüyecek bir yeri yok.
  */
  const bulundugu = bulunduguSlot(k);
  if (!bulundugu) return 'konak_yok';
  /*
    FİİLEN BULUNDUĞU KÖYDEN ÇIKIYOR — konağının olduğu köyden değil.
    Kahraman kendi başka köyüne takviyeye gönderilebiliyor; oradan
    sefere çıkamamak onu geri çağırmaktan başka seçenek bırakmıyordu.
    Başkasının köyünde misafirken yine çıkamıyor: zaten oradan sefer
    gönderilemez, yani bu dal kendiliğinden kapalı.
  */
  if (slotKey && bulundugu !== slotKey) return 'baska_koyde';
  return null;
}

/**
 * ESKİ KAYITLARI DÜZELT.
 *
 * Kahraman sistemi geliştirilirken alanların şekli değişti: envanter
 * sözlükten DİZİYE döndü, bayılma sayacı yerini `olu` bayrağına bıraktı,
 * macera alanları sonradan eklendi. Kayıttaki eski şekil olduğu gibi
 * kullanılırsa sunucu çöküyor (`envanter.map is not a function`).
 *
 * Göç BURADA, tek yerde: her okuma noktasında ayrı ayrı savunma yazmak
 * hem tekrar hem de er geç unutulan bir yer demekti.
 */
function duzelt(k) {
  if (!k || !k.var) return k;
  if (!Array.isArray(k.envanter)) k.envanter = [];
  if (!k.kusanilan || typeof k.kusanilan !== 'object') k.kusanilan = {};
  if (typeof k.olu !== 'boolean') {
    // Eski kayıtta bayılma sayacı vardı: baygınsa artık ÖLÜ sayılıyor
    k.olu = (k.baygunKalanSaat || 0) > 0 || (k.can || 0) <= 0;
  }
  delete k.baygunKalanSaat;
  if (typeof k.olumSayisi !== 'number') k.olumSayisi = 0;
  if (typeof k.maceraSayisi !== 'number') k.maceraSayisi = 0;
  if (typeof k.maceraIlerleme !== 'number') k.maceraIlerleme = 0;
  /*
    Alan sonradan eklendi; eski kayıtlarda yok. Sıfırdan başlaması
    doğru: geçmişteki maceraları geri sayamayız ve görev zinciri yan
    hedef, yani kimsenin ilerlemesi geri gitmiyor.
  */
  if (typeof k.maceraTamamlanan !== 'number') k.maceraTamamlanan = 0;
  if (k.macera && typeof k.macera !== 'object') k.macera = null;
  if (typeof k.misafirSlot !== 'string') k.misafirSlot = k.misafirSlot || null;
  if (typeof k.donusKalanSaat !== 'number') k.donusKalanSaat = 0;
  if (!k.skiller || typeof k.skiller !== 'object') {
    k.skiller = { saldiriPuani: 0, saldiriBonus: 0, savunmaBonus: 0, uretim: 0 };
  }
  return k;
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
 * ÖLÜ KAHRAMAN HİÇBİR BONUS VERMEZ. "Biraz verse" demek, ölümü yalnız
 * bir sayı düşüşü yapardı; ölümün canı yakmalı ki kahramanı savaşa
 * sokma kararı gerçek bir risk olsun.
 *
 * CAN ORANI bonusları ölçeklemiyor — yaralı kahraman tam bonus veriyor.
 * Ölçekleseydi savaş hesabı "kahramanın canı" gibi görünmez bir değişkene
 * bağlanır, oyuncu savaş öncesi gücünü kestiremezdi.
 */
function bonuslar(k) {
  const bos = {
    saldiriGucu: 0, saldiriYuzde: 0, savunmaYuzde: 0, uretimYuzde: 0,
    zirhlanmaYuzde: 0, hiz: KAHRAMAN_TABAN_HIZ, suvari: false,
    birim: { piyade: { saldiri: 0, savunma: 0 }, suvari: { saldiri: 0, savunma: 0 } },
  };
  /*
    ÖLÜ KAHRAMAN HİÇBİR BONUS VERMEZ. "Biraz versin" demek, ölümü yalnız
    bir sayı düşüşü yapardı; ölümün canı yakmalı ki kahramanı savaşa
    sokma kararı gerçek bir risk olsun.
  */
  if (!k || !k.var || k.olu) return bos;
  const s = k.skiller || {};
  const yuzdeKap = (puan, def) =>
    Math.min(def.tavanYuzde, (puan || 0) * def.puanBasina);
  /*
    EŞYA BONUSU SKİL TAVANINA GİRMİYOR — ayrı kanal.

    Eşyanın saldırı katkısı HAM GÜÇ olarak ekleniyor, yüzde tavanına
    değil. Tavana girseydi tam yatırımlı bir kahramanda eşya hiçbir şey
    katmaz, oyuncu topladığı efsane kılıcın işe yaramadığını görürdü.
  */
  const kusam = KUSAM.kusamBonuslari(k);
  return {
    saldiriGucu: (s.saldiriPuani || 0) * SKILLER.saldiriPuani.puanBasina
      + (kusam.kahraman.saldiri || 0),
    saldiriYuzde: yuzdeKap(s.saldiriBonus, SKILLER.saldiriBonus),
    savunmaYuzde: yuzdeKap(s.savunmaBonus, SKILLER.savunmaBonus),
    uretimYuzde: yuzdeKap(s.uretim, SKILLER.uretim),
    /** Alınan hasarı azaltan yüzde — yalnız eşyadan gelir, tavana kırpılı */
    zirhlanmaYuzde: zirhlanmaYuzdesi(k),
    /** Yürüyüş hızı ve savaş sınıfı — ikisi de AT slotuna bağlı */
    hiz: hizi(k),
    suvari: suvariMi(k),
    /*
      BİRİM BONUSU — İlkan'ın özel isteği: eşya tek tek birim
      sınıflarının saldırı ve savunmasını büyütüyor. Yüzde olarak
      uygulanıyor ve ekipman havuzundan AYRI hesaplanıyor.
    */
    birim: kusam.birim,
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
  /*
    ÖLÜ KAHRAMAN ZAMANLA İYİLEŞMEZ. Kendiliğinden geri gelseydi diriltme
    bedeli bir seçenek değil, yalnız sabırsızlık vergisi olurdu.
  */
  if (k.olu) return k;
  const kusam = KUSAM.kusamBonuslari(k).kahraman;
  const kalan = oyunSaati;
  if (kalan > 0 && k.nerede === 'koy') {
    const tavan = canTavani(xpSeviyesi(k.xp), kusam.can);
    k.can = Math.min(tavan,
      (k.can || 0) + iyilesmeHizi(konakSeviyesi, kusam.iyilesme) * kalan);
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

/**
 * Hasar uygula; can biterse kahraman ÖLÜR.
 *
 * Ölüm kalıcı DEĞİL ama kendiliğinden de geçmiyor: oyuncu diriltmeli
 * (bkz. dirilt / dirilmeBedeli). Seviye ve eşya duruyor.
 */
/**
 * Hasar uygula.
 *
 * ZIRHLANMA BURADA işliyor, çağıranlarda değil: hasarın girdiği tek kapı
 * bu fonksiyon (savaş, macera, ileride başka kaynaklar). Her çağırana
 * ayrı ayrı azaltma yazmak, er geç birinde unutulacak bir tekrar olurdu.
 *
 * @returns {{oldu:boolean, can:number, hamHasar:number, uygulanan:number}}
 *   `uygulanan` raporlara yazılıyor: oyuncu zırhın işe yaradığını
 *   ancak gerçek sayıyı görerek anlar.
 */
function hasarVer(k, hasar) {
  if (!k || !k.var || k.olu) return { oldu: false, can: 0, hamHasar: 0, uygulanan: 0 };
  const ham = Math.max(0, hasar);
  const uygulanan = Math.round(ham * (1 - zirhlanmaYuzdesi(k) / 100));
  k.can = Math.max(0, (k.can || 0) - uygulanan);
  if (k.can <= 0) {
    k.olu = true;
    k.can = 0;
    k.olumSayisi = (k.olumSayisi || 0) + 1;
    /*
      Ölen kahraman ÜSSÜNE döner: cesedi seferde ya da macerada bırakmak,
      oyuncunun diriltmek için orduyu geri beklemesi demek olurdu.
      Yoldaki sefer askerlerle devam ediyor, kahraman ona dahil değil.
    */
    k.nerede = 'koy';
    k.macera = null;
    k.misafirSlot = null;
    k.donusKalanSaat = 0;
    return { oldu: true, can: 0, hamHasar: ham, uygulanan };
  }
  return { oldu: false, can: k.can, hamHasar: ham, uygulanan };
}

/**
 * KAHRAMANIN YAYA HIZI.
 *
 * Hızlı bir piyade kadar (fjordvakt 7). At kuşanınca büyüyor — hızın TEK
 * kaynağı at (bkz. heroItemDefs · hiz). Tek başına yürüyen kahraman bu
 * hızla gidiyor; orduyla giderse her zamanki gibi EN YAVAŞ birim
 * belirliyor, çünkü kahraman orduyu bekler.
 */
const KAHRAMAN_TABAN_HIZ = 7;

/**
 * AT TAKMANIN HIZ EKİ — BİRİM TANIMLARINDAN ÖLÇÜLÜYOR.
 *
 * İlkan'ın kuralı: "kahramana at verince normal birimler attan ne hız
 * bonusu alıyorsa alsın". O bonus zaten oyunda duruyor — süvarilerin
 * piyadelerden ne kadar hızlı olduğu. Burada sabit bir sayı yazsaydık
 * birim hızları dengelenirken kahraman sessizce ayrışırdı; ortalamadan
 * türetince ikisi bir arada kalıyor.
 *
 * Bugünkü değer ≈4,6: yaya kahraman 7 (hızlı bir piyade), atlı kahraman
 * ≈11,6 — demirAtli mertebesinde. Tam olarak istenen: at, kahramana
 * bir süvarinin hızını veriyor.
 *
 * Kuşatma ve göçmen SAYILMIYOR: onların yavaşlığı ata değil taşıdıkları
 * yüke bağlı, ortalamayı aşağı çekip "at" farkını olduğundan büyük
 * gösterirdi.
 */
const AT_HIZ_EKI = (() => {
  const ort = (tur) => {
    const h = Object.values(UNIT_DEFS)
      .filter(d => d.category === tur && d.stats?.hiz > 0)
      .map(d => d.stats.hiz);
    return h.length ? h.reduce((a, b) => a + b, 0) / h.length : 0;
  };
  return Math.max(0, Math.round((ort('suvari') - ort('piyade')) * 10) / 10);
})();

/**
 * HIZ TAVANI. Nadirlik bütün bonusları ölçeklediği için yığılma
 * sınırsız: bir tavan olmazsa at slotu tek başına haritayı anlamsız
 * kılar.
 *
 * 20: efsanevi Kuzey Rüzgârı'nın (≈19,5) hemen üstü — yani en iyi at
 * tavana ÇARPMIYOR, nadirliğin karşılığını sonuna kadar veriyor
 * (İlkan: "atın nadirliği daha da hızlandırsın"). Tavan yine de duruyor
 * çünkü ilerde eklenecek bir at ya da bonus onu aşabilir.
 *
 * Kahraman en hızlı birimden (kuzey izcisi, 14) hızlı olabiliyor; bu
 * YALNIZ tek başına giderken işliyor — orduyla yürürken orduyu bekliyor
 * (bkz. army.js · marchGameHours).
 */
const KAHRAMAN_HIZ_TAVANI = 20;

/**
 * Kahramanın güncel hızı.
 *
 * yaya tabanı + (at varsa AT_HIZ_EKI) + atın kendi hızı (nadirlikle
 * ölçekli), tavana kırpılı. AT_HIZ_EKI yalnız AT SLOTU DOLUYKEN
 * ekleniyor: hız zaten başka slottan gelemiyor ama kural burada da
 * açık dursun — "at yoksa yaya hızı" tek cümlede okunuyor.
 */
function hizi(k) {
  if (!k || !k.var) return KAHRAMAN_TABAN_HIZ;
  const atEki = KUSAM.suvariMi(k) ? AT_HIZ_EKI : 0;
  const esyaEki = Math.max(0, KUSAM.kusamBonuslari(k).kahraman.hiz || 0);
  return Math.round(Math.min(KAHRAMAN_HIZ_TAVANI,
    KAHRAMAN_TABAN_HIZ + atEki + esyaEki) * 10) / 10;
}

/**
 * SÜVARİ Mİ? At slotu doluysa evet — savaşta ham gücü süvari tarafına
 * yazılıyor (bkz. combat.js · kahramanSuvari).
 */
function suvariMi(k) {
  return KUSAM.suvariMi(k);
}

/**
 * ZIRHLANMA TAVANI — alınan hasar en çok bu kadar azalabilir (%).
 *
 * Tavansız olsaydı yeterince eşya yığan oyuncunun kahramanı hiç hasar
 * almaz, macera ve savaş risksizleşirdi. %50: iyi kuşanmış bir kahraman
 * iki kat dayanıklı, ölümsüz değil.
 */
const ZIRHLANMA_TAVANI = 50;

/** Kuşamdan gelen hasar azaltması (%), tavana kırpılmış */
function zirhlanmaYuzdesi(k) {
  if (!k || !k.var) return 0;
  return Math.min(ZIRHLANMA_TAVANI,
    Math.max(0, KUSAM.kusamBonuslari(k).kahraman.zirhlanma || 0));
}

/** Diriltme bedeli — seviyeyle büyüyor. */
function dirilmeBedeli(k) {
  const seviye = xpSeviyesi(k?.xp || 0);
  const out = {};
  for (const [key, taban] of Object.entries(DIRILTME_TABAN)) {
    out[key] = Math.round(taban + (DIRILTME_PER_SEVIYE[key] || 0) * (seviye - 1));
  }
  return out;
}

/**
 * DİRİLT. Bedeli ÇAĞIRAN tahsil eder (kaynak ya da iksir burada yok) —
 * bu dosya kaynakları görmüyor, karar index.js'in.
 */
function dirilt(k) {
  if (!k || !k.var) return { ok: false, sebep: 'kahraman_yok' };
  if (!k.olu) return { ok: false, sebep: 'olu_degil' };
  k.olu = false;
  const kusam = KUSAM.kusamBonuslari(k).kahraman;
  k.can = Math.max(1, Math.round(
    canTavani(xpSeviyesi(k.xp), kusam.can) * DIRILME_CAN_ORANI));
  k.nerede = 'koy';
  return { ok: true, can: k.can };
}

/**
 * KONAĞIN BİR SEVİYESİNİN GETİRDİĞİ ÜÇ ŞEY.
 *
 * Tek yerde toplanıyor ki hem "şu anki seviye" hem "bir sonraki seviye"
 * aynı hesaptan çıksın — iki ayrı yerde hesaplansaydı biri güncellenip
 * diğeri unutulurdu.
 */
function konakGetirisi(k, seviye) {
  return {
    seviye,
    iyilesme: Math.round(
      iyilesmeHizi(seviye, KUSAM.kusamBonuslari(k).kahraman.iyilesme) * 10) / 10,
    maceraTavan: MACERA.maceraTavani(seviye),
    maceraSaat: Math.round(MACERA.maceraSaati(seviye) * 10) / 10,
  };
}

/** İstemciye gidecek özet. */
function ozet(k, konakSeviyesi = 0) {
  if (!k || !k.var) return { var: false };
  const ilerleme = seviyeIlerlemesi(k.xp || 0);
  return {
    var: true,
    usSlot: k.usSlot || null,
    /*
      MİSAFİR SLOTU DA GİDİYOR: arayüz "kahraman şu an hangi köyde"
      sorusunu ancak ikisini birlikte görerek cevaplayabiliyor.
    */
    misafirSlot: k.misafirSlot || null,
    bulunduguSlot: bulunduguSlot(k),
    xp: Math.round(k.xp || 0),
    seviye: ilerleme.seviye,
    xpSimdiki: Math.round(ilerleme.simdiki),
    xpGereken: Math.round(ilerleme.gereken),
    can: Math.round(k.can || 0),
    canTavan: canTavani(ilerleme.seviye, KUSAM.kusamBonuslari(k).kahraman.can),
    olu: !!k.olu,
    olumSayisi: k.olumSayisi || 0,
    hiz: hizi(k),
    suvari: suvariMi(k),
    dirilmeBedeli: dirilmeBedeli(k),
    iyilesmeSaatlik: Math.round(
      iyilesmeHizi(konakSeviyesi, KUSAM.kusamBonuslari(k).kahraman.iyilesme) * 10) / 10,
    skiller: { ...k.skiller },
    harcanmamisPuan: k.harcanmamisPuan || 0,
    sifirlamaBedeli: sifirlamaBedeli(k),
    bonuslar: bonuslar(k),
    nerede: k.nerede || 'koy',
    kusanilan: KUSAM.kusanilanOzeti(k),
    envanter: KUSAM.envanterOzeti(k),
    kusamBonuslari: KUSAM.kusamBonuslari(k),
    slotlar: KUSAM.HERO_SLOTS,
    /*
      MACERA DURUMU. `maceraKalanSaat` OYUN SAATİ — istemci bunu dünya
      hızına göre gerçek süreye çeviriyor. Gerçek saniye yollasaydık hız
      değişince ekrandaki geri sayım yanlış kalırdı.
    */
    /*
      KONAK SEVİYESİ VE BİR SONRAKİNİN GETİRİSİ.

      İlkan sordu: "kahraman binasını artırmak ne işe yarıyor?" — üç şey
      veriyordu (iyileşme hızı, macera tavanı, macera birikme hızı) ama
      ÜÇÜ DE hiçbir ekranda yazmıyordu. Yükseltmenin karşılığı
      görünmüyorsa oyuncu o binayı yükseltmez.

      Sonraki seviye de gönderiliyor: "şu an ne veriyor" tek başına
      "yükseltsem ne olur" sorusunu cevaplamıyor.
    */
    konakSeviye: konakSeviyesi,
    konakGetirisi: konakGetirisi(k, konakSeviyesi),
    konakSonraki: konakSeviyesi > 0 ? konakGetirisi(k, konakSeviyesi + 1) : null,
    maceraSayisi: k.maceraSayisi || 0,
    maceraTavan: MACERA.maceraTavani(konakSeviyesi),
    maceraIlerleme: Math.round((k.maceraIlerleme || 0) * 100) / 100,
    maceraGereken: MACERA.maceraSaati(konakSeviyesi),
    macera: k.macera
      ? { tip: k.macera.tip, kalanSaat: Math.round((k.macera.kalanSaat || 0) * 100) / 100 }
      : null,
    misafirSlot: k.misafirSlot || null,
    donusKalanSaat: Math.round((k.donusKalanSaat || 0) * 100) / 100,
    maceraTipleri: MACERA.MACERA_TIPLERI,
    maceraCanEsigi: MACERA.MACERA_CAN_ESIGI,
    /*
      MACERADA BEKLENEN GERÇEK HASAR — tanımdaki ham sayı değil.

      Saldırı gücü macerada hasarı azaltıyor (bkz. macera.js ·
      gucAzaltmasi) ve kuşamdaki zırhlanma da üstüne biniyor. Ekranda
      ham sayıyı göstermek, oyuncuya yatırımının karşılığını gizlemek
      olurdu: "−32 can" yazarken gerçekte 12 kaybediyorsa hangi
      maceraya çıkacağını yanlış hesaplar.
    */
    maceraHasari: Object.fromEntries(
      Object.keys(MACERA.MACERA_TIPLERI).map(tip => [tip,
        Math.round(MACERA.maceraCanKaybi(tip, bonuslar(k).saldiriGucu)
          * (1 - zirhlanmaYuzdesi(k) / 100))])),
    maceraGucAzaltma: Math.round(
      MACERA.gucAzaltmasi(bonuslar(k).saldiriGucu) * 10) / 10,
    /*
      MACERANIN GERÇEK SÜRESİ — tanımdaki ham saat değil.

      Süre kahramanın hızıyla kısalıyor (bkz. macera.js · maceraSuresi).
      Ekranda ham saati gösterseydik atına yatırım yapan oyuncu
      karşılığını hiçbir yerde göremez, "6 saat" yazan bir maceranın 3
      saatte bittiğini ancak tesadüfen fark ederdi.
    */
    maceraSaatleri: Object.fromEntries(
      Object.keys(MACERA.MACERA_TIPLERI).map(tip => [tip,
        MACERA.maceraSuresi(tip, hizi(k), KAHRAMAN_TABAN_HIZ,
          KUSAM.kusamBonuslari(k).kahraman.maceraHizi || 0)])),
  };
}

module.exports = {
  SKILLER, SKIL_ANAHTARLARI, PUAN_PER_SEVIYE, SKIL_PUAN_TAVANI,
  EN_YUKSEK_SEVIYE, CAN_TABAN, CAN_PER_SEVIYE,
  DIRILTME_TABAN, DIRILTME_PER_SEVIYE, DIRILME_CAN_ORANI,
  dirilmeBedeli, dirilt,
  SIFIRLAMA_TABAN, SIFIRLAMA_CARPANI, duzelt,
  ZIRHLANMA_TAVANI, zirhlanmaYuzdesi,
  KAHRAMAN_TABAN_HIZ, KAHRAMAN_HIZ_TAVANI, AT_HIZ_EKI, hizi, suvariMi,
  bulunduguSlot, seferEngeli,
  XP_OLDURULEN_BASINA, SAVAS_HASAR_TAVANI, savasSonucu,
  seviyeIcinToplamXp, xpSeviyesi, seviyeIlerlemesi,
  canTavani, iyilesmeHizi,
  yeniKahraman, xpEkle, puanDagit, sifirlamaBedeli, skilleriSifirla,
  bonuslar, ilerlet, hasarVer, ozet,
};
