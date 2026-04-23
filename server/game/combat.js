/**
 * Savaş Simülasyon Modülü (Faz 1)
 *
 * Travian tarzı kombat:
 *   - Saldırganın piyade/süvari atak payı oranı (r_i, r_c) hesaplanır.
 *   - Savunanın ham savunması = Σ count × (r_i × yayaSav + r_c × atliSav)
 *   - Sur + Hendek çarpanı: D = D_raw × (1 + (sur% + hendek%) / 100)
 *   - Kayıp (Kirilloid): güçlü taraf zayıfı siler, kendi kaybı = (zayıf/güçlü)^1.5
 *   - Yağma modu: her iki tarafın kayıp oranı × 0.5
 *
 * Kuşatma birimleri (category === 'kusatma') Faz 1'de ihmal edilir.
 * Sağlık Çadırı, Kule, Moral bonusu TODO.md'de.
 *
 * Bu modül saf fonksiyondur — oyun state'ine dokunmaz. Hem simülatör hem de
 * gerçek saldırı sistemi gelince tek çağrı noktasıyla tüketir.
 */

const { UNIT_DEFS, SUR_BONUS, HENDEK_BONUS } = require('../data');

const K_LOSS_EXPONENT = 1.5;     // Kirilloid sabiti
const RAID_LOSS_MULT  = 0.5;     // Yağma modu kayıpları yarıya düşürür

function isCombatUnit(key) {
  const def = UNIT_DEFS[key];
  return !!def && def.category !== 'kusatma';
}

function clampLevel(lvl, table) {
  if (!Number.isFinite(lvl) || lvl <= 0) return 0;
  return Math.min(Math.floor(lvl), table.length - 1);
}

function wallBonusPct(surLevel, hendekLevel) {
  const s = SUR_BONUS[clampLevel(surLevel, SUR_BONUS)] || 0;
  const h = HENDEK_BONUS[clampLevel(hendekLevel, HENDEK_BONUS)] || 0;
  return s + h;
}

/**
 * @param {Object<string, number>} attackerUnits   { unitKey: count }
 * @param {Object<string, number>} defenderUnits   { unitKey: count }
 * @param {Object} [options]
 * @param {number} [options.surLevel=0]
 * @param {number} [options.hendekLevel=0]
 * @param {'normal'|'raid'} [options.mode='normal']
 */
function simulateBattle(attackerUnits = {}, defenderUnits = {}, options = {}) {
  const { surLevel = 0, hendekLevel = 0, mode = 'normal' } = options;

  // ── 1. Saldırgan tarafını topla ──────────────────────────────────
  let attackTotal = 0;
  let infAttack   = 0;
  let cavAttack   = 0;
  const attackerClean = {};

  for (const [key, rawCount] of Object.entries(attackerUnits)) {
    if (!isCombatUnit(key)) continue;
    const count = Math.max(0, Math.floor(Number(rawCount) || 0));
    if (count <= 0) continue;
    const def = UNIT_DEFS[key];
    const atk = count * def.stats.saldiri;
    attackTotal += atk;
    if (def.category === 'piyade') infAttack += atk;
    else if (def.category === 'suvari') cavAttack += atk;
    attackerClean[key] = count;
  }

  // ── 2. Savunan tarafını topla (saldırgan oranıyla ağırlıklı) ────
  const defenderClean = {};
  for (const [key, rawCount] of Object.entries(defenderUnits)) {
    if (!isCombatUnit(key)) continue;
    const count = Math.max(0, Math.floor(Number(rawCount) || 0));
    if (count <= 0) continue;
    defenderClean[key] = count;
  }

  // Saldırgan hiç atak getirmediyse (ya da birim yoksa) savaş gerçekleşmez.
  if (attackTotal <= 0) {
    return {
      mode,
      winner: 'none',
      attackTotal: 0,
      defenseRaw: 0,
      defenseTotal: 0,
      wallBonusPct: wallBonusPct(surLevel, hendekLevel),
      infRatio: 0,
      cavRatio: 0,
      attackerLossRate: 0,
      defenderLossRate: 0,
      attackerLosses: {},
      defenderLosses: {},
      attackerSurvivors: attackerClean,
      defenderSurvivors: defenderClean
    };
  }

  const infRatio = infAttack / attackTotal;
  const cavRatio = cavAttack / attackTotal;

  let defenseRaw = 0;
  for (const [key, count] of Object.entries(defenderClean)) {
    const s = UNIT_DEFS[key].stats;
    defenseRaw += count * (infRatio * s.yayaSav + cavRatio * s.atliSav);
  }

  const bonusPct     = wallBonusPct(surLevel, hendekLevel);
  const defenseTotal = defenseRaw * (1 + bonusPct / 100);

  // ── 3. Kazanan ve kayıp oranı ───────────────────────────────────
  let winner, attackerLossRate, defenderLossRate;
  if (attackTotal > defenseTotal) {
    winner = 'attacker';
    attackerLossRate = defenseTotal <= 0 ? 0 : Math.pow(defenseTotal / attackTotal, K_LOSS_EXPONENT);
    defenderLossRate = 1;
  } else if (defenseTotal > attackTotal) {
    winner = 'defender';
    attackerLossRate = 1;
    defenderLossRate = Math.pow(attackTotal / defenseTotal, K_LOSS_EXPONENT);
  } else {
    winner = 'draw';
    attackerLossRate = 1;
    defenderLossRate = 1;
  }

  if (mode === 'raid') {
    attackerLossRate *= RAID_LOSS_MULT;
    defenderLossRate *= RAID_LOSS_MULT;
  }

  // Clamp [0,1]
  attackerLossRate = Math.min(1, Math.max(0, attackerLossRate));
  defenderLossRate = Math.min(1, Math.max(0, defenderLossRate));

  // ── 4. Birim bazında kayıp dağıt ────────────────────────────────
  const applyRate = (units, rate) => {
    const losses = {};
    const survivors = {};
    for (const [key, count] of Object.entries(units)) {
      const dead = Math.round(count * rate);
      const alive = Math.max(0, count - dead);
      losses[key] = dead;
      survivors[key] = alive;
    }
    return { losses, survivors };
  };

  const atk = applyRate(attackerClean, attackerLossRate);
  const def = applyRate(defenderClean, defenderLossRate);

  return {
    mode,
    winner,
    attackTotal:  +attackTotal.toFixed(2),
    defenseRaw:   +defenseRaw.toFixed(2),
    defenseTotal: +defenseTotal.toFixed(2),
    wallBonusPct: +bonusPct.toFixed(2),
    infRatio:     +infRatio.toFixed(4),
    cavRatio:     +cavRatio.toFixed(4),
    attackerLossRate: +attackerLossRate.toFixed(4),
    defenderLossRate: +defenderLossRate.toFixed(4),
    attackerLosses:    atk.losses,
    defenderLosses:    def.losses,
    attackerSurvivors: atk.survivors,
    defenderSurvivors: def.survivors
  };
}

module.exports = { simulateBattle, wallBonusPct, K_LOSS_EXPONENT, RAID_LOSS_MULT };
