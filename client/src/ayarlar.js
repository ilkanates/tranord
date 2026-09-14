/**
 * AYARLAR — oyuncunun bütün tercihlerinin TEK deposu.
 *
 * Bugüne kadar tercihler dağınıktı: müzik `audio.js` içinde kendi
 * anahtarında, sağ rayın katlaması `StatusRail`de, görev süzmesi
 * `QuestGuide`de. Her biri kendi `localStorage` anahtarını okuyup yazıyor
 * ve hiçbiri diğerinden haberdar değildi; oyuncunun "ayarlarım nerede"
 * sorusunun cevabı yoktu.
 *
 * Burası o sorunun cevabı. `audio.js` MÜZİĞİN KENDİ ÇALARI olarak
 * duruyor (parça listesi, otomatik oynatma kilidi, sıradaki parça) —
 * onu buraya taşımak çalar mantığını ayar deposuna karıştırmak olurdu;
 * ayarlar menüsü ikisini de aynı ekranda gösteriyor.
 *
 * TASARIM
 *
 * 1) TEK ANAHTAR (`tn.ayarlar`). Ayar eklemek bir alan eklemek; yeni bir
 *    depolama anahtarı ve yeni bir okuma/yazma yolu değil.
 *
 * 2) EKSİK ALAN VARSAYILANA DÜŞER. Kaydedilmiş ayar eski sürümden
 *    kalmışsa yeni alanlar kendiliğinden varsayılanı alıyor — sürüm
 *    numarası ve göç kodu gerekmiyor.
 *
 * 3) DEPOLAMA YOKSA ÇALIŞMAYA DEVAM. Gizli sekmede `localStorage` okurken
 *    bile hata atabiliyor; her erişim try/catch içinde ve ayarlar o
 *    oturumda bellekte yaşıyor.
 */

const ANAHTAR = 'tn.ayarlar';

/**
 * ARAYÜZ ÖLÇEĞİ — yazıların ve bütün arayüzün büyüklüğü.
 *
 * İlkan: *"bazı kullanıcılarda yazılar çok küçük kalıyor ordan
 * ayarlasınlar"*.
 *
 * Yalnız YAZI değil arayüzün TAMAMI ölçekleniyor (CSS `zoom`). Yalnız
 * yazı büyüseydi 11 px için hesaplanmış kutular taşar, sayılar
 * kırpılırdı — arayüz satır içi piksel ölçüleriyle yazılmış durumda.
 * Ölçek büyüdükçe ekrana daha az şey sığıyor; bu, okunaklılığın bedeli
 * ve oyuncunun bilerek verdiği karar.
 *
 * Aralık 0,85-2,00. Üst sınır önce 1,50 idi ve yetmedi (İlkan: "yazılar
 * da çok büyümüyor"): oyunun taban yazı ölçüleri 9-11 px, %150 bunu
 * ancak 13,5-16,5 px yapıyor.
 *
 * %200 bozulmuyor çünkü ölçek büyüdükçe düzen KENDİLİĞİNDEN dar ekran
 * biçimine geçiyor: 1280 px pencere %200 ölçekte 640 px'lik bir düzene
 * denk geliyor ve oyunun telefon yerleşimi devreye giriyor (raylar
 * çekmeceye, sekmeler alta). Yani yüksek ölçek bir bozulma değil,
 * zaten var olan ikinci bir yerleşim.
 */
export const OLCEK_EN_AZ = 0.85;
export const OLCEK_EN_COK = 2;

/** Hazır ölçek adımları — kaydırıcıyı milimetre ayarına bırakmamak için */
export const OLCEK_ADIMLARI = [
  { deger: 0.85, ad: 'Küçük' },
  { deger: 1, ad: 'Normal' },
  { deger: 1.15, ad: 'Büyük' },
  { deger: 1.35, ad: 'Daha büyük' },
  { deger: 1.6, ad: 'Çok büyük' },
  { deger: 2, ad: 'En büyük' },
];

