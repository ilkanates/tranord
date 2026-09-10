/**
 * GÖREV ZİNCİRİ — oyunu adım adım öğreten rehber.
 *
 * Görevler HESAP başına ilerler (ikinci köyde baştan başlamaz) ve durum
 * merkez köyün state'inde `quests` altında tutulur (ayrı tablo açmamak
 * için; merkez taşınınca kayıt da taşınır — bkz. index.js set_capital).
 *
 * SIRA ÖNEMLİ: önce İŞÇİ ATAMA öğretilir (işçisiz tarla üretmez), sonra
 * seviye yükseltme ve yükseltmenin de inşaatçı istediği, en son işleme
 * binaları / askeri hat. Oyuncu ilk beş dakikada "neden hiçbir şey
 * üretmiyorum" sorusuna düşmesin.
 *
 * Koşullar SUNUCUDA ölçülür; istemciye güvenilmez. Tipler:
 *   tarla     { tip?, seviye?, adet? }  üretim tarlası
 *   isci      { tip?, adet }            tarlalarda çalışan işçi
 *   bina      { tip, seviye }           köy merkezindeki bina
 *   binaIsci  { tip, adet }             o binada çalışan işçi
 *   kaynak    { res, adet }             elde bulunan kaynak
 *   ordu      { adet }                  toplam asker
 *   ekipman   { tip, adet }             üretilmiş ekipman
 *   arastirma { adet }                  açılan birim sayısı
 *   sefer     { adet }                  gönderilen sefer
 *   nufus     { adet }                  nüfus
 * Koşullar oyuncunun BÜTÜN köylerine bakar (en iyi köy sayılır).
 */

