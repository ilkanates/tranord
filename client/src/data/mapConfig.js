/**
 * Üretim alanı haritası — tek kaynaklı (client + server eşdeğer) konfig.
 *
 * 600 altıgen, axial koord (q,r), ring spiral üretimi.
 * Bonuslar tamamen deterministik: aynı (q,r) her zaman aynı bonusu verir.
 * (Mümkün olan en yalın 32-bit karma + aynı mantık server tarafında da duruyor.)
 *
 * ⚠️  Bu dosyada yapılan her değişiklik `server/game/mapConfig.js` ile
 *     birebir eşitlenmeli — bonus hesabı iki tarafta da aynı olmalı.
 */

export const MAP_SIZE = 600;

// %20 tile bonus alır, geri kalanı %0
export const BONUS_CHANCE = 0.20;

// 5, 10, 15, ..., 50 (yüzde)
export const BONUS_STEPS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

// Ham kaynak tipleri (üretim binası tiplerine karşılık)
export const BONUS_RESOURCES = ['odun', 'kil', 'tas', 'demir', 'tahil'];

export const HEX_NEIGHBORS = [[1,-1],[1,0],[0,1],[-1,1],[-1,0],[0,-1]];

export const SQRT3 = Math.sqrt(3);

// Flat-top hex: q ekseni sağa/sola, r ekseni çaprazlamasına.
export function hexToPixel(q, r, size) {
  return {
    x: size * (3/2 * q),
    y: size * (SQRT3/2 * q + SQRT3 * r)
  };
}

// Axial hex mesafesi (ring sayısı)
export function hexDistance(q, r) {
  return (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2;
}

// 600 tile üret: merkezden dışa doğru spiral ile sıralı.
export function generateMapCoords(count = MAP_SIZE) {
  const coords = [[0, 0]];
  // Axial yön vektörleri (ring yürüyüşü için standart sıra)
  const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  let ring = 1;
  while (coords.length < count) {
    // Başlangıç: center + direction[4] * ring
    let q = -ring;
    let r = ring;
    for (let side = 0; side < 6; side++) {
      for (let step = 0; step < ring; step++) {
        coords.push([q, r]);
        if (coords.length >= count) break;
        q += dirs[side][0];
        r += dirs[side][1];
      }
      if (coords.length >= count) break;
    }
    ring++;
  }
  return coords.slice(0, count);
}

// 32-bit deterministik karma — client/server birebir aynı çıkmalı.
export function hashCoords(q, r, salt) {
  let h = (Math.imul(q | 0, 73856093) ^ Math.imul(r | 0, 19349663) ^ Math.imul(salt | 0, 83492791)) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}

function rand01(q, r, salt) {
  return hashCoords(q, r, salt) / 4294967296;
}

// Tile bonusu: { resource, amount } | null
// 0,0 merkez — bonus yok. Diğer tüm tile'larda %20 ihtimalle bonus.
export function getTileBonus(q, r) {
  if (q === 0 && r === 0) return null;
  if (rand01(q, r, 1) >= BONUS_CHANCE) return null;
  const amount = BONUS_STEPS[Math.floor(rand01(q, r, 2) * BONUS_STEPS.length)];
  const resource = BONUS_RESOURCES[Math.floor(rand01(q, r, 3) * BONUS_RESOURCES.length)];
  return { resource, amount };
}

// Mesafe verimi: ring<=1 → %100, her ring için -%5, min 0.
export function getDistanceEfficiency(q, r) {
  const d = hexDistance(q, r);
  if (d <= 1) return 1;
  return Math.max(0, 1 - 0.05 * (d - 1));
}

// Bir tile'a (q,r) inşa edilecek bina tipi için toplam çarpan.
// distance multiplier × (1 + bonusAmount/100 if resource eşleşiyorsa)
export function getTotalMultiplier(q, r, buildingType) {
  const base = getDistanceEfficiency(q, r);
  const bonus = getTileBonus(q, r);
  if (bonus && bonus.resource === buildingType) {
    return base * (1 + bonus.amount / 100);
  }
  return base;
}
