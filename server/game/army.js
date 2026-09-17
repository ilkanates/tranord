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
const { SETTLER_UNIT, SETTLERS_REQUIRED } = require('../data/militaryDefs');
const { simulateBattle, towerBonusPct } = require('./combat');
const KUSATMA = require('./kusatma');
const HERO = require('./kahraman');
/*
  SAĞLIK ÇADIRI kendi dosyasında. Kural önce koyKurallari.js'e yazılmıştı
  ama o dosya bu dosyayı require ediyor; karşılıklı require DÖNGÜ kurdu ve
  yükleme sırasına göre bağlantı boş kalıp savaşı çökertti (ölçüldü).
  saglik.js hiçbir şeyi require etmiyor — döngü kurulamaz.
*/
const SAGLIK = require('./saglik');
const SIGINAK = require('./siginak');
const { VILLAGE_DEFS } = require('../data/villageDefs');
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

/**
 * 'yerlesim' = göçmen seferi: savaş yok, hedef BOŞ bir dünya slotu, varışta
 * orada yeni köy kurulur (bkz. server/index.js foundVillageAt). Gidiş tek
 * yön — dönüş ayağı hiç oluşmaz.
 */
/**
 * 'takviye' = savunma desteği: hedef köyde savaş YOK, asker orada misafir
 * kalır ve o köy saldırı alınca savunmaya katılır. Dönüş ayağı kendiliğinden
 * oluşmaz — sahibi geri çağırınca yeni bir dönüş seferi yaratılır.
 *
 * BESLEME KARARI: misafir askeri EV SAHİBİ köy besler (İlkan'ın kararı).
 * Bu oyunda kısıt zaten tahıl olduğu için karar dengeyi doğrudan belirliyor:
 * takviye almak bedava kalkan değil, ev sahibine gerçek bir yem maliyeti.
 * Uygulaması tick.js · getConsumptionRates içinde.
 */
const MODES = new Set(['raid', 'attack', 'scout', 'yerlesim', 'takviye']);

/**
 * Keşif seferi yalnızca `kesif: true` işaretli birimlerle yapılır.
 *
 * Eskiden "kapasite ≥ 100 ve saldırı ≤ 10" diye TÜRETİLİYORDU. İzcinin
 * yükü dengeleme sırasında 0'a indirilince izci bu kümeden düştü ve
 * keşif tamamen bozuldu (testten yakalandı). Bir birimin ROLÜ taşıma
 * kapasitesinden türetilmemeli — tanımda açıkça yazmalı.
 */
const SCOUT_UNITS = new Set(
  Object.entries(UNIT_DEFS).filter(([, d]) => d.kesif === true).map(([k]) => k)
);

/**
 * KÖY BAŞINA SAKLANAN RAPOR — 40 → 250.
 *
 * 40 iken 41. rapor geri dönülemez biçimde siliniyordu (İlkan: *"bütün
 * raporlar saklanmalı"*). Sınırsız da yapılmadı: raporlar köyün
 * state'inde tek bir JSONB satırında duruyor ve o satır her kayıtta
 * bütün olarak yazılıyor; sınırsız birikim aylarca oynanan bir köyde
 * her kaydı megabaytlara çıkarır ve tik yoluna yazma gecikmesi sokardı.
 *
 * 250 rapor ~150 KB: oyuncunun "hepsi" diye algılayacağı kadar derin,
 * veritabanını boğmayacak kadar sığ.
 */
const MAX_REPORTS = 250;

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

/**
 * Tek yön yürüyüş süresi — OYUN SAATİ (en yavaş birime göre).
 *
 * @param {number} kahramanHiz Kahraman bu seferde YALNIZ yürüyorsa hızı.
 *   0 verilirse kahraman yok sayılıyor. Kahramanın hızı artık sabit
 *   değil: yaya tabanı + attan gelen ek (bkz. kahraman.js · hizi).
 *
 * ORDUYLA GİDERSE HIZI SAYILMIYOR. Kahraman orduyu bekler; en yavaş
 * birim yine belirleyici. Aksi hâlde atlı bir kahraman mancınıkları da
 * kendi hızında uçururdu.
 */
