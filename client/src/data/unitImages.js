/**
 * Birim görselleri — otomatik yükleyici.
 *
 * Dosya adı kuralı:  <sınıf>_<birimAnahtarı>_<bileşenler...>.<uzantı>
 *   piyade_fjordvakt_kilic.jpg          → fjordvakt
 *   atli_jernridder_kilic_kalkan_zirh.jpg → jernridder
 *
 * Sınıf öneki ve bileşenler yalnızca dosyayı insan için okunur kılar; anahtar
 * ikinci parçadır. Yeni görsel eklemek için klasöre doğru adla atmak yeterli,
 * burada kod değiştirmeye gerek yok.
 *
 * `units/yedek/` alt klasörü bilinçli olarak kapsam dışı (tek yıldız, ** değil).
 */
const mods = import.meta.glob('../assets/units/*.{jpg,jpeg,png,webp}', { eager: true });

const BY_KEY = {};
for (const [path, mod] of Object.entries(mods)) {
  const file = path.split('/').pop().replace(/\.[^.]+$/, '');
  const parts = file.split('_');
  const key = parts.length > 1 ? parts[1] : parts[0];
  if (key) BY_KEY[key] = mod?.default || mod;
}

/**
 * ASCII OLMAYAN ANAHTARLAR İÇİN TAKMA AD.
 *
 * `alevMancınıgı` anahtarı Türkçe harf içeriyor; dosya adına konursa
 * kodlama Windows↔Linux↔git arasında kırılgan oluyor. Dosya ASCII adla
 * duruyor, eşleşme burada kuruluyor.
 */
const TAKMA_AD = { 'alevMancınıgı': 'mancinik' };

export const unitImage = (type) => BY_KEY[type] || BY_KEY[TAKMA_AD[type]] || null;
export const unitImageCount = Object.keys(BY_KEY).length;
export default BY_KEY;