/**
 * OLAY SESLERİ — her biri AYRI açılıp kapanır ve AYRI seviyeye sahip
 * (İlkan'ın isteği).
 *
 * Tek bir "ses efektleri" anahtarı yetmezdi: oyuncunun saldırı uyarısını
 * duymak isterken bina bitiş sesini istememesi son derece olağan, hatta
 * en sık istenen ayar bu.
 *
 * SES DOSYALARI HENÜZ YOK. Liste şimdiden duruyor çünkü ayar ekranının
 * yeri ve kayıt biçimi dosyalardan önce oturmalı; dosya
 * `client/public/ses/<anahtar>.mp3` olarak eklendiği anda o satır
 * kendiliğinden çalışmaya başlıyor (bkz. ses.js).
 *
 * `oncelik` alanı yalnız SIRALAMA için: önemli uyarılar listenin başında.
 */
export const SES_OLAYLARI = [
  {
    anahtar: 'saldiriGeldi',
    ad: 'Saldırı geliyor',
    aciklama: 'Köyüne bir ordu yürüdüğünde.',
  },
  {
    anahtar: 'savasSonucu',
    ad: 'Savaş sonucu',
    aciklama: 'Saldırı ya da savunma raporu geldiğinde.',
  },
  {
    anahtar: 'seferGonderildi',
    ad: 'Sefer yola çıktı',
    aciklama: 'Savaşa, yağmaya ya da takviyeye asker yolladığında.',
  },
  {
    anahtar: 'askerBitti',
    ad: 'Asker eğitimi bitti',
    aciklama: 'Kışla, ahır ya da atölyeden bir birlik çıktığında.',
  },
  {
    anahtar: 'ekipmanBitti',
    ad: 'Alet üretimi bitti',
    aciklama: 'Kılıç, mızrak, kalkan, zırh ya da kuşatma makinesi hazır olduğunda.',
  },
  {
    anahtar: 'binaBitti',
    ad: 'İnşaat bitti',
    aciklama: 'Bir bina ya da üretim alanı seviye atladığında.',
  },
  {
    anahtar: 'arastirmaBitti',
    ad: 'Araştırma bitti',
    aciklama: 'Rún Salonunda bir birim araştırması tamamlandığında.',
  },
  {
    anahtar: 'gorevTamam',
    ad: 'Görev ödülü hazır',
    aciklama: 'Bir rehber görevinin ödülü alınabilir olduğunda.',
  },
  {
    anahtar: 'depoDoldu',
    ad: 'Depo doldu',
    aciklama: 'Bir kaynağın deposu tavana dayandığında — üretim boşa akıyor.',
  },
  {
    anahtar: 'aclik',
    ad: 'Açlık başladı',
    aciklama: 'Yiyecek bitip nüfus kaybetmeye başladığında.',
  },
  {
    anahtar: 'mesaj',
    ad: 'Yeni mesaj',
    aciklama: 'Başka bir oyuncudan mesaj geldiğinde.',
  },
];

const SES_VARSAYILAN = () => Object.fromEntries(
  SES_OLAYLARI.map(o => [o.anahtar, { acik: true, ses: 0.7 }]),
);

const VARSAYILAN = () => ({
  olcek: 1,
  sesAcik: true,        // ana ses anahtarı — kapalıyken hiçbir olay sesi çıkmaz
  sesSeviyesi: 0.7,     // ana ses seviyesi; olay seviyeleri bununla ÇARPILIR
  olaylar: SES_VARSAYILAN(),
});

const sayi = (v, enAz, enCok, varsayilan) => (
  Number.isFinite(v) ? Math.min(enCok, Math.max(enAz, v)) : varsayilan
);

function oku() {
  const v = VARSAYILAN();
  let ham = null;
  try { ham = JSON.parse(localStorage.getItem(ANAHTAR) || 'null'); }
  catch { /* gizli sekme: bellekte yaşarız */ }
  if (!ham || typeof ham !== 'object') return v;

  const out = {
    olcek: sayi(Number(ham.olcek), OLCEK_EN_AZ, OLCEK_EN_COK, v.olcek),
    sesAcik: ham.sesAcik === undefined ? v.sesAcik : !!ham.sesAcik,
    sesSeviyesi: sayi(Number(ham.sesSeviyesi), 0, 1, v.sesSeviyesi),
    olaylar: { ...v.olaylar },
  };
  /*
    OLAY LİSTESİ KODDAN GELİR, kayıttan değil. Kayıtta artık var olmayan
    bir olay varsa yok sayılıyor; yeni eklenen olay varsayılanıyla
    geliyor. Kaydı olduğu gibi alsaydık yeni ses satırları eski
    oyuncularda hiç görünmezdi.
  */
  for (const o of SES_OLAYLARI) {
    const k = ham.olaylar?.[o.anahtar];
    if (!k || typeof k !== 'object') continue;
    out.olaylar[o.anahtar] = {
      acik: k.acik === undefined ? true : !!k.acik,
      ses: sayi(Number(k.ses), 0, 1, 0.7),
    };
  }
  return out;
}

