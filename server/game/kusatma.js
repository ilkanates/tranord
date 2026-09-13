/**
 * KUŞATMA FAZI — normal savaştan SONRA çalışır.
 *
 * Tasarım kararları ve nedenleri:
 *
 * 1) YALNIZ SALDIRAN KAZANIRSA. Kaybeden ordunun makineleri de ölüyor;
 *    savaşı kaybedip yine de sur yıkmak "kuşatma bedava" demek olurdu.
 *
 * 2) HAYATTA KALAN makineler iş yapar. Savaşta ölen mancınık vurmaz —
 *    aksi hâlde kuşatma savunmadan tamamen bağımsız olurdu.
 *
 * 3) SEVİYE MALİYETİ ARTAR: bir yapıyı L seviyesinden L-1'e indirmek
 *    `SEVIYE_MALIYETI × L` puan yer. Sabit maliyet olsaydı Lvl 20 sur
 *    Lvl 2 sur kadar kolay düşerdi; artan maliyet yüksek seviyeyi
 *    gerçek bir yatırım yapıyor.
 *
 * 4) KÖY YIKILABİLİR — ama TEK SALDIRIDA DEĞİL.
 *
 *    Ana bina artık 0'a inebiliyor (`ANA_BINA_TABAN = 0`). Köyün yok
 *    olması için BÜTÜN binaların bitmesi gerekiyor; mancınıkla ya da
 *    oyuncunun kendi yıkımıyla. Tek bir mancınık dalgasının köyü silmesi
 *    satılan bir oyun için fazla sertti, ama hiç yıkılamaması da kuşatmayı
 *    anlamsız kılıyordu: aradaki yer "her binayı tek tek düşür".
 *
 *    Yıkımın kendisi burada DEĞİL: bu dosya yalnız seviye düşürüyor.
 *    "Köy boşaldı mı" kararını çağıran taraf veriyor (bkz. index.js ·
 *    koyBosMu / koyuYokEt) — kuşatma ile oyuncunun kendi yıkımı aynı
 *    yerden geçsin diye.
 */
const { UNIT_DEFS } = require('../data');

/** Bir seviyeyi indirmenin puan maliyeti = bu sabit × mevcut seviye */
const SEVIYE_MALIYETI = 30;

/**
 * Ana binanın TABANI. 0 = mancınık ana binayı da sıfırlayabilir, yani
 * köyün son binası da düşebilir. Köy ancak HİÇ binası kalmayınca yok
 * oluyor (bkz. index.js · koyBosMu).
 */
const ANA_BINA_TABAN = 0;

/**
 * İKİNCİ HEDEF — atölye bu seviyeye gelince mancınık iki bina vurabilir.
 *
 * Güç BÖLÜNÜYOR (%60 / %40), artmıyor: ikinci hedef bir bonus değil bir
 * TERCİH. Tek binaya tam güç mü, iki binaya bölünmüş güç mü — oyuncu
 * kararı. Eşit bölseydik (%50/%50) "birinci hedef" diye bir şey kalmaz,
 * sıralamanın anlamı olmazdı.
 */
const IKI_HEDEF_MIN_ATOLYE = 10;
const IKI_HEDEF_PAY = [0.6, 0.4];

/** Koç başı surla, mancınık binayla ilgilenir — ekipmanından anlaşılıyor */
const KOC_EKIPMANI = 'koc_basi';
const MANCINIK_EKIPMANI = 'mancinik';

/** Bu birim hangi kuşatma sınıfından? Ekipmanına bakar, ada değil. */
function kusatmaSinifi(unitKey) {
  const eq = UNIT_DEFS[unitKey]?.equipment || [];
  if (eq.includes(KOC_EKIPMANI)) return 'koc';
  if (eq.includes(MANCINIK_EKIPMANI)) return 'mancinik';
  return null;
}

/** Birlikteki kuşatma gücü — sınıf başına toplam saldırı puanı */
function kusatmaGucu(units) {
  const out = { koc: 0, mancinik: 0, kocAdet: 0, mancinikAdet: 0 };
  for (const [k, n] of Object.entries(units || {})) {
    const adet = Math.max(0, Math.floor(n || 0));
    if (!adet) continue;
    const sinif = kusatmaSinifi(k);
    if (!sinif) continue;
    out[sinif] += adet * (UNIT_DEFS[k]?.stats?.saldiri || 0);
    out[sinif === 'koc' ? 'kocAdet' : 'mancinikAdet'] += adet;
  }
  return out;
}

