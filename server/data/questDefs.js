/**
 * GÖREV ZİNCİRİ — oyunu adım adım öğreten rehber.
 *
 * Görevler HESAP başına ilerler (ikinci köyde baştan başlamaz) ve durum
 * merkez köyün state'inde `quests` altında tutulur (ayrı tablo açmamak
 * için; merkez taşınınca kayıt da taşınır — bkz. index.js set_capital).
 *
 * SIRA ÖNEMLİ: önce İŞÇİ ATAMA öğretilir (işçisiz tarla üretmez), sonra
 * seviye yükseltme ve yükseltmenin de inşaatçı istediği, sonra yiyecek
 * zinciri, işleme binaları, depo, nüfus, en son askeri hat. Oyuncu ilk
 * beş dakikada "neden hiçbir şey üretmiyorum" sorusuna düşmesin.
 *
 * ZORUNLU / OPSİYONEL
 *   `zorunlu: true`  ana hat — oyunu oynayabilmek için gereken bilgi.
 *                    Rehber kartı SIRADAKİ ZORUNLU görevi gösterir.
 *   `zorunlu: false` yan hedef — atlanabilir. Verimlilik, denge ve ileri
 *                    sistemler (pazar, taverna, kule, atölye, at).
 * Ayrım bilerek var: her şeyi zorunlu yapmak rehberi bitmeyen bir
 * "yapılacaklar listesi"ne çeviriyordu; hiçbirini zorunlu yapmamak da
 * yeni oyuncuyu nereden başlayacağını bilmeden bırakıyordu.
 *
 * ID'LER KALICI: ilerleme id ile kaydediliyor. Metni düzeltmek serbest,
 * id'yi değiştirmek oyuncunun o görevi baştan yapmasına yol açar.
 *
 * Koşullar SUNUCUDA ölçülür; istemciye güvenilmez. Tipler:
 *   tarla      { tip?, seviye?, adet? }   üretim tarlası
 *   isci       { tip?, adet }             tarlalarda çalışan işçi
 *   bina       { tip, seviye }            köy merkezindeki bina
 *   binaIsci   { tip, adet }              o binada çalışan işçi
 *   binaIsci3  { tipler[], adet }         birkaç bina türünün toplamı
 *   bonusTarla { adet }                   bonuslu hex'e doğru ocak
 *   kaynak     { res, adet }              elde bulunan kaynak
 *   ordu       { adet }                   toplam asker
 *   ekipman    { tip, adet }              üretilmiş ekipman
 *   arastirma  { adet }                   açılan birim sayısı
 *   sefer      { adet }                   gönderilen sefer (keşif dahil)
 *   nufus      { adet }                   nüfus
 * Koşullar oyuncunun BÜTÜN köylerine bakar (en iyi köy sayılır).
 */

