/**
 * YAMA NOTLARI — OYUNCU DİLİNDE, NOT BAZINDA OKUNDU TAKİBİ.
 *
 * Commit başlıkları bilerek kullanılmıyor: onlar geliştirici için yazılıyor
 * ve çoğu iç düzenleme ("gorev zinciri game/quests.js'e ayrildi") oyuncunun
 * gördüğü hiçbir şeyi değiştirmiyor. Burası yalnızca OYNANIŞA yansıyan
 * değişiklikleri anlatır.
 *
 * OKUNDU TAKİBİ NOT BAZINDA — sürüm bazında DEĞİL.
 * Oyuncu çarpıya bastığında o an ekranda duran notlar "okundu" işaretlenir ve
 * bir daha ASLA gösterilmez. Yeni bir yamada yalnızca YENİ notlar çıkar;
 * okunmuş olanlar tekrar gelmez. Sürüme bağlasaydık her yamada oyuncu daha
 * önce okuduğu her şeyi baştan görürdü.
 *
 * YENİ YAMA EKLERKEN
 *   1. Diziye EN BAŞA yeni bir kayıt koy (en yeni ilk sırada).
 *   2. Her notun `id`'si BENZERSİZ ve KALICI olsun — okundu kaydı buna bakıyor.
 *      Tarih önekiyle yaz: '20260911-kereste-darbogazi'.
 *      Bir notun metnini düzeltirken id'yi DEĞİŞTİRME; yoksa okunmuş not
 *      herkese yeniden gösterilir.
 *   3. Sadece oyuncunun fark edebileceği şeyleri yaz. Refactor, test, lint
 *      buraya girmez.
 *
 * `tur` alanı rozetin rengini ve etiketini belirler: yenilik · duzeltme · denge
 */

