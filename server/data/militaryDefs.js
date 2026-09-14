/**
 * Askeri sistem tanımları
 * Ekipman bazlı birim sistemi — köylü ne kuşanırsa o olur.
 *
 * Temel değerler (ekipsiz asker):
 *   Saldırı: 0 | Yaya Sav: 10 | Atlı Sav: 10 | Hız: 10 | Kapasite: 60
 *
 * Ekipman katkıları toplanarak birim değerleri oluşur.
 * Her asker 1 tahıl/gün tüketir.
 */

// ── Ekipman katkı tablosu ──────────────────────────────────────────
// cost: işlenmiş bileşenlerle ödenir (kereste/tugla/yontmaTas/demirKulce).
// productionHours: test modunda 1sn = 1sa → gerçek süre = ceil(hours).
// producedAt: hangi köy merkezi binasında üretilir.
const EQUIPMENT_DEFS = {
  kilic: {
    name: 'Kılıç', icon: '🗡️',
    saldiri: +30, yayaSav: +20, atliSav: +10, hiz: -3, kapasite: -10,
    // Eskiden 10 külçe + 5 kereste: kaynak başına 4,00 stat ile
    // listenin en verimlisiydi, zırhın üç katı. Süre 2 sa idi.
    cost: { demirKulce: 16, kereste: 8 }, productionHours: 4,
    producedAt: 'silahci'
  },
  mizrak: {
    name: 'Mızrak', icon: '🔱',
    saldiri: +10, yayaSav: +10, atliSav: +30, hiz: -2, kapasite: -5,
    // Eskiden 5 külçe + 10 kereste (3,33 stat/kaynak), süre 1 sa.
    cost: { demirKulce: 8, kereste: 12 }, productionHours: 3.5,
    producedAt: 'silahci'
  },
  kalkan: {
    name: 'Kalkan', icon: '🛡️',
    saldiri: +5,  yayaSav: +25, atliSav: +15, hiz: -2, kapasite: -10,
    // Eskiden 15 kereste + 5 külçe (2,25 stat/kaynak), süre 1,5 sa.
    cost: { kereste: 13, demirKulce: 5 }, productionHours: 2,
    producedAt: 'zirh',
    kural: 'Yalnızca kılıçlı askerlerle kullanılabilir'
  },
  zirh: {
    name: 'Zırh', icon: '🎽',
    /*
      ZIRHIN STATI YÜKSELTİLDİ (eski: 20/5/5). Maliyet aynı kaldı ama
      kaynak başına 1,20 stat veriyordu — kılıcın ÜÇTE BİRİ — ve üstelik
      en uzun süren ekipmandı. Zırh giymek hiçbir koşulda mantıklı
      değildi, dolayısıyla Nordkamper, Ulv, Buz Süvarisi ve Jernridder
      de mantıklı değildi. Yeni değerlerle oranı 2,48.
    */
    saldiri: +40, yayaSav: +12, atliSav: +10, hiz: -2, kapasite: -5,
    cost: { demirKulce: 20, kereste: 5 }, productionHours: 2,
    producedAt: 'zirh'
  },
  /*
    KUŞATMA MAKİNELERİ — atölyede üretilir.

    `kaleKiran` ve `alevMancınıgı` birimleri baştan tanımlıydı ama
    gerektirdikleri bu iki ekipman HİÇ TANIMLI DEĞİLDİ ve hiçbir bina
    üretmiyordu: ekipman denetimi her zaman başarısız oluyor, birim
    kuyruğa hiç girmiyordu. Yani kuşatma birimleri üretilemiyordu.

    Kişisel teçhizattan (kılıç/kalkan) farklı olarak bunlar MAKİNE:
    cephanelik havuzunu paylaşmazlar, atölyenin kendi kapasitesinde
    dururlar (bkz. tick.js · getSiegeCap) — atın ahırda durması gibi.

    Pahalı ve yavaş: bir koç başı bir kılıçtan 12 kat uzun sürüyor.
    Kuşatma tek seferlik bir yatırım olmalı, sürekli üretilen bir şey
    değil; ucuz olsaydı her saldırıda sur sıfırlanırdı.
  */
  koc_basi: {
    /*
      AD "Koçbaşı Parçaları" — birim adıyla ÇAKIŞMASIN.

      Ekipman "Koç Başı", birim "Koçbaşı" idi: atölye panelinde ikisi yan
      yana duruyor ve hangisinin makinenin kendisi, hangisinin onu
      yapmak için gereken malzeme olduğu okunmuyordu. Anahtar (`koc_basi`)
      DEĞİŞMEDİ — oyuncuların kuyruklarında ve kayıtlarında duruyor.
    */
    name: 'Koçbaşı Parçaları', icon: '🪵',
    saldiri: +20, yayaSav: 0, atliSav: 0, hiz: 0, kapasite: 0,
    cost: { kereste: 120, demirKulce: 60 }, productionHours: 6,
    producedAt: 'atolye',
    kural: 'Yalnız SURU yıkar (hendeğe dokunmaz). Saldıran kazanırsa etki eder.'
  },
  mancinik: {
    // Aynı gerekçe: birim "Alev Mancınığı", malzeme "Mancınık Parçaları"
    name: 'Mancınık Parçaları', icon: '🎯',
    saldiri: +25, yayaSav: 0, atliSav: 0, hiz: 0, kapasite: 0,
    cost: { kereste: 200, yontmaTas: 120, demirKulce: 100 }, productionHours: 10,
    producedAt: 'atolye',
    kural: 'Seçilen binayı yıkar. Yalnız saldıran kazanırsa etki eder.'
  },
  at: {
    name: 'At', icon: '🐎',
    saldiri: +10, yayaSav: +20, atliSav: +20, hiz: +4, kapasite: +50,
    cost: { tahil: 40, kereste: 10 }, productionHours: 4,
    producedAt: 'ahir'
  }
};

