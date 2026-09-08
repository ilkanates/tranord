/**
 * OYUN ZAMANI — tek çevirici.
 *
 * SORUN NEYDİ: tanım dosyalarındaki süreler "saat" adı taşıyordu ama kod onları
 * doğrudan SANİYE olarak kullanıyordu; ayrıca her tick bir oyun saati işliyordu.
 * Sonuç: 1 gerçek saniye = 1 oyun saati, yani Travian 1×'in 3600 katı hız.
 *
 * ŞİMDİ: tek sabit — bir oyun saatinin kaç GERÇEK saniye sürdüğü.
 *   TRANORD_HOUR_SECONDS=3600  → Travian 1× (öntanımlı)
 *   TRANORD_HOUR_SECONDS=60    → 60× hızlı sunucu (geliştirirken test için)
 * Ortam değişkeniyle verilir, kod değiştirmeye gerek yok.
 *
 * BİRİM SÖZLEŞMESİ (bundan sonra her yerde geçerli):
 *   • Üretim/işleme/tüketim oranları  → SAAT başına  (odun/saat, ekmek/saat)
 *   • Ekipman `productionHours`       → oyun SAATİ
 *   • Tarla `sureSaat`, bina `buildBaseWork`, birim eğitimi → oyun DAKİKASI
 *     (bu sayılar Travian'ın dakika cetveline oturuyor: tarla lvl1→2 = 5 dk)
 *   • Sanal saat `village.clockMs`    → 1 oyun saati = 1000 birim
 *
 * Sanal saatin birimi (1000/saat) DEĞİŞMEDİ; eski kayıtlardaki mutlak zaman
 * damgaları bu yüzden geçerli kalıyor.
 */

const CLOCK_PER_GAME_HOUR = 1000;          // sanal saat birimi (değiştirilemez)
const CLOCK_PER_GAME_MINUTE = CLOCK_PER_GAME_HOUR / 60;

/** Bir oyun saati kaç gerçek saniye sürer (1× = 3600, yani gerçek zaman) */
const HOUR_SECONDS = Math.max(1, Number(process.env.TRANORD_HOUR_SECONDS) || 3600);

/** Gerçek tick aralığı — sunucu saniyede bir tick atar */
const TICK_REAL_MS = 1000;

/** Bir tick kaç oyun saati ilerletir (1× → 1/3600) */
const HOURS_PER_TICK = (TICK_REAL_MS / 1000) / HOUR_SECONDS;

/** Bir tick'te sanal saat bu kadar artar */
const TICK_CLOCK = CLOCK_PER_GAME_HOUR * HOURS_PER_TICK;

// ── Dönüşümler ─────────────────────────────────────────────────────
const hoursToClock   = (h) => h * CLOCK_PER_GAME_HOUR;
const minutesToClock = (m) => m * CLOCK_PER_GAME_MINUTE;
const clockToHours   = (c) => c / CLOCK_PER_GAME_HOUR;

/**
 * Sanal saat farkı → GERÇEK saniye.
 * `speed` oyuncunun hız çarpanı (1 = normal, 8 = sekiz kat hızlı).
 */
function clockToRealSeconds(clockDelta, speed = 1) {
  if (!(clockDelta > 0)) return 0;
  const gameHours = clockDelta / CLOCK_PER_GAME_HOUR;
  return Math.ceil(gameHours * HOUR_SECONDS / Math.max(0.01, speed));
}

/** Geçen GERÇEK süre + hız çarpanı → kaç oyun saati işlenmeli */
function realMsToGameHours(realMs, speed = 1) {
  return (realMs / 1000) / HOUR_SECONDS * speed;
}

/** Oyun saati → gerçek milisaniye (seferler için; hız kaydırıcısından bağımsız) */
const gameHoursToRealMs = (h) => Math.round(h * HOUR_SECONDS * 1000);

/**
 * Hızlı ileri alma adımı. Tohumlama ve offline telafi 1 oyun saatlik KABA
 * adımlarla koşar: 1× ölçekte ince adım 1/3600 saat olduğu için 400 oyun saati
 * 1,44 milyon tick eder — kaba adımda 400 tekrar. Kaba adımın tek bedeli
 * depo taşması gibi olayların saat çözünürlüğünde hesaplanması.
 */
const CATCHUP_HOURS_PER_STEP = 1;

module.exports = {
  CLOCK_PER_GAME_HOUR, CLOCK_PER_GAME_MINUTE,
  HOUR_SECONDS, TICK_REAL_MS, HOURS_PER_TICK, TICK_CLOCK,
  CATCHUP_HOURS_PER_STEP,
  hoursToClock, minutesToClock, clockToHours,
  clockToRealSeconds, realMsToGameHours, gameHoursToRealMs,
};
