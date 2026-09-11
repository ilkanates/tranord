/**
 * İNŞA YERLEŞİM KURALLARI — bir yapı BU slota kurulabilir mi?
 *
 * server/index.js'ten AYNEN taşındı (davranış değişmedi). Tek bir soruyu
 * cevaplayan, birbirine sıkı bağlı bir küme: hex komşuluğu, savunma slotları,
 * tekil bina kuralı, dünya üzerinde toprak sahipliği ve üretim tarlası
 * sınırları.
 *
 * Dışarıya yalnız dört giriş noktası açılıyor; gerisi bu dosyanın içi.
 * `buildRefusalReason` özellikle önemli: sessiz red oyuncuyu çaresiz
 * bırakıyordu ("saray kuramıyorum, sebep yok"), o yüzden her red dalının
 * okunabilir bir karşılığı var.
 */
const { VILLAGE_DEFS, maxLevelOf } = require('../data');
const { TOWER_SLOTS_ARR: TOWER_SLOT_NAMES, DEFENCE_TYPES } = require('./villageState');
const { WORLD, userSessions } = require('../durum');
const W = require('./world');
function getMaxProductionSlots(village) {
  // Ana Bina her seviyede +1 tarla slotu; Lvl 20'de 25 (tavan)
  const anaBina = village.villageBuildings['0,0'];
  return Math.min(25, 5 + (anaBina?.level || 1));
}

const HEX_NEIGHBORS = [[1,-1],[1,0],[0,1],[-1,1],[-1,0],[0,-1]];
function getNeighbors(slotKey) {
  const [q, r] = slotKey.split(',').map(Number);
  return HEX_NEIGHBORS.map(([dq, dr]) => `${q+dq},${r+dr}`);
}

/**
 * SLOT TÜRÜ — hex arazi mi, sur mu, hendek mi, kule köşesi mi?
 * Savunma yapıları köyün içinde hex kaplamıyor (bkz. game/villageState.js).
 */
function slotKind(village, slotKey) {
  if (slotKey === 'sur' || slotKey === 'hendek') return slotKey;
  if (village.TOWER_SLOTS.has(slotKey)) return 'kule';
  return 'hex';
}

function canBuildAt(village, slotKey, buildingType, otherVillages = null) {
  // Slot anahtarı metin olmak zorunda: sayı/nesne gelince aşağıdaki
  // dizin erişimleri ve slotKind() beklenmedik şekilde davranıyor.
  if (typeof slotKey !== 'string' || !slotKey) return false;
  if (slotKey === '0,0') return false;
  if (village.villageBuildings[slotKey]) return false;
  const def = VILLAGE_DEFS[buildingType];
  if (!def || buildingType === 'anaBina') return false;

  /**
   * Her savunma yapısı YALNIZ kendi isimli slotuna, her savunma slotu da
   * yalnız kendi yapısına.
   *
   * DÜZELTME: eski koşul `isDefence !== (buildingType === kind)` idi. Normal
   * bir hex'te (kind='hex') isDefence=false ve buildingType==='hex' de false
   * olduğu için false!==false çıkıyor ve koşul GEÇİYORDU: sur, hendek ve kule
   * herhangi bir hex'e kurulabiliyordu. Savunma slotları doğru çalıştığı için
   * hata yalnız "hex'e savunma yapısı" durumunda görünüyordu (3 vaka).
   */
  const kind = slotKind(village, slotKey);
  if (kind !== (DEFENCE_TYPES.has(buildingType) ? buildingType : 'hex')) return false;

  /**
   * TEK OLMA KURALI.
   *
   * `repeatableWhenMaxed` olan binalar (depolar) bir tane daha kurulabilir —
   * ama ancak MEVCUT OLANLARIN HEPSİ tavan seviyedeyse. Böylece oyuncu on
   * tane yarım depo dikip alan israf etmiyor, önce elindekini bitiriyor.
   */
  if (def.unique && !canRepeat(village, buildingType, def)) return false;

  /**
   * YÖNETİM BİNALARI:
   *  • Saray oyuncunun YALNIZ BİR köyünde olabilir (`oncePerPlayer`). Merkez
   *    köy şartı YOK: saray hangi köyde kuruluysa oradan "bu köyü merkez yap"
   *    denilebiliyor. Başka köye taşımak için önce mevcut saray yıkılmalı.
   *  • Köşk ve saray aynı köyde bir arada olamaz.
   */
  if (def.oncePerPlayer && otherVillages) {
    for (const [k, other] of otherVillages) {
      if (other === village) continue;
      if (Object.values(other.villageBuildings || {}).some(b => b.type === buildingType)) return false;
    }
  }
  if (def.excludes
    && Object.values(village.villageBuildings).some(b => b.type === def.excludes)) return false;
  const maxKule = VILLAGE_DEFS.kule?.maxInstances || TOWER_SLOT_NAMES.length;
  if (buildingType === 'kule'
    && Object.values(village.villageBuildings).filter(b => b.type === 'kule').length >= maxKule) return false;
  return true;
}

