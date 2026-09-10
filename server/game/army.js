/**
 * SEFER MOTORU — ordu gönderme, yürüyüş, çarpışma, ganimet, dönüş.
 *
 * Tasarım kararları (ve nedenleri):
 *
 * 1) ZAMAN: Sefer KALAN OYUN SAATİ tutar (`remainingHours`), mutlak zaman
 *    damgası değil. Dünya her adımda bu sayıyı geçen oyun saati kadar düşürür.
 *    Böylece hız çubuğu seferleri de hızlandırır (mutlak damga kullanılsaydı
 *    ekonomi 128× akarken ordular gerçek zamanda sürünürdü) ve sunucu kapalıyken
 *    seferler dünyayla birlikte durur.
 *
 * 2) SAHİPLİK: Her sefer ÇIKTIĞI köyün state'inde durur (village.marches).
 *    Böylece kalıcılık kendiliğinden çözülür — oyuncu köyü oyuncu kaydına,
 *    NPC seferi NPC kaydına yazılır. Hedefe varışta hedef köy nesnesi bir
 *    çözücü fonksiyonla (ctx.resolve) bulunur.
 *
 * 3) ASKER = NÜFUS: Eğitimde her asker 1 boş işçiyi tüketiyor (geri gelmiyor).
 *    Dolayısıyla ölen asker nüfus kaybıdır; kayıpları uygularken population
 *    da düşürülür. Aksi hâlde savaşan oyuncu bedava nüfus kazanırdı.
 *
 * Bu modül state'e dokunur ama dünyayı bilmez: hedef köyü ve isimleri çağıran
 * taraf (index.js) verir.
 */

const { UNIT_DEFS } = require('../data');
const { simulateBattle, towerBonusPct } = require('./combat');
const GT = require('./gameTime');

// ── Ölçek sabitleri ────────────────────────────────────────────────────
/**
 * YÜRÜYÜŞ Travian kuralı: birim hızı = SAATTE kaç hex.
 * Hız 7 bir piyade 10 hex'i 10/7 = 1,43 OYUN SAATİNDE alır. Gerçek süre
 * gameTime.js'deki ölçekten çıkar (1× → 1,43 gerçek saat).
 *
 * Ekonomiyle aynı saate bağlı olması şart: ekonomi 3600 kat yavaşlarken
 * seferler eski hızında kalsaydı bir yağma turu bir tarla yükseltmesinden
 * kısa sürerdi.
 */
const MIN_MARCH_MINUTES = 1;

/** Yağma modunda hedefin deposunun ancak yarısı taşınabilir (Travian kuralı) */
const RAID_LOOT_SHARE = 0.5;

/** Ganimete konu kaynaklar — ham + işlenmiş, hepsi taşınır */
const LOOTABLE = [
  'odun', 'kil', 'tas', 'demir', 'tahil',
  'kereste', 'tugla', 'yontmaTas', 'demirKulce', 'un', 'ekmek',
];

const MODES = new Set(['raid', 'attack', 'scout']);

/**
 * Keşif seferi yalnızca bu birimlerle yapılır: yük taşıyan ama savaşmayan
 * birimler (kapasite ≥ 100, saldırı ≤ 10). Bugün yalnız Kuzey İzcisi'ni
 * kapsıyor; eşik 20 olsaydı Vindreiter (saldırı 20) de girer, keşif ucuz bir
 * saldırı yolu hâline gelirdi.
 */
const SCOUT_UNITS = new Set(
  Object.entries(UNIT_DEFS)
    .filter(([, d]) => (d.stats?.kapasite || 0) >= 100 && (d.stats?.saldiri || 0) <= 10)
    .map(([k]) => k)
);

const MAX_REPORTS = 40;

/**
 * KALICI SAVAŞ SAYAÇLARI — istatistik sekmesindeki sıralamalar bunlardan
 * çıkar. Raporlar yalnızca son 40 olayı tuttuğu için toplamlar ayrı tutulmalı.
 */
function statsOf(village) {
  return (village.stats ||= {
    attacksSent: 0, attacksWon: 0,        // saldırgan tarafı
    killsOffense: 0, lossesOffense: 0,
    lootTotal: 0,                          // toplam ganimet (yağmacı sıralaması)
    scoutsSent: 0,
    defensesTotal: 0, defensesWon: 0,      // savunan tarafı
    killsDefense: 0, lossesDefense: 0,
    lootLostTotal: 0,                      // kendisinden çalınan
  });
}