// ── Hangi bina hangi ekipmanları üretebilir? ───────────────────────
const EQUIPMENT_BY_BUILDING = Object.entries(EQUIPMENT_DEFS).reduce((acc, [key, def]) => {
  if (!def.producedAt) return acc;
  (acc[def.producedAt] ||= []).push(key);
  return acc;
}, {});

// ── Temel asker değerleri ──────────────────────────────────────────
const BASE_STATS = { saldiri: 0, yayaSav: 10, atliSav: 10, hiz: 10, kapasite: 60 };

// ── Birim listesi ──────────────────────────────────────────────────
// Piyade (Kışla), Süvari (Ahır), Kuşatma (Atölye)
const UNIT_DEFS = {
  // Piyade
  fjordvakt: {
    name: 'Fjordvakt',
    category: 'piyade',
    trainedAt: 'kisla',
    minLevel: 5,
    equipment: ['kilic']
  },
  skjoldvakt: {
    name: 'Skjoldvakt',
    category: 'piyade',
    trainedAt: 'kisla',
    minLevel: 10,
    equipment: ['kilic', 'kalkan']
  },
  nordkamper: {
    name: 'Nordkamper',
    category: 'piyade',
    trainedAt: 'kisla',
    minLevel: 10,
    equipment: ['kilic', 'zirh']
  },
  ulvSavasci: {
    name: 'Ulv Savaşçısı',
    category: 'piyade',
    trainedAt: 'kisla',
    minLevel: 15,
    equipment: ['kilic', 'zirh', 'kalkan']
  },
  spydvakt: {
    name: 'Spydvakt',
    category: 'piyade',
    trainedAt: 'kisla',
    minLevel: 5,
    equipment: ['mizrak']
  },
  isbjorn: {
    name: 'Isbjørn',
    category: 'piyade',
    trainedAt: 'kisla',
    minLevel: 10,
    equipment: ['mizrak', 'zirh']
  },

  // Süvari
  kuzeyIzcisi: {
    name: 'Kuzey İzcisi',
    category: 'suvari',
    trainedAt: 'ahir',
    minLevel: 5,
    equipment: ['at'],
    /*
      KEŞİF BİRİMİ — bu bayrak keşif seferine kimin gidebileceğini
      belirliyor (bkz. game/army.js · SCOUT_UNITS). Eskiden "yükü çok,
      saldırısı az" diye TÜRETİLİYORDU; izcinin yükü 0'a inince izci
      keşif birimi olmaktan çıktı ve keşif tamamen bozuldu. Rol,
      taşıma kapasitesinden türetilecek bir şey değil.
    */
    kesif: true,
    /*
      SALDIRI = SAVUNMA = 10. Savunma eskiden 30'du, yani izci savunmada
      saldırısının üç katı güçlüydü; casus düellosunda 5 izci 2 izciye
      yeniliyordu. İzci bir savaşçı değil: köye ordu geldiğinde de
      savunmaya ciddi katkı vermemeli.

      KAPASİTE 0 (eskiden 110). İzci en ucuz, EN HIZLI ve EN ÇOK TAŞIYAN
      birimdi: kaynak başına 5,5 yük taşıyordu, ikinci sıradaki Spydvakt
      3,67. Yağmanın tek doğru cevabı izci sürüsüydü ve bütün tier
      sistemini atlatıyordu. Travian da izcilere tam bu yüzden 0 yük
      verir: izci bilgi getirir, ganimet değil.
    */
    statSabit: { saldiri: 10, yayaSav: 10, atliSav: 10, hiz: 14, kapasite: 0 }
  },
  demirAtli: {
    name: 'Demir Atlı',
    category: 'suvari',
    trainedAt: 'ahir',
    minLevel: 10,
    equipment: ['at', 'kilic']
  },
  skjoldreiter: {
    name: 'Skjoldreiter',
    category: 'suvari',
    trainedAt: 'ahir',
    minLevel: 15,
    equipment: ['at', 'kilic', 'kalkan']
  },
  buzSuvarisi: {
    name: 'Buz Süvarisi',
    category: 'suvari',
    trainedAt: 'ahir',
    minLevel: 15,
    equipment: ['at', 'kilic', 'zirh']
  },
  jernridder: {
    name: 'Jernridder',
    category: 'suvari',
    trainedAt: 'ahir',
    minLevel: 20,
    equipment: ['at', 'kilic', 'kalkan', 'zirh']
  },
  vindreiter: {
    name: 'Vindreiter',
    category: 'suvari',
    trainedAt: 'ahir',
    minLevel: 10,
    equipment: ['at', 'mizrak']
  },
  stormridder: {
    name: 'Stormridder',
    category: 'suvari',
    trainedAt: 'ahir',
    minLevel: 15,
    equipment: ['at', 'mizrak', 'zirh']
  },

  // Kuşatma
  /*
    ANAHTAR `kaleKiran` KALIYOR, yalnız görünen ad değişti ("Kale Kıran"
    → "Koçbaşı"). Anahtar oyuncuların ordusunda, kuyruklarında ve
    kayıtlarında duruyor; değiştirilirse eldeki birimler sahipsiz kalır.
  */
  kaleKiran: {
    name: 'Koçbaşı',
    category: 'kusatma',
    trainedAt: 'atolye',
    /*
      KUŞATMA ARAÇLARI 5×parça KADEME KURALININ DIŞINDA (madde 15).
      Tek 'ekipman' taşıyorlar ama bir kademe-1 birimi değiller; kurala
      soksaydık mancınık Atölye Lvl 10 yerine Lvl 5 te açılırdı, yani
      kural geç oyun birimini ERKENE çekerdi.
    */
    minLevel: 1,
    equipment: ['koc_basi'],
    statSabit: { saldiri: 60, yayaSav: 30, atliSav: 75, hiz: 4, kapasite: 0 }
  },
  alevMancınıgı: {
    name: 'Alev Mancınığı',
    category: 'kusatma',
    trainedAt: 'atolye',
    minLevel: 10,
    equipment: ['mancinik'],
    statSabit: { saldiri: 75, yayaSav: 60, atliSav: 10, hiz: 3, kapasite: 0 }
  },

  /**
   * GÖÇMEN — yeni köy kurar, savaşmaz.
   *
   * Köşk ya da sarayda eğitilir (ikisi birden olamaz, tanımlar birbirini
   * dışlıyor). Ekipmanı yok; bedeli doğrudan KAYNAK (`cost`) ve bir boş
   * işçi. Üçü birden boş bir dünya slotuna gönderilince orada köy kurulur
   * ve göçmenler harcanır.
   *
   * Savaş gücü sıfır ve `category: 'gocmen'` savaş hesabının dışında
   * (bkz. combat.js isCombatUnit): göçmen ne saldırır ne savunur.
   */
  gocmen: {
    name: 'Göçmen',
    category: 'gocmen',
    trainedAt: ['kosk', 'saray'],
    minLevel: 10,
    equipment: [],
    cost: { kereste: 400, tugla: 350, yontmaTas: 350, demirKulce: 200 },
    trainMinutes: 240,
    statSabit: { saldiri: 0, yayaSav: 0, atliSav: 0, hiz: 5, kapasite: 0 }
  }
};

