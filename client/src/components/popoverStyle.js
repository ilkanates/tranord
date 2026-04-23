// Ortak popover stili — hex üstündeki "Lvl N" yazılarıyla aynı look
// (krem sarısı + koyu kahve stroke, Georgia serif).

export const TEXT_STROKE =
  '1px 1px 0 #3a1a00, -1px 1px 0 #3a1a00, 1px -1px 0 #3a1a00, -1px -1px 0 #3a1a00, 0 0 3px rgba(0,0,0,0.7)';

export const POPOVER_BASE = {
  position: 'absolute',
  width: 280,
  background: 'rgba(28, 20, 8, 0.96)',
  border: '2px solid #7a5c32',
  borderRadius: 4,
  padding: 12,
  overflowY: 'auto',
  color: '#fff8c0',
  fontFamily: 'Georgia, serif',
  fontWeight: 'bold',
  textShadow: TEXT_STROKE,
  boxShadow: '0 6px 22px rgba(0,0,0,0.7)',
  zIndex: 20,
  fontSize: 11,
};

export function popoverStyle(pos, overrides = {}) {
  return {
    ...POPOVER_BASE,
    left: pos?.x ?? 0,
    top: pos?.y ?? 0,
    maxHeight: pos?.maxH ?? 'calc(100% - 16px)',
    ...overrides,
  };
}

/**
 * Hex'in ekran koordinatını hesapla + popover konumunu clamp et.
 *
 * @param {object} opts
 * @param {number} opts.hexScreenX - hex'in ekrandaki x merkezi
 * @param {number} opts.hexScreenY - hex'in ekrandaki y merkezi
 * @param {number} opts.hexRadius  - hex yarıçapı (ekran px cinsinden)
 * @param {number} opts.viewW      - container genişliği
 * @param {number} opts.viewH      - container yüksekliği
 * @param {number} [opts.panelW=280]   - popover genişliği
 * @param {number} [opts.prefH=480]    - tercih edilen popover yüksekliği
 * @param {number} [opts.margin=8]     - kenar boşluğu
 * @returns {{ x:number, y:number, maxH:number }}
 */
export function computePopoverPos({ hexScreenX, hexScreenY, hexRadius, viewW, viewH, panelW = 280, prefH = 480, margin = 8 }) {
  const maxH = Math.max(120, viewH - 2 * margin);
  const panelH = Math.min(prefH, maxH);

  // Yatay: sağa aç, sığmazsa sola
  let px = hexScreenX + hexRadius + 14;
  if (px + panelW > viewW - margin) {
    px = hexScreenX - hexRadius - panelW - 14;
  }
  px = Math.max(margin, Math.min(px, viewW - panelW - margin));

  // Dikey: hex hizasından başla, alta taşarsa yukarı çek
  let py = hexScreenY - 40;
  if (py + panelH > viewH - margin) {
    py = viewH - panelH - margin;
  }
  py = Math.max(margin, py);

  return { x: px, y: py, maxH: panelH };
}
