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
 * Sağlık Çadırı ve Kule TODO.md'de.
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
/*
  MORAL BONUSU KALDIRILDI (İlkan'ın kararı, 16 Eylül 2026).

  Saldıranın nüfusu savunanınkinden büyükse savunana ek savunma
  yüzdesi veriliyordu — `(a/d)^0,2 − 1`, tavan %50. Amacı büyük
  oyuncunun küçüğü yağmalamasını pahalı kılmaktı.

  Fonksiyon, sabitleri ve savaş çarpanı BİRLİKTE kaldırıldı; geri
  gelecekse üçü birden gelmeli. Kullanılmayan bir `moralPct` seçeneği
  bırakmak "moral var ama çalışmıyor" gibi okunan bir tuzak olurdu.
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
     * Ham güç KAHRAMANIN SINIFINA yazılıyor: at kuşanmışsa SÜVARİ,
     * kuşanmamışsa PİYADE (İlkan'ın kararı). Sınıf savunanın atlı/yaya
     * dengesini kaydırıyor — atlı bir kahramana karşı mızrakçı, yaya bir
     * kahramana karşı kalkancı işe yarıyor. Hep piyade saysaydık at
     * kuşanmanın savaşta hiçbir anlamı olmazdı.
     *
     * Yüzde ekler SUR bonusundan AYRI çarpan: sur bonusuyla toplansaydı
     * ikisinin tavanı tek bir tavana sıkışır ve "surum yüksek, kahraman
     * hiçbir şey katmıyor" gibi görünmez bir tavan etkisi doğardı.
     */
    kahramanSaldiriGucu = 0, kahramanSaldiriYuzde = 0, kahramanSavunmaYuzde = 0,
    /**
     * KAHRAMAN ATLI MI? At kuşanmışsa ham gücü SÜVARİ, değilse PİYADE
     * tarafına yazılıyor (İlkan'ın kararı: "kahraman atlı ise atlı gibi
     * vursun, at yoksa yaya askeri gibi"). Sınıf savunanın atlı/yaya
     * dengesini kaydırıyor: atlı kahramana karşı mızrakçı, yaya
     * kahramana karşı kalkancı işe yarıyor. Hep piyade saysaydık at
     * kuşanmanın savaşta hiçbir anlamı olmazdı.
     */
    kahramanSuvari = false,
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

  // Kahramanın kendi vuruşu — SINIFINA yazılıyor (bkz. yukarıdaki not)
  if (kahramanSaldiriGucu > 0) {
    attackTotal += kahramanSaldiriGucu;
    if (kahramanSuvari) cavAttack += kahramanSaldiriGucu;
    else infAttack += kahramanSaldiriGucu;
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
    kahramanSuvari: !!kahramanSuvari,
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

/**
 * SAVUNMA YAPILARININ KATKISI — YAPI YAPI, YÜZDE OLARAK.
 *
 * İlkan: *"ordu menüsünde mevcut defans binalarımın katkısını yüzde
 * olarak ayrı ayrı göster"*.
 *
 * Rapordaki tek `wallBonusPct` sayısı "surum mu kulem mi işe yarıyor"
 * sorusunu cevaplamıyordu: üçünün toplamı tek bir sayıya eriyordu ve
 * oyuncu hangisini yükseltmesi gerektiğini göremiyordu.
 *
 * TAVAN AYRI GÖSTERİLİYOR. Üçünün toplamı DEF_BONUS_CAP'i aşabilir;
 * o durumda `kirpilan` alanı kaç puanın boşa gittiğini söylüyor —
 * tavana dayanmış bir oyuncunun surunu yükseltmesi hiçbir işe yaramaz
 * ve bunu bilmesi gerekir.
 *
 * KULE DOLULUKLA ÖLÇEKLİ: boş kule sıfır veriyor. Kaç okçu eksik
 * olduğu da yazılıyor — kulesi olup okçusu olmayan oyuncunun kaybettiği
 * bonus, yükseltmeden önce bakması gereken ilk yer.
 */
function savunmaOzeti(village) {
  const bina = (tip) => Object.values(village?.villageBuildings || {})
    .find(b => b?.type === tip && b.level >= 1) || null;

  const sur = bina('sur');
  const hendek = bina('hendek');
  const surLv = sur?.level || 0;
  const henLv = hendek?.level || 0;

  const surPct = SUR_BONUS[clampLevel(surLv, SUR_BONUS)] || 0;
  const henPct = HENDEK_BONUS[clampLevel(henLv, HENDEK_BONUS)] || 0;

  /*
    KULELER TEK TEK. Toplam yeterli değil: altı kulenin biri boşsa
    oyuncu hangisini dolduracağını bilmeli.
  */
  const kuleler = [];
  let kuleToplam = 0;
  for (const [slotKey, b] of Object.entries(village?.villageBuildings || {})) {
    if (b?.type !== 'kule' || !(b.level >= 1)) continue;
    const maxOkcu = b.level * TOWER_ARCHERS_PER_LEVEL;
    const okcu = Math.max(0, Math.min(maxOkcu, b.workers || 0));
    const doluluk = maxOkcu > 0 ? okcu / maxOkcu : 0;
    const tamPct = (KULE_BONUS[clampLevel(b.level, KULE_BONUS)] || 0) / TOWER_SLOTS;
    const pct = Math.round(tamPct * doluluk * 10) / 10;
    kuleToplam += pct;
    kuleler.push({
      slotKey, seviye: b.level, okcu, maxOkcu,
      doluluk: Math.round(doluluk * 100),
      katki: pct,
      tamKatki: Math.round(tamPct * 10) / 10,
    });
  }
  /*
    TOPLAM, SAVAŞIN KENDİ FONKSİYONUNDAN geliyor — tek tek kulelerin
    toplamından DEĞİL.

    Ölçüldü: altı dolu Lvl 20 kulede tek tek yuvarlama %34,8 veriyor,
    savaşta kullanılan towerBonusPct ise %35. Ekranda 149,8 yazıp
    savaşta 150 uygulamak, ekranı yalancı yapardı. Satırlardaki sayılar
    GÖSTERİM için yuvarlı; toplam savaşla birebir.
  */
  kuleToplam = towerBonusPct(village);

  const ham = Math.round((surPct + henPct + kuleToplam) * 10) / 10;
  const etkin = Math.min(DEF_BONUS_CAP, ham);

  return {
    sur: { var: !!sur, seviye: surLv, katki: surPct, maxSeviye: SUR_BONUS.length - 1 },
    hendek: { var: !!hendek, seviye: henLv, katki: henPct, maxSeviye: HENDEK_BONUS.length - 1 },
    kuleler,
    kuleToplam,
    kuleSlot: TOWER_SLOTS,
    okcuPerSeviye: TOWER_ARCHERS_PER_LEVEL,
    ham,
    etkin,
    tavan: DEF_BONUS_CAP,
    kirpilan: Math.round((ham - etkin) * 10) / 10,
  };
}

module.exports = {
  simulateBattle, wallBonusPct, towerBonusPct, savunmaOzeti,
  K_LOSS_EXPONENT, RAID_LOSS_MULT,
};
