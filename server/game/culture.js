/**
 * KÜLTÜR PUANI (CP) — yeni köy kurma hakkının ölçüsü.
 *
 * Mekanik Travian'dan alındı, SAYILAR bu oyunun ekonomisine kalibre edildi:
 *   • Her bina her seviyesinde `cpPerLevel` kadar CP/GÜN üretir.
 *   • Köyün üretimi oyuncunun toplam CP havuzuna akar (oyun saati başına).
 *   • Belirli eşikleri geçmek "kaç köye sahip olabilirim" tavanını açar.
 *   • Ayrıca köşk/saray SEVİYESİ de hak veriyor (Travian: köşk 10-20,
 *     saray 10-15-20). İkisinden HANGİSİ DAHA AZ ise gerçek tavan o:
 *     hem kültür puanı hem bina hakkı gerekiyor.
 *
 * Eşikler neden Travian'ın 2.000'i değil?
 * Travian x1'de 2. köy ~7-14. güne denk geliyor. Bu oyunda 31 bina var ve
 * CP ağırlıkları 1-4 arası; simülasyonda (gerçekçi bir kurulum sırası,
 * günde ~4 bina seviyesi) 2.000 CP 29. güne düşüyordu. Eşikler Travian'ın
 * ORANLARINI koruyacak şekilde (×4, ×2.5, ×1.95, sonra ×1.8) yeniden
 * ölçeklendi; ölçülen hedef: 2. köy ~11. gün, 3. ~22, 4. ~34.
 */

/** Köy sayısı tavanı için gereken TOPLAM kültür puanı (1. köy bedava) */
const CP_THRESHOLDS = [0, 300, 1200, 3000, 5850];
const CP_GROWTH = 1.8;          // 5. köyden sonrası bu çarpanla devam eder

/** n. köy için gereken toplam CP (n = 1 → 0) */
function cpNeededFor(n) {
  if (n <= 1) return 0;
  if (n <= CP_THRESHOLDS.length) return CP_THRESHOLDS[n - 1];
  let v = CP_THRESHOLDS[CP_THRESHOLDS.length - 1];
  for (let i = CP_THRESHOLDS.length; i < n; i++) v = Math.round(v * CP_GROWTH);
  return v;
}

/** Kültür puanının izin verdiği köy sayısı */
function villagesByCulture(cp) {
  let n = 1;
  while (cpNeededFor(n + 1) <= cp) n++;
  return n;
}

/**
 * Bir köyün CP/GÜN üretimi — bina seviyelerinin ağırlıklı toplamı.
 * İnşa hâlindeki (seviye 0) bina üretmez.
 */
function villageCpPerDay(village, VILLAGE_DEFS) {
  let sum = 0;
  for (const b of Object.values(village.villageBuildings || {})) {
    if (!b || b.level < 1) continue;
    const def = VILLAGE_DEFS[b.type];
    if (!def) continue;
    sum += b.level * (def.cpPerLevel || 0);
  }
  return sum;
}

/**
 * Köşk/saray seviyesinden gelen köy hakkı.
 * Köşk: Lvl 10 ve 20 → 2 hak. Saray: Lvl 10, 15, 20 → 3 hak.
 * Başlangıçta 1 köy hakkı zaten var, dolayısıyla tavan = 1 + haklar.
 */
function expansionSlots(village, VILLAGE_DEFS) {
  let slots = 0;
  for (const b of Object.values(village.villageBuildings || {})) {
    if (!b || b.level < 1) continue;
    const at = VILLAGE_DEFS[b.type]?.expansionAt;
    if (!Array.isArray(at)) continue;
    for (const lv of at) if (b.level >= lv) slots++;
  }
  return slots;
}

/**
 * Oyuncunun kurabileceği köy sayısı ve neyin kısıtladığı.
 * `villages` oyuncunun BÜTÜN köyleri (çoklu köy mimarisi gelince dizi olur;
 * şimdilik tek köy de kabul edilir).
 */
function expansionStatus(villages, culturePoints, VILLAGE_DEFS) {
  const list = Array.isArray(villages) ? villages : [villages].filter(Boolean);
  const owned = list.length;

  let slots = 0, cpPerDay = 0;
  for (const v of list) {
    slots += expansionSlots(v, VILLAGE_DEFS);
    cpPerDay += villageCpPerDay(v, VILLAGE_DEFS);
  }

  const byCulture = villagesByCulture(culturePoints || 0);
  const byBuilding = 1 + slots;
  const allowed = Math.min(byCulture, byBuilding);

  const nextN = owned + 1;
  const cpNext = cpNeededFor(nextN);
  const cpMissing = Math.max(0, cpNext - (culturePoints || 0));

  return {
    owned, allowed, slots,
    cpPerDay,
    cpNext,
    cpMissing,
    // Sıradaki köyü ne engelliyor: 'yok' | 'kultur' | 'bina' | 'ikisi'
    blockedBy: allowed > owned ? 'yok'
      : (byCulture <= owned && byBuilding <= owned) ? 'ikisi'
        : byCulture <= owned ? 'kultur' : 'bina',
    // Bilgi amaçlı: kültür puanı kaç köye yetiyor, bina kaç köye
    byCulture, byBuilding,
    // Tahmini kalan süre (oyun günü) — üretim sabit varsayımıyla
    daysToNext: cpPerDay > 0 && cpMissing > 0
      ? Math.ceil((cpMissing / cpPerDay) * 10) / 10
      : (cpMissing > 0 ? Infinity : 0),
  };
}

// ── ŞÖLENLER ──────────────────────────────────────────────────────────
/**
 * Taverna'da şölen. Küçük şölen BU köyün, büyük şölen BÜTÜN köylerin
 * günlük CP üretimi kadar puan verir (Travian mantığı). Puan şölenin
 * SONUNDA yazılır; iptal edilirse kaynak geri gelmez.
 */
const FESTIVALS = {
  kucuk: {
    label: 'Küçük şölen',
    minLevel: 1,
    hours: 12,                                    // oyun saati
    cost: { kereste: 400, tugla: 300, yontmaTas: 200, tahil: 200 },
    scope: 'koy',                                 // bu köyün günlük üretimi
    multiplier: 1,
  },
  buyuk: {
    label: 'Büyük şölen',
    minLevel: 10,
    hours: 24,
    cost: { kereste: 1200, tugla: 900, yontmaTas: 600, tahil: 600, demirKulce: 300 },
    scope: 'tum',                                 // bütün köylerin toplamı
    multiplier: 2,
  },
};

module.exports = {
  CP_THRESHOLDS, CP_GROWTH, FESTIVALS,
  cpNeededFor, villagesByCulture, villageCpPerDay, expansionSlots, expansionStatus,
};
