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