// ── Yardımcılar ────────────────────────────────────────────────────────
const totalUnits = (units) =>
  Object.values(units || {}).reduce((s, n) => s + (Number(n) || 0), 0);

/** Sefer hızı en yavaş birime bağlıdır */
function slowestSpeed(units) {
  let min = Infinity;
  for (const [k, n] of Object.entries(units || {})) {
    if (!(n > 0)) continue;
    const hiz = UNIT_DEFS[k]?.stats?.hiz;
    if (hiz > 0 && hiz < min) min = hiz;
  }
  return Number.isFinite(min) ? min : 10;
}

/** Tek yön yürüyüş süresi — OYUN SAATİ */
function marchGameHours(units, distance) {
  const hiz = slowestSpeed(units);
  return Math.max(MIN_MARCH_MINUTES / 60, distance / hiz);
}
/** Tek yön yürüyüş süresi — GERÇEK saniye */
function marchSeconds(units, distance) {
  return Math.round(GT.gameHoursToRealMs(marchGameHours(units, distance)) / 1000);
}

/** Hayatta kalan birimlerin taşıyabileceği toplam yük */
function carryCapacity(units) {
  let cap = 0;
  for (const [k, n] of Object.entries(units || {})) {
    cap += (UNIT_DEFS[k]?.stats?.kapasite || 0) * (Number(n) || 0);
  }
  return Math.floor(cap);
}

function armyAttack(units) {
  let a = 0;
  for (const [k, n] of Object.entries(units || {})) {
    a += (UNIT_DEFS[k]?.stats?.saldiri || 0) * (Number(n) || 0);
  }
  return a;
}

/** Kaba savunma gücü — NPC karar verirken ve istemci uyarısında kullanılır */
function armyDefense(units) {
  let d = 0;
  for (const [k, n] of Object.entries(units || {})) {
    const s = UNIT_DEFS[k]?.stats;
    if (!s) continue;
    d += ((s.yayaSav + s.atliSav) / 2) * (Number(n) || 0);
  }
  return d;
}

function buildingLevel(village, type) {
  for (const b of Object.values(village.villageBuildings || {})) {
    if (b.type === type) return b.level || 0;
  }
  return 0;
}

/**
 * Kayıpları köyün ordusundan düş. Ölen asker aynı zamanda nüfus kaybıdır
 * (eğitimde işçi askere dönüşüyor, geri gelmiyor).
 */
function applyLossesToVillage(village, losses) {
  let dead = 0;
  for (const [k, n] of Object.entries(losses || {})) {
    const cnt = Math.max(0, Math.floor(n || 0));
    if (!cnt) continue;
    const have = village.army?.[k] || 0;
    const kill = Math.min(have, cnt);
    if (kill > 0) {
      village.army[k] = have - kill;
      if (village.army[k] <= 0) delete village.army[k];
      dead += kill;
    }
  }
  if (dead > 0) village.population = Math.max(1, (village.population || 0) - dead);
  return dead;
}

/**
 * Hedefin deposundan ganimet al. Kapasiteye kadar, mevcut olanlarla
 * ORANTILI dağıtılır — böylece tek kaynak süpürülmez.
 */
/**
 * Ganimet — YALNIZCA taşıma kapasitesine göre alınır.
 *
 * Saldırganın deposunda yer olup olmadığına bakılmaz: ordu ne taşıyabiliyorsa
 * onu yükler. Eve varışta depoya sığmayan kısım ÇÖP OLUR (bkz. depositLoot),
 * ve kaybedilen miktar rapora `lootLost` olarak yazılır — oyuncu ne kadarının
 * ziyan olduğunu görür. Bu bilinçli bir tercih: depo yönetmek oyunun parçası.
 */
