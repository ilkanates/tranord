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
const PRODUCTION_DEFS = require('../data/productionDefs');
const { UNIT_DEFS } = require('../data/militaryDefs');
const { VILLAGE_DEFS: VILLAGE_DEFS_ALL, maxLevelOf } = require('../data/villageDefs');

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

    /*
      BASLANGIC STOGU.

      Islenmis mal sifirdi: yeni oyuncu once ham topluyor, sonra isliyor,
      ilk tarla yukseltmesini ancak saatler sonra yapabiliyordu. Travian'da
      yeni koy her kaynaktan 750 ile basliyor ve ilk birkac yukseltme aninda
      geliyor. Burada islenmis maldan 300 veriliyor: ilk 3-4 yukseltme
      beklemeden yapilabiliyor, sonrasi uretime kaliyor.
    */
    resources: {
      odun: 300, kil: 300, tas: 300, demir: 200, tahil: 400,
      kereste: 300, tugla: 300, yontmaTas: 300, demirKulce: 300,
      un: 0, ekmek: 60
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

    /**
     * ARAŞTIRMA — Rún Salonu'nda açılan birimler.
     * `research[unitType] = true` demek "artık eğitilebilir" demek; kışla/ahır
     * seviye kilidi ayrıca geçerli (bkz. militaryDefs.researchFor).
     */
    research: {},
    researchQueue: [],
    nextResearchId: 1,
    /**
     * Yeni köyler göçe girmez: araştırma sistemi onlar için baştan geçerli.
     * Bayrak burada true; eski kayıtlarda hiç yok, hydrate onları bir kez
     * göçürüp bayrağı basıyor.
     */
    researchMigrated: true,

    /**
     * EKİPMAN YÜKSELTMELERİ — silahçı/zırhçıda araştırılan seviyeler.
     * Seviye ordunun TAMAMINA anında işliyor (Travian kuralı); asker asker
     * seviye tutulsaydı ordu verisi ve savaş hesabı belirgin şekilde
     * karmaşıklaşırdı.
     */
    equipmentLevels: { kilic: 0, mizrak: 0, kalkan: 0, zirh: 0 },
    upgradeQueues: { silahci: [], zirh: [] },
    nextUpgradeId: 1,

    /**
     * YERLEŞİM HAKKI — KÖY BAŞINA.
     *
     * expansionEarned: bu köyün köşk/sarayının ULAŞTIĞI eşik sayısı
     *   (köşk Lvl 10 → 1, Lvl 20 → 2; saray 10/15/20 → 3). Bir kez
     *   kazanılır ve BİNA YIKILSA DA düşmez — yeniden kurup daha yükseğe
     *   çıkmadan yeni hak doğmaz.
     * expansionUsed: bu köyden kurulan köy sayısı.
     * foundedVillages: hangi köy nereye kuruldu (köşk/saray panelinde
     *   listelenir).
     *
     * Göçmen eğitimi bu farkla sınırlanıyor: her hak 3 göçmen demek.
     */
    expansionEarned: 0,
    expansionUsed: 0,
    foundedVillages: [],

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

  // Araştırma sistemi öncesi kayıtlar
  if (!raw.research || typeof raw.research !== 'object') raw.research = {};
  if (!Array.isArray(raw.researchQueue)) raw.researchQueue = [];
  if (typeof raw.nextResearchId !== 'number') {
    raw.nextResearchId = raw.researchQueue.reduce((m, x) => Math.max(m, (x.id || 0) + 1), 1);
  }
  migrateResearch(raw);

  // Ekipman yükseltmesi öncesi kayıtlar
  if (!raw.equipmentLevels || typeof raw.equipmentLevels !== 'object') raw.equipmentLevels = {};
  for (const eq of ['kilic', 'mizrak', 'kalkan', 'zirh']) {
    if (typeof raw.equipmentLevels[eq] !== 'number') raw.equipmentLevels[eq] = 0;
  }
  if (!raw.upgradeQueues || typeof raw.upgradeQueues !== 'object') raw.upgradeQueues = {};
  for (const b of ['silahci', 'zirh']) {
    if (!Array.isArray(raw.upgradeQueues[b])) raw.upgradeQueues[b] = [];
  }
  if (typeof raw.nextUpgradeId !== 'number') {
    raw.nextUpgradeId = Object.values(raw.upgradeQueues)
      .flat().reduce((m, x) => Math.max(m, (x.id || 0) + 1), 1);
  }

  // Yerleşim hakkı öncesi kayıtlar
  if (typeof raw.expansionEarned !== 'number') raw.expansionEarned = 0;
  if (typeof raw.expansionUsed !== 'number') raw.expansionUsed = 0;
  if (!Array.isArray(raw.foundedVillages)) raw.foundedVillages = [];

  // Sefer sistemi öncesi kayıtlar
  if (!raw.stats || typeof raw.stats !== 'object') raw.stats = {};
  if (!Array.isArray(raw.marches)) raw.marches = [];
  if (!Array.isArray(raw.reports)) raw.reports = [];
  if (typeof raw.nextMarchId !== 'number') {
    raw.nextMarchId = raw.marches.reduce((m, x) => Math.max(m, (x.id || 0) + 1), 1);
  }

  clampBuildingLevels(raw);
  clampWorkersToCapacity(raw);
  repairWorkerAccounting(raw);

  // endTime alanları sayıya dön (JSON'da number olarak saklanır, sorun yok)
  return raw;
}