/**
 * SET BONUSU — ekipman sayısı arttıkça stat çarpanı.
 *
 * Birim statları ekipmanların DÜZ TOPLAMIydı. Ölçüm: aynı bütçeyle
 * (100 külçe + 100 kereste) 10 Fjordvakt 300 saldırı + 300 yaya
 * savunma veriyor, 2,9 Ulv Savaşçısı ise 157 + 171. Yani en ucuz birim
 * her rolde en verimliydi ve kademe sistemi TERSİNE çalışıyordu.
 *
 * KATSAYI NEDEN 0,04 — ÇİFT PARA BİRİMİ (Travian modeli). Bonus büyük
 * tutulursa bu sefer ucuz birim tamamen ölür. Doğru hedef iki ayrı
 * kıtlığın ZIT yönde sıralanması:
 *   · KAYNAK başına ucuz birim önde  → erken oyunda bağlayıcı olan bu
 *   · TAHIL başına pahalı birim önde → geç oyunda ordu tavanını tahıl
 *     belirler (bkz. tick.js · birimYemi, madde 7)
 * Oyuncu büyüdükçe kıtlık kaynaktan tahıla kayıyor ve üst kademeye
 * geçmek zorunda kalıyor. Krossover buradan doğuyor; 0,12 denendi ve
 * pahalı birimi HER eksende öne geçirdiği için reddedildi.
 *
 * Yalnız savaş statlarına uygulanır — hız ve kapasite ekipmanın düz
 * toplamıdır, taşıma ve yürüyüş bir "set" işi değil.
 */
