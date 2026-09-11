/**
 * PAYLAŞILAN SABİTLER.
 *
 * server/index.js'ten AYNEN taşındı. Hepsinin ortak yanı iki ayrı yerden
 * okunuyor olmaları (komut işleyicileri + istemciye giden paket), yani
 * index.js'te kalsalardı paket modülü giriş noktasını require etmek
 * zorunda kalırdı — döngüsel bağımlılık.
 */

const DEFAULT_TICK_MS = 1000;

/**
 * En küçük tick aralığı = en yüksek hız. 1000/7,8125 = 128× (üst bardaki
 * çubuğun son kademesi). Eskiden 100 ms idi ve çubuk 10×'te sessizce
 * kırpılıyordu: 16×, 32×, 128× yazıyor ama hepsi 10× koşuyordu.
 */
const MIN_TICK_MS     = 7;

const MAX_TICK_MS     = 10000;

/**
 * YAPISAL PARMAK İZİ — köyde kaynak dışında bir şey değişti mi?
 *
 * Sunucu eskiden her tick'te (saniyede bir, hızlı ölçekte 100 ms'de bir) köyün
 * TAMAMINI yolluyordu: oyuncu başına ~10 KB/s, 100 oyuncuda saatte 3.6 GB.
 * Oysa tick'ten tick'e değişen tek şey genelde kaynak miktarı ve istemci onu
 * zaten saatlik oranlardan kendisi hesaplayabiliyor. Bu yüzden yayın artık
 * yapısal bir değişiklikte ya da FULL_SYNC_MS'lik kalp atışında yapılıyor.
 */
const FULL_SYNC_MS = 30000;

// ═══════════════════════════════════════════════════════════════════
//  SEFERLER — ordu gönderme, varış, çarpışma, dönüş
//
//  Zaman: seferler Date.now() ile ilerler, köy saatiyle DEĞİL (gerekçe
//  game/army.js başında). Bu yüzden set_speed sefer süresini kısaltmaz.
// ═══════════════════════════════════════════════════════════════════
const MAX_MARCHES_PER_TOWN  = 8;     // aynı anda yolda olabilecek sefer sayısı

/**
 * BAŞLANGIÇ KORUMASI: oyuncu askerî sisteme girene kadar NPC saldırmaz.
 * Ölçüt ordusunun 20'ye ulaşması VEYA ilk seferini göndermesi — ikisi de
 * "oyuncu artık savaşın içinde" demek. Aksi hâlde 5. kademe bir komşu,
 * oyuncu tek asker eğitmeden köyü boşaltabilirdi.
 */
const PROTECT_MIN_ARMY = 20;

module.exports = {
  DEFAULT_TICK_MS, MIN_TICK_MS, MAX_TICK_MS,
  FULL_SYNC_MS, MAX_MARCHES_PER_TOWN, PROTECT_MIN_ARMY,
};
