/**
 * Köy Merkezi bina tanımları — istemci tarafı
 *
 * SAVUNMA BONUSU — TAVAN %150, sunucudakiyle BİREBİR aynı formül
 * (server/data/villageDefs.js). Her şey maksimumda (sur 20 + hendek 20 +
 * altı kule lvl20 tam kadro) toplam tam %150 olur: sur %80, hendek %35,
 * kuleler %35. Payları değiştirirken İKİ dosyayı da birlikte güncelle.
 */
export const DEF_BONUS_CAP = 150;

/** Her yapının Lvl 20'deki payı — üçünün toplamı DEF_BONUS_CAP olmalı */
const SUR_MAX    = 80;   // sur tek başına
const HENDEK_MAX = 35;   // hendek tek başına
const KULE_MAX   = 35;   // ALTI kule lvl20 + tam kadro okçu, toplam

/** Seviye eğrisinin ŞEKLİ (Travian sur cetveli) — tavanlar aşağıda veriliyor */
const DEF_CURVE = [0,3.0,6.1,9.3,12.6,15.9,19.4,23.0,26.7,30.5,34.4,38.4,42.6,46.9,51.3,55.8,60.5,65.3,70.2,75.4,80.6];

const r1 = (v) => Math.round(v * 10) / 10;
const CURVE_TOP = DEF_CURVE[DEF_CURVE.length - 1];
/** Eğriyi verilen tavana ölçekler; şekli korur, Lvl 20'de tam `max` olur */
const curveTo = (max) => DEF_CURVE.map(v => r1(v * max / CURVE_TOP));

export const SUR_BONUS    = curveTo(SUR_MAX);
export const HENDEK_BONUS = curveTo(HENDEK_MAX);
export const KULE_BONUS   = curveTo(KULE_MAX);

/**
 * YÜKSELTME MALİYETİ — sunucudaki getScaledUpgradeCost ile BİREBİR aynı.
 * Taban yoksa binanın inşa maliyeti taban kabul edilir; her seviye artışının
 * bir bedeli var. Çarpanı değiştirirken server/index.js'i de güncelle.
 */
export const UPGRADE_MULT_DEFAULT = 1.25;

export function upgradeCostAt(type, currentLevel) {
  const def = VILLAGE_DEFS[type];
  const base = def?.upgradeCostBase || def?.cost;
  if (!base) return null;
  const mult = Math.pow(def.upgradeCostMultiplier || UPGRADE_MULT_DEFAULT,
    Math.max(0, currentLevel - 1));
  return Object.fromEntries(
    Object.entries(base).map(([k, v]) => [k, Math.round(v * mult)])
  );
}

/** Kule slot sayısı — bonus altı slotun ortalaması olarak hesaplanır */
export const TOWER_SLOTS = 6;

/**
 * Bir kulenin savunmaya net katkısı (%): seviye bonusu × okçu doluluğu,
 * altı slota bölünmüş. Sunucudaki towerBonusPct ile aynı formül.
 */
export function towerSlotBonus(level, archers) {
  if (!(level >= 1)) return 0;
  const maxA = level * (VILLAGE_DEFS.kule?.workersPerLevel || 4);
  if (maxA <= 0) return 0;
  const fill = Math.min(1, Math.max(0, (archers || 0) / maxA));
  const lv = Math.min(Math.floor(level), KULE_BONUS.length - 1);
  return Math.round((KULE_BONUS[lv] || 0) * fill / TOWER_SLOTS * 10) / 10;
}