/**
 * Bu türden bir tane daha kurulabilir mi?
 *  • Hiç yoksa: evet.
 *  • `repeatableWhenMaxed` değilse: hayır (klasik tek örnek).
 *  • Öyleyse: mevcut olanların HEPSİ tavan seviyede ve inşaatı bitmişse evet.
 */
function canRepeat(village, buildingType, def) {
  const mevcut = Object.values(village.villageBuildings).filter(b => b.type === buildingType);
  if (!mevcut.length) return true;
  if (!def.repeatableWhenMaxed) return false;
  const tavan = maxLevelOf(buildingType);
  return mevcut.every(b => b.level >= tavan && !b.building);
}

/**
 * İNŞA REDDİNİN SEBEBİ — arayüzde gösterilecek tek cümle.
 *
 * `canBuildAt` yalnız true/false döndürüyor; oyuncu düğmeye basıp hiçbir şey
 * olmayınca sebebini bilemiyordu (saray örneği). Burada aynı kurallar sırayla
 * tekrar bakılıp insanca bir cümle üretiliyor.
 */
function buildRefusalReason(village, slotKey, buildingType, otherVillages = null, workers = 1) {
  const def = VILLAGE_DEFS[buildingType];
  if (!def) return 'Böyle bir bina yok.';
  if (slotKey === '0,0') return 'Ana bina hex\'i değiştirilemez.';
  if (village.villageBuildings[slotKey]) return 'Bu alan zaten dolu.';
  const kind = slotKind(village, slotKey);
  if (kind !== (DEFENCE_TYPES.has(buildingType) ? buildingType : 'hex')) {
    return kind !== 'hex'
      ? `Bu slota yalnız ${VILLAGE_DEFS[kind]?.name || kind} kurulabilir.`
      : `${def.name} köy içine kurulamaz — kendi savunma slotuna kurulur.`;
  }
  if (def.unique && !canRepeat(village, buildingType, def)) {
    if (def.repeatableWhenMaxed) {
      const tavan = maxLevelOf(buildingType);
      const eksik = Object.values(village.villageBuildings)
        .filter(b => b.type === buildingType && (b.level < tavan || b.building)).length;
      return `Yeni ${def.name} için mevcut ${eksik === 1 ? 'olanın' : eksik + ' tanesinin'}`
        + ` Lvl ${tavan} olması gerekiyor.`;
    }
    return `${def.name} bu köyde zaten var.`;
  }
  if (def.oncePerPlayer && otherVillages) {
    for (const [k, other] of otherVillages) {
      if (other === village) continue;
      if (Object.values(other.villageBuildings || {}).some(b => b.type === buildingType)) {
        const ad = WORLD.slotByKey.get(k)?.name || k;
        return `${def.name} yalnız tek köyde olabilir — şu an ${ad} köyünde.`
          + ` Taşımak için oradaki ${def.name.toLowerCase()} yıkılmalı.`;
      }
    }
  }
  if (def.excludes
    && Object.values(village.villageBuildings).some(b => b.type === def.excludes)) {
    return `${def.name} ile ${VILLAGE_DEFS[def.excludes]?.name || def.excludes} aynı köyde olamaz.`;
  }
  const maxKule = VILLAGE_DEFS.kule?.maxInstances || TOWER_SLOT_NAMES.length;
  if (buildingType === 'kule'
    && Object.values(village.villageBuildings).filter(b => b.type === 'kule').length >= maxKule) {
    return `En fazla ${maxKule} kule kurulabilir.`;
  }
  if (!workers || workers < 1) return 'En az 1 inşaat işçisi gerekiyor.';
  if (workers > village.freeWorkers) return `Yeterli boş işçi yok (${village.freeWorkers} boş).`;
  return 'İnşa edilemedi.';
}

const VALID_PRODUCTION_TYPES = new Set(['odun','kil','tas','demir','tahil']);