/**
 * SİVİL NÜFUS — asker olmayan herkes.
 *
 * `population` köyün TOPLAM insanı: siviller + asker. Ev tavanı ise yalnız
 * SİVİLLERİ sınırlar. Sebebi: asker de nüfusta sayılıp tavana dahil edilince,
 * tavana oturmuş bir köyde işçiyi askere çevirmek yer AÇMIYOR, dolayısıyla
 * yeni köylü hiç doğmuyordu — ekmek bol olsa bile. (Ölçüldü: 200 oyun saati,
 * 1.000 işçi askere çevrildi, 0 yeni köylü.) Artık asker "evden çıkıp
 * kışlaya gidiyor", yeri boşalıyor ve nüfus yerini dolduruyor.
 *
 * Seferdeki asker de sivil değildir; eğitim kuyruğunda rezerve edilmiş işçi
 * ise henüz asker olmadığı için sivil sayılır.
 */
function civilianCount(village) {
  let asker = 0;
  for (const n of Object.values(village.army || {})) asker += n || 0;
  for (const m of village.marches || []) {
    for (const n of Object.values(m.units || {})) asker += n || 0;
  }
  return Math.max(0, (village.population || 0) - asker);
}

/**
 * SEVİYE TAVANINI AŞMIŞ BİNALARI GERİ ÇEK.
 *
 * 18 binanın `maxLevel`i tanımsızdı ve yükseltme kontrolü
 * `def.maxLevel && ...` biçiminde olduğu için hiç çalışmıyordu: fırın Lvl 21
 * olmuştu. Tavanlar artık tanımlı; bu onarım o dönemde tavanı aşmış binaları
 * tavana indiriyor, yoksa oyuncu asla ulaşamayacağı bir seviyeyi elinde
 * tutmaya devam ederdi.
 *
 * Süren inşaat da iptal ediliyor ve işçileri havuza dönüyor (aksi hâlde
 * bina tavana inip inşaat bitince yine 21 olurdu).
 */