const VILLAGE_DEFS = {

  // ── Merkez ──────────────────────────────────────────────────────
  anaBina: { cpPerLevel:2,
    name:'Ana Bina', category:'merkez', icon:'🏛️',
    description:'Köyün kalbi ve iki şeyin ayarı. Her seviye ÜRETİM ALANI açar: Lvl 1 de 6 slot, Lvl 20 de 25 (tavan). Nüfusun BÜYÜME HIZI da buradan gelir — Lvl 1 de oyun saatinde 1 kişi, her seviye +2, Lvl 20 de 39. Nüfusun TAVANI ise evlerden gelir; ana bina hızı, ev sınırı belirler. Ana bina yoksa köy hiç büyümez.',
    unique:true, maxLevel:20,
    buildBaseWork:50, buildMultiplier:1.8,
    upgradeCostBase:{ kereste:35, tugla:120, yontmaTas:60, demirKulce:55 },
    upgradeCostMultiplier:1.7,
    cost:{ kereste:0, tugla:0, yontmaTas:0, demirKulce:0 }
  },

  // ── İşleme Binaları ─────────────────────────────────────────────
  keresteci: { cpPerLevel:1,
    name:'Keresteci', category:'isleme', icon:'🪚',
    description:'Ham odunu keresteye çevirir; kereste neredeyse her binanın ve ekipmanın omurgasıdır. İşçi başına saatte 8 odun → 6 kereste, yani dönüşümde dörtte bir kayıp var. Seviye başına 5 işçi alır: seviye kapasiteyi, atadığın işçi sayısı gerçek üretimi belirler. Odun bitince durur — darboğaz çoğu zaman orman tarlalarıdır. Çıktı İşlenmiş Mal Deposuna gider, depo doluysa fazlası kaybolur.',
    unique:true, maxLevel:20, workersPerLevel:5,
    processes:{ input:'odun', inputPerHour:8, output:'kereste', outputPerHour:6 },
    buildBaseWork:20, buildMultiplier:1.8, cost:{ odun:100, tas:40 }
  },
  tuglaci: { cpPerLevel:1,
    name:'Tuğlacı', category:'isleme', icon:'🧱',
    description:'Kili pişirip tuğla yapar; tuğla ağır yönetim binalarının (köşk, saray, taverna) ana malzemesidir. İşçi başına saatte 8 kil → 6 tuğla. Seviye başına 5 işçi alır; üretimi belirleyen atanan işçi sayısıdır, seviye yalnız tavanı açar. Kil bitince durur.',
    unique:true, maxLevel:20, workersPerLevel:5,
    processes:{ input:'kil', inputPerHour:8, output:'tugla', outputPerHour:6 },
    buildBaseWork:20, buildMultiplier:1.7, cost:{ odun:60, kil:50 }
  },
  tasci: { cpPerLevel:1,
    name:'Taşçı', category:'isleme', icon:'🪨',
    description:'Ham taşı yontar; yontma taş sur, kule ve askeri binaların belkemiğidir. İşçi başına saatte 8 taş → 6 yontma taş. Seviye başına 5 işçi alır. Taş ocakları yetişmezse tezgâh boş döner — savunmaya yatırım yapmadan önce taş üretimine bakmak gerekir.',
    unique:true, maxLevel:20, workersPerLevel:5,
    processes:{ input:'tas', inputPerHour:8, output:'yontmaTas', outputPerHour:6 },
    buildBaseWork:20, buildMultiplier:1.7, cost:{ odun:70, tas:40 }
  },
  demirci: { cpPerLevel:1,
    name:'Demirci', category:'isleme', icon:'🔨',
    description:'Demir cevherini külçeye döker. Oyunun EN DAR dönüşümü burada: işçi başına saatte 5 demir → 4 külçe, ve külçe hem silah, zırh, kuşatma makinesi hem de ağır binalar için gerekiyor. Seviye başına 5 işçi alır. Ordunu büyütmek istiyorsan sıkışacağın ilk yer burasıdır.',
    unique:true, maxLevel:20, workersPerLevel:5,
    processes:{ input:'demir', inputPerHour:5, output:'demirKulce', outputPerHour:4 },
    buildBaseWork:20, buildMultiplier:1.8, cost:{ odun:80, tas:40 }
  },
  degirmen: { cpPerLevel:1,
    name:'Değirmen', category:'isleme', icon:'⚙️',
    description:'Tahılı una öğütür — yiyecek zincirinin ilk halkası (tahıl → un → ekmek). İşçi başına saatte 90 tahıl → 72 un, yani tek bir işçi bile tarlaların verebileceğinden fazlasını öğütür: darboğaz değirmen değil TAHIL üretimidir. Seviye başına 5 işçi alır ama çoğu köyde birkaç işçi yeter; fazlasını tarlalara vermek daha kârlıdır.',
    unique:true, maxLevel:20, workersPerLevel:5,
    processes:{ input:'tahil', inputPerHour:90, output:'un', outputPerHour:72 },
    buildBaseWork:20, buildMultiplier:1.7, cost:{ odun:90, tas:30 }
  },
  firin: { cpPerLevel:1,
    name:'Fırın', category:'isleme', icon:'🔥',
    description:'Unu ekmeğe çevirir. İşçi başına saatte 72 un → 54 ekmek. Köylüler ve askerler önce EKMEK yer, bitince un, o da bitince ham tahıl — yani fırın olmayan bir köy aynı nüfusu beslemek için çok daha fazla tahıl yakar. Seviye başına 5 işçi alır. Un ve ekmek Erzak Ambarında ORTAK bir tavanı paylaşır.',
    unique:true, maxLevel:20, workersPerLevel:5,
    processes:{ input:'un', inputPerHour:72, output:'ekmek', outputPerHour:54 },
    buildBaseWork:20, buildMultiplier:1.7, cost:{ odun:60, kil:40 }
  },

  // ── Askeri ──────────────────────────────────────────────────────
  zirh:         { cpPerLevel:1, name:'Zırhçı',          category:'askeri', icon:'🛡️', description:'Külçe demirden ZIRH ve KALKAN döver — savunma tarafının teçhizatı. Atanan işçi sayısı üretim hızını belirler, seviye ise kaç işçi alabileceğini (seviye başına 3). Ürettiğin parçalar Cephanelikteki ORTAK havuzda durur. Ekipmanın SEVİYESİNİ de burada yükseltirsin: zırh ve kalkan seviyesi bütün savunan birliklerine birden işler, tek tek askere değil.',
                   unique:true, maxLevel:20, workersPerLevel:3, buildBaseWork:25, buildMultiplier:1.8, upgradeCostBase:{ kereste:45, yontmaTas:35, demirKulce:35 }, upgradeCostMultiplier:1.6, cost:{ kereste:45, yontmaTas:35, demirKulce:35 } },
  silahci:      { cpPerLevel:1, name:'Silahçı',         category:'askeri', icon:'⚔️', description:'Külçe demirden KILIÇ ve MIZRAK döver — saldırı tarafının teçhizatı. Atanan işçi üretim hızını, seviye işçi tavanını belirler (seviye başına 3). Parçalar Cephanelikteki ortak havuza girer. Kılıç ve mızrağın SEVİYESİ de burada yükseltilir ve bütün orduna birden işler; bir seferde tek bir ekipman yükseltilebilir.',
                   unique:true, maxLevel:20, workersPerLevel:3, buildBaseWork:25, buildMultiplier:1.8, upgradeCostBase:{ kereste:45, yontmaTas:35, demirKulce:35 }, upgradeCostMultiplier:1.6, cost:{ kereste:45, yontmaTas:35, demirKulce:35 } },
  ahir:         { cpPerLevel:1, name:'Ahır',            category:'askeri', icon:'🐎', description:'Süvari birliklerini eğitir ve AT besler. Seviye × 5 kadar at tutabilir — at yoksa süvari eğitilemez, çünkü her süvari bir at tüketir. Atlar ayrıca günde 3 HAM TAHIL yer (un ya da ekmek değil), yani büyük bir süvari ordusu tarlalarını doğrudan ezer. Seviye başına 3 işçi alır; işçi sayısı eğitim süresini kısaltır.',
                   unique:true, maxLevel:20, workersPerLevel:3, horseCapPerLevel:5, buildBaseWork:35, buildMultiplier:1.9, upgradeCostBase:{ kereste:60, tahil:60 }, upgradeCostMultiplier:1.7, cost:{ kereste:60, tahil:60 } },
  runSalonu:    { cpPerLevel:2, name:'Rún Salonu',       category:'askeri',   icon:'\u16b1', description:'Birimlerin araştırıldığı yer — bir birimi eğitebilmek için hem onu eğiten binanın seviyesi hem BURADAKİ araştırma gerekir. Araştırma bir kez yapılır ve köye kalıcıdır. En yüksek seviyesi 10; seviye hangi birimlerin araştırılabileceğini, atanan araştırmacı sayısı (seviye başına 3) süreyi belirler. Araştırma kuyruğu tek sıra ilerler.',
                   unique:true,  maxLevel:10, workersPerLevel:3, researches:true,
                   buildBaseWork:40, buildMultiplier:1.9, cost:{ kereste:85, yontmaTas:110, demirKulce:75 },
                   upgradeCostBase:{ kereste:85, yontmaTas:110, demirKulce:75 }, upgradeCostMultiplier:1.7 },
  kisla:        { cpPerLevel:1, name:'Kışla',           category:'askeri', icon:'🛡️', description:'Piyade birliklerini eğitir. Seviyesi hangi birimleri eğitebileceğinin kapısıdır (Rún Salonu araştırmasıyla birlikte), atanan işçi sayısı (seviye başına 3) eğitim süresini kısaltır. Eğitim sırası tek kuyruk hâlinde ilerler; sıradaki birim için malzeme yoksa kuyruk bekler. Asker ayrıca nüfustan yer ve günde 6 ekmek yer — köylünün iki katı.',
                   unique:true, maxLevel:20, workersPerLevel:3, buildBaseWork:35, buildMultiplier:1.9, upgradeCostBase:{ kereste:60, yontmaTas:70 }, upgradeCostMultiplier:1.7, cost:{ kereste:60, yontmaTas:70 } },
  atolye:       { cpPerLevel:1, name:'Atölye',          category:'askeri', icon:'🏗️', description:'Koç başı ve mancınık üretir. İkisi ORTAK bir kapasiteyi paylaşır: seviye × 5 makine, yani Lvl 5 atölyede toplam 25. Koç başı YALNIZ suru kırar (hendeğe dokunmaz, sur sıfırlanınca artan güç boşa gider); mancınık ise seçtiğin BİNAYI yıkar. İkisi de tek başına savaşmaz, orduyla gider ve savaşı kazanman gerekir — kaybeden ordunun kuşatması işlemez. Kuşatma makineleri Cephanelik havuzunu KULLANMAZ; onlar makine, kılıç değil. Seviye başına 3 işçi alır.',
                   unique:true, maxLevel:20, workersPerLevel:3, siegeCapPerLevel:5, buildBaseWork:30, buildMultiplier:1.9, upgradeCostBase:{ kereste:75, demirKulce:75 }, upgradeCostMultiplier:1.7, cost:{ kereste:75, demirKulce:75 } },
  cephane:      { cpPerLevel:1, name:'Cephanelik',      category:'askeri', icon:'🏹', description:'Kılıç, mızrak, kalkan ve zırh tek bir ORTAK havuzu paylaşır ve o havuzun büyüklüğünü bu bina belirler: seviye başına +200 yer. Cephaneliğin yoksa havuz yalnız 80 parçadır — ilk ordudan sonra tıkanır. Havuz ortak olduğu için tek bir tür (mesela kılıç) havuzun tamamını doldurabilir; ne üreteceğine sen karar verirsin. Atlar ve kuşatma makineleri bu havuza girmez.',
                   unique:true, maxLevel:20, equipmentCapPerLevel:50, poolCapPerLevel:200, buildBaseWork:30, buildMultiplier:1.8, upgradeCostBase:{ kereste:60, yontmaTas:70, demirKulce:35 }, upgradeCostMultiplier:1.6, cost:{ kereste:60, yontmaTas:70, demirKulce:35 } },
  saglikCadiri: { cpPerLevel:1, name:'Sağlık Çadırı',   category:'askeri', icon:'⛺', description:'Köyün SAVUNULDUĞU savaşlarda ölen askerlerinin bir kısmı yaralı sayılıp çadıra alınır: her seviye %2, Lvl 20 de %40. Tedavi KENDİLİĞİNDEN başlamaz — hangi birliği ayağa kaldıracağına sen karar verirsin; seçtiğin birlik kendi eğitim süresinin 2 katı kadar sürede iyileşip orduna döner. Yatak sayısı seviye × 10 (Lvl 20 de 200) ve yataklar tedavi bitene kadar doludur; sığmayan yaralı ölür. Saldırıda ölen askere işlemez — çadır köyde. Köyünde duran misafir askerlere de işlemez.',             unique:true, maxLevel:20, buildBaseWork:25, buildMultiplier:1.7, cost:{ kereste:35, tahil:30 } },
  // Kahramanın evi — doğduğu, iyileştiği ve eşyalarını tuttuğu yer.
  // İKİZ TANIM: sunucudaki villageDefs.js ile birlikte değişir.
  kahramanKonagi: { cpPerLevel:2, name:'Kahraman Konağı', category:'askeri', icon:'🏅', description:'Kahramanın evi: burada doğar, ölünce burada dirilir, eşyalarını burada tutar ve kahraman yalnız bu köyün savunmasına bonus verir. HER SEVİYE üç şey büyütür — iyileşme hızı (+1,5 can/sa), macera tavanı (iki seviyede bir +1, Lvl 20 de 12) ve yeni macera birikme süresi (6 sa → 2,2 sa). Konak yıkılırsa kahraman maceraya çıkamaz. Ayrıntılar Kahraman ekranında.', unique:true, maxLevel:20, workersPerLevel:1, buildBaseWork:35, buildMultiplier:1.85, cost:{ kereste:70, yontmaTas:90, demirKulce:50 }, upgradeCostBase:{ kereste:70, yontmaTas:90, demirKulce:50 }, upgradeCostMultiplier:1.7 },

  // ── Depo ────────────────────────────────────────────────────────
  hammaddeDepo: { cpPerLevel:1,
    name:'Hammadde Deposu', category:'depo', icon:'📦',
    description:'Ham odun, kil, taş ve demiri depolar — DÖRDÜ İÇİN AYRI AYRI tavan verir, ortak değil. Deposuz taban her biri için 1000; bu bina Lvl 1 de +3000, sonraki her seviye +1500 ekler. Tavan dolduğunda üretim boşa akar, o yüzden depo büyütmek çoğu zaman tarla yükseltmekten daha kârlıdır. En yüksek seviyeye ulaşınca İKİNCİSİ inşa edilebilir.',
    unique:true, repeatableWhenMaxed:true, maxLevel:20,
    stores:['odun','kil','tas','demir'],
    baseCapacity:3000, capacityPerLevel:1500,
    buildBaseWork:30, buildMultiplier:1.8, cost:{ kereste:60, yontmaTas:60, tugla:45 }
  },
  islenmisMalDepo: { cpPerLevel:1,
    name:'İşlenmiş Mal Deposu', category:'depo', icon:'🏭',
    description:'Kereste, tuğla, yontma taş ve külçe demiri depolar — dördü için ayrı ayrı tavan. Deposuz taban her biri için 800; bu bina Lvl 1 de +2400, sonraki her seviye +1200 ekler. İşlenmiş mal bina ve ekipmanın parasıdır: bu depo küçük kaldığında işleme binaların boşa çalışır. En yüksek seviyede ikincisi kurulabilir.',
    unique:true, repeatableWhenMaxed:true, maxLevel:20,
    stores:['kereste','tugla','yontmaTas','demirKulce'],
    baseCapacity:2400, capacityPerLevel:1200,
    buildBaseWork:30, buildMultiplier:1.8, cost:{ kereste:50, yontmaTas:60, tugla:60 }
  },
  tahilAmbar: { cpPerLevel:1,
    name:'Tahıl Ambarı', category:'depo', icon:'🌾',
    description:'HAM tahılı depolar (un ve ekmek Erzak Ambarına gider). Tabanı 1000; bu bina Lvl 1 de +12000, sonraki her seviye +6000 ekler — oyunun en büyük deposu, çünkü tahıl hem yiyeceğin hem atların girdisi. Ambar dolunca tarlaların boşa üretir. En yüksek seviyede ikincisi kurulabilir.',
    unique:true, repeatableWhenMaxed:true, maxLevel:20,
    stores:['tahil'],
    baseCapacity:12000, capacityPerLevel:6000,
    buildBaseWork:25, buildMultiplier:1.7, cost:{ kereste:50, yontmaTas:45 }
  },
  granary: { cpPerLevel:1,
    name:'Erzak Ambarı', category:'depo', icon:'🍞',
    description:'Un ve ekmeği depolar. İkisi ORTAK bir tavanı paylaşır: tavan dolduğunda ikisi birden oranlı olarak kırpılır. Taban 600; bu bina Lvl 1 de +2500, sonraki her seviye +1250 ekler. Köylüler ve askerler önce ekmek, sonra un, en son ham tahıl yediği için dolu bir erzak ambarı açlığa karşı asıl tampondur. En yüksek seviyede ikincisi kurulabilir.',
    unique:true, repeatableWhenMaxed:true, maxLevel:20,
    stores:['un','ekmek'],
    baseCapacity:2500, capacityPerLevel:1250,
    buildBaseWork:25, buildMultiplier:1.7, cost:{ kereste:50, tugla:75 }
  },

  // ── Ekonomik ────────────────────────────────────────────────────
  pazar:      { cpPerLevel:2, name:'Pazar',              category:'ekonomik', icon:'🏪', description:'Hem NPC ile takas, hem oyuncular arası teklif, hem de KENDİ köylerine kaynak gönderme buradan olur. Seviyesi TÜCCAR SAYISIDIR: her seviye 1 tüccar, her tüccar 2000 kaynak taşır. Açık bir teklif ya da yoldaki bir sevkiyat tüccarı bağlar; teklifi iptal edersen tüccar geri döner. Tüccarlar yürür, ışınlanmaz — uzak köye gönderi zaman alır. Pazar yükseltilirken de çalışmaya devam eder.',                              unique:true, maxLevel:20, buildBaseWork:40, buildMultiplier:1.8, cost:{ kereste:60, yontmaTas:95 } },
  loncaDemir: { cpPerLevel:2, name:'Demirciler Loncası', category:'ekonomik', icon:'🔩', description:'Köyün DEMİR tarlalarının üretimini artırır: her seviye +%5, en fazla 5 seviye, yani +%25. Bonus tarlaların üretimine çarpan olarak işler — tarlan yoksa artıracak bir şey de yoktur. Demir oyunun en dar kaynağı olduğu için bu lonca genelde ilk kurulanıdır.', unique:true, maxLevel:5, bonusPerLevel:5, affects:'demir',  buildBaseWork:30, buildMultiplier:2.0, cost:{ kereste:50, demirKulce:90 } },
  loncaOdun:  { cpPerLevel:2, name:'Oduncular Loncası',  category:'ekonomik', icon:'🪓', description:'Köyün ORMAN tarlalarının üretimini artırır: her seviye +%5, en fazla 5 seviye (+%25). Bonus tarla üretimine çarpan olarak işler; işleme binalarına (keresteci) doğrudan dokunmaz — daha çok odun, dolayısıyla daha çok kereste demektir.',  unique:true, maxLevel:5, bonusPerLevel:5, affects:'odun',   buildBaseWork:30, buildMultiplier:2.0, cost:{ kereste:60, yontmaTas:45 } },
  loncaTas:   { cpPerLevel:2, name:'Taşçılar Loncası',   category:'ekonomik', icon:'⛏️', description:'Köyün TAŞ tarlalarının üretimini artırır: her seviye +%5, en fazla 5 seviye (+%25). Sur, kule ve askeri binalar yontma taş yediği için savunmaya oynayan bir köyde erken kurulur.',   unique:true, maxLevel:5, bonusPerLevel:5, affects:'tas',    buildBaseWork:30, buildMultiplier:2.0, cost:{ kereste:50, yontmaTas:70 } },
  loncaKil:   { cpPerLevel:2, name:'Kilciler Loncası',   category:'ekonomik', icon:'🟫', description:'Köyün KİL tarlalarının üretimini artırır: her seviye +%5, en fazla 5 seviye (+%25). Kil, tuğla üzerinden yönetim binalarına (köşk, saray, taverna) gider — yani genişlemeye oynayan köyün loncasıdır.',   unique:true, maxLevel:5, bonusPerLevel:5, affects:'kil',    buildBaseWork:30, buildMultiplier:2.0, cost:{ kereste:50, tugla:90 } },
  loncaTahil: { cpPerLevel:2, name:'Tahılcılar Loncası', category:'ekonomik', icon:'🌾', description:'Köyün TAHIL tarlalarının üretimini artırır: her seviye +%5, en fazla 5 seviye (+%25). Tahıl hem nüfusu hem orduyu hem atları besler; büyük ordusu olan köyde bu lonca ordunun büyüklüğünü doğrudan belirler.', unique:true, maxLevel:5, bonusPerLevel:5, affects:'tahil',  buildBaseWork:30, buildMultiplier:2.0, cost:{ kereste:50, tahil:60 } },

  // ── Yönetim ─────────────────────────────────────────────────────
  // Köşk ve Saray yeni köy KURMA HAKKI verir; ikisi bir arada olamaz
  // (Travian kuralı). Saray yalnız MERKEZ köye kurulabilir ve yıkılıp
  // başka köyde kurulunca merkez oraya taşınır.
  kosk: {
    name:'Köşk', category:'yonetim', icon:'🏯',
    description:'Yeni köy kurma hakkı verir: Lvl 10 ve Lvl 20 de birer hak. Göçmen birimi burada eğitilir ve yeni köy kurmak için hem göçmen hem KÜLTÜR PUANI gerekir. Kültür puanı bütün binalarının seviyelerinden birikir. Sarayla aynı köyde olamaz — köşk ucuz ve her köyde kurulabilir, saray pahalı ve tektir.',
    unique:true, maxLevel:20, cpPerLevel:3,
    expansionAt:[10, 20], trainsSettlers:true, excludes:'saray',
    buildBaseWork:40, buildMultiplier:1.8,
    upgradeCostBase:{ kereste:75, tugla:150, yontmaTas:95, demirKulce:75 },
    upgradeCostMultiplier:1.7,
    cost:{ kereste:75, tugla:150, yontmaTas:95, demirKulce:75 }
  },
  saray: {
    name:'Saray', category:'yonetim', icon:'👑',
    description:'Oyuncunun YALNIZ BİR köyünde bulunabilir. Lvl 10, 15 ve 20 de birer yeni köy hakkı verir — köşkten bir fazla. Göçmen burada da eğitilir. İçinden "bu köyü merkez yap" denebilir: merkez köy kahraman kaydının ve hesabın tutulduğu köydür. Köşkle aynı köyde olamaz.',
    unique:true, maxLevel:20, cpPerLevel:4,
    expansionAt:[10, 15, 20], trainsSettlers:true, excludes:'kosk',
    // Oyuncu capinda tek: baska koye kurmak icin once buradaki yikilmali.
    oncePerPlayer:true, canSetCapital:true,
    buildBaseWork:60, buildMultiplier:1.9,
    upgradeCostBase:{ kereste:120, tugla:270, yontmaTas:180, demirKulce:180 },
    upgradeCostMultiplier:1.7,
    cost:{ kereste:120, tugla:270, yontmaTas:180, demirKulce:180 }
  },
  taverna: {
    name:'Taverna', category:'yonetim', icon:'🍺',
    description:'Şölen düzenleyip KÜLTÜR PUANI üretir; kültür puanı yeni köy kurma hakkının ölçüsüdür. Küçük şölen (Lvl 1, 12 oyun saati) bu köyün günlük kültür üretimi kadar, büyük şölen (Lvl 10, 24 saat) BÜTÜN köylerinin günlük üretiminin İKİ KATI kadar puan verir. Puan şölenin SONUNDA yazılır; iptal edersen harcanan kaynak geri gelmez ve aynı anda tek şölen düzenlenebilir.',
    unique:true, maxLevel:20, cpPerLevel:3,
    festival:true,
    buildBaseWork:35, buildMultiplier:1.7,
    upgradeCostBase:{ kereste:95, tugla:180, tahil:100 },
    upgradeCostMultiplier:1.6,
    cost:{ kereste:95, tugla:180, tahil:100 }
  },

  // ── Nüfus ───────────────────────────────────────────────────────
  ev: { cpPerLevel:1,
    name:'Ev', category:'nufus', icon:'🏠',
    description:'Nüfus TAVANINI belirleyen bina: her seviye +100 kişi. Tavan yalnız SİVİLLERİ sınırlar; asker evden çıkıp kışlaya gider. Büyüme HIZI evden değil ANA BİNADAN gelir — ev dolu bir köyde ana binayı yükseltmek büyümeyi hızlandırmaz, önce ev gerekir. En fazla Lvl 5 çıkar ama köyde BİRDEN FAZLA ev kurulabilir; nüfusu büyütmenin yolu yeni ev açmaktır.',
    unique:false, maxLevel:5, populationPerLevel:100,
    buildBaseWork:15, buildMultiplier:1.6, cost:{ kereste:50, tugla:75 }
  },

  // ── Savunma ─────────────────────────────────────────────────────
  sur:    { cpPerLevel:1, name:'Sur',            category:'savunma', icon:'🏰', description:'Savunan bütün birliklere yüzde savunma bonusu verir: Lvl 1 de %3, Lvl 10 da %34, Lvl 20 de %80. Bonus askerin kendi savunmasını çarpar, yani kalabalık savunmada mutlak kazanç çok daha büyüktür. Sur + hendek + kule toplamı %150 de sınırlanır. Koç başı surla hendeği vurup seviyesini düşürebilir — kuşatmalı bir saldırıdan sonra suru onarmak gerekir.',  unique:true,  maxLevel:20, buildBaseWork:50, buildMultiplier:2.0, bonusTable:SUR_BONUS, cost:{ yontmaTas:190, kereste:25 } },
  hendek: { cpPerLevel:1, name:'Hendek',         category:'savunma', icon:'〰️', description:'Surun tamamlayıcısı: aynı eğrinin yarısı kadar bonus verir — Lvl 10 da %13, Lvl 20 de %35. Sur ile birlikte hesaplanır ve ikisinin (kulelerle beraber) toplamı %150 de sınırlanır. KOÇ BAŞI HENDEĞE DOKUNAMAZ: koç yalnız suru kırar, hendek kuşatmadan sağ çıkar — bu yüzden ucuz hendek, erken oyunda sur yükseltmekten daha dayanıklı bir yatırımdır.', unique:true,  maxLevel:20, buildBaseWork:40, buildMultiplier:1.9, bonusTable:HENDEK_BONUS, cost:{ kereste:25, yontmaTas:95 } },
  kule:   { cpPerLevel:1, name:'Savunma Kulesi', category:'savunma', icon:'🗼', description:'Köyde ALTI tane kurulabilir ve ASKER ALIR: seviye başına 4 okçu yeri. Boş kule hiçbir şey vermez — bonus, kulenin seviye bonusu ile okçu DOLULUĞUNUN çarpımıdır. Altı kule de tam seviye ve tam kadroyken toplam katkı surun iki katıdır. Kuleye koyduğun asker o köyü savunur ama sefere gidemez; kule savunmayı asker pahasına satın alır. Sur + hendek + kule toplamı %150 de sınırlanır.',      unique:false, maxLevel:20, buildBaseWork:45, buildMultiplier:2.0, bonusTable:KULE_BONUS, maxInstances:6, workersPerLevel:4, cost:{ kereste:50, yontmaTas:95, demirKulce:75 } }
};

/** Evsiz köyün taban nüfus kapasitesi — sunucudaki BASE_POPULATION ile aynı */
export const BASE_POPULATION = 50;

export default VILLAGE_DEFS;
