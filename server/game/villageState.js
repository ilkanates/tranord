/**
 * Yeni köy başlangıç state'i oluşturur.
 * Her kullanıcı için ayrı bir kopya döndürülür.
 */

/**
 * SAVUNMA SLOTLARI İSİMLİ — hex değil.
 *
 * Sur, hendek ve kuleler artık köyün İÇİNDE bir altıgen kaplamıyor: sur köyü
 * çevreliyor, hendek surun dışında, kuleler de surun altı köşesinde duruyor.
 * Bu yüzden anahtarları koordinat değil isim: 'sur', 'hendek', 'kule1'…'kule6'.
 * İnşa/yükseltme/yıkma/işçi akışları anahtarı koordinat olarak ayrıştırmıyor,
 * o yüzden isimli slotlar mevcut mekanikle olduğu gibi çalışıyor.
 */
const TOWER_SLOTS_ARR    = ['kule1', 'kule2', 'kule3', 'kule4', 'kule5', 'kule6'];
const WALL_SLOTS_ARR     = ['sur', 'hendek'];
const DEFENCE_TYPES      = new Set(['sur', 'hendek', 'kule']);
const PRODUCTION_RING_1  = ['1,0', '1,-1', '0,-1', '-1,0', '-1,1', '0,1'];

function createVillage(worldQ = 0, worldR = 0) {
  return {
    // TEK HARİTA: köyün dünya üzerindeki merkez koordinatı.
    // Üretim tarlaları bu merkeze GÖRE yerel anahtarlarla tutulur ('1,0' gibi);
    // arazi bonusu hesaplanırken worldQ+localQ kullanılır.
    worldQ, worldR,

    population: 50,
    maxPopulation: 50,
    freeWorkers: 50,
    tickCount: 0,
    // Sanal köy saati. İnşaat/yükseltme/kuyruk sayaçları BUNA bakar, Date.now()'a değil.
    // Böylece hızlı ileri alma (tohumlama, offline telafi) sırasında da inşaatlar tamamlanır.
    clockMs: Date.now(),

    isStarving: false,
    starveCounter: 0,

    resources: {
      odun: 200, kil: 150, tas: 150, demir: 50, tahil: 300,
      kereste: 0, tugla: 0, yontmaTas: 0, demirKulce: 0,
      un: 0, ekmek: 0
    },

    equipment: {
      kilic: 0, mizrak: 0, kalkan: 0, zirh: 0, at: 0
    },

    equipmentQueues: {
      silahci: [],
      zirh:    [],
      ahir:    []
    },
    nextOrderId: 1,

    army: {},

    // SEFERLER: bu köyden çıkan hareketler burada durur (sahiplik = kalıcılık).
    // Zaman alanları Date.now() tabanlı — köyün sanal saati DEĞİL; gerekçe
    // game/army.js başındaki nota bakınız.
    marches: [],
    reports: [],
    nextMarchId: 1,
    // Kalıcı savaş sayaçları (istatistik sıralamaları) — bkz. game/army.js
    stats: {
      attacksSent: 0, attacksWon: 0, killsOffense: 0, lossesOffense: 0,
      lootTotal: 0, scoutsSent: 0,
      defensesTotal: 0, defensesWon: 0, killsDefense: 0, lossesDefense: 0,
      lootLostTotal: 0,
    },

    unitQueues: {
      kisla:  [],
      ahir:   [],
      atolye: []
    },
    nextUnitOrderId: 1,

    productionTiles: {
      '1,0':  { type: 'odun',  level: 1, workers: 0, upgrading: false, upgradeEndTime: null, upgradeWorkersAssigned: 0 },
      '1,-1': { type: 'kil',   level: 1, workers: 0, upgrading: false, upgradeEndTime: null, upgradeWorkersAssigned: 0 },
      '0,-1': { type: 'tas',   level: 1, workers: 0, upgrading: false, upgradeEndTime: null, upgradeWorkersAssigned: 0 },
      '-1,0': { type: 'demir', level: 1, workers: 0, upgrading: false, upgradeEndTime: null, upgradeWorkersAssigned: 0 },
      '-1,1': { type: 'tahil', level: 1, workers: 0, upgrading: false, upgradeEndTime: null, upgradeWorkersAssigned: 0 },
      '0,1':  { type: 'tahil', level: 1, workers: 0, upgrading: false, upgradeEndTime: null, upgradeWorkersAssigned: 0 }
    },

    villageBuildings: {
      '0,0':   { type: 'anaBina',   level: 1 },
      '1,0':   { type: 'keresteci', level: 1, workers: 0 },
      '0,1':   { type: 'tuglaci',   level: 1, workers: 0 },
      '-1,1':  { type: 'tasci',     level: 1, workers: 0 },
      '-1,0':  { type: 'demirci',   level: 1, workers: 0 },
      '0,-1':  { type: 'degirmen',  level: 1, workers: 0 },
      '1,-1':  { type: 'firin',     level: 1, workers: 0 }
    },

    TOWER_SLOTS:      new Set(TOWER_SLOTS_ARR),
    PRODUCTION_RING_1: [...PRODUCTION_RING_1]
  };
}

