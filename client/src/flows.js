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

/**
 * SİPARİŞ ADEDİ TAVANI — oyun dengesi değil, saçma girdi kapısı.
 *
 * Eskiden 50'ydi ve gerçek bir sınır gibi davranıyordu: deposu dolu oyuncu
 * bile bir seferde 50'den fazla asker/ekipman sipariş edemiyordu. Oysa asıl
 * sınır zaten kaynak, ekipman ve boş işçi — sunucu bedeli sipariş anında
 * peşin düşüyor, yetmezse siparişi hiç almıyor.
 *
 * Sunucudaki ADET_TAVANI ile AYNI kalmalı (server/index.js).
 */
export const QTY_TAVAN = 10000;

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
  // Bütün oranlar oyun SAATİ başına; ETA da oyun saati çıkıyor. Ekranda
  // gerçek saniye göstermek için zaman ölçeğiyle çevrilmesi gerekiyor.
  const hourSeconds = v.marchInfo?.hourSeconds || 3600;
  const speed       = v.worldSpeed || 1;
  const toRealSecs  = (gameHours) => Math.ceil(
    gameHours * hourSeconds / Math.max(0.01, speed));

  const gross    = {};
  const consumed = {};
  const producer = {};   // bu kaynağı hangi işleme binası üretiyor
  const consumer = {};   // bu kaynağı hangi işleme binası yiyor

  // 1) Ham madde brüt üretimi (üretim tile'ları)
  for (const [key, rate] of Object.entries(production)) {
    gross[key] = (gross[key] || 0) + (Number(rate) || 0);
  }

  /**
   * 2) İŞLEME BİNALARI — GERÇEKTEN işleyebildikleri kadar.
   *
   * DÜZELTME: eskiden binanın NOMİNAL iştahı (işçi × girdi/saat) tüketim
   * yazılıyordu. Değirmene 60 işçi atanmışsa ekranda "−5.400 tahıl/sa"
   * görünüyordu; oysa tarlalar 2.880 üretiyor ve motor yalnız VAR OLANI
   * tüketiyor. Sonuç: tahıl −3.264/sa diye korkutucu bir sayı, gerçek net
   * ise 0 — ekmek sorunsuz üretilirken oyuncu "tahıl yetmiyor" sanıyordu.
   *
   * Artık her bina girdisinin o an ulaşabildiği kadarını işliyor sayılıyor.
   * Zincir sıralı (tahıl → un → ekmek) olduğu için birkaç tur dönülüyor:
   * un'un ne kadar üretildiği belli olmadan fırının ne işleyebileceği
   * hesaplanamaz. `limited` ve `idleWorkers` alanları arayüze "bu binada N
   * işçi girdisizlikten boşta duruyor" diyebilmek için üretiliyor.
   */
  const etkin = {};                 // output -> { girdi, cikti, oran }
  const girisler = Object.entries(processing).filter(([, p]) => p);
  for (let tur = 0; tur < girisler.length + 1; tur++) {
    let degisti = false;
    // Bu turdaki arz: ham üretim + o ana kadar hesaplanan işleme çıktıları
    const arz = { ...gross };
    for (const [o, e] of Object.entries(etkin)) arz[o] = (arz[o] || 0) + e.cikti;
    // Aynı girdiyi paylaşan binalar arzı bölüşür (şu an her girdinin tek
    // tüketicisi var; yine de doğru davranması için düşülüyor)
    for (const [output, p] of girisler) {
      const istek = Number(p.inputPerHour) || 0;
      if (istek <= 0) { etkin[output] = { girdi: 0, cikti: 0, oran: 1 }; continue; }
      const rakip = girisler
        .filter(([o2]) => o2 !== output && processing[o2]?.input === p.input)
        .reduce((s, [o2]) => s + (etkin[o2]?.girdi || 0), 0);
      const bulunabilir = Math.max(0, (arz[p.input] || 0) - rakip);
      const girdi = Math.min(istek, bulunabilir);
      const oran = istek > 0 ? girdi / istek : 1;
      const cikti = (Number(p.outputPerHour) || 0) * oran;
      const onceki = etkin[output];
      if (!onceki || Math.abs(onceki.girdi - girdi) > 0.001) degisti = true;
      etkin[output] = { girdi, cikti, oran };
    }
    if (!degisti) break;
  }

  for (const [output, p] of girisler) {
    const e = etkin[output] || { girdi: 0, cikti: 0, oran: 1 };
    gross[output]      = (gross[output] || 0) + e.cikti;
    consumed[p.input]  = (consumed[p.input] || 0) + e.girdi;
    const isci = p.workers || 0;
    producer[output]   = {
      workers: isci, maxWorkers: p.maxWorkers || 0,
      // Girdi yetmiyorsa bu binadaki işçilerin bir kısmı boşa duruyor
      limited: e.oran < 0.999,
      oran: e.oran,
      idleWorkers: Math.max(0, Math.round(isci * (1 - e.oran))),
      nominal: Number(p.outputPerHour) || 0,
    };
    consumer[p.input]  = { output, workers: isci, limited: e.oran < 0.999, oran: e.oran };
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
      else { etaKind = 'fill'; etaSeconds = toRealSecs(room / net); }
    } else if (net < -0.01) {
      if (value <= 0) { etaKind = 'empty'; }
      else { etaKind = 'drain'; etaSeconds = toRealSecs(value / -net); }
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

/**
 * İKİ YAYIN ARASINI DOLDUR — sunucu artık saniyede bir paket yollamıyor.
 *
 * Sunucu köyün tamamını yalnız yapısal bir değişiklikte ya da 30 saniyelik
 * kalp atışında gönderiyor (oyuncu başına ~10 KB/s trafiği ~0.3 KB/s'e
 * indiren düzeltme). Arada iki şeyin akmaya devam etmesi gerekiyor:
 *   1. kaynak miktarları — saatlik net akıştan hesaplanır, kapasitede durur
 *   2. geri sayımlar — her `timeLeft` alanından geçen süre düşülür
 * Sunucu her paket geldiğinde mutlak doğruyu yazdığı için sapma birikmiyor.
 */
function shiftTimers(o, secs) {
  if (Array.isArray(o)) return o.map(x => shiftTimers(x, secs));
  if (o && typeof o === 'object') {
    const out = {};
    for (const k in o) {
      const val = o[k];
      out[k] = (typeof val === 'number' && /timeleft$/i.test(k))
        ? Math.max(0, val - secs)
        : shiftTimers(val, secs);
    }
    return out;
  }
  return o;
}

export function extrapolate(v, elapsedMs) {
  if (!v || !(elapsedMs > 0)) return v;
  const secs = elapsedMs / 1000;
  const next = shiftTimers(v, secs);

  const hourSeconds = v.marchInfo?.hourSeconds || 3600;
  const speed = v.worldSpeed || 1;
  const gameHours = (secs / hourSeconds) * speed;
  if (gameHours > 0 && next.resources) {
    const flows = computeFlows(v);
    const res = { ...next.resources };
    for (const k of Object.keys(res)) {
      const f = flows[k];
      if (!f || !f.net) continue;
      const cap = Number.isFinite(f.capacity) ? f.capacity : Infinity;
      const val = (res[k] || 0) + f.net * gameHours;
      res[k] = Math.round(Math.max(0, Math.min(cap, val)) * 10) / 10;
    }
    next.resources = res;
  }
  return next;
}

/**
 * Oyun DAKİKASI → GERÇEK saniye.
 *
 * Tanım dosyalarındaki bütün süreler (tarla `sureSaat`, bina `buildBaseWork`,
 * birim eğitimi, ekipman `productionHours`×60) oyun DAKİKASI cinsindendir.
 * Sunucu bunları `GT.minutesToClock` ile sanal saate çevirip geri sayımı
 * `GT.clockToRealSeconds` ile gerçek saniyeye döndürüyor. İstemcideki tahmin
 * kutuları da AYNI çeviriyi kullanmalı; yoksa "8 sn" yazıp 8 dakika sürer.
 *
 * hourSeconds: bir oyun saatinin kaç gerçek saniye sürdüğü (payload'da gelir)
 * speed:       oyuncunun hız çarpanı (village.worldSpeed)
 */
export function gameHoursToRealSeconds(hours, hourSeconds = 3600, speed = 1) {
  if (!isFinite(hours) || hours <= 0) return hours === 0 ? 0 : Infinity;
  return Math.ceil(hours * (hourSeconds || 3600) / Math.max(0.01, speed || 1));
}

export function gameMinutesToRealSeconds(minutes, hourSeconds = 3600, speed = 1) {
  if (!isFinite(minutes) || minutes <= 0) return minutes === 0 ? 0 : Infinity;
  // Sunucudaki iki adımın AYNISI: minutesToClock -> clockToRealSeconds.
  // Kayan nokta yuvarlaması yüzünden tek adımda hesaplayınca 1 sn sapma
  // olabiliyor (40 dk için 2400 yerine 2401); adımlar birebir taklit edildi.
  const clock = minutes * (1000 / 60);            // CLOCK_PER_GAME_MINUTE
  const gameHours = clock / 1000;                 // CLOCK_PER_GAME_HOUR
  return Math.ceil(gameHours * (hourSeconds || 3600) / Math.max(0.01, speed || 1));
}

/**
 * SAVUNMA YAPILARINDA PERSONEL
 *  • Sur ve hendek personel almaz — arayüzde hiç işçi ibaresi çıkmamalı.
 *  • Kule personel alır ama onlar işçi değil OKÇU.
 */
export const NO_WORKER_TYPES = new Set(['sur', 'hendek']);

/**
 * PERSONEL ALAN ASKERİ BİNALAR — sunucudaki WORKER_ASSIGNABLE_MILITARY'nin
 * (server/index.js) BİREBİR aynısı olmalı. Sunucu kabul edip istemci
 * bilmezse bina hiç işçi alamıyor gibi görünür: atama arayüzü çizilmez,
 * oyuncu da "işçi atayamıyorum" der.
 *
 * Bu liste üçüncü kez ayrıştı. Önce VillageCenter'daki kopyada `kule`
 * eksikti; tek kaynağa indirildi ama sunucuya sonradan eklenen üçü
 * buraya geçmemişti:
 *   runSalonu → işçi atanamıyor, dolayısıyla ARAŞTIRMA HİÇ YAPILAMIYOR
 *   kosk, saray → göçmen eğitmeni atanamıyor, kuyruk ilerlemiyor
 * Sunucudaki listeyi değiştirirken BURAYI DA değiştir.
 */
export const WORKER_ASSIGNABLE_MILITARY = new Set([
  'silahci', 'zirh', 'ahir', 'kisla', 'atolye', 'kule', 'runSalonu',
  'kosk', 'saray',
]);

/** Bu bina personel alır mı? (üretim yapan her bina + askeri liste) */
export function takesWorkers(type, def) {
  if (!def || NO_WORKER_TYPES.has(type)) return false;
  return !!def.processes || WORKER_ASSIGNABLE_MILITARY.has(type);
}

/** Binanın personel kapasitesi — seviye × workersPerLevel */
/**
 * BİR İNŞAATA KONABİLECEK EN FAZLA İŞÇİ — sunucudaki MAX_BUILDERS ikizi.
 * Tavan = inşa edilecek seviyenin bir altı + 2 (yeni bina için 3).
 * Boş işçi havuzuyla birlikte küçüğü geçerli.
 */
export const maxBuilders = (mevcutSeviye) => Math.max(1, (mevcutSeviye || 0) + 2);

/**
 * YIKIM SÜRESİ — sunucudaki getVillageDemolishMinutes ikizi.
 *
 * O seviyenin TAM KADROYLA inşa süresinin onda biri. Yıkıma işçi
 * atanmıyor; sayı yalnız oyuncuya "ne kadar sürecek" demek için.
 */
export const YIKIM_ORANI = 0.1;

export function yikimDakikasi(def, level) {
  if (!def) return 0;
  const lvl = Math.max(1, level || 1);
  const work = def.buildBaseWork * Math.pow(def.buildMultiplier, lvl - 1);
  return (work / maxBuilders(lvl)) * YIKIM_ORANI;
}

/** Saniye → "2 sa 15 dk" gibi kısa süre. Onay metninde kullanılıyor. */
function sureMetni(sn) {
  const s = Math.max(0, Math.round(sn));
  if (s < 60) return `${s} sn`;
  const dk = Math.round(s / 60);
  if (dk < 60) return `${dk} dk`;
  const sa = Math.floor(dk / 60);
  const kalanDk = dk % 60;
  return kalanDk ? `${sa} sa ${kalanDk} dk` : `${sa} sa`;
}

/**
 * YIKIM ONAYI — tek metin, iki giriş noktası.
 *
 * Yıkma düğmesi köy merkezinde de bina panelinde de var; onayı iki yere
 * ayrı ayrı yazmak ikisinin ayrışmasına davetiye. Geri alınamayan bir
 * işlem için tek soru, tek metin.
 *
 * @returns {boolean} oyuncu onayladı mı
 */
export function yikimOnayi(def, building, hourSeconds = 3600, worldSpeed = 1) {
  const lvl = building?.level ?? 0;
  const ad = def?.name || building?.type || 'Bu bina';
  // Henüz bitmemiş inşaat anında kalkıyor — süre yazma, yanlış bilgi olur
  const insaHalinde = !!building?.building || lvl < 1;
  const sn = gameMinutesToRealSeconds(
    yikimDakikasi(def, lvl), hourSeconds, worldSpeed);
  const satirlar = insaHalinde
    ? [`${ad} inşaatı iptal edilsin mi?`, '',
       '• İşçiler hemen havuza döner.',
       '• Harcanan kaynak GERİ GELMEZ.']
    : [`${ad} (Lvl ${lvl}) yıkılsın mı?`, '',
       `• Yıkım ${sureMetni(sn)} sürer; o süre boyunca bina çalışmaz.`,
       '• Personeli hemen işçi havuzuna döner.',
       '• Harcanan kaynak GERİ GELMEZ.'];
  return window.confirm(satirlar.join('\n'));
}



export function maxWorkersOf(type, def, level) {
  if (!takesWorkers(type, def) || !level || level < 1) return 0;
  return level * (def.workersPerLevel || 3);
}
const WORKER_TERM = { kule: 'Okçu' };
export const workerTerm  = (type) => WORKER_TERM[type] || 'İşçi';
export const workerTermLc = (type) => (WORKER_TERM[type] || 'İşçi').toLowerCase();
