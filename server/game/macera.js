/**
 * MACERA — kahramanın deneyim, eşya ve ganimet kaynağı.
 *
 * İlkan'ın tarifi: *"maceralara çıksın, ex kazansın, lvl atlasın...
 * gittiği maceralarda itemler, askerler, hammaddeler bulsun"*.
 *
 * TEMEL KARARLAR
 *
 * 1) MACERA BİRİKİYOR, SONSUZ DEĞİL. Kahraman Konağı seviyesi hem birikme
 *    hızını hem tavanı belirliyor. Sonsuz macera XP'yi anlamsız kılar;
 *    hiç birikmemesi ise günde bir kez giren oyuncuyu cezalandırırdı.
 *
 * 2) KISA ve UZUN macera. Kısa: az XP, az ödül, az can kaybı. Uzun:
 *    tersi. Tek tip olsaydı macera "gönder ve unut" düğmesine dönerdi;
 *    iki tip, kahramanın canına göre karar vermeyi gerektiriyor.
 *
 * 3) ÖDÜL KURA İLE, AMA XP GARANTİ. Boş dönen bir macera oyuncuya
 *    "zamanımı boşa harcadım" dedirtirdi; XP her hâlükârda geliyor,
 *    değişen şey yanında ne geldiği.
 *
 * 4) MACERADAKİ KAHRAMAN SAVUNMADA VE SEFERDE YOK, iyileşmiyor da.
 *    Maceranın bedeli bu: bedava olsaydı kahraman sürekli maceradayken
 *    savunma bonusu da vermeye devam ederdi.
 *
 * 5) SAF FONKSİYONLAR. Rastgelelik dışarıdan veriliyor (`rnd`), böylece
 *    kura da test edilebiliyor.
 */
const { HERO_ITEM_KEYS, HERO_ITEMS, NADIRLIK, NADIRLIK_SIRA,
  KULLANILABILIR } = require('../data/heroItemDefs');

// ── Birikme ────────────────────────────────────────────────────────

/**
 * Macera birikme hızı ve tavanı — konak seviyesine bağlı.
 *
 * Konak Lvl 1'de 3 macera tavanı ve ~6 oyun saatinde bir yeni macera;
 * Lvl 20'de 12 tavan ve ~2 saatte bir. Konağı yükseltmenin görünür
 * karşılığı bu (iyileşme hızının yanında ikinci sebep).
 */
const MACERA_TAVAN_TABAN = 3;
const MACERA_TAVAN_PER_SEVIYE = 0.5;
const MACERA_SAAT_TABAN = 6;
const MACERA_SAAT_AZALMA = 0.2;   // konak seviyesi başına

function maceraTavani(konakSeviyesi = 0) {
  if (konakSeviyesi <= 0) return 0;      // konak yoksa macera da yok
  return Math.floor(MACERA_TAVAN_TABAN + MACERA_TAVAN_PER_SEVIYE * (konakSeviyesi - 1));
}

/** Yeni bir macera için gereken oyun saati. */
function maceraSaati(konakSeviyesi = 0) {
  return Math.max(2, MACERA_SAAT_TABAN - MACERA_SAAT_AZALMA * Math.max(0, konakSeviyesi - 1));
}

/**
 * Zamanı ilerlet ve macera biriktir.
 *
 * Tavan doluyken sayaç İLERLEMİYOR (sıfırlanmıyor da): doluyken biriken
 * ilerleme saklansaydı oyuncu bir hafta girmeyip onlarca macerayı tek
 * seferde patlatırdı; sıfırlansaydı tavana bir adım kala giren oyuncu
 * ilerlemesini kaybederdi.
 */
function maceraBiriktir(k, oyunSaati, konakSeviyesi = 0) {
  if (!k || !k.var || !(oyunSaati > 0)) return k;
  const tavan = maceraTavani(konakSeviyesi);
  k.maceraSayisi = Math.min(tavan, k.maceraSayisi || 0);
  if (k.maceraSayisi >= tavan) { k.maceraIlerleme = 0; return k; }

  const gereken = maceraSaati(konakSeviyesi);
  let ilerleme = (k.maceraIlerleme || 0) + oyunSaati;
  while (ilerleme >= gereken && k.maceraSayisi < tavan) {
    ilerleme -= gereken;
    k.maceraSayisi++;
  }
  k.maceraIlerleme = k.maceraSayisi >= tavan ? 0 : ilerleme;
  return k;
}

