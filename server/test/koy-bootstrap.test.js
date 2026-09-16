/**
 * KÖY ZEMİNİ — yeni köy kalıcı kilitlenemez.
 *
 * İlkan bildirdi: *"2. köy kurarken köy içindeki üretim alanlarını
 * yapmak için ana bina seviyesi istiyor ama ana binayı da işlenmiş
 * hammaddeler olmadan kuramıyorum, hiçbir türlü yeni köyü
 * geliştiremiyorum."*
 *
 * GERÇEK BİR ÇIKIŞSIZ ODAYDI. Ön koşul ağacı eklenirken dört işliğe
 * (keresteci, tuğlacı, taşçı, demirci) `anaBina Lvl 2` konmuştu:
 *
 *   işlikler          →  anaBina Lvl 2 ister
 *   anaBina Lvl 1→2   →  35 kereste, 120 tuğla, 60 yontma taş, 55 külçe
 *   bu dört mal       →  YALNIZ o işliklerden çıkar
 *
 * Yeni köy 300'er işlenmiş malla başlıyor ama bu TEK SEFERLİK bir
 * bütçe: tarla yükseltmeleri de işlenmiş mal yiyor. Oyuncu onu
 * harcadığı anda ne Ana Bina'yı yükseltebiliyor ne işliği kurabiliyor
 * — köy bir daha ASLA işlenmiş mal üretemiyor.
 *
 * KİLİTLENEN KURAL: bir İNŞAAT MALZEMESİNİ üreten binaya, yalnız HAM
 * kaynakla ulaşılabilmeli. Ham kaynak her zaman var (köy altı Lvl 1
 * tarlayla başlıyor, tarlalar bedava üretiyor); işlenmiş mal ise
 * yalnız bu binalardan çıkıyor.
 *
 * SONRA KURAL GENİŞLEDİ. İlk hâlinde değirmen ve fırın kapsam dışıydı
 * ("un ve ekmek inşaatı kilitlemiyor, yalnız nüfusu besliyor") ve tam
 * oradan İKİNCİ bir çıkışsız oda çıktı: değirmen `anaBina Lvl 3`
 * istiyordu, o yükseltme ise 120 tuğla. İlkan bildirdi: *"değirmen
 * kuracağım, Ana Bina Lvl 3 istiyor; Ana Bina için tuğla istiyor vs.
 * köyün içindeki üretim binaları tarlalardan toplananlarla
 * geliştirilmeli, işlenmişlerle değil."*
 *
 * Kural artık `processes` alanı olan HER binayı kapsıyor — ne
 * ürettiğine bakmaksızın (bkz. aşağıdaki son iki test).
 */
const test = require('node:test');
const assert = require('node:assert');
const { VILLAGE_DEFS, PRODUCTION_DEFS } = require('../data');
const { createVillage } = require('../game/villageState');
const { eksikOnKosullar, canBuildAt } = require('../game/insaat');

/** Tarlaların bedava ürettiği, her zaman elde edilebilen kaynaklar */
const HAM = new Set(['odun', 'kil', 'tas', 'demir', 'tahil']);

/** İnşaatta kullanılan işlenmiş mallar — ekmek/un bilerek dışarıda */
const INSAAT_MALZEMESI = new Set(['kereste', 'tugla', 'yontmaTas', 'demirKulce']);

/** Bir maliyet sözlüğü yalnız ham kaynak mı istiyor? */
function hamMi(maliyet) {
  return Object.entries(maliyet || {})
    .filter(([, n]) => n > 0)
    .every(([res]) => HAM.has(res));
}

/** Bir inşaat malzemesini üreten binalar — tanımdan türetiliyor, elle liste yok */
function uretenBinalar() {
  const out = {};
  for (const [tip, def] of Object.entries(VILLAGE_DEFS)) {
    const cikti = def.processes?.output;
    if (cikti && INSAAT_MALZEMESI.has(cikti)) out[cikti] = tip;
  }
  return out;
}

test('her inşaat malzemesini üreten bir bina var', () => {
  const ureten = uretenBinalar();
  for (const mal of INSAAT_MALZEMESI) {
    assert.ok(ureten[mal], `${mal} üreten bina yok — köy onu hiç elde edemez`);
  }
});

test('ZEMİN KURALI: inşaat malzemesi üreten binaya YALNIZ HAM kaynakla ulaşılabiliyor', () => {
  const ureten = uretenBinalar();

  for (const [mal, tip] of Object.entries(ureten)) {
    const def = VILLAGE_DEFS[tip];

    // 1) Binanın kendi kuruluş maliyeti ham olmalı
    assert.ok(hamMi(def.cost),
      `${tip} (${mal} üretiyor) kuruluşta işlenmiş mal istiyor: `
      + JSON.stringify(def.cost)
      + ' — işlenmiş malı biten köy onu bir daha kuramaz');

    // 2) Ön koşullarının BEDELİ de ham olmalı
    for (const kosul of def.requires || []) {
      const bedel = kosulBedeli(kosul);
      assert.ok(bedel.hepsiHam,
        `${tip} (${mal} üretiyor) "${bedel.ad}" ön koşulunu istiyor ama `
        + `o koşula ulaşmak İŞLENMİŞ mal gerektiriyor (${bedel.neden}). `
        + 'Çıkışsız oda: işlenmiş malı biten köy bu binayı kuramaz, '
        + 'kuramadığı için de işlenmiş mal üretemez.');
    }
  }
});