function takeLoot(target, capacity, mode) {
  const loot = {};
  if (!(capacity > 0)) return loot;

  const share = mode === 'raid' ? RAID_LOOT_SHARE : 1;
  const avail = {};
  let availTotal = 0;
  for (const res of LOOTABLE) {
    const amt = Math.floor((target.resources?.[res] || 0) * share);
    if (amt > 0) { avail[res] = amt; availTotal += amt; }
  }
  if (availTotal <= 0) return loot;

  const take = Math.min(capacity, availTotal);
  let taken = 0;
  const keys = Object.keys(avail);
  keys.forEach((res, i) => {
    // Son kalemde yuvarlama artığını kapat — toplam tam `take` olsun
    const amt = i === keys.length - 1
      ? take - taken
      : Math.floor(take * (avail[res] / availTotal));
    const real = Math.max(0, Math.min(amt, avail[res]));
    if (real > 0) {
      loot[res] = real;
      target.resources[res] = Math.max(0, (target.resources[res] || 0) - real);
      taken += real;
    }
  });
  return loot;
}

/**
 * Ganimeti depoya ekle. Tavanı aşan kısım kaybolur (overflow olarak döner).
 * un ve ekmek ambarda ORTAK yer paylaşır (tick.js'deki işleme mantığıyla aynı),
 * bu yüzden ikisi tek `foodRoom` bütçesinden harcanır.
 */
function depositLoot(village, loot, caps = null, foodRoom = null) {
  const overflow = {};
  let room = foodRoom;
  for (const [res, amt] of Object.entries(loot || {})) {
    if ((res === 'un' || res === 'ekmek') && room != null) {
      const fit = Math.min(amt, Math.max(0, room));
      village.resources[res] = (village.resources[res] || 0) + fit;
      room -= fit;
      if (amt - fit > 0) overflow[res] = amt - fit;
      continue;
    }
    const cap = caps?.[res];
    const cur = village.resources[res] || 0;
    if (cap != null) {
      const room = Math.max(0, cap - cur);
      const fit = Math.min(amt, room);
      village.resources[res] = cur + fit;
      if (amt - fit > 0) overflow[res] = amt - fit;
    } else {
      village.resources[res] = cur + amt;
    }
  }
  return overflow;
}

// ── Sefer oluşturma ───────────────────────────────────────────────────
/**
 * @returns {{ ok: true, march: object } | { ok: false, reason: string }}
 */
function createMarch(village, {
  mode, units, distance, fromKey, fromName, toKey, toName, toKind, ownerKind = 'player',
}) {
  if (!MODES.has(mode)) return { ok: false, reason: 'gecersiz_mod' };
  if (!(distance > 0)) return { ok: false, reason: 'gecersiz_hedef' };

  // Birimleri temizle ve mevcut orduya karşı doğrula
  const clean = {};
  for (const [k, raw] of Object.entries(units || {})) {
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    if (!n) continue;
    if (!UNIT_DEFS[k]) return { ok: false, reason: 'bilinmeyen_birim' };
    const have = village.army?.[k] || 0;
    if (n > have) return { ok: false, reason: 'yetersiz_asker' };
    clean[k] = n;
  }
  if (totalUnits(clean) <= 0) return { ok: false, reason: 'asker_secilmedi' };

  if (mode === 'scout') {
    const bad = Object.keys(clean).find(k => !SCOUT_UNITS.has(k));
    if (bad) return { ok: false, reason: 'kesif_icin_izci_gerek' };
  } else if (armyAttack(clean) <= 0) {
    return { ok: false, reason: 'saldiri_gucu_yok' };
  }

  // Askerleri köyden çıkar — yoldayken savunmaya katılmazlar
  for (const [k, n] of Object.entries(clean)) {
    village.army[k] -= n;
    if (village.army[k] <= 0) delete village.army[k];
  }

  const legHours = marchGameHours(clean, distance);
  if (!village.nextMarchId) village.nextMarchId = 1;
  const march = {
    id: village.nextMarchId++,
    mode, ownerKind,
    fromKey, fromName, toKey, toName, toKind: toKind || 'npc',
    units: clean,
    distance,
    phase: 'outbound',
    departAt: Date.now(),          // yalnızca bilgi amaçlı
    legHours,                      // tek yön, oyun saati
    remainingHours: legHours,      // dünya adımlarında azalır
    legSeconds: Math.round(GT.gameHoursToRealMs(legHours) / 1000),  // 1× karşılığı
    loot: null,
    intel: null,
  };
  (village.marches ||= []).push(march);
  return { ok: true, march };
}

// ── Çözüm ─────────────────────────────────────────────────────────────
function pushReport(village, report) {
  const list = (village.reports ||= []);
  list.unshift(report);
  if (list.length > MAX_REPORTS) list.length = MAX_REPORTS;
}