/**
 * Bu dünya hex'i BAŞKA bir köye mi ait?
 *   • başka bir köy merkezinin claim halkası içindeyse (NPC ya da oyuncu), veya
 *   • başka bir oyuncunun kurulu tarlası oradaysa.
 * NPC'ler yalnızca kendi ring1+ring2'sinde büyür, o yüzden onlar için halka yeterli.
 */
function hexOwnedByOther(wq, wr, selfUserId) {
  const here = { q: wq, r: wr };
  for (const n of WORLD.npcs.values()) {
    if (W.distanceBetween(here, n.slot) <= W.CLAIM_RADIUS) return true;
  }
  for (const [key, p] of WORLD.playerBySlot) {
    if (p.userId === selfUserId) continue;
    const slot = WORLD.slotByKey.get(key);
    if (slot && W.distanceBetween(here, slot) <= W.CLAIM_RADIUS) return true;
  }
  for (const [uid, sess] of userSessions) {
    if (uid === selfUserId) continue;
    // ÇOKLU KÖY: oyuncunun HER köyünün toprağı kontrol edilmeli
    for (const v of sess.villages.values()) {
      const bq = v.worldQ || 0, br = v.worldR || 0;
      for (const k of Object.keys(v.productionTiles)) {
        const [lq, lr] = k.split(',').map(Number);
        if (bq + lq === wq && br + lr === wr) return true;
      }
    }
  }
  return false;
}

/**
 * Tarla kurulabilir mi?
 * Sabit bir halka sınırı YOK — sahip olunan herhangi bir hex'in komşusuna yayılınır.
 * Sınırlar: tarla slotu limiti, dünya kenarı, başkasının toprağı ve komşuluk.
 * Uzaklaştıkça mesafe verimi düştüğü için yayılma kendiliğinden dengelenir.
 */
/**
 * AYNI HEX İKİ KEZ ALINAMAZ.
 *
 * Köylerimin toprakları çakışabiliyor (bilinçli), ama bir hex'i yalnız
 * BİR köy işleyebilir; yoksa aynı araziden çift üretim çıkıyordu.
 * Yabancı köyler hexOwnedByOther'da zaten denetleniyor.
 */
function hexOwnedByMyOtherVillage(wq, wr, userId, village) {
  const sess = userSessions.get(userId);
  if (!sess) return false;
  for (const v of sess.villages.values()) {
    if (v === village) continue;                       // inşa eden köy
    const bq = v.worldQ || 0, br = v.worldR || 0;
    if (bq === wq && br === wr) return true;           // öbür köyün merkezi
    for (const k of Object.keys(v.productionTiles || {})) {
      const [lq, lr] = k.split(',').map(Number);
      if (bq + lq === wq && br + lr === wr) return true;
    }
  }
  return false;
}

function canBuildProductionAt(village, slotKey, type, userId) {
  // Aşağıda slotKey.split(...) çağrılıyor — metin değilse TypeError.
  if (typeof slotKey !== 'string' || !slotKey) return false;
  if (slotKey === '0,0') return false;
  if (village.productionTiles[slotKey]) return false;
  if (!VALID_PRODUCTION_TYPES.has(type)) return false;
  const parts = slotKey.split(',');
  if (parts.length !== 2 || parts.some(p => isNaN(Number(p)))) return false;
  const lq = Number(parts[0]), lr = Number(parts[1]);
  if (!Number.isInteger(lq) || !Number.isInteger(lr)) return false;
  if (Math.abs(lq) > 200 || Math.abs(lr) > 200) return false;

  const wq = (village.worldQ || 0) + lq, wr = (village.worldR || 0) + lr;
  if (W.hexDistance(wq, wr) > W.WORLD_RADIUS) return false;             // dünya kenarı
  if (hexOwnedByOther(wq, wr, userId)) return false;                    // başkasının toprağı
  if (hexOwnedByMyOtherVillage(wq, wr, userId, village)) return false;  // kendi öbür köyüm almış
  if (Object.keys(village.productionTiles).length >= getMaxProductionSlots(village)) return false;
  return getNeighbors(slotKey).some(n => n === '0,0' || village.productionTiles[n]);
}

module.exports = {
  getMaxProductionSlots, canBuildAt, buildRefusalReason, canBuildProductionAt,
  // içeriden kullanılıyor, testte işe yarar diye dışa da açık:
  getNeighbors, slotKind, canRepeat, hexOwnedByOther, hexOwnedByMyOtherVillage,
  VALID_PRODUCTION_TYPES,
};