function clampBuildingLevels(v) {
  const kayit = [];
  let iade = 0;
  for (const [key, b] of Object.entries(v.villageBuildings || {})) {
    if (!b || !b.type) continue;
    const tavan = maxLevelOf(b.type);
    const asiyor = b.level > tavan;
    const insaatAsacak = b.building && b.level >= tavan;
    if (!asiyor && !insaatAsacak) continue;
    if (b.building && b.buildWorkers) { iade += b.buildWorkers; v.freeWorkers = (v.freeWorkers || 0) + b.buildWorkers; }
    if (b.building) { delete b.building; delete b.buildEndTime; delete b.buildWorkers; }
    if (asiyor) { kayit.push(`${b.type}@${key} ${b.level}→${tavan}`); b.level = tavan; }
    else kayit.push(`${b.type}@${key} inşaat iptal (Lvl ${tavan} tavan)`);
  }
  if (!kayit.length) return null;
  console.log(`[SEVİYE TAVANI] ${kayit.join(', ')}`
    + (iade ? ` · ${iade} inşaat işçisi havuza döndü` : ''));
  return { kayit, iade };
}

/**
 * KADROYU AŞAN İŞÇİLERİ HAVUZA DÖNDÜR.
 *
 * Tarla işçi kapasitesi eğrisi yumuşatıldı (Lvl 20: 490 → 40). Eski
 * kayıtlarda bir tarlaya kapasitesinden fazla işçi atanmış olabilir; o işçiler
 * silinmiyor, BOŞ İŞÇİ havuzuna dönüyor — nüfus muhasebesi bozulmaz, oyuncu
 * da kimseyi kaybetmez. Aynı kontrol köy binaları için de yapılıyor (bina
 * yıkılıp yeniden düşük seviyede kurulmuş olabilir).
 *
 * Yükleme başına bir kez çalışır ve yalnız gerçekten fazlalık varsa iz bırakır.
 */
function clampWorkersToCapacity(v) {
  let iade = 0;
  const kayit = [];

  for (const [key, t] of Object.entries(v.productionTiles || {})) {
    if (!t || t.level < 1) continue;
    const maks = PRODUCTION_DEFS[t.type]?.levels?.[t.level - 1]?.workers;
    if (!maks) continue;
    const w = t.workers || 0;
    if (w > maks) { iade += w - maks; kayit.push(`${t.type}@${key} ${w}→${maks}`); t.workers = maks; }
  }

  for (const [key, b] of Object.entries(v.villageBuildings || {})) {
    if (!b || b.level < 1) continue;
    const def = VILLAGE_DEFS_ALL[b.type];
    if (!def) continue;
    const maks = b.level * (def.workersPerLevel || 3);
    const w = b.workers || 0;
    if (w > maks) { iade += w - maks; kayit.push(`${b.type}@${key} ${w}→${maks}`); b.workers = maks; }
  }

  if (!iade) return null;
  v.freeWorkers = (v.freeWorkers || 0) + iade;
  console.log(`[KADRO KIRPMA] ${iade} işçi havuza döndü — ${kayit.slice(0, 6).join(', ')}`
    + (kayit.length > 6 ? ` (+${kayit.length - 6})` : ''));
  return { iade, kayit };
}

/**
 * KAYBOLAN KÖYLÜLERİ GERİ GETİR.
 *
 * Değişmez kural: köyün nüfusu her zaman şu kovaların toplamıdır —
 *
 *     nüfus = boş işçi + tarla işçisi + tarla yükseltme işçisi
 *           + bina personeli + inşaat işçisi + ordu
 *           + eğitim kuyruğunda rezerve edilmiş işçi + seferdeki asker
 *
 * Eski bir hata (dev_setup süren inşaatı iptal ederken `buildWorkers`ı havuza
 * döndürmeden siliyordu) bu kuralı bozmuş kayıtlar bıraktı: nüfus sayısı
 * yerinde duruyor ama o kişiler hiçbir kovada görünmüyor — ne çalışıyorlar ne
 * boşta. Kayıp varsa BOŞ İŞÇİ havuzuna geri yazılıyor; fazlalık varsa (kova
 * toplamı nüfustan büyükse) nüfus yukarı çekiliyor, çünkü kovalardaki kişiler
 * gerçekten bir işte duruyor ve onları silmek üretimi bozar.
 *
 * Onarım YÜKLEMEDE bir kez çalışır ve yalnız gerekiyorsa iz bırakır.
 */
