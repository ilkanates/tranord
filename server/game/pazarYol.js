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

/** Yeni gönderi nesnesi */
function gonderi({ hedefSlot, hedefAd, kaynak, miktar, tuccar, saat: sure, mesafe }) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    hedefSlot, hedefAd, kaynak, miktar, tuccar,
    mesafe: mesafe || 0,
    faz: 'gidis',
    legSaat: sure,
    kalanSaat: sure,
  };
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
      teslimEt(g.hedefSlot, g.kaynak, g.miktar);
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
    kaynak: g.kaynak, miktar: g.miktar, tuccar: g.tuccar,
    faz: g.faz,
    kalanSn: GT.clockToRealSeconds(GT.hoursToClock(Math.max(0, g.kalanSaat || 0)), speed),
  }));
}

module.exports = { TUCCAR_HIZ, EN_AZ_DAKIKA, saat, gonderi, ilerlet, ozet };