const SET_BONUS_ADIM = 0.04;

/**
 * Birimin taban statı = (temel + Σ ekipman) × set bonusu.
 * `statSabit` taşıyan birimler bunun DIŞINDA: izci ve kuşatma
 * araçlarının değerleri bilinçli olarak ekipman toplamı değil.
 */
function turetilmisStat(def) {
  const s = { ...BASE_STATS };
  for (const eq of def.equipment || []) {
    const e = EQUIPMENT_DEFS[eq];
    if (!e) continue;
    s.saldiri += e.saldiri || 0;
    s.yayaSav += e.yayaSav || 0;
    s.atliSav += e.atliSav || 0;
    s.hiz += e.hiz || 0;
    s.kapasite += e.kapasite || 0;
  }
  const n = (def.equipment || []).length;
  const kat = 1 + SET_BONUS_ADIM * Math.max(0, n - 1);
  s.saldiri = Math.round(s.saldiri * kat);
  s.yayaSav = Math.round(s.yayaSav * kat);
  s.atliSav = Math.round(s.atliSav * kat);
  return s;
}

for (const def of Object.values(UNIT_DEFS)) {
  def.stats = def.statSabit || turetilmisStat(def);
}

/** Yeni köy için gereken göçmen sayısı — tek doğruluk kaynağı */
const SETTLER_UNIT = 'gocmen';
const SETTLERS_REQUIRED = 3;

