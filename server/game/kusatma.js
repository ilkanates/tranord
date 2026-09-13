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
 * 4) KÖY YIKILMIYOR. Ana bina Lvl 1'in altına inmiyor. Travian'da ana
 *    bina 0'a inince köy yok olur; bu oyunda oyuncunun her şeyini tek
 *    saldırıda kaybetmesi satılan bir oyun için fazla sert bulundu.
 *    DEĞİŞTİRİLEBİLİR — tek yer: `ANA_BINA_TABAN`.
 */
const { UNIT_DEFS } = require('../data');

/** Bir seviyeyi indirmenin puan maliyeti = bu sabit × mevcut seviye */
const SEVIYE_MALIYETI = 30;

/** Ana bina bu seviyenin altına inmez (0 yapılırsa köy yıkımı açılır) */
const ANA_BINA_TABAN = 1;

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
 * KUŞATMAYI UYGULA.
 *
 * @param target     savunan köy (state DEĞİŞİR)
 * @param survivors  saldıranın SAĞ KALAN birlikleri
 * @param hedefTip   mancınığın hedef bina tipi (yoksa/bulunamazsa rastgele)
 * @returns {{ sur:number, hendek:number, binalar:Array<{tip,ad,onceki,sonraki}> }|null}
 *          Hiç kuşatma birimi yoksa null.
 */
function uygula(target, survivors, hedefTip = null) {
  const guc = kusatmaGucu(survivors);
  if (guc.koc <= 0 && guc.mancinik <= 0) return null;

  const sonuc = { sur: 0, hendek: 0, binalar: [] };

  /*
    KOÇ BAŞI — önce sur, artan puanla hendek. Sıra önemli: sur savunma
    bonusunun büyük kısmını veriyor, oyuncunun beklentisi de "kapıyı kır".
  */
  if (guc.koc > 0) {
    let puan = guc.koc;
    for (const tip of ['sur', 'hendek']) {
      const y = yapiBul(target, tip);
      if (!y) continue;
      const { dusen, kalanPuan } = seviyeDusur(y.b.level, puan, 0);
      if (dusen > 0) {
        y.b.level = Math.max(0, y.b.level - dusen);
        /*
          Seviyesi 0'a inen yapı İNŞAAT HÂLİNDE kalmasın: yarım kalmış
          yükseltme bayrağı açıkken seviye düşerse panel "inşa ediliyor"
          diye kilitli görünüyordu.
        */
        if (y.b.level === 0) { y.b.building = false; y.b.buildEndTime = null; }
        sonuc[tip] = dusen;
      }
      puan = kalanPuan;
      if (puan <= 0) break;
    }
  }

  /*
    MANCINIK — seçilen bina tipi. Yoksa RASTGELE bir bina vurulur:
    "hedefin yok" deyip seferi boşa çıkarmak hem oyuncuyu cezalandırır
    hem de dolaylı olarak köyün içini keşfetmeye yarardı.
  */
  if (guc.mancinik > 0) {
    let hedef = hedefTip ? yapiBul(target, hedefTip) : null;
    if (!hedef) {
      const adaylar = Object.entries(target.villageBuildings || {})
        .filter(([, b]) => (b.level || 0) > 0 && b.type !== 'sur' && b.type !== 'hendek');
      if (adaylar.length) {
        const [slotKey, b] = adaylar[Math.floor(Math.random() * adaylar.length)];
        hedef = { slotKey, b };
      }
    }
    if (hedef) {
      const taban = hedef.b.type === 'anaBina' ? ANA_BINA_TABAN : 0;
      const { dusen } = seviyeDusur(hedef.b.level, guc.mancinik, taban);
      if (dusen > 0) {
        const onceki = hedef.b.level;
        hedef.b.level = Math.max(taban, hedef.b.level - dusen);
        if (hedef.b.level === 0) { hedef.b.building = false; hedef.b.buildEndTime = null; }
        /*
          Yıkılan binada çalışan işçiler havuza döner — yoksa işçiler
          artık var olmayan bir binada "çalışıyor" görünür ve nüfus
          muhasebesi sessizce bozulur.
        */
        if (hedef.b.level === 0 && hedef.b.workers > 0) {
          target.freeWorkers = (target.freeWorkers || 0) + hedef.b.workers;
          hedef.b.workers = 0;
        }
        sonuc.binalar.push({
          tip: hedef.b.type, slotKey: hedef.slotKey,
          onceki, sonraki: hedef.b.level,
        });
      }
    }
  }

  if (!sonuc.sur && !sonuc.hendek && !sonuc.binalar.length) return null;
  return sonuc;
}

module.exports = {
  uygula, kusatmaGucu, kusatmaSinifi, seviyeDusur,
  SEVIYE_MALIYETI, ANA_BINA_TABAN,
};
