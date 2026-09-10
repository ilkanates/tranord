// Ortak popover stili — nordic buz paleti. Paneller SCROLL'suz sığacak
// şekilde tasarlanır; maxHeight yalnızca çok küçük ekranlar için emniyet kemeri.
import { C, FONT } from '../theme';

export const TEXT_STROKE =
  '0 1px 0 #04121e, 1px 0 0 #04121e, -1px 0 0 #04121e, 0 -1px 0 #04121e, 0 0 5px rgba(2,8,16,0.85)';

export const POPOVER_BASE = {
  position: 'absolute',
  background: 'linear-gradient(180deg, rgba(15,24,33,0.76) 0%, rgba(10,17,24,0.76) 100%)',
  border: `1px solid ${C.lineBright}`,
  borderRadius: 8,
  padding: 0,
  color: C.text,
  fontFamily: FONT.ui,
  fontWeight: 400,
  boxShadow: '0 18px 52px rgba(0,0,0,0.75), 0 0 0 1px rgba(127,212,255,0.07)',
  backdropFilter: 'blur(22px) saturate(1.25)',
  WebkitBackdropFilter: 'blur(22px) saturate(1.25)',
  zIndex: 60,
  fontSize: 11,
  overflow: 'hidden',
};

export function popoverStyle(pos, overrides = {}) {
  return {
    ...POPOVER_BASE,
    left: pos?.x ?? 0,
    top: pos?.y ?? 0,
    width: pos?.w ?? 296,
    maxHeight: pos?.maxH ?? 'calc(100% - 16px)',
    ...overrides,
  };
}

/**
 * Hex'in ekran koordinatına göre popover konumunu hesapla + ekrana sığdır.
 * panelW geniş paneller için zorunlu; sığmazsa otomatik daraltılır.
 *
 * DÖNÜŞ: { x, y, w, h, maxH }
 *
 * `h` KONUMLANDIRMADA KULLANILAN yükseklik ve paneli çizen taraf da bunu
 * kullanmalı. Eskiden yalnız `maxH` dönüyordu; VillageCenter paneli
 * `height: maxH` ile çiziyor ama burası `y`'yi `min(prefH, maxH)`'e göre
 * ortalıyordu. İki sayı ayrıştığı anda panel alttan taşıyordu — ölçüldü
 * (1904x962 ekran): konum 800'e göre y=56, çizim 892 px, panel kapsayıcıyı
 * 35 px aşıyor ve overflow:hidden alt kenarı kesiyor. Kesilen yerde tam da
 * YÜKSELT düğmesi vardı: 15 noktasından 0'ı tıklanabiliyordu.
 */
export function computePopoverPos({
  hexScreenX, hexScreenY, hexRadius, viewW, viewH,
  panelW = 296, prefH = 340, margin = 10,
  insetLeft = 0, insetRight = 0,   // yüzen rayların kapladığı alan
  center = false,                  // hex'e değil, EKRANIN ORTASINA yerleştir
}) {
  // Kullanılabilir yatay bant (rayların arası)
  const left  = insetLeft + margin;
  const right = viewW - insetRight - margin;
  const band  = Math.max(240, right - left);

  const w = Math.min(panelW, band);
  const maxH = Math.max(160, viewH - 2 * margin);
  const panelH = Math.min(prefH, maxH);

  /**
   * Ortalanmış yerleşim: panel hangi hex'e tıklandığından bağımsız olarak
   * hep aynı yerde açılır. Hex'e yapışık açılınca panel ekranda zıplıyor ve
   * göz her seferinde onu arıyordu.
   */
  if (center) {
    return {
      x: left + (band - w) / 2,
      y: Math.max(margin, (viewH - panelH) / 2),
      w, h: panelH, maxH,
    };
  }

  // Yatay: sağa aç, sığmazsa sola, o da olmazsa banda sığdır
  let px = hexScreenX + hexRadius + 16;
  if (px + w > right) px = hexScreenX - hexRadius - w - 16;
  px = Math.max(left, Math.min(px, right - w));

  // Dikey: hex hizasına ortala, taşarsa içeri çek
  let py = hexScreenY - panelH / 2;
  if (py + panelH > viewH - margin) py = viewH - panelH - margin;
  py = Math.max(margin, py);

  return { x: px, y: py, w, h: panelH, maxH };
}

// ── Popover içi ortak parçalar ──────────────────────────────────────

export const popHeader = {
  display: 'flex', alignItems: 'center', gap: 9,
  padding: '9px 11px',
  borderBottom: `1px solid ${C.lineSoft}`,
  background: 'linear-gradient(180deg, rgba(127,212,255,0.08), transparent)',
  flexShrink: 0,
};

export const popBody = { padding: 11 };

/**
 * İki kolonlu gövde. DAR panelde (poster biçimi, ~430px) kendiliğinden TEK
 * sütuna iner: `auto-fit` + `minmax(200px, …)` iki sütun sığmadığında sarar.
 * Sabit `1fr 1.05fr` bırakılsaydı dar pencerede iki kolon 180px'e sıkışıp
 * sayılar alt alta kırılıyordu.
 */
export const popCols = () => ({
  display: 'grid',
  // 210px eşiği: harita panelleri (480–520) iki sütun kalır, poster paneli
  // (430) tek sütuna iner. 200px'te fark yalnızca 3px olurdu — çok kırılgan.
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: 11,
  padding: 11,
  alignItems: 'start',
});

export const popCol = {
  display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0,
};

export const popDivider = {
  gridColumn: '1 / -1', height: 1, background: C.lineSoft, margin: '1px 0',
};
