/**
 * AD DOĞRULAMA — oyuncu adı ve köy adı için TEK kural.
 *
 * Türkçe harfler, rakam, boşluk, tire, kesme ve alt çizgi serbest.
 * HTML/kontrol karakterleri ve baştaki/sondaki boşluklar temizlenir;
 * ad haritada, raporlarda ve sıralamada görüneceği için biçim serbest
 * bırakılamaz. Sunucu son sözü söyler — istemcinin denetimine güvenilmez.
 *
 * Ayrı dosyada çünkü İKİ giriş noktası kullanıyor: kayıt (auth.js, oyuncu
 * adı artık kayıt anında alınıyor) ve oyun soketi (index.js, köy adı).
 * index.js'te kalsaydı auth.js oyun motorunu require etmek zorunda kalırdı.
 */
const AD_DESEN = /^[0-9A-Za-zÇĞİIÖŞÜçğıiöşü][0-9A-Za-zÇĞİIÖŞÜçğıiöşü _''\-.]*$/;

const AD_EN_AZ = 3;
const AD_EN_COK = 18;

function adDogrula(ham, { enAz = AD_EN_AZ, enCok = AD_EN_COK } = {}) {
  const ad = String(ham ?? '').replace(/\s+/g, ' ').trim();
  if (ad.length < enAz) return { hata: `En az ${enAz} karakter olmalı` };
  if (ad.length > enCok) return { hata: `En fazla ${enCok} karakter olabilir` };
  if (!AD_DESEN.test(ad)) return { hata: 'Yalnız harf, rakam, boşluk ve - _ . kullanılabilir' };
  return { ad };
}

module.exports = { adDogrula, AD_DESEN, AD_EN_AZ, AD_EN_COK };