function repairWorkerAccounting(v) {
  const tiles = Object.values(v.productionTiles || {});
  const bldgs = Object.values(v.villageBuildings || {});
  let kuyruk = 0;
  for (const q of Object.values(v.unitQueues || {})) {
    for (const o of q || []) if (o && o.workerReserved) kuyruk++;
  }
  let seferde = 0;
  for (const m of v.marches || []) {
    for (const n of Object.values(m.units || {})) seferde += n || 0;
  }
  const mesgul =
      tiles.reduce((s, t) => s + (t.workers || 0) + (t.upgradeWorkersAssigned || 0), 0)
    + bldgs.reduce((s, b) => s + (b.workers || 0) + (b.buildWorkers || 0), 0)
    + Object.values(v.army || {}).reduce((s, n) => s + (n || 0), 0)
    + kuyruk + seferde;

  const bos = v.freeWorkers || 0;
  const fark = (v.population || 0) - (mesgul + bos);
  if (fark === 0) return null;

  if (fark > 0) v.freeWorkers = bos + fark;         // kaybolanlar havuza döner
  else v.population = mesgul + bos;                 // kovalar doğru, nüfus düzeltilir
  console.log(`[İŞÇİ ONARIM] ${fark > 0 ? `${fark} kayıp köylü boş işçi havuzuna döndü`
    : `nüfus ${-fark} yukarı çekildi`} (meşgul ${mesgul}, boştaydı ${bos})`);
  return { fark, mesgul, bos };
}

/**
 * ARAŞTIRMA GÖÇÜ — bir kez, eski kayıtlar için.
 *
 * Rún Salonu gelmeden önce oyuncu birimleri yalnız kışla/ahır seviyesiyle
 * açıyordu. Sistem eklendiğinde `research` boş olduğu için ZATEN EĞİTEBİLDİĞİ
 * birimler bir anda kilitlenirdi — oyuncunun hiçbir hatası olmadan ordusu
 * durur. Bu yüzden göçte iki şey araştırılmış sayılıyor:
 *   1) ordusunda hâlihazırda BULUNAN birimler,
 *   2) eğitim binasının MEVCUT seviyesinin zaten açtığı birimler.
 * Bundan sonrası normal kurala tabi: yeni seviye açılınca araştırma gerekir.
 *
 * `researchMigrated` bayrağı olmadan bu her yüklemede çalışırdı ve kışlasını
 * yükselten herkes araştırmayı BEDAVA geçerdi — göçün bir kez koşması şart.
 */
function migrateResearch(v) {
  if (v.researchMigrated) return;
  v.researchMigrated = true;
  if (!v.research) v.research = {};

  const binaSeviyesi = {};
  for (const b of Object.values(v.villageBuildings || {})) {
    if (!b?.type) continue;
    binaSeviyesi[b.type] = Math.max(binaSeviyesi[b.type] || 0, b.level || 0);
  }

  let acilan = 0;
  for (const [tip, def] of Object.entries(UNIT_DEFS)) {
    if (!def.research || v.research[tip]) continue;
    const orduda = (v.army?.[tip] || 0) > 0;
    const seviyeYetiyor = (binaSeviyesi[def.trainedAt] || 0) >= (def.minLevel || 1);
    if (orduda || seviyeYetiyor) { v.research[tip] = true; acilan++; }
  }
  if (acilan && !v.quiet) {
    console.log(`[ARAŞTIRMA GÖÇÜ] ${acilan} birim zaten erişilebilirdi, açık sayıldı`);
  }
}

module.exports = { createVillage, hydrateVillage, repairWorkerAccounting, migrateResearch,
  clampWorkersToCapacity, clampBuildingLevels, civilianCount,
  TOWER_SLOTS_ARR, WALL_SLOTS_ARR, DEFENCE_TYPES };