function marchGameHours(units, distance, kahramanHiz = 0) {
  const askerVar = totalUnits(units) > 0;
  const hiz = (!askerVar && kahramanHiz > 0) ? kahramanHiz : slowestSpeed(units);
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

// ── Takviye (misafir birlikler) ───────────────────────────────────────

/**
 * Köyde duran BÜTÜN misafir birlikleri tek nesnede topla.
 *
 * `village.takviyeler` her biri bir varıştan gelen girdiler:
 *   { id, userId, slotKey, fromName, units: {...}, at }
 * Aynı oyuncu birden fazla köyünden gönderebilir; girdiler birleşmez,
 * çünkü geri çağırma köy köy yapılıyor.
 */
function takviyeBirlikleri(village) {
  const out = {};
  for (const t of village.takviyeler || []) {
    for (const [k, n] of Object.entries(t.units || {})) {
      if (n > 0) out[k] = (out[k] || 0) + n;
    }
  }
  return out;
}

/** Köyün savunmaya çıkardığı her şey: kendi ordusu + misafirler */
function savunanBirlikler(village) {
  const out = { ...(village.army || {}) };
  for (const [k, n] of Object.entries(takviyeBirlikleri(village))) {
    out[k] = (out[k] || 0) + n;
  }
  return out;
}

/**
 * SAVUNMA KAYIPLARINI PAY ET — önce ev sahibi, sonra misafirler.
 *
 * Savaş tek bir birleşik orduyla çözülüyor (savunanBirlikler), ama ölenler
 * gerçek sahiplerinden düşmeli. Sıra ÖNEMLİ: kayıp önce ev sahibinin
 * ordusundan alınıyor, artan misafirlere dağıtılıyor. Böylece "takviye
 * çağır, kendi askerin ölmesin" gibi bir sömürü olmuyor — ev sahibi de
 * bedelini ödüyor.
 *
 * Misafir kaybı ev sahibinin NÜFUSUNDAN düşmez: o asker sahibinin köyünün
 * nüfusunda sayılıyor. Bu yüzden fonksiyon misafir kayıplarını sahibine
 * göre döndürüyor; çağıran taraf (index.js · processMarches) sahibin
 * köyüne işliyor.
 *
 * @returns {{ evSahibiOlu:number, misafirKayip:Array<{userId,slotKey,losses,olu}> }}
 */
function savunmaKayiplariniPayEt(village, losses) {
  const kalan = {};
  for (const [k, n] of Object.entries(losses || {})) {
    const cnt = Math.max(0, Math.floor(n || 0));
    if (cnt > 0) kalan[k] = cnt;
  }

  // 1) Ev sahibinin ordusu (nüfusu da burada düşer)
  const evSahibiPay = {};
  for (const [k, cnt] of Object.entries(kalan)) {
    const have = village.army?.[k] || 0;
    const kill = Math.min(have, cnt);
    if (kill > 0) { evSahibiPay[k] = kill; kalan[k] = cnt - kill; }
  }
  const evSahibiOlu = applyLossesToVillage(village, evSahibiPay);

  // 2) Artan kayıp misafirlere — geliş sırasına göre
  const misafirKayip = [];
  for (const t of village.takviyeler || []) {
    const pay = {};
    let olu = 0;
    for (const [k, cnt] of Object.entries(kalan)) {
      if (cnt <= 0) continue;
      const have = t.units?.[k] || 0;
      const kill = Math.min(have, cnt);
      if (kill <= 0) continue;
      t.units[k] = have - kill;
      if (t.units[k] <= 0) delete t.units[k];
      pay[k] = kill; olu += kill; kalan[k] = cnt - kill;
    }
    if (olu > 0) {
      // `kalan`: bu savaştan sonra o köyde duran birliğim. Sahibi "kaç
      // askerim kaldı orada" sorusunu ancak buradan görebiliyor.
      misafirKayip.push({
        userId: t.userId, slotKey: t.slotKey, losses: pay, olu,
        kalan: { ...(t.units || {}) }, fromName: t.fromName,
      });
    }
  }
  // Tamamen eriyen takviye girdisi listeden çıkar
  if (village.takviyeler?.length) {
    village.takviyeler = village.takviyeler.filter(t => totalUnits(t.units) > 0);
  }

  // evSahibiPay: ev sahibinin HANGİ birimden kaç kaybettiği. Sağlık çadırı
  // yaralıyı buradan seçiyor — misafirin askerine dokunmuyor.
  return { evSahibiOlu, evSahibiPay, misafirKayip };
}

// ── Keşif yardımcıları ────────────────────────────────────────────────

/**
 * Köyün ordusundaki izcileri AYIR.
 *
 * Savunanın izcileri keşfe karşı çıkıyor; kalan ordusu (piyade, süvari)
 * karışmıyor — casus avlamak onların işi değil. Kayıp uygularken de
 * yalnız bu kırılım kullanılıyor, yoksa keşif savaşı normal orduyu
 * kırardı.
 */
function izciKirilimi(army) {
  const out = {};
  for (const [k, c] of Object.entries(army || {})) {
    if (!SCOUT_UNITS.has(k)) continue;
    const n = Math.max(0, Math.floor(Number(c) || 0));
    if (n > 0) out[k] = n;
  }
  return out;
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
  /*
    SIĞINAK ÖNCE DÜŞÜLÜYOR, YAĞMA PAYINDAN ÖNCE.

    Sıra önemli: baskında (raid) stokun yalnız bir kısmı yağmalanıyor.
    Payı önce alıp sığınağı sonra düşseydik sığınak baskında olduğundan
    daha az koruyor görünürdü — oyuncuya "her kaynaktan 200 gizli"
    dedik, %50'si değil. Önce gizleniyor, kalanın payı alınıyor.
  */
  const gizli = SIGINAK.gizlenen(target, VILLAGE_DEFS);
  const avail = {};
  let availTotal = 0;
  for (const res of LOOTABLE) {
    const acikta = SIGINAK.gorunen(target.resources?.[res], gizli);
    const amt = Math.floor(acikta * share);
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
/**
 * @param {boolean} kahramanVar  Kahraman bu seferde yürüyor mu?
 *   Kahraman TEK BAŞINA gönderilebiliyor (İlkan'ın kararı): askersiz sefer
 *   normalde reddediliyor ("asker_secilmedi", "saldiri_gucu_yok"), ama
 *   kahraman başlı başına bir savaşçı. Bu bayrak o üç denetimi gevşetiyor
 *   — kaldırmıyor: kahraman da yoksa sefer yine reddediliyor.
 * @param {number} kahramanHiz  Kahramanın hızı — yalnız askersiz seferde
 *   kullanılıyor (bkz. marchGameHours).
 */
function createMarch(village, {
  mode, units, distance, fromKey, fromName, toKey, toName, toKind, ownerKind = 'player',
  kahramanVar = false, kahramanHiz = 0,
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
  if (totalUnits(clean) <= 0 && !kahramanVar) {
    return { ok: false, reason: 'asker_secilmedi' };
  }

  if (mode === 'yerlesim') {
    // Yalnız göçmen, tam sayıda: yanına asker takılamaz
    const yabanci = Object.keys(clean).find(k => k !== SETTLER_UNIT);
    if (yabanci) return { ok: false, reason: 'yerlesim_yalniz_gocmen' };
    if ((clean[SETTLER_UNIT] || 0) !== SETTLERS_REQUIRED) {
      return { ok: false, reason: 'gocmen_sayisi_yanlis' };
    }
  } else if (mode === 'scout') {
    const bad = Object.keys(clean).find(k => !SCOUT_UNITS.has(k));
    if (bad) return { ok: false, reason: 'kesif_icin_izci_gerek' };
  } else if (mode === 'takviye') {
    /*
      TAKVİYEDE SALDIRI GÜCÜ ARANMAZ — iş savunmak. Aksi hâlde saf savunma
      birimleri (ve göçmen dışındaki her şey) gönderilemezdi. Tek koşul
      savunmaya bir katkısının olması: göçmenin savunması 0, taşınması
      anlamsız ve yerleşim hakkını kaçırmaya yol açar.
    */
    /*
      KUŞATMA MAKİNESİ TAKVİYEDE DE GİDEBİLİYOR (İlkan'ın kararı):
      müttefikin köyüne mancınık yığıp oradan saldırmak meşru bir hamle.
      Makinenin savunması yok, o yüzden "savunmaya katkısı olsun" şartı
      makine taşıyan seferlerde aranmıyor.
    */
    const makineVar = Object.keys(clean)
      .some(k => UNIT_DEFS[k]?.category === 'kusatma');
    if (armyDefense(clean) <= 0 && !makineVar && !kahramanVar) {
      return { ok: false, reason: 'savunma_gucu_yok' };
    }
  } else if (armyAttack(clean) <= 0 && !kahramanVar) {
    return { ok: false, reason: 'saldiri_gucu_yok' };
  }

  /*
    KUŞATMA MAKİNESİ: TAM SALDIRI ya da TAKVİYE.

    Yağmada işi yok (kuşatma fazı yalnız savaş kazanılınca işliyor ama
    yağma "vur-kaç"tır), keşifte zaten izci şartı var, yerleşimde yeri
    yok. TAKVİYE ise İlkan'ın kararıyla AÇIK: makineyi müttefikin (ya da
    kendi sınır) köyüne yığıp saldırıyı oradan başlatmak meşru bir hamle
    ve makine yavaş olduğu için asıl kazancı da bu.

    Takviyedeki makine SAVUNMAYA KATILMIYOR — savaş hesabı kuşatma
    birimlerini zaten dışarıda tutuyor. Orada park hâlinde duruyor ve
    sahibi istediğinde geri çağırıyor.
  */
  if (mode !== 'attack' && mode !== 'takviye') {
    const makine = Object.keys(clean)
      .find(k => UNIT_DEFS[k]?.category === 'kusatma');
    if (makine) return { ok: false, reason: 'kusatma_yalniz_saldiri' };
  }

  // Askerleri köyden çıkar — yoldayken savunmaya katılmazlar
  for (const [k, n] of Object.entries(clean)) {
    village.army[k] -= n;
    if (village.army[k] <= 0) delete village.army[k];
  }

  const legHours = marchGameHours(clean, distance, kahramanVar ? kahramanHiz : 0);
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

/**
 * SALDIRI İZİ TAVANI — kaç hedefin kaydı tutulur.
 *
 * Aktif bir oyuncu yüzlerce köye vurabiliyor; hepsini süresiz tutmak
 * kaydı şişirir ve haritayı kılıç tarlasına çevirir. En ESKİ dokunulan
 * hedefler düşüyor: harita "son zamanlarda nerelere vurdum" sorusunu
 * cevaplıyor, ömür boyu bir sicil tutmuyor.
 */
const MAX_SALDIRI_IZI = 60;

/**
 * ESKİ SALDIRILARI RAPORLARDAN GERİ DOLDUR.
 *
 * İz kaydı YENİ; bu sürümden önce vurulan köylerde hiç kayıt yok ve
 * harita boş görünüyor. Oyuncu için bu "özellik çalışmıyor" demek
 * (İlkan bildirdi).
 *
 * Raporlar diskte duruyor ve saldıranın kendi raporu hedefin anahtarını
 * taşıyor — son 25 seferlik bir pencere ama boş haritadan iyi. Bir kez
 * çalışıyor: kayıt oluştuktan sonra gerçek izler üzerine yazıyor.
 *
 * TEK YÖNLÜ: yalnız `dir === 'out'` ve saldırı/yağma raporları. Gelen
 * saldırılar benim izim değil, savunmam.
 */
function saldiriIzleriniGeriDoldur(village) {
  /*
    AYRI BİR BAYRAK, `saldirilarim` varlığı DEĞİL.

    Kayıt sürüm çıktıktan sonraki İLK saldırıda oluşuyor; varlığına
    baksaydık o tek saldırıdan öncesi sonsuza dek geri doldurulamazdı
    (ölçüldü: bir kez vurmuş hesapta eski beş hedef hiç görünmüyordu).
  */
  if (village.izGeriDolduruldu) return false;
  village.izGeriDolduruldu = true;
  const iz = {};
  for (const r of village.reports || []) {
    if (r.dir !== 'out') continue;
    if (r.mode !== 'attack' && r.mode !== 'raid') continue;
    if (!r.toKey) continue;
    const onceki = iz[r.toKey];
    iz[r.toKey] = {
      // Raporlar yeniden eskiye sıralı; ilk görülen EN YENİ olan.
      at: onceki?.at || r.at || 0,
      mode: onceki?.mode || r.mode,
      toName: onceki?.toName || r.toName || r.toKey,
      winner: onceki?.winner || r.winner,
      kez: (onceki?.kez || 0) + 1,
      ganimet: (onceki?.ganimet || 0)
        + Object.values(r.loot || {}).reduce((a, b) => a + b, 0),
      kayip: (onceki?.kayip || 0) + (r.attackerDead || 0),
    };
  }
  /*
    BİRLEŞTİRİYOR, ÜZERİNE YAZMIYOR: gerçek saldırıdan gelen kayıt
    rapordan türetilenden doğru — ganimet ve kayıp orada birikmiş.
  */
  const mevcut = village.saldirilarim || {};
  let eklenen = 0;
  for (const [k, v] of Object.entries(iz)) {
    if (mevcut[k]) continue;
    mevcut[k] = v;
    eklenen++;
  }
  village.saldirilarim = mevcut;
  budaSaldiriIzi(mevcut);
  return eklenen > 0;
}

function budaSaldiriIzi(iz) {
  const anahtarlar = Object.keys(iz);
  if (anahtarlar.length <= MAX_SALDIRI_IZI) return;
  anahtarlar
    .sort((a, b) => (iz[a].at || 0) - (iz[b].at || 0))
    .slice(0, anahtarlar.length - MAX_SALDIRI_IZI)
    .forEach(k => delete iz[k]);
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

  /**
   * ── TAKVİYE ──────────────────────────────────────────────────────
   *
   * Savaş yok, ganimet yok, dönüş yok. Asker hedef köyde misafir olarak
   * duruyor ve o köy saldırı alınca savunmaya katılıyor (savunanBirlikler).
   * Geri dönüşü sahibi `takviye_geri_cagir` ile başlatır.
   *
   * Sefer listeden SİLİNİR — çağıran taraf (processMarches) bunu
   * `alindi: true` dönüşünden anlıyor.
   */
  if (march.mode === 'takviye') {
    target.takviyeler ||= [];
    if (!target.nextTakviyeId) target.nextTakviyeId = 1;
    const girdi = {
      id: target.nextTakviyeId++,
      userId: opts.ownerUserId ?? null,
      slotKey: march.fromKey,
      fromName: march.fromName,
      units: { ...march.units },
      at: now,
    };
    target.takviyeler.push(girdi);

    const ortak = {
      id: `${march.id}-${now}`, at: now, mode: 'takviye',
      fromName: march.fromName, toName, toKey: march.toKey,
      outcome: 'takviye_vardi', winner: 'none',
      sent: { ...march.units }, myLosses: {}, theirLosses: {}, loot: {},
    };
    pushReport(origin, { ...ortak, dir: 'out' });
    pushReport(target, { ...ortak, dir: 'in' });
    /*
      Dönüş şekli her dalda `march` — çağıran zaten dönüşü kullanmıyor,
      kararı bayraktan okuyor. `bitti` = bu seferin dönüş ayağı yok,
      listeden silinmeli (yerleşimdeki gibi).
    */
    march.bitti = true;
    return march;
  }

  const surLevel    = buildingLevel(target, 'sur');
  const hendekLevel = buildingLevel(target, 'hendek');
  // Kule bonusu okçu dolulukla ölçeklenir — boş kule fayda vermez
  const kulePct     = towerBonusPct(target);

  /**
   * ── KEŞİF ────────────────────────────────────────────────────────
   *
   * ESKİDEN risksizdi: tek izci gönderip rakibin ordusunu, surunu ve
   * deposunu bedavaya görüyordun, savunanın haberi de olmuyordu. PvP'de
   * bu dengesiz. Artık savunanın izcileri karşı çıkıyor ve çarpışma
   * NORMAL savaş hesabıyla (simulateBattle: sur/hendek/kule + Kirilloid)
   * çözülüyor:
   *   • savunanda izci yoksa → savunma 0: bilgi tam, kayıp yok,
   *     savunan fark etmiyor
   *   • izci varsa → savaş. Saldıran kazanırsa bilgi gelir, kaybederse
   *     HİÇ bilgi gelmez.
   * Fark edildiyse savunana da rapor düşüyor — saldırının geldiğini sezer.
   */
  if (march.mode === 'scout') {
    // Kayıplar march.units'i DEĞİŞTİRİYOR — raporda "yola çıkan" için
    // önceki hâli saklamak gerekiyor, yoksa gönderilen sayı yanlış yazılır.
    const sentSnapshot   = { ...march.units };
    const savunanIzciler = izciKirilimi(target.army);
    const savunanSayisi  = totalUnits(savunanIzciler);

    /**
     * KEŞİF DE NORMAL SAVAŞ HESABIYLA ÇÖZÜLÜYOR.
     *
     * Ayrı bir "izci sayısı karşılaştırması" yoktu artık: simulateBattle
     * çağrılıyor, yani sur/hendek/kule bonusları ve Kirilloid kayıp
     * eğrisi aynen işliyor. Savunanda izci yoksa savunma 0 çıkıyor,
     * saldıran kayıpsız kazanıyor ve keşif fark edilmiyor (eski davranış).
     *
     * SAVUNAN TARAFTA YALNIZ İZCİLER var: normal ordu (piyade, süvari)
     * casus avına katılmıyor. Aksi hâlde ordusu olan hiç kimse
     * keşfedilemez, üstelik tek izci göndermek rakibin ordusunu kırmanın
     * bedava yolu olurdu.
     *
     * Ölçüm (savunanda 5 izci, sur/hendek 10): kazanmak için 23 izci
     * gerekiyor. Savunmasız köy tek izciyle görülüyor.
     */
    /*
      mode 'scout': sur ve hendek işlemiyor, YALNIZ kule bonusu geçerli
      (bkz. combat.js). İzcinin kendi değerleri simetrik olduğu için
      kulesiz köyde sonucu doğrudan izci sayısı belirliyor.
    */
    const res = simulateBattle(march.units, savunanIzciler, {
      surLevel, hendekLevel, kulePct, mode: 'scout',
      attackerLevels: origin?.equipmentLevels || null,
      defenderLevels: target?.equipmentLevels || null,
    });
    const kazandim   = res.winner === 'attacker';
    // Savunanın izcisi yoksa keşif fark edilmez — haberi olmaz
    const gorundu    = savunanSayisi > 0;
    const benimKayip = res.attackerLosses || {};
    /*
      SAVUNAN İZCİ ÖLMÜYOR (İlkan'ın kararı). Keşif bir casus düellosu:
      riski alan taraf CASUSUNU GÖNDEREN. Nöbetçinin kendi evinde
      ölmesi için bir sebep yok.

      Kayıp hesabı yine de yapılıyor — kimin kazandığını ve saldıranın
      kaybını o belirliyor; yalnız savunana UYGULANMIYOR.

      Sonucu bilinçli: savunanın izci perdesi aşındırılamıyor. Saldıran
      arka arkaya keşif yollayıp perdeyi teker teker kırarak sonunda
      bedava keşif yapamıyor; her denemede tek seferde geçmesi gerek.
    */
    const onunKayip  = {};

    for (const [k, n] of Object.entries(benimKayip)) {
      if (n > 0) march.units[k] = Math.max(0, (march.units[k] || 0) - n);
    }

    const intel = kazandim ? {
      population: target.population || 0,
      army: { ...(target.army || {}) },
      armyTotal: totalUnits(target.army),
      defense: Math.round(armyDefense(target.army)),
      surLevel, hendekLevel, kulePct,
      /*
        İZCİ DE SIĞINAĞI GÖREMİYOR. Gerçek stoku gösterseydik saldırgan
        keşif ile yağmayı karşılaştırıp sığınağın seviyesini çıkarır,
        bina bir bilgi sızıntısına dönerdi (bkz. siginak.js).
      */
      resources: Object.fromEntries(LOOTABLE.map(r =>
        [r, SIGINAK.gorunen(target.resources?.[r],
          SIGINAK.gizlenen(target, VILLAGE_DEFS))])),
      at: now,
    } : null;

    statsOf(origin).scoutsSent += 1;
    march.phase = 'return';
    march.remainingHours = march.legHours;
    march.intel = intel;
    march.loot = {};
    pushReport(origin, {
      id: `${march.id}-${now}`, at: now, dir: 'out', mode: 'scout',
      fromName: march.fromName, toName, toKey: march.toKey,
      outcome: kazandim ? 'kesif' : 'kesif_basarisiz',
      winner: res.winner,
      sent: { ...sentSnapshot }, myLosses: benimKayip, theirLosses: onunKayip,
      loot: {},
      // Raporda savunmanin neden gucu oldugu gorunsun
      karsiIzci: savunanSayisi, savunanIzci: savunanSayisi,
      wallBonusPct: res.wallBonusPct,
      attackTotal: res.attackTotal, defenseTotal: res.defenseTotal,
      intel,
    });

    // Savunan yalnız FARK ETTİYSE haber alır (izcisi yoksa hiçbir şey görmez)
    if (gorundu) {
      statsOf(target).defensesTotal += 1;
      if (!kazandim) statsOf(target).defensesWon += 1;
      pushReport(target, {
        id: `${march.id}-${now}-d`, at: now, dir: 'in', mode: 'scout',
        fromName: march.fromName, fromKey: march.fromKey, toName,
        outcome: kazandim ? 'kesfedildim' : 'kesif_engellendi',
        winner: res.winner,
        attackerUnits: { ...sentSnapshot },
        myLosses: onunKayip, theirLosses: benimKayip, loot: {},
        /*
          Savunan oyuncu "kaç casus geldi, benim kaç izcim vardı" diye
          soruyor; ikisi de burada yazılı olmazsa rapor yalnız
          "casusu durdurdun" deyip susuyor.
        */
        gelenCasus: totalUnits(sentSnapshot), savunanIzci: savunanSayisi,
        wallBonusPct: res.wallBonusPct,
        attackTotal: res.attackTotal, defenseTotal: res.defenseTotal,
      });
    }
    return march;
  }

  // ── SAVAŞ ────────────────────────────────────────────────────────
  /*
    SAVUNMAYA MİSAFİRLER DE ÇIKAR. Tek birleşik orduyla hesaplanıyor;
    kayıplar sonra gerçek sahiplerine pay ediliyor (savunmaKayiplariniPayEt).

    Ekipman yükseltmesi olarak EV SAHİBİNİN seviyeleri kullanılıyor —
    `simulateBattle` tek bir `defenderLevels` alıyor ve köy tek bir ordu
    gibi savunuyor (sur, hendek, kule de ev sahibinin). Alternatif, her
    misafiri kendi seviyeleriyle ayrı ayrı hesaplamak olurdu; savaş
    hesabını parçalamayı gerektirir, şimdilik yapılmadı.
  */
  const defenderUnits = savunanBirlikler(target);
  /**
   * Ekipman yükseltmeleri KÖYE ait: saldıranınki `origin`den, savunanınki
   * `target`tan okunuyor. İkisi ayrı olmalı — saldıranın kılıç seviyesi
   * savunanın kalkanını güçlendirmemeli.
   */
  /*
    KAHRAMAN BONUSLARI DIŞARIDAN GELİYOR.

    Kahraman kaydı OTURUMDA (merkez köyün state'inde) duruyor, army.js'in
    göremediği bir yerde. Burada hesaplamaya kalkarsak bu dosya oturum
    yapısına bağlanır; çağıran (index.js) zaten iki tarafın oturumunu da
    biliyor. Saldıranınki sefere iliştirilmiş anlık görüntüden okunuyor —
    sefer yola çıktıktan sonra skil dağıtıp gücü büyütmek mümkün olmasın.
  */
  const kahSald = march.kahraman || null;
  const res = simulateBattle(march.units, defenderUnits, {
    surLevel, hendekLevel, kulePct,
    mode: march.mode === 'raid' ? 'raid' : 'normal',
    attackerLevels: origin?.equipmentLevels || null,
    defenderLevels: target?.equipmentLevels || null,
    kahramanSaldiriGucu: kahSald?.gucu || 0,
    kahramanSaldiriYuzde: kahSald?.saldiriYuzde || 0,
    kahramanSuvari: !!kahSald?.suvari,
    kahramanBirimSaldiri: kahSald?.birim || null,
    kahramanSavunmaYuzde: opts.kahramanSavunmaYuzde || 0,
    kahramanBirimSavunma: opts.kahramanBirimSavunma || null,
  });

  /*
    Savunanın kaybı önce EV SAHİBİNİN ordusundan, artanı misafirlerden.
    Misafir kaybı ev sahibinin nüfusundan düşmez — o asker sahibinin
    köyünün nüfusunda sayılıyor. Sefere iliştiriliyor ki processMarches
    sahibinin köyüne işlesin.
  */
  const pay = savunmaKayiplariniPayEt(target, res.defenderLosses);
  const defenderDead = pay.evSahibiOlu;
  march.misafirKayip = pay.misafirKayip;

  /*
    SAĞLIK ÇADIRI — ölenlerin bir kısmı aslında YARALI; çadıra alınıyor.

    PAY ETTİKTEN SONRA ve YALNIZ EV SAHİBİNİN ölülerine işliyor. Önceki
    sürümde kaybı pay etmeden önce azaltıyordu — o hâlde çadır misafirin
    askerini de kurtarıyordu. Artık yaralı çadırda YATIYOR ve iyileşince
    bu köyün ordusuna dönüyor; misafirin askerini alsaydık başka bir
    oyuncunun ordusunu kendi ordumuza katmış olurduk.

    Yaralı orduda SAYILMIYOR: kayıp zaten işlendi, asker çadırda. Nüfusu
    da düştü; iyileşip döndüğünde geri ekleniyor (bkz. taburcuEt).

    Sonuç (kazanan, ganimet, kuşatma) DEĞİŞMİYOR — savaş çoktan bitti.
  */
  const cadirSeviye = buildingLevel(target, 'saglikCadiri');
  const tedavi = SAGLIK.yaralilariAl(pay.evSahibiOlu ? pay.evSahibiPay : {},
    cadirSeviye, target);
  if (tedavi.alinan > 0) {
    target.saglikYatan = [...(target.saglikYatan || []), ...tedavi.yatanlar];
  }

  const survivors = res.attackerSurvivors || {};
  const survTotal = totalUnits(survivors);

  // Saldıranın ölüleri de nüfus kaybıdır. Askerler gönderilirken orduDAN
  // çıkarıldı ama nüfusa dokunulmadı; ölenler geri dönmediği için nüfus
  // burada düşürülmeli — yoksa savaşan oyuncu bedava nüfus kazanır.
  const attackerDead = totalUnits(res.attackerLosses);
  if (attackerDead > 0) {
    origin.population = Math.max(1, (origin.population || 0) - attackerDead);
  }

  /*
    KAHRAMANIN HESABI. Burada yalnız HESAPLANIYOR, uygulanmıyor: kahraman
    kaydı saldıranın oturumunda duruyor ve bu dosya oturumu görmüyor.
    Sefere iliştirilen sonucu index.js (processMarches) işliyor.

    GANİMETTEN ÖNCE: ganimet payı "kahraman ayakta mı" sorusuna bakıyor
    ve cevabı bu blok yazıyor. Aşağıda dursaydı soru sorulduğunda cevap
    henüz yok olurdu (testte tam olarak bu yakalandı).
  */
  if (march.kahraman) {
    /*
      CAN TAVANI SEFERE İLİŞTİRİLMİŞ anlık görüntüden okunuyor (güç ve
      sınıfla aynı gerekçe): yola çıktıktan sonra eşya değiştirip taban
      hasarı küçültmek mümkün olmasın.

      SAVAŞ OLDU MU — savunanın hiç askeri yoksa çarpışma da yok.
      Savunmasız köye giren kahramanı yaralamak, oyuncuyu hiç olmamış
      bir çarpışmanın bedelini ödemeye zorlardı.
    */
    const savasOldu = totalUnits(defenderUnits) > 0;
    march.kahramanSonuc = HERO.savasSonucu(
      defenderDead, res.attackerLossRate || 0,
      march.kahraman.canTavani || 0, savasOldu);
  }

  /*
    KUŞATMA FAZI — savaştan SONRA, yalnız saldıran KAZANDIYSA.

    Sıra önemli: kuşatma ganimetten ÖNCE işliyor, çünkü mancınık depoyu
    vurabiliyor. Depo seviyesi düşünce tavan da düşüyor ve fazlası
    kayboluyor — yağmalanacak mal da o kadar azalıyor. Tersi sırada
    oyuncu önce deposunu boşaltıp sonra binasını kaybederdi.
  */
  const kusatmaSonuc = (res.winner === 'attacker')
    ? KUSATMA.uygula(target, survivors, march.kusatmaHedefi || null)
    : null;

  /*
    KAHRAMANIN TAŞIMA PAYI. Kahraman savaşıyor ve yara alıyor ama
    ganimet hesabında hiç yoktu — tek bir odun taşımıyordu.
    Kapasitesi orduya EKLENİYOR (bkz. kahraman.js · tasimaKapasitesi).

    BAYILDIYSA TAŞIMIYOR: canı biten kahraman eve ışınlanıyor, yükü
    omzunda götürmesi tuhaf olurdu. Can, sefere iliştirilmiş anlık
    görüntüden okunuyor; hasar bu savaşta hesaplanan.
  */
  const kahCan = (march.kahraman?.can ?? null);
  const kahAyakta = !march.kahraman ? false
    : (kahCan === null ? true : kahCan - (march.kahramanSonuc?.hasar || 0) > 0);
  const kahTasima = kahAyakta ? (march.kahraman.tasima || 0) : 0;

  // Ganimet: hayatta kalan varsa taşınır. Keşifte ve tam yok olmada yok.
  const loot = (survTotal > 0 || kahTasima > 0)
    ? takeLoot(target, carryCapacity(survivors) + kahTasima, march.mode)
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
    /*
      SAVUNANIN ORDUSU — İlkan: *"raporda karşı tarafın kaç askeri
      vardı onu göremiyorum."*

      Yalnız KAYIPLARI yazıyorduk; savunan kazandıysa kaybı küçük olur
      ve oyuncu neye çarptığını hiç öğrenemezdi. İstihbarat sızıntısı
      değil: onunla çarpıştın, ne olduğunu gördün. Travian da savaş
      raporunda savunanın birliklerini gösteriyor.

      MİSAFİRLER DAHİL: köyü savunan her şey tek orduydu, rapor da öyle
      göstermeli — yoksa sayı savaşta hissedilenle tutmazdı.
    */
    theirSent: { ...defenderUnits },
    survivors: { ...survivors },
    loot,
    attackTotal: res.attackTotal, defenseTotal: res.defenseTotal,
    wallBonusPct: res.wallBonusPct,
    defenderDead, attackerDead,
    /*
      KAHRAMAN SATIRI — sur bonusundan AYRI. Tek sayıya karıştırsaydık
      oyuncu kahramana yaptığı yatırımın işe yarayıp yaramadığını hiç
      ölçemezdi. Alan yoksa hiç yazılmıyor; eski raporlar bozulmuyor.
    */
    ...(march.kahraman ? {
      kahraman: {
        gucu: res.kahramanSaldiriGucu || 0,
        saldiriYuzde: res.kahramanSaldiriYuzde || 0,
        suvari: !!res.kahramanSuvari,
        xp: march.kahramanSonuc?.xp || 0,
        hasar: march.kahramanSonuc?.hasar || 0,
      },
    } : {}),
    // Kuşatma sonucu — yoksa alan hiç yazılmıyor, eski raporlar bozulmuyor
    ...(kusatmaSonuc ? { kusatma: kusatmaSonuc } : {}),
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

  /*
    SALDIRI İZİ — haritada hangi köye vurduğum görünsün (İlkan'ın isteği:
    *"harita üzerinde saldırdığım yağmaladığım yerleri görmek istiyorum,
    üzerinde bir kılıç vs olsun"*).

    RAPORDAN TÜRETİLEMEZ: raporlar son 25 ile sınırlı (MAX_REPORTS), yani
    yirmi beş yeni rapordan sonra işaret sebepsizce kaybolurdu. Hedef
    başına TEK kayıt tutmak hem kalıcı hem küçük.

    KEŞİF GİBİ origin'de duruyor (bkz. origin.intel): "ben kime vurdum"
    benim bilgim, hedefin değil.
  */
  if (march.mode === 'attack' || march.mode === 'raid') {
    const iz = (origin.saldirilarim ||= {});
    const onceki = iz[march.toKey];
    iz[march.toKey] = {
      at: now, mode: march.mode, toName,
      winner: res.winner,
      kez: (onceki?.kez || 0) + 1,
      ganimet: (onceki?.ganimet || 0) + lootSum,
      kayip: (onceki?.kayip || 0) + attackerDead,
    };
    budaSaldiriIzi(iz);
  }

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
    /*
      SAVUNANIN KENDİ ORDUSU. Eskiden yazılmıyordu ("oyuncu zaten
      biliyor") ama o andaki ordu artık yok: savaş onu değiştirdi ve
      MİSAFİR TAKVİYELER de savunmaya katılmıştı — oyuncu köyünü kimin
      savunduğunu hiç göremiyordu. Saldıranın raporundaki `theirSent`
      ile aynı anlık görüntü; iki rapor aynı savaşı aynı sayılarla
      anlatsın.
    */
    defenderUnits: { ...defenderUnits },
    myLosses: res.defenderLosses || {}, theirLosses: res.attackerLosses || {},
    loot, wallBonusPct: res.wallBonusPct,
    attackTotal: res.attackTotal, defenseTotal: res.defenseTotal,
    /*
      SAĞLIK ÇADIRI RAPORDA. Yalnız kalan kaybı gösterseydik oyuncu
      çadırın işe yarayıp yaramadığını hiçbir yerde göremez, onu
      yükseltmek için bir sebep bulamazdı. Alan yoksa hiç yazılmıyor;
      eski raporlar bozulmuyor.
    */
    ...((tedavi.alinan > 0 || tedavi.sigmayan > 0) ? {
      saglikCadiri: {
        oran: Math.round(SAGLIK.saglikIyilesmeOrani(cadirSeviye) * 100),
        iyilesen: Object.fromEntries(tedavi.yatanlar.map(y => [y.birim, y.adet])),
        toplam: tedavi.alinan,
        /*
          SIĞMAYAN = yatak bulamadığı için ölen yaralı. Yazılmasa oyuncu
          çadırının dolduğunu hiçbir yerden anlayamaz, onu yükseltmek
          için bir sebep göremezdi.
        */
        sigmayan: tedavi.sigmayan,
        kapasite: tedavi.kapasite,
      },
    } : {}),
    /*
      SAVUNAN da kahramanı gördüğünü bilmeli: saldıranın kahramanı geldiyse
      "neden bu kadar güçlüydü" sorusunun cevabı burada. Kendi savunma
      bonusu da yazılıyor — kahramanını köyde tutmanın işe yaradığını
      göremezse oyuncu onu hep sefere sürer.
    */
    ...((res.kahramanSaldiriGucu || res.kahramanSaldiriYuzde || res.kahramanSavunmaYuzde) ? {
      kahraman: {
        saldiranGucu: res.kahramanSaldiriGucu || 0,
        saldiranYuzde: res.kahramanSaldiriYuzde || 0,
        suvari: !!res.kahramanSuvari,
        savunmamYuzde: res.kahramanSavunmaYuzde || 0,
      },
    } : {}),
    // Savunan da neyini kaybettiğini görmeli — surun düştüğünü fark etmezse
    // bir sonraki saldırıya hazırlıksız yakalanır
    ...(kusatmaSonuc ? { kusatma: kusatmaSonuc } : {}),
  });

  /*
    MİSAFİRİN SAHİBİNE DE RAPOR.

    Takviye gönderen oyuncu, askerleri başka bir köyde öldüğünde hiçbir
    bildirim almıyordu: nüfusu düşüyor, ordusu eriyor, sebebi hiçbir
    ekranda yazmıyordu. Rapor seferin sahibine değil, takviyeyi gönderen
    köye ait — processMarches (index.js) sahibinin köyüne yazıyor.
  */
  (march.misafirKayip || []).forEach((kayip, i) => {
    kayip.rapor = {
      id: `${march.id}-${now}-m${i}`, at: now, dir: 'in', mode: 'takviye',
      fromName: march.fromName, toName, toKey: march.toKey,
      outcome: 'takviye_savasti', winner: res.winner,
      attackerUnits: report.sent,
      myLosses: kayip.losses, theirLosses: res.attackerLosses || {}, loot: {},
      kalanTakviye: kayip.kalan || {},
      attackTotal: res.attackTotal, defenseTotal: res.defenseTotal,
      wallBonusPct: res.wallBonusPct,
    };
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
 * SEFER GERİ ÇAĞIRMA PENCERESİ — yola çıktıktan sonra ilk 90 GERÇEK saniye.
 *
 * Amaç dar: "yanlış köye bastım"ı kurtarmak. Pencere açık bırakılsaydı
 * (her an geri çağır) saldırı risksiz olurdu — hedefi keşfeder, ordunun
 * yolda olduğunu görür, son anda geri çekerdin. 90 saniye yanlış tıklamayı
 * kurtarmaya yeter, taktik kaçamağa yetmez.
 *
 * Ölçü GERÇEK saniye (`departAt` = Date.now()): dünya hızı değişince
 * pencerenin uzayıp kısalması oyuncu için anlamsız olurdu.
 */
const GERI_CAGIRMA_SANIYE = 90;

/** Bu seferin geri çağırma penceresinden kaç saniye kaldı? (0 = kapandı) */
function geriCagirmaKalan(march, now = Date.now()) {
  if (!march || march.phase !== 'outbound') return 0;
  if (!march.departAt) return 0;
  return Math.max(0, GERI_CAGIRMA_SANIYE - (now - march.departAt) / 1000);
}

/**
 * SEFERİ GERİ ÇAĞIR — yoldaki orduyu dönüşe geçirir.
 *
 * Işınlanma yok: ordu gittiği kadar yolu geri yürür. 90 saniyelik pencerede
 * bu birkaç saniye tutuyor, yani pratikte anında dönüyor; asıl kural yine de
 * "gidilen yol kadar dönülür" — pencere ileride genişletilirse doğru kalsın.
 */
function seferGeriCagir(village, marchId) {
  const march = (village.marches || []).find(m => m.id === marchId);
  if (!march) return { ok: false, reason: 'sefer_yok' };
  if (march.phase !== 'outbound') return { ok: false, reason: 'zaten_donuyor' };
  if (geriCagirmaKalan(march) <= 0) return { ok: false, reason: 'sure_doldu' };

  const gidilen = Math.max(0, (march.legHours || 0) - (march.remainingHours ?? 0));
  march.phase = 'return';
  march.remainingHours = gidilen;
  march.loot = {};          // hedefe varmadı, ganimet yok
  march.intel = null;
  march.geriCagrildi = true;
  return { ok: true, march };
}

/**
 * TAKVİYEYİ GERİ ÇAĞIR — misafir birliği ev sahibinden alıp sahibine
 * dönüş seferi olarak yola çıkarır.
 *
 * Dönüş anında ışınlanmıyor: yürüyüş süresi kadar yolda. Aksi hâlde
 * takviye risksiz olurdu — saldırı gelince bir tuşla geri alınır, düşman
 * boş köy bulurdu. Yolda olduğu sürece ne orada savunuyor ne burada.
 *
 * Sefer SAHİBİNİN köyünde duruyor (bütün seferler çıktıkları köyde durur),
 * doğrudan `phase: 'return'` ile — gidiş ayağı yok, zaten oradalar.
 */
function takviyeGeriCagir(hostVillage, ownerVillage, { userId, slotKey, units = null }, distance) {
  const liste = hostVillage.takviyeler || [];

  /*
    AYNI KÖYE YAPILAN GÖNDERİMLER TEK HAVUZ SAYILIR.

    Her varış ayrı bir girdi açıyor: aynı köye üç kez asker yollayan
    oyuncu üç satır görüyor ve üçünü ayrı ayrı geri çağırıyordu. Artık
    çağrı, o köydeki BENİM askerimin tamamına bakıyor ve istenen kadarını
    çekiyor.

    Girdiler BİRLEŞTİRİLMİYOR, yalnız sırayla tüketiliyor: savunma
    kayıpları geliş sırasına göre pay ediliyor (savunmaKayiplariniPayEt),
    kaydı birleştirmek o sırayı bozardı. Eskiden yeniye tüketmek de
    doğru tarafı seçiyor — önce en uzun süredir orada duran asker döner.

    `slotKey` sahibin HANGİ köyünden gönderdiği: çoklu köyde aynı hedefe
    iki ayrı köyden asker yollanmış olabilir ve her biri kendi köyüne
    dönmeli.
  */
  const benim = liste
    .filter(t => t.userId === userId && t.slotKey === slotKey)
    .sort((a, b) => a.id - b.id);
  if (!benim.length) return { ok: false, reason: 'takviye_yok' };

  // İstenen miktar verilmediyse HEPSİ çekilir (eski davranış)
  const istenen = {};
  if (units && typeof units === 'object') {
    for (const [k, n] of Object.entries(units)) {
      const adet = Math.max(0, Math.floor(Number(n) || 0));
      if (adet > 0) istenen[k] = adet;
    }
  } else {
    for (const t of benim) {
      for (const [k, n] of Object.entries(t.units || {})) {
        istenen[k] = (istenen[k] || 0) + (n || 0);
      }
    }
  }
  if (totalUnits(istenen) <= 0) return { ok: false, reason: 'asker_secilmedi' };

  // Girdileri ESKİDEN YENİYE tüket
  const cekilen = {};
  for (const t of benim) {
    for (const k of Object.keys(istenen)) {
      const kalanIstek = istenen[k];
      if (kalanIstek <= 0) continue;
      const mevcut = t.units?.[k] || 0;
      const al = Math.min(mevcut, kalanIstek);
      if (al <= 0) continue;
      t.units[k] = mevcut - al;
      if (t.units[k] <= 0) delete t.units[k];
      cekilen[k] = (cekilen[k] || 0) + al;
      istenen[k] = kalanIstek - al;
    }
  }
  if (totalUnits(cekilen) <= 0) return { ok: false, reason: 'takviye_yok' };

  // Tamamen boşalan girdiler listeden düşer
  hostVillage.takviyeler = liste.filter(t => totalUnits(t.units) > 0);

  const ilk = benim[0];
  const legHours = marchGameHours(cekilen, Math.max(1, distance));
  if (!ownerVillage.nextMarchId) ownerVillage.nextMarchId = 1;
  const march = {
    id: ownerVillage.nextMarchId++,
    mode: 'takviye', ownerKind: 'player',
    fromKey: ilk.slotKey, fromName: ilk.fromName,
    toKey: ilk.slotKey, toName: ownerVillage.name || ilk.fromName, toKind: 'player',
    units: cekilen,
    distance,
    phase: 'return',               // gidiş yok: asker zaten hedefteydi
    departAt: Date.now(),
    legHours,
    remainingHours: legHours,
    legSeconds: Math.round(GT.gameHoursToRealMs(legHours) / 1000),
    loot: {},                      // takviye ganimet taşımaz
    intel: null,
  };
  (ownerVillage.marches ||= []).push(march);
  return { ok: true, march };
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
  MAX_SALDIRI_IZI, saldiriIzleriniGeriDoldur,
  marchSeconds, marchGameHours, slowestSpeed, carryCapacity, armyAttack, armyDefense,
  totalUnits, buildingLevel, applyLossesToVillage, takeLoot, depositLoot,
  createMarch, resolveArrival, resolveReturn, pushReport,
  takviyeBirlikleri, savunanBirlikler, savunmaKayiplariniPayEt, takviyeGeriCagir,
  seferGeriCagir, geriCagirmaKalan, GERI_CAGIRMA_SANIYE,
  SETTLER_UNIT, SETTLERS_REQUIRED,
};
