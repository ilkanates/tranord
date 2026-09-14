/**
 * OLAY SESLERİ — kısa efektler.
 *
 * Müzikten (audio.js) AYRI: müzik tek bir uzun akış, efektler onlarca
 * kısa ve üst üste binebilen ses. Tek bir çalarda toplasaydık bir uyarı
 * sesi müziği kesecek ya da ikinci bir olay birincisini susturacaktı.
 *
 * DOSYALAR HENÜZ YOK — ve bu bilerek sorun değil.
 *
 * İlkan: *"yakında alet ya da asker basarken yada savaşa asker
 * yollarken ses ekleyeceğim"*. Ayar ekranı, kayıt biçimi ve çalma yolu
 * dosyalardan ÖNCE oturuyor; `client/public/ses/<olay>.mp3` konduğu an o
 * olay kendiliğinden sesli hâle geliyor, başka hiçbir değişiklik
 * gerekmiyor.
 *
 * EKSİK DOSYA SESSİZ GEÇİLİR. `error` gelen olay `yokOlaylar`a yazılıyor
 * ve bir daha hiç denenmiyor: yoksa her inşaat bitişinde konsola bir 404
 * düşer ve gerçek hatalar o gürültünün içinde kaybolurdu.
 */

import { olaySesi } from './ayarlar';

const KLASOR = '/ses/';
const UZANTI = '.mp3';

/** Dosyası olmadığı ÖLÇÜLEN olaylar — bir daha denenmez */
const yokOlaylar = new Set();

/**
 * Aynı olayın çalarları. Havuz, art arda gelen iki olayın birbirini
 * kesmesini önlüyor (üç bina aynı tikte bitebiliyor).
 */
const havuz = new Map();

const HAVUZ_BOY = 3;

function calarAl(olay) {
  if (typeof Audio === 'undefined') return null;
  let liste = havuz.get(olay);
  if (!liste) {
    liste = [];
    for (let i = 0; i < HAVUZ_BOY; i++) {
      const a = new Audio();
      a.preload = 'none';
      a.src = KLASOR + olay + UZANTI;
      a.addEventListener('error', () => yokOlaylar.add(olay));
      liste.push(a);
    }
    havuz.set(olay, liste);
  }
  // Boşta olan ilk çalar; hepsi meşgulse en baştakini baştan başlat
  return liste.find(a => a.paused || a.ended) || liste[0];
}

/**
 * Bir olay sesi çal. Ayarlarda kapalıysa ya da dosya yoksa sessizce döner.
 *
 * @param {string} olay  ayarlar.js · SES_OLAYLARI anahtarı
 * @param {{zorla?: boolean}} [secenek] `zorla`: ayar ekranındaki "dinle"
 *        düğmesi için — olay kapalı olsa bile çalar, çünkü oyuncu o an
 *        sesi DENİYOR.
 */
export function sesCal(olay, { zorla = false } = {}) {
  if (yokOlaylar.has(olay)) return;
  const seviye = zorla ? 0.7 : olaySesi(olay);
  if (!(seviye > 0)) return;
  const a = calarAl(olay);
  if (!a) return;
  try {
    a.volume = seviye;
    a.currentTime = 0;
    const p = a.play();
    /*
      Tarayıcı otomatik oynatmayı reddedebilir (kullanıcı henüz sayfayla
      etkileşmediyse). Müzikte ilk tıklamayı bekleyen bir kilit var; efekt
      için gerekmiyor — efektler zaten bir oyuncu eylemine ya da oyun
      olayına bağlı ve o ana kadar sayfa çoktan tıklanmış oluyor.
    */
    if (p && typeof p.catch === 'function') p.catch(() => { /* yoksay */ });
  } catch { /* yoksay */ }
}

/** Ayar ekranındaki "dinle" düğmesi — dosya yoksa false döner */
export function sesVarMi(olay) {
  return !yokOlaylar.has(olay);
}