/**
 * Bir ön koşula ULAŞMANIN bedeli ham mı?
 *
 * Koşul "X binası Lvl N" ise bedel = X'in kuruluşu + N'e kadar
 * yükseltmeleri. Koşul "T tarlası Lvl N" ise bedel = tarla
 * yükseltmeleri. Seviye 1'lik bir tarla koşulu bedava sayılıyor: köy
 * zaten altı Lvl 1 tarlayla başlıyor.
 */
function kosulBedeli(kosul) {
  const seviye = kosul.seviye || 1;

  if (kosul.tarla) {
    const def = PRODUCTION_DEFS[kosul.tarla];
    const ad = `${def?.name || kosul.tarla} tarlası Lvl ${seviye}`;
    if (seviye <= 1) return { hepsiHam: true, ad, neden: '' };
    for (let l = 1; l < seviye; l++) {
      const c = def?.levels?.[l]?.cost;
      if (!hamMi(c)) {
        return { hepsiHam: false, ad, neden: `tarla Lvl ${l + 1} = ${JSON.stringify(c)}` };
      }
    }
    return { hepsiHam: true, ad, neden: '' };
  }

  // `biri` — listeden HERHANGİ biri ham yoldan geliyorsa koşul ham sayılır
  const adaylar = kosul.biri || [kosul.tip];
  const gerekceler = [];
  for (const t of adaylar) {
    const b = tekBinaBedeli(t, seviye);
    if (b.hepsiHam) return { hepsiHam: true, ad: t, neden: '' };
    gerekceler.push(`${t}: ${b.neden}`);
  }
  return {
    hepsiHam: false,
    ad: adaylar.join(' ya da ') + ` Lvl ${seviye}`,
    neden: gerekceler.join(' · '),
  };
}

function tekBinaBedeli(tip, seviye) {
  const def = VILLAGE_DEFS[tip];
  if (!def) return { hepsiHam: false, neden: `${tip} tanımı yok` };

  if (!hamMi(def.cost)) {
    return { hepsiHam: false, neden: `kuruluş ${JSON.stringify(def.cost)}` };
  }
  if (seviye > 1 && !hamMi(def.upgradeCostBase)) {
    return {
      hepsiHam: false,
      neden: `Lvl ${seviye}'e yükseltme ${JSON.stringify(def.upgradeCostBase)}`,
    };
  }
  // Ön koşulun kendi ön koşulları da sayılmalı
  for (const alt of def.requires || []) {
    const b = kosulBedeli(alt);
    if (!b.hepsiHam) return { hepsiHam: false, neden: `${tip} → ${b.ad} (${b.neden})` };
  }
  return { hepsiHam: true, neden: '' };
}

test('İŞLENMİŞ MALI SIFIRLANMIŞ köy dört işliği de kurabiliyor', () => {
  /*
    Kuralın SONUCUNU ölçen test. Yukarıdaki tanım üzerinden bakıyor,
    bu ise gerçek köy nesnesi üzerinden `canBuildAt` ile soruyor —
    kural doğru yazılıp denetime bağlanmayı unutmuş olabilir.
  */
  const koy = createVillage(0, 0);
  for (const mal of INSAAT_MALZEMESI) koy.resources[mal] = 0;

  const bos = ['2,0', '2,-1', '0,2', '-2,1'];
  const ureten = Object.values(uretenBinalar());
  assert.equal(ureten.length, 4, 'dört inşaat malzemesi işliği bekleniyordu');

  ureten.forEach((tip, i) => {
    const eksik = eksikOnKosullar(koy, tip);
    assert.deepEqual(eksik, [],
      `${tip} için ön koşul eksik: ${eksik.join(', ')} — `
      + 'işlenmiş malı biten köy bu binayı kuramaz, dolayısıyla '
      + 'bir daha işlenmiş mal üretemez (kalıcı kilit)');
    assert.ok(canBuildAt(koy, bos[i], tip),
      `${tip} boş bir hex'e kurulamıyor`);
  });
});

test('yeni köy altı Lvl 1 tarlayla başlıyor — ham kaynak zemini', () => {
  /*
    ZEMİN KURALININ DAYANAĞI BU. "Ham kaynak her zaman var" cümlesi
    ancak köy bedava üreten tarlalarla başladığı için doğru. Tarlalar
    başlangıçtan kaldırılırsa yukarıdaki bütün akıl yürütme çöker.
  */
  const koy = createVillage(0, 0);
  const tarlalar = Object.values(koy.productionTiles || {});
  assert.ok(tarlalar.length >= 5, `en az beş tarla bekleniyordu, ${tarlalar.length} var`);
  assert.ok(tarlalar.every(t => (t.level || 0) >= 1), 'tarlaların hepsi Lvl 1 olmalı');

  const turler = new Set(tarlalar.map(t => t.type));
  for (const ham of ['odun', 'kil', 'tas', 'demir', 'tahil']) {
    assert.ok(turler.has(ham), `${ham} tarlası olmadan köy o kaynağı hiç üretemez`);
  }
});

