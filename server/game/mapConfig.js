/**
 * Üretim alanı haritası — server tarafı (CommonJS).
 *
 * ⚠️  Bu dosya `client/src/data/mapConfig.js` ile birebir senkron kalmalı.
 *     Özellikle hashCoords, BONUS_STEPS, BONUS_RESOURCES, BONUS_CHANCE —
 *     bir tarafta değiştirilirse diğeri de güncellenmeli.
 */

const MAP_SIZE = 600;
const BONUS_CHANCE = 0.20;
const BONUS_STEPS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const BONUS_RESOURCES = ['odun', 'kil', 'tas', 'demir', 'tahil'];

function hexDistance(q, r) {
  return (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2;
}

function hashCoords(q, r, salt) {
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

function getTileBonus(q, r) {
  if (q === 0 && r === 0) return null;
  if (rand01(q, r, 1) >= BONUS_CHANCE) return null;
  const amount = BONUS_STEPS[Math.floor(rand01(q, r, 2) * BONUS_STEPS.length)];
  const resource = BONUS_RESOURCES[Math.floor(rand01(q, r, 3) * BONUS_RESOURCES.length)];
  return { resource, amount };
}

function getDistanceEfficiency(q, r) {
  const d = hexDistance(q, r);
  if (d <= 1) return 1;
  return Math.max(0, 1 - 0.05 * (d - 1));
}

function getTotalMultiplier(q, r, buildingType) {
  const base = getDistanceEfficiency(q, r);
  const bonus = getTileBonus(q, r);
  if (bonus && bonus.resource === buildingType) {
    return base * (1 + bonus.amount / 100);
  }
  return base;
}

module.exports = {
  MAP_SIZE,
  BONUS_CHANCE,
  BONUS_STEPS,
  BONUS_RESOURCES,
  hexDistance,
  hashCoords,
  getTileBonus,
  getDistanceEfficiency,
  getTotalMultiplier
};