export const YAMA_NOTLARI = [
  {
    surum: '2026-09-11h',
    tarih: '11 Eylül 2026',
    baslik: 'Casusluk ve savaş raporları',
    notlar: [
      {
        id: '20260911-casus-dengesi',
        tur: 'duzeltme',
        metin: 'Keşif neredeyse imkânsızdı: izcinin savunması saldırısının üç '
          + 'katıydı ve üstüne sur + hendek bonusu biniyordu — 5 casus 2 casusa '
          + 'yeniliyordu. Artık izci 10 saldırı / 10 savunma ve keşifte sur ile '
          + 'hendek işlemiyor. Sonucu casus SAYISI belirliyor.',
      },
      {
        id: '20260911-kule-casus',
        tur: 'denge',
        metin: 'Keşfe karşı yalnız KULE bonus veriyor — içinde okçu olan, gece '
          + 'gözcülük yapan tek yapı o. Casusa karşı korunmak istiyorsan kule '
          + 'dik; sur ve hendek orduyu durdurmak içindir.',
      },
      {
        id: '20260911-rapor-yon',
        tur: 'yenilik',
        metin: 'Raporlarda "ben mi saldırdım, bana mı saldırdılar" artık ilk '
          + 'bakışta belli: BEN GİTTİM / BANA GELDİ rozeti ve ok yönü var. '
          + 'Sefer türü de renkli — yağma altın, tam saldırı kırmızı, keşif '
          + 'buz mavisi, yerleşim yeşil.',
      },
      {
        id: '20260911-rapor-ganimet',
        tur: 'yenilik',
        metin: 'Ele geçen (ya da kaybedilen) toplam hammadde tek büyük sayı '
          + 'olarak yazıyor; altı kalemi toplaman gerekmiyor. Yağmadan sonra '
          + 'ordunun ne kadar dolu döndüğü de çubukla gösteriliyor — boş dönen '
          + 'sefer hedefin fakir olduğunu söyler.',
      },
      {
        id: '20260911-rapor-casus-sayisi',
        tur: 'duzeltme',
        metin: 'Keşif raporunda kaç casus geldiği, kaç izcinin savunduğu ve '
          + 'kayıpların ne olduğu yazmıyordu; yalnız "casusu durdurdun" '
          + 'diyordu. Üçü de eklendi. Asker resimleri de büyütüldü.',
      },
    ],
  },
  {
    surum: '2026-09-11g',
    tarih: '11 Eylül 2026',
    baslik: 'Telefonda açılış',
    notlar: [
      {
        id: '20260911-mobil-arkaplan',
        tur: 'duzeltme',
        metin: 'Telefonda giriş ekranının arka plan videosu kaldırıldı, yerine '
          + 'aynı karenin fotoğrafı kondu. 752 KB’lık video her açılışta '
          + 'yeniden iniyor ve tarayıcının bağlantı kanallarını doldurup oyunun '
          + 'kendi bağlantısını geciktiriyordu.',
      },
      {
        id: '20260911-baglaniyor-teshis',
        tur: 'yenilik',
        metin: '"Fiyorda bağlanıyor" ekranı altı saniye sonra artık ne olduğunu '
          + 'yazıyor: bağlantı kurulmuş mu, hangi yoldan, kaç kez denenmiş ve '
          + 'son hata ne. Yeniden dene ve çıkış düğmeleri de orada.',
      },
    ],
  },
  {
    surum: '2026-09-11f',
    tarih: '11 Eylül 2026',
    baslik: 'Sıralamalar ve ordu gizliliği',
    notlar: [
      {
        id: '20260911-sira-oyuncuya-gore',
        tur: 'yenilik',
        metin: 'Dünya sıralamaları artık OYUNCUYA göre: bütün köylerin tek '
          + 'satırda toplanıyor. Tablolar sırayla en büyük nüfus, en iyi '
          + 'saldıran, en iyi savunan, en çok yağma, en büyük alan ve en '
          + 'büyük köy. Çevrimdışı oyuncular da listede — sıralama kimin o an '
          + 'bağlı olduğuna göre değişmiyor.',
      },
      {
        id: '20260911-ordu-gizli',
        tur: 'yenilik',
        metin: 'Asker sayısı artık bedava bilgi değil. Sıralamadaki ordu, '
          + 'saldırı gücü ve savunma gücü tabloları kaldırıldı; haritada da '
          + 'başka oyuncunun ordusu "bilinmiyor" yazıyor. Öğrenmenin yolu '
          + 'izci göndermek — sur ve hendekte olduğu gibi.',
      },
      {
        id: '20260911-adsiz-oyuncu',
        tur: 'duzeltme',
        metin: 'Adını henüz koymamış oyuncuların hepsi haritada ve sıralamada '
          + '"oyuncu" diye görünüyor, birbirinden ayırt edilemiyordu.',
      },
    ],
  },
  {
    surum: '2026-09-11e',
    tarih: '11 Eylül 2026',
    baslik: 'Üretim kuyruğu yeniden yazıldı',
    notlar: [
      {
        id: '20260911-kuyruk-pesin',
        tur: 'yenilik',
        metin: 'Asker ve ekipman siparişlerinin bedeli artık SİPARİŞ ANINDA '
          + 'ödeniyor. Malzemen yetmiyorsa sipariş kuyruğa hiç girmiyor ve '
          + 'neyin eksik olduğu yazılıyor. Yetiyorsa malzeme hemen ayrılıyor: '
          + 'kuyrukta bekleyen her işin malzemesi hazır demek.',
      },
      {
        id: '20260911-kuyruk-kilitlenme',
        tur: 'duzeltme',
        metin: 'Malzemesi olmayan bir sipariş kuyruğun başında takılıp '
          + 'arkasındaki hazır siparişleri de kilitliyordu. 50 kılıç sipariş '
          + 'edip kaynağın bitince kuyruğun tamamı duruyordu. Bitti.',
      },
      {
        id: '20260911-kuyruk-siralama',
        tur: 'yenilik',
        metin: 'Kuyruktaki işleri yukarı/aşağı taşıyabiliyorsun — hangisinin '
          + 'önce biteceğine sen karar veriyorsun. Üretimi süren iş sırada ilk '
          + 'kalıyor; yerini değiştirmek onu baştan başlatmak olurdu.',
      },
      {
        id: '20260911-kuyruk-iade',
        tur: 'yenilik',
        metin: 'Sipariş iptalinde üretilmemiş parçaların bedeli tam iade '
          + 'ediliyor: asker için ekipman ve işçi, ekipman için kaynak. '
          + 'İade depo tavanını aşamaz, taşan kısım kaybolur.',
      },
    ],
  },
  {
    surum: '2026-09-11d',
    tarih: '11 Eylül 2026',
    baslik: 'Bina panelleri elden geçti',
    notlar: [
      {
        id: '20260911-kapatma-dugmesi',
        tur: 'duzeltme',
        metin: 'Ahır gibi alt listesi uzun binalarda panelin sağ üstündeki '
          + 'kapatma düğmesi denetimlerin altında kalıyor, tıklanamıyordu. '
          + 'Görsel penceresi artık denetimlere göre uzuyor; düğme her binada '
          + 'görünür ve tıklanabilir. Kapatma düğmesinin kontrastı da artırıldı.',
      },
      {
        id: '20260911-yukseltme-kisayollari',
        tur: 'yenilik',
        metin: 'Bina panelindeki işçi ve inşaatçı kutuları genişledi; 0 · ½ · '
          + 'TAM kısayolları artık burada da var. Tam kadro vermek için '
          + 'kaydırıcıyı ucuna kadar sürüklemek gerekmiyor.',
      },
      {
        id: '20260911-dar-ekran-serit',
        tur: 'duzeltme',
        metin: 'Dar ekranda denetim şeridi panelin sol kenarından taşıyordu; '
          + 'artık kutular alt alta diziliyor ve panel içinde kalıyor.',
      },
    ],
  },
  {
    surum: '2026-09-11c',
    tarih: '11 Eylül 2026',
    baslik: 'Pazar açıldı',
    notlar: [
      {
        id: '20260911-pazar-npc-takas',
        tur: 'yenilik',
        metin: 'Pazar artık çalışıyor. Elindeki kaynağı anında başka bir kaynağa '
          + 'çevirebilirsin: ham maddeler arasında 2 verip 1 alırsın, ham verip '
          + 'işlenmiş mal alacaksan 4’e 1, işlenmiş verip işlenmiş alacaksan '
          + 'yine 2’ye 1. Takas her zaman kaybettirir — acil ihtiyaç içindir, '
          + 'üretimin yerine geçmez. İşlenmiş maldan ham maddeye dönüş yok.',
      },
      {
        id: '20260911-pazar-tuccar',
        tur: 'yenilik',
        metin: 'Pazarın her seviyesi bir tüccar veriyor ve her tüccar 2.000 '
          + 'kaynak taşıyor. Lvl 5 pazar = 5 tüccar = 10.000 taşıma. Tüccarlar '
          + 'oyuncular arası alışverişte kullanılacak; o kısım yolda.',
      },
      {
        id: '20260911-takas-reddi',
        tur: 'duzeltme',
        metin: 'Sunucu bir takası reddettiğinde sebebi ekranda yazıyor, düğme de '
          + 'depoya sığmayan takas için baştan kapanıyor.',
      },
    ],
  },
  {
    surum: '2026-09-11b',
    tarih: '11 Eylül 2026',
    baslik: 'Kereste dengesi ve çökme düzeltmeleri',
    notlar: [
      {
        id: '20260911-muhammed',
        tur: 'denge',
        metin: 'MUHAMMED ÇOK GÜÇLENDİ ASKERLERİ ÖLDÜRÜLÜYOR',
      },
      {
        id: '20260911-kereste-darbogazi',
        tur: 'denge',
        metin: 'Kereste darboğazı giderildi. Binaların maliyeti dört işlenmiş '
          + 'malın (kereste, tuğla, yontma taş, külçe) üretim hızına göre yeniden '
          + 'dağıtıldı — artık tek bir zincir tıkanırken diğer üçü boş beklemiyor.',
      },
      {
        id: '20260911-tarla-orani',
        tur: 'denge',
        metin: 'Ham tarla üretimi işleme binalarının kapasitesine orantılandı. '
          + 'Odun, kil, taş ve demir tarlaları eskisinden az üretiyor ama işlenmiş '
          + 'mal çıktın değişmiyor: kısılan kısım zaten depo tavanına çarpıp '
          + 'çöpe gidiyordu.',
      },
      {
        id: '20260911-run-salonu-cokme',
        tur: 'duzeltme',
        metin: 'Rún Salonu\'nda araştırma başlatınca ya da ekipman yükseltmeye '
          + 'verince sunucu kopuyordu. Düzeldi.',
      },
      {
        id: '20260911-yukselt-dugmesi',
        tur: 'duzeltme',
        metin: 'Bina panelindeki YÜKSELT düğmesine basılamıyordu: rehber kartı '
          + 'üstünü örtüyor, panel de ekranın altından taşıyordu. İkisi de düzeldi; '
          + 'panel açıkken rehber kartı küçülüp sola çekiliyor.',
      },
      {
        id: '20260911-isci-atama',
        tur: 'duzeltme',
        metin: 'Bozuk bir işçi ataması köyün sayılarını kalıcı olarak bozabiliyordu.',
      },
      {
        id: '20260911-komut-kalkani',
        tur: 'duzeltme',
        metin: 'Tek bir hatalı komut bütün sunucuyu düşürebiliyordu — artık '
          + 'yalnızca o komut başarısız oluyor, oyun ayakta kalıyor.',
      },
    ],
  },
];

