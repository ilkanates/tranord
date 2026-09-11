/**
 * SEFER TARAMA — dünyadaki bütün yürüyüşleri gezmek.
 *
 * server/index.js'ten AYNEN taşındı. Üçü de aynı işi yapıyor: her sefer
 * ÇIKTIĞI köyün state icinde durdugu icin (bkz. game/army.js), bana kim
 * geliyor?" sorusunun cevabı ancak bütün köyleri tarayarak bulunuyor.
 *
 * `gelenSeferSayilari` bu yüzden ayrı duruyor: köy listesi köy başına bir
 * kez `incomingMarchesFor` çağırsaydı dünya N kez taranırdı. Tek geçişte
 * ilgilenilen slotları sayıyor.
 */
const { userSessions, WORLD, markNpcDirty } = require('../durum');
const ARMY = require('./army');
const GT = require('./gameTime');

/**
 * Sefer taşıyan tüm köyler — oyuncu oturumları + NPC'ler.
 * Ad NOTU: 'allVillages' denemez — bootServer içinde aynı adlı bir yerel
 * değişken var (DB'den yüklenen köy listesi) ve gölgeleme karışıklık yaratır.
 */
function* marchingVillages() {
  // ÇOKLU KÖY: her köy kendi seferlerini taşıyor, oyuncunun hepsi gezilir
  for (const [userId, session] of userSessions) {
    for (const [slotKey, village] of session.villages) {
      yield {
        village, kind: 'player', userId, slotKey,
        dirty: () => { session.dirtySlots.add(slotKey); },
      };
    }
  }
  for (const n of WORLD.npcs.values()) {
    yield {
      village: n.village, kind: 'npc', userId: null, slotKey: n.slot.key,
      dirty: () => { markNpcDirty(n.slot.key); },
    };
  }
}

/** Arayüzdeki köy değiştirici için hafif liste */
/**
 * Verilen slotlara YÜRÜMEKTE OLAN düşman sefer sayıları — TEK geçişte.
 *
 * incomingMarchesFor() her çağrıda dünyadaki bütün seferleri tarıyor;
 * köy listesinde köy başına bir kez çağırmak N kat maliyet demekti.
 * Burada bütün seferler bir kez geziliyor, ilgilenilen slotlar sayılıyor.
 */
function gelenSeferSayilari(slotKeys) {
  const say = new Map();
  if (!slotKeys.size) return say;
  for (const entry of marchingVillages()) {
    for (const m of entry.village.marches || []) {
      if (m.phase !== 'outbound' || m.mode === 'yerlesim') continue;
      if (!slotKeys.has(m.toKey)) continue;
      // Kendi köyünden kendi köyüne takviye uyarı sayılmaz
      if (slotKeys.has(m.fromKey)) continue;
      say.set(m.toKey, (say.get(m.toKey) || 0) + 1);
    }
  }
  return say;
}

/** Bir slota gelmekte olan seferler — oyuncu uyarısı için */
function incomingMarchesFor(slotKey) {
  const out = [];
  if (!slotKey) return out;
  for (const entry of marchingVillages()) {
    for (const m of entry.village.marches || []) {
      if (m.phase !== 'outbound' || m.toKey !== slotKey) continue;
      out.push({
        key: `${entry.slotKey}#${m.id}`,
        mode: m.mode,
        fromKey: m.fromKey, fromName: m.fromName,
        // Tam birim dökümü verilmiyor; büyüklük 10'a yuvarlanmış toplam olarak
        // veriliyor ki oyuncu savunma kararı verebilsin (ileride gözcü kulesi
        // bunu netleştirebilir).
        sizeApprox: Math.round(ARMY.totalUnits(m.units) / 10) * 10,
        timeLeft: GT.clockToRealSeconds(
          GT.hoursToClock(Math.max(0, m.remainingHours ?? 0)), WORLD.speed),
      });
    }
  }
  return out.sort((a, b) => a.timeLeft - b.timeLeft);
}

module.exports = { marchingVillages, gelenSeferSayilari, incomingMarchesFor };
