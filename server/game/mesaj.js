/**
 * MESAJLAŞMA KURALLARI — doğrulama, sınırlar ve kötüye kullanım kapıları.
 *
 * Veritabanı erişimi burada YOK (db.js / db.dev.js'te); burası yalnız
 * "bu mesaj gönderilebilir mi" sorusunun cevabı. Ayrı durmasının sebebi
 * test edilebilirliği: kurallar sunucu açmadan sınanabiliyor.
 *
 * SATILAN BİR OYUNDA SERBEST METİN BİR TACİZ KAPISIDIR. Üç kapı birden
 * konuldu, çünkü tek başına hiçbiri yetmiyor:
 *
 *   1) UZUNLUK — konu ve gövde sınırlı. Sınırsız metin hem depoyu hem
 *      ekranı taşırır, hem de tek mesajla spam yapmaya yarar.
 *   2) HIZ SINIRI — dakikada ve saatte gönderim tavanı. Engelleme
 *      tek başına yetmez: engellenen kişi yeni hesapla döner, hız
 *      sınırı ise hesap açmayı da yavaşlatır.
 *   3) ENGELLEME — ALICI tarafın kararı. Engellenen kişi mesaj
 *      gönderemiyor ama bunu ÖĞRENEMİYOR: "engellendin" demek,
 *      taciz edene hangi hesabın çalıştığını söylemek olurdu.
 *      Gönderim başarılı görünüyor, mesaj kutuya düşmüyor.
 */

/** Konu ve gövde sınırları — ekranda da bu sayılar gösteriliyor */
const KONU_EN_COK = 60;
const GOVDE_EN_COK = 2000;

/**
 * HIZ SINIRI — kayan pencere, oyuncu başına.
 *
 * Dakikalık tavan ani spam'i, saatlik tavan sabırlı spam'i kesiyor.
 * Sunucu tek süreç olduğu için bellekte tutmak yeterli; dağıtık
 * kurulumda yerini Redis alır (girişteki deneme sınırıyla aynı desen).
 */
const DAKIKA_TAVANI = 5;
const SAAT_TAVANI = 40;

const gecmis = new Map();   // userId -> zaman damgaları

function temizle(userId, now) {
  const liste = (gecmis.get(userId) || []).filter(t => now - t < 3600_000);
  gecmis.set(userId, liste);
  if (gecmis.size > 5000) gecmis.clear();   // bellek koruması
  return liste;
}

/** Bu oyuncu şu an mesaj gönderebilir mi? */
function hizSiniri(userId, now = Date.now()) {
  const liste = temizle(userId, now);
  const sonDakika = liste.filter(t => now - t < 60_000).length;
  if (sonDakika >= DAKIKA_TAVANI) {
    return { ok: false, reason: 'cok_hizli', bekle: 60 };
  }
  if (liste.length >= SAAT_TAVANI) {
    return { ok: false, reason: 'saatlik_sinir', bekle: 3600 };
  }
  return { ok: true };
}

function gonderimiKaydet(userId, now = Date.now()) {
  const liste = temizle(userId, now);
  liste.push(now);
  gecmis.set(userId, liste);
}

/**
 * METİN TEMİZLE.
 *
 * Kontrol karakterleri atılıyor (satır sonu hariç): ekranda görünmeyen
 * karakterlerle ad taklidi ve düzen bozma yapılabiliyor. HTML kaçışı
 * YOK — istemci metni React ile basıyor, yani zaten kaçırılmış oluyor;
 * burada kaçırmak oyuncunun yazdığı "&" işaretini bozardı.
 */
function temizMetin(ham, enCok) {
  /*
    Kontrol karakterleri KOD NOKTASIYLA süzülüyor, regex'le değil:
    regex sınıfına gerçek kontrol karakteri yazmak dosyayı okunamaz
    yapıyor ve bir düzenleyici onları sessizce kırpabiliyor.
    Satır sonu (10) korunuyor, sekme (9) boşluğa çevriliyor.
  */
  const temiz = [...String(ham ?? '')].filter((ch) => {
    const k = ch.codePointAt(0);
    if (k === 10) return true;
    return k > 31 && k !== 127;
  }).join('');
  return temiz
    .replace(/\t/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, enCok);
}


/**
 * GÖNDERİLECEK MESAJI DOĞRULA.
 * @returns {{ok:true, konu, govde} | {ok:false, reason}}
 */
function mesajDogrula({ konu, govde }) {
  const k = temizMetin(konu, KONU_EN_COK);
  const g = temizMetin(govde, GOVDE_EN_COK);
  if (!g) return { ok: false, reason: 'bos_mesaj' };
  // Konu boşsa gövdenin ilk satırından türetiliyor — zorunlu alan olması
  // hızlı cevap yazmayı gereksiz yere yavaşlatıyor.
  const konuSon = k || temizMetin(g.split('\n')[0], KONU_EN_COK) || 'Mesaj';
  return { ok: true, konu: konuSon, govde: g };
}

const HATA_METNI = {
  bos_mesaj: 'Mesaj boş olamaz.',
  alici_yok: 'Böyle bir oyuncu yok.',
  kendine: 'Kendine mesaj gönderemezsin.',
  cok_hizli: 'Çok hızlı mesaj gönderiyorsun — bir dakika bekle.',
  saatlik_sinir: 'Saatlik mesaj sınırına ulaştın.',
  mesaj_yok: 'Bu mesaj artık kutunda değil.',
};

module.exports = {
  mesajDogrula, hizSiniri, gonderimiKaydet, temizMetin,
  KONU_EN_COK, GOVDE_EN_COK, DAKIKA_TAVANI, SAAT_TAVANI, HATA_METNI,
};
