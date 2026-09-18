/**
 * npcYagma — NPC oyuncuya saldırırken HEDEFİ kim seçiyor ve NE SIKLIKTA.
 *
 * İlkan: *"NPC'ler bize de saldırsın, oyunculara yani."*
 *
 * KARAR BURADA, BAĞLANTI index.js'te — `npcSavas.js` ile aynı sebep:
 * kural orada kalsaydı doğruluğunu ancak sunucuyu bir AI turu (canlıda
 * 30 dakika) izleyerek görebilirdim; burada saniyede sınanıyor.
 *
 * ── DÜZELTİLEN ÖLÇEKLEME HATASI ────────────────────────────────────
 *
 * Bekleme süresi KÜRESEL tek bir sayaçtı: `lastNpcRaidAt`. Yani bütün
 * dünyada 6 oyun saatinde BİR yağma oluyordu — kaç oyuncu olursa olsun.
 * Sonucu şu:
 *
 *     22 oyuncu  → oyuncu başına günde ~1,5 yağma
 *    220 oyuncu  → oyuncu başına günde ~0,15 yağma
 *
 * Yani oyun büyüdükçe dünya SESSİZLEŞİYOR. Hata görünmez cinsten: kimse
 * "bugün az saldırı geldi" diye bildirmez, oyun sadece yavaşça ölür.
 * Bekleme artık OYUNCU BAŞINA; dünyanın toplam saldırı hızı oyuncu
 * sayısıyla birlikte büyüyor, her oyuncunun gördüğü sıklık sabit kalıyor.
 *
 * ── ÜÇ SINIR ───────────────────────────────────────────────────────
 *
 * 1) YAKIN KOMŞU. Uzaktaki NPC oyuncuyu görmez; ayrıca dünya çapında
 *    hedef aramak 700 × oyuncu karşılaştırma demekti.
 *
 * 2) AYNI OYUNCU ARKA ARKAYA VURULMAZ. Bekleme oyuncu başına; iki NPC
 *    aynı anda aynı köye koşmuyor.
 *
 * 3) SALDIRIYA AÇIK OLMAYAN ATLANIR. Acemi kalkanı ve "hiç ordusu yok"
 *    kuralı çağıranda (`playerRaidable`), çünkü oturum ve köy durumu
 *    orada; buraya yalnız sonucu geliyor.
 */

/** Aynı OYUNCUYA gelen iki yağma arası en az bu kadar OYUN SAATİ */
const OYUNCU_BEKLEME_SAAT = 6;
/** Bu mesafeden uzaktaki NPC oyuncuyu görmez (hex) */
const MESAFE = 18;
/** Bundan az ordusu olan NPC sefer açmaz */
const MIN_ORDU = 25;
/** Ordusunun en çok bu kadarını yollar — köyü savunmasız kalmasın */
const GONDERME_ORANI = 0.4;

/**
 * SALDIRILACAK OYUNCU KÖYÜNÜ SEÇ — yoksa null.
 *
 * @param {object}   saldiran    { slot }
 * @param {Iterable} adaylar     [{ key, slot, userId, ad }] — saldırıya AÇIK olanlar
 * @param {function} sonSaldiri  userId → o oyuncuya en son saldırı zamanı (ms)
 * @param {object}   opt         { now, beklemeMs, mesafe, uzaklik }
 */
function hedefSec(saldiran, adaylar, sonSaldiri, opt = {}) {
  const {
    now = Date.now(),
    beklemeMs = OYUNCU_BEKLEME_SAAT * 3600 * 1000,
    mesafe = MESAFE,
    uzaklik,
  } = opt;

  let best = null;
  for (const aday of adaylar) {
    if (!aday || !aday.slot) continue;

    const dist = uzaklik(saldiran.slot, aday.slot);
    if (dist > mesafe) continue;
    /* En yakını arıyoruz: daha uzağı denemeye gerek yok */
    if (best && dist >= best.dist) continue;

    /*
      BEKLEME OYUNCU BAŞINA — küresel değil. Küresel sayaç, oyuncu
      sayısı arttıkça dünyayı sessizleştiriyordu (bkz. dosya başı).
    */
    if (now - (sonSaldiri(aday.userId) || 0) < beklemeMs) continue;

    best = { key: aday.key, slot: aday.slot, userId: aday.userId, ad: aday.ad, dist };
  }
  return best;
}

module.exports = {
  hedefSec,
  OYUNCU_BEKLEME_SAAT, MESAFE, MIN_ORDU, GONDERME_ORANI,
};