/**
 * ÜRETİM BİNALARI HAM KAYNAKLA GELİŞİR — İlkan'ın kuralı.
 *
 * İlkan: *"köyün içindeki üretim binaları tarlalardan toplananlarla
 * geliştirilmeli, işlenmişlerle değil."*
 *
 * Yukarıdaki ZEMİN KURALI yalnız İNŞAAT MALZEMESİ üreten dört binayı
 * (kereste, tuğla, yontma taş, külçe) kapsıyordu. Değirmen ve fırın
 * dışarıdaydı ve tam oradan ikinci bir çıkışsız oda çıktı: değirmen
 * `anaBina Lvl 3` istiyordu, o yükseltme ise 120 tuğla — yani ham
 * kaynakla ÇALIŞAN bir binaya ulaşmanın yolu işlenmiş maldan
 * geçiyordu. İşlenmişi biten köy değirmen kuramıyor, kuramadığı için
 * un ve ekmek üretemiyordu.
 *
 * Bu test kuralı BÜTÜN üretim binalarına genişletiyor: `processes`
 * alanı olan her bina — ne ürettiğine bakmaksızın — hem maliyetiyle
 * hem ön koşullarıyla ham kaynakla ulaşılabilir olmalı.
 */
test('ÜRETİM BİNALARININ HEPSİ ham kaynakla kurulup yükseltiliyor', () => {
  const { getScaledUpgradeCost } = require('../game/koyKurallari');

  const uretenler = Object.entries(VILLAGE_DEFS)
    .filter(([, d]) => d.processes)
    .map(([tip]) => tip);
  assert.equal(uretenler.length, 6,
    'altı üretim binası bekleniyordu: ' + uretenler.join(', '));

  for (const tip of uretenler) {
    const def = VILLAGE_DEFS[tip];

    // 1. Kuruluş ham
    assert.ok(hamMi(def.cost),
      `${tip} kuruluşta işlenmiş mal istiyor: ${JSON.stringify(def.cost)}`);

    /*
      2. HER SEVİYEDEKİ yükseltme ham. Tek bir seviyeye bakmak yetmez:
      `upgradeCostBase` eklenirse taban değişir ve yalnız üst
      seviyelerde işlenmiş mal belirebilir.
    */
    for (const lv of [1, 5, 10, 19]) {
      const c = getScaledUpgradeCost(tip, lv);
      assert.ok(hamMi(c),
        `${tip} Lvl ${lv}→${lv + 1} yükseltmesi işlenmiş mal istiyor: `
        + JSON.stringify(c));
    }

    // 3. Ön koşullarına ULAŞMAK da ham olmalı
    for (const kosul of def.requires || []) {
      const bedel = kosulBedeli(kosul);
      assert.ok(bedel.hepsiHam,
        `${tip} "${bedel.ad}" ön koşulunu istiyor ama o koşula ulaşmak `
        + `İŞLENMİŞ mal gerektiriyor (${bedel.neden}). Ham kaynakla `
        + 'çalışan bir binaya işlenmiş maldan geçerek ulaşılamaz.');
    }
  }
});

test('DEĞİRMEN yeni köyde HEMEN kurulabiliyor — un/ekmek zinciri kilitli değil', () => {
  /*
    SONUCU ÖLÇEN TEST. Değirmen un üretiyor, un ekmek oluyor, ekmek
    nüfusu besliyor. Değirmene ulaşılamayan köy açlıktan küçülüyor ve
    oyuncunun yapabileceği hiçbir şey yok.

    Yeni köy iki Lvl 1 tahıl tarlasıyla başlıyor, yani değirmenin
    şartı doğuştan sağlanmış oluyor.
  */
  const koy = createVillage(0, 0);
  for (const mal of INSAAT_MALZEMESI) koy.resources[mal] = 0;

  assert.deepEqual(eksikOnKosullar(koy, 'degirmen'), [],
    'değirmen yeni köyde ön koşulsuz kurulabilmeli');
  assert.ok(canBuildAt(koy, '2,0', 'degirmen'),
    'işlenmiş malı sıfır olan köy değirmen kurabilmeli');

  /*
    FIRIN değirmen Lvl 3 istiyor ve bu ŞART KALIYOR: değirmenin
    yükseltmesi ham olduğu için zincir ham kaynakla kapanıyor.
  */
  const firinEksik = eksikOnKosullar(koy, 'firin');
  assert.deepEqual(firinEksik, ['Değirmen Lvl 3'],
    'fırının tek şartı değirmen olmalı — o da ham kaynakla yükseliyor');
});
