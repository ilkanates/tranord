/**
 * Dünya haritası — TEK harita.
 *
 * Köyün üretim tarlaları da bu haritanın hex'leri. Her köy merkezinin
 * çevresindeki CLAIM_RADIUS halkası o köyün toprağıdır (ring1 6 + ring2 12 = 18 tarla).
 * Köy merkezleri arası mesafe MIN_DISTANCE olduğu için topraklar çakışmaz ve
 * aralarda en az 1 hex nötr vahşi doğa kalır.
 *
 * Slotlar deterministik greedy paketleme ile üretilir → harita her açılışta aynı,
 * DB'de yalnızca köy durumları saklanır.
 */

/**
 * DÜNYA YARIÇAPI 60 → 134.
 *
 * Amaç: NPC sayısı aynı (200) kalırken köyler birbirinden uzaklaşsın ve
 * ikinci/üçüncü köyler için boş slot kalsın. Ölçüm:
 *   R= 60 →   332 slot, 200 NPC = %60 doluluk (yer yok)
 *   R=134 → 1.729 slot, 200 NPC = %12 doluluk (1.529 boş slot)
 * NPC'lerin merkeze ortalama uzaklığı 40 → 89 halkaya çıkıyor.
 *
 * Yarıçap ×5 (R=300, 9.006 slot) denendi ama uzak zoom arazi çizimi dünyanın
 * TAMAMINI tek seferde boyuyor: 53.837 hex ≈ 320.000 çizgi parçası, her
 * pan'de yeniden. Kaydırma takılıyordu. Görüş alanına göre parçalı çizim
 * yazılmadan R=300'e çıkılmamalı.
 */
const WORLD_RADIUS  = 134;   // 3*134*135+1 = 54.271 hex
const CLAIM_RADIUS  = 2;     // köyün sahip olduğu halka (18 tarla)
const MIN_DISTANCE  = 6;     // köy merkezleri arası min mesafe (2+2+1 tampon)
const NPC_TARGET    = 200;
const SPAWN_RADIUS  = 12;    // oyuncular bu halkanın içinde doğar