// ── Macera tipleri ─────────────────────────────────────────────────

/**
 * Uzun macera kısanın ~3 katı XP veriyor ama ~4 katı can götürüyor:
 * oran bilerek aleyhte. Uzun macera "her zaman daha iyi" olsaydı seçim
 * diye bir şey kalmazdı; şimdi karar kahramanın canına bağlı.
 */
const MACERA_TIPLERI = {
  kisa: {
    ad: 'Kısa Macera', saat: 2,
    xp: 40, can: 8,
    odulSayisi: 1, esyaSansi: 0.05,
    aciklama: 'Yakın çevre. Az deneyim, az risk.',
  },
  uzun: {
    ad: 'Uzun Macera', saat: 6,
    xp: 130, can: 32,
    odulSayisi: 2, esyaSansi: 0.12,
    aciklama: 'Uzak diyarlar. Çok deneyim, ciddi yıpranma.',
  },
};

/**
 * MACERA SÜRESİ HIZA BAĞLI (İlkan'ın kararı: "macera da kısalsın hıza
 * göre").
 *
 * Macera bir YOLCULUK: kahraman bir yere gidiyor ve dönüyor. Atı olan
 * daha çabuk dönmeli — yoksa at slotu yalnız sefer süresini etkiler,
 * maceraya çıkan oyuncu için hiçbir şey değişmezdi.
 *
 * KURAL: süre hızla TERS ORANTILI (tabanHiz / hiz). Yaya kahramanda
 * çarpan tam 1 — tanımdaki saat değeri hiç bozulmuyor ve yeni kural
 * mevcut dengeyi tek yönde, yalnız at takıldığında değiştiriyor.
 *
 * ZEMİN VAR (MACERA_SURE_ZEMINI). Tersi orantı sınırsız olsaydı efsanevi
 * atlı kahraman maceraları neredeyse anında bitirir, macera sayacı
 * (konak) anlamsızlaşırdı: asıl sınır zaten "kaç maceram var", süre
 * ikinci sınır olarak durmalı.
 *
 * EŞYANIN maceraHizi BONUSU aynı çarpandan geçiyor — iki ayrı indirim
 * olsaydı ikisi birden zemini deler, kural okunaksızlaşırdı.
 *
 * Ölçüm: yaya 2s/6s · sıradan zırhlı at (12) 1,2s/3,5s · efsanevi Kuzey
 * Rüzgârı (19,5) zeminde 0,9s/2,7s.
 */
const MACERA_SURE_ZEMINI = 0.30;   // en çok %70 kısalır
const MACERA_HIZ_BONUS_TAVANI = 60; // eşyadan gelen macera hızı tavanı (%)

function sureCarpani(hiz, tabanHiz, maceraHiziYuzde = 0) {
  let c = (hiz > 0 && tabanHiz > 0) ? tabanHiz / hiz : 1;
  c *= 1 - Math.min(MACERA_HIZ_BONUS_TAVANI, Math.max(0, maceraHiziYuzde)) / 100;
  return Math.max(MACERA_SURE_ZEMINI, Math.min(1, c));
}

/** Bir maceranın GERÇEK süresi — oyun saati, hıza ve eşyaya göre kısalmış */
function maceraSuresi(tip, hiz, tabanHiz, maceraHiziYuzde = 0) {
  const def = MACERA_TIPLERI[tip];
  if (!def) return 0;
  return Math.round(def.saat * sureCarpani(hiz, tabanHiz, maceraHiziYuzde) * 100) / 100;
}

/**
 * SALDIRI GÜCÜ MACERADA KALKAN GİBİ DE ÇALIŞIYOR (İlkan'ın kararı).
 *
 * Mantığı: macerada kahramanı yıpratan şey yol boyunca karşılaştığı
 * tehlikeler. Daha güçlü vuran bir kahraman aynı tehlikeyi daha çabuk
 * bertaraf eder, dolayısıyla daha az yara alır. Bu yüzden azaltma AYRI
 * bir skile değil, saldırı gücünün KENDİSİNE bağlı: oyuncu saldırıya
 * yatırım yaparken dayanıklılık da alıyor.
 *
 * SAVAŞTA İŞLEMİYOR — orada yıpranmayı ordunun kayıp oranı belirliyor
 * (bkz. kahraman.js · savasSonucu). Saldırı gücü savaşta zaten kendi
 * kanalından işliyor; ikinci kez saymak onu iki katı değerli yapardı.
 *
 * TAVANI VAR: tavansız bir yatırım macerayı tamamen risksiz kılardı.
 * Kuşamdan gelen ZIRHLANMA ile ÇARPIM hâlinde birleşiyor (toplama
 * değil) — ikisi de tavanındayken bile hasar sıfırlanmıyor.
 */