/**
 * Puanı harcayarak bir yapının seviyesini düşür.
 * Üstten aşağı iner: önce mevcut seviyeyi indirmenin bedeli ödenir.
 * @returns {{ dusen:number, kalanPuan:number }}
 */
function seviyeDusur(basSeviye, puan, taban = 0) {
  let seviye = basSeviye;
  let kalan = puan;
  let dusen = 0;
  while (seviye > taban) {
    const bedel = SEVIYE_MALIYETI * seviye;
    if (kalan < bedel) break;
    kalan -= bedel;
    seviye -= 1;
    dusen += 1;
  }
  return { dusen, kalanPuan: kalan };
}

/** Köydeki bir yapıyı tipine göre bul (sur/hendek isimli slotlarda) */
function yapiBul(village, tip) {
  for (const [slotKey, b] of Object.entries(village.villageBuildings || {})) {
    if (b.type === tip && (b.level || 0) > 0) return { slotKey, b };
  }
  return null;
}

/**
 * TEK MANCINIK ATIŞI — bir hedefi bul ve puanı harca.
 *
 * @param vurulan bu seferde zaten vurulmuş slot anahtarları; rastgele
 *                seçim bunları atlar (iki atışın aynı binaya düşmemesi için)
 */
function mancinikVur(target, hedefTip, puan, sonuc, vurulan) {
  let hedef = hedefTip ? yapiBul(target, hedefTip) : null;
  if (!hedef) {
    const adaylar = Object.entries(target.villageBuildings || {})
      .filter(([slotKey, b]) => (b.level || 0) > 0
        && b.type !== 'sur' && b.type !== 'hendek'
        && !vurulan.has(slotKey));
    if (adaylar.length) {
      const [slotKey, b] = adaylar[Math.floor(Math.random() * adaylar.length)];
      hedef = { slotKey, b };
    }
  }
  if (!hedef) return false;

  const taban = hedef.b.type === 'anaBina' ? ANA_BINA_TABAN : 0;
  const { dusen } = seviyeDusur(hedef.b.level, puan, taban);
  vurulan.add(hedef.slotKey);
  if (dusen <= 0) return false;

  const onceki = hedef.b.level;
  hedef.b.level = Math.max(taban, hedef.b.level - dusen);
  if (hedef.b.level === 0) { hedef.b.building = false; hedef.b.buildEndTime = null; }
  /*
    Yıkılan binada çalışan işçiler havuza döner — yoksa işçiler artık var
    olmayan bir binada "çalışıyor" görünür ve nüfus muhasebesi sessizce
    bozulur.
  */
  if (hedef.b.level === 0 && hedef.b.workers > 0) {
    target.freeWorkers = (target.freeWorkers || 0) + hedef.b.workers;
    hedef.b.workers = 0;
  }
  /*
    Aynı bina iki kez vurulduysa (oyuncu aynı tipi iki kez seçti) tek
    satırda birleştir: rapor "Depo 12 → 10" demeli, iki ayrı satır değil.
  */
  const eski = sonuc.binalar.find(x => x.slotKey === hedef.slotKey);
  if (eski) eski.sonraki = hedef.b.level;
  else sonuc.binalar.push({
    tip: hedef.b.type, slotKey: hedef.slotKey,
    onceki, sonraki: hedef.b.level,
  });
  return true;
}

/**
 * KUŞATMAYI UYGULA.
 *
 * @param target     savunan köy (state DEĞİŞİR)
 * @param survivors  saldıranın SAĞ KALAN birlikleri
 * @param hedefTip   mancınığın hedef bina tipi; dizi verilirse ilk ikisi
 *                   %60/%40 paylaşır (atölye Lvl 10 kuralı çağıranda)
 * @returns {{ sur:number, hendek:number, binalar:Array<{tip,ad,onceki,sonraki}> }|null}
 *          Hiç kuşatma birimi yoksa null.
 */
