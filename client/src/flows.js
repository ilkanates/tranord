/**
 * Kaynak akışı hesabı — brüt üretim, tüketim, net akış.
 *
 * Sunucu payload'ı ham veriyi veriyor ama net akışı vermiyor:
 *   productionPerHour  → ham madde brüt üretimi (tile'lardan)
 *   processingRates    → çıktıya göre anahtarlı: { kereste: { input:'odun', inputPerHour, outputPerHour, ... } }
 *   consumption        → { foodPerHour (nüfus+ordu, ekmek), grainPerHour (atlar, ham tahıl) }
 *
 * Buradaki hesap tamamen client tarafında; sunucuya dokunmaz.
 */

// Ham → işlenmiş zincirler. Rail'de birlikte gösterilir.
export const CHAINS = [
  { id: 'odun',  steps: ['odun', 'kereste'] },
  { id: 'kil',   steps: ['kil', 'tugla'] },
  { id: 'tas',   steps: ['tas', 'yontmaTas'] },
  { id: 'demir', steps: ['demir', 'demirKulce'] },
  { id: 'tahil', steps: ['tahil', 'un', 'ekmek'] },
];

export const RES_LABEL = {
  odun: 'Odun', kereste: 'Kereste',
  kil: 'Kil', tugla: 'Tuğla',
  tas: 'Taş', yontmaTas: 'Yontma Taş',
  demir: 'Demir', demirKulce: 'Külçe Demir',
  tahil: 'Tahıl', un: 'Un', ekmek: 'Ekmek',
};

export const EQ_LABEL = {
  kilic: 'Kılıç', mizrak: 'Mızrak', kalkan: 'Kalkan', zirh: 'Zırh', at: 'At',
};

const FOOD_KEYS = new Set(['un', 'ekmek']);

/**
 * @returns {Object<string, {
 *   key, value, gross, consumed, net, capacity, shared,
 *   pct, etaSeconds, etaKind, producer, consumer
 * }>}
 */
export function computeFlows(v = {}) {
  const resources   = v.resources || {};
  const production  = v.productionPerHour || {};
  const processing  = v.processingRates || {};
  const caps        = v.depotCapacities || {};
  const granaryCap  = v.granaryCapacity || 0;
  const consumption = v.consumption || {};

  const gross    = {};
  const consumed = {};
  const producer = {};   // bu kaynağı hangi işleme binası üretiyor
  const consumer = {};   // bu kaynağı hangi işleme binası yiyor

  // 1) Ham madde brüt üretimi (üretim tile'ları)
  for (const [key, rate] of Object.entries(production)) {
    gross[key] = (gross[key] || 0) + (Number(rate) || 0);
  }

  // 2) İşleme binaları: girdi tüketir, çıktı üretir
  for (const [output, p] of Object.entries(processing)) {
    if (!p) continue;
    gross[output]      = (gross[output] || 0) + (Number(p.outputPerHour) || 0);
    consumed[p.input]  = (consumed[p.input] || 0) + (Number(p.inputPerHour) || 0);
    producer[output]   = { workers: p.workers || 0, maxWorkers: p.maxWorkers || 0 };
    consumer[p.input]  = { output, workers: p.workers || 0 };
  }

  // 3) Beslenme: nüfus+ordu ekmek yer, atlar ham tahıl yer
  consumed.ekmek = (consumed.ekmek || 0) + (Number(consumption.foodPerHour)  || 0);
  consumed.tahil = (consumed.tahil || 0) + (Number(consumption.grainPerHour) || 0);

  const foodTotal = (resources.un || 0) + (resources.ekmek || 0);

  const out = {};
  const allKeys = new Set([
    ...Object.keys(RES_LABEL),
    ...Object.keys(gross),
    ...Object.keys(consumed),
  ]);

  for (const key of allKeys) {
    const value = Number(resources[key]) || 0;
    const g     = Number(gross[key])     || 0;
    const c     = Number(consumed[key])  || 0;
    const net   = g - c;

    const shared   = FOOD_KEYS.has(key);
    const capacity = shared ? granaryCap : (Number(caps[key]) || 0);
    // Paylaşımlı granary'de doluluk un+ekmek toplamına göre
    const fillBase = shared ? foodTotal : value;
    const pct = capacity > 0 ? Math.min(1, fillBase / capacity) : null;

    // ETA: net pozitifse dolma, negatifse tükenme süresi
    let etaSeconds = null, etaKind = null;
    if (net > 0.01 && capacity > 0) {
      const room = capacity - fillBase;
      if (room <= 0) { etaKind = 'full'; }
      else { etaKind = 'fill'; etaSeconds = room / net; }
    } else if (net < -0.01) {
      if (value <= 0) { etaKind = 'empty'; }
      else { etaKind = 'drain'; etaSeconds = value / -net; }
    }

    out[key] = {
      key, value,
      gross: g, consumed: c, net,
      capacity, shared, pct, etaSeconds, etaKind,
      producer: producer[key] || null,
      consumer: consumer[key] || null,
    };
  }

  return out;
}

/** Bir zincirin toplam sağlığı — rail'de zincir başlığını renklendirmek için */
export function chainStatus(flows, chain) {
  let worst = 'ok';
  for (const key of chain.steps) {
    const f = flows[key];
    if (!f) continue;
    if (f.etaKind === 'empty' || (f.net < 0 && f.value <= 0)) return 'empty';
    if (f.etaKind === 'full') worst = 'full';
    else if (f.net < 0 && worst === 'ok') worst = 'draining';
  }
  return worst;
}
