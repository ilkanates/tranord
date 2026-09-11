/**
 * İSTEMCİYE GİDEN KÖY PAKETİ.
 *
 * server/index.js'ten AYNEN taşındı. Oyunun bütün durumunu tek bir JSON'a
 * çeviren yer olduğu için doğası gereği GENİŞ: aşağıdaki uzun require
 * listesi bir tasarım kokusu değil, bu fonksiyonun işinin tanımı.
 *
 * Paket delta mantığıyla gidiyor: sabit tanımlar (STATIC_PAYLOAD_KEYS)
 * bağlantı başına bir kez, gerisi yapısal değişiklikte. İstemci geleni
 * öncekinin üzerine birleştirdiği için eksik alanlar sorun değil
 * (bkz. client/src/App.jsx setServerVillage).
 */
const { WALL_SLOTS_ARR: WALL_SLOT_NAMES, civilianCount } = require('./villageState');
const { getUpgradeSeconds, hexDistanceFromCenter, getSlotTotalMultiplier, getEquipmentCap, getEquipmentPool, getConsumptionRates } = require('./tick');
const ARMY = require('./army');
const GT = require('./gameTime');
const W = require('./world');
const CULTURE = require('./culture');
const { PRODUCTION_DEFS: BUILDING_DEFS, VILLAGE_DEFS, EQUIPMENT_DEFS, EQUIPMENT_BY_BUILDING, BASE_STATS } = require('../data');
const { equipmentUpgradeCost, equipmentUpgradeMinutes, EQUIPMENT_MAX_LEVEL, EQUIPMENT_UPGRADE_STEP, UPGRADABLE_EQUIPMENT, unitStats } = require('../data/militaryDefs');
const { WORLD } = require('../durum');
const { incomingMarchesFor } = require('./seferTakip');
const PAZAR = require('./pazar');
const { getMaxProductionSlots } = require('./insaat');
const { popPerGameHour, getVillageBuildMinutes, getScaledUpgradeCost, refreshExpansionCredits, expansionFree, settlerCapacity } = require('./koyKurallari');
const { DEFAULT_TICK_MS, MIN_TICK_MS, MAX_TICK_MS, MAX_MARCHES_PER_TOWN, PROTECT_MIN_ARMY } = require('../sabitler');
const { TRAINABLE_UNITS, UNITS_BY_BUILDING } = require('./birimler');

/**
 * SABİT TANIMLAR — bağlantı başına BİR kez gönderilir.
 *
 * Birim/ekipman tanımları, temel savaş istatistikleri ve tick aralıkları
 * oyun boyunca değişmiyor; her tick'te yeniden yollamak boşuna trafik.
 * İstemci gelen paketi öncekinin üzerine birleştirdiği için eksik alanlar
 * sorun değil.
 */
const STATIC_PAYLOAD_KEYS = [
  'unitDefs', 'baseStats', 'unitsByBuilding',
  'equipmentDefs', 'equipmentByBuilding', 'tickMsRange',
  'festivalDefs',
];

