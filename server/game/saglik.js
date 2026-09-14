/**
 * SAĞLIK ÇADIRI — savunanın kayıplarının bir kısmı iyileşir.
 *
 * Bina aylardır tanımlıydı ama HİÇBİR ŞEY YAPMIYORDU: oyuncu kuruyor,
 * kaynak harcıyor, karşılığında hiçbir şey almıyordu. Satılan bir oyunda
 * duran ama işlemeyen bir bina, eksik bir özellikten daha kötü.
 *
 * TEMEL KARARLAR
 *
 * 1) YALNIZ SAVUNANA işliyor. Çadır köyde; saldırıda ölen asker günlerce
 *    uzakta, kimse onu sedyeyle geri getirmiyor. Saldırana da işleseydi
 *    saldırmanın bedeli düşer ve savunma avantajı ters dönerdi.
 *
 * 2) SONUCU DEĞİŞTİRMİYOR. Savaş bitmiş, kazanan belli; çadır yalnız
 *    yaralıları topluyor. Sonucu değiştirseydi savaş hesabı iki aşamalı
 *    olur ve oyuncu saldırmadan önce ne olacağını kestiremezdi.
 *
 * 3) KENDİ DOSYASINDA. Kural önce `koyKurallari.js`e yazılmıştı ama o
 *    dosya `army.js`i require ediyor; army'nin de onu require etmesi
 *    DÖNGÜ oluşturdu ve yükleme sırasına göre `KOY` boş kalıp savaşı
 *    çökertti (ölçüldü: "KOY.saglikIyilesmeOrani is not a function").
 *    Bu dosya hiçbir şeyi require etmiyor — döngü kurulamaz.
 */

/**
 * ORAN seviyeyle doğrusal, tavan %40.
 *
 * TODO'daki ilk öneri (seviye × 0,05, tavan %50) Lvl 10'da tavana
 * dayanıyordu; o hâlde 11–20 arası seviyelerin hiçbir karşılığı olmazdı.
 * Seviye başına %2 bütün aralığı kullanıyor ve Lvl 20'de %40'a varıyor.
 */
const SAGLIK_PER_SEVIYE = 0.02;
const SAGLIK_TAVAN = 0.40;

function saglikIyilesmeOrani(seviye) {
  if (!(seviye >= 1)) return 0;
  return Math.min(SAGLIK_TAVAN, seviye * SAGLIK_PER_SEVIYE);
}

/**
 * Kayıpların iyileşen kısmını AYIR.
 *
 * Yuvarlama AŞAĞI: yarım asker diye bir şey yok ve yukarı yuvarlamak
 * 1 kayıplı bir savaşta çadırın o tek askeri de kurtarmasına yol açardı
 * — Lvl 1 çadır %2 iyileştirirken bu, oranın yirmi katı olurdu.
 *
 * @returns {{kalanKayip: object, iyilesen: object, iyilesenToplam: number}}
 */
function saglikIyilestir(kayiplar, oran) {
  const kalanKayip = {}; const iyilesen = {};
  let iyilesenToplam = 0;
  if (!(oran > 0)) return { kalanKayip: { ...(kayiplar || {}) }, iyilesen, iyilesenToplam };

  for (const [k, n] of Object.entries(kayiplar || {})) {
    const olu = Math.max(0, Math.floor(n) || 0);
    if (olu <= 0) continue;
    const kurtulan = Math.floor(olu * oran);
    if (kurtulan > 0) { iyilesen[k] = kurtulan; iyilesenToplam += kurtulan; }
    if (olu - kurtulan > 0) kalanKayip[k] = olu - kurtulan;
  }
  return { kalanKayip, iyilesen, iyilesenToplam };
}

module.exports = {
  SAGLIK_PER_SEVIYE, SAGLIK_TAVAN, saglikIyilesmeOrani, saglikIyilestir,
};