// ── Deterministik karma ─────────────────────────────────────────────
function hashCoords(q, r, salt) {
  let h = (Math.imul(q | 0, 73856093) ^ Math.imul(r | 0, 19349663) ^ Math.imul(salt | 0, 83492791)) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
const rand01 = (q, r, salt) => hashCoords(q, r, salt) / 4294967296;

const hexDistance = (q, r) => (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2;
function distanceBetween(a, b) {
  const dq = a.q - b.q, dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
}

// ── Arazi bonusu (dünya katmanı) ────────────────────────────────────
// Tarla bonusları artık DÜNYA koordinatına bağlı: köyünün nerede kurulduğu
// hangi bonusları alacağını belirler.
const BONUS_CHANCE    = 0.20;
const BONUS_STEPS     = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const BONUS_RESOURCES = ['odun', 'kil', 'tas', 'demir', 'tahil'];

function worldTileBonus(q, r) {
  if (rand01(q, r, 1) >= BONUS_CHANCE) return null;
  const amount = BONUS_STEPS[Math.floor(rand01(q, r, 2) * BONUS_STEPS.length)];
  const resource = BONUS_RESOURCES[Math.floor(rand01(q, r, 3) * BONUS_RESOURCES.length)];
  return { resource, amount };
}

/** Köy merkezinden uzaklık cezası — YEREL halkaya bağlı (dünya konumundan bağımsız) */
function localEfficiency(localRing) {
  if (localRing <= 1) return 1;
  return Math.max(0, 1 - 0.05 * (localRing - 1));
}

/** Bir tarlanın toplam çarpanı: yerel mesafe verimi × dünya bonusu */
function fieldMultiplier(worldQ, worldR, localQ, localR, buildingType) {
  const base = localEfficiency(hexDistance(localQ, localR));
  const bonus = worldTileBonus(worldQ + localQ, worldR + localR);
  if (bonus && bonus.resource === buildingType) return base * (1 + bonus.amount / 100);
  return base;
}

// ── Kademe: merkeze yakın zayıf, uzak güçlü (yarıçap 60'a göre) ─────
/**
 * Kademe halkaları YARIÇAPLA BİRLİKTE ölçeklenir (eski değerler × 134/60).
 * Ölçeklenmezse dünya büyüyünce NPC'lerin neredeyse tamamı en dış kademeye
 * düşüyor — ölçüldü: 200 NPC'nin 170'i "Konak" (en güçlü) oluyordu, oyunun
 * başı imkânsız hâle geliyordu. Ölçekli hâlde dağılım eskisiyle aynı kalıyor.
 */
const TIERS = [
  { tier: 1, maxRing: 34,  label: 'Çiftlik',   power: 0.10 },
  { tier: 2, maxRing: 60,  label: 'Kasaba',    power: 0.28 },
  { tier: 3, maxRing: 87,  label: 'Kale',      power: 0.52 },
  { tier: 4, maxRing: 114, label: 'Jarl Köyü', power: 0.78 },
  { tier: 5, maxRing: 999, label: 'Konak',     power: 1.00 },
];
const tierForRing = (ring) => TIERS.find(t => ring <= t.maxRing) || TIERS[TIERS.length - 1];

// ── İsim üretimi ────────────────────────────────────────────────────
const NAME_A = ['Nord', 'Fjord', 'Vind', 'Isen', 'Storm', 'Ulv', 'Bjorn', 'Skjold', 'Jern',
  'Frost', 'Havn', 'Berg', 'Sten', 'Val', 'Rav', 'Hjort', 'Orn', 'Gard', 'Myr', 'Lund',
  'Vald', 'Eik', 'Grim', 'Sval', 'Torn', 'Haug', 'Sae', 'Alv', 'Rune', 'Skar'];
const NAME_B = ['heim', 'vik', 'stad', 'borg', 'nes', 'fjell', 'dal', 'havn', 'holt', 'strand',
  'by', 'sund', 'ness', 'gard', 'tun', 'mark', 'lid', 'os', 'vollen', 'berg'];
const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

const villageName = (q, r) =>
  NAME_A[Math.floor(rand01(q, r, 11) * NAME_A.length)] +
  NAME_B[Math.floor(rand01(q, r, 12) * NAME_B.length)];

// ── Slot üretimi: greedy paketleme, min mesafe korunur ──────────────
let _slotCache = null;

function generateSlots() {
  if (_slotCache) return _slotCache;

  const all = [];
  for (let q = -WORLD_RADIUS; q <= WORLD_RADIUS; q++) {
    const rMin = Math.max(-WORLD_RADIUS, -q - WORLD_RADIUS);
    const rMax = Math.min(WORLD_RADIUS, -q + WORLD_RADIUS);
    for (let r = rMin; r <= rMax; r++) {
      const ring = hexDistance(q, r);
      if (ring > WORLD_RADIUS - CLAIM_RADIUS) continue;   // toprağı dünya dışına taşmasın
      all.push({ q, r, ring });
    }
  }
  // Halka → deterministik karma sırası
  all.sort((a, b) => a.ring - b.ring || hashCoords(a.q, a.r, 7) - hashCoords(b.q, b.r, 7));

  const cell = MIN_DISTANCE;
  const grid = new Map();
  const bucket = (q, r) => `${Math.floor(q / cell)},${Math.floor(r / cell)}`;
  const slots = [];

  for (const p of all) {
    let ok = true;
    for (let dq = -1; dq <= 1 && ok; dq++) {
      for (let dr = -1; dr <= 1 && ok; dr++) {
        const b = grid.get(`${Math.floor(p.q / cell) + dq},${Math.floor(p.r / cell) + dr}`);
        if (!b) continue;
        for (const o of b) {
          if (distanceBetween(p, o) < MIN_DISTANCE) { ok = false; break; }
        }
      }
    }
    if (!ok) continue;

    const t = tierForRing(p.ring);
    const slot = {
      key: `${p.q},${p.r}`, q: p.q, r: p.r, ring: p.ring,
      tier: t.tier, tierLabel: t.label, power: t.power,
      name: villageName(p.q, p.r),
    };
    slots.push(slot);
    const k = bucket(p.q, p.r);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(slot);
  }

  slots.sort((a, b) => a.ring - b.ring || a.key.localeCompare(b.key));

  const seen = new Map();
  slots.forEach(s => {
    const n = seen.get(s.name) || 0;
    seen.set(s.name, n + 1);
    if (n > 0) s.name += (ROMAN[n] || ` ${n + 1}`);
  });

  _slotCache = slots;
  return slots;
}

/** NPC'ye ayrılacak slotlar — halka dağılımını koruyan düzgün seyreltme */
function pickNpcSlots(slots, count = NPC_TARGET, reserveForPlayers = 8) {
  const spawnable = slots.filter(s => s.ring <= SPAWN_RADIUS);
  const reserved = new Set(spawnable.slice(0, reserveForPlayers).map(s => s.key));
  const pool = slots.filter(s => !reserved.has(s.key));
  if (pool.length <= count) return pool;

  const out = [];
  const stride = pool.length / count;
  for (let i = 0; i < count; i++) out.push(pool[Math.floor(i * stride)]);
  return out;
}

/** Oyuncu için boş doğuş slotu (merkeze en yakın) */
function findSpawnSlot(slots, takenKeys) {
  const free = slots.filter(s => s.ring <= SPAWN_RADIUS && !takenKeys.has(s.key));
  if (free.length) return free[0];
  return slots.find(s => !takenKeys.has(s.key)) || null;
}

module.exports = {
  WORLD_RADIUS, CLAIM_RADIUS, MIN_DISTANCE, NPC_TARGET, SPAWN_RADIUS, TIERS,
  BONUS_CHANCE, BONUS_STEPS, BONUS_RESOURCES,
  hashCoords, rand01, hexDistance, distanceBetween, tierForRing,
  worldTileBonus, localEfficiency, fieldMultiplier,
  villageName, generateSlots, pickNpcSlots, findSpawnSlot,
};