function buildPayload(village, tickMs, opts = {}) {
  // opts.session verilirse çoklu köy alanları da eklenir (aşağıda)
  const productionPerHour = { odun:0, kil:0, tas:0, demir:0, tahil:0 };
  Object.entries(village.productionTiles).forEach(([slotKey, b]) => {
    if (b.workers > 0 && b.level >= 1) {
      const def = BUILDING_DEFS[b.type];
      if (def) {
        const mult = getSlotTotalMultiplier(slotKey, b.type, village);
        productionPerHour[b.type] = (productionPerHour[b.type] || 0) + b.workers * def.baseProductionPerWorker * mult;
      }
    }
  });

  const processingRates = {};
  Object.values(village.villageBuildings).forEach(b => {
    const def = VILLAGE_DEFS[b.type];
    if (def?.processes && b.level > 0) {
      const { input, inputPerHour, output, outputPerHour } = def.processes;
      const w = b.workers || 0;
      processingRates[output] = { input, inputPerHour: inputPerHour * w, outputPerHour: outputPerHour * w, workers: w, maxWorkers: b.level * (def.workersPerLevel || 3) };
    }
  });

  const depotCapacities = { odun:300, kil:300, tas:300, demir:300, tahil:300, kereste:200, tugla:200, yontmaTas:200, demirKulce:200 };
  let granaryCapacity = 150;
  Object.values(village.villageBuildings).forEach(b => {
    const def = VILLAGE_DEFS[b.type];
    if (!def?.stores || (b.building && b.level === 0)) return;
    const cap = def.baseCapacity + Math.max(0, b.level - 1) * def.capacityPerLevel;
    if (b.type === 'granary') granaryCapacity += cap;
    else def.stores.forEach(res => { depotCapacities[res] = (depotCapacities[res] || 0) + cap; });
  });

  const consumption = getConsumptionRates(village);
  const now = village.clockMs;          // kalan süreler sanal saate göre
  // Hız çarpanı: 1000 ms tick = 1×. Kalan süreler oyuncunun hızına göre yazılır.
  const speed = WORLD.speed;

  const equipmentQueues = Object.fromEntries(
    Object.entries(village.equipmentQueues || {}).map(([bt, q]) => [bt, q.map(o => ({
      id: o.id, type: o.type, remaining: o.remaining, total: o.total,
      waiting: !!o.waiting, waitingReason: o.waitingReason || null,
      workersAtStart: o.workersAtStart || null,
      timeLeft: o.endTime ? GT.clockToRealSeconds(o.endTime - now, speed) : null
    }))])
  );

  const unitQueues = Object.fromEntries(
    Object.entries(village.unitQueues || {}).map(([bt, q]) => [bt, (q || []).map(o => ({
      id: o.id, type: o.type, remaining: o.remaining, total: o.total,
      waiting: !!o.waiting, waitingReason: o.waitingReason || null,
      workersAtStart: o.workersAtStart || null,
      timeLeft: o.endTime ? GT.clockToRealSeconds(o.endTime - now, speed) : null
    }))])
  );

  /**
   * ARAŞTIRMA KUYRUĞU — eğitim kuyruğuyla aynı biçim, tek sıra.
   * Süre gerçek saniyeye çevrilerek gidiyor; istemci geri sayımı kendi yapıyor.
   */
  const researchQueue = (village.researchQueue || []).map(o => ({
    id: o.id, type: o.type,
    waiting: !!o.waiting, waitingReason: o.waitingReason || null,
    workersAtStart: o.workersAtStart || null,
    timeLeft: o.endTime ? GT.clockToRealSeconds(o.endTime - now, speed) : null,
  }));

  /**
   * BİR SONRAKİ SEVİYENİN bedeli ve süresi sunucuda hesaplanıp gönderiliyor.
   * İstemcide formülün ikizini tutmak iki doğruluk kaynağı demek olurdu:
   * denge değişince panel yanlış rakam gösterirdi.
   */
  const equipmentUpgrade = Object.fromEntries(
    UPGRADABLE_EQUIPMENT.map(eq => {
      const lv = village.equipmentLevels?.[eq] || 0;
      const tavanda = lv >= EQUIPMENT_MAX_LEVEL;
      return [eq, {
        level: lv, maxLevel: EQUIPMENT_MAX_LEVEL,
        cost: tavanda ? null : equipmentUpgradeCost(lv),
        minutes: tavanda ? null : equipmentUpgradeMinutes(lv),
        bonusPct: Math.round(EQUIPMENT_UPGRADE_STEP * lv * 1000) / 10,
      }];
    })
  );

  /**
   * Birimlerin YÜKSELTMELERLE güncel değerleri. Ekranlar `unitDefs.stats`
   * yerine bunu okursa oyuncu kartta gerçek gücünü görür; yükseltme
   * yoksa değerler tanımın aynısı olur.
   */
  const unitStatsNow = Object.fromEntries(
    Object.keys(TRAINABLE_UNITS).map(k => [k, unitStats(k, village.equipmentLevels || {})])
  );

  /** Ekipman yükseltme kuyrukları — bina başına tek sıra */
  const upgradeQueues = Object.fromEntries(
    Object.entries(village.upgradeQueues || {}).map(([bt, q]) => [bt, (q || []).map(o => ({
      id: o.id, type: o.type, toLevel: o.toLevel || null,
      waiting: !!o.waiting, waitingReason: o.waitingReason || null,
      workersAtStart: o.workersAtStart || null,
      timeLeft: o.endTime ? GT.clockToRealSeconds(o.endTime - now, speed) : null,
    }))])
  );

  const equipmentCaps = {
    kilic: getEquipmentCap(village,'kilic'), mizrak: getEquipmentCap(village,'mizrak'),
    kalkan: getEquipmentCap(village,'kalkan'), zirh: getEquipmentCap(village,'zirh'), at: getEquipmentCap(village,'at')
  };
  // Kılıç/mızrak/kalkan/zırh ortak havuzu — client tek bar olarak gösterir
  const equipmentPool = getEquipmentPool(village);

  // Devam eden inşaat/yükseltmeler — client sağ rayda liste olarak gösterir
  const buildQueue = [];
  Object.entries(village.villageBuildings).forEach(([slotKey, b]) => {
    if (!b.building) return;
    const isNew = b.level === 0;
    buildQueue.push({
      area: 'village', slotKey, type: b.type,
      name: VILLAGE_DEFS[b.type]?.name || b.type,
      kind: isNew ? 'build' : 'upgrade',
      fromLevel: b.level, toLevel: b.level + 1,
      workers: b.buildWorkers || 0,
      timeLeft: GT.clockToRealSeconds(b.buildEndTime - now, speed),
      totalSeconds: GT.clockToRealSeconds(
        GT.minutesToClock(getVillageBuildMinutes(b.type, b.level + 1, b.buildWorkers || 1)), speed),
      refund: isNew ? (VILLAGE_DEFS[b.type]?.cost || {}) : (getScaledUpgradeCost(b.type, b.level) || {}),
    });
  });
  Object.entries(village.productionTiles).forEach(([slotKey, b]) => {
    if (!b.upgrading) return;
    const isNew = b.level === 0;
    const def = BUILDING_DEFS[b.type];
    buildQueue.push({
      area: 'production', slotKey, type: b.type,
      name: def?.name || b.type,
      kind: isNew ? 'build' : 'upgrade',
      fromLevel: b.level, toLevel: b.level + 1,
      workers: b.upgradeWorkersAssigned || 0,
      timeLeft: GT.clockToRealSeconds(b.upgradeEndTime - now, speed),
      totalSeconds: GT.clockToRealSeconds(
        GT.minutesToClock(getUpgradeSeconds(b.type, b.level, b.upgradeWorkersAssigned || 1)), speed),
      refund: def?.levels?.[b.level]?.cost || {},
    });
  });
  buildQueue.sort((a, b) => a.timeLeft - b.timeLeft);

  const payload = {
    // TEK HARİTA: köyün dünya merkezi — client tarla bonuslarını buna göre hesaplar
    world: {
      q: village.worldQ || 0,
      r: village.worldR || 0,
      radius: W.WORLD_RADIUS,
      claimRadius: W.CLAIM_RADIUS,
      name: WORLD.playerBySlot.get(`${village.worldQ || 0},${village.worldR || 0}`)?.name
        || WORLD.slotByKey.get(`${village.worldQ || 0},${village.worldR || 0}`)?.name
        || 'Köyün',
    },
    population: village.population, maxPopulation: village.maxPopulation, freeWorkers: village.freeWorkers,
    // Ev tavanı yalnız sivilleri sınırlar; arayüz "siviller / tavan" gösterir
    civilians: civilianCount(village),
    // Yuvarlama SADECE burada: motor içinde kesirli kalır, yoksa 1× ölçekte
    // tick başına düşen küçük artışlar yuvarlanarak yok oluyor.
    resources: Object.fromEntries(Object.entries(village.resources)
      .map(([k, n]) => [k, Math.round((n || 0) * 10) / 10])),
    equipment: { ...(village.equipment || {}) },
    equipmentCaps, equipmentPool, buildQueue, equipmentQueues, equipmentByBuilding: EQUIPMENT_BY_BUILDING, equipmentDefs: EQUIPMENT_DEFS,
    army: { ...(village.army || {}) }, unitQueues, unitDefs: TRAINABLE_UNITS,
    unitsByBuilding: UNITS_BY_BUILDING, baseStats: BASE_STATS,
    // Rún Salonu: hangi birimler açık, sırada ne var
    research: { ...(village.research || {}) }, researchQueue,
    // Ekipman yükseltmeleri — ordunun tamamına anında işler
    equipmentLevels: { ...(village.equipmentLevels || {}) }, upgradeQueues, equipmentUpgrade,
    quests: opts.quests || null,
    // Yerleşim hakkı — köşk/saray panelinde gösteriliyor
    expansion: {
      earned: refreshExpansionCredits(village),
      used: village.expansionUsed || 0,
      free: expansionFree(village),
      settlers: settlerCapacity(village),
      founded: (village.foundedVillages || []).slice(-10),
    },
    unitStatsNow,
    // SEFERLER — timeLeft gerçek zamana göre (köy saatine değil)
    marches: (village.marches || []).map(m => ({
      id: m.id, mode: m.mode, phase: m.phase,
      toKey: m.toKey, toName: m.toName, fromName: m.fromName,
      units: { ...m.units }, distance: m.distance,
      loot: m.loot ? { ...m.loot } : null,
      legSeconds: m.legSeconds,
      timeLeft: GT.clockToRealSeconds(
        GT.hoursToClock(Math.max(0, m.remainingHours ?? 0)), speed),
    })),
    incoming: incomingMarchesFor(`${village.worldQ || 0},${village.worldR || 0}`),
    reports: (village.reports || []).slice(0, 25),
    intel: village.intel || {},
    marchInfo: {
      // İstemci yürüyüş süresini bunlarla hesaplar: hız = saatte hex,
      // bir oyun saati de hourSeconds gerçek saniye sürer.
      hourSeconds: GT.HOUR_SECONDS,
      minMarchMinutes: ARMY.MIN_MARCH_MINUTES,
      raidLootShare: ARMY.RAID_LOOT_SHARE,
      scoutUnits: [...ARMY.SCOUT_UNITS],
      maxMarches: MAX_MARCHES_PER_TOWN,
      protected: !village.hasAttacked && ARMY.totalUnits(village.army) < PROTECT_MIN_ARMY,
      protectMinArmy: PROTECT_MIN_ARMY,
    },
    productionPerHour, depotCapacities, granaryCapacity, processingRates,
    populationGrowthRate: village.population < village.maxPopulation ? 1 : 0,
    // Gerçek artış hızı — arayüz "+X/sa" ve "+1 nüfus için kalan süre" gösteriyor
    populationPerHour: popPerGameHour(village.villageBuildings['0,0']?.level),

    /**
     * KÜLTÜR PUANI ve genişleme durumu. `culture` tek nesnede geliyor:
     * mevcut puan, günlük üretim, sıradaki eşik, neyin engellediği.
     */
    /**
     * KÜLTÜR PUANI oyuncuya ait: bütün köylerin katkısı toplanır. Köy
     * nesnesinde her köy kendi payını biriktiriyor (kalıcılık ve merkez
     * taşınması bu şekilde sorunsuz).
     */
    culturePoints: Math.floor(opts.culturePoints ?? (village.culturePoints || 0)),
    culture: opts.culture || {
      ...CULTURE.expansionStatus([village], village.culturePoints || 0, VILLAGE_DEFS),
      points: Math.floor(village.culturePoints || 0),
    },
    // ÇOKLU KÖY: değiştirici için hafif liste + hangi köyün açık olduğu
    villages: opts.villages || null,
    activeSlot: opts.activeSlot || null,
    capitalSlot: opts.capitalSlot || null,
    /**
     * Oyuncu çapında TEK olan binalar hangi köyde? (`{ saray: '0,0' }`)
     * Arayüz bunu bilmezse "kur" düğmesini açık gösterip sunucunun sessizce
     * reddetmesine yol açıyor — saray tam bunu yapıyordu.
     */
    uniqueOwners: opts.uniqueOwners || null,
    isCapital: village.isCapital !== false,
    festival: village.festival
      ? {
        kind: village.festival.kind,
        label: CULTURE.FESTIVALS[village.festival.kind]?.label || village.festival.kind,
        timeLeft: GT.clockToRealSeconds(
          Math.max(0, village.festival.endTime - village.clockMs), WORLD.speed),
        cpAtStart: village.festival.cpAtStart,
      }
      : null,
    festivalDefs: CULTURE.FESTIVALS,
    /*
      PAZAR — tüccar kapasitesi ve takasa girebilen kaynaklar. Oranları
      istemci kendi hesaplamıyor; sunucu ne derse o (bkz. game/pazar.js).
    */
    pazar: PAZAR.pazarOzeti(village, depotCapacities, granaryCapacity),
    isStarving: !!village.isStarving, starveCounter: village.starveCounter || 0,
    consumption, tickMs, tickMsRange: { min: MIN_TICK_MS, max: MAX_TICK_MS, default: DEFAULT_TICK_MS },
    // İstemci kaynakları iki yayın ARASINDA kendisi ilerletiyor; bunun için
    // dünya hızını bilmesi gerekiyor (bkz. client/src/flows.js extrapolate).
    worldSpeed: WORLD.speed,
    villageBuildings: Object.fromEntries(
      Object.entries(village.villageBuildings).map(([k, b]) => [k, {
        ...b,
        buildTimeLeft: b.building ? GT.clockToRealSeconds(b.buildEndTime - now, speed) : null,
        upgradeCost: getScaledUpgradeCost(b.type, b.level)
      }])
    ),
    towerSlots: [...village.TOWER_SLOTS],
    wallSlots: WALL_SLOT_NAMES,
    productionRing1: [...village.PRODUCTION_RING_1],
    maxProductionSlots: getMaxProductionSlots(village),
    productionTiles: Object.fromEntries(
      Object.entries(village.productionTiles).map(([k, b]) => {
        const def  = BUILDING_DEFS[b.type];
        return [k, {
          ...b,
          ring: hexDistanceFromCenter(k),
          efficiency: getSlotTotalMultiplier(k, b.type, village),
          maxWorkers: def?.levels[b.level - 1]?.workers || 1,
          upgradeCost: def?.levels[b.level]?.cost || null,
          upgradeTimeLeft: b.upgrading ? GT.clockToRealSeconds(b.upgradeEndTime - now, speed) : null
        }];
      })
    )
  };

  // Sabit tanımlar yalnız istendiğinde; raporlar yalnız değiştiğinde
  if (!opts.statics) for (const k of STATIC_PAYLOAD_KEYS) delete payload[k];
  if (!opts.reports) delete payload.reports;
  return payload;
}

module.exports = { buildPayload, STATIC_PAYLOAD_KEYS };