const GUC_AZALTMA_BOLEN = 200;   // her 200 saldırı gücü → %1
const GUC_AZALTMA_TAVANI = 40;   // en çok %40

function gucAzaltmasi(saldiriGucu = 0) {
  return Math.min(GUC_AZALTMA_TAVANI, Math.max(0, saldiriGucu) / GUC_AZALTMA_BOLEN);
}

/** Bir maceranın GERÇEK can kaybı — saldırı gücü düşüldükten sonra */
function maceraCanKaybi(tip, saldiriGucu = 0) {
  const def = MACERA_TIPLERI[tip];
  if (!def) return 0;
  return Math.round(def.can * (1 - gucAzaltmasi(saldiriGucu) / 100));
}

/**
 * MACERAYA ÇIKABİLİR Mİ?
 *
 * Can eşiği var: canı bu oranın altındaki kahraman maceraya gönderilemez.
 * Sınır olmasaydı oyuncu kahramanı her seferinde ölene kadar sürer ve
 * ÖLÜM bir risk değil rutin olurdu.
 */
const MACERA_CAN_ESIGI = 0.3;

function maceraUygunMu(k, tip, canTavan) {
  if (!k || !k.var) return { ok: false, sebep: 'kahraman_yok' };
  if (!MACERA_TIPLERI[tip]) return { ok: false, sebep: 'gecersiz_tip' };
  // Ölü kahraman maceraya çıkamaz — önce diriltilmeli
  if (k.olu) return { ok: false, sebep: 'olu' };
  if ((k.nerede || 'koy') !== 'koy') return { ok: false, sebep: 'mesgul' };
  if ((k.maceraSayisi || 0) < 1) return { ok: false, sebep: 'macera_yok' };
  if (!k.usSlot) return { ok: false, sebep: 'konak_yok' };
  if ((k.can || 0) < canTavan * MACERA_CAN_ESIGI) {
    return { ok: false, sebep: 'can_dusuk' };
  }
  return { ok: true };
}

// ── Ödül kurası ────────────────────────────────────────────────────

/**
 * Ödül havuzu ağırlıkları. Hammadde en sık, asker ortada, eşya en seyrek
 * — eşya maceranın hikâyesi, hammadde ise her seferki teselli.
 *
 * ÖLÇÜLDÜ (4.000 uzun macera ödülü): hammadde ~%60, asker ~%28, eşya ~%12.
 * Yani uzun maceraların dörtte birinde bir eşya düşüyor. Daha sık olsaydı
 * oyuncu bir haftada bütün slotları doldurur ve eşya toplamak biterdi;
 * daha seyrek olsaydı macera "hammadde düğmesi"ne dönerdi.
 */
const ODUL_AGIRLIK = { hammadde: 55, asker: 30, esya: 15 };

/** Düşen eşyanın diriltme iksiri olma olasılığı */
const IKSIR_SANSI = 0.18;
/** Kura yalnız KUŞANILABİLİR eşyalardan çekiyor; iksir ayrı zar */
const KUSANILABILIR = HERO_ITEM_KEYS.filter(k => HERO_ITEMS[k].slot);

const HAMMADDELER = ['odun', 'kil', 'tas', 'demir'];
/** Macerada bulunabilen birimler — pahalı/özel olanlar havuzda YOK */
const MACERA_BIRIMLERI = ['fjordvakt', 'spydvakt', 'demirAtli'];

/** [0,1) üreten varsayılan rastgelelik; testte deterministik biri verilir */
const varsayilanRnd = () => Math.random();

function agirlikliSec(agirliklar, rnd) {
  const toplam = Object.values(agirliklar).reduce((a, b) => a + b, 0);
  let n = rnd() * toplam;
  for (const [key, w] of Object.entries(agirliklar)) {
    n -= w;
    if (n < 0) return key;
  }
  return Object.keys(agirliklar)[0];
}

