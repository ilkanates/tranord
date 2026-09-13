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

const { UNIT_DEFS, SUR_BONUS, HENDEK_BONUS, KULE_BONUS, VILLAGE_DEFS, DEF_BONUS_CAP } = require('../data');
const { unitStats } = require('../data/militaryDefs');

/** Kule slot sayısı ve kule başına okçu kapasitesi — tanımdan türer */
const TOWER_SLOTS            = VILLAGE_DEFS.kule?.maxInstances    || 6;
const TOWER_ARCHERS_PER_LEVEL = VILLAGE_DEFS.kule?.workersPerLevel || 4;

const K_LOSS_EXPONENT = 1.5;     // Kirilloid sabiti
const RAID_LOSS_MULT  = 0.5;     // Yağma modu kayıpları yarıya düşürür

/**
 * Göçmen ve kuşatma birimleri savaş HESABINA girmez — ama orduyla
 * YÜRÜRLER ve ölürler.
 *
 * Eskiden bu birimler hesaba girmedikleri gibi `attackerSurvivors`a da
 * konmuyordu: `march.units = survivors` satırıyla mancınıklar savaş
 * biter bitmez YOK oluyordu. Sonuç iki ayrı arıza olarak görünüyordu —
 * makineler eve dönmüyordu ve kuşatma fazı (sağ kalanlara bakıyor)
 * hiçbir şey yıkmıyordu.
 *
 * Doğru davranış: güce katkı yok, kayıpta pay VAR. Kayıpsız taşınsalardı
 * "bir asker + yirmi mancınık" risksiz bir kuşatma olurdu.
 */
const NON_COMBAT = new Set(['kusatma', 'gocmen']);
function isCombatUnit(key) {
  const def = UNIT_DEFS[key];
  return !!def && !NON_COMBAT.has(def.category);
}

function clampLevel(lvl, table) {
  if (!Number.isFinite(lvl) || lvl <= 0) return 0;
  return Math.min(Math.floor(lvl), table.length - 1);
}

/**
 * KULE BONUSU — seviye bonusu × OKÇU DOLULUĞU.
 *
 * Boş kule hiçbir fayda vermez; tam kadro kulenin seviye bonusunu tam verir.
 * Altı slotun ORTALAMASI alınır, yani altı kule de tam seviye ve tam kadro
 * olduğunda toplam katkı KULE_BONUS kadardır (= surun iki katı). Yarısı
 * boşsa katkı da yarıya iner.
 */
function towerBonusPct(village) {
  let sum = 0;
  for (const b of Object.values(village?.villageBuildings || {})) {
    if (b.type !== 'kule' || !(b.level >= 1)) continue;
    const maxA = b.level * TOWER_ARCHERS_PER_LEVEL;
    if (maxA <= 0) continue;
    const fill = Math.min(1, Math.max(0, (b.workers || 0) / maxA));
    if (fill <= 0) continue;
    sum += (KULE_BONUS[clampLevel(b.level, KULE_BONUS)] || 0) * fill;
  }
  return Math.round((sum / TOWER_SLOTS) * 10) / 10;
}

/**
 * Köyün toplam savunma bonusu (%). Sur + hendek + kule (okçu dolulukla
 * ölçekli) toplamı, DEF_BONUS_CAP ile sert şekilde sınırlanır: tablolar
 * elle değiştirilse bile toplam tavanı geçemez.
 */
function wallBonusPct(surLevel, hendekLevel, kulePct = 0) {
  const s = SUR_BONUS[clampLevel(surLevel, SUR_BONUS)] || 0;
  const h = HENDEK_BONUS[clampLevel(hendekLevel, HENDEK_BONUS)] || 0;
  const total = s + h + (Number(kulePct) || 0);
  return Math.min(DEF_BONUS_CAP, Math.round(total * 10) / 10);
}

/**
 * @param {Object<string, number>} attackerUnits   { unitKey: count }
 * @param {Object<string, number>} defenderUnits   { unitKey: count }
 * @param {Object} [options]
 * @param {number} [options.surLevel=0]
 * @param {number} [options.hendekLevel=0]
 * @param {number} [options.kulePct=0]   kulelerin okçu dolulukla ölçeklenmiş bonusu
 * @param {'normal'|'raid'} [options.mode='normal']
 * @param {Object} [options.attackerLevels]  saldıranın ekipman yükseltmeleri
 * @param {Object} [options.defenderLevels]  savunanın ekipman yükseltmeleri
 */
