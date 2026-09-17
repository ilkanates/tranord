/**
 * Birim ve ekipman amblemleri — otomatik yükleyici.
 *
 * `assets/amblems/<anahtar>.png` dosya adı doğrudan anahtardır:
 *   fjordvakt.png → fjordvakt      kilic.png → kilic
 *
 * Görseller BEYAZ SİLUET + ALFA olarak hazırlandı (128×128). Renk dosyada
 * DEĞİL, çizim anında CSS maskesiyle veriliyor (bkz. Amblem bileşeni) —
 * böylece tek dosya hem menüde hem raporda farklı renkte kullanılabiliyor.
 *
 * `amblems/yedek/` (orijinal 1254px kaynaklar) bilinçli olarak kapsam dışı:
 * tek yıldız kullanılıyor, ** değil.
 */
const mods = import.meta.glob('../assets/amblems/*.png', { eager: true });

const BY_KEY = {};
for (const [path, mod] of Object.entries(mods)) {
  const file = path.split('/').pop().replace(/\.[^.]+$/, '');
  if (file.startsWith('_')) continue;          // _kontak, _kucuk_test gibi yardımcı dosyalar
  BY_KEY[file] = mod?.default || mod;
}

/**
 * ASCII OLMAYAN ANAHTARLAR — unitImages.js ile aynı gerekçe: `alevMancınıgı`
 * Türkçe harf içeriyor, dosya adı ASCII kalsın diye eşleşme burada kuruluyor.
 */
const TAKMA_AD = { 'alevMancınıgı': 'alevMancinigi' };

export const unitEmblem = (key) => BY_KEY[key] || BY_KEY[TAKMA_AD[key]] || null;
export const emblemCount = Object.keys(BY_KEY).length;
export default BY_KEY;
