/**
 * EŞYANIN GÜMÜŞ DEĞERİ — taban fiyat ve yükseltme bedeli.
 *
 * Tek dosya, çünkü aynı sayı ÜÇ yerde okunuyor: açık artırmanın taban
 * fiyatı, kimse teklif vermezse NPC'nin ödediği bedel ve eşya
 * yükseltmenin maliyeti. Üçünü ayrı yazsaydık biri düzeltilince
 * diğerleri eskirdi — bu projede defalarca oldu.
 *
 * ── DEĞER NADİRLİKTEN TÜRETİLİYOR, ELLE YAZILMIYOR ─────────────────
 *
 * Taban = BIRIM × (nadirlik çarpanı)². KARE, çünkü nadirlik iki ayrı
 * eksende birden değerli: eşyanın ETKİSİ çarpanla büyüyor (bkz.
 * kusam.js · olcekle) ve eşyanın KENDİSİ çarpanla seyrekleşiyor (bkz.
 * heroItemDefs · dusmeAgirligi — sıradan 56, efsanevi 1,2). Doğrusal
 * fiyat efsanevi eşyayı gülünç ucuz yapardı: 47 kat daha seyrek bir şey
 * 3,6 katı fiyata satılırdı.
 *
 *   sıradan  ×1,00² =  40
 *   ustaişi  ×1,50² =  90
 *   nadir    ×2,10² = 176
 *   epik     ×2,80² = 314
 *   efsanevi ×3,60² = 518
 *
 * SLOTA GÖRE FİYAT YOK. Kılıcı kalkandan pahalı yapmak dokuz slot için
 * dokuz denge kararı demek; nadirlik zaten oyunun değer ekseni ve
 * oyuncu onu renginden okuyor. Slot farkı istenirse buraya tek çarpan
 * olarak girer.
 */
const { HERO_ITEMS, NADIRLIK } = require('../data/heroItemDefs');

/** Sıradan eşyanın taban fiyatı — bütün ölçek bu sayıdan çıkıyor */
const BIRIM = 40;

/** Eşyanın yükseltilebileceği en üst seviye (İlkan: "5 lvl arttırılabilecek") */
const MAKS_SEVIYE = 5;

/**
 * SEVİYE BAŞINA ARTIŞ — her seviye taban etkinin %20'si, TOPLANARAK.
 *
 * Lvl 5 eşya taban etkinin 1,8 katını veriyor. Katlanan artış
 * (×1,2^4 = 2,07) yakın bir sayı verirdi ama sıradan bir eşyanın
 * Lvl 5'ini efsanevinin Lvl 1'ine yaklaştırırdı; toplamalı artış
 * nadirliğin üstünlüğünü her seviyede koruyor:
 *
 *   sıradan Lvl 5 = 1,00 × 1,8 = 1,80
 *   efsanevi Lvl 1 = 3,60        → nadirlik hâlâ kazanıyor
 *
 * Nadirlik anlamını kaybetseydi açık artırmanın da anlamı kalmazdı:
 * herkes en ucuz eşyayı alıp yükseltirdi.
 */
const SEVIYE_ARTIS = 0.20;

/** Bir eşyanın seviyesi — kayıtta yoksa 1 (eski eşyalar) */
function seviye(giris) {
  const n = Math.floor(Number(giris?.seviye));
  return Number.isFinite(n) && n >= 1 ? Math.min(MAKS_SEVIYE, n) : 1;
}

/** Eşyanın bonuslarına uygulanan seviye çarpanı */
function seviyeCarpani(giris) {
  return 1 + (seviye(giris) - 1) * SEVIYE_ARTIS;
}

/**
 * TABAN FİYAT — nadirlikten ve seviyeden.
 *
 * Yükseltilmiş eşya daha pahalı: aksi hâlde oyuncu yükselttiği eşyayı
 * yatırdığı gümüşün altında satmak zorunda kalır, yükseltme tek yönlü
 * bir kayıp olurdu. Fiyat çarpanı ETKİ çarpanıyla AYNI — eşya ne kadar
 * güçlendiyse o kadar değerli.
 */
function tabanFiyat(giris) {
  const n = NADIRLIK[giris?.nadirlik];
  if (!HERO_ITEMS[giris?.key] || !n) return 0;
  return Math.round(BIRIM * n.carpan * n.carpan * seviyeCarpani(giris));
}

/**
 * YÜKSELTME BEDELİ — mevcut seviyeden bir üstüne.
 *
 * Bedel EŞYANIN KENDİ DEĞERİNDEN türetiliyor (taban fiyatın %60'ı):
 * efsanevi bir eşyayı yükseltmek sıradan birini yükseltmekten pahalı
 * olmalı, yoksa herkes en güçlü eşyasını beş seviye birden çıkarır ve
 * gümüşün tek anlamlı harcama yeri o olurdu.
 *
 * Seviye arttıkça bedel de artıyor çünkü taban fiyat seviyeyle büyüyor
 * — ayrı bir "seviye zammı" katsayısı eklemeye gerek yok, iki yerden
 * hesaplanan bir sayı olurdu.
 *
 * @returns {number} gümüş; eşya en üst seviyedeyse 0
 */
function yukseltmeBedeli(giris) {
  if (seviye(giris) >= MAKS_SEVIYE) return 0;
  return Math.round(tabanFiyat(giris) * 0.6);
}

/** Yükseltilebilir mi — tek cümle, hem sunucu hem istemci buna bakıyor */
function yukseltilebilirMi(giris) {
  if (!HERO_ITEMS[giris?.key] || !NADIRLIK[giris?.nadirlik]) return 'esya_yok';
  /* İksir gibi kuşanılmayan eşyanın seviyesi olmaz — bonusu yok ki büyüsün */
  if (!HERO_ITEMS[giris.key].slot) return 'kusanilmaz';
  if (seviye(giris) >= MAKS_SEVIYE) return 'en_ust_seviye';
  return null;
}

module.exports = {
  BIRIM, MAKS_SEVIYE, SEVIYE_ARTIS,
  seviye, seviyeCarpani, tabanFiyat, yukseltmeBedeli, yukseltilebilirMi,
};