export const TUR_ETIKET = {
  yenilik: 'YENİ',
  duzeltme: 'DÜZELTME',
  denge: 'DENGE',
};

const ANAHTAR = 'tranord_yama_okunan';
/** Sürüm bazlı eski kayıt — artık kullanılmıyor, açılışta temizleniyor */
const ESKI_ANAHTAR = 'tranord_yama_surum';

/** Tanımlı bütün not kimlikleri — kaydı budarken kullanılıyor */
const TUM_IDLER = new Set(YAMA_NOTLARI.flatMap((y) => y.notlar.map((n) => n.id)));

/**
 * Okunan not kimlikleri.
 *
 * localStorage bazı ortamlarda (gizli sekme, site verisi kapalı) OKURKEN bile
 * hata atıyor; hata hâlinde boş küme dönüyoruz, yani panel gösteriliyor.
 * Bir kez fazla göstermek, hiç göstermemekten iyi.
 */
export function okunanlariYukle() {
  try {
    localStorage.removeItem(ESKI_ANAHTAR);      // eski sürüm bazlı kayıt
    const ham = localStorage.getItem(ANAHTAR);
    if (!ham) return new Set();
    const dizi = JSON.parse(ham);
    return new Set(Array.isArray(dizi) ? dizi : []);
  } catch {
    return new Set();
  }
}

/**
 * Kaydederken TANIMSIZ kimlikler atılıyor: notlar dosyadan silindiğinde
 * kayıt da kendiliğinden küçülüyor, sonsuza kadar büyümüyor.
 */
export function okunanlariKaydet(idler) {
  try {
    const temiz = [...idler].filter((id) => TUM_IDLER.has(id));
    localStorage.setItem(ANAHTAR, JSON.stringify(temiz));
  } catch { /* kalıcılık şart değil */ }
}

/**
 * Gösterilecek bölümler: yalnızca OKUNMAMIŞ notlar.
 * Hiç okunmamış not kalmadıysa boş dizi döner — panel de hiç açılmaz.
 *
 * `hepsi` true ise okundu durumu yok sayılır; ileride üst menüdeki
 * "yama notları" düğmesi geçmişin tamamını böyle gösterecek.
 */
export function gosterilecekBolumler(okunan, hepsi = false) {
  const out = [];
  for (const yama of YAMA_NOTLARI) {
    const notlar = hepsi ? yama.notlar : yama.notlar.filter((n) => !okunan.has(n.id));
    if (notlar.length) out.push({ ...yama, notlar });
  }
  return out;
}