/**
 * Sefer hedefe vardı: savaş / keşif çöz, ganimeti al, dönüşe geçir.
 *
 * @param {object} march
 * @param {object} origin  seferi gönderen köy (raporu buraya yazılır)
 * @param {object|null} target hedef köy nesnesi (yoksa sefer boş döner)
 * @param {object} opts { targetName, targetIntel }
 */
function resolveArrival(march, origin, target, opts = {}) {
  const now = Date.now();
  const toName = opts.targetName || march.toName;

  // Hedef bulunamadı (kayıt yok / köy yok): ordu boş döner
  if (!target) {
    march.phase = 'return';
    march.remainingHours = march.legHours;
    march.loot = {};
    pushReport(origin, {
      id: `${march.id}-${now}`, at: now, dir: 'out', mode: march.mode,
      fromName: march.fromName, toName, toKey: march.toKey,
      outcome: 'hedef_yok', winner: 'none',
      sent: { ...march.units }, myLosses: {}, theirLosses: {}, loot: {},
    });
    return march;
  }

  const surLevel    = buildingLevel(target, 'sur');
  const hendekLevel = buildingLevel(target, 'hendek');
  // Kule bonusu okçu dolulukla ölçeklenir — boş kule fayda vermez
  const kulePct     = towerBonusPct(target);

  // ── KEŞİF: çarpışma yok, bilgi toplanır ──────────────────────────
  if (march.mode === 'scout') {
    const intel = {
      population: target.population || 0,
      army: { ...(target.army || {}) },
      armyTotal: totalUnits(target.army),
      defense: Math.round(armyDefense(target.army)),
      surLevel, hendekLevel, kulePct,
      resources: Object.fromEntries(
        LOOTABLE.map(r => [r, Math.floor(target.resources?.[r] || 0)])),
      at: now,
    };
    statsOf(origin).scoutsSent += 1;
    march.phase = 'return';
    march.remainingHours = march.legHours;
    march.intel = intel;
    march.loot = {};
    pushReport(origin, {
      id: `${march.id}-${now}`, at: now, dir: 'out', mode: 'scout',
      fromName: march.fromName, toName, toKey: march.toKey,
      outcome: 'kesif', winner: 'none',
      sent: { ...march.units }, myLosses: {}, theirLosses: {}, loot: {},
      intel,
    });
    return march;
  }

  // ── SAVAŞ ────────────────────────────────────────────────────────
  const defenderUnits = { ...(target.army || {}) };
  /**
   * Ekipman yükseltmeleri KÖYE ait: saldıranınki `origin`den, savunanınki
   * `target`tan okunuyor. İkisi ayrı olmalı — saldıranın kılıç seviyesi
   * savunanın kalkanını güçlendirmemeli.
   */
  const res = simulateBattle(march.units, defenderUnits, {
    surLevel, hendekLevel, kulePct,
    mode: march.mode === 'raid' ? 'raid' : 'normal',
    attackerLevels: origin?.equipmentLevels || null,
    defenderLevels: target?.equipmentLevels || null,
  });

  // Savunanın kaybı hedefin ordusundan düşer (+ nüfus)
  const defenderDead = applyLossesToVillage(target, res.defenderLosses);

  const survivors = res.attackerSurvivors || {};
  const survTotal = totalUnits(survivors);

  // Saldıranın ölüleri de nüfus kaybıdır. Askerler gönderilirken orduDAN
  // çıkarıldı ama nüfusa dokunulmadı; ölenler geri dönmediği için nüfus
  // burada düşürülmeli — yoksa savaşan oyuncu bedava nüfus kazanır.
  const attackerDead = totalUnits(res.attackerLosses);
  if (attackerDead > 0) {
    origin.population = Math.max(1, (origin.population || 0) - attackerDead);
  }

  // Ganimet: hayatta kalan varsa taşınır. Keşifte ve tam yok olmada yok.
  const loot = survTotal > 0
    ? takeLoot(target, carryCapacity(survivors), march.mode)
    : {};

  march.units = survivors;
  march.loot  = loot;
  march.phase = 'return';
  // Yükle dönüşte de aynı süre — hız yükle değişmiyor (basit tutuldu)
  march.remainingHours = march.legHours;

  march.reportId = `${march.id}-${now}`;
  const report = {
    id: march.reportId, at: now, dir: 'out', mode: march.mode,
    fromName: march.fromName, toName, toKey: march.toKey,
    outcome: 'savas', winner: res.winner,
    sent: { ...(res.attackerLosses || {}) },   // aşağıda düzeltilir
    myLosses: res.attackerLosses || {},
    theirLosses: res.defenderLosses || {},
    survivors: { ...survivors },
    loot,
    attackTotal: res.attackTotal, defenseTotal: res.defenseTotal,
    wallBonusPct: res.wallBonusPct,
    defenderDead, attackerDead,
  };
  // Gönderilen = hayatta kalan + kayıp
  report.sent = Object.fromEntries(
    [...new Set([...Object.keys(survivors), ...Object.keys(res.attackerLosses || {})])]
      .map(k => [k, (survivors[k] || 0) + ((res.attackerLosses || {})[k] || 0)]));
  pushReport(origin, report);

  // Sayaçlar — iki taraf için de
  const lootSum = Object.values(loot).reduce((a, b) => a + b, 0);
  const so = statsOf(origin);
  so.attacksSent   += 1;
  so.attacksWon    += res.winner === 'attacker' ? 1 : 0;
  so.killsOffense  += defenderDead;
  so.lossesOffense += attackerDead;
  so.lootTotal     += lootSum;

  const st = statsOf(target);
  st.defensesTotal += 1;
  st.defensesWon   += res.winner === 'defender' ? 1 : 0;
  st.killsDefense  += attackerDead;
  st.lossesDefense += defenderDead;
  st.lootLostTotal += lootSum;

  // Savunan tarafın raporu (aynı olay, karşı taraftan)
  pushReport(target, {
    id: `${march.id}-${now}-d`, at: now, dir: 'in', mode: march.mode,
    fromName: march.fromName, fromKey: march.fromKey, toName,
    outcome: 'savas', winner: res.winner,
    attackerUnits: report.sent,
    myLosses: res.defenderLosses || {}, theirLosses: res.attackerLosses || {},
    loot, wallBonusPct: res.wallBonusPct,
    attackTotal: res.attackTotal, defenseTotal: res.defenseTotal,
  });

  return march;
}