const QUESTS = [
  // ══ 1. İŞÇİ: üretimi yapan şey ═══════════════════════════════════
  {
    id: 'ormanIsci', title: 'Baltayı Kap', zorunlu: true,
    text: 'Ormana 3 işçi ata. Bir tarla kendi kendine üretmez — üretimi yapan işçidir.',
    hint: 'Harita sekmesinde ormana tıkla, açılan panelde işçi kaydıracını sağa çek.',
    tab: 'harita', anchor: 'tarla-odun',
    cond: { tur: 'isci', tip: 'odun', adet: 3 },
    reward: { res: { kereste: 100, tugla: 60 } },
  },
  {
    id: 'tumIsci', title: 'Herkes Sahaya', zorunlu: true,
    text: 'Bütün tarlalarına toplam 12 işçi ata. Boşta duran köylü ekmek yer, üretmez.',
    hint: 'Köylüler sekmesinden bütün tarlaları tek ekranda görüp dağıtabilirsin.',
    tab: 'isciler', anchor: 'isci-kaydirac',
    cond: { tur: 'isci', adet: 12 },
    reward: { res: { kereste: 120, tugla: 120, tahil: 120 } },
  },

  // ══ 2. SEVİYE: işçi KAPASİTESİNİ artırır ═════════════════════════
  {
    id: 'orman2', title: 'Daha Çok Balta', zorunlu: true,
    text: 'Ormanı Lvl 2 yap. Seviye üretimi doğrudan artırmaz; daha çok işçi almasını sağlar.',
    hint: 'Ormana tıkla, panelde YÜKSELT. Yükseltme için ayrıca inşaatçı seçmen gerekir.',
    tab: 'harita', anchor: 'tarla-odun',
    cond: { tur: 'tarla', tip: 'odun', seviye: 2 },
    reward: { res: { kereste: 150, tugla: 100 } },
  },
  {
    id: 'orman2Isci', title: 'Boş Kapasite Kalmasın', zorunlu: true,
    text: 'Yükselttiğin ormana 5 işçi ata. Seviye atlattığın tarlayı doldurmazsan hiçbir şey değişmez.',
    hint: 'Aynı panelde işçi kaydıracını yeni tavana kadar çek.',
    tab: 'harita', anchor: 'tarla-odun',
    cond: { tur: 'isci', tip: 'odun', adet: 5 },
    reward: { res: { kereste: 150, yontmaTas: 80 } },
  },
  {
    id: 'kil2', title: 'Çamurdan Tuğlaya', zorunlu: true,
    text: 'Kil ocağını Lvl 2 yap ve işçisini artır.',
    hint: 'Kil ocağı kırmızımsı topraklı olandır.',
    tab: 'harita', anchor: 'tarla-kil',
    cond: { tur: 'tarla', tip: 'kil', seviye: 2 },
    reward: { res: { tugla: 180, kereste: 80 } },
  },
  {
    id: 'tas2', title: 'Taş Ustası', zorunlu: false,
    text: 'Taş ocağını Lvl 2 yap. Yontma taş sur ve büyük binalarda şart.',
    hint: 'Gri kayalık olan.',
    tab: 'harita', anchor: 'tarla-tas',
    cond: { tur: 'tarla', tip: 'tas', seviye: 2 },
    reward: { res: { yontmaTas: 180, kereste: 80 } },
  },
  {
    id: 'demir2', title: 'Kara Damar', zorunlu: false,
    text: 'Demir madenini Lvl 2 yap. Silah ve zırhın tamamı külçe demir ister.',
    hint: 'Koyu renkli, cevherli görünen hex.',
    tab: 'harita', anchor: 'tarla-demir',
    cond: { tur: 'tarla', tip: 'demir', seviye: 2 },
    reward: { res: { demirKulce: 120, kereste: 100 } },
  },
  {
    id: 'tahil2', title: 'Kışa Hazırlık', zorunlu: true,
    text: 'Tahıl tarlanı Lvl 2 yap. Aç bir köy savaşamaz.',
    hint: 'Sarı başaklı olan.',
    tab: 'harita', anchor: 'tarla-tahil',
    cond: { tur: 'tarla', tip: 'tahil', seviye: 2 },
    reward: { res: { tahil: 250, kereste: 80 } },
  },

  // ══ 3. YİYECEK ZİNCİRİ — erken kurulmalı ═════════════════════════
  {
    id: 'degirmenKur', title: 'Un Öğüt', zorunlu: true,
    text: 'Değirmen kur. Tahıl → un → ekmek zinciri köylünü daha az tahılla doyurur.',
    hint: 'Köy Merkezi > boş arazi > Ekonomik > Değirmen.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'degirmen', seviye: 1 },
    reward: { res: { tahil: 300, kereste: 150 } },
  },
  {
    id: 'firinKur', title: 'Ekmek Kokusu', zorunlu: true,
    text: 'Fırın kur. Ekmek en verimli yiyecektir; halk aç kalırsa önce askerler ölür.',
    hint: 'Köy Merkezi > boş arazi > Ekonomik > Fırın.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'firin', seviye: 1 },
    reward: { res: { tahil: 300, tugla: 150 }, kp: 20 },
  },
  {
    id: 'yiyecekIsci', title: 'Değirmen Dönsün', zorunlu: true,
    text: 'Değirmen ve fırına toplam 4 işçi ata. Kurmak yetmez; işçisiz un da ekmek de çıkmaz.',
    hint: 'Köylüler sekmesinden ikisine de kadro ver.',
    tab: 'isciler', anchor: 'isci-kaydirac',
    cond: { tur: 'binaIsci3', tipler: ['degirmen', 'firin'], adet: 4 },
    reward: { res: { tahil: 250, ekmek: 80 } },
  },
  {
    id: 'ekmekStok', title: 'Kiler Dolsun', zorunlu: false,
    text: '150 ekmek biriktir. Ekmek stoğu, ordunun ve nüfusun büyüyebileceği kadar yer demek.',
    hint: 'Fırına işçi ekle; ekmek tahıl ambarında un ile AYNI yeri paylaşır.',
    tab: 'isciler', anchor: 'isci-kaydirac',
    cond: { tur: 'kaynak', res: 'ekmek', adet: 150 },
    reward: { res: { tahil: 300 }, isci: 2 },
  },

  // ══ 4. İŞLEME: ham kaynak inşaatta kullanılmaz ═══════════════════
  {
    id: 'keresteciKur', title: 'Kereste Atölyesi', zorunlu: true,
    text: 'Keresteci kur. Ham odun inşaatta işe yaramaz; önce keresteye dönüşmeli.',
    hint: 'Köy Merkezi sekmesinde boş bir araziye tıkla > Ekonomik > Keresteci.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'keresteci', seviye: 1 },
    reward: { res: { kereste: 150, tugla: 80 } },
  },
  {
    id: 'keresteciIsci', title: 'Testereyi Çalıştır', zorunlu: true,
    text: 'Keresteciye 2 işçi ata. Bina da tarla gibi: işçisiz üretmez.',
    hint: 'Köy Merkezi > Keresteci > kadro kaydıracını çek.',
    tab: 'koy', anchor: 'bina-keresteci',
    cond: { tur: 'binaIsci', tip: 'keresteci', adet: 2 },
    reward: { res: { kereste: 200, demirKulce: 60 } },
  },
  {
    id: 'tuglaciKur', title: 'Fırında Tuğla', zorunlu: true,
    text: 'Tuğlacı kur. Kil tek başına duvar olmaz.',
    hint: 'Köy Merkezi > boş arazi > Ekonomik > Tuğlacı.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'tuglaci', seviye: 1 },
    reward: { res: { tugla: 200, kereste: 80 } },
  },
  {
    id: 'tasciKur', title: 'Yontma Taş', zorunlu: true,
    text: 'Taşçı kur. Sur ve büyük binalar yontma taş ister.',
    hint: 'Köy Merkezi > boş arazi > Ekonomik > Taşçı.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'tasci', seviye: 1 },
    reward: { res: { yontmaTas: 200, kereste: 80 } },
  },
  {
    id: 'demirciKur', title: 'Ocağı Yak', zorunlu: true,
    text: 'Demirci kur. Külçe demir olmadan silah da zırh da yapılmaz.',
    hint: 'Köy Merkezi > boş arazi > Ekonomik > Demirci.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'demirci', seviye: 1 },
    reward: { res: { demirKulce: 150, kereste: 100 } },
  },
  {
    id: 'islemeIsci', title: 'Atölyeler Dolsun', zorunlu: true,
    text: 'Tuğlacı, taşçı ve demirciye de işçi ata — üçünde toplam 6 işçi çalışsın.',
    hint: 'Köylüler sekmesinden hepsini tek ekranda görebilirsin.',
    tab: 'isciler', anchor: 'isci-kaydirac',
    cond: { tur: 'binaIsci3', tipler: ['tuglaci', 'tasci', 'demirci'], adet: 6 },
    reward: { res: { tugla: 150, yontmaTas: 150, demirKulce: 100 } },
  },
  {
    id: 'keresteStok', title: 'Kereste Yığını', zorunlu: false,
    text: '600 kereste biriktir. Her bina ve her yükseltme önce keresteyle başlar.',
    hint: 'Keresteciyi yükselt ve kadrosunu doldur; ham odun yetmezse ormana işçi ekle.',
    tab: 'isciler', anchor: 'isci-kaydirac',
    cond: { tur: 'kaynak', res: 'kereste', adet: 600 },
    reward: { res: { tugla: 250, yontmaTas: 250 } },
  },

  // ══ 5. BÜYÜME: yer, depo, nüfus ══════════════════════════════════
  {
    id: 'anabina3', title: 'Köyün Kalbi', zorunlu: true,
    text: 'Ana Binayı Lvl 3 yap. Her seviye bir tarla slotu daha açar.',
    hint: 'Haritada köyünün ortasındaki hex.',
    tab: 'koy', anchor: 'bina-anaBina',
    cond: { tur: 'bina', tip: 'anaBina', seviye: 3 },
    reward: { res: { kereste: 200, tugla: 150, yontmaTas: 150 }, kp: 20 },
  },
  {
    id: 'tarla8', title: 'Sınırları Genişlet', zorunlu: true,
    text: 'Toplam 8 tarlan olsun. Yeni tarla, mevcut tarlana komşu boş hex\'e kurulur.',
    hint: 'Haritada "+" işaretli hex\'lere tıkla.',
    tab: 'harita', anchor: 'tarla-bos',
    cond: { tur: 'tarla', adet: 8 },
    reward: { res: { kereste: 250, tugla: 200 }, isci: 3 },
  },
  {
    id: 'depo2', title: 'Ambar Lazım', zorunlu: true,
    text: 'Hammadde Deposu kur; depon dolunca üretim çöpe gider.',
    hint: 'Köy Merkezi > boş arazi > Depo > Hammadde Deposu.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'hammaddeDepo', seviye: 1 },
    reward: { res: { kereste: 200, yontmaTas: 200 } },
  },
  {
    id: 'islenmisDepo', title: 'İşlenmiş Mal Nereye?', zorunlu: true,
    text: 'İşlenmiş Mal Deposu kur. Kereste, tuğla, yontma taş ve külçe HAM maddeyle '
      + 'aynı depoya girmez — ayrı deponun tavanı dolunca işleme binaların boşa çalışır.',
    hint: 'Köy Merkezi > boş arazi > Depo > İşlenmiş Mal Deposu.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'islenmisMalDepo', seviye: 1 },
    reward: { res: { kereste: 250, tugla: 250 } },
  },
  {
    id: 'tahilAmbarKur', title: 'Tahıl Ambarı', zorunlu: true,
    text: 'Tahıl Ambarı kur. Tahıl da kendi ambarını ister; un ve ekmek orada yer paylaşır.',
    hint: 'Köy Merkezi > boş arazi > Depo > Tahıl Ambarı.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'tahilAmbar', seviye: 1 },
    reward: { res: { tahil: 400, ekmek: 100 } },
  },
  {
    id: 'ev2', title: 'Yeni Ocaklar', zorunlu: true,
    text: 'Bir Ev kur. Nüfus tavanı artmadan yeni işçi doğmaz.',
    hint: 'Köy Merkezi > Nüfus > Ev.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'ev', seviye: 1 },
    reward: { res: { kereste: 250, tugla: 250 }, isci: 4 },
  },
  {
    id: 'nufus80', title: 'Kalabalık Köy', zorunlu: false,
    text: 'Nüfusunu 80\'e çıkar. Nüfus hem işçi hem asker demektir; ikisi aynı havuzdan çıkar.',
    hint: 'Ev yükselt (tavan) ve ekmeğin eksiye düşmesin (büyüme durur).',
    tab: 'koy', anchor: 'bina-ev',
    cond: { tur: 'nufus', adet: 80 },
    reward: { res: { tahil: 400 }, isci: 6, kp: 20 },
  },
  {
    id: 'bonusTarla', title: 'Bereketli Toprak', zorunlu: false,
    text: 'Bonuslu bir araziye o kaynağın ocağını dik. Haritada +%20 · +%50 yazan hex\'ler '
      + 'sabit bonus taşır; üstüne AYNI cinsten üretim kurarsan o kadar fazla üretir.',
    hint: 'Örnek: "+%40 odun" yazan hex\'e keresteci değil, ORMAN (odun ocağı) kur. '
      + 'Bonus ancak tarlanın cinsi bonusla aynıysa işler. Köy merkezi kurulamaz oraya.',
    tab: 'harita', anchor: 'tarla-bos',
    cond: { tur: 'bonusTarla', adet: 1 },
    reward: { res: { kereste: 300, tugla: 250 }, kp: 25 },
  },
  {
    id: 'tarla12', title: 'Geniş Topraklar', zorunlu: false,
    text: 'Toplam 12 tarlan olsun. Tarla sayısının tavanını Ana Bina seviyesi belirler.',
    hint: 'Yer kalmadıysa önce Ana Binayı yükselt.',
    tab: 'harita', anchor: 'tarla-bos',
    cond: { tur: 'tarla', adet: 12 },
    reward: { res: { kereste: 400, tugla: 350 }, isci: 5 },
  },
  {
    id: 'anabina5', title: 'Büyüyen Merkez', zorunlu: false,
    text: 'Ana Binayı Lvl 5 yap. Seviye hem tarla slotu hem de inşaat hızı demek.',
    hint: 'Ana Binaya daha çok inşaatçı atayabilirsin — süre işçiye bölünür.',
    tab: 'koy', anchor: 'bina-anaBina',
    cond: { tur: 'bina', tip: 'anaBina', seviye: 5 },
    reward: { res: { kereste: 500, tugla: 400, yontmaTas: 400 }, kp: 30 },
  },

  // ══ 6. ASKERİ HAT: ekipman → asker → savunma ═════════════════════
  {
    id: 'kisla', title: 'İlk Mızrak', zorunlu: true,
    text: 'Kışla kur. Askersiz köy, komşunun ambarıdır.',
    hint: 'Köy Merkezi > boş arazi > Askeri > Kışla.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'kisla', seviye: 1 },
    reward: { res: { demirKulce: 150, kereste: 150 } },
  },
  {
    id: 'kilic5', title: 'Demirin Sesi', zorunlu: true,
    text: 'Silahçı kur ve 5 kılıç üret. Asker ekipmanını kuşanarak doğar.',
    hint: 'Köy Merkezi > Askeri > Silahçı; sonra panelden kılıç sipariş et.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'ekipman', tip: 'kilic', adet: 5 },
    reward: { res: { demirKulce: 200 }, kp: 30 },
  },
  {
    id: 'asker10', title: 'İlk Bölük', zorunlu: true,
    text: '10 asker eğit. Her asker bir boş işçiyi ve ekipmanını tüketir.',
    hint: 'Kışla panelinde birim kartından EĞİT. Kışlada eğitmen işçi olmalı.',
    tab: 'ordu', anchor: 'bina-kisla',
    cond: { tur: 'ordu', adet: 10 },
    reward: { res: { tahil: 400, ekmek: 100 }, isci: 4 },
  },
  {
    id: 'zirhciKur', title: 'Zırh Dövücü', zorunlu: false,
    text: 'Zırhçı kur ve 5 kalkan üret. Kalkan yalnız kılıçlı askerle kullanılır ve savunmayı büyütür.',
    hint: 'Köy Merkezi > Askeri > Zırhçı. Kılıç/mızrak/kalkan/zırh AYNI cephanelik havuzunu paylaşır.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'ekipman', tip: 'kalkan', adet: 5 },
    reward: { res: { demirKulce: 200, yontmaTas: 150 } },
  },
  {
    id: 'sur', title: 'Duvarları Yükselt', zorunlu: true,
    text: 'Sur kur. Savunma bonusu savunan bütün ordunu güçlendirir.',
    hint: 'Sur boş araziye kurulmaz — KÖYÜN ÇEVRESİNDEKİ kendi slotu var. '
      + 'Köy Merkezi ekranında köyü saran çembere tıkla.',
    tab: 'koy', anchor: 'slot-sur',
    cond: { tur: 'bina', tip: 'sur', seviye: 1 },
    reward: { res: { yontmaTas: 300, kereste: 200 } },
  },
  {
    id: 'hendekKur', title: 'Hendek Kaz', zorunlu: false,
    text: 'Hendek kur. Surun yanında ikinci savunma katmanı; koçbaşı hendeğe dokunamaz.',
    hint: 'Surun yanındaki kendi slotunda — Köy Merkezi ekranında köyü saran çember.',
    tab: 'koy', anchor: 'slot-sur',
    cond: { tur: 'bina', tip: 'hendek', seviye: 1 },
    reward: { res: { yontmaTas: 300, tugla: 200 } },
  },
  {
    id: 'kuleKur', title: 'Gözcü Kulesi', zorunlu: false,
    text: 'Bir kule kur ve içine okçu yerleştir. Kule, keşfe gelen casusu durduran tek yapı.',
    hint: 'Kulenin kendi slotları var; bonus okçu DOLULUĞUNA göre işler — boş kule bonus vermez.',
    tab: 'koy', anchor: 'slot-kule',
    cond: { tur: 'binaIsci', tip: 'kule', adet: 4 },
    reward: { res: { yontmaTas: 250, kereste: 250 }, kp: 20 },
  },
  {
    id: 'ahirKur', title: 'Atlı Birlik', zorunlu: false,
    text: 'Ahır kur. Süvari hızlıdır ve çok yük taşır; her süvari 1 at tüketir.',
    hint: 'At cephanelik havuzuna girmez — ahırın kendi kapasitesinde durur (seviye × 5).',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'ahir', seviye: 1 },
    reward: { res: { tahil: 400, demirKulce: 150 } },
  },
  {
    id: 'asker50', title: 'Gerçek Ordu', zorunlu: false,
    text: '50 asker topla. Yağmaya giden küçük ordu kâr etmez: kaybettiğin asker '
      + 'getirdiğin kaynaktan pahalıya gelir.',
    hint: 'Ekipman ve boş işçi ikisi birden gerekir; biri biterse eğitim durur.',
    tab: 'ordu', anchor: 'bina-kisla',
    cond: { tur: 'ordu', adet: 50 },
    reward: { res: { tahil: 600, ekmek: 200 }, kp: 30 },
  },

  // ══ 7. HARİTA: keşif, sefer, ganimet ═════════════════════════════
  {
    id: 'sefer1', title: 'İlk Sefer', zorunlu: true,
    text: 'Haritadan bir NPC köyüne sefer gönder. Keşif de sayılır — hatta önce keşif gönder.',
    hint: 'Harita > yabancı köye tıkla > ORDU GÖNDER. Keşif izcinin savunmasını görmeni sağlar; '
      + 'körlemesine saldıran ordusunu bırakır.',
    tab: 'harita', anchor: null,
    cond: { tur: 'sefer', adet: 1 },
    reward: { res: { kereste: 300, tugla: 300, demirKulce: 150 }, kp: 40 },
  },
  {
    id: 'sefer5', title: 'Yol Bilen Ordu', zorunlu: false,
    text: 'Toplam 5 sefer gönder. Yağma vur-kaçtır: kayıp yarıya iner, deponun yarısı taşınır.',
    hint: 'Yağmadan dönen ordunun ne kadar dolu döndüğünü savaş raporundaki DÖNÜŞ YÜKÜ söyler — '
      + 'boş dönüyorsa hedef fakir demektir.',
    tab: 'harita', anchor: null,
    cond: { tur: 'sefer', adet: 5 },
    reward: { res: { kereste: 400, tugla: 400 }, kp: 40 },
  },

  // ══ 8. İLERİ HAT ═════════════════════════════════════════════════
  {
    id: 'runsalonu', title: 'Rún Taşları', zorunlu: true,
    text: 'Rún Salonu kur. İyi birimler hem bina seviyesi hem araştırma ister.',
    hint: 'Köy Merkezi > Askeri > Rún Salonu.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'runSalonu', seviye: 1 },
    reward: { res: { kereste: 300, yontmaTas: 300 }, kp: 40 },
  },
  {
    id: 'arastirma1', title: 'İlk Araştırma', zorunlu: true,
    text: 'Rún Salonunda bir birim araştır. Araştırılmayan birim hiç eğitilemez.',
    hint: 'Rún Salonuna işçi atamayı unutma — araştırmayı yapan da işçidir.',
    tab: 'koy', anchor: 'bina-runSalonu',
    cond: { tur: 'arastirma', adet: 1 },
    reward: { res: { demirKulce: 250, kereste: 250 }, kp: 30 },
  },
  {
    id: 'pazarKur', title: 'Takas Yolu', zorunlu: false,
    text: 'Pazar kur. Elindeki fazlayı ihtiyacın olana çevirirsin; tüccar başka köye kaynak da taşır.',
    hint: 'Köy Merkezi > Ekonomik > Pazar.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'pazar', seviye: 1 },
    reward: { res: { kereste: 300, tugla: 300 } },
  },
  {
    id: 'tavernaKur', title: 'Şölen Vakti', zorunlu: false,
    text: 'Taverna kur. Şölen kültür puanı kazandırır; yeni köy hakkı kültür puanıyla açılır.',
    hint: 'Köy Merkezi > Yönetim > Taverna. Şölenin bedeli peşin, puanı sonunda yazılır.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'taverna', seviye: 1 },
    reward: { res: { tahil: 500 }, kp: 50 },
  },
  {
    id: 'atolyeKur', title: 'Kuşatma Atölyesi', zorunlu: false,
    text: 'Atölye kur. Koçbaşı ve mancınık burada üretilir — sur kırmanın tek yolu.',
    hint: 'Makineler cephanelik havuzuna girmez; atölyenin kendi kapasitesinde durur (seviye × 5). '
      + 'Kuşatma yalnız TAM SALDIRIDA kullanılır.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'atolye', seviye: 1 },
    reward: { res: { kereste: 400, demirKulce: 300 }, kp: 40 },
  },
  /*
    KAHRAMAN ZİNCİRİ — YAN HEDEF, ana hat değil.

    Kahraman güçlü ama oyunu oynamak için şart değil: köy kurup ordu
    yetiştirmeyi öğrenmemiş bir oyuncuyu kahramana yönlendirmek, ana
    hattın önüne başka bir sistem koymak olurdu. İsteyen erken dalar.
  */
  {
    id: 'kahramanKonagi', title: 'Kahramanın Evi', zorunlu: false,
    text: 'Kahraman Konağı kur. Kahramanın burada doğar; konağın seviyesi '
      + 'onun iyileşme hızını belirler.',
    hint: 'Kahraman KÖYE değil SANA ait: köyün yıkılsa bile kahramanın kalır. '
      + 'Savaştıkça deneyim kazanır, seviye atlar ve her seviyede 4 skil puanı verir.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'kahramanKonagi', seviye: 1 },
    reward: { res: { kereste: 300, yontmaTas: 300 }, kp: 30 },
  },
  {
    id: 'kahramanLvl3', title: 'İlk Zaferler', zorunlu: false,
    text: 'Kahramanını 3. seviyeye çıkar. Deneyim savaştan gelir — sefer '
      + 'panelindeki kutuyu işaretleyip onu yanında götür.',
    hint: 'Kaybedilen savaş bile deneyim verir: XP savaşın SONUCUNA değil '
      + 'BÜYÜKLÜĞÜNE bağlı. Kahraman ölmez, bayılır — canı biterse bir süre '
      + 'kullanılamaz ve hiçbir bonus vermez.',
    tab: 'kahraman',
    cond: { tur: 'kahramanSeviye', seviye: 3 },
    reward: { res: { demirKulce: 400, tahil: 400 }, kp: 45 },
  },
  {
    id: 'kosk', title: 'Yeni Topraklar', zorunlu: true,
    text: 'Köşk kur. Lvl 10\'da göçmen eğitip ikinci köyünü kurabilirsin.',
    hint: 'Köy Merkezi > Yönetim > Köşk.',
    tab: 'koy', anchor: 'bina-bos',
    cond: { tur: 'bina', tip: 'kosk', seviye: 1 },
    reward: { res: { kereste: 400, tugla: 400, yontmaTas: 300 }, kp: 60, isci: 5 },
  },
];

const QUEST_BY_ID = Object.fromEntries(QUESTS.map(q => [q.id, q]));

/** Ana hat: rehber kartı sıradaki ZORUNLU görevi öne çıkarır */
const ZORUNLU_IDS = QUESTS.filter(q => q.zorunlu).map(q => q.id);

module.exports = { QUESTS, QUEST_BY_ID, ZORUNLU_IDS };
