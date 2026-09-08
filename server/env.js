/**
 * ORTAM TESPİTİ — tek kaynak.
 *
 * "Üretim mi?" sorusunu iki dosya (index.js ve auth.js) soruyor ve cevabın
 * ikisinde aynı olması gerekiyor: JWT anahtarı zorunluluğu ve CORS listesi
 * buna bakıyor.
 *
 * Eskiden ölçüt `NODE_ENV === 'production' || DATABASE_URL var` idi. Bu ölçüt
 * geliştirme makinesinde yanlış cevap veriyor: makinede başka bir iş için
 * tanımlı global bir DATABASE_URL (ya da NODE_ENV) yüzünden yerel sunucu
 * kendini üretim sanıyor, CORS listesi boşalıyor ve dev-login sayfası
 * "sunucuya ulaşılamadı" diyor — sunucu ayakta olduğu hâlde.
 *
 * Bu yüzden dev giriş noktası (index.dev.js) kendini AÇIKÇA bildiriyor:
 * TRANORD_DEV=1. Railway/Vercel bu değişkeni asla tanımlamaz, dolayısıyla
 * üretim tarafındaki sıkılık aynen duruyor.
 */
const IS_DEV_ENTRY = process.env.TRANORD_DEV === '1';
const IS_PROD = !IS_DEV_ENTRY
  && (process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL);

/** Boot log'unda "neden" yazabilmek için — sessiz yanlış teşhisi önler. */
function envReason() {
  return `NODE_ENV=${process.env.NODE_ENV || '(yok)'}`
    + ` · DATABASE_URL=${process.env.DATABASE_URL ? 'var' : 'yok'}`
    + ` · TRANORD_DEV=${process.env.TRANORD_DEV || '0'}`;
}

module.exports = { IS_PROD, IS_DEV_ENTRY, envReason };
