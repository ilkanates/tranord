/**
 * HESAP KAYDI — köyün içinde duran ama KÖYE AİT OLMAYAN veriler.
 *
 * Görev zinciri (`quests`) ve kahraman (`kahraman`) oyuncunun kendisine
 * ait; merkez köyün state'inde durmalarının tek sebebi ayrı bir tablo
 * açmamak. Dolayısıyla merkez her değiştiğinde birlikte taşınmaları
 * gerekiyor — yoksa oyuncu görev zincirini sıfırlanmış, kahramanını yok
 * olmuş görür.
 *
 * Merkezin değiştiği İKİ yol var ve ikisi de buradan geçmeli:
 *   1) oyuncunun merkezi taşıması (index.js · set_capital)
 *   2) merkez köyün YIKILMASI (index.js · koyuYokEt)
 *
 * İkincisi bir kez atlanmıştı: köyü yıkılan oyuncu kahramanını da
 * kaybediyordu. Bu dosya o hatanın tekrarlanmaması için var — tek yer,
 * tek liste, test edilebilir.
 */

/**
 * Merkez köyde tutulan ama HESABA ait olan alanlar.
 * Yeni bir hesap-düzeyi kayıt eklenirse BURAYA da eklenmeli.
 */
const HESAP_ALANLARI = ['quests', 'kahraman', 'kese'];

/**
 * Kaydı eski merkezden yenisine taşı.
 *
 * Hedefte ZATEN bir kayıt varsa DOKUNULMUYOR: iki kayıt birleştirilemez
 * ve dolu olanı ezmek, taşımanın önlemeye çalıştığı kaybın ta kendisi
 * olurdu. Böyle bir durum normalde oluşmaz (kayıt tek yerde durur), ama
 * eski kayıtlarda artık bir kopya kalmış olabilir.
 *
 * @returns {string[]} gerçekten taşınan alanlar
 */
function hesapKaydiniTasi(eskiKoy, yeniKoy) {
  if (!eskiKoy || !yeniKoy || eskiKoy === yeniKoy) return [];
  const tasinan = [];
  for (const alan of HESAP_ALANLARI) {
    if (eskiKoy[alan] && !yeniKoy[alan]) {
      yeniKoy[alan] = eskiKoy[alan];
      delete eskiKoy[alan];
      tasinan.push(alan);
    }
  }
  return tasinan;
}

module.exports = { hesapKaydiniTasi, HESAP_ALANLARI };
