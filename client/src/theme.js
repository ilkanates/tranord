/**
 * TraNord — Nordic tema jetonları
 * Tüm renkler ve tipografi buradan gelir. Kahve/altın tonu yok; buz mavisi + fiyort.
 */

export const C = {
  // Zeminler — nötr koyu (lacivert değil), böylece mavi baskın olmuyor
  abyss:      '#070c11',
  deep:       '#0c141b',
  bg:         '#111c25',
  panel:      'rgba(16, 26, 35, 0.45)',
  panelSolid: '#141f2a',
  raised:     '#1b2935',
  raisedHi:   '#22323f',

  // Kenarlıklar
  line:       '#263947',
  lineSoft:   'rgba(96, 128, 150, 0.34)',
  lineBright: '#42607a',
  lineGlow:   'rgba(143, 220, 255, 0.5)',

  // Buz vurgusu — yapısal renk
  ice:        '#8fdcff',
  iceSoft:    '#c4ecff',
  iceDeep:    '#4fb0e0',
  frost:      '#f3f8fb',

  // Sıcak vurgu — sayılar ve seviye etiketleri için (paleti canlandırır)
  gold:       '#f2c86e',
  goldSoft:   '#f9e2ad',

  // Metin — parlak ve nötr, mavi tonlu değil
  text:       '#e6ecf0',
  textDim:    '#b2c0ca',
  textFaint:  '#8b9aa6',
  textMute:   '#66757f',

  // Durum
  good:       '#6cdda3',
  goodDim:    '#3ba079',
  warn:       '#f2bb60',
  danger:     '#ff6f78',
  dangerDim:  '#a63f47',

  // Aurora (arka plan)
  aurora1:    '#4ff0c0',
  aurora2:    '#6bb8ff',
  aurora3:    '#ad8cf0',
};

// Kaynak zincirlerinin renkleri — ham ve işlenmiş hâli aynı aileden
/**
 * KAYNAK RENKLERİ — malın KENDİ rengi, aile rengi değil.
 *
 * Eski palette ham madde ile ondan çıkan işlenmiş mal aynı rengin koyu
 * ve açık tonuydu (odun yeşil, kereste açık yeşil). Aile bağını
 * gösteriyordu ama asıl işi yapmıyordu: küçük simgede odunla keresteyi
 * ayırt etmek imkânsızdı, ikisi de yeşil bir leke oluyordu.
 *
 * Artık her mal kendi gerçek rengine yakın: kütük kahve, kereste sarımsı
 * tahta, kil kiremit, tuğla pişmiş kırmızı. Aile bağını simgenin şekli
 * zaten anlatıyor.
 */
export const RES_COLOR = {
  odun:       '#b0794a',   // kütük — koyu kahve
  kereste:    '#e3b579',   // biçilmiş tahta — sarımsı
  kil:        '#d9774c',   // ıslak kil — kiremit
  tugla:      '#c14f33',   // pişmiş tuğla — kırmızı
  tas:        '#93a2b4',   // ham taş — gri
  yontmaTas:  '#d2dbe6',   // yontulmuş taş — açık gri
  demir:      '#6d8db4',   // demir cevheri — koyu çelik
  demirKulce: '#b8d4f2',   // külçe — parlak gümüş
  tahil:      '#e6c247',   // başak — altın sarısı
  un:         '#f2e7c4',   // un — krem
  ekmek:      '#c98a4b',   // ekmek — fırın kahvesi
};

export const FONT = {
  head: "'Cormorant Garamond', Garamond, Georgia, serif",
  ui:   "'Jost', 'Segoe UI', system-ui, sans-serif",
  num:  "'Jost', ui-monospace, monospace",
};

// ─── Yeniden kullanılan stil parçaları ──────────────────────────────

export const panel = (extra = {}) => ({
  background: C.panel,
  border: `1px solid ${C.lineSoft}`,
  borderRadius: 8,
  backdropFilter: 'blur(12px) saturate(1.1)',
  WebkitBackdropFilter: 'blur(12px) saturate(1.1)',
  ...extra,
});