function uygula(target, survivors, hedefTip = null) {
  const guc = kusatmaGucu(survivors);
  if (guc.koc <= 0 && guc.mancinik <= 0) return null;

  const sonuc = { sur: 0, hendek: 0, binalar: [] };

  /*
    KOÇ BAŞI — YALNIZ SUR.

    Eskiden artan puan hendeğe de geçiyordu; tek sefer iki savunma yapısını
    birden siliyordu ve hendeğe yatırım yapmanın anlamı kalmıyordu. Artık
    koç başı tek iş yapıyor: kapıyı kırmak. Sur sıfırlandıktan sonra artan
    puan BOŞA GİDER — "kaç koç başı göndereyim" gerçek bir hesap olsun.

    Hendeği indirmek isteyen mancınıkla hedefleyebilir (hedef listesinde
    yok; ileride açılırsa tek yer YIKILABILIR filtresi).
  */
  if (guc.koc > 0) {
    const y = yapiBul(target, 'sur');
    if (y) {
      const { dusen } = seviyeDusur(y.b.level, guc.koc, 0);
      if (dusen > 0) {
        y.b.level = Math.max(0, y.b.level - dusen);
        /*
          Seviyesi 0'a inen yapı İNŞAAT HÂLİNDE kalmasın: yarım kalmış
          yükseltme bayrağı açıkken seviye düşerse panel "inşa ediliyor"
          diye kilitli görünüyordu.
        */
        if (y.b.level === 0) { y.b.building = false; y.b.buildEndTime = null; }
        sonuc.sur = dusen;
      }
    }
  }

  /*
    MANCINIK — seçilen bina tipi. Yoksa RASTGELE bir bina vurulur:
    "hedefin yok" deyip seferi boşa çıkarmak hem oyuncuyu cezalandırır
    hem de dolaylı olarak köyün içini keşfetmeye yarardı.

    İki hedef verildiyse güç %60/%40 bölünür. İkinci atış birincinin
    slotunu rastgele seçim havuzundan DIŞLIYOR: "rastgele" iki kez aynı
    binaya düşerse oyuncu iki hedef seçmiş olmanın karşılığını alamazdı.
    (Aynı TİPİ iki kez seçmek serbest — o oyuncunun kendi tercihi.)
  */
  if (guc.mancinik > 0) {
    const liste = (Array.isArray(hedefTip) ? hedefTip : [hedefTip])
      .filter(t => typeof t === 'string' && t)
      .slice(0, IKI_HEDEF_PAY.length);
    const ikili = liste.length >= 2;
    const atislar = ikili
      ? [[liste[0], guc.mancinik * IKI_HEDEF_PAY[0]],
         [liste[1], guc.mancinik * IKI_HEDEF_PAY[1]]]
      : [[liste[0] || null, guc.mancinik]];

    const vurulan = new Set();
    for (const [tip, puan] of atislar) {
      if (puan <= 0) continue;
      mancinikVur(target, tip, puan, sonuc, vurulan);
    }
  }

  if (!sonuc.sur && !sonuc.hendek && !sonuc.binalar.length) return null;
  return sonuc;
}

/**
 * KÖY BOŞ MU — hiç binası kalmadı mı?
 *
 * Köyün yok olma koşulu bu: ana binanın 0'a inmesi TEK BAŞINA yetmiyor,
 * BÜTÜN binaların bitmesi gerekiyor. Tek bir mancınık dalgasının köyü
 * silmesi satılan bir oyun için fazla sertti; hiç yıkılamaması da
 * kuşatmayı anlamsız kılıyordu. Aradaki yer: "her binayı tek tek düşür".
 *
 * TARLALAR sayılmıyor — onlar köyün çevresindeki arazi, binası değil.
 * Yoksa tarlası olan bir köy hiç yok olamazdı.
 *
 * İNŞA HÂLİNDEKİ bina da "var" sayılıyor (`b.building`): seviyesi 0 ama
 * oyuncu kaynak yatırmış durumda; köyü altından çekmek o kaynağı da
 * silerdi.
 *
 * Kural BURADA, index.js'te değil: hem kuşatma hem oyuncunun kendi yıkımı
 * aynı cümleyi kullansın ve test edilebilsin diye.
 */
function koyBosMu(village) {
  return !Object.values(village?.villageBuildings || {})
    .some(b => (b.level || 0) > 0 || b.building);
}

module.exports = {
  uygula, kusatmaGucu, kusatmaSinifi, seviyeDusur, koyBosMu,
  SEVIYE_MALIYETI, ANA_BINA_TABAN,
  IKI_HEDEF_MIN_ATOLYE, IKI_HEDEF_PAY,
};