function yaz(s) {
  try { localStorage.setItem(ANAHTAR, JSON.stringify(s)); }
  catch { /* yoksay — ayar o oturumda yaşar */ }
}

let durum = oku();
const dinleyiciler = new Set();

const duyur = () => { for (const fn of dinleyiciler) fn(durum); };

/**
 * ÖLÇEĞİ BELGEYE UYGULA.
 *
 * `zoom` kullanılıyor, `transform: scale` değil: transform düzeni
 * ölçeklemiyor, yalnız çizimi büyütüyor — sabit konumlu katmanlar
 * (pencereler, ipuçları) kayıyor ve tıklama alanları görselin dışında
 * kalıyor. `zoom` düzenin kendisini ölçekliyor, yani her şey gerçekten
 * büyüyor.
 *
 * #root'ta YALNIZ YÜKSEKLİK ölçeğe bölünüyor (index.css). Yüzde ile
 * görüntü birimi aynı davranmıyor: tarayıcı yüzdeyi zoom uzayında
 * kendiliğinden çözüyor, `100dvh` ise olduğu gibi kalıp zoom ile
 * çarpılıyor. İkisini de bölmek genişliği İKİ KEZ küçültüyor ve düzen
 * ekranın sağından solundan kesiliyordu.
 */
function olcegiUygula() {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--tn-olcek', String(durum.olcek));
}
olcegiUygula();

export function ayarlar() { return durum; }

export function ayarlariDinle(fn) {
  dinleyiciler.add(fn);
  fn(durum);
  return () => dinleyiciler.delete(fn);
}

export function olcekAyarla(v) {
  const yeni = sayi(Number(v), OLCEK_EN_AZ, OLCEK_EN_COK, durum.olcek);
  if (yeni === durum.olcek) return;
  durum = { ...durum, olcek: yeni };
  yaz(durum); olcegiUygula(); duyur();
}

export function sesAcikAyarla(acik) {
  durum = { ...durum, sesAcik: !!acik };
  yaz(durum); duyur();
}

export function sesSeviyesiAyarla(v) {
  const yeni = sayi(Number(v), 0, 1, durum.sesSeviyesi);
  durum = { ...durum, sesSeviyesi: yeni };
  /*
    Sesi sıfırdan yukarı çekmek "sesi aç" demektir — kaydırıcıyı
    oynatıp hiçbir şey duymamak, ayarın bozuk olduğunu düşündürür.
  */
  if (yeni > 0 && !durum.sesAcik) durum.sesAcik = true;
  yaz(durum); duyur();
}

export function olayAyarla(anahtar, yama) {
  const onceki = durum.olaylar[anahtar];
  if (!onceki) return;
  const yeni = {
    acik: yama.acik === undefined ? onceki.acik : !!yama.acik,
    ses: yama.ses === undefined ? onceki.ses : sayi(Number(yama.ses), 0, 1, onceki.ses),
  };
  // Seviyeyi sıfırdan yukarı çekmek o olayı açar (ana ses kuralının aynısı)
  if (yama.ses !== undefined && yeni.ses > 0 && yama.acik === undefined) yeni.acik = true;
  durum = { ...durum, olaylar: { ...durum.olaylar, [anahtar]: yeni } };
  yaz(durum); duyur();
}

/** Bir olayın GERÇEK ses seviyesi — kapalıysa 0, açıksa ana ses × olay sesi */
export function olaySesi(anahtar) {
  if (!durum.sesAcik) return 0;
  const o = durum.olaylar[anahtar];
  if (!o || !o.acik) return 0;
  return Math.min(1, Math.max(0, durum.sesSeviyesi * o.ses));
}

/** Her şeyi fabrika ayarına döndür */
export function ayarlariSifirla() {
  durum = VARSAYILAN();
  yaz(durum); olcegiUygula(); duyur();
}