export const btn = (variant = 'ghost', extra = {}) => {
  const base = {
    fontFamily: FONT.ui,
    fontSize: 11,
    fontWeight: 400,
    letterSpacing: 0.6,
    padding: '7px 12px',
    borderRadius: 5,
    cursor: 'pointer',
    transition: 'background .14s, border-color .14s, color .14s',
    lineHeight: 1.2,
  };
  const variants = {
    primary: {
      background: 'linear-gradient(180deg, #1f4d70 0%, rgba(23,57,84,0.5) 100%)',
      border: `1px solid ${C.iceDeep}`,
      color: C.frost,
    },
    good: {
      background: 'linear-gradient(180deg, #1c5348 0%, rgba(20,58,50,0.5) 100%)',
      border: `1px solid ${C.goodDim}`,
      color: '#bff0dd',
    },
    danger: {
      background: 'linear-gradient(180deg, #4a1d24 0%, rgba(51,20,25,0.5) 100%)',
      border: `1px solid ${C.dangerDim}`,
      color: '#f0b8bd',
    },
    ghost: {
      background: 'rgba(28, 51, 73, 0.5)',
      border: `1px solid ${C.lineSoft}`,
      color: C.textDim,
    },
    disabled: {
      background: 'rgba(20, 32, 46, 0.6)',
      border: `1px solid ${C.lineSoft}`,
      color: C.textMute,
      cursor: 'not-allowed',
    },
  };
  return { ...base, ...(variants[variant] || variants.ghost), ...extra };
};

export const heading = (size = 14, extra = {}) => ({
  fontFamily: FONT.head,
  fontSize: size,
  fontWeight: 600,
  letterSpacing: size >= 16 ? 2.5 : 1.4,
  color: C.frost,
  ...extra,
});

export const label = (extra = {}) => ({
  fontFamily: FONT.ui,
  fontSize: 9,
  fontWeight: 400,
  letterSpacing: 1.3,
  textTransform: 'uppercase',
  color: C.textFaint,
  ...extra,
});

export const num = (extra = {}) => ({
  fontFamily: FONT.num,
  fontVariantNumeric: 'tabular-nums',
  ...extra,
});

// Sayı biçimleme — 1.2k / 45k
export function short(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (Math.abs(v) >= 1000) return (v / 1000).toFixed(Math.abs(v) >= 10000 ? 0 : 1) + 'k';
  return String(Math.floor(v));
}

export function signed(n, digits = 1) {
  const v = Number(n) || 0;
  if (Math.abs(v) < 0.05) return '0';
  return (v > 0 ? '+' : '') + v.toFixed(digits);
}

/**
 * SÜRE BİÇİMİ — her yerde saat:dakika:saniye.
 *
 * Önce ölçeğe göre değişen ("45sn", "12dk 30sn", "3sa 20dk") bir biçim vardı;
 * aynı ekranda üç ayrı biçim yan yana gelince okumak zorlaşıyordu ve
 * saniyeler bir saatin üstünde tamamen kayboluyordu. Tek biçim: 0:00:45,
 * 0:12:30, 3:20:05. Saat 24'ü aşabilir (1× ölçekte inşaatlar uzun sürüyor).
 */
/**
 * SÜRE — saat:dakika:saniye, sıfır dolgusu YOK.
 *
 * Eskiden her süre `0:00:07` gibi üç alanla yazılıyordu; 7 saniyelik bir iş
 * için ekranın çoğu sıfırdı. Artık boş üst birimler hiç yazılmıyor ve
 * hiçbir alan iki haneye doldurulmuyor:
 *
 *     98.355 sn → 27:19:15      1.155 sn → 19:15      7 sn → 7
 *
 * Gün YOK: 4 günlük bir iş 99:19:15 diye saat olarak yazılır (istenen bu).
 */
/**
 * Süre biçimi.
 *  - Bir dakikanın altı: "50 sn" (eskiden yalnız "50" yazıyor, seviye
 *    ya da adet sanılıyordu).
 *  - Üstü: 2:05 / 1:02:05 — dakika ve saniye İKİ HANE (eskiden "1:2:5"
 *    çıkıyordu, okunmuyordu).
 */
const iki = (n) => String(n).padStart(2, '0');

export function fmtTime(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return '—';
  const t = Math.ceil(seconds);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}:${iki(m)}:${iki(s)}`;
  if (m > 0) return `${m}:${iki(s)}`;
  return `${s} sn`;
}
