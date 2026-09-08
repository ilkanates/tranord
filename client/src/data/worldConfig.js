/**
 * Dünya haritası konfigürasyonu — istemci tarafı.
 *
 * ⚠️  `server/game/world.js` ile BİREBİR aynı kalmalı: hashCoords, BONUS_*,
 *     worldTileBonus ve localEfficiency. Biri değişirse diğeri de değişmeli,
 *     yoksa oyuncu haritada gördüğü bonusla sunucunun hesapladığı üretimi
 *     birbirine uymaz.
 */

export const CLAIM_RADIUS = 2;      // köyün sahip olduğu halka (18 tarla)
export const MIN_DISTANCE = 6;      // köy merkezleri arası min mesafe

export const BONUS_CHANCE    = 0.20;
export const BONUS_STEPS     = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
export const BONUS_RESOURCES = ['odun', 'kil', 'tas', 'demir', 'tahil'];

export const SQRT3 = Math.sqrt(3);
export const HEX_NEIGHBORS = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];

// Köyün toprağı: merkez + ring1 (6) + ring2 (12)
export const CLAIM_RING_1 = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export const CLAIM_RING_2 = [[2, 0], [2, -1], [2, -2], [1, -2], [0, -2], [-1, -1],
  [-2, 0], [-2, 1], [-2, 2], [-1, 2], [0, 2], [1, 1]];
export const CLAIM_OFFSETS = [...CLAIM_RING_1, ...CLAIM_RING_2];

export function hashCoords(q, r, salt) {
  let h = (Math.imul(q | 0, 73856093) ^ Math.imul(r | 0, 19349663) ^ Math.imul(salt | 0, 83492791)) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
export const rand01 = (q, r, salt) => hashCoords(q, r, salt) / 4294967296;

export const hexDistance = (q, r) => (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2;
export const distanceBetween = (a, b) => {
  const dq = a.q - b.q, dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
};

/** Dünya hex'inin arazi bonusu — sunucudaki worldTileBonus ile aynı */
export function worldTileBonus(q, r) {
  if (rand01(q, r, 1) >= BONUS_CHANCE) return null;
  const amount = BONUS_STEPS[Math.floor(rand01(q, r, 2) * BONUS_STEPS.length)];
  const resource = BONUS_RESOURCES[Math.floor(rand01(q, r, 3) * BONUS_RESOURCES.length)];
  return { resource, amount };
}

/** Köy merkezinden uzaklık cezası — yerel halkaya bağlı */
export function localEfficiency(localRing) {
  if (localRing <= 1) return 1;
  return Math.max(0, 1 - 0.05 * (localRing - 1));
}

/** Tarlanın toplam çarpanı: yerel mesafe verimi × dünya bonusu */
export function fieldMultiplier(worldQ, worldR, localQ, localR, buildingType) {
  const base = localEfficiency(hexDistance(localQ, localR));
  const bonus = worldTileBonus(worldQ + localQ, worldR + localR);
  if (bonus && bonus.resource === buildingType) return base * (1 + bonus.amount / 100);
  return base;
}

/** Hex → ekran (flat-top, üretim alanıyla aynı geometri) */
export function hexToPixel(q, r, size) {
  return { x: size * 1.5 * q, y: size * ((SQRT3 / 2) * q + SQRT3 * r) };
}

/** Ekran → hex (yaklaşık, tıklama için) */
export function pixelToHex(x, y, size) {
  const q = (2 / 3) * x / size;
  const r = (-1 / 3) * x / size + (SQRT3 / 3) * y / size;
  // küp yuvarlama
  let cx = q, cz = r, cy = -cx - cz;
  let rx = Math.round(cx), ry = Math.round(cy), rz = Math.round(cz);
  const dx = Math.abs(rx - cx), dy = Math.abs(ry - cy), dz = Math.abs(rz - cz);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

export function hexPoints(cx, cy, s) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return `${(cx + s * Math.cos(a)).toFixed(1)},${(cy + s * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}
