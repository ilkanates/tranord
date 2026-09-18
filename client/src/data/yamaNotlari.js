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
    surum: '2026-09-18d',
    tarih: '18 Eylül 2026',
    baslik: 'Yağma listesi',
    notlar: [
      {
        id: '20260918-yagma-liste-detay',
        tur: 'yenilik',
        metin: 'YAĞMA LİSTESİ ARTIK NE OLDUĞUNU ANLATIYOR. Bir hedefe '
          + 'sefer yoldaysa satırda YOLDA ya da DÖNÜYOR yazıyor, kalan '
          + 'süresiyle. Satırın üstüne gelince son seferin dökümü '
          + 'açılıyor: hangi hammaddeden kaç tane getirdin ve asker '
          + 'kaybettin mi. Asker kaybettiğin satır kırmızıya çalıyor — '
          + '"dolu döndü ama 12 asker verdim" ile "dolu döndü, kayıpsız" '
          + 'aynı görünmemeli.',
      },
      {
        id: '20260918-sefer-limiti-kalkti',
        tur: 'denge',
        metin: 'SEFER LİMİTİ TAMAMEN KALKTI. Aynı anda kaç sefer '
          + 'yürüteceğine artık ordun karar veriyor, bir sayaç değil. '
          + 'Önce 8\'di, yağma listesi gelince 30 oldu, sonra kalktı. '
          + 'Seferler ekranındaki sayaç da artık paydasız: "12/30" değil '
          + 'sadece "12".',
      },
      {
        id: '20260918-yagma-tek-satir',
        tur: 'yenilik',
        metin: 'YAĞMA LİSTESİNDEN TEK TEK DE GÖNDEREBİLİRSİN. Her '
          + 'satırın kendi GÖNDER tuşu var; bütün listeyi yollamadan '
          + 'yalnız bir hedefe sefer açabiliyorsun. Asker seçmediğin '
          + 'satırda tuş kapalı.',
      },
      {
        id: '20260918-yagma-saldiriyor-rozeti',
        tur: 'duzeltme',
        metin: 'DÖNÜYOR YAZAN KÖYE SALDIRINCA ARTIK "SALDIRIYOR" YAZIYOR. '
          + 'Aynı hedefe birden çok sefer yolda olabildiği için en yakın '
          + 'varışı gösteriyordum; dönüşteki ordu yeni giden saldırının '
          + 'rozetini kapatıyordu. Giden ordu bir karar, dönen ordu bir '
          + 'sonuç — artık giden öncelikli ve birden çok sefer varsa '
          + 'sayısı da yazıyor (×3).',
      },
      {
        id: '20260918-yagma-tek-liste',
        tur: 'duzeltme',
        metin: 'AYNI KÖY İKİ LİSTEYE EKLENEMİYOR. Aynı liste içinde '
          + 'zaten engelliydi ama listeler arasında değildi: iki listeyi '
          + 'de gönderince aynı hedefe iki sefer gidiyor ve sebebini '
          + 'hiçbir yerde göremiyordun. Zaten ekliyse hangi listede '
          + 'olduğu yazıyor. Eski listelerindeki çift satırlar silinmedi '
          + '— senin kurduğun listeyi habersiz bozmak doğru olmazdı.',
      },
      {
        id: '20260918-yagma-sonuc-varista',
        tur: 'duzeltme',
        metin: 'YAĞMA SONUCU ARTIK SAVAŞIN OLDUĞU ANDA YAZILIYOR. '
          + 'Ganimeti alıp dönmeye başlamış bir sefer için liste hâlâ '
          + '"henüz gidilmedi" diyordu; sonucu ordunun eve varmasını '
          + 'bekleyerek yazıyordum. Oysa ganimet varışta kesinleşiyor ve '
          + 'raporun da o an geliyor. Artık "dolu dönenlere saldır" '
          + 'düğmesi de o hedefi hemen sayıyor.',
      },
      {
        id: '20260918-npc-birim-cesitliligi',
        tur: 'denge',
        metin: 'KUZEYLİLER ARTIK TEK TİP ASKER BASMIYOR. Dünyadaki 297 '
          + 'bin askerin TAMAMI aynı birimdi (fjordvakt) ve 477 köyde '
          + 'ahır olmasına rağmen tek bir süvari yoktu — ahırlar at '
          + 'üretip boşa harcıyordu. Üç ayrı yerde aynı hata vardı: '
          + 'listenin hep ilk elemanı seçiliyordu. Artık silahçı mızrak '
          + 'da, zırhçı zırh da üretiyor; kışlanın yanında AHIR ve '
          + 'ATÖLYE de asker eğitiyor. Ölçüldü: 1 birim türü → 12, '
          + 'ordunun altıda biri artık SÜVARİ. Savunmanı tek birime '
          + 'göre kurmak artık yetmiyor — mızraklı süvariye, kalkanlı '
          + 'piyadeye karşı ayrı hazırlık gerekiyor.',
      },
      {
        id: '20260918-yagma-listesi',
        tur: 'yenilik',
        metin: 'YAĞMA LİSTESİ GELDİ (Ordu → Yağma listesi). Yağmaladığın '
          + 'köyleri satır satır bir listede topluyorsun; her satırda '
          + 'hangi askerden kaç tane gideceğini yazıyorsun ve TEK TUŞLA '
          + 'hepsine birden sefer açıyorsun. Listeye haritadan da '
          + 'ekleyebilirsin: köye tıkla, LİSTEYE EKLE. Listeler KÖYE '
          + 'ÖZEL ve birden fazla olabilir — her köyün kendi av sahası.',
      },
      {
        id: '20260918-yagma-dolu-donenler',
        tur: 'yenilik',
        metin: 'DOLU DÖNENLERE SALDIR. Sefer ganimetle DOLU döndüyse o '
          + 'köyde daha fazlası kalmış demektir; satırın solundaki şerit '
          + 'yeşile dönüyor ve tek tuşla yalnız o hedeflere yeniden '
          + 'gidebiliyorsun. Sarı şerit köyün boşaldığını, kırmızı ise '
          + 'savaşı kaybettiğini söylüyor. Bir de GÖNDERİLEMEYENLERE '
          + 'tuşu var: asker yetmediği ya da sefer limiti dolduğu için '
          + 'gidemeyen satırları tek tuşla yeniden deniyor — 40 satırlık '
          + 'listede gitmeyen 6 tanesini aramana gerek kalmıyor.',
      },
    ],
  },
  {
    surum: '2026-09-18c',
    tarih: '18 Eylül 2026',
    baslik: 'Kuzey yeniden kuruluyor',
    notlar: [
      {
        id: '20260918-npc-yagma-olcek',
        tur: 'denge',
        metin: 'KUZEYLİLER ARTIK SANA DA SALDIRIYOR. Bilgisayarın '
          + 'yönettiği köylerin yağma göndermesi zaten vardı ama son 24 '
          + 'saatte tek bir saldırı bile olmamıştı: köylerin ordusu yoktu '
          + '(700 köyün ortanca ordusu 0, en büyüğü 25 asker). Dünya '
          + 'yeniden kurulunca ordular geldi. Ayrıca bir ölçek hatası '
          + 'düzeldi — saldırı sıklığı BÜTÜN DÜNYA için tek bir sayaçla '
          + 'sınırlıydı, yani oyuncu sayısı arttıkça herkesin gördüğü '
          + 'saldırı azalıyordu. Artık sayaç oyuncu başına: köyün kabaca '
          + 'iki günde bir yağmalanabilir, aynı köye en erken 6 saat '
          + 'sonra tekrar gelinir. SIĞINAĞINI YÜKSELT.',
      },
      {
        id: '20260918-bina-sayfasi-disari-tikla',
        tur: 'duzeltme',
        metin: 'BİNA SAYFASI DIŞARIYA TIKLAYINCA KAPANIYOR. Dün bunu '
          + 'yaptığımı söylemiştim ama yalnız köy sahnesinin boşluğunda '
          + 'çalışıyordu — sayfa açıkken 1024 piksellik bir ekranda '
          + 'sayfa ve iki yan raf 988 pikseli kaplıyor, yani tıklanacak '
          + 'sahne neredeyse hiç kalmıyordu. Artık sayfanın dışındaki '
          + 'her yere tıklamak kapatıyor. Sahneyi sürüklemek kapatmaz ve '
          + 'tıkladığın düğme yine çalışır — tıklaman yutulmuyor.',
      },
      {
        id: '20260918-npc-dunya-sifirlandi',
        tur: 'denge',
        metin: 'KUZEYDEKİ KÖYLER BAŞTAN KURULDU. Bilgisayarın yönettiği '
          + 'köyler yıllardır büyüyemiyordu — üç ayrı hatadan dolayı '
          + 'değirmen, fırın ve işlik hiç yapılmıyordu; 700 köyde toplam '
          + '1 ordu vardı. Hatalar düzeldi ama eski köyler bozuk hâlleriyle '
          + 'kalmıştı. Dünya sıfırlandı: köyler yeniden, doğru şekilde '
          + 'büyüyor. Artık ortalama nüfusları 1840\'a, orduları birkaç '
          + 'yüz askere çıkıyor — yağma daha zor, ödül daha büyük. '
          + 'SENİN KÖYLERİNE DOKUNULMADI.',
      },
    ],
  },
  {
    surum: '2026-09-18b',
    tarih: '18 Eylül 2026',
    /*
      YÖNETİM ARAÇLARI YAMA NOTUNA GİRMEZ (İlkan'ın kararı). Yama notları
      OYUNCUNUN gördüğü değişiklikleri anlatır; admin paneli oyuncunun
      kullanamayacağı bir araç ve varlığını duyurmak yalnızca merak
      uyandırır.
    */
    baslik: 'Haritada tarlalar ve bina menüsü',
    notlar: [
      {
        id: '20260918-npc-tarla-gorunmuyordu',
        tur: 'duzeltme',
        metin: 'NPC KÖYLERİNİN ETRAFINDA TARLA GÖRÜNMÜYORDU. Tarlalar '
          + 'yerinde duruyordu — sunucu onları yalnız sana 30 hex\'ten '
          + 'yakın köyler için gönderiyordu. Ölçüldü: köylerin sana '
          + 'ortanca uzaklığı 94 hex, yani %96\'sı çıplak görünüyordu. '
          + 'NPC sayısı 200\'den 700\'e çıkıp dünya yayılınca sorun '
          + 'ortaya çıktı. Artık bütün köylerin tarlaları geliyor.',
      },
      {
        id: '20260918-bina-menusu-kapanma',
        tur: 'duzeltme',
        metin: 'BİNA MENÜSÜ BOŞ YERE TIKLAYINCA KAPANIYOR. Eskiden '
          + 'yalnız aynı binaya tekrar tıklayarak, Esc ile ya da kapat '
          + 'düğmesiyle kapanıyordu; sahnenin boş bir yerine tıklamak '
          + 'hiçbir şey yapmıyordu. Haritayı kaydırmak menüyü '
          + 'kapatmıyor — sürükleme tıklama sayılmıyor.',
      },
    ],
  },
  {
    surum: '2026-09-18a',
    tarih: '18 Eylül 2026',
    baslik: 'Dünya kalabalıklaştı: 200 köy yerine 700',
    notlar: [
      {
        id: '20260918-npc-buyume',
        tur: 'duzeltme',
        metin: 'NPC KÖYLERİ HİÇ GELİŞMİYORDU — sebebi bulundu. 700 '
          + 'köyün TAMAMINDA fırın ve değirmen yoktu, sadece 2\'sinde '
          + 'kışla vardı ve yalnız 1 köyün ordusu vardı. Sebep iki '
          + 'satırlık bir eksiklikti: yapay zekâ fırın, değirmen ve '
          + 'işleme binalarını (keresteci, taşçı, tuğlacı, demirci) '
          + 'yalnız YÜKSELTİYOR, hiç KURMUYORDU. Hiç kurulmadığı için '
          + 'de yükseltecek bir şey bulamıyordu.',
      },
      {
        id: '20260918-npc-buyume-sonuc',
        tur: 'denge',
        metin: 'SONUÇ: NPC köyleri artık senin gibi büyüyor. Ölçüldü '
          + '(20 köy, 900 oyun saati): ortalama nüfus 150 → 1.840, '
          + 'kışlası olan köy 0 → 18, ordusu olan köy 0 → 15, ortanca '
          + 'ordu 0 → 215. Bu aynı zamanda NPC yağmalarını da diriltti: '
          + 'yağma için en az 25 asker gerekiyordu ve dünyada neredeyse '
          + 'hiçbir NPC\'nin ordusu yoktu, yani o özellik fiilen ölüydü. '
          + 'Artık komşuların gerçekten tehlikeli.',
      },
      {
        id: '20260918-npc-savas',
        tur: 'yenilik',
        metin: 'NPC KÖYLERİ ARTIK BİRBİRİNE SALDIRIYOR. Şimdiye kadar '
          + 'yalnız sana saldırıyorlardı; aralarındaki dünya donuktu. '
          + 'Artık güçlü köyler zayıf komşularını yağmalıyor, yani '
          + 'harita sen hiçbir şey yapmasan da değişiyor: kazanan '
          + 'büyüyor, kaybeden fakirleşiyor. Sıralamaya bakınca '
          + 'köylerin yer değiştirdiğini göreceksin.',
      },
      {
        id: '20260918-npc-savas-sinir',
        tur: 'denge',
        metin: 'SAVAŞ SINIRLI — dünya boşalmasın diye. Ordusu belli bir '
          + 'eşiğin altına inmiş köye saldırılmıyor (yoksa güçlü bir '
          + 'NPC zayıf komşusunu sonsuza kadar yağmalar ve o köy bir '
          + 'daha toparlanamazdı), aynı köy arka arkaya vurulmuyor ve '
          + 'kip YAĞMA: kaynağın bir kısmı gidiyor ama bina yıkılmıyor, '
          + 'köy yok olmuyor. Ayrıca bu savaşlar SANA gelen yağmanın '
          + 'bütçesini tüketmiyor — ikisi ayrı sayaçta.',
      },
      {
        id: '20260918-npc-700',
        tur: 'yenilik',
        metin: 'DÜNYADA ARTIK 700 NPC KÖYÜ VAR (eskiden 200). Harita '
          + '1.729 köy yeri taşıyor ve bunun yalnız %12\'si doluydu — '
          + 'uzaklaştığında çoğu zaman görüş alanında tek bir komşu '
          + 'bile olmuyordu. Artık %40 dolu; kalanı hem senin ikinci '
          + 'köylerine hem de ilerideki NPC genişlemesine ayrıldı. '
          + 'NPC\'ler sahte bir eğriyle değil, senin oynadığın motorun '
          + 'aynısıyla yaşıyor: işçi atıyor, bina kuruyor, ekipman '
          + 'üretiyor, asker eğitiyor.',
      },
      {
        id: '20260918-npc-acilis',
        tur: 'duzeltme',
        metin: 'SUNUCU AÇILIŞI ARTIK BEKLETMİYOR. Yeni bir NPC köyü '
          + 'kurmak zaman alıyor ve 500 köyü açılışta kurmak sunucuyu '
          + 'bir dakika kapalı tutardı. Artık kayıtlı köyler anında '
          + 'yükleniyor, yeni köyler sunucu çalışırken arka planda '
          + 'kuruluyor — dünya ilk birkaç dakikada seyrek başlayıp '
          + 'doluyor.',
      },
    ],
  },
  {
    surum: '2026-09-17p',
    tarih: '17 Eylül 2026',
    baslik: 'Kışla yeniden anlamlı: at iki kat uzun sürüyor',
    notlar: [
      {
        id: '20260917-harita-oyuncu-adi',
        tur: 'yenilik',
        metin: 'UZAK HARİTADA OYUNCU ADLARI YAZIYOR. Uzaklaşınca '
          + 'sorulan soru değişiyor: yakında "bu köy hangisi", uzakta '
          + '"burası kimin". Etiket artık zoom\'a göre cevabını '
          + 'değiştiriyor — yakında köyün adı, uzakta sahibinin adı. '
          + 'Yalnız oyuncu köyleri etiketleniyor; NPC\'lerin sahibi yok '
          + 've dünyada yüzlercesi var, hepsini yazmak haritayı okunmaz '
          + 'yapardı. Yazı boyu da düzeltildi: eski hesapta dünya '
          + 'görünümünde 4.8 piksele düşüyor, yani tam gereken yerde '
          + 'okunmuyordu.',
      },
      {
        id: '20260917-mobil-saga-kayma',
        tur: 'duzeltme',
        metin: 'TELEFONDA EKRAN SAĞA KAYIYORDU. Alt şeritteki son '
          + 'sekmelere (İstatistik, Yardım) basınca bütün sayfa 94 '
          + 'piksel sağa kayıyor, sol kenar ekran dışında kalıyordu. '
          + 'İki sebep üst üste binmişti: üst bar 375 piksellik bir '
          + 'telefona sığmıyordu (489 px gerekiyordu) ve sayfanın '
          + 'kırpma kuralı tarayıcının kendi kaydırmasını engellemiyordu '
          + '— odaklanan düğmeyi görünür kılmak için sayfayı o '
          + 'kaydırıyordu. Artık sayfa hiçbir şekilde kayamıyor; üst '
          + 'barın sağ ucu sığmazsa kendi içinde kayıyor, profil ve '
          + 'çıkış düğmeleri erişilebilir kalıyor.',
      },
      {
        id: '20260917-at-suresi-denge',
        tur: 'denge',
        metin: 'AT ÜRETİMİ 4 SAATTEN 8 SAATE ÇIKTI. Sebebi şuydu: '
          + 'silahçı, zırhçı ve ahır PARALEL çalışıyor ve üçü de aynı '
          + 'kapasitede. Piyade üç atölyeden ikisini kullanıyordu, '
          + 'süvari üçünü — yani at, boşta duran bir fabrikayı açmaktan '
          + 'ibaretti ve zaman olarak BEDAVAYA geliyordu. Sonuçta en '
          + 'iyi süvari (Jernridder) en iyi piyadeyi her başlıkta '
          + 'yeniyordu: saldırı 125\'e 107, savunma 124\'e 92, hız '
          + '7\'ye 3, taşıma 85\'e 35 — üstelik aynı silahçı ve zırhçı '
          + 'yüküyle. Rún Lvl 10\'a ulaşan oyuncu için kışlanın hiçbir '
          + 'anlamı kalmıyordu.',
      },
      {
        id: '20260917-at-suresi-sonuc',
        tur: 'denge',
        metin: 'ARTIK KARIŞIK ORDU AÇIK ARA DOĞRU OLAN. 8 saatte ahır '
          + '1 at, silahçı 2 kılıç, zırhçı 4 parça üretiyor — bu tam '
          + 'olarak 1 Jernridder + 1 Ulv Savaşçısı demek ve üç atölye '
          + 'de tam dolu çalışıyor. Saf süvari atölye saati başına 15.6 '
          + 'saldırı veriyor, karışık ordu 29. Süvari hâlâ oyunun en '
          + 'güçlü askeri; değişen tek şey bedelinin artık üretim '
          + 'hızında olması. Mevcut ordunun gücüne dokunulmadı.',
      },
    ],
  },
  {
    surum: '2026-09-17o',
    tarih: '17 Eylül 2026',
    baslik: 'Raporlar sadeleşti, kahraman ganimet taşıyor',
    notlar: [
      {
        id: '20260917-rapor-arma-kart',
        tur: 'yenilik',
        metin: 'RAPORLARDA ARTIK PORTRE DEĞİL ARMA VAR. Sekiz birim '
          + 'çeşidi olan bir savaşta rapor on iki kartlık bir albüme '
          + 'dönüyordu; rapor bir SAYI ekranı, resim orada gürültüydü. '
          + 'Arma + sayı tek satıra sığıyor, resim ve ad üzerine '
          + 'gelince (telefonda dokununca) açılıyor.',
      },
      {
        id: '20260917-rapor-ne-kaldi',
        tur: 'yenilik',
        metin: 'NE VARDI, NE KALDI — İKİ TARAF İÇİN DE. Rapor "vardı" '
          + 've "öldü"yü yazıyordu ama kalanı kafadan çıkarman '
          + 'gerekiyordu. Ayrıca köyüne saldırıldığında KÖYÜNÜ KİMİN '
          + 'SAVUNDUĞU hiç yazmıyordu — misafir takviyeler de oradaydı '
          + 've onları hiç göremiyordun. İkisi de eklendi.',
      },
      {
        id: '20260917-sim-ters-cevir',
        tur: 'yenilik',
        metin: 'SİMÜLATÖRDE TERS ÇEVİR. "Bana saldıran bu orduya ben '
          + 'saldırsam ne olurdu" sorusunun cevabı ancak rolleri '
          + 'değiştirerek alınıyor — savaş simetrik değil. Tek tuş iki '
          + 'orduyu yer değiştiriyor; sur, hendek ve kule köyde kalıyor '
          + 'çünkü onlar köye ait, orduya değil. Bana gelen saldırı '
          + 'raporundan simülatöre giderken artık savunan ordu da '
          + 'yükleniyor.',
      },
      {
        id: '20260917-kahraman-ganimet',
        tur: 'denge',
        metin: 'KAHRAMAN ARTIK GANİMET TAŞIYOR. Sefere katılıyor, '
          + 'savaşıyor, yara alıyordu ama tek bir odun taşımıyordu. '
          + 'Yaya kahraman bir piyade kadar, atlı kahraman bir süvari '
          + 'kadar taşıyor — attaki hız kuralının aynısı. Ordunun '
          + 'kapasitesine EKLENİYOR. Bayılan kahraman taşımıyor: canı '
          + 'biten kahraman eve ışınlanıyor.',
      },
    ],
  },
  {
    surum: '2026-09-17n',
    tarih: '17 Eylül 2026',
    baslik: 'Sığınak: bir gün giremezsen sıfırlanmıyorsun',
    notlar: [
      {
        id: '20260917-simulator-rapordan',
        tur: 'yenilik',
        metin: 'RAPORDAN SİMÜLATÖRE TEK TIK. Savaş ve keşif raporlarında '
          + '"SİMÜLATÖRDE DENE" tuşu var: simülatör o raporun asker '
          + 'sayılarıyla açılıyor. Saldırımda iki ordu da yükleniyor; '
          + 'bana gelen saldırıda karşının ordusu yükleniyor, savunmayı '
          + 'sen dolduruyorsun; keşifte gördüğün savunma ve surlar '
          + 'yükleniyor. Böylece "bir dahakine ne götürmeliyim" sorusu '
          + 'elle sayı girmeden cevaplanıyor.',
      },
      {
        id: '20260917-simulator-kule',
        tur: 'duzeltme',
        metin: 'SİMÜLATÖRDE KULE GİRDİSİ YOKTU. Sunucu kule savunmasını '
          + 'zaten hesaba katıyordu ama simülatör hep 0 gönderiyordu: '
          + 'altı kulesi olan bir köyü simüle ettiğinde kulesiz bir '
          + 'sonuç görüyordun. Artık sur ve hendeğin yanında kule de '
          + 'var (yüzde olarak — altı kule Lvl 20 tam kadro %35). '
          + 'Rapordan açıldığında o savaşta uygulanan gerçek bonus '
          + 'kutuya geliyor.',
      },
      {
        id: '20260917-simulator-arma',
        tur: 'yenilik',
        metin: 'SİMÜLATÖRDE BİRİM ARMALARI. Uzun listede hangi satırın '
          + 'hangi asker olduğunu adını okuyarak bulmak gerekiyordu.',
      },
      {
        id: '20260917-siginak',
        tur: 'yenilik',
        metin: 'YENİ BİNA — SIĞINAK. Yağmacıdan kaynak gizler: her '
          + 'kaynağın son bir miktarı saldırganın gözüne görünmez, '
          + 'deponun geri kalanı süpürülse bile o kısım köyde kalır. '
          + 'Lvl 1\'de her kaynaktan 200, sonraki her seviye +150 — '
          + 'Lvl 20\'de 3.050. Ham da işlenmiş de korunuyor. Ana Bina '
          + 'Lvl 1 yetiyor, yani ilk günden kurulabilir.',
      },
      {
        id: '20260917-siginak-neden',
        tur: 'denge',
        metin: 'NEDEN GEREKLİYDİ: çevrimdışıyken üst üste yağmalanan '
          + 'oyuncu sıfırlanıyor, oyuna döndüğünde elinde bir tarla '
          + 'yükseltecek kaynak bile kalmıyordu. Sığınak her kaynaktan '
          + 'AYRI bir taban bıraktığı için geri döndüğünde her şeyden '
          + 'biraz var — tek havuz olsaydı yalnız tahılın yağmalandığı '
          + 'gün bütün koruma orada harcanır, kereste bulamazdın.',
      },
      {
        id: '20260917-siginak-sirlar',
        tur: 'yenilik',
        metin: 'SIĞINAK İSTİHBARAT SIZDIRMIYOR. Ne saldırganın raporu '
          + 'ne de keşif "şu kadarını sakladı" diyor; ikisi de yalnız '
          + 'görünen kısmı gösteriyor. Aksi hâlde saldırgan sığınağının '
          + 'seviyesini hesaplardı. Buna karşılık sığınak mancınıkla '
          + 'yıkılabiliyor ve köyde yalnız BİR tane olabiliyor — yoksa '
          + 'yağma diye bir şey kalmazdı.',
      },
    ],
  },
  {
    surum: '2026-09-17m',
    tarih: '17 Eylül 2026',
    baslik: 'Raporlar artık kaybolmuyor',
    notlar: [
      {
        id: '20260917-birim-armasi-gorunur',
        tur: 'duzeltme',
        metin: 'BİRİM ARMALARINI HİÇBİR YERDE GÖREMİYORDUN — çizilmiş 23 '
          + 'armanın hepsi oradaydı ama kartta yalnız GÖRSELİ OLMAYAN '
          + 'birim için çiziliyordu, yani pratikte hiç. Arma bir yedek '
          + 'görsel değil kimlik işareti: artık kışla kartında adın '
          + 'yanında duruyor, kuyrukta ve ordu listesinde de aynı '
          + 'işaret. Kartın saldırı/savunma rozetleri ve ekipman '
          + 'gereksinimleri de eski çizgi simgelerden armalara geçti.',
      },
      {
        id: '20260917-amblem-her-yerde',
        tur: 'duzeltme',
        metin: 'AYNI ASKER HER EKRANDA AYNI ARMAYLA ÇIKIYOR. Bazı '
          + 'listelerde birimin kendi arması, bazılarında "at" ya da '
          + '"kalkan" diye genel bir çizgi simge vardı; kuyrukta, ordu '
          + 'listesinde ve silahçı yükseltmelerinde hâlâ eski simgeler '
          + 'duruyordu. Artık tek kural: arması olan her şey armasıyla '
          + 'çiziliyor, olmayan eski simgeye düşüyor. Simgeler de '
          + 'büyütüldü — 10 pikselde arma okunmuyordu.',
      },
      {
        id: '20260917-kalkan-yuvarlak',
        tur: 'duzeltme',
        metin: 'KALKAN ARMASI YUVARLAK DEĞİLDİ. Siluet 116×92 idi, yani '
          + 'daire değil yatık elips; kare kutuda basık görünüyordu. '
          + 'Düzeltildi.',
      },
      {
        id: '20260917-kart-serit-cakismasi',
        tur: 'duzeltme',
        metin: 'KART GÖRÜNÜMÜNDE ÜST ŞERİT İÇ İÇE GİRİYORDU. Telefonda '
          + '"KART"ın üstüne "HEPSİ", "MERKEZ"in üstüne "İŞLEME" '
          + 'biniyordu: kategori düğmeleri kaydırma yerine ezilip '
          + 'yazıları komşularının üstüne taşıyordu, görünüm anahtarı '
          + 'için ayrılan yer de gerçek genişliğinden dardı. İkisi de '
          + 'düzeltildi.',
      },
      {
        id: '20260917-rapor-sayfalama',
        tur: 'yenilik',
        metin: 'BÜTÜN RAPORLARIN SAKLANIYOR. Eskiden köy başına yalnız '
          + 'son 40 rapor tutuluyor, ekranda da 25 tanesi görünüyordu; '
          + 'hareketli bir günün sonunda sabahki kuşatmanı bulamıyordun. '
          + 'Artık köy başına 250 rapor saklanıyor ve liste sayfa sayfa '
          + 'ilerliyor — listenin altındaki ÖNCEKİ / SONRAKİ ile.',
      },
      {
        id: '20260917-rapor-sekme-sayilari',
        tur: 'duzeltme',
        metin: 'SEKME SAYILARI ARTIK TÜM RAPORLARI SAYIYOR. Sayfalama '
          + 'gelince rozetler elde duran tek sayfayı sayar olmuştu; '
          + 'yüzlerce raporu olan hesapta "HEPSİ 15" yazıyordu. Süzme '
          + 'de sayım da artık sunucuda, bütün raporlar üzerinde: '
          + 'KEŞİFLER sekmesine bastığında sayfa sayısı da o sekmenin '
          + 'kendi sayfa sayısı oluyor.',
      },
      {
        id: '20260917-rapor-mobil-akordeon',
        tur: 'yenilik',
        metin: 'TELEFONDA RAPOR SATIRIN ALTINDA AÇILIYOR. Ayrıntı ayrı '
          + 'bir kutudaydı ve dar ekranda listenin altına düşüyordu: '
          + 'her rapor için sayfanın en altına inip geri çıkmak '
          + 'gerekiyordu. Artık satıra dokununca hemen altında açılıyor, '
          + 'sağdaki ok açık olanı gösteriyor, ikinci dokunuş kapatıyor.',
      },
      {
        id: '20260917-rapor-esya-gorseli',
        tur: 'yenilik',
        metin: 'MACERADAN DÜŞEN EŞYANIN GÖRSELİ BÜYÜDÜ. Eşya bulmak '
          + 'seyrek ve raporun asıl konusu; küçük bir pul olarak '
          + 'durduğunda satırdaki başka bir simgeden ayırt edilmiyordu.',
      },
    ],
  },
  {
    surum: '2026-09-17l',
    tarih: '17 Eylül 2026',
    baslik: 'Nüfus dört kat derinleşti',
    notlar: [
      {
        id: '20260917-rapor-nadirlik-rengi',
        tur: 'duzeltme',
        metin: 'MACERA RAPORU SIRADAN EŞYAYI EFSANEVİ GİBİ GÖSTERİYORDU. '
          + 'Nadirlik rengi olmayan eski raporlarda yedek renk turuncu '
          + 'yazıyordu — turuncu da efsanevi nadirliğin rengi. Artık '
          + 'renk bilinmiyorsa nötr duruyor. Eşyanın adı zaten '
          + 'nadirliğini taşıyor ("Efsanevi Bozkır Atı"), yani bilgi '
          + 'kaybolmuyor. Çanta ve kuşam ızgarası doğruydu, yalnız '
          + 'rapor satırı yanıltıyordu.',
      },
      {
        id: '20260917-nufus-tamponu',
        tur: 'denge',
        metin: 'ASKER BASACAK ADAM BULAMIYORDUN — sebebi tavan değil, '
          + 'BOŞ İŞÇİ TAMPONUYDU. Köy 4.550 kişi taşıyabildiği hâlde '
          + 'boşta 111 kişi birikince nüfus büyümesi tamamen duruyordu; '
          + 'asker eğitimi boş işçi tükettiği için bin asker basmak '
          + 'yüzerlik dokuz dalga beklemek demekti. Tampon dört kat '
          + 'derinleşti (aynı köyde 111 → 462).',
      },
      {
        id: '20260917-nufus-hizi-tavani',
        tur: 'denge',
        metin: 'NÜFUS HIZI VE TAVANI DA ARTTI. Büyüme Lvl 20 ana binada '
          + '39 → 79 kişi/oyun saati. Evler seviye başına 150 yerine '
          + '250 kişi taşıyor, evsiz taban 50 → 150. Altı Lvl 5 evli bir '
          + 'köyde tavan 4.550 → 7.650. Asıl fren yine tahıl: siviller '
          + 'de yiyor, yani büyüyen nüfus büyüyen bir tahıl faturası.',
      },
    ],
  },
  {
    surum: '2026-09-17k',
    tarih: '17 Eylül 2026',
    baslik: 'İki yeni eşya, sikkeler ve yaşlanan dünya',
    notlar: [
      {
        id: '20260917-esya-seviyesi-kayip',
        tur: 'duzeltme',
        metin: 'YÜKSELTTİĞİN EŞYA KUŞANINCA SEVİYESİNİ KAYBEDİYORDU. '
          + 'Gümüş ödeyip Lvl 4 yaptığın kılıcı bir kez takıp çıkarınca '
          + 'Lvl 1\'e dönüyordu — geri alınamaz bir kayıp. Kuşanma '
          + 'eşyanın yalnız adını ve nadirliğini taşıyordu; seviye '
          + 'sonradan eklendiği için sessizce düşüyordu. Artık eşyanın '
          + 'tamamı taşınıyor.',
      },
      {
        id: '20260917-can-iksiri',
        tur: 'yenilik',
        metin: 'CAN İKSİRİ EKLENDİ. Kahramanın canını tamamen doldurur; '
          + 'yaralı dönen kahramanı iyileşmeyi beklemeden yeniden '
          + 'yollayabilirsin. Maceradan düşer. Ölü kahramana işlemez — '
          + 'o diriltme iksirinin işi.',
      },
      {
        id: '20260917-bilgelik-kitabi',
        tur: 'denge',
        metin: 'SKİL SIFIRLAMA ARTIK SADECE BİLGELİK KİTABIYLA. '
          + 'Hammadde ödeyerek sıfırlama kalktı: bedel her seferinde '
          + 'ikiye katlanıyordu ama "her savaştan önce skil değiştirip '
          + 'iki bonusu birden kullan" istismarına yalnız fiyatla '
          + 'direniyordu — kaynağı bol oyuncu için sınır diye bir şey '
          + 'yoktu. Kitap maceradan düşen seyrek bir eşya: sınır artık '
          + 'fiyat değil bulunurluk.',
      },
      {
        id: '20260917-sikke-gorselleri',
        tur: 'yenilik',
        metin: 'GÜMÜŞ VE ALTIN ARTIK KENDİ SİKKELERİYLE. Üst bardaki '
          + 'kesede, kese penceresinde ve açık artırmada. Maceradan '
          + 'gümüş bulunca raporda büyük resmiyle görünüyor. Eskiden '
          + 'ikisi aynı çizgi daireydi ve yalnız renkle ayrılıyordu.',
      },
      {
        id: '20260917-dunya-yasi-esya',
        tur: 'yenilik',
        metin: 'EŞYA SEVİYELERİ DÜNYANIN YAŞINA GÖRE DÜŞÜYOR. İlk ay '
          + 'yalnız Lvl 1, ikinci ay Lvl 2\'ler de düşmeye başlıyor, '
          + 'böyle gider. Ölçü OYUN ZAMANI: 1× bir sunucuda bir ay '
          + 'gerçekten bir ay, bizim 10× dünyamızda üç gün. Üst seviye '
          + 'eşya bulmak yine de seyrek — kura alt seviyelere ağırlıklı, '
          + 'yoksa kademe açıldığı gün yükseltme diye bir iş kalmazdı.',
      },
      {
        id: '20260917-dunya-yasi-hammadde',
        tur: 'denge',
        metin: 'MACERADAN GELEN HAMMADDE DE DÜNYAYLA BÜYÜYOR. Sabit '
          + 'miktardı: ilk gün cömert, üçüncü ay gürültü. Maxlı bir köy '
          + 'ham kaynak başına saatte ~4.600 üretiyor, uzun maceranın '
          + 'sabit 600\'ü sekiz dakikalık üretim ediyordu. Artık ay '
          + 'başına bir kat büyüyor.',
      },
      {
        id: '20260917-macera-amblemleri',
        tur: 'duzeltme',
        metin: 'MACERA RAPORUNDA NE BULDUĞUN ARTIK BELLİ. Gümüş ödülü '
          + 'adsız bir sayı olarak çıkıyordu; bütün hammaddeler aynı '
          + 'sandık ikonundaydı. Artık her kaynak kendi amblemi ve kendi '
          + 'rengiyle — pazarda, depoda, kaynak rayında ne görüyorsan '
          + 'aynısı. Bulunan eşya da büyük resmiyle, nadirlik renginde '
          + 'çerçevelenmiş olarak görünüyor.',
      },
    ],
  },
  {
    surum: '2026-09-17j',
    tarih: '17 Eylül 2026',
    baslik: 'Açık artırma, eşya seviyeleri ve savaş düzeltmeleri',
    notlar: [
      {
        id: '20260917-kahraman-savas-hasari',
        tur: 'denge',
        metin: 'KAHRAMANIN SAVAŞTA ALDIĞI HASAR BAŞTAN YAZILDI. Eskiden '
          + 'sabit bir tavanı vardı (70): ordusunun tamamı kırılan bir '
          + 'kahraman canının ancak %11\'ini kaybediyor, sapasağlam '
          + 'dönüyordu. Artık hasar CAN TAVANININ YÜZDESİ ve İKİ '
          + 'ORDUNUN GÜÇ ORANINA bağlı: rutin bir yağma neredeyse '
          + 'bedava, ordunun kırıldığı bir savaş ölümcül.',
      },
      {
        id: '20260917-ordu-olurse-kahraman',
        tur: 'denge',
        metin: 'ORDUN TAMAMEN ÖLÜRSE KAHRAMAN DA KOLAY KOLAY DÖNMEZ. '
          + 'O savaşta hasar can tavanının 1,8 katı: zırhsız kahraman '
          + 'bayılır. ZIRH TAM DOLUYSA (%50) canının onda biriyle '
          + 'çıkıyor — zırh yatırımı tam olarak bu anda karşılığını '
          + 'veriyor. Savaş raporunda artık zırhın kaç hasarı '
          + 'engellediği de yazıyor.',
      },
      {
        id: '20260917-kahraman-orduyla-donuyor',
        tur: 'duzeltme',
        metin: 'KAHRAMAN ORDUSUYLA BİRLİKTE DÖNÜYOR. Savaş biter bitmez '
          + '"üssünde" sayılıyordu; kahraman fiilen yoldayken maceraya '
          + 'yollayabiliyordun. Artık sefer eve varana kadar meşgul — '
          + 'uzak hedefe kahraman yollamak gerçekten daha pahalı.',
      },
      {
        id: '20260917-rapor-savunan-ordu',
        tur: 'yenilik',
        metin: 'SAVAŞ RAPORU KARŞI TARAFIN ORDUSUNU DA GÖSTERİYOR. '
          + 'Sadece kaybı yazıyordu; savunan kazandıysa kaybı küçük olur '
          + 've neye çarptığını hiç öğrenemezdin. Artık "40 / 900" gibi '
          + 'kaçta kaç olduğu da yazıyor.',
      },
      {
        id: '20260917-macera-asker-olcegi',
        tur: 'denge',
        metin: 'MACERADAN GELEN ASKER DÜNYAYLA BÜYÜYOR. Sabit 1-6 '
          + 'askerdi: oyunun ilk gününde hediye, beş bin askerlik orduda '
          + 'gürültü. Artık dünyadaki ORTALAMA ordu boyutuna göre '
          + 'ölçekleniyor. Kendi ordunun büyüklüğüne bağlı değil — '
          + 'olsaydı çok askeri olan daha çok bulur, aradaki fark her '
          + 'maceradan sonra açılırdı.',
      },
      {
        id: '20260917-acik-artirma',
        tur: 'yenilik',
        metin: 'AÇIK ARTIRMA AÇILDI — Kahraman ekranında yeni sekme. '
          + 'Çantandaki eşyayı satışa koyuyorsun, ilan 24 saat açık '
          + 'kalıyor, en yüksek teklifi veren alıyor. KİMSE TEKLİF '
          + 'VERMEZSE eşya NPC\'ye satılıyor ve taban fiyatı yine sen '
          + 'alıyorsun — hiçbir satış boşa gitmiyor.',
      },
      {
        id: '20260917-artirma-kurallar',
        tur: 'denge',
        metin: 'TEKLİF VERİNCE GÜMÜŞÜN BLOKE OLUR, biri seni geçerse '
          + 'anında geri döner. Kendi ilanına teklif veremezsin (fiyat '
          + 'şişirme kapalı). Son 10 dakikada gelen teklif süreyi '
          + 'uzatır: kazanan, eşyayı en çok isteyen olmalı — son '
          + 'saniyede en hızlı tıklayan değil.',
      },
      {
        id: '20260917-esya-seviyesi',
        tur: 'yenilik',
        metin: 'EŞYALAR 5 SEVİYEYE KADAR YÜKSELİYOR. Çantadaki her '
          + 'eşyanın yanında "Lvl+" düğmesi var; bedeli gümüş ve eşyanın '
          + 'değerinden hesaplanıyor. Her seviye bonusu %20 büyütüyor. '
          + 'Nadirlik hâlâ kazanıyor: sıradan bir eşyanın Lvl 5\'i '
          + 'efsanevi bir eşyanın Lvl 1\'ini geçmiyor.',
      },
      {
        id: '20260917-npc-takas-her-yon',
        tur: 'denge',
        metin: 'NPC TAKASI ARTIK HER YÖNDE. Pazar > NPC TAKASI\'nda '
          + 'işlenmiş malı da ham kaynağa çevirebiliyorsun (2 ver, 1 al). '
          + 'Bu yön kapalıydı çünkü sonsuz döngü riski vardı; ölçtük — '
          + 'risk oranın kendisindeymiş, yönde değil. 8 odun keresteciden '
          + '6 kereste veriyor, geri takasta 3 odun ediyor: her tur '
          + 'kaybettiriyor.',
      },
      {
        id: '20260917-altin-hammadde-kalkti',
        tur: 'denge',
        metin: 'ALTINLA HAMMADDE ALINAMIYOR. Kısa süre açıktı, kapatıldı: '
          + 'altınla kaynak alınabilseydi oyun "para öde, kaynak al" '
          + 'hâline gelir, ödeyenin üretim yapmaya ihtiyacı kalmazdı. '
          + 'Kaynak dönüştürmenin yeri pazar.',
      },
    ],
  },
  {
    surum: '2026-09-17i',
    tarih: '17 Eylül 2026',
    baslik: 'Kese açıldı, rapor kutusu birleşti',
    notlar: [
      {
        id: '20260917-rapor-hesap-capinda',
        tur: 'duzeltme',
        metin: 'RAPORLAR ARTIK TEK KUTUDA. Rapor listesi yalnız '
          + 'bulunduğun köyün raporlarını gösteriyordu; okundu işareti '
          + 'ise hesap çapında tutuluyor. Köy değiştirince rozet '
          + 'yeniden yanıyor, ikinci köyünün savaşını kaçırabiliyordun. '
          + 'Artık bütün köylerinin raporları tek listede, zamana göre '
          + 'sıralı ve her satırda hangi köyüne ait olduğu yazıyor. '
          + 'İkinci köyüne gelen rapor da anında düşüyor — eskiden o '
          + 'köye geçene kadar görünmüyordu.',
      },
      {
        id: '20260917-kahraman-tek-basina-takviye',
        tur: 'duzeltme',
        metin: 'KAHRAMANI TEK BAŞINA GÖNDEREBİLİYORSUN. Sunucu buna '
          + 'zaten izin veriyordu ama gönder düğmesi asker seçmeden '
          + 'basılamıyordu: kahramanı başka köyüne taşımak isteyen '
          + 'oyuncu yanına asker katmak zorunda kalıyordu. Artık '
          + 'kahramanı işaretlemen yeterli.',
      },
      {
        id: '20260917-kahraman-yuva-secimi',
        tur: 'yenilik',
        metin: 'KAHRAMANIN YUVASI ARTIK SENİN SEÇİMİN. Kendi köyüne '
          + 'DESTEK gönderirken yeni bir kutu çıkıyor: "Bu köyü '
          + 'kahramanın yuvası yap". İşaretliysen kahraman oraya '
          + 'taşınır ve bundan sonra seferleri o köyden çıkar; '
          + 'işaretlemezsen misafir kalır, savunmaya katılır ve '
          + 'Kahraman ekranından geri çağırabilirsin. Eskiden kendi '
          + 'köyüne giden kahraman her zaman taşınıyordu, yani onu '
          + 'geçici savunmaya yollamak mümkün değildi.',
      },
      {
        id: '20260917-kese-gumus-altin',
        tur: 'yenilik',
        metin: 'ARTIK İKİ PARAN VAR. Üst barda, ayarların solunda iki '
          + 'sikke duruyor: GÜMÜŞ kahramanın parası, ALTIN hesabın '
          + 'parası. Rozete tıklayınca kese açılıyor. Kese hesaba ait — '
          + 'köy değiştirince değişmiyor.',
      },
      {
        id: '20260917-gumus-macera',
        tur: 'yenilik',
        metin: 'GÜMÜŞÜN ASIL KAYNAĞI MACERA. Kahraman maceradan artık '
          + 'hammadde ve asker yanında gümüş de getiriyor; uzun macera '
          + 'kısanın yaklaşık üç katı. Gümüş yağmadan ya da üretimden '
          + 'gelmiyor: kahramanın parası kahramanın emeğinden geliyor. '
          + 'Yakında gümüşle açık artırmadan eşya alacaksın.',
      },
      {
        id: '20260917-altin-cevirme',
        tur: 'yenilik',
        metin: 'ALTIN GÜMÜŞE ÇEVRİLİYOR. 1 altın = 100 gümüş; geri dönüş '
          + 'pahalı (1 altın 150 gümüşe mal oluyor) — makas olmasaydı iki '
          + 'para tek paraya düşer, tur döndürerek para basmak mümkün '
          + 'olurdu.',
      },
      {
        id: '20260917-baslangic-kese',
        tur: 'denge',
        metin: 'HERKESE 500 GÜMÜŞ VE 100 ALTIN. Eski hesaplar da dahil: '
          + 'kese ilk açılışta kendiliğinden doluyor. 500 gümüş birkaç '
          + 'eşya demek — ilk açık artırmaya seyirci değil alıcı olarak '
          + 'gireceksin.',
      },
    ],
  },
  {
    surum: '2026-09-17h',
    tarih: '17 Eylül 2026',
    baslik: 'Genç köyler tek mancınıkla silinmiyor',
    notlar: [
      {
        id: '20260917-koy-yikim-tarlalar',
        tur: 'denge',
        metin: 'YENİ KURULAN KÖY TEK SALDIRIDA YOK OLUYORDU. Köyün yok '
          + 'olması için "bütün binaları bitsin" deniyordu; ama yeni '
          + 'köyün TEK binası var (Ana Bina). Bir mancınık, bir sefer '
          + 've köy haritadan siliniyordu. Artık köyün yok olması için '
          + 'BİNALARIN VE TARLALARIN hepsinin sıfırlanması gerekiyor — '
          + 'yeni köyün dokuz tarlası ona zaman kazandırıyor.',
      },
      {
        id: '20260917-mancinik-tarla',
        tur: 'yenilik',
        metin: 'MANCINIK ARTIK TARLA DA VURUYOR. Hedef listesinde ormanı, '
          + 'kil ocağını, taş ocağını, demir madenini ve tahıl tarlasını '
          + 'da seçebiliyorsun. Düşmanın ÜRETİMİNİ kesmenin yolu bu. '
          + 'Aynı zamanda köy yıkımının da tek yolu: tarlalar ayaktayken '
          + 'köy yok olmuyor.',
      },
      {
        id: '20260917-hammadde-ret-sebebi',
        tur: 'duzeltme',
        metin: 'HAMMADDE GÖNDERİRKEN "HİÇBİR ŞEY OLMUYOR" BİTTİ. Panel '
          + 'isteği yollar yollamaz kapanıyordu; sunucu reddederse '
          + '(pazarın yok, tüccarın boşta değil, ya da zaten o köydesin) '
          + 'hiçbir şey görmüyordun. Artık panel cevabı bekliyor ve '
          + 'sebebi düğmenin hemen üstünde yazıyor. Bulunduğun köye '
          + 'gönderme düğmesi de baştan kapanıyor.',
      },
    ],
  },
  {
    surum: '2026-09-17g',
    tarih: '17 Eylül 2026',
    baslik: 'Haritada renk artık ne olduğunu söylüyor',
    notlar: [
      {
        id: '20260917-harita-iliski-renk',
        tur: 'yenilik',
        metin: 'HARİTA RENKLERİ STANDART OLDU. Her oyuncuya ayrı ton '
          + 'dağıtılıyordu; harita rengârenkti ama renk hiçbir şey '
          + 'anlatmıyordu — mor bir köyün maviden farkı yoktu, ikisi '
          + 'de yabancıydı. Artık dört renk var: KENDİ köylerin MAVİ, '
          + 'dostlar (birlik arkadaşın, konfederasyon, saldırmazlık) '
          + 'YEŞİL, tarafsızlar GRİ, savaştakiler KIRMIZI.',
      },
      {
        id: '20260917-oyuncu-isaretleme',
        tur: 'yenilik',
        metin: 'İSTEDİĞİN OYUNCUYU İSTEDİĞİN RENKTE İŞARETLEYEBİLİRSİN. '
          + 'Haritada bir köye tıkla, panelin altındaki renklerden '
          + 'birini seç — o oyuncunun BÜTÜN köyleri o renge döner. '
          + 'İşaret otomatik ilişkiyi ezer: "tarafsız görünüyor ama '
          + 'bana saldırdı" diyebilirsin. İşaret hesabına kayıtlı, '
          + 'yani telefonda da bilgisayarda da aynı.',
      },
      {
        id: '20260917-harita-sinir-ayrimi',
        tur: 'duzeltme',
        metin: 'İKİ KÖYÜN BİRLEŞTİĞİ YERDEKİ KARIŞIKLIK GİTTİ. Komşu '
          + 'iki köyün ortak kenarı aynı yerde iki kez çiziliyordu ve '
          + 'hangisinin görüneceğini çizim sırası belirliyordu; mavi '
          + 'ile kırmızı yan yana gelince biri ötekini tamamen '
          + 'örtüyordu. Artık her toprağın çevresi hafifçe içeri '
          + 'çekiliyor, iki renk de ayrı ayrı okunuyor.',
      },
    ],
  },
  {
    surum: '2026-09-17f',
    tarih: '17 Eylül 2026',
    baslik: 'Haritadaki beyaz dikişler gitti',
    notlar: [
      {
        id: '20260917-harita-beyaz-dikis',
        tur: 'duzeltme',
        metin: 'ARAZİ KAROLARININ ÇEVRESİNDEKİ BEYAZ HALKA KALKTI. '
          + 'Buğday ve orman dokuları kare bir görselin içinde beyaz '
          + 'paylı çizilmişti; altıgen maske o payı kesmediği için her '
          + 'karonun çevresinde beyaz bir çerçeve oluşuyordu. Artık '
          + 'sanatın gerçek sınırı ölçülüp maskeye tam oturtuluyor, '
          + 'komşu karolar da yarım piksel bindiriliyor — ne beyaz ne '
          + 'koyu dikiş kalıyor.',
      },
    ],
  },
  {
    surum: '2026-09-17e',
    tarih: '17 Eylül 2026',
    baslik: 'Kahraman köy değiştirebiliyor',
    notlar: [
      {
        id: '20260917-kahraman-us-tasima',
        tur: 'yenilik',
        metin: 'KAHRAMANIN ÜSSÜ ARTIK YAŞADIĞI KÖY. Eskiden üs, '
          + 'Kahraman Konağı\'nın olduğu köydü ve değiştirilemiyordu; '
          + 'kahraman başka köyüne gitse bile üssü konakta kalıyordu. '
          + 'Artık kahramanı kendi köyüne TAKVİYE olarak gönderdiğinde '
          + 'orası onun yeni evi oluyor — misafir değil, oralı. Oradan '
          + 'sefere de çıkabiliyor.',
      },
      {
        id: '20260917-konak-iyilesme',
        tur: 'denge',
        metin: 'KONAK ARTIK İYİLEŞME VE DİRİLİŞ İÇİN. Kahramanın '
          + 'BULUNDUĞU köydeki konak sayılıyor: konaksız bir köyde '
          + 'kahraman yine iyileşiyor ama yalnız taban hızıyla, '
          + 'diriltme bedeli de o köyün deposundan çıkıyor. Konağı '
          + 'kahramanın yanına taşımak artık bir tercih.',
      },
      {
        id: '20260917-kahraman-misafir',
        tur: 'yenilik',
        metin: 'BAŞKASININ KÖYÜNDE HÂLÂ MİSAFİRSİN. Birine takviye '
          + 'gönderdiğinde kahraman orada savunmaya katılıyor ama '
          + 'orası üssü olmuyor; geri çağırınca evine dönüyor. Üs '
          + 'yalnız KENDİ köylerin arasında taşınıyor.',
      },
    ],
  },
  {
    surum: '2026-09-17d',
    tarih: '17 Eylül 2026',
    baslik: 'Harita ve üst bar temizlendi',
    notlar: [
      {
        id: '20260917-harita-cerceve',
        tur: 'duzeltme',
        metin: 'HARİTADA TOPRAK ARTIK BOYANMIYOR. Sahipli her altıgen '
          + 'oyuncunun renginde yarı saydam boyanıyordu ve altındaki '
          + 'arazi — orman, taş, tarla — rengin altında kayboluyordu. '
          + 'Artık toprak kendi dokusuyla görünüyor; sahiplik yalnız '
          + 'DIŞ ÇEVREYİ saran kalın bir çerçeveyle anlatılıyor. İç '
          + 'kenarlar hiç çizilmiyor, yani bir oyuncunun toprağı tek '
          + 'bir hat olarak okunuyor.',
      },
      {
        id: '20260917-harita-bonus-cerceve',
        tur: 'duzeltme',
        metin: 'ÜRETİM ALANLARININ RENKLİ ÇERÇEVELERİ KALKTI. Bonuslu '
          + 'her altıgen kendi kaynağının renginde ince bir çerçeve '
          + 'alıyordu; ormanınki yeşildi ve oyuncu sınırının yeşiliyle '
          + 'karışıyordu. Bonusun ne olduğu zaten dokusundan ve '
          + 'üstündeki yüzde rozetinden belli.',
      },
      {
        id: '20260917-ust-bar-olcek',
        tur: 'duzeltme',
        metin: 'ÜST MENÜ ARTIK KAYDIRILMIYOR, SIĞIYOR. Dar pencerede '
          + 'sekme şeridi yatay kaydırılabilir hâle geliyor ve '
          + 'sondaki sekmeler ekranın dışında kalıyordu. Artık şerit '
          + 'küçülerek sığıyor; iyice darsa etiketler düşüp yalnız '
          + 'ikonlar kalıyor (fareyle üstüne gelince adı çıkıyor). '
          + 'Hiçbir genişlikte kaydırma çubuğu çıkmıyor.',
      },
      {
        id: '20260917-gorunum-dugmesi',
        tur: 'duzeltme',
        metin: 'KÖY GÖRÜNÜM DÜĞMESİ ARTIK KENDİNİ TANITIYOR. İki '
          + 'küçük ikon vardı ve telefonda hangisinin ne yaptığı '
          + 'belirsizdi; artık seçili görünümün adı yanında yazıyor '
          + '(SAHNE / KART).',
      },
    ],
  },
  {
    surum: '2026-09-17c',
    tarih: '17 Eylül 2026',
    baslik: 'Köye kart görünümü geldi',
    notlar: [
      {
        id: '20260917-kart-gorunumu',
        tur: 'yenilik',
        metin: 'KÖY EKRANINA İKİNCİ BİR GÖRÜNÜM EKLENDİ. Sol üstteki iki '
          + 'düğmeyle hex sahne ile KART LİSTESİ arasında geçiş '
          + 'yapabiliyorsun. Kart görünümünde üstte kategori sekmeleri '
          + '(İşleme, Askeri, Depo…), altta binalar tam genişlik '
          + 'görselli kartlar hâlinde. Karta basmak hex\'e basmakla '
          + 'aynı paneli açıyor — hiçbir şey değişmiyor, yalnız binaya '
          + 'ulaşma yolu.',
      },
      {
        id: '20260917-kart-bos-alan',
        tur: 'yenilik',
        metin: 'BOŞ ALAN AYRI BİR SEKME. Nereye inşa edebileceğini '
          + 'görmek için köyü gözle taramak gerekmiyor; boş araziler '
          + 'tek listede ve MERKEZE YAKINLIĞA göre sıralı, çünkü '
          + 'üretim çarpanı halkaya bağlı — merkeze yakın slot daha '
          + 'verimli.',
      },
      {
        id: '20260917-kart-telefon',
        tur: 'yenilik',
        metin: 'TELEFONDA VARSAYILAN KART GÖRÜNÜMÜ. Hex sahne dikeyde '
          + 'yerin yarısını boş bırakıyor ve küçük ekranda doğru '
          + 'altıgene basmak zordu. Tercihini bir kez seçersen '
          + 'saklanıyor ve varsayılanı eziyor.',
      },
    ],
  },
  {
    surum: '2026-09-17b',
    tarih: '17 Eylül 2026',
    baslik: 'Kahraman sefere neden katılmıyor',
    notlar: [
      {
        id: '20260917-kahraman-sessiz-dusme',
        tur: 'duzeltme',
        metin: 'KAHRAMAN SESSİZCE GERİDE KALIYORDU. Kutuyu işaretleyip '
          + 'sefer yolladığında kahraman uygun değilse ordu onsuz '
          + 'gidiyor ama sana hiçbir şey söylenmiyordu — kahramanını '
          + 'yolladığını sanıp savaşı kahramansız veriyordun. Artık '
          + 'gönderim ekranında "Kahraman gitmedi" uyarısı ve sebebi '
          + 'yazıyor.',
      },
      {
        id: '20260917-kahraman-bulundugu-koy',
        tur: 'yenilik',
        metin: 'KAHRAMAN BULUNDUĞU KÖYDEN SEFERE ÇIKIYOR. Eskiden '
          + 'yalnız konağının olduğu köyden yollanabiliyordu; başka '
          + 'köyüne takviyeye gönderdiysen oradan sefere çıkaramıyor, '
          + 'geri çağırmak zorunda kalıyordun. Artık fiilen hangi '
          + 'köydeyse oradan yürüyor. Ayrıca "başka köyde" uyarısı '
          + 'artık HANGİ köy olduğunu adıyla söylüyor.',
      },
      {
        id: '20260917-kahraman-bonus-dogrulama',
        tur: 'duzeltme',
        metin: 'KAHRAMANIN SALDIRI BONUSU ÖLÇÜLDÜ VE KİLİTLENDİ. '
          + 'Saldırı Puanı kahramanın kendi vuruşu olarak orduya ham '
          + 'ekleniyor; SALDIRI BONUSU ise ordunun TAMAMINI yüzdeyle '
          + 'çarpıyor — ikisi birlikte çalışıyor, yani yüzde '
          + 'kahramanın kendi gücünü de kapsıyor. Hatırlatma: Saldırı '
          + 'Bonusu bir SKİL; puan dağıtmadıysan ordu yüzden %0 olur '
          + 've kahraman yalnız kendi vuruşunu ekler.',
      },
    ],
  },
  {
    surum: '2026-09-17a',
    tarih: '17 Eylül 2026',
    baslik: 'Elçilik artık birliğin merkezi',
    notlar: [
      {
        id: '20260917-elcilik-sekmeler',
        tur: 'yenilik',
        metin: 'ELÇİLİK DÖRT SEKMEYE AYRILDI: ÜYELER · DİPLOMASİ · '
          + 'GÜNLÜK · PROFİL. Her sekme bir soruya cevap veriyor: kim '
          + 'var, kimle ne durumdayız, ne oldu, biz kimiz.',
      },
      {
        id: '20260917-diplomasi',
        tur: 'yenilik',
        metin: 'DİPLOMASİ GELDİ. Birlikler birbirine KONFEDERASYON ya '
          + 'da SALDIRMAZLIK teklif edebiliyor (ikisi de karşılıklı '
          + 'onay ister) ya da SAVAŞ ilan edebiliyor — savaş tek '
          + 'taraflıdır, karşı tarafın onayı gerekmez. Hamleleri '
          + 'yalnız Konung yapar. İki birlik arasında tek ilişki '
          + 'olabilir: saldırmazlığı olan bir birliğe savaş ilan '
          + 'etmek anlaşmayı da bozar. UYARI: anlaşmalar saldırıyı '
          + 'ENGELLEMEZ, söz verir — bedeli itibardır, oyunun kuralı '
          + 'değil.',
      },
      {
        id: '20260917-uye-olculeri',
        tur: 'yenilik',
        metin: 'ÜYE LİSTESİ ARTIK BİR ŞEY SÖYLÜYOR. Her satırda '
          + 'çevrimiçi noktası, köy sayısı, nüfus ve savaş puanları '
          + 'var. Saldırı/savunma, üyenin şimdiye kadar ÖLDÜRDÜĞÜ '
          + 'asker — mevcut ordu değil; kimin kaç askeri olduğu yine '
          + 'ancak keşifle öğrenilir.',
      },
      {
        id: '20260917-birlik-gunlugu',
        tur: 'yenilik',
        metin: 'BİRLİK GÜNLÜĞÜ TUTULUYOR. Kim katıldı, kim ayrıldı, '
          + 'kimi kim çıkardı, kim Jarl oldu, hangi savaş kim '
          + 'tarafından ilan edildi — hepsi tarihiyle yazılıyor. '
          + '"Neden atıldım" sorusunun artık bir cevabı var.',
      },
      {
        id: '20260917-birlik-profili',
        tur: 'yenilik',
        metin: 'BİRLİK PROFİLİ VE SIRALAMASI. Konung ve Jarl birliğin '
          + 'tanıtım metnini yazabiliyor; profil sekmesinde birliğin '
          + 'toplam üye, köy, nüfus ve savaş puanları ile bütün '
          + 'birlikler arasındaki sırası duruyor. Diplomasi '
          + 'sekmesindeki liste de nüfusa göre sıralı.',
      },
    ],
  },
  {
    surum: '2026-09-16q',
    tarih: '16 Eylül 2026',
    baslik: 'Eşya çerçeveleri kırpıldı',
    notlar: [
      {
        id: '20260916-esya-cercevesi',
        tur: 'duzeltme',
        metin: 'İKİ EŞYANIN KENDİ ÇERÇEVESİ VARDI. Kuzey Rüzgarı bir '
          + 'tablo çerçevesinin içinde, Zincir Etek açık renkli bir '
          + 'kenarlıkla duruyordu; öteki yirmi sekiz eşyanın zemini '
          + 'kenara kadar düz gidiyor. Çerçeveler kırpıldı, ikisi de '
          + 'artık ötekilerle aynı görünüyor.',
      },
    ],
  },
  {
    surum: '2026-09-16p',
    tarih: '16 Eylül 2026',
    baslik: 'Eşya görselleri aynı yöne bakıyor',
    notlar: [
      {
        id: '20260916-esya-yonu',
        tur: 'duzeltme',
        metin: 'EŞYALARIN YÖNÜ DÜZELDİ. Atların ikisi sağa, dördü sola '
          + 'bakıyordu; çizmelerin burnu da atların ters yönündeydi. '
          + 'Kuşam ızgarasında yan yana duran iki eşyanın birbirine '
          + 'ters bakması göze batıyordu. Artık yönü belli olan her '
          + 'eşya sola bakıyor.',
      },
    ],
  },
  {
    surum: '2026-09-16o',
    tarih: '16 Eylül 2026',
    baslik: 'Kahraman görevleri',
    notlar: [
      {
        id: '20260916-kahraman-gorevleri',
        tur: 'yenilik',
        metin: 'GÖREV ZİNCİRİNE İKİ KAHRAMAN ADIMI EKLENDİ. "Yola Çık" '
          + 'ilk maceranı tamamlamanı, "Kuşan" da maceradan düşen bir '
          + 'eşyayı kahramanına takmanı istiyor. İkisi de yan hedef — '
          + 'ana hattı kesmiyor. Macera kahramanın eşya bulabildiği '
          + 'tek yol, eşya da çantada dururken hiçbir işe yaramıyor; '
          + 'bu iki adım o ikisini gösteriyor.',
      },
    ],
  },
  {
    surum: '2026-09-16n',
    tarih: '16 Eylül 2026',
    baslik: 'Grup mesajları',
    notlar: [
      {
        id: '20260916-grup-mesajlari',
        tur: 'yenilik',
        metin: 'KONULU GRUP MESAJLARI GELDİ. Mesajlar ekranında artık '
          + 'iki bölüm var: KİŞİLER ve GRUPLAR. Yeni grup açarken önce '
          + 'bir konu yazıyorsun ("Defans çağrısı" gibi), sonra ya '
          + 'listeden oyuncu seçiyorsun (en çok 20) ya da tek '
          + 'işaretle BÜTÜN BİRLİĞİNİ. Aynı birlik için istediğin '
          + 'kadar ayrı konu açabilirsin — savunma çağrısı sohbetin '
          + 'içinde kaybolmuyor.',
      },
      {
        id: '20260916-birlik-yazismasi',
        tur: 'yenilik',
        metin: 'BİRLİK YAZIŞMASI BİRLİĞİN KENDİSİNE BAĞLI: birliğe '
          + 'katılan konuyu hazır bulur, birlikten çıkan aynı anda '
          + 'erişimini kaybeder. Listede yeşil şeritle işaretli — '
          + 'yazdığının bütün birliğe gittiğini bir bakışta '
          + 'görüyorsun. Birlik yazışmasından tek tek ayrılmak yok; '
          + 'özel gruptan AYRIL ile çıkabilir, kurduğun grubu '
          + 'DAĞIT ile kapatabilirsin.',
      },
    ],
  },
  {
    surum: '2026-09-16m',
    tarih: '16 Eylül 2026',
    baslik: 'Üretim zinciri, elçilik listesi ve eşya kartı',
    notlar: [
      {
        id: '20260916-uretim-durdu-sebebi',
        tur: 'duzeltme',
        metin: 'İŞLEME BİNASI NEDEN DURDUĞUNU SÖYLÜYOR. Tam kadrolu '
          + 'bir değirmen hiçbir şey üretmeyebiliyordu ve ekranda '
          + 'sebep yazmıyordu. Artık binanın kartında yazıyor: '
          + '"un deposu dolu — yer açılana kadar tahıl harcanmıyor" '
          + 'ya da "tahıl bitti — tarlalara işçi at". Değirmen '
          + 'DEPODAKİ tahılı zaten işliyordu; tarlada işçi olmasa bile '
          + 'ambardaki stok un oluyor.',
      },
      {
        id: '20260916-ambar-buyudu',
        tur: 'denge',
        metin: 'AMBAR İKİ KATINDAN FAZLA BÜYÜDÜ: 2.500 → 6.000 taban, '
          + 'her seviye +1.250 yerine +3.000. Tahıl deposu una ve '
          + 'ekmeğe göre beş kat büyüktü, yani değirmen birkaç saatte '
          + 'ambarı doldurup duruyordu. Artık oran 1:2.',
      },
      {
        id: '20260916-depo-tavani-tek-kaynak',
        tur: 'duzeltme',
        metin: 'DEPO TAVANI EKRANDA YANLIŞ YAZIYORDU. Kereste için '
          + '200 gösterilirken gerçek tavan 800\'dü; sayı iki ayrı '
          + 'yerde hesaplanıyor ve biri eski değerlerde kalmıştı. '
          + 'Artık tek kaynaktan geliyor.',
      },
      {
        id: '20260916-elcilik-oyuncu-listesi',
        tur: 'yenilik',
        metin: 'ELÇİLİKTE OYUNCU LİSTESİ VE ARAMA. Davet için oyuncunun '
          + 'adını tam olarak yazmak gerekiyordu — adı bilmiyorsan '
          + 'kimseyi davet edemiyordun. Artık liste geliyor, içinde '
          + 'arama var ve her satırın kendi DAVET düğmesi. Satır kimin '
          + 'hangi birlikte olduğunu ve daveti zaten gönderdiysen '
          + 'bunu da söylüyor.',
      },
      {
        id: '20260916-amblem-kayboluyordu',
        tur: 'duzeltme',
        metin: 'BİRLİK KURARKEN AMBLEMLER GÖRÜNMÜYORDU. Amblem listesi '
          + 'bağlantıdan birkaç saniye sonra boşalıyordu; seçici '
          + 'bomboş bir satıra dönüyordu. Artık on iki amblem de '
          + 'yerinde duruyor.',
      },
      {
        id: '20260916-esya-karti-nadirlik',
        tur: 'duzeltme',
        metin: 'EŞYA KARTI GERİ GELDİ. Kahraman eşyasının üstüne '
          + 'gelince tek satırlık "çıkarmak için tıkla" balonu '
          + 'çıkıyordu; eşyanın özellikleri kayıptı. Artık kartın '
          + 'tamamı geri geldi ve eşyanın nadirlik rengine boyandı — '
          + 'efsanevi bir eşyanın kartı bir bakışta efsanevi '
          + 'görünüyor.',
      },
    ],
  },
  {
    surum: '2026-09-16l',
    tarih: '16 Eylül 2026',
    baslik: 'Kahraman eşyalarının görselleri',
    notlar: [
      {
        id: '20260916-slot-simgeleri',
        tur: 'yenilik',
        metin: 'BOŞ KUŞAM SLOTLARININ KENDİ SİMGELERİ VAR. Eşya '
          + 'takılmamış slotlar ince çizgi ikonları gösteriyordu; '
          + 'artık her slotun Nord silueti duruyor — miğfer, kılıç, '
          + 'zırh, kalkan, bileklik, pantolon, çizme ve at. Simgeler '
          + 'slotun rengini alıyor, yani slot sönükken sönük, '
          + 'seçiliyken vurgulu görünüyor; sürüklediğin eşya o slota '
          + 'uymuyorsa yine soluyor. Kolyenin görseli henüz yok, o '
          + 'slot şimdilik eski ikonuyla duruyor.',
      },
      {
        id: '20260916-degirmen-kilidi',
        tur: 'duzeltme',
        metin: 'DEĞİRMEN KİLİDİ AÇILDI — yeni köyün ikinci çıkışsız '
          + 'odası. Değirmen Ana Bina Lvl 3 istiyordu, Ana Bina’nın '
          + 'yükseltmesi ise 120 tuğla: yani HAM kaynakla çalışan bir '
          + 'binaya ulaşmanın yolu işlenmiş maldan geçiyordu. İşlenmişi '
          + 'biten köy değirmen kuramıyor, kuramadığı için un ve ekmek '
          + 'üretemiyordu. Değirmenin şartı artık yalnızca TAHIL '
          + 'TARLASI: köy zaten iki tahıl tarlasıyla başladığı için '
          + 'şart doğuştan sağlanmış oluyor. Fırının şartı (değirmen '
          + 'Lvl 3) duruyor — değirmenin yükseltmesi ham olduğu için o '
          + 'zincir ham kaynakla kapanıyor. Kural şu: KÖYÜN ÜRETİM '
          + 'BİNALARI TARLALARDAN TOPLANANLA GELİŞİR. Altı üretim '
          + 'binasının da (keresteci, tuğlacı, taşçı, demirci, '
          + 'değirmen, fırın) hem kuruluşu hem her seviyedeki '
          + 'yükseltmesi zaten ham kaynak istiyordu; eksik olan tek şey '
          + 'ön koşul zinciriydi.',
      },
      {
        id: '20260916-esya-gorselleri-buyuk',
        tur: 'yenilik',
        metin: 'KUŞAM SLOTLARINDA GÖRSEL ARTIK KAREYİ KAPLIYOR. Resim '
          + '38 pikselde duruyordu, yani 108 piksellik hücrenin üçte '
          + 'birini bile doldurmuyor ve eşya tanınmıyordu. Şimdi görsel '
          + 'hücrenin tamamını kaplıyor, eşyanın adı da resmin ÜSTÜNDE '
          + 'alt şeritte duruyor. Ad her zaman okunur kalsın diye alt '
          + 'kenarda yukarı doğru saydamlaşan koyu bir dolgu var: '
          + 'arkadaki resim ister kar ister gümüş olsun yazı seçiliyor. '
          + 'Çerçeve rengi yine nadirliği söylüyor.',
      },
      {
        id: '20260916-esya-gorselleri',
        tur: 'yenilik',
        metin: 'KAHRAMAN EŞYALARININ ARTIK GERÇEK GÖRSELLERİ VAR. '
          + 'Otuz eşyanın hepsi — dokuz slotun tamamı ve diriltme '
          + 'iksiri — çizgi ikonu yerine kendi resmiyle görünüyor; hem '
          + 'çantada hem kuşam ızgarasında. Çerçeve rengi yine '
          + 'nadirliği söylüyor, yani "bu ne" ile "bu ne kadar iyi" '
          + 'sorularının ikisi de bir bakışta cevaplanıyor. Görseli '
          + 'olmayan bir eşya eklenirse sessizce eski ikona düşüyor, '
          + 'yani ekran hiçbir aşamada bozulmuyor.',
      },
    ],
  },
  {
    surum: '2026-09-16k',
    tarih: '16 Eylül 2026',
    baslik: 'ELÇİLİK VE BİRLİK',
    notlar: [
      {
        id: '20260916-birlik-geldi',
        tur: 'yenilik',
        metin: 'BİRLİKLER GELDİ. Yeni bina ELÇİLİK (Ana Bina Lvl 3 ister): '
          + 'karlı bir uzun ev, cephesinde klan sancakları, çatısında '
          + 'kuzgun. Elçiliği olan oyuncu kendi birliğini kurar — adını '
          + 've amblemini seçer, sonra oyuncu adı aratıp davet gönderir. '
          + 'Karşı taraf kabul ederse birliğe katılır. SEVİYE ÜYE '
          + 'TAVANIDIR: her seviye 3 üye, yani Lvl 1 de üç kişilik bir '
          + 'çete, Lvl 20 de 60 kişilik bir hanedan. Tavanı birliğin '
          + 'kurucusunun elçiliği belirler; üyelerin elçilikleri '
          + 'toplanmaz, yoksa her yeni üye tavanı da açar ve tavan diye '
          + 'bir şey kalmazdı.',
      },
      {
        id: '20260916-birlik-rutbeler',
        tur: 'yenilik',
        metin: 'RÜTBELER İSKANDİNAV TOPLUM DÜZENİNDEN: KONUNG, JARL, '
          + 'KARL. Rígsþula da üç sınıf geçer — Jarl (soylu), Karl (hür '
          + 'adam), Þræll (köle); üstlerinde de Konungr (kral) durur. '
          + 'Þræll i almadık, oyuncu köle değil. Konung birliğin '
          + 'kurucusu: üye alır, atar, Jarl seçer, birliği dağıtır, adını '
          + 'değiştirir. JARL en fazla İKİ kişi olur; davet gönderebilir '
          + 've Karl atabilir ama Jarl atayamaz, birliği dağıtamaz. KARL '
          + 'birliğin hür adamı. Konung birlikten AYRILAMAZ — önce '
          + 'dağıtması gerekir, yoksa birlik kralsız kalır ve kimse '
          + 'davet gönderemez, kimse atamaz.',
      },
      {
        id: '20260916-birlik-harita',
        tur: 'yenilik',
        metin: 'HARİTADA BİRLİK GÖRÜNÜYOR. Birlik arkadaşlarının toprağı '
          + 'PARLAK YEŞİL çerçeveyle çizilir; iki birlik üyesinin alanı '
          + 'yan yana geldiğinde aralarındaki sınır KOYU YEŞİL olur, '
          + 'yani birliğin nerede bittiği ve içeride kimin nerede '
          + 'olduğu tek bakışta okunur. Kendi toprağın, NPC gri ve rakip '
          + 'oyuncu renkleri değişmedi — birlik yeşili yalnız çerçeveye '
          + 'biner, köyün kendi rengi yerinde kalır.',
      },
      {
        id: '20260916-birlik-saldiri-serbest',
        tur: 'yenilik',
        metin: 'BİRLİK SALDIRIYA KARŞI KORUMA DEĞİL. Birlik arkadaşına '
          + 'saldırmak SERBESTTİR ve bu bilinçli bir karar: birlik bir '
          + 'askerî anlaşma değil, bir kimlik ve iletişim çatısı. '
          + 'Saldırıyı yasaklasaydık birlik aynı zamanda bir '
          + 'saldırmazlık paktına dönüşür ve oyuncular birliği yalnız o '
          + 'yüzden kurardı. Elçilik ekranında da yazıyor ki kimse '
          + 'korunduğunu sanıp savunmasını ihmal etmesin.',
      },
      {
        id: '20260916-insa-isci-tavani',
        tur: 'duzeltme',
        metin: 'YENİ BİNAYA ÇOK İŞÇİ VERİNCE SEBEP YAZIYOR. Yeni bir '
          + 'binaya en fazla 2 inşaat işçisi verilebiliyor ama fazlasını '
          + 'isteyince ekran sadece "İnşa edilemedi." diyordu, sebebini '
          + 'söylemiyordu. Artık kaç işçi verilebileceğini yazıyor.',
      },
    ],
  },
  {
    surum: '2026-09-16j',
    tarih: '16 Eylül 2026',
    baslik: 'Moral kalktı · göçmenler dönüyor · ekipman süreleri uzadı',
    notlar: [
      {
        id: '20260916-moral-kaldirildi',
        tur: 'denge',
        metin: 'MORAL BONUSU KALDIRILDI. Saldıranın nüfusu savunandan '
          + 'büyük olduğunda savunana ek savunma veriliyordu (en çok '
          + '%50). Artık nüfus oranının savaşa hiçbir etkisi yok — '
          + 'savaşı yalnız ordular, ekipman, sur ve kahraman belirliyor. '
          + 'Somut etki: 500 Fjordvakt ile 200 Spydvakt savunmaya '
          + 'saldırırken on kat büyük bir oyuncu 126 asker kaybediyordu, '
          + 'artık eşit nüfuslu biriyle aynı şekilde 69 kaybediyor. '
          + 'Büyük oyuncunun küçüğe saldırısı ucuzladı.',
      },
      {
        id: '20260916-gocmen-geri-donuyor',
        tur: 'duzeltme',
        metin: 'GÖÇMENLER ARTIK YOK OLMUYOR. Yerleşime gönderdiğin '
          + 'göçmenler vardıklarında araziyi dolu bulurlarsa kayboluyordu. '
          + 'Göçmen köşk/saray Lvl 10 istiyor, 240 dakika eğitiliyor ve '
          + 'üçü birden gerekiyor — yani saatlerce biriktirdiğin bir '
          + 'yatırım, senin hatan olmayan bir sebeple (araziyi bu arada '
          + 'başkası kaptı) siliniyordu. Artık geri dönüyorlar ve eve '
          + 'varınca ordunda tekrar sayılıyorlar. Raporda da "köy '
          + 'kurulamadı: arazi bu arada doldu — göçmenler eve dönüyor" '
          + 'yazıyor.',
      },
      {
        id: '20260916-yerlesim-raporu',
        tur: 'duzeltme',
        metin: 'YERLEŞİM RAPORU DOĞRU OKUNUYOR. İki şey bozuktu: '
          + 'raporun sonuç etiketi yerleşimi tanımıyordu, bu yüzden köyü '
          + 'BAŞARIYLA kurduğunda bile "kaybettin" yazıyordu; ayrıca '
          + 'raporun açıklama cümlesi ekranda hiç çizilmiyordu, yani '
          + '"arazi doldu" bilgisi sana hiçbir zaman ulaşmıyordu. Artık '
          + '"köy kuruldu" ya da "köy kurulamadı — göçmenler dönüyor" '
          + 'yazıyor ve açıklama raporun içinde görünüyor.',
      },
      {
        id: '20260916-ekipman-sureleri',
        tur: 'denge',
        metin: 'EKİPMAN YÜKSELTME SÜRELERİ UZADI. Tablodaki dakikalar '
          + 'yanıltıcıydı: gerçek süre atölyeye atadığın işçiye '
          + 'bölünüyor ve silahçı Lvl 20\'de 60 işçi alıyor. Ölçüldü — '
          + '30 işçili bir atölye bir ekipmanı Lvl 20\'ye 23 DAKİKADA '
          + 'çıkarıyordu. Ekipman seviyesi ordunun TAMAMINA işleyen '
          + 'kalıcı bir güç; yarım saatlik bir iş olmamalı. Taban süre '
          + '20\'den 60 oyun dakikasına, seviye çarpanı 1,25\'ten '
          + '1,35\'e çıktı. Yeni ölçüm: 30 işçiyle tam Lvl 20 3,8 saat, '
          + 'son seviye 1 saat, dört ekipmanın hepsi 15,4 saat. Erken '
          + 'oyun aynı kaldı: yeni kurulmuş atölyede ilk yükseltme hâlâ '
          + '2 dakika. Maliyetlere dokunulmadı.',
      },
      {
        id: '20260916-pazar-arama',
        tur: 'yenilik',
        metin: 'AÇIK TEKLİFLERDE ARAMA VE SÜZME. Bütün teklifler tek '
          + 'listede kayıyordu. Artık satıcının VERDİĞİ mala, İSTEDİĞİ '
          + 'mala ve satıcı adına göre süzebiliyorsun; ayrıca "yalnız '
          + 'karşılayabildiklerim" anahtarı kaynağın ve tüccarın yeten '
          + 'teklifleri bırakıyor. Süzgeç açıkken başlıkta "12 / 34" '
          + 'gibi iki sayı duruyor, yani bir şeyin gizlendiğini '
          + 'görüyorsun.',
      },
    ],
  },
  {
    surum: '2026-09-16i',
    tarih: '16 Eylül 2026',
    baslik: 'Üretim skili yüzde oldu · asker yemi muhasebesi',
    notlar: [
      {
        id: '20260916-uretim-skili-yuzde',
        tur: 'denge',
        metin: 'KAHRAMANIN HAMMADDE ÜRETİMİ SKİLİ ARTIK YÜZDE VERİYOR. '
          + 'Eskiden puan başına saatte +3 düz ek veriyordu, yani '
          + 'tavanda +300/saat. Bu tam ters yönde çalışıyordu: yeni '
          + 'köyde (altı Lvl 1 tarla, saatte ~66 odun) üretimi beşe '
          + 'katlıyor, maxlı köyde ise %6,5\'te kalıyordu — yani skil '
          + 'tarla yatırımının ÖDÜLÜ değil, YERİNE geçiyordu. Artık '
          + 'puan başına %0,2, tavan %20. Ölçüldü: maxlı bir merkez '
          + 'köyde tavandaki skil odunda +924/saat, kilde +887, taşta '
          + '+878, demirde +547 ediyor — dört kaynakta toplam '
          + '+3.236/saat. Bonus tarlalarınla birlikte büyüyor, yani '
          + 'tarla yükseltmek artık kahramanı da güçlendiriyor. Tahıla '
          + 'işlemiyor (eski düz ek de işlemiyordu): ekmek oyunun dar '
          + 'boğazı ve kahramanı açlığın çaresi yapmak onu ortadan '
          + 'kaldırırdı.',
      },
      {
        id: '20260916-asker-yemi-muhasebesi',
        tur: 'duzeltme',
        metin: 'MİSAFİR VE YOLDAKİ ASKER ARTIK EKMEK YİYOR. İki delik '
          + 'vardı. Birincisi: takviye olarak gelen asker EV SAHİBİNİN '
          + 'ekmeğini yemesi gerekiyordu ve ekranda öyle yazıyordu ama '
          + 'ambardan HİÇ düşmüyordu — ölçüldü, 10 kendi + 20 misafir '
          + 'askerli köyde ekran 12,50 ekmek/sa diyor, gerçekte 7,50 '
          + 'düşüyordu. Takviye bedava kalkandı ve ekran doğru sayıyı '
          + 'gösterdiği için fark edilmiyordu. İkincisi: YOLDAKİ asker '
          + 'hiçbir köyün faturasına yazılmıyordu; orduyu uzun bir '
          + 'sefere yollayıp ekmek masrafından kaçmak mümkündü. '
          + 'Kural artık tek cümle: BİR ASKER HER ZAMAN BİR KÖYÜN '
          + 'EKMEĞİNİ YER — köyde duruyorsa o köyün, misafirse ev '
          + 'sahibinin, yoldaysa seferi taşıyan köyün. Böylece desteğe '
          + 'gönderdiğin asker VARDIĞI an karşı köyün ekmeğine geçiyor, '
          + 'geri çağırdığın an da senin köyüne dönüyor.',
      },
    ],
  },
  {
    surum: '2026-09-16h',
    tarih: '16 Eylül 2026',
    baslik: 'İkinci köy kilidi açıldı · haritada oyuncu renkleri',
    notlar: [
      {
        id: '20260916-ikinci-koy-kilidi',
        tur: 'duzeltme',
        metin: 'YENİ KÖY ARTIK KİLİTLENMİYOR. Keresteci, tuğlacı, taşçı '
          + 've demirci "Ana Bina Lvl 2" istiyordu; Ana Bina\'nın '
          + 'yükseltmesi ise 35 kereste, 120 tuğla, 60 yontma taş ve '
          + '55 külçe istiyor — yani tam da o dört işliğin ürettiği '
          + 'mallar. Yeni köy 300\'er işlenmiş malla başlıyor ama bu '
          + 'TEK SEFERLİK bir bütçe: tarla yükseltmeleri de aynı '
          + 'maldan yiyor. Oyuncu bütçeyi harcadığı anda ne Ana '
          + 'Bina\'yı yükseltebiliyor ne işliği kurabiliyordu; köy bir '
          + 'daha ASLA işlenmiş mal üretemiyordu. Dört işliğin ön '
          + 'koşulu kaldırıldı: ham kaynak her zaman var (köy altı '
          + 'tarlayla başlıyor ve tarlalar bedava üretiyor), o yüzden '
          + 'ham maliyetli ve koşulsuz bir işlik zinciri köyün zemini.',
      },
      {
        id: '20260916-sessiz-red-kaynak',
        tur: 'duzeltme',
        metin: 'YETERSİZ KAYNAKTA ARTIK SEBEP YAZIYOR. Tarla kur, tarla '
          + 'yükselt, bina kur, bina yükselt — dördü de kaynak '
          + 'yetmediğinde hiçbir şey söylemeden vazgeçiyordu. Düğmeye '
          + 'basıyordun, hiçbir şey olmuyordu ve neden olmadığı '
          + 'yazmıyordu. Artık "Yetersiz kaynak — 10 odun eksik." gibi '
          + 'eksik miktarıyla birlikte söylüyor.',
      },
      {
        id: '20260916-oyuncu-renkleri',
        tur: 'yenilik',
        metin: 'HARİTADA HER OYUNCUNUN KENDİ RENGİ VAR. Bütün oyuncular '
          + 'aynı pembeydi, yan yana iki oyuncunun toprağı ayırt '
          + 'edilemiyordu. Renk artık köy başına değil OYUNCU başına: '
          + 'bir oyuncunun bütün köyleri aynı renk, yani haritaya '
          + 'bakınca "şu adamın toprağı buraya kadar" görünüyor. '
          + 'Dağıtım komşuluğa duyarlı — 9 hex içindeki oyuncular '
          + 'birbirinin rengini almıyor. Anlam katmanı duruyor: kendi '
          + 'toprağın sarı-yeşil, NPC köyleri gri, yeşil tonları '
          + 'yalnız sana ayrılmış durumda.',
      },
      {
        id: '20260916-kaybolan-tarla',
        tur: 'duzeltme',
        metin: 'KOMŞUNUN TARLASI ARTIK KAYBOLMUYOR. İki oyuncunun '
          + 'toprağı yan yana geldiğinde komşunun bazı tarlaları '
          + 'haritadan siliniyordu. Sebep: yabancı köyün toprağı sabit '
          + 'bir halka (yarıçap 2) sayılıyordu, oysa tarlalar o '
          + 'halkanın dışına taşabiliyor — taşan hex senin yayılma '
          + 'sınırına giriyor ve çizim katmanlarının ikisinden de '
          + 'düşüyordu. Artık yabancı köyün GERÇEK tarlaları da onun '
          + 'toprağı sayılıyor. Alanların yan yana olması hâlâ serbest, '
          + 'yalnız hiçbir tarla görünmez olmuyor.',
      },
    ],
  },
  {
    surum: '2026-09-16g',
    tarih: '16 Eylül 2026',
    baslik: 'Takviye saldırı değil · kendi köyüne her kip',
    notlar: [
      {
        id: '20260916-takviye-saldiri-degil',
        tur: 'duzeltme',
        metin: 'DESTEK GÖNDERDİĞİN KÖYDE ARTIK "SALDIRI YOLDA" YAZMIYOR. '
          + 'Gelen sefer uyarısı kipe hiç bakmıyordu: yalnız keşif ve '
          + 'göçmen eleniyordu, dolayısıyla müttefikinin yolladığı '
          + 'TAKVİYE savunanın ekranında kırmızı bir saldırı uyarısı '
          + 'olarak çıkıyordu. Köy değiştiricideki kırmızı tehdit sayacı '
          + 'da aynı şekilde takviyeyi sayıyordu. Takviye listeden '
          + 'ÇIKARILMADI — yardımın yolda olduğunu ve ne zaman '
          + 'varacağını görmen gerek — ama artık YEŞİL ve kalkan '
          + 'simgesiyle, "TAKVİYE gönderiyor" diye duruyor. Kırmızı '
          + 'uyarıyı ve tehdit sayacını yalnız gerçek saldırılar '
          + 'tetikliyor.',
      },
      {
        id: '20260916-uyari-seridi-kapatilabilir',
        tur: 'duzeltme',
        metin: 'SALDIRI UYARISI ŞERİDİ ARTIK KAPATILABİLİYOR. Şerit '
          + 'ekranın üstünde sabit duruyordu ve telefonda genişliğin '
          + 'neredeyse tamamını kapladığı için altına denk gelen '
          + 'düğmelere basılamıyordu — saldırı varana kadar da orada '
          + 'kalıyordu. Sağındaki çarpıya basınca kapanıyor; YENİ bir '
          + 'saldırı yola çıkınca kendiliğinden geri geliyor. Kapatsan '
          + 'da saldırı Seferler sekmesinde duruyor, hiçbir bilgi '
          + 'kaybolmuyor.',
      },
      {
        id: '20260916-kendi-koyune-her-kip',
        tur: 'yenilik',
        metin: 'KENDİ KÖYLERİN ARASINDA HER KİP AÇIK. Önceden kendi '
          + 'köyüne yalnız TAKVİYE gönderebiliyordun; artık yağma, '
          + 'saldırı ve keşif de gidiyor — kendi köyün haritada başka '
          + 'her köyle aynı. Kendi köyünü yağmalamak, tüccar '
          + 'kapasitesini beklemeden ordunun taşıma kapasitesi kadar '
          + 'kaynak taşımanın bir yolu; kendi köyüne saldırmak ise iki '
          + 'taraftaki askerini de öldürür. İkisi de senin bileceğin iş. '
          + 'Tek kural duruyor: İÇİNDE bulunduğun köye sefer '
          + 'gönderemezsin.',
      },
    ],
  },
  {
    surum: '2026-09-16f',
    tarih: '16 Eylül 2026',
    baslik: 'Macera eşyaları ve kendi köyüne destek',
    notlar: [
      {
        id: '20260916-macera-esya-slot-adaleti',
        tur: 'duzeltme',
        metin: 'MACERADAN SÜREKLİ AT DÜŞMESİNİN SEBEBİ BULUNDU. Eşya '
          + 'kurası bütün kuşanılabilir eşyalardan DÜZ çekiyordu; at '
          + 'slotunda 6 eşya var (köy beygiri, zırhlı at, savaş atı, '
          + 'fiyort midillisi, bozkır atı, kuzey rüzgârı), diğer '
          + 'slotlarda 3, kolyede 2. Ölçüldü: düşen her eşyanın '
          + '%20,7 si at çıkıyordu — herhangi bir silahın TAM İKİ '
          + 'KATI. Oysa kahramanın tek at slotu var, ikinci at hiçbir '
          + 'şey ilerletmiyor. Kura artık ÖNCE SLOTU seçiyor, sonra o '
          + 'slottaki eşyayı: her slot eşit sıklıkta düşüyor, at payı '
          + '%20,7 den %11,1 e indi ve kalan sekiz slotun hepsi buna '
          + 'karşılık yükseldi.',
      },
      {
        id: '20260916-macera-esya-orani-2',
        tur: 'denge',
        metin: 'EŞYA DÜŞME ORANLARI BİR KEZ DAHA YÜKSELDİ. Kısa '
          + 'macerada %12 den %22 ye, uzun macerada %22 den %32 ye. '
          + 'Ölçüm: kuşanılabilir bir parça kısa macerada her 9,4 '
          + 'seferde birden her 5,2 seferde bire, uzun macerada her '
          + '2,6 seferden her 1,8 sefere indi. Sebebi şu: ham düşme '
          + 'temposu ile İLERLEME temposu aynı şey değil — düşen '
          + 'eşyaların %56 sı sıradan nadirlikte ve aynı slota ikinci '
          + 'kez sıradan bir parça gelmek hiçbir şeyi değiştirmiyor. '
          + 'Seyrekliği nadirlik kurası taşımalı (efsane hâlâ %1,2), '
          + 'kura temposu değil.',
      },
      {
        id: '20260916-kendi-koyune-destek',
        tur: 'duzeltme',
        metin: 'KENDİ KÖYÜNDEN KENDİ KÖYÜNE DESTEK GÖNDEREBİLİYORSUN. '
          + 'Sunucu buna zaten izin veriyordu ve köy penceresinde '
          + 'DESTEK düğmesi de hazırdı; ama o pencere hiç '
          + 'açılamıyordu. İki ayrı kapı kapalıydı: haritada kendi '
          + 'köyüne tıklamak pencereyi açmak yerine yalnızca haritayı '
          + 'ORTALIYORDU (tek köylü oyundan kalma bir davranış), '
          + 'ayrıca yakın zumda kendi ikinci köyünün tıklanabilir '
          + 'merkezi hiç çizilmiyordu. Artık ortalama yalnız '
          + 'BULUNDUĞUN köye kalıyor; öbür köylerine tıklayınca '
          + 'mesafesini, nüfusunu ve ordusunu gösteren pencere açılıyor '
          +'ve oradan DESTEK ile HAMMADDE gönderiyorsun. Saldırı ve '
          + 'yağma düğmeleri kendi köyünde çıkmıyor — kendi kaynağını '
          + 'kendinden çalmak diye bir şey yok.',
      },
    ],
  },
  {
    surum: '2026-09-16e',
    tarih: '16 Eylül 2026',
    baslik: 'Sade köy görünümü',
    notlar: [
      {
        id: '20260916-sade-koy-gorunumu',
        tur: 'yenilik',
        metin: 'AYARLARA "SADE KÖY GÖRÜNÜMÜ" EKLENDİ (Görünüm sekmesi). '
          + 'Açınca köy merkezindeki bina görselleri kapanıyor ve her '
          + 'hexte binanın AMBLEMİ görselin kapladığı alan kadar büyük '
          + 'çiziliyor. İşçi sayacı ve LVL yazısı da büyüyor: köy artık '
          + 'bir şema gibi okunuyor, hangi binanın hangisi olduğunu ve '
          + 'nerede işçi eksik olduğunu yakınlaşmadan görüyorsun. '
          + 'Görselleri seviyorsan hiçbir şey değişmiyor — ayar '
          + 'varsayılan olarak KAPALI ve tercih tarayıcında saklanıyor.',
      },
    ],
  },
  {
    surum: '2026-09-16d',
    tarih: '16 Eylül 2026',
    baslik: 'Köy sahnesi büyüdü',
    notlar: [
      {
        id: '20260916-koy-sahnesi-buyudu',
        tur: 'yenilik',
        metin: 'KÖY MERKEZİNDEKİ ALTIGEN ARTIK EKRANI DOLDURUYOR. İki '
          + 'sebepten gereksiz küçük kalıyordu. Birincisi ölçeğin tavanı '
          + '1 de kilitliydi: geniş ekranda yer 1,8 kat büyümeye yetse '
          + 'bile sahne doğal boyunda duruyordu. İkincisi sahne BOŞ '
          + 'KUTUYA sığdırılıyordu — kutu kare ama altıgen yerleşimin '
          + 'dikey açıklığı genişliğin √3/2 si kadar, yani üstte ve '
          + 'altta 124 birimlik boşluk vardı ve yükseklik hesabı onu da '
          + 'sayıyordu. Ölçüldü: 1920×1080 ekranda sahne ölçeği 1,00 '
          + 'den 1,30 a çıktı, yani %30 daha büyük — ve tek bir bina '
          + 'bile kırpılmıyor. Dar ekranlarda sahne yine genişliğe göre '
          + 'sığıyor, bir şey değişmedi. İki parmakla yakınlaştırma '
          + 'eskisi gibi çalışıyor.',
      },
    ],
  },
  {
    surum: '2026-09-16c',
    tarih: '16 Eylül 2026',
    baslik: 'Yazı büyütme artık resmi büyütmüyor · Esc · çark simgesi',
    notlar: [
      {
        id: '20260916-olcek-panel-tasmasi',
        tur: 'duzeltme',
        metin: 'YAZI BÜYÜTÜNCE BİNA PANELİ EKRANA SIĞMIYORDU. Yazı '
          + 'büyüklüğünü artırınca açılan bina penceresi devasa oluyor, '
          + 'resim ekranı taşırıyor ve alttaki düğmelere basılamıyordu. '
          + 'Sebep resmin kendisi değildi: pencere boyu ekrandan '
          + 'ölçülüyor ama ölçüm arayüz büyütmesiyle ÇARPILMIŞ geliyordu, '
          + 'yani %200 de pencere ekranın tam iki katı boyunda '
          + 'kuruluyordu. Ölçüm düzeltildi. Artık büyütme yazıları ve '
          + 'yazıların kutucuklarını büyütüyor, bina görseli ise kalan '
          + 'yere sığıyor — yani yazı büyüdükçe resim KÜÇÜLÜYOR (ölçüldü: '
          + '%100 de 732 px, %200 de 549 px). Aynı hata haritada '
          + 'tıklamaları da kaydırıyordu, o da düzeldi.',
      },
      {
        id: '20260916-esc-ile-kapat',
        tur: 'yenilik',
        metin: 'MENÜLER ESC İLE KAPANIYOR. Bina paneli ve yama notları '
          + 'yalnız sağ üstteki çarpıyla kapanıyordu; artık Esc yetiyor. '
          + 'Ayarlar, sefer gönderme, birim kartı ve harita pencereleri '
          + 'zaten Esc ile kapanıyordu.',
      },
      {
        id: '20260916-cark-simgesi',
        tur: 'duzeltme',
        metin: 'AYARLAR SİMGESİ ARTIK GERÇEK BİR ÇARK. Eski çizim bir '
          + 'çember ve sekiz düz ışındı — güneşe benziyordu. Yeni simge '
          + 'dişleri gövdeye bitişik, ortası delik bir dişli.',
      },
    ],
  },
  {
    surum: '2026-09-16b',
    tarih: '16 Eylül 2026',
    baslik: 'Savunan izci artık ölmüyor',
    notlar: [
      {
        id: '20260916-savunan-izci-olmuyor',
        tur: 'denge',
        metin: 'KÖYÜNÜ KORUYAN İZCİ KEŞİFTE ÖLMÜYOR. Keşif bir casus '
          + 'düellosu, savaş değil: riski alan taraf casusunu GÖNDEREN. '
          + 'Nöbetçinin kendi evinde ölmesi için bir sebep yok. '
          + 'Saldıran yine kayıp veriyor ve keşfi geçmek için hâlâ '
          + 'savunmayı aşması gerekiyor — değişen tek şey savunanın '
          + 'izcisinin sağ kalması. SONUCU ÖNEMLİ: izci perden artık '
          + 'AŞINDIRILAMIYOR. Rakip arka arkaya ucuz dalgalar yollayıp '
          + 'izcilerini teker teker kırarak sonunda bedava keşif '
          + 'yapamıyor; her denemede perdeyi tek seferde geçecek kadar '
          + 'casus göndermesi gerekiyor. Bir kez kurduğun nöbet kalıcı. '
          + 'NORMAL SALDIRIDA değişen yok: orada izci ordunun parçası ve '
          + 'öbür askerlerle birlikte kayıp veriyor.',
      },
    ],
  },
  {
    surum: '2026-09-16a',
    tarih: '16 Eylül 2026',
    baslik: 'Seferde mahsur kalan kahraman kurtarıldı',
    notlar: [
      {
        id: '20260916-kahraman-mahsur',
        tur: 'duzeltme',
        metin: 'KAHRAMAN "SEFERDE" YAZILI KALIP BİR DAHA DÖNMÜYORDU. '
          + 'Kahraman orduyla birlikte yürümüyor: savaş biter bitmez '
          + 'üssünde sayılıyor. Ama onu eve alan satır yalnız GERÇEKTEN '
          + 'BİR SAVAŞ olduysa çalışıyordu. Savaşın hiç olmadığı iki yol '
          + 'vardı — seferi ilk 90 saniyede GERİ ÇAĞIRMAK ve hedef köyün '
          + 'yok olması. İkisinde de kahraman sonsuza kadar "seferde" '
          + 'kalıyor, bir daha ne sefere ne maceraya çıkabiliyordu. '
          + 'Artık geri çağırma kahramanı da eve alıyor; ayrıca her '
          + 'saniye çalışan bir emniyet ağı "seferde görünüyor ama onu '
          + 'taşıyan sefer yok" durumunu kendiliğinden onarıyor. Mahsur '
          + 'kalmış kahramanın varsa bu güncellemeyle üssüne döndü.',
      },
      {
        id: '20260916-diger-koy-seferleri',
        tur: 'yenilik',
        metin: 'SEFERLER EKRANI ARTIK BÜTÜN KÖYLERİNİ GÖSTERİYOR. '
          + 'Liste yalnız o an baktığın köyün seferlerini gösteriyordu; '
          + 'ikinci köyünden çıkan ordu hiçbir yerde görünmüyor, görmek '
          + 'için köy değiştirmek gerekiyordu. Alt bölümde "ÖTEKİ '
          + 'KÖYLERİMDEN" başlığıyla hepsi listeleniyor — hangi köyden '
          + 'çıktığı, nereye gittiği ve varışa kalan süre. Geri çağırma '
          + 'yine seferin çıktığı köyden yapılıyor.',
      },
    ],
  },
  {
    surum: '2026-09-15b',
    tarih: '15 Eylül 2026',
    baslik: 'Saldırı ekranındaki tahmin artık titremiyor',
    notlar: [
      {
        id: '20260915-tahmin-titremesi',
        tur: 'duzeltme',
        metin: 'SALDIRI EKRANINDAKİ TAHMİN SATIRI SANİYEDE BİR '
          + 'KAYBOLUYORDU. "Kazanırsın · atak X / savunma Y" satırı '
          + 'çıkıyor, siliniyor, tekrar geliyordu. Sebep: ekran iki '
          + 'sunucu paketi arasında sayaçları akıtmak için köy verisini '
          + 'her saniye yeniden kuruyor ve panel bunu "yeni veri geldi" '
          + 'sanıp tahmini sıfırlıyordu. Artık veriyi içeriğine göre '
          + 'tanıyor: tahmin yalnız gerçekten değiştiğinde yenileniyor. '
          + 'Yan fayda: panel açıkken sunucuya saniyede bir gereksiz '
          + 'hesap isteği gitmiyor.',
      },
      {
        id: '20260915-tahmin-moral',
        tur: 'duzeltme',
        metin: 'TAHMİN ARTIK MORAL BONUSUNU DA SAYIYOR. Savunan senden '
          + 'küçükse gerçek savaşta savunma bonusu alıyor ama tahmin '
          + 'bunu hesaba katmıyordu: ekran "kazanırsın" derken savaş '
          + 'kaybedilebilirdi. Tahmin kutusunun başlığı da hangi keşfe '
          + 'dayandığını yazıyor — tahmin o hedefe yolladığın SON '
          + 'keşfin verisinden çıkıyor, tarihi de yanında.',
      },
    ],
  },
  {
    surum: '2026-09-15a',
    tarih: '15 Eylül 2026',
    baslik: 'Üst kademe birimler yeniden eğitilebiliyor',
    notlar: [
      {
        id: '20260915-kademe-lvl10',
        tur: 'duzeltme',
        metin: 'ÜST KADEME BİRİMLER ARAŞTIRILAMAZ HÂLE GELMİŞTİ — '
          + 'düzeltildi. Kademe kapısı bir önceki sürümde ekipman '
          + 'başına Lvl 5 yapılmıştı (Jernridder Ahır Lvl 20). Ama '
          + 'birimin RÚN SALONU araştırma seviyesi bu kapıdan '
          + 'türetiliyor ve Rún Salonu en fazla Lvl 10 e çıkıyor: Ulv '
          + 'Savaşçısı, Skjoldreiter, Buz Süvarisi, Stormridder ve '
          + 'Jernridder araştırılamaz, yani HİÇ eğitilemez olmuştu. '
          + 'Yeni kapı Lvl 10 da bitiyor: tek ekipmanlı birim Lvl 1, '
          + 'iki ekipmanlı Lvl 4, üç ekipmanlı Lvl 7, dört ekipmanlı '
          + '(Jernridder) Lvl 10. Beşi de yeniden araştırılabiliyor ve '
          + 'en güçlü birimler artık Lvl 10 kışla/ahır ile basılıyor.',
      },
    ],
  },
  {
    surum: '2026-09-14z',
    tarih: '14 Eylül 2026',
    baslik: 'Maceradan daha sık eşya düşüyor',
    notlar: [
      {
        id: '20260914-macera-esya-orani',
        tur: 'denge',
        metin: 'MACERADAN EŞYA DÜŞME ORANI YÜKSELDİ. Ölçüm: kısa '
          + 'macerada kuşanılabilir bir parça ortalama 24 MACERADA BİR '
          + 'geliyordu — kahramanın on küsur slotu düşünülünce bir seti '
          + 'toplamak yüzlerce macera demekti. Artık kısa macerada ~10, '
          + 'uzun macerada ~3 macerada bir parça geliyor. Uzun macera '
          + 'eşya avının asıl yolu: iki ödül çekiyor ve canın dört '
          + 'katını götürüyor, karşılığı bu olmalı. Nadirlik kurası '
          + 'değişmedi — efsanevi hâlâ çok seyrek, ama artık ulaşılabilir.',
      },
      {
        id: '20260914-macera-iksir-orani',
        tur: 'duzeltme',
        metin: 'DİRİLTME İKSİRİ EŞYA DÜŞÜŞÜNÜ BOĞMUYOR. Düşen her beş '
          + 'eşyadan biri iksir çıkıyordu; bu, oyuncunun asıl peşinde '
          + 'olduğu kuşanılabilir eşya oranını görünmeden beşte bir '
          + 'azaltıyordu. İksir oranı %18 den %12 ye indi — ölümün '
          + 'bedeli anlamını koruyor ama eşya avını gölgelemiyor.',
      },
    ],
  },
  {
    surum: '2026-09-14y',
    tarih: '14 Eylül 2026',
    baslik: 'Büyük denge paketi — kademeler, tahıl freni, ön koşullar',
    notlar: [
      {
        id: '20260914-onkosul-agaci',
        tur: 'yenilik',
        metin: 'BİNALARIN ARTIK ÖN KOŞULU VAR. Otuz üç binanın hiçbirinde '
          + 'bağımlılık yoktu: ilk günden saray dikilebiliyordu ve oyunun '
          + '"sıradaki adım ne" hissi yalnız görevlerden geliyordu. Artık '
          + 'Kışla için Ana Bina 3 + Rún Salonu 1, Silahçı için Demirci 3, '
          + 'Ahır için Kışla 3 + Rún Salonu 3 + Lvl 5 tahıl tarlası gibi '
          + 'kapılar var. Menüde bina yine görünüyor ama üstünde neyin '
          + 'eksik olduğu yazıyor — ne kuracağını değil, hangi sırayla '
          + 'kuracağını seçiyorsun.',
      },
      {
        id: '20260914-set-bonusu',
        tur: 'denge',
        metin: 'ÇOK EKİPMANLI BİRİMLER ARTIK GERÇEKTEN DAHA İYİ. Birim '
          + 'gücü ekipmanlarının DÜZ TOPLAMIydı; kaynak başına verim '
          + 'artmadığı için en ucuz birim her rolde en verimliydi ve '
          + 'kademe sistemi tersine çalışıyordu (aynı bütçeyle 10 '
          + 'Fjordvakt, 2,9 Ulv Savaşçısının iki katı güç veriyordu). '
          + 'Artık her ek ekipman parçası birimin savaş değerlerini %4 '
          + 'büyütüyor.',
      },
      {
        id: '20260914-zirh-guclendi',
        tur: 'denge',
        metin: 'ZIRH GÜÇLENDİ, KILIÇ VE MIZRAK PAHALILAŞTI. Ekipmanların '
          + 'kaynak başına verdiği stat 3,3 kat farklıydı: zırh kılıcın '
          + 'üçte biri kadar verimliydi ve en uzun süren ekipmandı, yani '
          + 'zırh giymek hiçbir koşulda mantıklı değildi — zırhlı bütün '
          + 'üst kademe birimler bu yüzden çöptü. Zırhın katkısı 20/5/5 '
          + 'ten 40/12/10 a çıktı; kılıç 16 külçe + 8 kereste, mızrak 8 '
          + 'külçe + 12 kereste, kalkan 13 kereste + 5 külçe oldu. Beş '
          + 'ekipman da artık kaynak başına aynı değeri veriyor.',
      },
      {
        id: '20260914-tahil-freni',
        tur: 'denge',
        metin: 'TAHIL ARTIK GERÇEK BİR FREN. Bir tarla işçisi 77 asker '
          + 'besliyordu ve ordunun hiçbir üst sınırı yoktu. Tarla işçi '
          + 'verimi 32 den 16 tahıl/saate indi ve asker yemeği kademeye '
          + 'bağlandı: tek ekipmanlı 6, Jernridder 12 ekmek/gün. Böylece '
          + 'ucuz birim KAYNAK başına, pahalı birim TAHIL başına verimli '
          + 'oluyor — erken oyunda ucuz birim basıyorsun, ordun büyüyüp '
          + 'darboğaz tahıla kayınca üst kademeye geçmek zorunda '
          + 'kalıyorsun.',
      },
      {
        id: '20260914-isleme-hizi',
        tur: 'denge',
        metin: 'İŞLEME BİNALARI DOKUZ KAT HIZLANDI. Lvl 20 Keresteci (100 '
          + 'işçi × 8 odun) saatte 800 odun işliyordu ama Lvl 20 Orman (42 '
          + 'işçi × 22) 924 odun üretiyordu: maksimum işleme binası tek bir '
          + 'maksimum tarlayı bile yetiştiremiyor, odun zincirinde '
          + 'işçilerinin %73 ü keresteci de oturuyordu. Artık işçi başına '
          + '72 odun → 54 kereste (kayıp oranı AYNI). Ekonominin freni '
          + 'dışarıdaki tarlalar olmalı, içerideki bina değil.',
      },
      {
        id: '20260914-nufus-freni',
        tur: 'denge',
        metin: 'BOŞ İŞÇİ ARTIK BİRİKMİYOR. Nüfus sınırsız büyüyordu ama '
          + 'işçi yerleri yalnız bina yükseltince artıyordu; aradaki fark '
          + 'boş insan olarak yığılıyordu (Ana Bina Lvl 10 günde 456 kişi '
          + 'getiriyor, orta bir köyün toplam ihtiyacı ~260). Artık boş '
          + 'işçi sayısı tampona dayanınca büyüme yavaşlayıp duruyor; '
          + 'asker eğitip sivil tüketince yeniden açılıyor. Ana Bina '
          + 'seviyesi böylece ordu üretim hızının tavanı oldu. Ev in '
          + 'nüfus tavanı da seviye başına 100 den 150 e çıktı. Pazar '
          + 'kervanı da artık 1 işçi tutuyor, dönünce iade ediyor.',
      },
      {
        id: '20260914-acemi-kalkani',
        tur: 'yenilik',
        metin: 'ACEMİ KALKANI ARTIK OYUNCULARA KARŞI DA GEÇERLİ. Koruma '
          + 'yalnız NPC akınını engelliyordu; bir oyuncu, bir günlük '
          + 'acemiyi ilk dakikadan yağmalayabiliyordu. Yeni köy ilk 7 '
          + 'oyun günü ya da nüfusu 200 e ulaşana kadar korunuyor — '
          + 'hangisi önce olursa. İlk saldırını gönderdiğin an kalkan '
          + 'düşüyor ve geri gelmiyor. Kalkanlı köye takviye ve hammadde '
          + 'gönderilebiliyor.',
      },
      {
        id: '20260914-moral',
        tur: 'yenilik',
        metin: 'MORAL BONUSU GELDİ. Küçük oyuncunun büyüğe karşı hiçbir '
          + 'avantajı yoktu. Artık saldıran savunandan ne kadar büyükse '
          + 'savunan o kadar savunma bonusu alıyor: iki katı büyük bir '
          + 'saldırgana karşı %15, on katı büyüğe karşı tavan olan %50. '
          + 'Küçük saldırırsa ceza yok — moral ezileni korumak için var.',
      },
      {
        id: '20260914-kademe-kapisi',
        tur: 'denge',
        metin: 'KIŞLA VE AHIR SEVİYESİ ARTIK GERÇEK BİR KAPI. Jernridder '
          + 'Ahır Lvl 10 da açılıyordu, yani binanın üst on seviyesinin '
          + 'hiçbir amacı yoktu. Yeni kural: tek ekipmanlı birim Lvl 5, '
          + 'iki ekipmanlı Lvl 10, üç ekipmanlı Lvl 15, dört ekipmanlı '
          + '(Jernridder) Lvl 20. Ahırın at deposu da seviye başına 5 ten '
          + '20 ye çıktı — üretim depoyu 6,7 saatte dolduruyordu. Ekipman '
          + 'süreleri de dengelendi: kılıç 4, at 4, mızrak 3,5, kalkan 2, '
          + 'zırh 2 saat.',
      },
      {
        id: '20260914-kule-okcu',
        tur: 'denge',
        metin: 'KULELER YARI OKÇUYLA DOLUYOR. Altı kulenin tamamını Lvl '
          + '20 de doldurmak 480 okçu istiyordu — bir köyün bütün nüfusu. '
          + 'Seviye başına okçu yeri 4 ten 2 ye indi; bonus aynı kaldı, '
          + 'yani aynı savunmayı yarı insanla alıyorsun.',
      },
    ],
  },
  {
    surum: '2026-09-14x',
    tarih: '14 Eylül 2026',
    baslik: 'Büyük denge düzeltmesi — üst seviyeler açıldı',
    notlar: [
      {
        id: '20260914-egri-1-28',
        tur: 'denge',
        metin: 'BİNALARIN ÜST SEVİYELERİ ARTIK GERÇEKTEN VAR. Maliyet ve '
          + 'süre seviye başına farklı hızlarda büyüyordu (süre binaya '
          + 'göre 1,6 ile 2,0 kat, maliyet 1,25 ile 1,70 kat) ve ikisi '
          + 'birbirini tutmuyordu. Sonuç: SUR un son seviyesi tek '
          + 'işçiyle 24,9 YIL sürüyordu, Saray ın Lvl 10 dan sonraki '
          + 'maliyeti ise MAKSİMUM DEPODAN büyük olduğu için kaynak hiç '
          + 'biriktirilemiyordu. On bir binanın gerçek tavanı Lvl 11-15 '
          + 'arasıydı; üstündeki her şey ulaşılamaz içerikti. Artık '
          + 'ikisi de seviye başına 1,28 kat: en pahalı bina bile son '
          + 'seviyesine tek işçiyle 3-4 günde, tam kadroyla 8-9 saatte '
          + 'çıkıyor ve hiçbir yükseltme tek deponun üstüne çıkmıyor. '
          + 'TABAN maliyetler değişmedi — bina sıralaması aynı, yalnız '
          + 'eğri düzeldi.',
      },
      {
        id: '20260914-egri-tasima',
        tur: 'duzeltme',
        metin: 'DEVAM EDEN İNŞAATLARIN SÜRESİ KIRPILDI. Eski eğriyle '
          + 'başlamış bir yükseltme artık var olmayan bir süreyi '
          + 'bekliyordu; kalan süresi yeni formülün tamamından uzun olan '
          + 'her inşaat yeni süreye çekildi. Yalnız kısaltıldı, hiçbir '
          + 'inşaat uzamadı.',
      },
      {
        id: '20260914-izci-yuk-sifir',
        tur: 'denge',
        metin: 'KUZEY İZCİSİ ARTIK GANİMET TAŞIMIYOR (yük 110 → 0). '
          + 'İzci oyunun en ucuz, EN HIZLI ve EN ÇOK TAŞIYAN birimiydi '
          + 'aynı anda: kaynak başına 5,5 yük taşıyordu, ikinci '
          + 'sıradaki Spydvakt 3,67. Yağmanın tek doğru cevabı izci '
          + 'sürüsüydü ve bütün birim kademelerini anlamsız kılıyordu. '
          + 'İzci bilgi getirir, ganimet değil — keşif görevi ve hızı '
          + 'aynen duruyor.',
      },
    ],
  },
  {
    surum: '2026-09-14w',
    tarih: '14 Eylül 2026',
    baslik: 'Haritada her sefer türünün kendi simgesi',
    notlar: [
      {
        id: '20260914-sefer-simgeleri',
        tur: 'yenilik',
        metin: 'HARİTADAKİ YOLDAKİ SEFER ROZETİ artık türüne göre '
          + 'farklı çiziliyor: saldırı KIRMIZI KILIÇ, yağma TURUNCU '
          + 'KILIÇ, takviye YEŞİL KALKAN, keşif BEYAZ DÜRBÜN, göçmen '
          + 'seferi ise buz mavisi ÇADIR. Eskiden hepsi aynı kılıçtı ve '
          + 'yalnız rengi değişiyordu; hangi seferin nereye gittiğini '
          + 'anlamak için rengi ezberlemen gerekiyordu. Rozetin altında '
          + 'kalan süre ve birden çok sefer varsa sayısı yazmaya devam '
          + 'ediyor.',
      },
    ],
  },
  {
    surum: '2026-09-14v',
    tarih: '14 Eylül 2026',
    baslik: 'Merkez taşınınca tarlalar iniyor',
    notlar: [
      {
        id: '20260914-merkez-tasima-kirpma',
        tur: 'denge',
        metin: 'MERKEZİ BAŞKA KÖYE TAŞIRSAN eski merkezin tarlaları Lvl '
          + '10 a iner. Tarlalar yalnız merkezde Lvl 20 ye çıkabiliyor; '
          + 'kırpma olmasaydı merkezi köyden köye taşıyıp bütün '
          + 'köylerinin tarlalarını sırayla 20 ye çıkarabilirdin ve '
          + 'merkez tavanı diye bir şey kalmazdı. Tavanın üstüne çıkan '
          + 'yükseltme varsa iptal ediliyor, ayrılan işçiler havuza '
          + 'dönüyor — harcanan kaynak geri gelmiyor.',
      },
      {
        id: '20260914-merkez-tasima-uyari',
        tur: 'yenilik',
        metin: 'Saray panelindeki MERKEZ YAP düğmesinin üstünde artık '
          + 'kaybın ne olacağı yazıyor: hangi köyde kaç tarlanın kaç '
          + 'seviye ineceği. Geri alınamayan bir kaybı tıkladıktan '
          + 'sonra öğrenmemelisin.',
      },
    ],
  },
  {
    surum: '2026-09-14u',
    tarih: '14 Eylül 2026',
    baslik: 'Haritada yoldaki seferler',
    notlar: [
      {
        id: '20260914-harita-canli-sefer',
        tur: 'yenilik',
        metin: 'HARİTADAKİ KILIÇ artık ŞU AN yolda olan seferini '
          + 'gösteriyor: hedefin üstünde nabız gibi atan bir rozet ve '
          + 'altında varışa kalan süre. Rengi kipi söylüyor — saldırı '
          + 'kırmızı, yağma amber, keşif buz mavisi, takviye yeşil. '
          + 'Sefer varınca rozet kendiliğinden kayboluyor.',
      },
      {
        id: '20260914-harita-tum-koyler',
        tur: 'duzeltme',
        metin: 'Rozet HANGİ KÖYDEN çıktığına bakmıyor: başka köyünden '
          + 'yolladığın sefer de haritada görünüyor. Aynı hedefe birden '
          + 'çok sefer yolladıysan kılıç tek, üstünde sayı ve EN YAKIN '
          + 'varışın süresi yazıyor.',
      },
      {
        id: '20260914-harita-gecmis-yazi',
        tur: 'duzeltme',
        metin: 'Önceki sürümde kılıç GEÇMİŞTE vurduğun köyleri '
          + 'işaretliyordu; saldırmadığın köyde kılıç duruyor, tam o an '
          + 'saldırdığın köyde hiçbir şey çıkmıyordu. Geçmiş kayıt '
          + 'duruyor ama artık yalnız köyün üstüne gelince yazı olarak: '
          + '"1× · kazandım · 50k ganimet".',
      },
    ],
  },
  {
    surum: '2026-09-14t',
    tarih: '14 Eylül 2026',
    baslik: 'Tarla tavanı ve kılıç rozeti düzeltmesi',
    notlar: [
      {
        id: '20260914-tarla-tavani',
        tur: 'denge',
        metin: 'ÜRETİM ALANLARI artık MERKEZ DIŞINDAKİ köylerde en fazla '
          + 'Lvl 10 e çıkıyor; merkez köyde Lvl 20 sınırı sürüyor. '
          + 'Tarlalar her köyde 20 ye çıkabilirken merkez köy diye bir '
          + 'şeyin anlamı kalmıyordu — çoklu köy, birbirinin kopyası '
          + 'yirmi kasabaya dönüşüyordu. Artık ham üretimin ağırlığı '
          + 'merkezde, uçtaki köyler asker ve mevzi için. Zaten Lvl 10 '
          + 'üstündeki tarlaların DÜŞÜRÜLMÜYOR.',
      },
      {
        id: '20260914-kilic-yakin-zum',
        tur: 'duzeltme',
        metin: 'SALDIRI KILICI haritada görünmüyordu: rozet yalnız '
          + 'uzaklaşınca çizilen köy işaretine konmuştu, oysa harita '
          + 'çoğunlukla yakın zumda kullanılıyor ve orada köyler başka '
          + 'bir şekilde çiziliyor. Artık her zumda görünüyor.',
      },
      {
        id: '20260914-kilic-geri-doldurma',
        tur: 'duzeltme',
        metin: 'Bu sürümden ÖNCE yaptığın saldırılar da haritada '
          + 'işaretleniyor: kayıt yoksa eski savaş raporlarından geri '
          + 'dolduruluyor. Yoksa kılıç ancak yeni bir saldırıdan sonra '
          + 'çıkardı ve özellik bozuk görünürdü.',
      },
    ],
  },
  {
    surum: '2026-09-14s',
    tarih: '14 Eylül 2026',
    baslik: 'Kervanlar ve haritada saldırı izleri',
    notlar: [
      {
        id: '20260914-kervan-listesi',
        tur: 'duzeltme',
        metin: 'YOLDAKİ KERVANLARIN artık pazarın üstünde, HER SEKMEDE '
          + 'görünüyor. Liste yalnız "Oyuncu Pazarı" sekmesinde vardı: '
          + 'hammadde gönderen oyuncu gönderiyi yaptıktan sonra '
          + 'kervanını göremiyordu. Ayrıca çok kaynaklı gönderiler '
          + 'listede BOŞ görünüyordu — artık yükün tamamı, kaç tüccarın '
          + 'bağlı olduğu ve kalan süre düzgün yazıyor.',
      },
      {
        id: '20260914-kervan-fazlar',
        tur: 'yenilik',
        metin: 'Kervanın GİDİŞ ve DÖNÜŞ fazları ayrı gösteriliyor: '
          + 'gidişte "malım ne zaman varır", dönüşte "tüccarım ne zaman '
          + 'serbest kalır". Tüccar ancak eve dönünce boşa çıkıyor.',
      },
      {
        id: '20260914-harita-saldiri-izi',
        tur: 'yenilik',
        metin: 'HARİTADA SALDIRDIĞIN KÖYLERİN üstünde artık KILIÇ rozeti '
          + 'var. Kazandığın hedefte kırmızı, kaybettiğinde gri — '
          + 'nereye bir daha gidebileceğini tek bakışta görüyorsun. '
          + 'Aynı köye birden çok vurduysan rozetin altında ×2, ×3 '
          + 'yazıyor; üstüne gelince kaç kez vurduğun, sonucu ve '
          + 'topladığın toplam ganimet çıkıyor.',
      },
    ],
  },
  {
    surum: '2026-09-14r',
    tarih: '14 Eylül 2026',
    baslik: 'Hammadde gönderme ve harita kısayolları',
    notlar: [
      {
        id: '20260914-hammadde-gonder',
        tur: 'yenilik',
        metin: 'ARTIK İSTEDİĞİN OYUNCUYA KARŞILIKSIZ HAMMADDE '
          + 'yollayabiliyorsun. Pazar ekranında yeni HAMMADDE GÖNDER '
          + 'sekmesi var: köy adı ya da oyuncu adı yazıp arıyor, beş '
          + 'kaynağı birden tek kervanla gönderiyorsun. Pazar bugüne '
          + 'kadar yalnız TAKAS yapıyordu — birine bir şey vermek için '
          + 'ondan karşılığında bir şey istemen ve onun da kabul etmesi '
          + 'gerekiyordu.',
      },
      {
        id: '20260914-hammadde-kural',
        tur: 'denge',
        metin: 'Gönderi TEK KERVAN: beş kaynağı ayrı ayrı yollasaydın beş '
          + 'kat tüccar tutardı. Tüccarlar yürüyerek gidip dönüyor ve '
          + 'dönene kadar başka işte kullanılamıyor — uzak müttefike '
          + 'yardım yakına yardımdan pahalı. Yola çıkan mal GERİ '
          + 'ALINAMAZ ve yalnız oyuncu köylerine gidiyor. İki tarafa da '
          + 'rapor düşüyor: alan kimden ne geldiğini, gönderen neyi kime '
          + 'yolladığını görüyor.',
      },
      {
        id: '20260914-harita-kisayollari',
        tur: 'yenilik',
        metin: 'HARİTADA BİR KÖYE TIKLAYINCA artık tek bir "ORDU GÖNDER" '
          + 'düğmesi yerine KISAYOLLAR çıkıyor: SALDIR · YAĞMA · KEŞFET '
          + '· DESTEK · HAMMADDE. Hangisine bastıysan sefer ekranı o '
          + 'kiple açılıyor; eskiden önce ekranı açıp oradaki kipi '
          + 'değiştirmen gerekiyordu. Hammadde kısayolu doğrudan '
          + 'gönderi penceresini hedefi dolu olarak açıyor.',
      },
    ],
  },
  {
    surum: '2026-09-14p',
    tarih: '14 Eylül 2026',
    baslik: 'Savunma yapıları ve simülatörün yeri',
    notlar: [
      {
        id: '20260914-savunma-yapilari-yuzde',
        tur: 'yenilik',
        metin: 'ORDU EKRANINDA yeni bir SAVUNMA YAPILARI bölümü: surun, '
          + 'hendeğin ve HER KULENİN katkısı AYRI AYRI yüzde olarak '
          + 'yazıyor. Bu sayı bugüne kadar yalnız savaş raporunda, üçü '
          + 'toplanmış tek bir sayı olarak görünüyordu — saldırıya '
          + 'uğramadan savunmanı göremiyor, gördüğünde de hangisinin '
          + 'işe yaradığını bilemiyordun.',
      },
      {
        id: '20260914-bos-kule-uyarisi',
        tur: 'yenilik',
        metin: 'BOŞ KULE artık açıkça uyarıyor: kuleye okçu koymadıysan '
          + 'katkısı SIFIR ve kart "dolu olsa +%X" diye kaybettiğin '
          + 'bonusu yazıyor. Kulesi olup okçusu olmayan bir köyde '
          + 'yükseltmeden önce bakılacak ilk yer orası.',
      },
      {
        id: '20260914-simulator-ordu-altinda',
        tur: 'yenilik',
        metin: 'SAVAŞ SİMÜLATÖRÜ üst bardan kalktı, ORDU sekmesinin altına '
          + 'geçti. Simülatör ordunun bir aracı — "bu orduyla ne olur" '
          + 'sorusu ordunun kendisine baktığın yerde sorulur. Üst bar da '
          + 'on bir sekmeyle taşıyordu.',
      },
    ],
  },
  {
    surum: '2026-09-14n',
    tarih: '14 Eylül 2026',
    baslik: 'Keşif raporu ve ölçek düzeltmesi',
    notlar: [
      {
        id: '20260914-kesif-kayip-raporu',
        tur: 'duzeltme',
        metin: 'KEŞİF BAŞARILI OLDUĞUNDA raporda yalnız istihbarat yazıyor, '
          + 'kaç izcini kaybettiğin ve karşında kaç izci olduğu HİÇBİR '
          + 'yerde geçmiyordu — izcilerinin çoğu dönmediğinde sebebini '
          + 'göremiyordun. Artık rapor önce çarpışmayı yazıyor: '
          + 'gönderdiğin casus, karşı casus, kaybın, kimi öldürdüğün ve '
          + 'kaç izcinin geri döndüğü. İstihbarat bunun altında.',
      },
      {
        id: '20260914-olcek-kesilme',
        tur: 'duzeltme',
        metin: 'ARAYÜZ ÖLÇEĞİNİ büyütünce ekran sağdan soldan kesiliyor ve '
          + 'yazılar beklendiği kadar büyümüyordu: düzenin genişliği iki '
          + 'kez küçültülüyordu. Düzeltildi — artık her ölçekte ekranın '
          + 'tamamı kullanılıyor. Üst sınır da %150 den %200 e çıkarıldı; '
          + 'oyunun taban yazıları küçük olduğu için %150 yetmiyordu.',
      },
    ],
  },
  {
    surum: '2026-09-14m',
    tarih: '14 Eylül 2026',
    baslik: 'Ayarlar menüsü ve yazı büyüklüğü',
    notlar: [
      {
        id: '20260914-ayarlar-menusu',
        tur: 'yenilik',
        metin: 'ÜST BARDA DİŞLİ: artık bir AYARLAR menüsü var. Üç sekme — '
          + 'Görünüm, Müzik ve Sesler. Bundan sonraki her ayar buraya '
          + 'girecek. Hoparlör düğmesi yerinde duruyor: tek tıkla '
          + 'susturmak için hâlâ en hızlı yol.',
      },
      {
        id: '20260914-yazi-buyuklugu',
        tur: 'yenilik',
        metin: 'YAZILAR KÜÇÜK GELİYORSA artık büyütebilirsin: Ayarlar → '
          + 'Görünüm → Arayüz ölçeği. %85 ile %200 arası altı hazır adım ve '
          + 'ince ayar kaydırıcısı var. Yalnız yazı değil arayüzün tamamı '
          + 'büyüyor — kutular da birlikte büyüdüğü için sayılar '
          + 'kırpılmıyor. Büyüttükçe ekrana daha az şey sığar.',
      },
      {
        id: '20260914-ses-ayarlari',
        tur: 'yenilik',
        metin: 'SES AYARLARI eklendi: ana ses anahtarı ve seviyesi, altında '
          + 'ON BİR OLAY için AYRI AYRI anahtar ve seviye — saldırı '
          + 'geliyor, savaş sonucu, sefer yola çıktı, asker eğitimi bitti, '
          + 'alet üretimi bitti, inşaat bitti, araştırma bitti, görev '
          + 'ödülü hazır, depo doldu, açlık başladı, yeni mesaj. Ses '
          + 'dosyaları henüz eklenmedi: şimdi yaptığın seçim kaydediliyor '
          + 've dosyalar geldiğinde olduğu gibi işlemeye başlayacak.',
      },
      {
        id: '20260914-bina-panel-aciklama',
        tur: 'yenilik',
        metin: 'KÖY EKRANINDA bir binaya tıklayınca artık NE İŞE YARAR '
          + 'kartı açılıyor: binanın ne yaptığı, sayılarıyla. Yardım '
          + 'menüsündeki metnin aynısı; kartın köşesindeki AYRINTI '
          + 'düğmesi yardım sayfasını doğrudan o binada açıyor.',
      },
      {
        id: '20260914-son-seviye-altin',
        tur: 'yenilik',
        metin: 'SON SEVİYEYE ULAŞMIŞ binaların LVL yazısı artık ALTIN '
          + 'renginde. Tavan binadan binaya değişiyor (lonca 5, Rún Salonu '
          + '10, çoğu 20); artık köy ekranına bakınca hangisinin bittiğini '
          + 'tek tek açmadan görüyorsun. Bina panelinde de SON SEVİYE '
          + 'rozeti var.',
      },
    ],
  },
  {
    surum: '2026-09-14k',
    tarih: '14 Eylül 2026',
    baslik: 'Bina açıklamaları ve görev listesi',
    notlar: [
      {
        id: '20260914-bina-aciklamalari',
        tur: 'yenilik',
        metin: 'OTUZ ÜÇ BİNANIN AÇIKLAMASI baştan yazıldı. Artık her bina '
          + 'ne yaptığını gerçek sayılarla anlatıyor: dönüşüm oranları, '
          + 'kapasite formülleri, neyin neyi kilitlediği ve hangi kaynağın '
          + 'darboğaz olduğu. Yardım menüsünde ve bina panelinde aynı metin '
          + 'görünüyor.',
      },
      {
        id: '20260914-yardim-maliyet-tekrari',
        tur: 'duzeltme',
        metin: 'Yardım menüsünde maliyet İKİ KERE yazıyordu: üstte "İnşa (Lvl 1)" '
          + 've "Yükseltme (Lvl 1 → 2)" satırları, hemen altında da her '
          + 'seviyeyi tek tek veren tablo. Üstteki tekrar kaldırıldı; '
          + 'tablonun başına maliyetin her seviyede kaçla çarpıldığını '
          + 'söyleyen bir satır eklendi. Atölyenin kuşatma kapasitesi de '
          + 'artık yardımda yazıyor.',
      },
      {
        id: '20260914-gorev-bitenleri-gizle',
        tur: 'yenilik',
        metin: 'Görevler ekranına BİTENLERİ GİZLE düğmesi eklendi: ödülü '
          + 'alınmış görevler listeden kalkıyor, sıradaki iş yukarı geliyor. '
          + 'Sayaçlar değişmiyor (42/48 hâlâ 42/48) — gizlemenin amacı '
          + 'listeyi kısaltmak, ilerlemeyi saklamak değil. Tercih '
          + 'tarayıcıda saklanıyor.',
      },
      {
        id: '20260914-erzak-ambari-ad',
        tur: 'duzeltme',
        metin: 'Un ve ekmeği depolayan binanın adı İngilizce kalmıştı '
          + '("Granary"); artık ERZAK AMBARI. Bina, içeriği ve seviyeleri '
          + 'aynı — yalnız adı Türkçeleşti.',
      },
    ],
  },
  {
    surum: '2026-09-14j',
    tarih: '14 Eylül 2026',
    baslik: 'Beş nadirlik sınıfı ve hızlı atlar',
    notlar: [
      {
        id: '20260914-bes-nadirlik',
        tur: 'yenilik',
        metin: 'Kahraman eşyaları artık BEŞ sınıfa ayrılıyor ve çerçeve '
          + 'renginden tanınıyor: gri Sıradan · yeşil Ustaişi · mavi Nadir '
          + '· mor Epik · turuncu Efsanevi. Sınıf yükseldikçe eşyanın '
          + 'bonusu büyüyor (efsanevi, sıradanın 3,6 katı) ama düşme '
          + 'şansı da o kadar azalıyor. Efsanevi eşya ÇOK nadir: düşen '
          + 'her yüz eşyadan yaklaşık biri.',
      },
      {
        id: '20260914-at-hizi-suvari',
        tur: 'denge',
        metin: 'At takan kahraman artık normal bir birimin attan aldığı hız '
          + 'farkını alıyor — yani atlı kahraman bir SÜVARİ kadar hızlı. '
          + 'Yaya kahraman 7, en sıradan atlı 12, efsanevi Kuzey Rüzgârı '
          + 'yaklaşık 19,5. Atın nadirliği hızını daha da artırıyor.',
      },
      {
        id: '20260914-macera-hiz',
        tur: 'yenilik',
        metin: 'MACERALAR artık kahramanın hızına göre kısalıyor: atlı '
          + 'kahraman maceradan da çabuk dönüyor. 6 saatlik uzun macera '
          + 'iyi bir atla 2 saate kadar inebiliyor. Macera kartında hem '
          + 'yeni süre hem üstü çizili eski süre yazıyor.',
      },
    ],
  },
  {
    surum: '2026-09-14i',
    tarih: '14 Eylül 2026',
    baslik: 'Revir: yaralılar zamanla iyileşiyor',
    notlar: [
      {
        id: '20260914-revir-sure',
        tur: 'denge',
        metin: 'Sağlık Çadırındaki yaralılar artık PAT DİYE iyileşmiyor. '
          + 'Yaralı asker çadırda yatıyor ve kendi eğitim süresinin İKİ '
          + 'KATI kadar sürede iyileşip orduna dönüyor. O süre boyunca '
          + 'orduda sayılmıyor: savaşmıyor, yem de yemiyor.',
      },
      {
        id: '20260914-revir-kapasite',
        tur: 'denge',
        metin: 'Çadırın artık YATAK SAYISI var: seviye başına 10, Lvl 20 de '
          + '200. Yataklar doluysa yeni yaralıya yer yok — sığmayanlar '
          + 'ölüyor. Savaş raporu çadırın dolduğunu ve kaç yaralının '
          + 'kaybedildiğini ayrıca yazıyor.',
      },
      {
        id: '20260914-revir-ekran',
        tur: 'yenilik',
        metin: 'SAĞLIK ÇADIRI ekranı artık bir REVİR: yaralılar KART olarak '
          + 'duruyor ve tedavileri KENDİLİĞİNDEN BAŞLAMIYOR. Hangi birliği '
          + 'ayağa kaldıracağına sen karar veriyorsun — kartı seç, '
          + 'İYİLEŞTİR de. Seçilmeyen yaralı çadırda bekler; tedaviye '
          + 'alınan kartta ilerleme çubuğu ve kalan süre görünür.',
      },
    ],
  },
  {
    surum: '2026-09-14h',
    tarih: '14 Eylül 2026',
    baslik: 'Sağlık Çadırı artık çalışıyor',
    notlar: [
      {
        id: '20260914-saglik-cadiri',
        tur: 'yenilik',
        metin: 'SAĞLIK ÇADIRI bugüne kadar kurulabiliyor ama hiçbir şey '
          + 'yapmıyordu. Artık köyün SAVUNULDUĞU savaşlarda ölen '
          + 'askerlerinin bir kısmı yaralı sayılıp çadıra alınıyor: her '
          + 'seviye %2, Lvl 20 de %40. Savaşın sonucunu değiştirmiyor — '
          + 'kazanan belli, çadır yalnız yaralıları topluyor.',
      },
      {
        id: '20260914-saglik-yalniz-savunma',
        tur: 'denge',
        metin: 'Çadır SALDIRIDA işlemiyor: çadır köyde, saldırıda ölen asker '
          + 'günlerce uzakta. Köyünde duran MİSAFİR askerlere de '
          + 'işlemiyor — onlar başka bir oyuncunun askeri, iyileşince '
          + 'senin ordunun parçası olmaları doğru olmazdı.',
      },
    ],
  },
  {
    surum: '2026-09-14g',
    tarih: '14 Eylül 2026',
    baslik: 'Kahraman atlanıyor',
    notlar: [
      {
        id: '20260914-kahraman-hiz',
        tur: 'yenilik',
        metin: 'Kahramanın artık bir HIZI var (yaya 7) ve bunu sadece AT '
          + 'büyütüyor. Tek başına yola çıktığında bu hızla gidiyor; '
          + 'orduyla giderse yine en yavaş birim belirliyor — kahraman '
          + 'orduyu bekler.',
      },
      {
        id: '20260914-kahraman-suvari',
        tur: 'denge',
        metin: 'AT KUŞANIRSAN KAHRAMAN SÜVARİ OLUR ve savaşta atlı gibi '
          + 'vurur; at yoksa yaya askeri gibi. Bu, savunanın atlı/yaya '
          + 'dengesini değiştiriyor: atlı kahramana karşı mızrakçı, yaya '
          + 'kahramana karşı kalkancı işe yarıyor. Sınıf sefer çıkarken '
          + 'donuyor — yolda at çıkarıp dengeyi sonradan kaydıramazsın.',
      },
      {
        id: '20260914-at-cesitleri',
        tur: 'yenilik',
        metin: 'ALTI FARKLI AT var ve her birinin hızı ayrı: Zırhlı At '
          + '(en yavaş, binicisini koruyor) · Köy Beygiri · Savaş Atı '
          + '(vuruyor) · Fiyort Midillisi (iyileştiriyor) · Bozkır Atı '
          + '(maceraları hızlandırıyor) · Kuzey Rüzgârı (en hızlı, savaşa '
          + 'hiçbir şey katmıyor). Tek bir "en iyi at" yok — hız istersen '
          + 'savaştan, güç istersen hızdan vazgeçiyorsun.',
      },
    ],
  },
  {
    surum: '2026-09-14f',
    tarih: '14 Eylül 2026',
    baslik: 'Dayanıklılık eşyaları ve pazar düzeltmesi',
    notlar: [
      {
        id: '20260914-zirhlanma',
        tur: 'yenilik',
        metin: 'Artık ALINAN HASARI AZALTAN eşyalar var: Demir Kalkan, '
          + 'Ayna Zırh, Demir Miğfer, Zincir Etek ve Kutup Tilkisi Postu. '
          + 'Hem macerada hem savaşta işliyorlar. Toplam azaltmanın tavanı '
          + '%50 — iyi kuşanmış kahraman iki kat dayanıklı, ölümsüz değil.',
      },
      {
        id: '20260914-iyilesme-esya',
        tur: 'yenilik',
        metin: 'İyileşmeyi hızlandıran eşyalara Şifa Taşı (+3/sa) eklendi. '
          + 'Zincir Zırh ve Demir Nallı Çizme de iyileşme veriyordu; artık '
          + 'her slotta dayanıklılık seçeneği var.',
      },
      {
        id: '20260914-guc-macera-hasari',
        tur: 'denge',
        metin: 'Kahramanın SALDIRI GÜCÜ macerada da işine yarıyor: güç '
          + 'arttıkça macerada aldığı hasar azalıyor (her 200 güç için %1, '
          + 'en çok %40). Macerada yıpratan şey yol boyunca karşılaştığı '
          + 'tehlike; daha güçlü vuran kahraman onu daha çabuk bertaraf '
          + 'ediyor. Macera kartlarında artık GERÇEK can kaybın yazıyor.',
      },
      {
        id: '20260914-istatistik-kahraman',
        tur: 'yenilik',
        metin: 'İstatistiklere "En güçlü kahraman" tablosu eklendi — '
          + 'kahraman seviyesine göre sıralama.',
      },
      {
        id: '20260914-pazar-yukseltme',
        tur: 'duzeltme',
        metin: 'PAZAR YÜKSELTİLİRKEN TAKAS KAPANIYORDU. Artık mevcut '
          + 'seviyesiyle çalışmaya devam ediyor — tıpkı tarla '
          + 'yükseltilirken üretimin durmaması gibi. Aynı hata sarayda da '
          + 'vardı: saray yükseltilirken merkez taşınamıyordu, o da '
          + 'düzeldi.',
      },
    ],
  },
  {
    surum: '2026-09-14e',
    tarih: '14 Eylül 2026',
    baslik: 'Maceralar, eşyalar ve köyün sonu',
    notlar: [
      {
        id: '20260914-macera',
        tur: 'yenilik',
        metin: 'Kahraman artık MACERAYA çıkıyor. Kahraman Konağında zamanla '
          + 'macera hakkı birikiyor (konak seviyesi hem tavanı hem hızı '
          + 'büyütüyor). Kısa macera az deneyim az risk, uzun macera çok '
          + 'deneyim ciddi yıpranma — kahramanın canına göre seçiyorsun. '
          + 'Deneyim HER ZAMAN geliyor; değişen şey yanında ne geldiği: '
          + 'hammadde, asker ya da EŞYA. Sonuç raporlara düşüyor.',
      },
      {
        id: '20260914-esya',
        tur: 'yenilik',
        metin: 'EŞYA SİSTEMİ geldi. Dokuz kuşam slotu var: miğfer, silah, '
          + 'kalkan, zırh, pantolon, ayakkabı, bileklik, kolye ve at. '
          + 'Eşyanın beş nadirlik kademesi var (gri · yeşil · mavi · mor '
          + '· turuncu) ve nadirlik bonusu ÖLÇEKLİYOR — efsanevi kılıç '
          + 'sıradan kılıcın 3,6 katı. Çantadan slota sürükle ya da tıkla.',
      },
      {
        id: '20260914-esya-birim-bonusu',
        tur: 'yenilik',
        metin: 'Eşyalar iki ayrı şeyi büyütüyor: KAHRAMANI (saldırı, can, '
          + 'iyileşme, macera hızı) ve ORDUYU — tek tek birim sınıflarının '
          + 'saldırı ve savunmasını. "Kule Kalkanı: piyade savunması +%7" '
          + 'gibi. Bu bonus ekipman havuzundan (kılıç/kalkan seviyeleri) '
          + 'AYRI işliyor, ordunun dengesini o taraftan bozmuyor.',
      },
      {
        id: '20260914-kahraman-lvl1-puan',
        tur: 'denge',
        metin: 'Kahraman artık Lvl 1 de DÖRT skil puanıyla doğuyor. Konağı '
          + 'kurar kurmaz ilk kararını verebiliyorsun.',
      },
      {
        id: '20260914-kahraman-tek-basina',
        tur: 'yenilik',
        metin: 'Kahramanı TEK BAŞINA yollayabiliyorsun — yanında asker '
          + 'olmadan saldırıya, yağmaya ya da TAKVİYEYE. Takviyeye '
          + 'gönderdiğinde gittiği köyde kalıyor ve savunma bonusunu ORAYA '
          + 'veriyor; Kahraman ekranından geri çağırana kadar orada. Geri '
          + 'çağırınca bonus HEMEN bitiyor ve kahraman yola çıkıyor — '
          + 'ışınlanmıyor.',
      },
      {
        id: '20260914-kusatma-takviye',
        tur: 'yenilik',
        metin: 'Koçbaşı ve mancınık artık TAKVİYE olarak da gönderilebiliyor. '
          + 'Makineyi müttefikinin ya da kendi sınır köyünün yanına yığıp '
          + 'saldırıyı oradan başlatabilirsin — makine yavaş olduğu için '
          + 'asıl kazanç bu. Orada savunmaya katılmıyorlar, park hâlinde '
          + 'duruyorlar. Yağmada hâlâ yasak.',
      },
      {
        id: '20260914-koy-yikimi-sonu',
        tur: 'denge',
        metin: 'KÖYLERİNİN HEPSİ YIKILIRSA OYUNDAN DÜŞERSİN. Eskiden son köy '
          + 'boş bir kabuk olarak kalıyordu; artık kuşatmanın nihai bir '
          + 'bedeli var. Bir köyün yıkılması için yine de o köydeki BÜTÜN '
          + 'binaların düşmesi gerekiyor — tek dalgada olmuyor.',
      },
    ],
  },
  {
    surum: '2026-09-14d',
    tarih: '14 Eylül 2026',
    baslik: 'Kahraman geldi',
    notlar: [
      {
        id: '20260914-kahraman-temel',
        tur: 'yenilik',
        metin: 'Artık bir KAHRAMANIN var. Kahraman Konağı kurunca doğuyor; '
          + 'konak onun evi — orada iyileşiyor, eşyalarını orada tutuyor ve '
          + 'konağın seviyesi iyileşme hızını belirliyor. Kahraman KÖYE '
          + 'DEĞİL SANA ait: köyün yıkılsa bile kahramanın kalır.',
      },
      {
        id: '20260914-kahraman-skil',
        tur: 'yenilik',
        metin: 'Kahraman savaştıkça deneyim kazanıp seviye atlıyor. Her '
          + 'seviye 4 PUAN veriyor ve bu puanları dört skile dağıtıyorsun: '
          + 'Saldırı Puanı (kendi vuruşu), Saldırı Bonusu (ordunun '
          + 'saldırısına yüzde ek), Savunma Bonusu (köyünün savunmasına '
          + 'yüzde ek) ve Hammadde Üretimi (durduğu köye saatlik kaynak). '
          + 'Yanlış dağıttıysan bedelini ödeyip sıfırlayabiliyorsun — ama '
          + 'her sıfırlama bir öncekinin iki katı tutuyor.',
      },
      {
        id: '20260914-kahraman-sefer',
        tur: 'yenilik',
        metin: 'Kahramanı saldırıya ve yağmaya YANINDA GÖTÜREBİLİYORSUN '
          + '(sefer panelindeki kutu). Tek birim gibi savaşıyor, ordunun '
          + 'gücünü büyütüyor ve savaştan deneyim kazanıyor. Kaybedilen '
          + 'savaş bile deneyim veriyor — yoksa riskli savaş hiç denenmezdi.',
      },
      {
        id: '20260914-kahraman-olum',
        tur: 'denge',
        metin: 'Kahraman ÖLEBİLİR. Canı biterse ölür ve kendiliğinden geri '
          + 'gelmez: ya HAMMADDE ödeyip diriltirsin ya da maceradan düşen '
          + 'DİRİLTME İKSİRİNİ kullanırsın. Hammadde bedeli her seviyede '
          + 'artıyor — ölüm bir gecikme değil, bir bedel. Seviyesi ve '
          + 'eşyaları kaybolmuyor; yarım canla ayağa kalkıyor.',
      },
      {
        id: '20260914-kahraman-rapor',
        tur: 'yenilik',
        metin: 'Savaş raporlarında kahraman AYRI bir satır: ham gücü, '
          + 'orduya kattığı yüzde, kazandığı deneyim ve can kaybı. Sur '
          + 'bonusuyla aynı sayıya karıştırsaydık kahramana yaptığın '
          + 'yatırımın işe yarayıp yaramadığını hiç ölçemezdin.',
      },
    ],
  },
  {
    surum: '2026-09-14c',
    tarih: '14 Eylül 2026',
    baslik: 'Köyler artık yok edilebiliyor',
    notlar: [
      {
        id: '20260914-koy-yikimi',
        tur: 'yenilik',
        metin: 'Bir köy artık HARİTADAN SİLİNEBİLİYOR — ama tek saldırıda '
          + 'değil: yok olması için köydeki BÜTÜN binaların bitmesi gerekiyor. '
          + 'Mancınıkla tek tek düşürerek ya da sahibi kendi eliyle yıkarak. '
          + 'Ana Bina da artık sıfıra inebiliyor; eskiden Lvl 1 tabanı vardı '
          + 've kuşatma bir yerden sonra hiçbir şey değiştirmiyordu.',
      },
      {
        id: '20260914-ana-bina-yikilabilir',
        tur: 'yenilik',
        metin: 'Artık Ana Bina da yıkılabiliyor. Köyün son binasını yıkmaya '
          + 'kalkarsan onay kutusu köyün haritadan silineceğini ayrıca '
          + 'söylüyor — geri dönüşü yok.',
      },
      {
        id: '20260914-son-koy-silinmez',
        tur: 'denge',
        metin: 'SON köyün asla silinmiyor: bütün binaları gitse bile köy boş '
          + 'bir kabuk olarak kalıyor ve yeniden inşa edebiliyorsun. Oyundan '
          + 'tamamen düşmek geri dönüşü olmayan bir ceza olurdu.',
      },
    ],
  },
  {
    surum: '2026-09-14b',
    tarih: '14 Eylül 2026',
    baslik: 'Görevler ikiye ayrıldı',
    notlar: [
      {
        id: '20260914-gorev-iki-bolum',
        tur: 'duzeltme',
        metin: 'Görevler ekranı artık ANA HAT ve YAN HEDEFLER diye ikiye '
          + 'bölündü. Ana hat üstte tek parça duruyor; yan hedefler kendi '
          + 'başlığı altında ve ana hat bitene kadar KAPALI geliyor (tek '
          + 'tıkla açılıyor). 46 maddelik tek liste, hangisini '
          + 'atlayabileceğini ancak her satırı okuyarak anlamana yol açıyordu.',
      },
      {
        id: '20260914-kusatma-malzeme-adi',
        tur: 'duzeltme',
        metin: 'Atölyede üretilen malzemelerin adı "Koçbaşı Parçaları" ve '
          + '"Mancınık Parçaları" oldu. Eskiden ekipmanın adı birimin adıyla '
          + 'neredeyse aynıydı ve panelde hangisinin makine, hangisinin onu '
          + 'yapmak için gereken malzeme olduğu okunmuyordu.',
      },
    ],
  },
  {
    surum: '2026-09-14a',
    tarih: '14 Eylül 2026',
    baslik: 'Misafir askeri geri yollayabilirsin',
    notlar: [
      {
        id: '20260914-misafir-geri-yolla',
        tur: 'yenilik',
        metin: 'Köyünde duran MİSAFİR askeri artık sen de geri yollayabiliyorsun. '
          + 'Ordu ekranında "Köyümde misafir" satırını aç, ne kadarını '
          + 'yollayacağını seç. Neden gerekliydi: misafirin ekmeğini SEN '
          + 'ödüyorsun; oyuna girmeyen bir müttefikin unuttuğu takviye köyünü '
          + 'aç bırakabiliyordu ve çıkış yolu yoktu.',
      },
      {
        id: '20260914-misafir-rapor',
        tur: 'duzeltme',
        metin: 'Takviyen bir köyden geri yollandığında sana rapor geliyor: '
          + 'hangi köy yolladı, kaç asker döndü. Eskiden askerin sebepsiz '
          + 'yolda görünürdü.',
      },
    ],
  },
  {
    surum: '2026-09-13m',
    tarih: '13 Eylül 2026',
    baslik: 'Takviye listesi ve kısmî geri çağırma',
    notlar: [
      {
        id: '20260913-takviye-koy-basina',
        tur: 'duzeltme',
        metin: 'Ordu ekranındaki takviye listesi artık KÖY BAŞINA tek satır. '
          + 'Aynı köye üç kez asker yolladıysan üç satır değil, tek satır ve '
          + 'toplam görüyorsun (yanında kaç sevkiyat olduğu yazıyor).',
      },
      {
        id: '20260913-takviye-kismi',
        tur: 'yenilik',
        metin: 'Takviyeni artık İSTEDİĞİN KADAR geri çağırabiliyorsun. Satırı '
          + 'aç, birim birim sayı ver; kalanlar o köyde savunmaya devam eder. '
          + 'Önce en uzun süredir orada duran asker döner.',
      },
    ],
  },
  {
    surum: '2026-09-13l',
    tarih: '13 Eylül 2026',
    baslik: 'Sekme amblemleri',
    notlar: [
      {
        id: '20260913-sekme-amblemleri',
        tur: 'duzeltme',
        metin: 'Üstteki sekmelerin ikonları elden geçti. Çoğu ya genel bir '
          + 'işaretti ya da başka bir sekmenin ikonuydu — Harita ile Seferler '
          + 'aynıydı, Görevler ile Yardım aynıydı. Artık Köylüler çiftçi, '
          + 'Ordu kılıç, Seferler tekerlek, Görevler kitap, Raporlar parşömen, '
          + 'Mesajlar mektup, İstatistik çubuk grafik, Savaş Simülatörü '
          + 'kılıç+kalkan. Telefonda alt barda yalnız ikon göründüğü için '
          + 'hepsi küçük boyutta okunacak şekilde çizildi.',
      },
    ],
  },
  {
    surum: '2026-09-13k',
    tarih: '13 Eylül 2026',
    baslik: 'Köy adı Ana Binadan',
    notlar: [
      {
        id: '20260913-koy-adi-anabina',
        tur: 'duzeltme',
        metin: 'Köyünün adını artık ANA BİNA panelinden değiştirebiliyorsun. '
          + 'Eskiden yalnız üst sağdaki profil menüsündeydi; kimse orada '
          + 'aramıyordu. Kullanıcı adın kilitli kalmaya devam ediyor, '
          + 'değişen yalnız köyün adı.',
      },
    ],
  },
  {
    surum: '2026-09-13j',
    tarih: '13 Eylül 2026',
    baslik: 'Açlık artık önceden haber veriyor',
    notlar: [
      {
        id: '20260913-aclik-uyarisi',
        tur: 'yenilik',
        metin: 'Ekmeğin eksiye düştüğünde üst barın altında bir uyarı çıkıyor: '
          + 'ne kadar sonra aç kalacağını, SEBEBİNİ ve ne yapman gerektiğini '
          + 'yazıyor. Eskiden açlığı ancak nüfusun erimeye başladıktan sonra '
          + 'fark ediyordun — küçük bir kırmızı rozetten. Ölçüm: yeni bir köy '
          + 'hiçbir şey yapılmazsa 36 oyun saatinde açlığa giriyor, 45. saatte '
          + 'ilk köylüsünü kaybediyor.',
      },
      {
        id: '20260913-aclik-sebep',
        tur: 'duzeltme',
        metin: 'Uyarı zincirin neresinin koptuğunu söylüyor: tahıl tarlasında '
          + 'işçi yok mu, değirmen mi durmuş, fırın mı yok, yoksa ordun köyünün '
          + 'besleyebileceğinden mi büyük. Akış artıya dönünce şerit '
          + 'kendiliğinden kayboluyor.',
      },
    ],
  },
  {
    surum: '2026-09-13i',
    tarih: '13 Eylül 2026',
    baslik: 'Mesajlaşma geldi',
    notlar: [
      {
        id: '20260913-mesajlasma',
        tur: 'yenilik',
        metin: 'Artık diğer oyunculara MESAJ gönderebiliyorsun. Mesajlar '
          + 'sekmesinde yazışmaların OYUNCU BAZINDA gruplanıyor: bir kişiyle '
          + 'olan bütün alışverişin — senin yazdıkların da dahil — tek akışta '
          + 'sırayla duruyor. Okunmamış mesajın varsa sekmede sayaç çıkıyor. '
          + 'YENİ SOHBET ile oyuncuyu listeden seçebilir ya da adını yazıp '
          + 'arayabilirsin.',
      },
      {
        id: '20260913-mesaj-engelle',
        tur: 'yenilik',
        metin: 'Rahatsız eden bir oyuncuyu mesajı açıp ENGELLE ile '
          + 'susturabilirsin. Engellediğin kişi bunu GÖREMEZ — mesajı '
          + 'gönderilmiş gibi görünür ama sana ulaşmaz. Engeli istediğin '
          + 'zaman kaldırabilirsin.',
      },
      {
        id: '20260913-mesaj-silme',
        tur: 'denge',
        metin: 'Mesaj silmek yalnız SENİN kutunu temizler. Gönderdiğin bir '
          + 'mesajı silmen karşı taraftan kaldırmaz; aksi hâlde yazdığı şeyi '
          + 'tek tıkla yok edebilen biri şikâyet edilemezdi. Ayrıca dakikada '
          + '5, saatte 40 mesaj sınırı var.',
      },
    ],
  },
  {
    surum: '2026-09-13h',
    tarih: '13 Eylül 2026',
    baslik: 'Yeni başlayanlar için',
    notlar: [
      {
        id: '20260913-kayit-kullanici-adi',
        tur: 'yenilik',
        metin: 'Kayıt olurken artık kullanıcı adı da seçiyorsun. Bu ad haritada, '
          + 'savaş raporlarında ve sıralamada görünüyor ve SONRADAN '
          + 'DEĞİŞTİRİLEMİYOR — değişebilseydi başkalarının gördüğü geçmiş '
          + 'yalan olurdu. Köyünün adını istediğin zaman değiştirebilirsin.',
      },
      {
        id: '20260913-karsilama',
        tur: 'yenilik',
        metin: 'İlk girişte oyunu anlatan kısa bir karşılama çıkıyor: oyunun '
          + 'amacı, tarlalar, işleme binaları, bina ve asker, görevler. '
          + 'Beş adım, bir kez. Yeni oyuncu 30 hex ve 28 binayla karşılaşıp '
          + 'ne yapacağını bilemiyordu.',
      },
      {
        id: '20260913-gorev-zorunlu',
        tur: 'yenilik',
        metin: 'Görevler 28\'den 46\'ya çıktı ve ZORUNLU / OPSİYONEL diye '
          + 'ayrıldı. Zorunlu görevler ana hattı öğretir — rehber kartı '
          + 'onları gösterir. Opsiyonel görevler yan hedeftir (pazar, '
          + 'taverna, kule, atölye, at); atlayabilirsin. Yeni görevler: '
          + 'işlenmiş mal deposu, tahıl ambarı, zırhçı, hendek, kule, ahır, '
          + 'araştırma, nüfus, kaynak stoğu ve daha fazlası.',
      },
      {
        id: '20260913-gorev-sirasi',
        tur: 'duzeltme',
        metin: 'Görev listesinde ödülü hazır olanlar EN ÜSTTE, ödülü alınmış '
          + 'olanlar EN ALTTA. Eskiden biten görevler tepede birikip sıradaki '
          + 'görevi ekranın dışına itiyordu.',
      },
      {
        id: '20260913-mobil-nufus',
        tur: 'duzeltme',
        metin: 'Telefonda nüfus ve boş işçi sayısı artık üst barda görünüyor. '
          + 'İkisi de çekmecenin içindeydi; işçi atarken ya da asker basarken '
          + 'her seferinde çekmeceyi açman gerekiyordu.',
      },
      {
        id: '20260913-ad-ekrani-duzeltme',
        tur: 'duzeltme',
        metin: 'Adı olmayan hesaplara sorulan "seni ne diye çağıralım" ekranı '
          + 'hiç açılmıyordu: sunucu bilgiyi hesaplıyor ama pakete koymuyordu. '
          + 'Düzeltildi.',
      },
    ],
  },
  {
    surum: '2026-09-13g',
    tarih: '13 Eylül 2026',
    baslik: 'Kuşatma düzeltmeleri',
    notlar: [
      {
        id: '20260913-makine-donmuyordu',
        tur: 'duzeltme',
        metin: 'Mancınık ve koçbaşı saldırıya gidiyor ama GERİ DÖNMÜYORDU. '
          + 'Savaş hesabı bu birimleri (gücü sayılmasın diye) dışarıda '
          + 'bırakırken sağ kalanlar listesinden de düşürüyordu: makineler '
          + 'savaş biter bitmez yok oluyordu. Artık savaştan sağ çıkıp eve '
          + 'dönüyorlar — ama ordunun kaybettiği oranda onlar da ölüyor.',
      },
      {
        id: '20260913-kusatma-raporda',
        tur: 'duzeltme',
        metin: 'Aynı hatanın ikinci yüzü: kuşatma fazı SAĞ KALAN makinelere '
          + 'baktığı için hiçbir şey yıkmıyor, raporda da hiçbir şey '
          + 'yazmıyordu. Artık savaş raporunda "Kuşatma" kutusu çıkıyor: '
          + 'sur kaç seviye indi, hangi bina kaçtan kaça düştü.',
      },
      {
        id: '20260913-kusatma-sadece-saldiri',
        tur: 'denge',
        metin: 'Koçbaşı ve mancınık artık yalnız TAM SALDIRIDA '
          + 'gönderilebiliyor. Yağma vur-kaçtır, keşif izci işidir, '
          + 'takviyede makinenin savunmaya katkısı yok — üstelik makine '
          + 'yavaş olduğu için bütün orduyu boşuna yavaşlatıyordu.',
      },
    ],
  },
  {
    surum: '2026-09-13f',
    tarih: '13 Eylül 2026',
    baslik: 'Seferi geri çağır, kuşatma ayarları',
    notlar: [
      {
        id: '20260913-sefer-geri-cagir',
        tur: 'yenilik',
        metin: 'Yola çıkardığın seferi ilk 90 saniye içinde GERİ ÇAĞIRabilirsin. '
          + 'Seferler listesindeki düğmenin altında kalan süre yazıyor. Ordu '
          + 'gittiği yol kadar geri yürür, ganimet getirmez. Pencere bilerek '
          + 'dar: yanlış köye basmayı kurtarmak için, saldırıyı son anda geri '
          + 'çekmek için değil.',
      },
      {
        id: '20260913-mancinik-iki-hedef',
        tur: 'yenilik',
        metin: 'Atölye Lvl 10 olunca mancınık tek seferde İKİ bina '
          + 'hedefleyebiliyor. Kuşatma gücü bölünür: birinci hedefe %60, '
          + 'ikinciye %40. Yani bedava bir güç değil — tek binaya tam güç mü '
          + 'vuracaksın, iki binaya bölünmüş mü, sen seçiyorsun.',
      },
      {
        id: '20260913-koc-sadece-sur',
        tur: 'denge',
        metin: 'Koçbaşı artık YALNIZ suru indiriyor, hendeğe dokunmuyor. '
          + 'Eskiden surdan artan güç hendeğe geçiyordu ve tek sefer iki '
          + 'savunma yapısını birden siliyordu — hendeğe yatırım yapmanın '
          + 'anlamı kalmıyordu. Artan güç artık boşa gidiyor: kaç koçbaşı '
          + 'göndereceğin gerçek bir hesap.',
      },
      {
        id: '20260913-koc-arastirma',
        tur: 'denge',
        metin: 'Koçbaşı artık Rún Salonu araştırması olmadan üretilemiyor '
          + '(Rún Salonu Lvl 2). Eskiden atölyeyi kurar kurmaz sur kırma '
          + 'makinesi basılabiliyordu; kuşatma bilgisi bedava geliyordu. '
          + 'Atölye şartı değişmedi, Lvl 1 yeterli.',
      },
      {
        id: '20260913-kusatma-stok-rayi',
        tur: 'duzeltme',
        metin: 'Koçbaşı ve mancınık stoğun artık sağ rayda, ekipmanların '
          + 'altında görünüyor. Kaç makinen olduğunu ve atölyenin dolup '
          + 'dolmadığını hiçbir ekrandan göremiyordun. Cephanelik havuzuna '
          + 'girmezler — at gibi kendi kapasiteleri var (atölye seviyesi × 5).',
      },
    ],
  },
  {
    surum: '2026-09-13e',
    tarih: '13 Eylül 2026',
    baslik: 'Destek raporları ve yıkım süresi',
    notlar: [
      {
        id: '20260913-takviye-raporu',
        tur: 'duzeltme',
        metin: 'Bir köye destek yolladığında rapor "saldırdın ve kaybettin" '
          + 'diyordu. Artık gönderdiğinde "o köyü destekledin", sana geldiğinde '
          + '"sana destek gönderdi" yazıyor; rozeti de kırmızı değil yeşil. '
          + 'Raporda gönderilen birlikler ve ekmeğini hangi köyün ödediği var.',
      },
      {
        id: '20260913-takviye-savas-raporu',
        tur: 'yenilik',
        metin: 'Başka bir köydeki takviyen savaşa girdiğinde artık sana da '
          + 'rapor geliyor. Eskiden askerin orada ölüyordu, nüfusun düşüyordu '
          + 've hiçbir ekranda sebebi yazmıyordu. Yeni rapor kaç askerini '
          + 'kaybettiğini, orada kaç askerin kaldığını ve savunmanın tutup '
          + 'tutmadığını söylüyor.',
      },
      {
        id: '20260913-rapor-filtresi',
        tur: 'duzeltme',
        metin: 'Rapor ekranındaki "SALDIRILARIM" sekmesi artık "GİDENLER". '
          + 'Orada saldırı olmayan seferler de var (destek, yerleşim).',
      },
      {
        id: '20260913-kusatma-gorselleri',
        tur: 'yenilik',
        metin: 'Koçbaşı ve mancınığın görselleri geldi — eğitim ekranında ve '
          + 'raporlarda diğer birimler gibi görünüyorlar.',
      },
      {
        id: '20260913-yikim-suresi',
        tur: 'denge',
        metin: 'Bina yıkmak artık anında değil: önce "emin misin" diye soruyor, '
          + 'sonra yıkım o seviyenin inşa süresinin onda biri kadar sürüyor. '
          + 'Yıkım başlar başlamaz personeli işçi havuzuna döner, bina '
          + 'çalışmaz ve yükseltilemez; süre dolunca slot boşalır. Vazgeçersen '
          + '"YIKIMI İPTAL" ile bina yerinde kalır (geçen süre geri gelmez, '
          + 'personelini yeniden atarsın). Henüz bitmemiş bir inşaatı iptal '
          + 'etmek eskisi gibi anında.',
      },
    ],
  },
  {
    surum: '2026-09-13d',
    tarih: '13 Eylül 2026',
    baslik: 'Kuşatma silahları geldi',
    notlar: [
      {
        id: '20260913-kusatma-uretilebilir',
        tur: 'yenilik',
        metin: 'Koçbaşı ve Alev Mancınığı artık gerçekten üretilebiliyor. '
          + 'Birimler tanımlıydı ama gerektirdikleri ekipman hiç yoktu, yani '
          + 'sipariş kuyruğa bile girmiyordu. Atölye bu iki ekipmanı üretiyor; '
          + 'cephanelik havuzunu paylaşmıyorlar, atölyenin kendi kapasitesinde '
          + 'duruyorlar (her seviye +5 makine).',
      },
      {
        id: '20260913-kusatma-savas',
        tur: 'yenilik',
        metin: 'Kuşatma normal savaştan SONRA çalışıyor ve yalnız SALDIRAN '
          + 'KAZANIRSA. Savaşta ölen makine iş yapmaz. Koçbaşı önce suru, '
          + 'artan gücüyle hendeği indiriyor; mancınık senin seçtiğin binayı '
          + 'vuruyor — o bina o köyde yoksa rastgele bir bina.',
      },
      {
        id: '20260913-kusatma-maliyet',
        tur: 'denge',
        metin: 'Yüksek seviye yapıyı yıkmak daha pahalı: bir seviyeyi '
          + 'indirmenin bedeli mevcut seviyeyle artıyor. 10 koçbaşı Lvl 3 '
          + 'suru ve Lvl 2 hendeği sıfırlar; tek koçbaşı Lvl 20 sura hiç '
          + 'dokunamaz. Sur yatırımın boşa gitmiyor.',
      },
      {
        id: '20260913-koy-yikilmaz',
        tur: 'denge',
        metin: 'Mancınık ana binayı Lvl 1\'in altına indiremiyor — köyün tek '
          + 'saldırıda yok olmuyor. Yıkılan binada çalışan işçiler havuza '
          + 'geri dönüyor.',
      },
      {
        id: '20260913-hizli-secim',
        tur: 'yenilik',
        metin: 'Ordu gönderme ekranında TÜM ORDU · SALDIRI · SAVUNMA · '
          + 'TEMİZLE düğmeleri. İzci ve göçmen hiçbirine girmiyor: izci '
          + 'savaşmaz, göçmenin ise saldırısı da savunması da sıfır — savaşa '
          + 'giderse yerleşim hakkın boşa gider.',
      },
    ],
  },
  {
    surum: '2026-09-13c',
    tarih: '13 Eylül 2026',
    baslik: 'Takviye: başka köye savunma gönder',
    notlar: [
      {
        id: '20260913-takviye',
        tur: 'yenilik',
        metin: 'Artık başka bir köye TAKVİYE gönderebiliyorsun. Askerin orada '
          + 'misafir kalıyor ve o köy saldırı alınca savunmaya katılıyor. '
          + 'Kendi köylerin arasında da gönderilebiliyor — kendi köyüne '
          + 'saldıramazsın ama takviye edebilirsin.',
      },
      {
        id: '20260913-takviye-besleme',
        tur: 'denge',
        metin: 'Misafir askerin yemeğini EV SAHİBİ köy ödüyor. Takviye almak '
          + 'bedava kalkan değil: ambarından çıkan gerçek bir yem maliyeti. '
          + 'Saldırıda kayıp önce ev sahibinin ordusundan, artanı '
          + 'misafirlerden düşüyor.',
      },
      {
        id: '20260913-takviye-geri',
        tur: 'yenilik',
        metin: 'Askerini Ordu ekranından geri çağırabiliyorsun — ama '
          + 'ışınlanmıyor, yürüyerek dönüyor. Saldırı gelince tek tuşla geri '
          + 'almak olsaydı takviye risksiz olurdu.',
      },
    ],
  },
  {
    surum: '2026-09-13b',
    tarih: '13 Eylül 2026',
    baslik: 'Üretim sınırları ve tıkanmalar',
    notlar: [
      {
        id: '20260913-run-salonu-isci',
        tur: 'duzeltme',
        metin: 'Rún Salonu\'na işçi atanamıyordu, dolayısıyla HİÇBİR ARAŞTIRMA '
          + 'yapılamıyordu. Aynı hata köşk ve sarayda da vardı: eğitmen '
          + 'atanamadığı için göçmen kuyruğu ilerlemiyordu. Üçü de düzeldi.',
      },
      {
        id: '20260913-50-siniri',
        tur: 'denge',
        metin: 'Bir seferde en fazla 50 asker/ekipman sipariş edilebiliyordu. '
          + 'Sınır kalktı — artık deponun, ekipmanın ve boş işçin ne kadarına '
          + 'yetiyorsa o kadar sipariş verebilirsin.',
      },
      {
        id: '20260913-maks-dugmesi',
        tur: 'yenilik',
        metin: 'MAKS düğmesi: şu an gerçekten üretebileceğin adedi yazıyor. '
          + 'Askerde boş işçi, ekipman ve kaynaktan en küçüğü; ekipmanda '
          + 'kaynak ile DEPODAKİ BOŞ YERDEN küçüğü.',
      },
      {
        id: '20260913-adet-kutusu',
        tur: 'duzeltme',
        metin: 'Adet kutusundaki rakamı silemiyordun; sildiğin an yerine 1 '
          + 'geliyordu. Artık kutu boş kalabiliyor, doğrudan yazabiliyorsun.',
      },
    ],
  },
  {
    surum: '2026-09-13a',
    tarih: '13 Eylül 2026',
    baslik: 'Telefon ve tablet: her ekran elden geçti',
    notlar: [
      {
        id: '20260913-mobil-tarama',
        tur: 'duzeltme',
        metin: 'Dokuz farklı telefon/tablet boyutunda her ekran ve her bina '
          + 'paneli tek tek tarandı. Bulunan erişilemez düğmelerin hepsi '
          + 'düzeltildi — 320 px\'den tablete kadar hepsi temiz.',
      },
      {
        id: '20260913-ahir-at',
        tur: 'duzeltme',
        metin: 'Ahırda at siparişi telefonda HİÇ görünmüyordu. Silahçıda adet '
          + 'kutusu ve YÜKSELT düğmesi de yan çevirince kayboluyordu. '
          + 'İkisi de düzeldi.',
      },
      {
        id: '20260913-tarla-yukselt',
        tur: 'duzeltme',
        metin: 'Haritada tarla panelinin YÜKSELT düğmesi ekranın dışında '
          + 'kalıyordu. Panel artık sığdığı yere göre kayıyor ve düğmeye '
          + 'ulaşılıyor.',
      },
      {
        id: '20260913-kaydiricilar',
        tur: 'duzeltme',
        metin: 'İşçi kaydırıcıları 6 piksel yüksekliğindeydi, parmakla '
          + 'tutulmuyordu. Dokunma alanı büyüdü; çubuk yine ince görünüyor.',
      },
      {
        id: '20260913-cikis-tusu',
        tur: 'duzeltme',
        metin: 'Küçük ekranlarda (320 px) çıkış düğmesi tamamen ekranın '
          + 'dışında kalıyordu; haritada KÖYÜME DÖN de taşıyordu. Bina '
          + 'adları da kesiliyordu — artık tam görünüyor.',
      },
      {
        id: '20260913-bina-tek-tarz',
        tur: 'duzeltme',
        metin: 'Bina panellerinde kartlar eziliyor, yanlarında boş alan '
          + 'kalıyordu. Artık her binada aynı düzen: çalışan işçi, yükseltme '
          + 've üretim satırları panelin tam genişliğinde.',
      },
      {
        id: '20260913-sayilar-ziplamiyor',
        tur: 'duzeltme',
        metin: 'Sayaçlar ve süreler her saniye oynuyor, satırlar zıplıyordu. '
          + 'Rakamlar artık sabit genişlikte. Düğmeler de basınca tepki '
          + 'veriyor.',
      },
    ],
  },
  {
    surum: '2026-09-12a',
    tarih: '12 Eylül 2026',
    baslik: 'Telefonda oynanabilirlik',
    notlar: [
      {
        id: '20260912-egit-dugmesi',
        tur: 'duzeltme',
        metin: 'Telefonda asker kartlarında adedi artırabiliyor ama EĞİT '
          + 'düğmesini göremiyordun — kart dar olduğu için düğme sıfır '
          + 'genişliğe çöküyordu. Kartlar genişledi, düğme gerektiğinde alt '
          + 'satıra geçiyor.',
      },
      {
        id: '20260912-bina-paneli-mobil',
        tur: 'duzeltme',
        metin: 'Bina panelinde işçi ve yükseltme kutuları telefonda görselin '
          + 'üçte ikisini kaplıyordu. Artık görselin ALTINDA, tam genişlikte; '
          + 'bina da görünüyor.',
      },
      {
        id: '20260912-rehber-yuzmuyor',
        tur: 'duzeltme',
        metin: 'Rehber kartı telefonda ekranın alt üçte birini kaplıyor ve '
          + 'listelerin altını örtüyordu; Köylüler ekranında işçi +/- '
          + 'düğmelerine basılamıyordu. Telefonda kart kalktı, görev durumu '
          + 'artık Görevler sekmesinin üstündeki sayaçta.',
      },
      {
        id: '20260912-yama-alt-sayfa',
        tur: 'duzeltme',
        metin: 'Yama notları telefonda neredeyse tüm ekranı kaplıyordu; '
          + 'açılışta oyunu görmek için önce onu kapatmak gerekiyordu. Artık '
          + 'alt yarıya oturuyor, üstte oyun görünür kalıyor.',
      },
      {
        id: '20260912-sekme-seridi',
        tur: 'duzeltme',
        metin: 'Telefonda son sekmeler (Raporlar, İstatistik, Simülatör, '
          + 'Yardım) şeridin dışında kalıyor ve orada bir şey olduğu belli '
          + 'olmuyordu. Seçili sekme artık kendiliğinden görüş alanına '
          + 'kayıyor, şeridin sağ kenarındaki solma da devamı olduğunu '
          + 'söylüyor. Kaynak şeridi de daraldı: altı yerine dokuz kaynak '
          + 'görünüyor.',
      },
    ],
  },
  {
    surum: '2026-09-11i',
    tarih: '11 Eylül 2026',
    baslik: 'Oyuncu pazarı açıldı',
    notlar: [
      {
        id: '20260911-oyuncu-pazari',
        tur: 'yenilik',
        metin: 'Pazarda artık diğer oyuncularla ticaret var. Fiyatı sen '
          + 'koyuyorsun: "2.000 odun veririm, 6.000 kereste isterim" diye '
          + 'satışa çıkarırsın, beğenen kabul eder. NPC takasının sabit oranı '
          + 'burada geçerli değil — pazarlık senin.',
      },
      {
        id: '20260911-pazar-tuccar-ayrim',
        tur: 'yenilik',
        metin: 'Teklif açarken mal ve tüccar hemen ayrılıyor; aynı malla on '
          + 'teklif açılamıyor. Kabul edince iki kervan birden yola çıkıyor — '
          + 'senden 1 tüccar, karşıdan 3 (her tüccar 2.000 taşır). Tüccarlar '
          + 'malı bırakıp döndüklerinde serbest kalıyor. Teklifi geri çekersen '
          + 'mal da tüccar da iade.',
      },
      {
        id: '20260911-casus-gizli-gelir',
        tur: 'duzeltme',
        metin: 'Yoldaki casus savunanın "gelen saldırı" listesinde görünüyordu; '
          + 'oyuncu casusu görüp izcilerini toplayabiliyordu. Casus artık gizli '
          + 'geliyor — ancak iş bittikten sonra, o da izcin varsa haber alırsın.',
      },
      {
        id: '20260911-kaynak-simgeleri',
        tur: 'yenilik',
        metin: 'Kaynak simgeleri büyütüldü ve her kaynak kendi renginde: bina '
          + 'maliyetlerinde, pazarda ve tekliflerde hangi malın konuşulduğu bir '
          + 'bakışta belli.',
      },
    ],
  },
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
