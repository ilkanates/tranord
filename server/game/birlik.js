/**
 * BİRLİK (ittifak) — SAF KURALLAR.
 *
 * İlkan'ın tarifi: *"elçilik kuran kişiler birlik oluşturabilir, birliğin
 * adını ve amblemini seçer, sonra birliğe oyuncu davet eder... kurucu
 * birliğe adam alabilir çıkartabilir, 2 yetkili alt yönetici seçilebilir.
 * buradaki kral ve alt yöneticilerini Nord mitolojisine göre ayarla,
 * yarl vs gibi terimler kullan."*
 *
 * RÜTBELER İSKANDİNAV TOPLUM DÜZENİNDEN. Rígsþula'da üç sınıf var:
 * **Jarl** (soylu), **Karl** (hür adam), Þræll (köle). Üstlerinde de
 * **Konungr** (kral) duruyor. Þræll'i almadık — oyuncu köle değil; kalan
 * üçü rütbe merdivenini olduğu gibi veriyor:
 *
 *     Konung  →  kurucu, tek kişi
 *     Jarl    →  en fazla iki alt yönetici
 *     Karl    →  hür adam, sıradan üye
 *
 * Bu dosya VERİTABANI GÖRMÜYOR ve oturum bilmiyor: yalnız "kim ne
 * yapabilir", "ad geçerli mi", "kaç üye sığar" sorularını cevaplıyor.
 * Böylece kurallar hem sunucu olaylarından hem testten aynı şekilde
 * okunuyor ve iki ayrı yerde ayrışamıyor (asker yemi muhasebesinde tam
 * olarak o ayrışma yaşandı).
 */

// ── Rütbeler ───────────────────────────────────────────────────────

const RUTBELER = {
  konung: {
    ad: 'Konung',
    aciklama: 'Birliğin kurucusu ve kralı. Üye alır, atar, Jarl seçer, '
      + 'birliği dağıtır. Tek kişidir.',
    sira: 0,
  },
  jarl: {
    ad: 'Jarl',
    aciklama: 'Konung\'un yanındaki yönetici. Davet gönderebilir ve Karl '
      + 'atabilir; Jarl atamaz, birliği dağıtamaz.',
    sira: 1,
  },
  karl: {
    ad: 'Karl',
    aciklama: 'Birliğin hür adamı. Birliğin gücüne katılır, yönetime '
      + 'karışmaz.',
    sira: 2,
  },
};

const RUTBE_SIRA = Object.keys(RUTBELER).sort(
  (a, b) => RUTBELER[a].sira - RUTBELER[b].sira);

/**
 * JARL TAVANI İKİ (İlkan'ın kararı: *"2 yetkili alt yönetici
 * seçilebilir"*).
 *
 * Sayı sabit ve küçük: yetkiyi herkese dağıtmak "kim davet etti, kim
 * attı" sorusunu cevapsız bırakır ve birlik içi kavganın kaynağı olur.
 */
const JARL_TAVANI = 2;

/**
 * ÜYE TAVANI ELÇİLİK SEVİYESİNDEN — seviye başına üç üye.
 *
 * Ölçüt KONUNG'UN en yüksek elçiliği: birliği büyütmek kurucunun
 * yatırımına bağlı olmalı. Bütün üyelerin elçiliklerini toplasaydık
 * birlik kendi kendini büyütürdü (her yeni üye tavanı da açar), yani
 * tavan diye bir şey kalmazdı.
 */
const UYE_PER_ELCILIK_SEVIYESI = 3;

function uyeTavani(elcilikSeviyesi = 0) {
  const lv = Math.max(0, Math.floor(Number(elcilikSeviyesi) || 0));
  return lv * UYE_PER_ELCILIK_SEVIYESI;
}

// ── Yetkiler ───────────────────────────────────────────────────────

/**
 * Bir rütbenin yapabilecekleri. Tek kaynak: soket olayları da, arayüzün
 * düğme açıp kapaması da buradan okuyor.
 */
function yetkiler(rutbe) {
  const konung = rutbe === 'konung';
  const jarl = rutbe === 'jarl';
  return {
    davetEder: konung || jarl,
    davetIptal: konung || jarl,
    uyeAtar: konung || jarl,
    jarlSecer: konung,
    dagitir: konung,
    adDegistirir: konung,
    /*
      KONUNG AYRILAMAZ. Önce ya Konung'luğu devretmeli ya birliği
      dağıtmalı; yoksa birlik kralsız kalır ve bir daha kimse davet
      gönderemez, kimse atamaz — kimsenin çözemediği ölü bir kayıt.
    */
    ayrilir: !konung,
  };
}

/**
 * X, Y'yi birlikten atabilir mi?
 *
 * Konung herkesi atar. Jarl yalnız KARL atar — Jarl'ın Jarl atmasına
 * izin verseydik iki yönetici birbirini atmaya çalışır, sonucu kimin
 * daha hızlı tıkladığı belirlerdi.
 */
function atabilirMi(atanRutbe, hedefRutbe) {
  if (hedefRutbe === 'konung') return false;     // Konung atılamaz
  if (atanRutbe === 'konung') return true;
  if (atanRutbe === 'jarl') return hedefRutbe === 'karl';
  return false;
}

// ── Ad ve amblem ───────────────────────────────────────────────────

const AD_EN_AZ = 3;
const AD_EN_COK = 24;

