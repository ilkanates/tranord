/**
 * npcSavas — NPC'ler birbirine saldırırken HEDEFİ kim seçiyor.
 *
 * İlkan: *"NPC'ler saldırsınlar, yapay zekâ gibi yapılsınlar."* Bugüne
 * kadar NPC yalnız OYUNCUYA saldırıyordu; aralarındaki dünya donuktu.
 *
 * KARAR BURADA, BAĞLANTI index.js'te. Kural orada kalsaydı doğruluğunu
 * ancak sunucuyu 100 dakika (bir AI turu) izleyerek görebilirdim; burada
 * saniyede sınanıyor. Bu dosyada ağ, oturum, sefer yok — yalnız "kime
 * saldırmalı" sorusunun cevabı.
 *
 * ── DÖRT SINIR ─────────────────────────────────────────────────────
 *
 * Kodun eski notu *"NPC-NPC savaşı dengelenmiş ekonomiyi bozar"* diyordu
 * ve endişe haklıydı. Çözüm savaşı hiç yapmamak değil, sınırlarını
 * koymak:
 *
 * 1) KENDİNDEN ZAYIFA. Güçlü köyler büyür, zayıflar baskı altında kalır
 *    — dünyada bir hiyerarşi oluşur. Rastgele hedef, güçlü bir köyün
 *    kendinden güçlüsüne koşup ordusunu eritmesi demekti.
 *
 * 2) EZİLMİŞ KÖY FARM OLMAZ. Ordusu eşiğin altına inmiş köye saldırı
 *    yok. Aksi hâlde güçlü NPC zayıf komşusunu sonsuza kadar yağmalar,
 *    o köy bir daha toparlanamaz ve dünya zamanla BOŞALIRDI. Bu,
 *    aşamanın en kritik sınırı.
 *
 * 3) AYNI KÖY ARKA ARKAYA VURULMAZ — hedef başına bekleme süresi.
 *
 * 4) YAKIN KOMŞU. Köyler komşularıyla uğraşır, haritanın öbür ucuyla
 *    değil; ayrıca dünya çapında hedef aramak 700×700 karşılaştırma
 *    demekti.
 */

/** Hedefin en az bu kadar ordusu olmalı — ezilmiş köy farm olmasın */
const MIN_SAVUNMA = 15;
/** Komşu araması bu yarıçapta */
const MESAFE = 14;
/** Aynı köye iki saldırı arası en az bu kadar OYUN SAATİ */
const HEDEF_BEKLEME_SAAT = 20;

/**
 * SALDIRILACAK KÖYÜ SEÇ — yoksa null.
 *
 * @param {object} saldiran        { key, slot, ordu }
 * @param {Iterable} adaylar       [{ key, slot, ordu }]
 * @param {number} gonderilecek    saldıranın yollayacağı asker sayısı
 * @param {function} sonSaldiri    key → en son saldırı zamanı (ms)
 * @param {object} opt             { now, beklemeMs, mesafe, minSavunma }
 */
function hedefSec(saldiran, adaylar, gonderilecek, sonSaldiri, opt = {}) {
  const {
    now = Date.now(),
    beklemeMs = HEDEF_BEKLEME_SAAT * 3600 * 1000,
    mesafe = MESAFE,
    minSavunma = MIN_SAVUNMA,
    uzaklik,
  } = opt;

  if (!(gonderilecek > 0)) return null;

  let best = null;
  for (const aday of adaylar) {
    if (!aday || aday.key === saldiran.key) continue;

    const dist = uzaklik(saldiran.slot, aday.slot);
    if (dist > mesafe) continue;
    /* En yakını arıyoruz: daha uzağı denemeye gerek yok */
    if (best && dist >= best.dist) continue;

    /* Ezilmiş köy farm olmasın — dünyanın boşalmasını engelleyen sınır */
    if (aday.ordu < minSavunma) continue;
    /* Kendinden güçlüsüne koşup ordusunu eritmesin */
    if (aday.ordu >= gonderilecek) continue;
    /* Aynı köy arka arkaya vurulmasın */
    if (now - (sonSaldiri(aday.key) || 0) < beklemeMs) continue;

    best = { key: aday.key, slot: aday.slot, dist, ordu: aday.ordu };
  }
  return best;
}

module.exports = { hedefSec, MIN_SAVUNMA, MESAFE, HEDEF_BEKLEME_SAAT };