/**
 * DB'den yüklenen JSON'u tekrar çalışır hale getirir.
 * (Set'leri ve tarih alanlarını restore eder)
 */
function hydrateVillage(raw) {
  // Eski kayıtlarda sanal saat yok: duvar saatiyle başlat, mevcut mutlak
  // zaman damgaları böylece doğru kalan süreyi verir.
  if (typeof raw.clockMs !== 'number') raw.clockMs = Date.now();
  if (!Array.isArray(raw.PRODUCTION_RING_1)) {
    raw.PRODUCTION_RING_1 = [...PRODUCTION_RING_1];
  }

  // Eski kayıtlarda dünya konumu yoktu
  if (typeof raw.worldQ !== 'number') raw.worldQ = 0;
  if (typeof raw.worldR !== 'number') raw.worldR = 0;

  /**
   * ESKİ BİÇİMDEN TAŞIMA — savunma yapıları hex slotlarındaydı.
   *
   * Sur/hendek herhangi bir boş hex'e kurulabiliyordu, kuleler de dört sabit
   * hex'i tutuyordu. Yeni düzende bunlar isimli slotlarda; taşıma seviyeleri ve
   * işçileri koruyarak yapılıyor, boşalan hex'ler normal araziye dönüyor
   * (oyuncu lehine dört ek inşa alanı). Kuleler seviyesi yüksek olan önce
   * gelecek şekilde kule1..kule6'ya yerleşir.
   */
  const vb = raw.villageBuildings || (raw.villageBuildings = {});
  const hexDefence = Object.entries(vb)
    .filter(([k, b]) => k.includes(',') && b && DEFENCE_TYPES.has(b.type));
  if (hexDefence.length) {
    const towers = [];
    for (const [key, b] of hexDefence) {
      delete vb[key];
      if (b.type === 'kule') { towers.push(b); continue; }
      // sur/hendek tek örnek: aynı türden iki tane varsa yüksek seviyeli kalır
      const target = b.type;                    // 'sur' | 'hendek'
      if (!vb[target] || (vb[target].level || 0) < (b.level || 0)) vb[target] = b;
    }
    towers.sort((a, b) => (b.level || 0) - (a.level || 0));
    towers.slice(0, TOWER_SLOTS_ARR.length).forEach((b, i) => {
      vb[TOWER_SLOTS_ARR[i]] = b;
    });
  }
  /**
   * Kule slotları SABİT bir liste olduğu için her yüklemede yeniden kurulur.
   * Bu aynı zamanda eski bir kayıt yolundan gelen bozukluğu da onarıyor: Set
   * diziye çevrilmeden JSON'a yazıldığında diskte `{}` kalıyor ve kayıt
   * sırasındaki `[...state.TOWER_SLOTS]` patlayıp o turdaki BÜTÜN NPC kaydını
   * iptal ediyordu.
   */
  raw.TOWER_SLOTS = new Set(TOWER_SLOTS_ARR);

  // Sefer sistemi öncesi kayıtlar
  if (!raw.stats || typeof raw.stats !== 'object') raw.stats = {};
  if (!Array.isArray(raw.marches)) raw.marches = [];
  if (!Array.isArray(raw.reports)) raw.reports = [];
  if (typeof raw.nextMarchId !== 'number') {
    raw.nextMarchId = raw.marches.reduce((m, x) => Math.max(m, (x.id || 0) + 1), 1);
  }

  // endTime alanları sayıya dön (JSON'da number olarak saklanır, sorun yok)
  return raw;
}

module.exports = { createVillage, hydrateVillage, TOWER_SLOTS_ARR, WALL_SLOTS_ARR, DEFENCE_TYPES };