/** Nadirlik kurası — düşme ağırlıklarına göre */
function nadirlikSec(rnd) {
  const ag = {};
  for (const key of NADIRLIK_SIRA) ag[key] = NADIRLIK[key].dusmeAgirligi;
  return agirlikliSec(ag, rnd);
}

/**
 * Bir maceranın sonucunu üret.
 *
 * XP GARANTİ, ödüller kura. `esyaSansi` ayrı bir zar: eşya havuzdan
 * çıkarsa bile nadirliği ikinci bir kura belirliyor, böylece "efsane
 * düşmesi" iki katmanlı ve nadir kalıyor.
 *
 * @param {string} tip 'kisa' | 'uzun'
 * @param {() => number} rnd [0,1) üreten fonksiyon
 */
/**
 * @param {number} saldiriGucu Kahramanın toplam saldırı gücü — can kaybını
 *   azaltıyor (bkz. gucAzaltmasi). Verilmezse tam hasar uygulanıyor.
 */
function maceraSonucu(tip, rnd = varsayilanRnd, saldiriGucu = 0) {
  const def = MACERA_TIPLERI[tip];
  if (!def) return null;

  const oduller = [];
  for (let i = 0; i < def.odulSayisi; i++) {
    // Eşya için ayrı zar: havuz ağırlığı eşyayı seyrek tutuyor, bu zar
    // da macera tipine göre ikinci bir süzgeç.
    const tur = rnd() < def.esyaSansi ? 'esya' : agirlikliSec(
      { hammadde: ODUL_AGIRLIK.hammadde, asker: ODUL_AGIRLIK.asker }, rnd);

    if (tur === 'esya') {
      /*
        İKSİR HAVUZDA, AMA SEYREK. Kuşanılabilir eşyalarla aynı ağırlıkta
        olsaydı ölümün bedeli neredeyse ortadan kalkardı; hiç düşmeseydi
        de İlkan'ın istediği "maceradan bulduğu diriltici iksir" yolu
        kapalı kalırdı.
      */
      const key = rnd() < IKSIR_SANSI
        ? 'diriltmeIksiri'
        : KUSANILABILIR[Math.floor(rnd() * KUSANILABILIR.length)];
      oduller.push({
        tur: 'esya', key, nadirlik: nadirlikSec(rnd),
        kullanilir: KULLANILABILIR.has(key),
      });
    } else if (tur === 'asker') {
      const birim = MACERA_BIRIMLERI[Math.floor(rnd() * MACERA_BIRIMLERI.length)];
      // Uzun macera daha çok asker getiriyor; sayı XP ile aynı ölçekte
      const adet = 1 + Math.floor(rnd() * (tip === 'uzun' ? 6 : 3));
      oduller.push({ tur: 'asker', birim, adet });
    } else {
      const res = HAMMADDELER[Math.floor(rnd() * HAMMADDELER.length)];
      const adet = Math.round((tip === 'uzun' ? 600 : 200) * (0.6 + rnd() * 0.8));
      oduller.push({ tur: 'hammadde', res, adet });
    }
  }

  return {
    tip, xp: def.xp,
    can: maceraCanKaybi(tip, saldiriGucu),
    hamCan: def.can,
    oduller,
  };
}

/** Eşyanın oyuncuya görünen adı — nadirlik öneki ile */
function esyaAdi(key, nadirlik) {
  const def = HERO_ITEMS[key];
  if (!def) return key;
  const n = NADIRLIK[nadirlik];
  return n && nadirlik !== 'siradan' ? `${n.ad} ${def.ad}` : def.ad;
}

module.exports = {
  MACERA_TIPLERI, MACERA_CAN_ESIGI, ODUL_AGIRLIK,
  HAMMADDELER, MACERA_BIRIMLERI,
  MACERA_TAVAN_TABAN, MACERA_TAVAN_PER_SEVIYE, MACERA_SAAT_TABAN, IKSIR_SANSI,
  maceraTavani, maceraSaati, maceraBiriktir,
  maceraUygunMu, maceraSonucu, nadirlikSec, esyaAdi,
  MACERA_SURE_ZEMINI, MACERA_HIZ_BONUS_TAVANI, sureCarpani, maceraSuresi,
  GUC_AZALTMA_BOLEN, GUC_AZALTMA_TAVANI, gucAzaltmasi, maceraCanKaybi,
};