/**
 * Birlik adı — oyuncu adından DAHA GEVŞEK, bilerek.
 *
 * Oyuncu adı tek kelime ve dar bir alfabe (bkz. adKurallari.js) çünkü
 * raporlarda, haritada ve sıralamada geçiyor. Birlik adı bir SANCAK
 * adı: "Kuzey Kurtları" gibi boşluklu olabilmeli. Yine de görünmez
 * karakter, uç boşluk ve kontrol karakteri geçmiyor.
 */
function adDogrula(ham) {
  /*
    GÖRÜNMEZ KARAKTER SÜZGECİ — regex yerine KOD NOKTASI ile.

    Kontrol karakterleri, sıfır genişlikli birleştiriciler ve yön
    işaretleri ad alanında görünmez ama iki farklı adı aynı
    gösterebiliyor; benzersizlik denetimini böyle atlatmak mümkün.
    Aralıkları regex kaçışıyla yazmak yerine sayıyla eliyoruz:
    kaçış dizisi dosyaya yanlış yazıldığında sessizce bozuk bir
    karakter sınıfına dönüşüyor.
  */
  const gorunmez = (cp) => cp < 0x20 || cp === 0x7f
    || (cp >= 0x200b && cp <= 0x200f) || cp === 0x2028 || cp === 0x2029
    || cp === 0xfeff;
  const ad = [...String(ham ?? '')]
    .filter((ch) => !gorunmez(ch.codePointAt(0)))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (ad.length < AD_EN_AZ) return { hata: `En az ${AD_EN_AZ} karakter olmalı` };
  if (ad.length > AD_EN_COK) return { hata: `En fazla ${AD_EN_COK} karakter olabilir` };
  if (!/[\p{L}\p{N}]/u.test(ad)) return { hata: 'En az bir harf ya da rakam içermeli' };
  return { ad };
}

/**
 * AMBLEMLER — hepsi zaten çizili ikonlar.
 *
 * Yeni görsel üretmiyoruz: birlik kurmak yeni bir sanat işine
 * bağlanırsa özellik sanat bitene kadar oyuna giremez. Liste bilerek
 * kısa ve ayırt edilebilir; haritada küçük çizildiğinde birbirine
 * karışan ikonlar (depo türleri gibi) dışarıda.
 */
const AMBLEMLER = [
  'kilic', 'kalkan', 'kilicKalkan', 'mizrak', 'zirh', 'at',
  'sur', 'saray', 'runSalonu', 'savas', 'solen', 'koy',
];

function amblemGecerli(a) {
  return AMBLEMLER.includes(String(a || ''));
}

// ── Kuruluş ve katılım denetimleri ─────────────────────────────────

/**
 * ELÇİLİK ŞART. İlkan: *"elçilik kuran kişiler birlik oluşturabilir."*
 * Seviye 1 yetiyor — kurmak için eşik, büyümek için seviye.
 */
const ELCILIK_TIPI = 'elcilik';

function kurabilirMi({ elcilikSeviyesi = 0, mevcutBirlikId = null } = {}) {
  if (mevcutBirlikId) return { ok: false, sebep: 'zaten_birlikte' };
  if (!(elcilikSeviyesi >= 1)) return { ok: false, sebep: 'elcilik_yok' };
  return { ok: true };
}

/**
 * Bir oyuncu bu birliğe KATILABİLİR mi?
 *
 * Tavan davet ANINDA değil KATILMA anında da bakılıyor: davet
 * gönderildikten sonra birlik dolabilir, o davetin geçerliliği
 * kabul edildiği andaki duruma göre belirlenmeli.
 */
function katilabilirMi({ uyeSayisi = 0, tavan = 0, mevcutBirlikId = null } = {}) {
  if (mevcutBirlikId) return { ok: false, sebep: 'zaten_birlikte' };
  if (uyeSayisi >= tavan) return { ok: false, sebep: 'birlik_dolu' };
  return { ok: true };
}

/**
 * Jarl sayısı tavanı aşıyor mu? (terfi denetimi)
 */
function jarlSecilebilirMi(mevcutJarlSayisi = 0) {
  return mevcutJarlSayisi < JARL_TAVANI;
}

/**
 * BİRLİK ÜYESİNE SALDIRI SERBEST (İlkan'ın kararı).
 *
 * Bu fonksiyon bilerek `true` döndüren tek satır: kuralın KODDA bir
 * yeri olsun, ileride "acaba yasak mıydı" diye kimse aramasın. Yasak
 * konacaksa tek yer burası.
 *
 * Gerekçe İlkan'ın: birlik bir askerî anlaşma değil, bir kimlik ve
 * iletişim çatısı. Saldırıyı yasaklamak birliği aynı zamanda bir
 * saldırmazlık paktına çevirirdi ve oyuncular birliği yalnız o yüzden
 * kurardı.
 */
function birlikIciSaldiriSerbest() {
  return true;
}

module.exports = {
  RUTBELER, RUTBE_SIRA, JARL_TAVANI, UYE_PER_ELCILIK_SEVIYESI,
  AMBLEMLER, AD_EN_AZ, AD_EN_COK, ELCILIK_TIPI,
  uyeTavani, yetkiler, atabilirMi, adDogrula, amblemGecerli,
  kurabilirMi, katilabilirMi, jarlSecilebilirMi, birlikIciSaldiriSerbest,
};
