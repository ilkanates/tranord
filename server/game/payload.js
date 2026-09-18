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
const { getUpgradeSeconds, hexDistanceFromCenter, getSlotTotalMultiplier, getEquipmentCap, getEquipmentPool, getConsumptionRates, getSiegeCap, SIEGE_KEYS, getFoodOutlook, getStorageCaps } = require('./tick');
const ARMY = require('./army');
const { savunmaOzeti } = require('./combat');
const KUSATMA = require('./kusatma');
const GT = require('./gameTime');
const SAGLIK = require('./saglik');
const W = require('./world');
const CULTURE = require('./culture');
const { PRODUCTION_DEFS: BUILDING_DEFS, VILLAGE_DEFS, EQUIPMENT_DEFS, EQUIPMENT_BY_BUILDING, BASE_STATS } = require('../data');
const { equipmentUpgradeCost, equipmentUpgradeMinutes, EQUIPMENT_MAX_LEVEL, EQUIPMENT_UPGRADE_STEP, UPGRADABLE_EQUIPMENT, unitStats } = require('../data/militaryDefs');
const { WORLD } = require('../durum');
const { incomingMarchesFor } = require('./seferTakip');
const PAZAR = require('./pazar');
const PAZAR_YOL = require('./pazarYol');
const { getMaxProductionSlots } = require('./insaat');
const { popPerGameHour, buyumeCarpani, isciTamponu, getVillageBuildMinutes, getScaledUpgradeCost, refreshExpansionCredits, expansionFree, settlerCapacity, tarlaTavani, TARLA_TAVANI, TARLA_TAVANI_MERKEZ } = require('./koyKurallari');
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
  /*
    BİRLİK TANIMI DA SABİT: amblem listesi, rütbeler, ad sınırları.
    Buraya girmezse delta pakette `null` olarak gidip istemcideki
    listeyi eziyor ve amblem seçici boş kalıyor (İlkan bildirdi).
  */
  'birlikTanim',
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

  /*
    DEPO TAVANI TEK KAYNAKTAN — `tick.js · getStorageCaps`.

    Burada AYRI bir hesap duruyordu ve ayrışmıştı: taban değerler
    tick.js'te ham 1000 / işlenmiş 800 / ambar 600'e çıkarılmış ama bu
    kopya eski 300/200/150'de kalmıştı. Oyuncu keresteyi "200 tavanlı"
    görüyordu, gerçek tavan 800'dü — yani ekran ambarın dolduğunu
    söylerken ambar yarı boştu.

    Aynı şeyin iki yerde hesaplanması bu projede bugün üçüncü kez
    ısırdı (asker yemi muhasebesi, inşa reddi, şimdi depo tavanı).
  */
  const { caps: depotCapacities, granaryCap: granaryCapacity } = getStorageCaps(village);

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
    kalkan: getEquipmentCap(village,'kalkan'), zirh: getEquipmentCap(village,'zirh'), at: getEquipmentCap(village,'at'),
    // Kuşatma makineleri: ikisi ORTAK atölye kapasitesini paylaşıyor
    koc_basi: getEquipmentCap(village, 'koc_basi'),
    mancinik: getEquipmentCap(village, 'mancinik'),
  };
  /*
    KUŞATMA HAVUZU — cephanelik havuzundan AYRI, atölyenin kendi yeri.
    Ekipman rayında görünmüyordu: oyuncu koç başı/mancınık stokunu ve
    atölyenin dolup dolmadığını hiçbir yerden göremiyordu.
  */
  const kusatmaHavuz = (() => {
    const capacity = getSiegeCap(village);
    let used = 0;
    for (const k of SIEGE_KEYS) used += village.equipment?.[k] || 0;
    return { capacity, used, free: Math.max(0, capacity - used) };
  })();
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
    equipmentCaps, equipmentPool, kusatmaHavuz, buildQueue, equipmentQueues, equipmentByBuilding: EQUIPMENT_BY_BUILDING, equipmentDefs: EQUIPMENT_DEFS,
    army: { ...(village.army || {}) }, unitQueues, unitDefs: TRAINABLE_UNITS,
    unitsByBuilding: UNITS_BY_BUILDING, baseStats: BASE_STATS,
    // Rún Salonu: hangi birimler açık, sırada ne var
    research: { ...(village.research || {}) }, researchQueue,
    // Ekipman yükseltmeleri — ordunun tamamına anında işler
    equipmentLevels: { ...(village.equipmentLevels || {}) }, upgradeQueues, equipmentUpgrade,
    quests: opts.quests || null,
    /*
      OYUNCU KİMLİĞİ ve KARŞILAMA DURUMU.

      Bu üçü emitVillage'da hesaplanıp `opts` ile geliyordu ama payload'a
      HİÇ KOPYALANMIYORDU: istemcide `village.adVerilmedi` her zaman
      undefined kalıyor, adsız hesaba sorulan ad ekranı hiç açılmıyordu.
      Karşılama anlatımı da aynı alanlara baktığı için eklenirken ortaya
      çıktı.
    */
    playerName: opts.playerName || null,
    adVerilmedi: !!opts.adVerilmedi,
    egitimBitti: !!opts.egitimBitti,
    // Üst bardaki mesaj rozeti (bkz. index.js · emitVillage)
    mesajOkunmamis: opts.mesajOkunmamis || 0,
    /* Grup mesajları ayrı sayılıyor; rozet ikisini istemcide topluyor */
    grupOkunmamis: opts.grupOkunmamis || 0,
    /*
      KAHRAMAN özeti. `opts`'a koymak YETMEZ — payload nesnesine bu satırla
      kopyalanmazsa istemciye hiç gitmez; adVerilmedi tam bu yüzden aylarca
      ölü kalmıştı (bkz. yukarıdaki not).
    */
    kahraman: opts.kahraman || null,
    /*
      KESE — gumus/altin bakiyesi ve kurlar. `opts` degerleri pakete
      KENDILIGINDEN kopyalanmiyor; her alan buraya tek tek yazilmali
      (bu tuzaga bu projede defalarca dusuldu).
    */
    kese: opts.kese || null,
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
      /*
        GERİ ÇAĞIRMA PENCERESİ. Alan adı `...TimeLeft` ile bitiyor: istemci
        `shiftTimers` ile bu eki tanıyıp iki yayın arasında kendisi sayıyor.
        Sunucu sessizken düğmenin 30 sn boyunca canlı görünmesini engelliyor.
      */
      geriCagirTimeLeft: ARMY.geriCagirmaKalan(m),
    })),
    /*
      TAKVİYE — İKİ AYRI GÖRÜNÜM.

      `takviyeler`  : BU köyde misafir duran birlikler (ev sahibi görür —
                      kimin kaç askeri burada, kimi besliyorum).
      `takviyelerim`: BENİM askerimin durduğu köyler (sahibi görür — geri
                      çağırma düğmesi bunu kullanır).

      İkisi ayrı olmak zorunda: ev sahibi misafirin sahibini bilir ama
      onu geri çağıramaz; sahibi de ev sahibinin köyünün içini görmez.
    */
    /*
      EV SAHİBİNİN LİSTESİ de GÖNDEREN KÖY başına gruplanıyor: aynı köyden
      üç sevkiyat gelmişse üç satır değil bir satır. Sahibin kendi
      listesiyle (takviyelerim) aynı mantık — iki tarafta iki farklı
      gruplama, aynı askerleri farklı sayıda satırda gösterirdi.

      Kayıt birleşmiyor; gruplama yalnız görünümde (bkz. army.js ·
      takviyeGeriCagir, kayıp payı geliş sırasına bakıyor).
    */
    takviyeler: (() => {
      const gruplar = new Map();
      for (const t of village.takviyeler || []) {
        const anahtar = `${t.userId}|${t.slotKey}`;
        const onceki = gruplar.get(anahtar);
        if (onceki) {
          for (const [k, n] of Object.entries(t.units || {})) {
            onceki.units[k] = (onceki.units[k] || 0) + (n || 0);
          }
          onceki.toplam = ARMY.totalUnits(onceki.units);
          onceki.girdiSayisi += 1;
          onceki.at = Math.min(onceki.at, t.at);
          continue;
        }
        gruplar.set(anahtar, {
          id: t.id, userId: t.userId, slotKey: t.slotKey,
          fromName: t.fromName, units: { ...t.units }, at: t.at,
          toplam: ARMY.totalUnits(t.units), girdiSayisi: 1,
        });
      }
      return [...gruplar.values()];
    })(),
    takviyelerim: opts.takviyelerim || [],
    /*
      SAVUNMA YAPILARI — sur, hendek ve her kule AYRI AYRI yüzde olarak.
      Tek bir toplam sayı "hangisini yükselteyim" sorusunu
      cevaplamıyordu (bkz. combat.js · savunmaOzeti).
    */
    savunmaYapilari: savunmaOzeti(village),
    /*
      REVİR — çadırda yatan yaralılar. Oyuncu "kaç askerim iyileşiyor,
      ne kadar kaldı, çadırım dolu mu" sorularının hiçbirini raporun
      tek satırından cevaplayamaz; bu yüzden sürekli görünen bir durum.
    */
    saglik: SAGLIK.ozet(village, ARMY.buildingLevel(village, 'saglikCadiri')),
    incoming: incomingMarchesFor(`${village.worldQ || 0},${village.worldR || 0}`),
    /*
      RAPORLAR HESAP ÇAPINDA. Eskiden yalnız bu köyün raporları
      gidiyordu; okunma kaydı hesap çapında tutulduğu için oyuncu köy
      değiştirince rozet yeniden yanıyor, ikinci köyünün savaşını
      kaçırabiliyordu (İlkan bildirdi). Liste çağıranda birleştiriliyor
      — köy nesnesi öteki köyleri bilmiyor.
    */
    reports: opts.tumRaporlar || (village.reports || []).slice(0, opts.raporSayfaBoyu || 25),
    /* Sayfalama için: kaç rapor var ve bir sayfa kaç satır (bkz. index.js) */
    raporToplam: opts.raporToplam ?? null,
    raporSayfaBoyu: opts.raporSayfaBoyu ?? null,
    /* Filtre rozetlerinin sayıları — TÜM raporlardan (bkz. raporTur.js) */
    raporSayilari: opts.raporSayilari || null,
    /*
      TARLA TAVANI istemciye de gidiyor: yükseltme düğmesi sunucunun
      reddedeceği bir şeyi açık göstermemeli ve oyuncu "neden
      yükseltemiyorum" sorusunun cevabını ekranda bulmalı.
    */
    /*
      YOLDAKİ SEFERLER — oyuncunun BÜTÜN köylerinden çıkan, şu an
      yürüyen seferler. Haritadaki canlı rozet bunu çiziyor; paketteki
      `marches` yalnız aktif köyün seferleri olduğu için yetmiyor.
    */
    yoldakiSeferler: opts.yoldakiSeferler || {},
    digerKoySeferleri: opts.digerKoySeferleri || [],
    merkezTasimaBedeli: opts.merkezTasimaBedeli || null,
    /*
      ACEMİ KALKANI. Görünmeyen bir koruma korumak değil güven sorunu:
      oyuncu ne kadar güvende olduğunu ve ne zaman biteceğini bilmeli.
    */
    acemiKalkani: opts.acemiKalkani || null,
    /*
      ADMİN BAYRAĞI — yalnız admin oturumunda geliyor, ötekilerde alan
      hiç yok. Panelin varlığını admin olmayan öğrenmiyor.

      YETKİ DEĞİL, arayüz ipucu: gerçek kontrol her istekte sunucuda
      (server/admin.js · adminGate). İstemci bunu kendi kendine true
      yapsa hiçbir kapı açılmıyor.
    */
    ...(opts.admin ? { admin: true } : {}),
    /* Sığınağın her kaynakta gizlediği miktar (bkz. game/siginak.js) */
    siginakGizleme: opts.siginakGizleme ?? 0,
    tarlaTavani: tarlaTavani(village),
    tarlaTavanlari: { normal: TARLA_TAVANI, merkez: TARLA_TAVANI_MERKEZ },
    intel: village.intel || {},
    /*
      SALDIRI İZLERİ — haritada vurduğum köylerin üstünde kılıç çıksın
      (bkz. army.js · saldirilarim).
    */
    /*
      GERİ DOLDURMA BURADA TETİKLENİYOR: kayıt yoksa raporlardan
      türetiliyor ve köye yazılıyor, bir daha çalışmıyor. Yükleme
      yolunda değil paket yolunda olmasının sebebi, köyün her giriş
      yolunda (boot, göç, yeni köy) tek tek çağırmak gerekmemesi.
    */
    saldirilarim: (ARMY.saldiriIzleriniGeriDoldur(village), village.saldirilarim || {}),
    marchInfo: {
      // İstemci yürüyüş süresini bunlarla hesaplar: hız = saatte hex,
      // bir oyun saati de hourSeconds gerçek saniye sürer.
      hourSeconds: GT.HOUR_SECONDS,
      minMarchMinutes: ARMY.MIN_MARCH_MINUTES,
      raidLootShare: ARMY.RAID_LOOT_SHARE,
      scoutUnits: [...ARMY.SCOUT_UNITS],
      maxMarches: MAX_MARCHES_PER_TOWN,
      geriCagirmaSaniye: ARMY.GERI_CAGIRMA_SANIYE,
      /*
        MANCINIK İKİNCİ HEDEFİ — atölye seviyesi SALDIRANIN köyüne ait,
        o yüzden hedefin değil kendi payload'ımızda gidiyor. İstemci ikinci
        seçim kutusunu buna bakarak açıyor; karar yine sunucuda.
      */
      atolyeSeviye: ARMY.buildingLevel(village, 'atolye'),
      ikiHedefMinAtolye: KUSATMA.IKI_HEDEF_MIN_ATOLYE,
      protected: !village.hasAttacked && ARMY.totalUnits(village.army) < PROTECT_MIN_ARMY,
      protectMinArmy: PROTECT_MIN_ARMY,
    },
    productionPerHour, depotCapacities, granaryCapacity, processingRates,
    populationGrowthRate: village.population < village.maxPopulation ? 1 : 0,
    // Gerçek artış hızı — arayüz "+X/sa" ve "+1 nüfus için kalan süre" gösteriyor
    /*
      GERÇEK büyüme hızı gönderiliyor — ham `popPerGameHour` değil.
      Boş işçi tamponu dolunca büyüme duruyor (madde 14); ekranda hâlâ
      "19/saat" yazsaydı oyuncu durmanın sebebini hiçbir yerde göremezdi.
    */
    populationPerHour: Math.round(
      popPerGameHour(village.villageBuildings['0,0']?.level) * buyumeCarpani(village) * 10) / 10,
    populationPerHourTavan: popPerGameHour(village.villageBuildings['0,0']?.level),
    isciTamponu: Math.round(isciTamponu(village)),

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
    /*
      BİRLİK. `opts`'a koymak yetmiyor — buildPayload alanları tek tek
      kopyalıyor, buraya satır eklenmezse veri sessizce kaybolur.
    */
    birlik: opts.birlik || null,
    /*
      HARİTA RENGİ İÇİN: yürürlükteki diplomasi ve elle konan
      işaretler. Bu dosyanın kuralı — opts alanları KENDİLİĞİNDEN
      kopyalanmıyor, her biri burada açıkça yazılmalı.
    */
    birlikIliskilerim: opts.birlikIliskilerim || {},
    isaretlerim: opts.isaretlerim || {},
    birlikDavetlerim: opts.birlikDavetlerim || [],
    birlikTanim: opts.birlikTanim || null,
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
    pazar: {
      /*
        PAZARIN KÖYÜ. İstemci "hedef, bulunduğum köyün kendisi mi"
        denetimini bununla yapıyor; alan yokken denetim sessizce
        çalışmıyor ve oyuncu reddedilecek bir düğmeye basıyordu.
        `activeSlot` ile AYNI kaynaktan geliyor — ikinci bir tanım değil.
      */
      slotKey: opts.activeSlot || null,
      ...PAZAR.pazarOzeti(village, depotCapacities, granaryCapacity),
      // Kendi açtığım teklifler ve yoldaki gönderilerim
      teklifler: (village.teklifler || []).map((t) => ({
        id: t.id, veren: t.veren, verenMiktar: t.verenMiktar,
        alan: t.alan, alanMiktar: t.alanMiktar, tuccar: t.tuccar, at: t.at,
      })),
      gonderiler: PAZAR_YOL.ozet(village, speed),
    },
    isStarving: !!village.isStarving, starveCounter: village.starveCounter || 0,
    /*
      YİYECEK ÖNGÖRÜSÜ — açlık BAŞLAMADAN uyarmak için. Hesap sunucuda
      (zincir oranları ve tüketim sabitleri orada), istemci yalnız
      gösteriyor (bkz. tick.js · getFoodOutlook).
    */
    yiyecek: getFoodOutlook(village),
    consumption, tickMs, tickMsRange: { min: MIN_TICK_MS, max: MAX_TICK_MS, default: DEFAULT_TICK_MS },
    // İstemci kaynakları iki yayın ARASINDA kendisi ilerletiyor; bunun için
    // dünya hızını bilmesi gerekiyor (bkz. client/src/flows.js extrapolate).
    worldSpeed: WORLD.speed,
    villageBuildings: Object.fromEntries(
      Object.entries(village.villageBuildings).map(([k, b]) => [k, {
        ...b,
        buildTimeLeft: b.building ? GT.clockToRealSeconds(b.buildEndTime - now, speed) : null,
        // Yıkım geri sayımı — arayüz "yıkılıyor" rozetini bununla gösteriyor
        yikimTimeLeft: b.yikiliyor ? GT.clockToRealSeconds(b.yikimEndTime - now, speed) : null,
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