/**
 * ARAŞTIRMA — Rún Salonu.
 *
 * Bir birimi eğitebilmek için İKİ kapı birden açılmalı: eğitildiği binanın
 * (kışla/ahır/atölye) seviyesi VE Rún Salonu'nda o birimin araştırılmış
 * olması. İki ayrı yatırım hattı: kışla kadro ve hız verir, Rún Salonu
 * neyin eğitilebileceğini belirler.
 *
 * Başlangıç birimleri (minLevel 1) araştırma İSTEMEZ — yeni oyuncu Rún
 * Salonu'nu kuramadan da asker basabilmeli, yoksa oyun ilk saatlerde durur.
 *
 * Gereken Rún Salonu seviyesi birimin minLevel'ıyla AYNI: Lvl 10 birim hem
 * Lvl 10 kışla hem Lvl 10 salon ister. Maliyet ve süre seviyeyle katlanarak
 * artıyor (1.45× ve 1.4×); tek yerden ayarlanabilsin diye tabloyla değil
 * formülle üretiliyor.
 */
const RESEARCH_COST_BASE = { kereste: 120, tugla: 90, yontmaTas: 90, demirKulce: 120 };
const RESEARCH_COST_STEP = 1.45;
const RESEARCH_MINUTES_BASE = 30;
const RESEARCH_MINUTES_STEP = 1.4;

function researchFor(minLevel) {
  const lv = Math.max(1, minLevel || 1);
  if (lv <= 1) return null;                       // başlangıç birimi: serbest
  const k = lv - 2;
  const cost = {};
  for (const [res, amt] of Object.entries(RESEARCH_COST_BASE)) {
    cost[res] = Math.round(amt * Math.pow(RESEARCH_COST_STEP, k));
  }
  return {
    level: lv,
    cost,
    minutes: Math.round(RESEARCH_MINUTES_BASE * Math.pow(RESEARCH_MINUTES_STEP, k)),
  };
}

for (const def of Object.values(UNIT_DEFS)) {
  def.research = researchFor(def.minLevel);
}
/*
  Göçmen Rún Salonu araştırması İSTEMEZ: kapısı zaten köşk/saray Lvl 10.
  İkinci bir kapı koymak yeni köyü gereksiz yere kilitler.
*/
UNIT_DEFS[SETTLER_UNIT].research = null;

/*
  KOÇBAŞI RÚN SALONU İSTER — ama atölye şartı Lvl 1 kalır.

  Araştırma normalde `minLevel`den türüyor ve koç başının minLevel'i 1
  olduğu için hiç araştırma istemiyordu: atölyeyi kurar kurmaz sur kırma
  makinesi üretilebiliyordu. Kuşatma bilgisinin bedava gelmemesi gerekiyor.

  `minLevel` DEĞİŞTİRİLMEDİ bilerek: onu yükseltmek atölye şartını da
  yükseltir, yani tek istek için iki kapı birden eklenirdi. Araştırma
  doğrudan en alt kademeye (Lvl 2) yazılıyor — Rún Salonu Lvl 2 yetiyor.
*/
UNIT_DEFS.kaleKiran.research = researchFor(2);

/** Bu birim eğitilmeden önce araştırılmalı mı? */
const needsResearch = (unitType) => !!UNIT_DEFS[unitType]?.research;

/**
 * EKİPMAN YÜKSELTMESİ — silahçı ve zırhçıda, 20 seviye.
 *
 * Her seviye o ekipmanın KENDİ KATKISINI %1,75 artırıyor; Lvl 20'de katkı
 * %35 daha fazla. Kılıç saldırı ağırlıklı olduğu için kılıç yükseltmesi
 * saldırıyı, kalkan savunmayı büyütüyor — ayrı tablo tutmaya gerek yok,
 * mevcut ekipman katkı tablosu zaten bunu söylüyor.
 *
 * NEDEN "katkının üstüne" değil de "tanımlı stat'ın üstüne" ekleniyor:
 * birimlerin `stats` değerleri elle ayarlanmış ve biri (Stormridder) taban+
 * ekipman toplamından bilerek sapıyor. Stat'ı formülden yeniden üretsek o
 * elle ayar sessizce kaybolurdu. Bu yüzden Lvl 0'da sonuç TANIMIN AYNISI,
 * seviye yalnız üstüne ekliyor.
 *
 * Hız ve kapasite yükselmiyor: kılıcı bilemek askeri hızlandırmaz.
 */