function simulateBattle(attackerUnits = {}, defenderUnits = {}, options = {}) {
  const {
    surLevel = 0, hendekLevel = 0, kulePct = 0, mode = 'normal',
    /**
     * EKİPMAN YÜKSELTMELERİ iki tarafta AYRI: saldıranın kılıç seviyesi
     * onun saldırısını, savunanın kalkan seviyesi onun savunmasını büyütür.
     * Verilmezse Lvl 0 sayılır ve sonuç eski hesapla birebir aynı çıkar.
     */
    attackerLevels = null, defenderLevels = null,
    /**
     * KAHRAMAN — savaşa üç kanaldan giriyor:
     *
     *   kahramanSaldiriGucu  saldırana eklenen HAM güç (kahramanın kendi
     *                        vuruşu; tek birim gibi davranır)
     *   kahramanSaldiriYuzde saldıran ordunun TOPLAMINA yüzde ek
     *   kahramanSavunmaYuzde savunanın toplamına yüzde ek
     *
     * Ham güç PİYADE sayılıyor: kahraman yaya savaşıyor, süvari oranını
     * kaydırıp savunanın atlı/yaya dengesini bozmamalı.
     *
     * Yüzde ekler SUR bonusundan AYRI çarpan: sur bonusuyla toplansaydı
     * ikisinin tavanı tek bir tavana sıkışır ve "surum yüksek, kahraman
     * hiçbir şey katmıyor" gibi görünmez bir tavan etkisi doğardı.
     */
    kahramanSaldiriGucu = 0, kahramanSaldiriYuzde = 0, kahramanSavunmaYuzde = 0,
    /**
     * KAHRAMAN EŞYALARININ BİRİM BONUSU — İlkan'ın özel isteği:
     * *"itemler tek tek birimlerin saldırı ve def puanlarını arttırabilsin"*.
     *
     * Biçim: { piyade:{saldiri,savunma}, suvari:{saldiri,savunma} } — YÜZDE.
     * Düz sayı olsaydı 10 askerlik orduda devasa, 1000 askerlik orduda
     * görünmez olurdu.
     *
     * EKİPMAN HAVUZUNDAN AYRI uygulanıyor (unitStats'e karışmıyor): aynı
     * yerden geçseydi kılıç/kalkan seviyelerinin dengesi bozulur ve oyuncu
     * hangi sistemin ne yaptığını ayırt edemezdi.
     *
     * SALDIRAN kendi eşyasının saldırı bonusunu, SAVUNAN kendi eşyasının
     * savunma bonusunu kullanıyor — kahraman tek yerde olabildiği için
     * ikisi aynı anda tek bir oyuncuya işlemiyor.
     */
    kahramanBirimSaldiri = null, kahramanBirimSavunma = null,
  } = options;

  /** Birim sınıfına göre yüzde çarpanı (bonus yoksa 1) */
  const sinifCarpani = (bonus, key, tur) => {
    const sinif = UNIT_DEFS[key]?.category;
    const yuzde = bonus?.[sinif]?.[tur] || 0;
    return 1 + Math.max(0, yuzde) / 100;
  };

  // ── 1. Saldırgan tarafını topla ──────────────────────────────────
  let attackTotal = 0;
  let infAttack   = 0;
  let cavAttack   = 0;
  const attackerClean = {};
  // Savaşmayan ama orduyla yürüyen birimler (kuşatma makineleri, göçmen)
  const attackerCarried = {};

  for (const [key, rawCount] of Object.entries(attackerUnits)) {
    const count0 = Math.max(0, Math.floor(Number(rawCount) || 0));
    if (!isCombatUnit(key)) {
      if (count0 > 0 && UNIT_DEFS[key]) attackerCarried[key] = count0;
      continue;
    }
    const count = Math.max(0, Math.floor(Number(rawCount) || 0));
    if (count <= 0) continue;
    const def = UNIT_DEFS[key];
    const atk = count
      * (attackerLevels ? unitStats(key, attackerLevels).saldiri : def.stats.saldiri)
      * sinifCarpani(kahramanBirimSaldiri, key, 'saldiri');
    attackTotal += atk;
    if (def.category === 'piyade') infAttack += atk;
    else if (def.category === 'suvari') cavAttack += atk;
    attackerClean[key] = count;
  }

  // Kahramanın kendi vuruşu — piyade tarafına yazılıyor (bkz. yukarıdaki not)
  if (kahramanSaldiriGucu > 0) {
    attackTotal += kahramanSaldiriGucu;
    infAttack += kahramanSaldiriGucu;
  }
  // Ordunun tamamına yüzde ek: kahraman orduyu GÜÇLENDİRİR, yerine geçmez
  if (kahramanSaldiriYuzde > 0 && attackTotal > 0) {
    const carpan = 1 + kahramanSaldiriYuzde / 100;
    attackTotal *= carpan; infAttack *= carpan; cavAttack *= carpan;
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
      wallBonusPct: wallBonusPct(surLevel, hendekLevel, kulePct),
      infRatio: 0,
      cavRatio: 0,
      attackerLossRate: 0,
      defenderLossRate: 0,
      attackerLosses: {},
      defenderLosses: {},
      // Savaş olmadı: taşınan makineler de sağ döner
      attackerSurvivors: { ...attackerClean, ...attackerCarried },
      defenderSurvivors: defenderClean
    };
  }

  const infRatio = infAttack / attackTotal;
  const cavRatio = cavAttack / attackTotal;

  const kesif = mode === 'scout';

  let defenseRaw = 0;
  for (const [key, count] of Object.entries(defenderClean)) {
    const s = defenderLevels ? unitStats(key, defenderLevels) : UNIT_DEFS[key].stats;
    defenseRaw += count * (infRatio * s.yayaSav + cavRatio * s.atliSav)
      * sinifCarpani(kahramanBirimSavunma, key, 'savunma');
  }

  /**
   * KEŞİFTE YALNIZ KULE BONUSU İŞLER.
   *
   * Sur ve hendek ORDUYU durdurmak içindir; gece duvardan atlayan casusu
   * mazgal vurmaz. Kule başka: içinde okçu var, karanlıkta gözcülük
   * yapan tek yapı o. Eskiden üçü birden uygulanıyordu ve ölçülmüştü ki
   * savunanda 5 izci + Lvl 10 sur varken keşfi geçmek 23 izci istiyordu.
   *
   * İzcinin kendi değerleri de simetrik (10/10, bkz. militaryDefs), yani
   * kule yoksa sonucu doğrudan izci SAYISI belirliyor: beş casus iki
   * casusu yener.
   */
  const bonusPct = kesif
    ? wallBonusPct(0, 0, kulePct)
    : wallBonusPct(surLevel, hendekLevel, kulePct);
  const defenseTotal = defenseRaw
    * (1 + bonusPct / 100)
    * (1 + Math.max(0, kahramanSavunmaYuzde) / 100);

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

  /*
    TAŞINAN BİRİMLER ordunun kaybettiği ORANDA ölür. Gücü hesaba
    katılmadı ama riski paylaşıyorlar: ölen mancınık kuşatma yapmaz
    (bkz. game/kusatma.js) ve eve dönmez.
  */
  const tasinan = applyRate(attackerCarried, attackerLossRate);
  Object.assign(atk.losses, tasinan.losses);
  Object.assign(atk.survivors, tasinan.survivors);

  return {
    mode,
    winner,
    attackTotal:  +attackTotal.toFixed(2),
    defenseRaw:   +defenseRaw.toFixed(2),
    defenseTotal: +defenseTotal.toFixed(2),
    wallBonusPct: +bonusPct.toFixed(2),
    /*
      Raporda AYRI satır: oyuncu savaşı neden kazandığını/kaybettiğini
      görebilmeli. Sur bonusuyla tek sayıya karıştırırsak kahramana
      yatırım yapmanın işe yarayıp yaramadığı hiç ölçülemez.
    */
    kahramanSaldiriGucu: +(kahramanSaldiriGucu || 0).toFixed(2),
    kahramanSaldiriYuzde: +(kahramanSaldiriYuzde || 0).toFixed(2),
    kahramanSavunmaYuzde: +(kahramanSavunmaYuzde || 0).toFixed(2),
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

module.exports = { simulateBattle, wallBonusPct, towerBonusPct, K_LOSS_EXPONENT, RAID_LOSS_MULT };
