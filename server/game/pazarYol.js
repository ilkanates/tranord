/**
 * PAZAR GÖNDERİLERİ — kabul edilen teklifin malı yolda.
 *
 * Teklif kabul edilince İKİ gönderi birden yola çıkar: kabul edenin malı
 * teklif sahibine, teklif sahibinin malı kabul edene. İkisi de aynı süreyi
 * alıyor (aynı mesafe), yani kimse ödemeden mal almış olmuyor.
 *
 * TÜCCAR GİDİP GERİ DÖNER. Gönderi iki fazlı: 'gidis' varışında mal
 * karşıya iniyor, sonra 'donus' başlıyor ve o bitince tüccarlar serbest
 * kalıyor. Tek fazlı olsaydı tüccar hedefte kalırdı; gidiş biter bitmez
 * serbest bırakmak da mesafeyi bedava yapardı — uzak köyle ticaret
 * yakınla aynı maliyete gelirdi.
 *
 * SÜRE ordunun değil TÜCCARIN hızıyla: kervan sabit hızda yürür, ne
 * taşıdığı fark etmez.
 */
const GT = require('./gameTime');

/** Tüccar hızı — saatte kaç hex. Süvariden yavaş, piyadeden hızlı. */
const TUCCAR_HIZ = 10;

/** En kısa yol süresi: komşu köye bile bir şeyler sürsün */
const EN_AZ_DAKIKA = 5;

/** Mesafeye göre tek yön süresi (oyun saati) */
function saat(mesafe) {
  return Math.max(EN_AZ_DAKIKA / 60, (Number(mesafe) || 0) / TUCCAR_HIZ);
}

/**
 * Yeni gönderi nesnesi.
 *
 * İKİ YÜK BİÇİMİ VAR ve ikisi de desteklenmek zorunda:
 *
 *   `kaynak` + `miktar`  → TAKASIN yükü. Teklif tek bir kaynağı tek bir
 *                          kaynakla değişiyor; orada tek alan doğru biçim.
 *   `yuk` (sözlük)        → HEDİYE gönderisinin yükü. Oyuncu bir seferde
 *                          beş kaynağı birden yollayabiliyor ve hepsi TEK
 *                          kervanla gidiyor.
 *
 * Beşi için beş ayrı gönderi açsaydık her biri kendi tüccarını bağlardı:
 * 100'er birimlik beş kaynak, 500 birimlik tek bir sevkiyatın beş katı
 * tüccar tutardı. Kervan bir tane, yükü karışık.
 *
 * Tek kaynak verildiğinde `yuk` da doldurularak yazılıyor; okuma yolu
 * böylece tek biçim görüyor, eski kayıtlar için de `kaynak` alanı
 * yerinde duruyor.
 */
function gonderi({ hedefSlot, hedefAd, kaynak, miktar, yuk, tuccar, saat: sure, mesafe }) {
  const gercekYuk = yuk && Object.keys(yuk).length
    ? Object.fromEntries(Object.entries(yuk)
      .map(([k, n]) => [k, Math.max(0, Math.floor(n) || 0)])
      .filter(([, n]) => n > 0))
    : (kaynak ? { [kaynak]: Math.max(0, Math.floor(miktar) || 0) } : {});

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    hedefSlot, hedefAd, kaynak, miktar, yuk: gercekYuk, tuccar,
    mesafe: mesafe || 0,
    faz: 'gidis',
    legSaat: sure,
    kalanSaat: sure,
  };
}

/**
 * Bir gönderinin yükü — eski kayıtlarda `yuk` yok, orada tek alandan
 * türetiliyor. Tek okuma noktası olmasa her çağıran bu ayrımı tekrar
 * yazmak zorunda kalırdı.
 */
function yukOf(g) {
  if (g?.yuk && Object.keys(g.yuk).length) return g.yuk;
  return g?.kaynak ? { [g.kaynak]: Math.max(0, Math.floor(g.miktar) || 0) } : {};
}

/**
 * Bir köyün gönderilerini ilerlet.
 *
 * @param {object} village          gönderinin SAHİBİ köy (tüccarlar burada)
 * @param {number} hours            bu adımda geçen oyun saati
 * @param {function} teslimEt       (hedefSlot, kaynak, miktar) => void
 * @returns {boolean}               bir şey değiştiyse true
 */
function ilerlet(village, hours, teslimEt) {
  const liste = village.gonderiler;
  if (!liste?.length || !(hours > 0)) return false;
  let degisti = false;

  for (let i = liste.length - 1; i >= 0; i--) {
    const g = liste[i];
    g.kalanSaat = Math.max(0, (g.kalanSaat ?? 0) - hours);
    degisti = true;
    if (g.kalanSaat > 0) continue;

    if (g.faz === 'gidis') {
      // Mal karşıya iniyor; tüccarlar boş dönüyor
      for (const [kaynak, miktar] of Object.entries(yukOf(g))) {
        if (miktar > 0) teslimEt(g.hedefSlot, kaynak, miktar);
      }
      g.faz = 'donus';
      g.kalanSaat = g.legSaat;
    } else {
      liste.splice(i, 1);          // tüccarlar serbest
    }
  }
  return degisti;
}

/** İstemciye giden gönderi listesi — kalan süre GERÇEK saniye */
function ozet(village, speed = 1) {
  return (village.gonderiler || []).map((g) => ({
    id: g.id, hedefAd: g.hedefAd, hedefSlot: g.hedefSlot,
    // Eski alanlar duruyor: istemcinin tek kaynaklı görünümü bozulmasın
    kaynak: g.kaynak, miktar: g.miktar,
    yuk: yukOf(g), tuccar: g.tuccar,
    faz: g.faz,
    kalanSn: GT.clockToRealSeconds(GT.hoursToClock(Math.max(0, g.kalanSaat || 0)), speed),
  }));
}

module.exports = { TUCCAR_HIZ, EN_AZ_DAKIKA, saat, gonderi, yukOf, ilerlet, ozet };