const QUESTS = [
  // ── 1. İŞÇİ: üretimin asıl kaynağı ──────────────────────────────
  {
    id: 'ormanIsci', title: 'Baltayı Kap',
    text: 'Ormana 3 işçi ata. Bir tarla kendi kendine üretmez — üretimi yapan işçidir.',
    hint: 'Harita sekmesinde ormana tıkla, açılan panelde işçi kaydıracını sağa çek.',
    tab: 'harita', anchor: 'tab-harita',
    cond: { tur: 'isci', tip: 'odun', adet: 3 },
    reward: { res: { kereste: 100, tugla: 60 } },
  },
  {
    id: 'tumIsci', title: 'Herkes Sahaya',
    text: 'Bütün tarlalarına toplam 12 işçi ata. Boşta duran köylü ekmek yer, üretmez.',
    hint: 'Köylüler sekmesinden bütün tarlaları tek ekranda görüp dağıtabilirsin.',
    tab: 'isciler', anchor: 'tab-isciler',
    cond: { tur: 'isci', adet: 12 },
    reward: { res: { kereste: 120, tugla: 120, tahil: 120 } },
  },

  // ── 2. YÜKSELTME: seviye işçi KAPASİTESİNİ artırır ──────────────
  {
    id: 'orman2', title: 'Daha Çok Balta',
    text: 'Ormanı Lvl 2 yap. Seviye üretimi doğrudan artırmaz; daha çok işçi almasını sağlar.',
    hint: 'Ormana tıkla, panelde YÜKSELT. Yükseltme için ayrıca inşaatçı seçmen gerekir.',
    tab: 'harita', anchor: 'tab-harita',
    cond: { tur: 'tarla', tip: 'odun', seviye: 2 },
    reward: { res: { kereste: 150, tugla: 100 } },
  },
  {
    id: 'orman2Isci', title: 'Boş Kapasite Kalmasın',
    text: 'Yükselttiğin ormana 5 işçi ata. Seviye atlattığın tarlayı doldurmazsan hiçbir şey değişmez.',
    hint: 'Aynı panelde işçi kaydıracını yeni tavana kadar çek.',
    tab: 'harita', anchor: 'tab-harita',
    cond: { tur: 'isci', tip: 'odun', adet: 5 },
    reward: { res: { kereste: 150, yontmaTas: 80 } },
  },
  {
    id: 'kil2', title: 'Çamurdan Tuğlaya',
    text: 'Kil ocağını Lvl 2 yap ve işçisini artır.',
    hint: 'Kil ocağı kırmızımsı topraklı olandır.',
    tab: 'harita', anchor: 'tab-harita',
    cond: { tur: 'tarla', tip: 'kil', seviye: 2 },
    reward: { res: { tugla: 180, kereste: 80 } },
  },
  {
    id: 'tas2', title: 'Taş Ustası',
    text: 'Taş ocağını Lvl 2 yap.',
    hint: 'Gri kayalık olan.',
    tab: 'harita', anchor: 'tab-harita',
    cond: { tur: 'tarla', tip: 'tas', seviye: 2 },
    reward: { res: { yontmaTas: 180, kereste: 80 } },
  },
  {
    id: 'tahil2', title: 'Kışa Hazırlık',
    text: 'Tahıl tarlanı Lvl 2 yap. Aç bir köy savaşamaz.',
    hint: 'Sarı başaklı olan.',
    tab: 'harita', anchor: 'tab-harita',
    cond: { tur: 'tarla', tip: 'tahil', seviye: 2 },
    reward: { res: { tahil: 250, kereste: 80 } },
  },

  // ── 3. İŞLEME: ham kaynak inşaatta kullanılmaz ──────────────────
  {
    id: 'keresteciKur', title: 'Kereste Atölyesi',
    text: 'Keresteci kur. Ham odun inşaatta işe yaramaz; önce keresteye dönüşmeli.',
    hint: 'Köy Merkezi sekmesinde boş bir araziye tıkla > Ekonomik > Keresteci.',
    tab: 'koy', anchor: 'tab-koy',
    cond: { tur: 'bina', tip: 'keresteci', seviye: 1 },
    reward: { res: { kereste: 150, tugla: 80 } },
  },
  {
    id: 'keresteciIsci', title: 'Testereyi Çalıştır',
    text: 'Keresteciye 2 işçi ata. Bina da tarla gibi: işçisiz üretmez.',
    hint: 'Köy Merkezi > Keresteci > kadro kaydıracını çek.',
    tab: 'koy', anchor: 'tab-koy',
    cond: { tur: 'binaIsci', tip: 'keresteci', adet: 2 },
    reward: { res: { kereste: 200, demirKulce: 60 } },
  },
  {
    id: 'tuglaciKur', title: 'Fırında Tuğla',
    text: 'Tuğlacı kur. Kil tek başına duvar olmaz.',
    hint: 'Köy Merkezi > boş arazi > Ekonomik > Tuğlacı.',
    tab: 'koy', anchor: 'tab-koy',
    cond: { tur: 'bina', tip: 'tuglaci', seviye: 1 },
    reward: { res: { tugla: 200, kereste: 80 } },
  },
  {
    id: 'tasciKur', title: 'Yontma Taş',
    text: 'Taşçı kur. Sur ve büyük binalar yontma taş ister.',
    hint: 'Köy Merkezi > boş arazi > Ekonomik > Taşçı.',
    tab: 'koy', anchor: 'tab-koy',
    cond: { tur: 'bina', tip: 'tasci', seviye: 1 },
    reward: { res: { yontmaTas: 200, kereste: 80 } },
  },
  {
    id: 'demirciKur', title: 'Ocağı Yak',
    text: 'Demirci kur. Külçe demir olmadan silah da zırh da yapılmaz.',
    hint: 'Köy Merkezi > boş arazi > Ekonomik > Demirci.',
    tab: 'koy', anchor: 'tab-koy',
    cond: { tur: 'bina', tip: 'demirci', seviye: 1 },
    reward: { res: { demirKulce: 150, kereste: 100 } },
  },
  {
    id: 'islemeIsci', title: 'Atölyeler Dolsun',
    text: 'Tuğlacı, taşçı ve demirciye de işçi ata — üçünde toplam 6 işçi çalışsın.',
    hint: 'Köylüler sekmesinden hepsini tek ekranda görebilirsin.',
    tab: 'isciler', anchor: 'tab-isciler',
    cond: { tur: 'binaIsci3', tipler: ['tuglaci', 'tasci', 'demirci'], adet: 6 },
    reward: { res: { tugla: 150, yontmaTas: 150, demirKulce: 100 } },
  },

  // ── 4. BÜYÜME ───────────────────────────────────────────────────
  {
    id: 'anabina3', title: 'Köyün Kalbi',
    text: 'Ana Binayı Lvl 3 yap. Her seviye bir tarla slotu daha açar.',
    hint: 'Haritada köyünün ortasındaki hex.',
    tab: 'koy', anchor: 'tab-koy',
    cond: { tur: 'bina', tip: 'anaBina', seviye: 3 },
    reward: { res: { kereste: 200, tugla: 150, yontmaTas: 150 }, kp: 20 },
  },
  {
    id: 'tarla8', title: 'Sınırları Genişlet',
    text: 'Toplam 8 tarlan olsun. Yeni tarla, mevcut tarlana komşu boş hex\'e kurulur.',
    hint: 'Haritada "+" işaretli hex\'lere tıkla.',
    tab: 'harita', anchor: 'tab-harita',
    cond: { tur: 'tarla', adet: 8 },
    reward: { res: { kereste: 250, tugla: 200 }, isci: 3 },
  },
  {
    id: 'depo2', title: 'Ambar Lazım',
    text: 'Hammadde Deposunu Lvl 2 yap; depon dolunca üretim çöpe gider.',
    hint: 'Köy Merkezi > Depo > Hammadde Deposu.',
    tab: 'koy', anchor: 'tab-koy',
    cond: { tur: 'bina', tip: 'hammaddeDepo', seviye: 2 },
    reward: { res: { kereste: 200, yontmaTas: 200 } },
  },
  {
    id: 'ev2', title: 'Yeni Ocaklar',
    text: 'Bir Ev kur ve Lvl 2 yap. Nüfus tavanı artmadan yeni işçi doğmaz.',
    hint: 'Köy Merkezi > Nüfus > Ev.',
    tab: 'koy', anchor: 'tab-koy',
    cond: { tur: 'bina', tip: 'ev', seviye: 2 },
    reward: { res: { kereste: 250, tugla: 250 }, isci: 4 },
  },

  // ── 5. YİYECEK ZİNCİRİ ──────────────────────────────────────────
  {
    id: 'degirmenKur', title: 'Un Öğüt',
    text: 'Değirmen kur. Tahıl → un → ekmek zinciri köylünü daha az tahılla doyurur.',
    hint: 'Köy Merkezi > boş arazi > Ekonomik > Değirmen.',
    tab: 'koy', anchor: 'tab-koy',
    cond: { tur: 'bina', tip: 'degirmen', seviye: 1 },
    reward: { res: { tahil: 300, kereste: 150 } },
  },
  {
    id: 'firinKur', title: 'Ekmek Kokusu',
    text: 'Fırın kur ve işçi ata. Ekmek en verimli yiyecektir.',
    hint: 'Köy Merkezi > boş arazi > Ekonomik > Fırın.',
    tab: 'koy', anchor: 'tab-koy',
    cond: { tur: 'bina', tip: 'firin', seviye: 1 },
    reward: { res: { tahil: 300, tugla: 150 }, kp: 20 },
  },

  // ── 6. ASKERİ HAT ───────────────────────────────────────────────
  {
    id: 'kisla', title: 'İlk Mızrak',
    text: 'Kışla kur. Askersiz köy, komşunun ambarıdır.',
    hint: 'Köy Merkezi > boş arazi > Askeri > Kışla.',
    tab: 'koy', anchor: 'tab-koy',
    cond: { tur: 'bina', tip: 'kisla', seviye: 1 },
    reward: { res: { demirKulce: 150, kereste: 150 } },
  },
  {
    id: 'kilic5', title: 'Demirin Sesi',
    text: 'Silahçı kur ve 5 kılıç üret. Asker ekipmanını kuşanarak doğar.',
    hint: 'Köy Merkezi > Askeri > Silahçı; sonra panelden kılıç sipariş et.',
    tab: 'koy', anchor: 'tab-koy',
    cond: { tur: 'ekipman', tip: 'kilic', adet: 5 },
    reward: { res: { demirKulce: 200 }, kp: 30 },
  },
  {
    id: 'asker10', title: 'İlk Bölük',
    text: '10 asker eğit. Her asker bir boş işçiyi ve ekipmanını tüketir.',
    hint: 'Kışla panelinde birim kartından EĞİT. Kışlada eğitmen işçi olmalı.',
    tab: 'ordu', anchor: 'tab-ordu',
    cond: { tur: 'ordu', adet: 10 },
    reward: { res: { tahil: 400, ekmek: 100 }, isci: 4 },
  },
  {
    id: 'sur', title: 'Duvarları Yükselt',
    text: 'Sur kur. Savunma bonusu savunan bütün ordunu güçlendirir.',
    hint: 'Köy Merkezi > Savunma > Sur (kendi slotuna kurulur).',
    tab: 'koy', anchor: 'tab-koy',
    cond: { tur: 'bina', tip: 'sur', seviye: 1 },
    reward: { res: { yontmaTas: 300, kereste: 200 } },
  },
  {
    id: 'sefer1', title: 'İlk Sefer',
    text: 'Haritadan bir NPC köyüne yağma seferi gönder.',
    hint: 'Harita > yabancı köye tıkla > SALDIR > Yağma.',
    tab: 'harita', anchor: 'tab-harita',
    cond: { tur: 'sefer', adet: 1 },
    reward: { res: { kereste: 300, tugla: 300, demirKulce: 150 }, kp: 40 },
  },

  // ── 7. İLERİ HAT ────────────────────────────────────────────────
  {
    id: 'runsalonu', title: 'Rún Taşları',
    text: 'Rún Salonu kur. İyi birimler hem bina seviyesi hem araştırma ister.',
    hint: 'Köy Merkezi > Askeri > Rún Salonu.',
    tab: 'koy', anchor: 'tab-koy',
    cond: { tur: 'bina', tip: 'runSalonu', seviye: 1 },
    reward: { res: { kereste: 300, yontmaTas: 300 }, kp: 40 },
  },
  {
    id: 'kosk', title: 'Yeni Topraklar',
    text: 'Köşk kur. Lvl 10\'da göçmen eğitip ikinci köyünü kurabilirsin.',
    hint: 'Köy Merkezi > Yönetim > Köşk.',
    tab: 'koy', anchor: 'tab-koy',
    cond: { tur: 'bina', tip: 'kosk', seviye: 1 },
    reward: { res: { kereste: 400, tugla: 400, yontmaTas: 300 }, kp: 60, isci: 5 },
  },
];

const QUEST_BY_ID = Object.fromEntries(QUESTS.map(q => [q.id, q]));

module.exports = { QUESTS, QUEST_BY_ID };