/** Sefer eve döndü: hayatta kalanlar orduya, ganimet depoya */
function resolveReturn(march, origin, caps = null, foodRoom = null) {
  origin.army ||= {};
  for (const [k, n] of Object.entries(march.units || {})) {
    if (n > 0) origin.army[k] = (origin.army[k] || 0) + n;
  }
  const overflow = depositLoot(origin, march.loot || {}, caps, foodRoom);
  // Keşif bilgisi hedef bazında saklanır: saldırı ekranı tahmini bununla yapar.
  // Tek bir `lastIntel` alanı olsaydı ikinci keşif birincisini silerdi.
  if (march.intel) {
    (origin.intel ||= {})[march.toKey] = { ...march.intel, toName: march.toName };
  }
  // Depo tavanı yüzünden kaybolan ganimeti rapora işle — oyuncu 1300 ganimet
  // yazan raporu görüp deposunda 500 bulunca sistemin bozuk olduğunu sanıyor.
  if (Object.keys(overflow).length && march.reportId) {
    const rep = (origin.reports || []).find(x => x.id === march.reportId);
    if (rep) rep.lootLost = overflow;
  }
  return overflow;
}

/**
 * Seferi `hours` oyun saati ilerlet. Varış/dönüş anı geldiyse true döner.
 * Eski kayıtlarda `remainingHours` yok, `arriveAt` var: bir kereye mahsus çevrilir.
 */
function advanceMarch(march, hours) {
  if (march.remainingHours == null) {
    const leftMs = Math.max(0, (march.arriveAt || 0) - Date.now());
    march.remainingHours = leftMs / 1000 / GT.HOUR_SECONDS;
    if (march.legHours == null) march.legHours = march.remainingHours || 0.1;
  }
  march.remainingHours -= hours;
  return march.remainingHours <= 0;
}

module.exports = {
  advanceMarch, statsOf,
  RAID_LOOT_SHARE, LOOTABLE, SCOUT_UNITS, MAX_REPORTS, MIN_MARCH_MINUTES,
  marchSeconds, marchGameHours, slowestSpeed, carryCapacity, armyAttack, armyDefense,
  totalUnits, buildingLevel, applyLossesToVillage, takeLoot, depositLoot,
  createMarch, resolveArrival, resolveReturn, pushReport,
};