const EQUIPMENT_MAX_LEVEL   = 20;
const EQUIPMENT_UPGRADE_STEP = 0.0175;          // seviye başına katkı artışı
const EQUIPMENT_UPGRADE_COST_BASE = { kereste: 150, tugla: 110, yontmaTas: 110, demirKulce: 150 };
const EQUIPMENT_UPGRADE_COST_STEP = 1.25;
const EQUIPMENT_UPGRADE_MINUTES_BASE = 20;
const EQUIPMENT_UPGRADE_MINUTES_STEP = 1.25;

/** `level` (0-19) seviyesinden bir üstüne çıkmanın bedeli */
function equipmentUpgradeCost(level) {
  const cost = {};
  for (const [res, amt] of Object.entries(EQUIPMENT_UPGRADE_COST_BASE)) {
    cost[res] = Math.round(amt * Math.pow(EQUIPMENT_UPGRADE_COST_STEP, level));
  }
  return cost;
}
function equipmentUpgradeMinutes(level) {
  return Math.round(EQUIPMENT_UPGRADE_MINUTES_BASE
    * Math.pow(EQUIPMENT_UPGRADE_MINUTES_STEP, level));
}

/** Yükseltilebilir ekipmanlar — at hariç (at bir alet değil) */
const UPGRADABLE_EQUIPMENT = Object.keys(EQUIPMENT_DEFS).filter(k => k !== 'at');

/**
 * Birimin YÜKSELTMELERLE birlikte savaş değerleri.
 * Lvl 0'da tanımdaki `stats` ile birebir aynı döner.
 */
function unitStats(unitKey, levels = {}) {
  const def = UNIT_DEFS[unitKey];
  if (!def) return null;
  const out = { ...def.stats };
  for (const eq of def.equipment || []) {
    const katki = EQUIPMENT_DEFS[eq];
    const lv = Math.max(0, Math.min(EQUIPMENT_MAX_LEVEL, Math.floor(levels?.[eq] || 0)));
    if (!katki || lv <= 0) continue;
    const k = EQUIPMENT_UPGRADE_STEP * lv;
    out.saldiri = Math.round((out.saldiri + (katki.saldiri || 0) * k) * 100) / 100;
    out.yayaSav = Math.round((out.yayaSav + (katki.yayaSav || 0) * k) * 100) / 100;
    out.atliSav = Math.round((out.atliSav + (katki.atliSav || 0) * k) * 100) / 100;
  }
  return out;
}

/** Rún Salonu'nda araştırılabilir birimler — seviyeye göre sıralı */
const RESEARCHABLE = Object.entries(UNIT_DEFS)
  .filter(([, d]) => d.research)
  .sort((a, b) => a[1].research.level - b[1].research.level)
  .map(([k]) => k);

// ── Ekipman kuralları ──────────────────────────────────────────────
const EQUIPMENT_RULES = [
  'Her asker Kılıç veya Mızrak\'tan birini taşır; ikisini birden taşıyamaz.',
  'Mızrak kullanan asker Kalkan taşıyamaz.',
  'Kalkan yalnızca kılıçlı askerlerle kullanılabilir.',
  'Her asker Zırh giyebilir (kılıçlı da, mızraklı da).',
  'Süvariler ekipmanlarını atla birlikte alır.'
];

module.exports = {
  EQUIPMENT_DEFS, EQUIPMENT_BY_BUILDING, UNIT_DEFS, BASE_STATS, EQUIPMENT_RULES,
  needsResearch, RESEARCHABLE, researchFor,
  unitStats, equipmentUpgradeCost, equipmentUpgradeMinutes,
  UPGRADABLE_EQUIPMENT, EQUIPMENT_MAX_LEVEL, EQUIPMENT_UPGRADE_STEP,
  SETTLER_UNIT, SETTLERS_REQUIRED,
  SET_BONUS_ADIM, turetilmisStat,
};
