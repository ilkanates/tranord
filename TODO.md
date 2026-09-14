# TraNord — Yapılacaklar

Son güncelleme: 14 Eylül 2026

Sıralama önem sırasına göre. Her madde bitince **Tamamlandı** bölümüne taşınır.

---

## 🟠 Büyük iş: Çoklu köy ve genişleme

Bu bölüm tek bir sistem — parçalarını ayrı ayrı yapmak mümkün değil, sıralı gitmek gerekiyor.

### 0. ~~Önce mimari: bir kullanıcı = birden fazla köy~~ — YAPILDI
Bkz. Tamamlandı · "Çoklu köy mimarisi". Bu maddede kalan tek iş:
- **Kendi köyleri arasında kaynak/asker gönderimi.** Kaynak tarafı pazarla
  çözüldü (tüccar yürüyüşü); asker tarafı da yapıldı — bkz. Tamamlandı · "Takviye".

### 1. ~~Göçmen ve yeni köy kurma~~ — YAPILDI ve oynanarak doğrulandı
Kod yolları yerinde: `gocmen` birimi (köşk/saray Lvl 10, 240 dk, maliyeti
tanımlı), `mode: 'yerlesim'` seferi, kültür puanı + köy hakkı denetimi
sefer BAŞLARKEN yapılıyor, varışta `foundVillageAt` köyü kuruyor.

Kalan:
- ~~Uçtan uca bir oyun turunda denenmedi~~ — İlkan oynayarak denedi, sorun yok
  (14 Eylül 2026).
- Arazi varışta dolmuşsa göçmenler kayboluyor; oyuncuya bunun için bir
  rapor/uyarı gidiyor mu, kontrol edilmeli.

### 1. Kahraman (KAPSAMLI — kendi başına bir RPG katmanı)
İlkan'ın tarifi: *"maceralara çıksın, XP kazansın, seviye atlasın, 4 tip
skili olsun, seviye atlayınca 4 puan gelsin... itemler tek tek birimlerin
saldırı ve def puanlarını arttırabilsin... baya item çeşitleri olsun kılıç
kalkan zırh bileklik miğfer ayakkabı pantolon vs."*

Bu madde TEK PARÇA DEĞİL — sırayla giden 5 aşama. Her aşama kendi başına
oynanabilir bir şey bırakmalı; yarım kalan aşama oyuna girmez.

#### Aşama 1 — Kahraman var olsun (temel) — ~~YAPILDI~~
Bkz. Tamamlandı · "Kahraman: temel, skiller ve savaş". Aşağıdaki madde
tasarımın kaydı olarak duruyor.
- **Kahraman Konağı** (yeni bina): kahraman burada doğar, burada dirilir,
  eşyaları burada durur. Konak yıkılırsa kahraman "yurtsuz" kalır (macera
  yok, iyileşme yok) ama ÖLMEZ — eşyası da silinmez.
- **Kahraman OYUNCUYA ait, köye değil.** Konağın olduğu köy onun üssü;
  çoklu köyde üs taşınabilir. Köy bazında olsaydı 5 köylü oyuncunun 5
  kahramanı olurdu ve "tek ve kalıcı kahraman" fikri çökerdi.
- **Can (HP) ve iyileşme:** savaşta ve macerada can kaybeder, konakta
  zamanla dolar. **Ölmez, bayılır**: canı 0'a inince belli bir süre
  kullanılamaz. Kalıcı ölüm olsaydı kimse kahramanı riske atmazdı.
- Durum oyuncu bazında saklanır (merkez köyün state'inde, görev kaydının
  yanında) — köy silinse bile kahraman kalır (bkz. Tamamlandı · köy yıkımı).

#### Aşama 2 — XP, seviye ve 4 skil — ~~YAPILDI~~
- **XP kaynakları:** macera (ana kaynak), savaşta öldürülen birim başına,
  görev ödülü.
- **Seviye atlayınca 4 PUAN** gelir, oyuncu dört skile dağıtır:
  | Skil | Etkisi |
  |---|---|
  | **Savunma bonusu** | köyün TÜM savunmasına yüzde bonus |
  | **Saldırı bonusu** | orduya yüzde bonus (kahraman seferdeyse) |
  | **Saldırı puanı** | kahramanın KENDİ saldırı gücü (tek birim olarak) |
  | **Kaynak üretimi** | bulunduğu köyün üretimine yüzde ek |
- Puan **geri alınabilmeli mi?** → Karar: ücretli sıfırlama (bir kaynak
  bedeliyle). Geri alınamaz olsaydı yeni oyuncu ilk yanlış dağıtımda
  kalıcı ceza yerdi; bedava olsaydı skil seçimi bir karar olmazdı.
- Yüzde bonuslara **tavan** konmalı — yoksa yüksek seviyeli kahraman tek
  başına savaşı belirler ve ordu anlamsızlaşır.

#### Aşama 3 — Maceralar — ~~YAPILDI~~
- Konakta biriken **macera listesi**: haritada bir noktaya gider, bir süre
  sonra döner, sonuç raporu gelir.
- **Kısa / uzun macera**: kısa az XP az ödül, uzun çok XP çok ödül + daha
  çok can kaybı. Tek tip macera olsaydı "gönder ve unut" olurdu.
- **Ödül havuzu:** eşya · asker · hammadde · XP. Nadir eşya düşük olasılık.
- Macera sayısı zamanla dolar (tavanı var) — sonsuz macera XP'yi anlamsız
  kılardı.
- Macera sırasında kahraman savunmada ve seferde YOK.

#### Aşama 4 — Eşya sistemi — ~~YAPILDI~~
- **Slotlar:** miğfer · zırh · pantolon · ayakkabı · sağ el (silah) ·
  sol el (kalkan) · bileklik · kolye · at. Her slota tek eşya.
- **Sürükle-bırak** ile kuşanma (İlkan'ın isteği); envanterden slota.
  Görseller sonra çizilecek — şimdilik ikon + çerçeve rengi.
- **Nadirlik kademeleri** (çerçeve rengi): sıradan · iyi · nadir · efsane.
  Aynı eşyanın nadirliği bonus büyüklüğünü belirler.
- **Eşya BONUSLARI iki türlü:**
  1. *Kahramana*: kendi saldırısı, savunması, canı, hızı, macera süresi.
  2. *ORDUYA*: **tek tek birim tiplerinin** saldırı/savunma puanına ek —
     İlkan'ın özel isteği. Örn. "Fjordvakt Sancağı: fjordvakt savunması
     +%15". Bu, ordu kompozisyonunu eşyaya bağlayan asıl derinlik.
- Birim bazlı bonus ekipman havuzundan AYRI hesaplanmalı; ikisi aynı
  yerden geçerse mevcut ekipman dengesi bozulur.

#### Aşama 5 — Bağlama ve denge (savaş ayağı YAPILDI)
- ~~Kahraman **sefere katılır**, savaş hesabına tek birimlik özel giriş.~~
- ~~**Raporda** kahramanın ne yaptığı ayrı satır.~~
- ~~Görev zincirine kahraman adımları~~ — iki tanesi eklendi (*konağı kur*,
  *seviye 3*). Macera ve eşya gelince ikisi daha eklenmeli.
- ~~Kahramanın **hızı** ve at slotu~~ — yapıldı: at eki birim tanımlarından
  ölçülüyor, nadirlik hızı büyütüyor, macera süresi hıza bağlı.
- KALAN: kahramanın ganimet payı; macera/eşya geldikten sonra uçtan uca
  denge ölçümü (kahramansız ve kahramanlı aynı savaş, fark yüzdesi).

**Kararlar (verildi):**
- Kahraman **oyuncuya** ait, üssü konağın olduğu köy.
- **Ölmez, bayılır**; iyileşme oyun saati üzerinden (hız çarpanına uyar).
- Eşya **maceradan** düşer (yağma ganimetinden değil) — macera sistemi
  zaten kuruluyor, iki ayrı düşme yolu dengeyi iki yerden bozardı.
- Kaynak üretimi bonusu **var** (skil olarak) — Travian'daki gibi.

**Açık kalan:** kahraman başka oyuncunun köyünde takviye olarak durabilir mi.

### 2. Elçilik ve birlik (ittifak)
- Yeni bina: **Elçilik**. Buradan birlik kurulur ve başka oyuncular birliğe davet edilir.
- Haritada birlik üyeleri **koyu yeşil** görünmeli (kendi köyüm açık yeşil, rakip oyuncu kırmızı, NPC gri).
- Elçilik seviyesi birlik üye sayısı tavanını belirlesin (Travian mantığı).
- **Karar gerekiyor:** davet/kabul akışı, birlik yönetimi (kurucu yetkileri, üye atma), birliğe saldırı yasağı olsun mu.
- Sunucu tarafı: birlik tablosu + üyelik, harita anlık görüntüsüne köy başına `allianceId` eklenmesi.

### 3. Ayarlar menüsü ve ses — ÇATI YAPILDI, dosyalar bekleniyor
- ~~**Ayarlar menüsü**~~ — yapıldı: üst barda dişli, `client/src/components/AyarlarMenu.jsx`.
  Üç sekme: Görünüm · Müzik · Sesler. Bütün tercihler tek depoda
  (`client/src/ayarlar.js`, tek anahtar `tn.ayarlar`).
- ~~**Arka plan müziği**~~ — yapıldı; tam denetimi artık ayarlar menüsünde.
  Üst bardaki hoparlör HIZLI SUSTURMA olarak duruyor (tek tıkla susturmak
  sık yapılan bir şey, iki tık arkasına koymak iyileştirme olmazdı).
- ~~**Olay sesleri ayarları**~~ — yapıldı: 11 olay, her biri AYRI anahtar +
  AYRI seviye, üstünde ana anahtar ve ana seviye (olay seviyesi ana sesle
  ÇARPILIR). Çalma yolu da hazır (`client/src/ses.js`).
- **KALAN: ses dosyalarının kendisi.** `client/public/ses/<olay>.mp3`
  konduğu an o satır kendiliğinden çalışmaya başlıyor; başka hiçbir
  değişiklik gerekmiyor. Eksik dosya sessiz geçiliyor (bir kez deneniyor,
  sonra o olay işaretleniyor — yoksa her inşaat bitişinde konsola 404
  düşerdi).
- **Olay listesi** (ayarlar.js · SES_OLAYLARI): saldiriGeldi · savasSonucu
  · seferGonderildi · askerBitti · ekipmanBitti · binaBitti ·
  arastirmaBitti · gorevTamam · depoDoldu · aclik · mesaj.
- **KALAN: sesin oyuna bağlanması.** Ayar ve çalar hazır; `sesCal('binaBitti')`
  gibi çağrıların olay noktalarına konması gerekiyor (tick sonucu istemciye
  geldiğinde, sefer gönderilince, rapor düşünce).
- **Karar gerekiyor:** ses dosyaları nereden gelecek (üretilecek mi, hazır
  kütüphane mi) ve toplam boyut sınırı. Biçim mp3 seçildi — müzikle aynı,
  her tarayıcıda çalıyor.
- Not: tarayıcılar kullanıcı etkileşimi olmadan otomatik ses çalmayı
  engelliyor. Müzikte ilk tıklamayı bekleyen bir kilit var; efektler zaten
  bir oyuncu eylemine bağlı olduğu için orada gerekmiyor.
---

## 🟡 Sunucuya taşıma

### Hetzner CX23
- Sunucu henüz alınmadı. `deploy/kurulum.sh` hazır ve tek komutla kuruyor (Node 22, PostgreSQL, swap, systemd, nginx, ufw, gecelik `pg_dump`).
- Sırası: sunucu al → deploy anahtarını ekle → `kurulum.sh` → IP ile test.
- Sırlar (`JWT_SECRET`, DB şifresi) sunucuda üretiliyor, hiçbir yere yazılmıyor.

### Alan adı → HTTPS → e-posta → şifre sıfırlama
Bu zincir sırayla ilerlemek zorunda:
1. Alan adı al, A kaydını sunucu IP'sine yönlendir
2. Let's Encrypt (`certbot --nginx`)
3. E-posta sağlayıcısı (Resend / Postmark / Brevo) — alan adı doğrulaması gerekiyor
4. Şifre sıfırlama akışı: token üret → e-posta → yeni şifre formu
5. E-posta doğrulama (kayıt sonrası)

### Raspberry Pi
- İlkan'ın elinde Pi var, modeli/RAM'i henüz belli değil.
- Pi 4 / 8 GB ise geliştirme ve az oyuncu için yeterli; Pi 3 veya 2 GB ise PostgreSQL + Node sıkışır.
- Karar için: `cat /proc/cpuinfo | grep Model` ve `free -h` çıktısı.

---

## 🟢 Oyun mekaniği

### Moral bonusu
- Küçük köy büyüğe saldırırsa saldırgana bonus (Travian mantığı).
- Formül: `moral = min(1, (saldıran_nüfus / savunan_nüfus)^0.2)`.
- Köy puan sistemi netleşince eklenir.

### Pazar — kalanlar
NPC takası, oyuncular arası teklif ve tüccar yürüyüşü **yapıldı**
(`server/game/pazar.js`, `pazarYol.js`; `pazar_takas`, `pazar_teklif_ac/
kabul/iptal`). Bu maddede kalan:
- ~~Karşılıksız hammadde gönderme~~ — yapıldı: pazarda HAMMADDE GÖNDER sekmesi
  + haritada kısayol (bkz. Tamamlandı).
- Teklif listesinde arama/süzme (şu an bütün açık teklifler tek listede).
- Teklifin süresi dolunca otomatik iptal ve kaynakların iadesi.
- Tüccar kapasitesinin pazar seviyesiyle ilişkisi gözden geçirilecek.

---

## 🔵 Arayüz / içerik

### Köy görünümü: hex haritaya alternatif "kart/kategori" görünümü
Oyuncu iki görünüm arasında seçebilsin; tercih saklansın (`localStorage`).

- **Şimdiki**: altıgen köy sahnesi, binaya tıklanarak panel açılır.
- **Yeni**: üstte **kategori sekmeleri**, seçilen kategorinin binaları altta
  kart olarak açılır; bütün işlemler o kartlardan yapılır. Oyuncu binayı köy
  görselinden değil karttan seçer ve **ne seçtiğini net görür**.

Kategoriler zaten tanımlı (`villageDefs.category`, renkleri `CAT_EDGE`'de):
`isleme` · `askeri` · `depo` · `ekonomik` · `savunma` · `yonetim` · `nufus`
· `merkez`. Buna ek olarak **"Boş alan"** diye bir sekme gerekiyor — inşa
edilebilir boş slotlar orada listelensin (şu an boş hex'e tıklamak gerekiyor).

- Her bina kartında görsel **tam genişlik** olsun (panel poster'ı gibi).
- Kart açılınca mevcut bina paneli aynen çalışsın — yeni bir panel yazmaya
  gerek yok, yalnızca binaya ulaşma yolu değişiyor.
- Bu görünüm telefonda muhtemelen daha kullanışlı: köy sahnesi dikeyde
  yerin yarısını boş bırakıyor (bkz. mobil denetim notları).

**Karar gerekiyor:**
- Seçim nerede duracak — üst barda mı, köy ekranının içinde bir düğme mi?
- Kategori sekmeleri telefonda yatay kaydırmalı şerit mi, açılır liste mi?
- Boş alan sekmesinde slotlar nasıl sıralanacak (halka/uzaklık? bonus?)
- Hex görünümü varsayılan mı kalacak, yoksa telefonda kart görünümü mü?

- Köy içi görsel: kalan hammadde görselleri (`koy-tahil.png` vb.) istenirse köye özel arazi dokusu olarak eklenebilir.
- ~~`client/public/` içindeki 5 tasarım önizleme sayfası~~ — yapıldı: altı geliştirme sayfası (5 prototip + `dev-login.html`) `client/dev/` altına taşındı ve yalnız `vite dev` sırasında servis ediliyor; üretime çıkmıyorlar. `koy-sekil3.html` referans olarak duruyor, diğer dördü istendiğinde silinebilir.
- Savaş simülatörüne kule girdisi eklenmedi (şu an `kulePct = 0` ile çalışıyor, yani kulesiz simülasyon).

---

## ✅ Tamamlandı

### Kademe kapısı Lvl 10 a indi — beş birim EĞİTİLEMEZ olmuştu (15 Eylül 2026)
- İlkan: *"bazı askerleri kışla ve ahır Lvl 20 de basabiliyorum bu ağır olmuş, Lvl 10 binalarla max basılsın"*.
- **SORUN AĞIRLIKTAN İBARET DEĞİLDİ.** Birimin Rún Salonu araştırma seviyesi `minLevel` den TÜRETİLİYOR (`researchFor(def.minLevel)`) ve Rún Salonu nun tavanı Lvl 10. Bir önceki sürümdeki `5×n` kuralı beş birimin araştırma seviyesini 15 ve 20 ye çıkarmıştı: **Ulv Savaşçısı, Skjoldreiter, Buz Süvarisi, Stormridder ve Jernridder hiç araştırılamıyordu** — zor değil, imkânsız. Jernridder in araştırma maliyeti 337.190 kaynak, süresi 213 saat çıkıyordu.
- Yeni kural `1 + 3×(n−1)`: tek ekipmanlı Lvl 1, iki Lvl 4, üç Lvl 7, dört Lvl 10. Hem İlkan ın istediği tavan, hem araştırma seviyesi Rún Salonu tavanının altında.
- Kışla görevi Lvl 1 e geri döndü (kademe-1 birimi yine Lvl 1 de açılıyor), metni yeni eşikleri anlatıyor.
- **TESTİN NEDEN KAÇIRDIĞI** önemli: `denge-paketi.test.js` yalnız *"minLevel kurala uyuyor mu"* diye bakıyordu — KURALI kilitliyordu ama SONUCUNU değil. Yeni test sonucu kilitliyor: bir birimin kapısı, o kapıyı açan binanın tavanını geçemez (hem Rún Salonu hem kışla/ahır/atölye için). Testler 306 → 307.
- Kuşatma araçları ve göçmen kuralın dışında kalmaya devam ediyor.


### Macera eşya düşüşü düzeltildi + ölü sabit ayıklandı (14 Eylül 2026)
- İlkan: *"çok maceraya çıktım ama birkaç birim bir de attan başka bir şey düşmedi"*.
- **ÖLÇÜLDÜ (200.000 macera)**: kısa macerada eşya %5,0 düşüyordu ve bunun %18 i diriltme iksiriydi — yani KUŞANILABİLİR parça **24 macerada bir**. Kahramanın on küsur slotu var; bir seti toplamak yüzlerce macera ediyordu. Şikâyet birebir doğruydu.
- **ÖLÜ SABİT**: `ODUL_AGIRLIK` içinde `esya: 15` yazıyordu ama ağırlıklı kura yalnız hammadde ile asker arasında çekiliyordu — sabit kuraya HİÇ girmiyordu. Dengeyi okuyan herkese eşyanın havuzda %15 ağırlığı varmış gibi görünüyordu. Kaldırıldı ve yorumda neden olmadığı yazıldı.
- `esyaSansi` kısa 0,05→0,12 · uzun 0,12→0,22; `IKSIR_SANSI` 0,18→0,12.
- **YENİ ÖLÇÜM**: kuşanılabilir parça kısada ~9,5 macerada bir, uzunda ~2,6 macerada bir. Efsanevi uzun macerada ~209 da bir (İlkan "efsanevi çok nadir düşsün" demişti, seyrek kaldı ama artık ulaşılabilir).
- Test yenilendi: eski test yalnız "eşya düştü mü" diye bakıyordu, oysa düşenin bir kısmı iksir. Yeni test OYUNCUNUN GÖRDÜĞÜ sayıyı ölçüyor (iksir hariç parça temposu) ve ayrı bir test ölü ağırlık sabitinin geri gelmesini engelliyor. Testler 305 → 306.


### Denge düzeltmesi 2. parça — kalan 10 madde + ön koşul ağacı (14 Eylül 2026)
- İlkan: *"madde 4 ü ve kalan 10 maddeyi birlikte yap ama hex olayına girme"*. Harita/mesafe maddesi (6→10 hex) ve dünya hızı dışındaki her şey uygulandı.
- **1× SORUSU**: İlkan *"sen her şeyi 1x deki gibi düzelt, bizim hız 10x kalsın, sunucuyu 1x başlatınca önerilendeki gibi olur değil mi"* diye sordu — **evet**. Bütün tanımlar oyun saati/dakikası cinsinden; `TRANORD_HOUR_SECONDS` bunun üzerine çarpan. Seferler de dünya döngüsünden ilerlediği için aynı oranda ölçekleniyor.

**MADDE 4 — ÖN KOŞUL AĞACI.** 32 binaya `requires` yazıldı (`{tip,seviye}` · `{tarla,seviye}` · `{biri:[...],seviye}`). `insaat.js · eksikOnKosullar` hem `canBuildAt` i hem red cümlesini besliyor; istemci aynı kuralın ikizini `villageDefs.js` te tutuyor ve menüde kilit sebebini yazıyor. **DÖNGÜ TESTİ** eklendi: bir A→B→A döngüsü iki binayı sonsuza kadar kilitler ve hata hiçbir yerde görünmez — oyuncu ikisini de kuramaz, sebep olarak da birbirlerini görür.
- Yan etki: `dev_setup` artık ön koşul OMURGASINI da kuruyor (keresteci → demirci → rún salonu → değirmen → fırın → kışla). Testler binaları GERÇEK `build_village` olayıyla kuruyordu ve altısı ön koşula takıldı — kuralın çalıştığının kanıtı.
- Görev zinciri: `kisla` görevi artık Lvl 5 istiyor (ilk birim orada açılıyor), yoksa oyuncu "10 asker eğit" görevinde takılıp kalırdı.

**MADDE 5+6+7 — ÇİFT PARA BİRİMİ (paketin çekirdeği).**
- Ekipman verimi 3,3 kat farklıydı (kılıç 4,00 · zırh 1,20). Zırh 20/5/5 ten **40/12/10** a çıktı, kılıç 16 külçe + 8 kereste, mızrak 8+12, kalkan 13+5 oldu — beşi de 2,48–2,50 stat/kaynak.
- Birim statları artık **TÜRETİLİYOR**: `(taban + Σ ekipman) × (1 + 0,04×(n−1))`. Elle yazılıyken ekipman dengesi değişince 13 satırı elle güncellemek gerekiyordu ve sessizce ayrışabilirdi. İzci ve kuşatma araçları `statSabit` ile dışarıda (değerleri bilinçli olarak ekipman toplamı değil).
- Asker yemeği `6 + 2×(n−1)`, tarla işçi verimi 32→16.
- **KROSSOVER ÖLÇÜLDÜ**: `stat/kaynak` 3,50 → 3,00 (ucuz önde), `stat/ekmek` 11,7 → 22,1 (pahalı önde). İki eksen **zıt yönde** sıralanıyor; dengenin doğru olduğunun testi bu ve teste yazıldı.
- Raporun EK D si set bonusunu `0,12`, beslenmeyi `6×n` yazıyordu ama madde metinleri ikisini de **açıkça reddediyor**. Madde metinleri esas alındı (0,04 ve 6+2×(n−1)); EK D nin değerleri krossoveru yok ediyor.

**MADDE 13+14+16 — İŞÇİ EKONOMİSİ.**
- İşleme dönüşüm hacmi 9 kat (8→6 oldu 72→54; demirci 50→40; değirmen 120→96; fırın 96→72), **kayıp oranları aynı**. Ölçüm: Lvl 20 Keresteci (800 odun/sa) Lvl 20 Ormanı (924 odun/sa) yetiştiremiyordu; artık işçi oranı beş zincirde de ~0,30.
- Nüfus büyümesi boş işçiye bağlandı: `tampon = 20 + 0,10 × işçiKapasitesi`, `çarpan = clamp(1 − boş/tampon, 0, 1)`. Ekranda **gerçek** hız gösteriliyor, ham hız değil — yoksa oyuncu büyümenin neden durduğunu hiçbir yerde göremezdi.
- Ev nüfus tavanı 100→150 (9 ev × 750 = 6.750 ≥ max köyün ~6.640 ihtiyacı). Bu olmasa kıt olan şey tahıl değil **nüfus slotu** olur ve madde 6+7 deki krossover çökerdi.
- Pazar kervanı artık 1 boş işçi tutuyor, dönüşte iade ediyor. İşçi yoksa kervan **yine çıkıyor** — ticareti bloklamak oyuncunun malını çürütürdü; amaç fren değil, nüfusa bir maliyet bağlamak.

**MADDE 12 — ACEMİ KALKANI + MORAL.**
- Kalkan: ilk **7 oyun günü** VEYA **nüfus 200**, ilk saldırıda düşüyor ve geri gelmiyor. Saldırı/yağma/**keşif** kapalı, takviye ve hammadde açık — keşif de kapalı çünkü kalkanlı köyün ordusunu görüp kalkan düşer düşmez vurmak kalkanı yalnız **erteleme** hâline getirirdi. Süre OYUN zamanı: dünya hızıyla ölçekleniyor.
- `PROTECT_MIN_ARMY` kapısı da kalkana bağlandı: asker basan ama hâlâ bir günlük olan oyuncu NPC yağmasına açılıyordu.
- Moral: `(saldıranNüfus / savunanNüfus)^0,2 − 1`, tavan %50. **Sur bonusuna EKLENMİYOR**, ayrı çarpan — toplansaydı `DEF_BONUS_CAP` (%150) ikisini birden yutardı ve tam da korumak istediğimiz oyuncu korumasız kalırdı. Ölçüm: 2× büyük saldırgana %14,9 · 5× e %38 · 10× e %50.

**MADDE 9b+15 — ASKERÎ YAPILAR.** Kule okçu yeri seviye başına 4→2 (altı kule Lvl 20 de 480 okçu istiyordu, bir köyün bütün nüfusu); ahır at deposu 5→20; ekipman süreleri kılıç 4 · at 4 · mızrak 3,5 · kalkan 2 · zırh 2 saat; eğitim binası kademe kapısı `5×n` (Jernridder Ahır Lvl 20). **Kuşatma araçları kuralın dışında**: tek "ekipman" taşıyorlar ama kademe-1 birimi değiller, kurala soksaydık mancınık Lvl 10 yerine Lvl 5 te açılırdı — yani kural geç oyun birimini ERKENE çekerdi.

- Yeni test dosyası `server/test/denge-paketi.test.js` (12 test) — tek tek sayıları değil maddelerin kurduğu **ilişkiyi** kilitliyor: krossover yönü, ekipman verim yelpazesi, işleme/tarla işçi oranı, ön koşul döngüsüz mü, moral monotonluğu, büyüme freni.
- **UYGULANMADI**: köy mesafesi 6→10 hex (İlkan "hex olayına girme" dedi) ve dünya hızı 10×→2–3× (İlkanın kararı).


### Denge düzeltmesi 1. parça — eğri, izci ve taşıma (14 Eylül 2026)
- İlkan dış bir AI ya `OYUN-TASARIMI.md` yi okutup bir denge raporu aldı (`TRANORD-DENGE-DUZELTME.md`, 16 madde) ve *"kontrol et, test et, uygunsa uygula, yanlış bir şey varsa beni uyar"* dedi. Bu sürümde yalnız **tartışmasız ve kendi başına duran** maddeler uygulandı.
- **MADDE 1+2+3 — eğri birleştirildi (`kc = kt = 1,28`).** Süre çarpanı beş aileye (1,40–2,00), maliyet çarpanı üç aileye (1,25/1,60/1,70) dağılmıştı ve ikisi birbirini tutmuyordu. **Ölçüm**: Sur Lvl 19→20 tek işçiyle **24,9 yıl**; Saray Lvl 10→11 maliyeti **32.019 tuğla**, maksimum depo 26.000 — yani kaynak hiç biriktirilemiyor, bina orada duruyordu. On bir binanın gerçek tavanı Lvl 11–15 arasıydı. Sonrası: hiçbir yükseltme tek depoyu aşmıyor, en pahalı bina son seviyesine tek işçiyle 3,5 günde çıkıyor. **Taban maliyetler değişmedi** — binalar arası sıralama aynı.
- Tarla tabloları elle yazılı olduğu için 100 satır (5 tarla × 20 seviye) Lvl 1 tabanından yeniden üretildi; işçi sayıları korundu. Sunucu ve istemci ikizleri birlikte.
- **TAŞIMA**: eski eğriyle başlamış inşaatlar mutlak bitiş anı taşıyor; dokunmasaydık oyuncu artık var olmayan bir süreyi beklerdi. `villageState.egriTasimasi` her yüklemede kalan süreyi yeni formülün tamamına kırpıyor — **yalnız kısaltıyor**, yarısı geçmiş inşaatı yeniden başlatmıyor. Kendi kendini kapatıyor.
- **MADDE 8 — Kuzey İzcisi yük 110 → 0.** İzci oyunun en ucuz, en hızlı ve en çok taşıyan birimiydi aynı anda (kaynak başına 5,5 yük; ikinci sıradaki Spydvakt 3,67), yani yağmanın tek doğru cevabıydı ve bütün tier sistemini atlatıyordu. Travian da izcilere tam bu yüzden 0 yük verir.
- **GİZLİ BAĞLANTI TESTTEN YAKALANDI**: `SCOUT_UNITS` "kapasite ≥ 100 ve saldırı ≤ 10" diye TÜRETİLİYORDU. İzcinin yükü 0 a inince izci keşif birimi olmaktan çıktı ve **keşif tamamen bozuldu**. Rol artık tanımdaki `kesif: true` bayrağından geliyor; bir birimin ROLÜ taşıma kapasitesinden türetilmemeli. Regresyon testi eklendi.
- Yeni test dosyası `server/test/denge-egrisi.test.js` (5 test): çarpan ailesine geri dönülmüş mü, herhangi bir yükseltme tek depoyu aşıyor mu, son seviye 5 günü geçiyor mu, bina sıralaması korunuyor mu. Testler 287 → **293**.

#### Raporda yanlış çıkan ve UYGULANMAYAN maddeler
- **Madde 10 (soğuk başlangıç kilidi) YANLIŞ.** Rapor "külçe olmadan demir madeni, demir madeni olmadan külçe kurulamaz" diyor ve bu tek maddeyi koddan doğrulanmak üzere bırakmış. `villageState.js` başlangıç stoğu her işlenmiş maldan **300**, demirden 200 veriyor; ilk Orman 12/30/18/15 istiyor. Kilit yok.
- **Madde 11 (slot havuzu) kod sorunu değil**, `OYUN-TASARIMI.md` nin ifade hatası. Havuzlar kodda zaten ayrı: tarla slotu `min(25, 5 + anaBinaSeviyesi)` (`insaat.js · getMaxProductionSlots`), bina slotu köy sahnesinin kendi hexleri, sur/hendek/6 kule ayrı isimli slotlar.
- **Raporun tüm zaman ve maliyet tabloları bir seviye kaymış.** Formül `çarpan^(seviye-1)`, rapor `çarpan^seviye` saymış. Sonuç: raporun süreleri **iki katına kadar abartılı** (Sur 49,9 yıl yazmış, gerçek 24,9), maliyet duvarları ise **bir seviye geç** görünüyor (Ana Bina için L13 demiş, gerçek L12). Yön doğru, büyüklükler değil.
- **Raporun kendi içinde iki çelişkisi var.** EK D adım 5 set bonusunu `0,12` yazıyor ama madde 6 `0,04` seçip 0,12 yi *açıkça reddediyor*; EK D adım 6 beslenmeyi `6 × n` yazıyor ama madde 7 `6 × n` i *açıkça reddedip* `6 + 2×(n−1)` seçiyor. Uygulanırsa madde metinleri esas alınmalı.
- **Madde 15 in "eğitim binası ölü" kısmı eksik bilgi**: birimlerin `minLevel` kapısı zaten var (Fjordvakt 1, Skjoldvakt 3, Jernridder 10) ve işçi sayısı eğitim süresini kısaltıyor. Süre/ekipman oranındaki 31 kat uyumsuzluk ise gerçek.
- **Madde 7 atı kaçırmış**: atlar zaten ayrıca günde 3 HAM TAHıL yiyor (`GRAIN_PER_HORSE_PER_DAY`), yani süvari tüketimi rapordaki hesabın üzerinde.
- Geri kalan maddeler (4 ön koşul ağacı, 5 ekipman, 6 set bonusu, 7 yiyecek, 9 kule işçisi, 12 acemi kalkanı/moral, 13 işleme, 14 nüfus freni, 15 ekipman süreleri, 16 ev tavanı) **birbirine bağlı** — parça parça uygulanırsa denge ilk sürümden kötü olur. İlkanın kararı bekleniyor.
- **Uygulanmayacak**: köy mesafesi 6→10 hex (mevcut dünyanın yeniden kurulması gerekir, oyuncu köyleri gider) ve dünya hızı 10×→2–3× (oyun hissini kökten değiştirir — İlkanın kararı).


### Haritada sefer rozeti türüne göre çiziliyor (14 Eylül 2026)
- İlkan: *"saldırıda haritada kılıç, yağmada turuncu kılıç, destekte yeşil kalkan, casuslamada beyaz dürbün çıkart"*.
- Eskiden **beş sefer türü de aynı kılıcı** çiziyordu, yalnız rengi değişiyordu. ŞEKİL RENKTEN ÖNCE OKUNUYOR — kalkan destektir, dürbün keşiftir; renk körü oyuncu için de tek ayırt edici renk kalmıyor.
- `SeferSimge` (`client/src/components/MapView.jsx`): kılıç (saldırı kırmızı / yağma turuncu), kalkan (takviye yeşil), dürbün (keşif beyaz), çadır (yerleşim buz mavisi).
- **ŞEKİLLER ÖLÇÜLEREK DÜZELTİLDİ**, tahminle çizilmedi: ayrı bir önizleme sayfasında gerçek 12px rozet boyunda render edildi. İlk denemede kalkanın tepesi de sivriydi ve **sekizgen** gibi okunuyordu (tepe düz yapıldı); dürbünün gövdeleri yoktu ve **gözlük** gibi duruyordu (gövde + köprü eklendi); ikisi de 6 yarıçaplı daireye yapışıyordu, daire 7 ye çıktı.
- Yağmanın rengi sarıdan (`#f2c86e`) **turuncuya** (`#ff9a3c`) alındı — İlkan turuncu istedi ve sarı zaten kaynak rozetleriyle çakışıyordu.
- Kalan süre ve sefer sayısı rozetin altında durmaya devam ediyor; canlı geri sayım (`kalanTimeLeft`) bozulmadı.


### Oyun tasarım dökümanı üretildi — `docs/OYUN-TASARIMI.md` (14 Eylül 2026)
- İlkan: *"oyunun mekanikleri askerleri binaları genel dokusu hakkında bilgi dökümanı üret, başka bir sessionda AI'a okutup oyunun sonu nasıl olacak fikir alayım"* + *"bina maliyetleri süreleri, birimlerin ve araçların maliyetleri süreleri herşeyi olmalı"* + *"bütün bu veriler oyunun 1x hızına göre olmalı"*.
- **1510 satır.** 13 anlatı bölümü (bir bakışta → kaynaklar → nüfus → binalar → ekipman → birimler → savaş → kahraman → ticaret → çoklu köy → dünya → BUGÜN OLMAYAN ŞEYLER → KARAR SORUSU) + altı tablo eki.
- **Tablolar koddan üretildi, elle yazılmadı**: 33 binanın her seviyesi, 5 tarla × 20 seviye, bütün ekipmanlar ve seviye yükseltmeleri, 16 birimin ekipmandan türeyen kaynak maliyeti, şölen/kahraman diriliş/yıkım bedelleri. Tahmin yok.
- **BÜTÜN SÜRELER 1×**: oyun içi süreler "oyun saati" cinsinden tanımlı ve canlı sunucu 10× çalışıyor. 10× sayılarını verseydik dökümanı okuyacak AI dengeyi tamamen yanlış ölçerdi. Hem başlıkta hem ekin başında yazılı.
- **13. bölüm karar sorusu**: 6 kısıt (ticari ürün, tek dünya, az oyuncu çok yer, eleme zaten var, elde hazır malzemeler, Türkçe/İskandinav tema) + 6 somut soru (bitiş olmalı mı, bireysel mi ittifak mı, dünya merkezi özel mi, kültür puanı zafer ölçüsü olsun mu, kaybedene ne olsun, hedef inşa/askerî/ekonomik mi).
- **Acemi korumasının boşluğu yazıldı**: `PROTECT_MIN_ARMY = 20` yalnız NPC akınını engelliyor; gerçek oyuncu bir günlük acemiyi ilk dakikadan yağmalayabiliyor. Eleme/bitiş tasarlanacaksa bu boşluk doğrudan konuyla ilgili — dökümanda saklanmadı.
- Yalnız döküman; koda dokunulmadı, dağıtım gerekmiyor.


### Bina açıklamaları derinleştirildi + yardımda maliyet tekrarı kalktı (14 Eylül 2026)
- İlkan: *"bütün bina tanımlarını ve yardım menüsündeki bina açıklamalarını derinleştir. yardım menüsünde zaten her lvl için gerekli malzemeler yazıyor lvl 1 için bir daha ek yazma."*
- **Otuz üç binanın açıklaması baştan yazıldı.** Eskiler çoğunlukla tek cümlelik etiketlerdi (en kısası 18 karakter: *"Ham tahıl depolar"*); artık her biri gerçek mekaniği sayısıyla anlatıyor — dönüşüm oranları, kapasite formülleri, neyin neyi kilitlediği, hangi kaynağın darboğaz olduğu.
- **Sayılar koddan doğrulanarak yazıldı**, tahminle değil: depo tavanları `tick.js · getStorageCaps`, tüccar sayısı `pazar.js`, kule doluluk çarpanı `combat.js · towerBonusPct`, nüfus hızı `koyKurallari.js · popPerGameHour`, kuşatma `kusatma.js`.
- Bu sırada **iki yanlış bilgi yakalandı ve düzeltildi**: koç başı hendeğe DOKUNMUYOR (yalnız suru kırıyor, sur sıfırlanınca artan güç boşa gidiyor) — ilk taslak tersini yazmıştı; ve büyük şölen bütün köylerin günlük üretiminin İKİ KATI veriyor, bir katı değil.
- **Maliyet iki kere yazılıyordu**: yardım menüsünde üstte *"İnşa (Lvl 1)"* ve *"Yükseltme (Lvl 1 → 2)"* satırları, hemen altında da her seviyeyi tek tek veren tablo vardı. Üstteki blok kaldırıldı; çarpan notu kaybolmasın diye tablonun başına taşındı — açıkladığı şey zaten tablonun kendisi.
- Atölyenin **kuşatma kapasitesi** (`siegeCapPerLevel`) yardım ekranında hiç görünmüyordu, satır eklendi. Ahırın at satırına da atların günde 3 ham tahıl yediği notu kondu.
- `granary` binasının görünen adı **İngilizce kalmıştı** (*"Granary"*), Türkçeleşti: **Erzak Ambarı**. Anahtar değişmedi — kayıtlı köyler etkilenmiyor.
- Açıklamalar tek kaynaktan iki ikiz tanıma birden yazıldı (`server/data/villageDefs.js` ↔ `client/src/data/villageDefs.js`); ikizler testi maliyetleri kilitliyor ama metni kilitlemiyordu, elle yazmak ayrışma riski olurdu.

### Merkez taşınınca eski merkezin tarlaları kırpılıyor (14 Eylül 2026)
- İlkan'ın kararı: *"merkezi başka yere taşıdığında binaların Lvl'i 10'a düşer"*. Bir önceki sürümde açık bırakılan madde kapandı.
- **KIRPMASAYDIK TAVAN DELİNİRDİ**: oyuncu merkezi köyden köye taşıyıp her köyün tarlalarını sırayla 20'ye çıkarır, sonunda hepsi 20 olurdu — yani merkezin üstünlüğü diye bir şey kalmazdı. Kural ancak merkez DEĞİŞTİĞİNDE de uygulanırsa kural.
- **Sıra önemli**: kırpma `isCapital` bayrakları güncellenmeden ÖNCE yapılıyor ki eski merkez hâlâ kendini merkez sanmasın ve yeni merkezin tarlalarına dokunulmasın.
- **Süren yükseltme iptal ediliyor**: tavanın üstüne çıkacak bir inşaat yarıda bırakılmasaydı, taşımanın hemen ardından biten yükseltme kuralı atlatırdı. Ayrılan işçiler havuza dönüyor; harcanan kaynak geri gelmiyor — merkezi taşımak bir karar, bedeli olmalı.
- **İşçi sayısı da kırpılıyor**: düşen seviyenin işçi kapasitesi daha küçük; kırpmasaydık tarla kapasitesinin üstünde işçi tutar ve nüfus muhasebesi sessizce şişerdi. Fazlası boş havuza dönüyor.
- **UYARI DÜĞMENİN ÜSTÜNDE**: saray panelinde "merkez yap" düğmesinin üstünde hangi köyde kaç tarlanın kaç seviye ineceği yazıyor. Geri alınamayan bir kaybı tıkladıktan sonra öğrenmek, oyuncunun sonradan fark edip "bug" sanacağı bir kayıp olurdu. Taşıma bittiğinde de kaç tarlanın indiği bildiriliyor.

### Haritadaki kılıç: geçmiş değil YOLDAKİ sefer (14 Eylül 2026)
- İlkan: *"ilk saldırdığım yerde şu an kılıç var ama oraya şu an saldırmıyorum. Başka yere saldırıyorum, orada kılıç çıkmıyor... bu, haritayı açınca gözükebilen ANLIK bir şey olmalı. O an nereye saldırı gidiyor görebilmeliyim."*
- **YANLIŞ ŞEYİ GÖSTERİYORDUM.** Rozeti GEÇMİŞTE vurulan köylere koymuştum; oyuncunun istediği ise o an YOLDA olan sefer. Sonuç tam tersi bir ekran: saldırmadığı köyde kılıç duruyor, tam o an saldırdığı köyde hiçbir şey çıkmıyordu. İstek "saldırdığım yerleri görmek istiyorum" idi ve ben bunu sicil diye okudum; oysa haritadaki bir işaret doğası gereği ŞU ANI anlatır.
- Rozet artık `yoldakiSeferler` çiziyor: yalnız **gidiş fazındaki** seferler (dönen sefer artık saldırı değil, eve yürüyen askerdir), hedef başına tek kılıç, üstünde sayı ve **en yakın varışın** süresi.
- **BÜTÜN KÖYLERDEN**: paketteki `marches` yalnız aktif köyün seferleri; haritada ise oyuncu bütün dünyayı görüyor. B köyünden çıkan saldırı, A köyüne bakarken görünmüyordu. Sunucu artık oturumun bütün köylerini tarayıp tek bir hedef→sefer haritası gönderiyor.
- **NABIZ ATIYOR ve KİP RENGİ var** (saldırı kırmızı, yağma amber, keşif buz, takviye yeşil). Durağan tek renk bir işaret, geçmiş kayıttan ayırt edilemezdi.
- Sayaç alanının adı `kalanTimeLeft`: istemcideki `shiftTimers`, `timeleft` ekiyle biten sayıları iki yayın arasında kendi sayıyor, yoksa geri sayım dakikada bir zıplardı. Ölçüldü: 23:58 → 23:51 (6 sn).
- Parmak izine sefer hedefleri eklendi (hedef + kip + **tam dakikaya yuvarlanmış** kalan süre): rozet sefer çıkar çıkmaz görünmeli, 30 saniyelik kalp atışını beklememeli; yuvarlama olmasa tam paket saniyede bir giderdi.
- Geçmiş kayıt (`saldirilarim`) duruyor ama yalnız **hover kartında yazı** olarak: "daha önce kaç kez vurdum, sonuç, toplam ganimet" bağlam, haritayı dolduracak bir işaret değil.

### Kılıç rozeti görünmüyordu + tarla tavanı (14 Eylül 2026)
- İlkan: *"haritada saldırdığım yeri hâlâ göremiyorum"* ve *"üretim alanlarını her zaman Lvl 10 ile sınırla, tarlaları yani — ama merkez ise Lvl 20'ye kadar çıkabilsin"*.
- **ROZET YANLIŞ KATMANDAYDI.** `VillageMark` yalnız `scale < Z_TERRAIN` (uzak zum) çiziliyor; yakın zumda köyler `ForeignCore` ile çiziliyor ve rozet oraya konmamıştı. Oyuncu haritayı köyünün çevresinde, yani **yakın zumda** kullanıyor — rozet hiç görünmüyordu. Kendi testimde de önce 0 rozet görmüş, ancak uzaklaşınca görmüştüm; asıl kullanım biçimini denemediğim için kaçırdım.
- **ESKİ SALDIRILAR GERİ DOLDURULUYOR** (`saldiriIzleriniGeriDoldur`). İz kaydı yeni; sürüm öncesi vurulan köylerde hiç kayıt yoktu ve harita boş görünüyordu — oyuncu için bu "özellik çalışmıyor" demek. Raporlar diskte duruyor ve saldıranın raporu hedefin anahtarını taşıyor.
- Geri doldurma **ayrı bir bayrakla** bir kez çalışıyor, `saldirilarim` varlığına bakmıyor: kayıt sürümden sonraki ilk saldırıda zaten oluşuyor, varlığına baksaydık o tek saldırıdan öncesi sonsuza dek doldurulamazdı (ölçüldü — bir kez vurmuş hesapta eski beş hedef görünmüyordu). **Birleştiriyor, ezmiyor**: gerçek saldırıdan gelen kayıt rapordan türetilenden doğru.
- **TARLA TAVANI: merkez 20, diğerleri 10** (`koyKurallari · tarlaTavani`). Tarlalar her köyde 20'ye çıkabilirken MERKEZ KÖY diye bir şeyin anlamı kalmıyordu; çoklu köy, birbirinin kopyası yirmi kasabaya dönüşüyordu. Tavanı ikiye ayırmak merkeze gerçek bir üstünlük veriyor.
- **Tanım tablosu 20 seviye taşımaya devam ediyor**: tavan bir KURAL, tablo değil. Tablo kısaltılsaydı merkezin 11-20 aralığı da yok olurdu.
- Sınır üç yerde birden: sunucu kapısı (`upgrade_production`, sebebini yazan bir ret), ekran (tavana varan tarlada "son seviye" + nedenini ve çözümünü anlatan not) ve dev kısayolu (kuralı delen bir kısayol geliştirme ortamını gerçek oyundan ayırırdı).
- ~~AÇIK KALAN — mevcut Lvl 10+ tarlalar~~ — KAPANDI: İlkan "merkezi başka yere taşıdığında Lvl 10'a düşer" dedi; merkez taşınırken kırpılıyor (bkz. Tamamlandı · "Merkez taşınınca...").

### Kervan listesi + haritada saldırı izleri (14 Eylül 2026)
- İlkan: *"markette yolladığım pazarcıları görebilmem lazım"* ve *"harita üzerinde saldırdığım yağmaladığım yerleri görmek istiyorum, üzerinde bir kılıç vs olsun"*.
- **KERVAN LİSTESİ YANLIŞ YERDEYDİ VE EKSİKTİ.** Liste vardı ama yalnız "Oyuncu Pazarı" sekmesinde çiziliyordu: hammadde gönderen oyuncu, gönderiyi yaptığı sekmede kervanını göremiyordu ve başka sekmeye geçmesi gerektiğini bilmesinin bir yolu yoktu. Artık sekmelerin ÜSTÜNDE, her sekmede (`Kervanlar.jsx`).
- Üç eksik daha kapandı: (1) tek kaynak gösteriyordu, çok kaynaklı hediye gönderileri listede **boş** görünüyordu; (2) kalan süre ham saniyeydi ("4210 sn"); (3) tüccar sayısı hiç yazmıyordu — oysa asıl merak edilen "kaç tüccarım bağlı, ne zaman serbest kalacak".
- **GİDİŞ ve DÖNÜŞ ayrı gösteriliyor**: gidişte "mal ne zaman varır", dönüşte "tüccarım ne zaman boşalır". Dönüş fazında yük hiç yazılmıyor — kervan boş dönüyor, yükü göstermek "mal hâlâ yolda" izlenimi verirdi.
- **HARİTADA KILIÇ ROZETİ** (`army.js · saldirilarim` → `MapView · SaldiriRozeti`). Harita bugüne kadar yalnız "kim nerede" diyordu; oyuncunun kendi geçmişi hiç görünmüyordu, hangi köye vurduğunu hatırlamak için raporları tek tek gezmek gerekiyordu.
- **Rapordan TÜRETİLEMEZDİ**: raporlar son 25 ile sınırlı (`MAX_REPORTS`), yani yirmi beş yeni rapordan sonra rozet sebepsizce kaybolurdu. Hedef başına TEK kayıt tutuluyor; keşif verisi gibi saldıranın köyünde duruyor — "ben kime vurdum" benim bilgim, hedefin değil.
- **Renk sonucu söylüyor**: kazandığın hedef kırmızı, kaybettiğin gri. Tek renk olsaydı rozet yalnız "buraya gitmiştim" derdi; asıl bilgi sonuç. Tekrar vurduysan rozetin altında ×N, hover kartında kaç kez / sonuç / toplam ganimet.
- **Kayıt tavanı 60 hedef**: aktif bir oyuncu yüzlerce köye vurabiliyor, hepsini süresiz tutmak kaydı şişirir ve haritayı kılıç tarlasına çevirirdi. En eski dokunulan hedefler düşüyor — harita "son zamanlarda nerelere vurdum" sorusunu cevaplıyor, ömür boyu sicil tutmuyor.
- Yağma ile saldırı haritada AYRILMIYOR: ikisi de "vurdum" demek ve iki ayrı simge o boyutta okunmuyor; ayrıntı zaten hover kartında.

### Hammadde gönderme + harita kısayolları (14 Eylül 2026)
- İlkan: *"pazardan istediğime hammadde yollayabilmeliyim. oyuncu köy ismi girerek yada oyuncuda bularak yollayabilmeliyim. ek olarak haritada bir köye tıkladığımda saldır, destek gönder, hammadde gönder, keşfet gibi kısayollar olsun"*.
- **KARŞILIKSIZ GÖNDERİ** (`pazar_hammadde_gonder`). Pazar bugüne kadar yalnız TAKAS yapıyordu: birine bir şey vermek için ondan karşılığında bir şey istemek ve onun da kabul etmesi gerekiyordu. Müttefiki beslemek, yeni köye yardım etmek, borç ödemek — hiçbiri mümkün değildi.
- **TEK KERVAN, KARIŞIK YÜK**: beş kaynak tek gönderide gidiyor. Her kaynak için ayrı gönderi açsaydık her biri kendi tüccarını bağlardı — 100'er birimlik beş kaynak, 500 birimlik tek sevkiyatın BEŞ KATI tüccar tutardı. `pazarYol.gonderi` artık `yuk` sözlüğü taşıyor; takasın tek kaynaklı biçimi de aynı alana yazılıyor, eski kayıtlar `yukOf` ile okunuyor.
- Kurallar: yalnız OYUNCU köylerine (NPC'ye hediye kaynağı çöpe atmak olurdu), geri alınamaz (iptal olsaydı "gönderdim" deyip son anda çekmek mümkün olurdu), tüccar dönene kadar bağlı (yoksa mesafe bedava olur, uzakla ticaret yakınla aynı maliyete gelirdi).
- **İKİ TARAFA DA RAPOR, çıkış anında**: kapısına mal bırakılan oyuncu bunu ancak deposundaki sayı değişince fark ederdi ve kimin gönderdiğini hiç öğrenemezdi. Çıkışta yazmak ayrıca bilgi: yardımın YOLDA olduğunu bilmek varış zamanını hesaplatıyor. Rozet kendi etiketini alıyor (HAMMADDE GELDİ/GİTTİ) — "DESTEK GİTTİ" yazmak asker yolladığını düşündürürdü.
- **HEDEF ARAMA tamamen istemcide**: dünya anlık görüntüsü zaten bütün köyleri (ad + sahip) taşıyor; her tuşta sunucuya sormak on bin köylük bir dünyada gereksiz bir tur olurdu. Köy adı VE oyuncu adı aynı kutudan aranıyor.
- **HARİTA KISAYOLLARI**: köy panelindeki tek "ORDU GÖNDER" düğmesi yerine SALDIR · YAĞMA · KEŞFET · DESTEK · HAMMADDE. Sefer ekranı seçilen kiple açılıyor (`SendArmyPanel · baslangicKip`) — kip kararı köyün başında veriliyor, ekranı açtıktan sonra değil. Hammadde kısayolu gönderi penceresini hedefi dolu olarak açıyor; pazar ekranıyla AYNI bileşen (`HammaddeGonder`), ikisini ayrı yazsaydık tüccar hesabı ve depo sınırı iki yerde durur, biri düzeltilince diğeri eskirdi.
- Dev kısayolu: "Binaları son seviyeye" artık eksik PAZARI da kuruyor — pazarsız bir köyde takas, teklif ve gönderi ekranlarının hiçbiri açılmıyordu ve denemek için elle pazar kurmak gerekiyordu.

### Savunma yapılarının katkısı + simülatör Ordu'nun altına (14 Eylül 2026)
- İlkan: *"savaş simülatörü menüsünü ordu menüsünün altına taşı, bir de ordu menüsünde mevcut defans binalarımın katkısını yüzde olarak ayrı ayrı göster"*.
- **SAVUNMA YAPILARI bölümü** (`ArmyPanel` · `SavunmaYapilari`): sur, hendek ve HER KULE ayrı satır, her birinin yüzde katkısı, seviyesi ve karşılaştırma çubuğu. Sayı bugüne kadar yalnız savaş raporunda ve ÜÇÜ TOPLANMIŞ tek bir `wallBonusPct` olarak vardı — oyuncu saldırıya uğramadan savunmasını göremiyor, gördüğünde de hangisini yükselteceğini bilemiyordu.
- **Boş kule uyarısı**: katkısı sıfır yazılıyor ve "dolu olsa +%X" diye kaybedilen bonus gösteriliyor. Kulesi olup okçusu olmayan köyde yükseltmeden önce bakılacak ilk yer orası.
- **Kahraman AYRI satırda**, sur tavanının dışında: savaşta ayrı bir çarpan olarak biniyor, aynı listede toplanmış gibi göstermek yanlış olurdu. Köyde değilse "döndüğünde işler" diye yazıyor.
- **TEST BİR TUTARSIZLIK YAKALADI**: özet kule katkılarını tek tek yuvarlayıp topluyordu; altı dolu Lvl 20 kulede bu %34,8 veriyor, savaşta kullanılan `towerBonusPct` ise %35. Ekranda %149,8 yazıp savaşta %150 uygulamak ekranı yalancı yapardı. Toplam artık savaşın kendi fonksiyonundan geliyor; satırlardaki sayılar yalnız gösterim için yuvarlı.
- **Ölçüm — tavan ulaşılamaz**: sur 20 (%80) + hendek 20 (%35) + altı dolu kule (%35) = **%149,8**, yani `DEF_BONUS_CAP` (%150) bugün hiç devreye girmiyor. Tablolar zaten oraya nişan almış; tavan elle yapılacak bir dengelemeye karşı duran emniyet. Test hem kırpma kuralını hem dengenin tavana yaslandığını tutuyor.
- **Savaş simülatörü üst bardan kalktı**, Ordu sekmesinin altına alt sekme oldu. Simülatör ordunun bir aracı; üst bar da on bir sekmeyle taşıyordu. Alt sekme seçimi App'te tutuluyor — oyuncu her dönüşünde baştan tıklamasın.
- Dev kısayolu düzeltildi: "Binaları son seviyeye" yalnız VAR OLAN binaları yükseltiyordu, yani suru olmayan bir köyde çalıştırdıktan sonra hâlâ sur yoktu ve savunma ekranını denemek imkânsızdı. Artık eksik sur, hendek ve ilk üç kuleyi de kuruyor.

### Keşif raporu kaybı gösteriyor + ölçek kesilmesi (14 Eylül 2026)
- İlkan: *"keşife adam yolladım ama çoğu gelmedi ve raporda kaçı öldü ya da karşıda kaç keşifçi vardı yazmıyor"* ve *"yazıyı büyütünce ekran sağdan soldan kesiliyor, yazılarda çok büyümüyor"*.
- **Keşif raporu**: sunucu kaybı ve karşı izci sayısını zaten gönderiyordu (`myLosses`, `savunanIzci`), ekran göstermiyordu. Çarpışma bloğu `outcome !== 'kesif'` ile sınırlıydı — yani tam da BAŞARILI keşifte hiç çizilmiyordu. Oysa bilgiyi almak ile bedelini görmek aynı raporun iki yarısı.
- Blok artık istihbaratın ÖNÜNDE: oyuncunun ilk sorusu "kaç izcim öldü", ikincisi "ne gördüm".
- Başarılı keşfe özel satır: *"Köy seni fark etti ve 6 izciyle karşı koydu… Bedeli 23 izci: gönderdiğin 60 izciden 37 tanesi dönüyor."* Bir dahaki sefere kaç izci göndereceğini bu sayı belirliyor.
- Karşıda izci YOKSA blok hiç çizilmiyor (`kesifCarpismasi`): çarpışma olmamışken "0 kayıp, 0 karşı casus" satırları boş gürültü olurdu.
- Sunucu sözleşmesi iki testle kilitlendi (`kesif.test.js`): başarılı keşif raporunda kayıp + karşı izci sayısı yazılı ve dönen sefer = gönderilen − kayıp; izcisiz köyde her ikisi de sıfır ve savunan haber almıyor.
- **ÖLÇEK KESİLMESİ — zoom'da yüzde ile görüntü birimi aynı davranmıyor.** Ölçüldü (1280×720, %135): `width: 100%` tarayıcı tarafından ZOOM UZAYINDA çözülüyor (948 px hesaplanıp tam 1280 px çiziliyor), `height: 100dvh` ise bölünmüyor. Genişliği de ölçeğe bölmüştük; iki kez bölününce düzen 702 px'lik bir kutuya sıkışıp ekranın iki yanından kesiliyordu.
- Aynı tuzak bileşenlerde de vardı: `calc(100vw - 16px)` ile çizilen yama notları paneli %200 ölçekte **2524 px** genişliğe çıkıyordu. Bölme artık TEK YERDE: `--tn-vw` / `--tn-vh` değişkenleri düzenin gerçekte kullanabildiği alanı veriyor ve 23 kullanım bunlara bağlandı. Bileşenlerde ham `vw/vh` yazılmayacak.
- **Üst sınır %150 → %200.** Oyunun taban yazıları 9-11 px; %150 bunu ancak 13,5-16,5 px yapıyordu. %200 bozulmuyor çünkü ölçek büyüdükçe düzen kendiliğinden dar ekran biçimine geçiyor (1280 px pencere %200'de 640 px'lik bir düzene denk) — yani yüksek ölçek bir bozulma değil, zaten var olan ikinci yerleşim.
- Dev kısayolları: "Ordu ver" artık 30 izci de veriyor, "Surlu hedef köy" hedefe 15 izci koyuyor (keşif yalnız izciye karşı savaşıyor; izcisiz NPC'de çarpışma hiç kurulamıyordu) ve yeni "Keşif raporu üret" kısayolu sentetik bir kayıplı keşif raporu basıyor — rapor düzenlerini denemek için gerçek sefer kurmak pahalı çıkıyordu.

### Ayarlar menüsü ve arayüz ölçeği (14 Eylül 2026)
- İlkan: *"şimdi bir ayarlar menüsü yapalım ve bütün ayarları oraya dolduralım. font büyüklüğü ayarı da oraya ekleyelim. bazı kullanıcılarda yazılar çok küçük kalıyor ordan ayarlasınlar. sesler ile alakalı her şeyi oraya ekleyelim."*
- **Üst barda dişli → Ayarlar penceresi** (`AyarlarMenu.jsx`), üç sekme: Görünüm · Müzik · Sesler. Bugüne kadar tek ayar müzikti ve üst bardaki hoparlörün ARKASINA gizlenmişti; "ayarlar nerede" sorusunun cevabı yoktu.
- **Tek depo, tek anahtar** (`ayarlar.js` · `tn.ayarlar`). Eksik alan varsayılana düşüyor: yeni bir ayar eklemek bir alan eklemek, yeni bir depolama anahtarı ve göç kodu değil. Olay listesi KODDAN geliyor, kayıttan değil — yoksa sonradan eklenen ses satırları eski oyuncularda hiç görünmezdi.
- **ARAYÜZ ÖLÇEĞİ %85-150.** Yalnız yazı değil arayüzün TAMAMI ölçekleniyor (CSS `zoom`): arayüz satır içi piksel ölçüleriyle yazılmış, yalnız yazı büyüseydi 11 px için hesaplanmış kutular taşar ve sayılar kırpılırdı.
- `transform: scale` DEĞİL `zoom`: transform düzeni değil yalnız çizimi ölçekler — sabit konumlu katmanlar kayar, tıklama alanları görselin dışında kalırdı.
- **Ölçülerin ölçeğe BÖLÜNMESİ şart** (`#root`, pencere tavanı, perde): zoom içindeki `100dvh` yine görüntü alanı kadar CSS pikseli demek, zoom ile çarpılınca ekrandan taşıyor. Ölçüldü — %130 ölçekte önce sayfanın altı, sonra ayar penceresinin başlığı kesiliyordu.
- **Kırılma noktaları da ölçeğe bölünüyor** (`responsive.js`): 1280 px pencere %130 ölçekte 985 px'lik bir düzene denk. Ham `innerWidth`e baksaydık oyuncu yazıyı büyüttüğünde masaüstü düzeni inatla sürer, iki ray ve sahne ekrana sığmazdı. Ölçek değişince `resize` gelmediği için ayar deposu dinleniyor.
- **Pencere portal ile gövdeye açılıyor**: üst barda `backdropFilter` var ve filtre uygulanan öğe içindeki `position: fixed` katmanlar için yeni bir kapsayıcı blok kuruyor. Ölçüldü: perde görüntü alanına değil üst bara hizalanıyor, pencere ekranın üstünden taşıyordu (top: −177). Portal gövdeye açıldığı için `#root` zoom'u işlemiyor; pencereye aynı zoom ayrıca uygulandı — yoksa yazıyı büyüten oyuncu tam da büyütmeyi yaptığı pencereyi küçücük görürdü.
- **SESLER: 11 olay, her biri ayrı anahtar ve ayrı seviye** (İlkan'ın isteği). Tek bir "ses efektleri" anahtarı yetmezdi: saldırı uyarısını duymak isteyip inşaat sesini istememek en sık yapılan ayardır. Olay seviyesi ana sesle ÇARPILIR.
- Ses çalar (`ses.js`) müzikten AYRI: müzik tek uzun akış, efektler onlarca kısa ve üst üste binebilen ses; tek çalarda toplasaydık bir uyarı müziği keser ya da ikinci olay birincisini susturuurdu. Olay başına 3 çalarlık havuz (üç bina aynı tikte bitebiliyor).
- **Dosyalar henüz yok ve bu bilerek sorun değil**: ayar ekranı, kayıt biçimi ve çalma yolu dosyalardan önce oturdu. Eksik dosya sessiz geçiliyor ve ayar ekranında bu açıkça yazıyor — gizleseydik oyuncu ayarları kurcalayıp "bozuk" diye düşünürdü.

### Bina panelinde açıklama + son seviye altın (14 Eylül 2026)
- İlkan: *"köy ekranında bir binaya tıkladığımda orada da her bina için bir açıklama olsun. son lvl a ulaşmış binaların lvl yazıları altın rengi olsun full olduğunu anlayayım."*
- **Bina paneline "NE İŞE YARAR" kartı**: metin `villageDefs` tanımından, yani yardım menüsündekiyle BİREBİR aynı kaynak — iki yere ayrı metin yazmak kısa sürede ayrışır ve oyuncu iki farklı doğru öğrenirdi. Kartta "AYRINTI" düğmesi yardım sayfasını o binada açıyor.
- Kart denetimlerin ÜSTÜNDE: oyuncu binayı ilk kez açtığında önce ne işe yaradığını okumalı, yükseltme düğmesi ondan sonra gelir.
- **Tavana varan binanın LVL yazısı ALTIN** — hexte, kulede ve panel başlığında. Tavan binadan binaya değişiyor (lonca 5, Rún Salonu 10, çoğu 20); seviye sayısı tek başına "bitti mi" sorusunu cevaplamıyordu, oyuncu yükseltilecek bina ararken her hexi tek tek açmak zorundaydı. Kural tek yerde (`tavandaMi`) ki üç yer aynı cevabı versin.
- Panelde ayrıca "SON SEVİYE · LVL 20" rozeti: paneli açan oyuncu "yükseltebilir miyim" sorusunun cevabını düğmeye uzanmadan görüyor.

### Görevlerde "bitenleri gizle" (14 Eylül 2026)
- İlkan: *"görevlerde yaptığım görevleri gizle gibi birşey olsun"*.
- Ödülü alınmış görevler zaten listenin sonunda duruyordu ama sayıları arttıkça kaydırma mesafesini uzatıyordu: 48 görevin 42'si bitmişken oyuncu sıradaki işi görmek için listeyi sürekli aşağı çekiyordu.
- **Sayaçlar SÜZÜLMÜYOR** — 42/48 gizlemeyle 0/6'ya dönseydi oyuncu kaç görev kaldığını göremezdi; gizlemenin amacı listeyi kısaltmak, ilerlemeyi saklamak değil.
- Varsayılan AÇIK ve tercih `localStorage`'da: biten görev bir kazanç kaydı, oyuncu istemeden ekrandan silmek doğru olmazdı; ama her sekme açılışında yeniden işaretlemek de gerekmemeli.
- Hepsi bittiğinde boş kutu kalmıyor: *"Ana hattın tamamı bitti — 29 görev"* yazıyor. Oyuncu listenin kaybolduğunu değil, işi bitirdiğini görmeli.

### Eşya nadirliği beş sınıfa çıktı + at gerçek süvari hızı veriyor (14 Eylül 2026)
- İlkan: *"hero itemleri gri yeşil mavi mor ve turuncu olarak sınıflansın... düşme şanslarına göre olsun. efsanevi çok nadir düşsün"* ve *"kahramana at verince normal birimler attan ne hız bonusu alıyorsa alsın. atın nadirliği daha da hızlandırsın ve macera da kısalsın hıza göre"*.
- **Beş nadirlik sınıfı**: gri Sıradan (1×) · yeşil **Ustaişi** (1,5×) · mavi Nadir (2,1×) · mor **Epik** (2,8×) · turuncu Efsanevi (3,6×). Mor kademe yeni: dört sınıfta nadir ile efsanevi arasındaki uçurum (11'de bir → 3'te bir) tek adımda atlanıyordu.
- **Anahtarlar korundu** (`siradan/iyi/nadir/efsane`): oyuncuların envanterinde bunlar yazılı, değiştirseydik kayıtlı bütün eşyalar geçersiz olurdu. Değişen yalnız görünen ad ve renk; yeni anahtar sadece `epik`.
- **Düşme şansları**: %55,8 · %26,9 · %12 · %4 · **%1,2**. Efsanevi bilerek çok nadir ama %0,1 değil — hiç kimsenin göremediği bir sınıfın var olma sebebi kalmaz. Test kurayı 200 bin çekimle ölçüp ağırlıklara uyduğunu doğruluyor.
- **At hız eki BİRİM TANIMLARINDAN ölçülüyor**: süvarilerin ortalama hızı eksi piyadelerinki (bugün 4,6). Sabit sayı yazsaydık birim hızları dengelenirken kahraman sessizce ayrışırdı — test iki tarafı karşılaştırıyor. Sonuç: atlı kahraman `demirAtli` mertebesinde hızlı, tam olarak istenen.
- **Hız tavanı 16 → 20**: eski tavanda efsanevi atlar tavana çarpıyor, epik ile efsanevi aynı hızı veriyordu; nadirliğin karşılığı kayboluyordu. Yeni ölçüm: yaya 7 · sıradan Zırhlı At 12 · efsanevi Kuzey Rüzgârı 19,5. Test hiçbir atın tavana çarpmadığını kilitliyor.
- **Macera süresi hıza bağlandı**: süre hızla ters orantılı, zemin 0,30 (en çok %70 kısalır). Yaya kahramanda çarpan tam 1 — yeni kural mevcut dengeyi yalnız at takıldığında değiştiriyor. Zemin önce 0,45 seçilmişti; ölçünce atların çoğunda doluyordu (nadir Bozkır Atı ile efsanevi Kuzey Rüzgârı aynı süreyi veriyordu) ve nadirlik süreye yansımıyordu.
- Eşyanın `maceraHizi` bonusu bugüne kadar **hiçbir yerde kullanılmıyordu** (Bozkır Atı'nın %25'i ölü veriydi); aynı çarpandan geçirilerek bağlandı.
- Arayüz: macera kartında yeni süre + üstü çizili eski süre. Renkler sunucudan geliyor (`kusam.js` özetleri), istemcide ikinci bir nadirlik tablosu yok — ayrışacak ikiz tanım oluşmasın.

### Sağlık çadırı REVİR oldu: yaralılar zamanla iyileşiyor (14 Eylül 2026)
- İlkan: *"İYİLEŞTİRME ÇADIRININ LVL İ KAÇ ASKER iyileştirebileceğinin de sınırını belirlesin"* ve *"askerler pat diye iyileşmesin üretim sürelerinin 2 katı kadar sürede iyileşsinler. çadırın dolma ihtimali olsun"*.
- **Asker artık pat diye dönmüyor**: yaralı çadırda YATIYOR (`village.saglikYatan`) ve kendi eğitim süresinin **iki katı** kadar sürede iyileşip orduya dönüyor. Anında dönseydi savunmak neredeyse bedava olur, savaşın ertesinde ordunun eksildiği an diye bir şey kalmazdı.
- İyileşme süresi eğitim süresiyle **aynı tanımdan** türüyor (ekipman sayısı); test bütün birimler için ikisini karşılaştırıyor, yoksa oyuncuya söylenen "2 katı" zamanla yalan olurdu.
- **Yatak kapasitesi**: seviye başına 10, Lvl 20 de 200. Sığmayan yaralı ölüyor. Sınırsız olsaydı Lvl 20 çadır on bin kişilik bir savaşta dört bin askeri kurtarır, çadır tek başına savunmayı belirlerdi. Yataktan fazla yaralı çıkarsa kırpma **orantılı** — "hangi birim yatağa girsin" diye keyfî bir sıra gerekmesin.
- **Yataklar iyileşme bitene kadar dolu**: arka arkaya iki saldırıda ikincinin yaralılarına yer kalmayabilir. Çadır bir tampon, sınırsız bir diriliş makinesi değil.
- **KURAL DEĞİŞTİ — artık yalnız EV SAHİBİNİN askerini alıyor.** Eskiden kayıp pay edilmeden önce azaltılıyordu, yani çadır misafirin askerini de kurtarıyordu; yeni kuralda yaralı iyileşince BU köyün ordusuna döndüğü için o, başka bir oyuncunun ordusunu devralmak olurdu. Yaralı seçimi pay ettikten sonra `pay.evSahibiPay` üzerinden yapılıyor.
- **Nüfus muhasebesi**: yaralı da savaşta ölü sayılıp nüfustan düşüyor, iyileşip dönünce nüfusa geri ekleniyor (`tick.js · processRevir`). Yoksa çadır orduyu büyütürken nüfusu kalıcı olarak eksiltirdi.
- Rapor artık **çadırın dolduğunu** da yazıyor (kaç yaralıya yatak bulunamadı, kapasite ne). Bu bilgi olmadan oyuncu askerinin neden öldüğünü ve binayı neden yükseltmesi gerektiğini göremezdi.
- **TEDAVİ BİR KARAR** (İlkan): yaralı çadıra kendiliğinden giriyor ama sayaç ancak oyuncu o birliği SEÇİNCE işliyor. Kendiliğinden başlasaydı çadır bir karar noktası değil, arka planda dönen bir sayaç olurdu.
- Arayüz: yaralılar **Sağlık Çadırı binasının kendi ekranında KART olarak** (client/src/components/RevirPanel.jsx). "Tedavi bekleyen" kartları seçilebiliyor (seç + İYİLEŞTİR, ya da hepsini), "tedavide" kartlarında ilerleme çubuğu ve kalan süre var. Önce sağ raya konmuştu, İlkan kaldırttı: ray göz ucuyla bakılan bir yer, oysa burada karar veriliyor.
- Boş revir bile bir şey anlatıyor: binanın ne yaptığını ve yükseltmenin ne getirdiğini yazıyor — oyuncu bu binayı ilk kez açtığında karşısında boş bir kutu değil, yükseltme sebebi bulmalı.
- Parmak izine revir eklendi (sayı + toplam + **tam saate yuvarlanmış** kalan süre); yuvarlama olmasa parmak izi her tikte bozulur ve tam paket saniyede bir giderdi — parmak izinin var olma sebebi tam olarak bunu önlemek.

### Sağlık çadırı artık çalışıyor (14 Eylül 2026)
- Bina aylardır tanımlıydı ve HİÇBİR ŞEY YAPMIYORDU: oyuncu kuruyor, kaynak harcıyor, karşılığında hiçbir şey almıyordu. Satılan bir oyunda duran ama işlemeyen bir bina, eksik bir özellikten daha kötü.
- **Savunanın kayıplarının bir kısmı iyileşiyor**: seviye başına %2, Lvl 20 de %40 (game/saglik.js). TODO'daki ilk öneri (seviye × 0,05, tavan %50) Lvl 10'da tavana dayanıyordu — o hâlde 11-20 arası seviyelerin hiçbir karşılığı olmazdı; test bunu kilitliyor.
- **YALNIZ SAVUNANA** işliyor: çadır köyde, saldırıda ölen asker günlerce uzakta. Saldırana da işleseydi saldırmanın bedeli düşer ve savunma avantajı ters dönerdi.
- **Savaşın SONUCUNU değiştirmiyor** — kazanan, ganimet ve kuşatma aynı. Değiştirseydi savaş hesabı iki aşamalı olur, oyuncu saldırmadan önce ne olacağını kestiremezdi.
- İyileşme **pay edilmeden ÖNCE** uygulanıyor: çadır kimin askeri olduğuna bakmadan TOPLAM kaybı azaltıyor; kalan kaybın kime yazılacağını yine eski kural belirliyor (önce ev sahibi, artanı misafirler). Yani ev sahibinin tamamen kırıldığı bir savaşta kazanç misafire yansıyor — yan etki değil, iki kuralın doğru birleşimi.
- **Yuvarlama AŞAĞI**: 1 kayıplı bir savaşta Lvl 1 çadır (%2) kimseyi kurtarmıyor. Yukarı yuvarlasaydık oranın elli katı bir etki doğardı.
- **DÖNGÜSEL REQUIRE TUZAĞI**: kural önce koyKurallari.jse yazıldı ama o dosya army.jsi require ediyor; karşılıklı require yükleme sırasına göre bağlantıyı boş bırakıp savaşı çökertti (ölçüldü: *"KOY.saglikIyilesmeOrani is not a function"*). Kural hiçbir şey require etmeyen game/saglik.jse alındı.
- Raporda ayrı bölüm: "SAĞLIK ÇADIRI — %X İYİLEŞTİ" + iyileşen birimler. Yalnız kalan kaybı gösterseydik oyuncu çadırın işe yarayıp yaramadığını göremez, onu yükseltmek için sebep bulamazdı. Bina açıklaması da gerçek etkiyi yazıyor (iki tanımda birden).
- **Doğrulama:** 9 test, gerçek resolveArrival üzerinden (savunanın ordusu gerçekten kurtarılıyor, saldıran etkilenmiyor, sonuç değişmiyor, misafirler pay alıyor, çadırsız raporda alan hiç yazılmıyor). **Rapor bölümü EKRANDA GÖRÜLMEDİ** — savunan taraf olmak için ikinci bir hesapla PvP kurmak gerekiyordu; sunucu tarafı testlerle doğrulandı.

### Kahraman hızı ve atlı/yaya sınıfı (14 Eylül 2026)
- İlkan'ın kararı: *"kahramanın bir hızı olsun ve at bu hızı artırsın sadece. Eğer kahraman atlı ise atlı gibi vursun, at yoksa yaya askeri gibi."*
- **HIZ**: yaya tabanı 7 (hızlı bir piyade kadar), tek kaynağı AT. Başka slotlara dağıtılsaydı hız görünmez bir yerden birikir ve oyuncu kahramanının neden hızlandığını anlamazdı — test kilitliyor: at dışındaki hiçbir eşya hız bonusu taşıyamaz.
- **HIZ TAVANI 16**: nadirlik bütün bonusları ölçeklediği için efsane bir at kahramanı oyunun en hızlı biriminden (izci 14) de hızlı yapabiliyordu — ölçüldü, 21 çıktı. Haritada hiçbir şeyin yakalayamadığı bir birim keşfi ve savunma tepkisini anlamsız kılardı.
- **ORDUYLA GİDERSE hızı sayılmıyor**: kahraman orduyu bekler, en yavaş birim yine belirleyici. Aksi hâlde atlı kahraman mancınıkları da kendi hızında uçururdu.
- **SINIF**: at slotu doluysa SÜVARİ, boşsa PİYADE. Ham gücü o tarafa yazılıyor ve savunanın atlı/yaya dengesini kaydırıyor — atlı kahramana karşı mızrakçı, yaya kahramana karşı kalkancı işe yarıyor. Hep piyade saysaydık at kuşanmanın savaşta hiçbir anlamı olmazdı. Sınıf da sefer çıkarken **donduruluyor** (güç ve birim bonusuyla aynı gerekçe).
- **ALTI AT, ALTI FARKLI HIZ** (İlkan: *"her atın hızı aynı olmayacak"*): Zırhlı At 0,5 (zırhlanma) · Köy Beygiri 1 (can) · Savaş Atı 1 (saldırı) · Fiyort Midillisi 1,5 (iyileşme) · Bozkır Atı 2 (macera hızı) · Kuzey Rüzgârı 3 (başka hiçbir şey). Gerçek hız aralığı 7,5–16.
- **EN HIZLI AT BAŞKA HİÇBİR FAYDA VERMİYOR** — test bunu kilitliyor. Verseydi diğer beş at çöp olur, at slotu bir seçim olmaktan çıkardı.
- Arayüz: kimlik şeridinde "SÜVARİ · hız 9,4" rozeti, kuşam özetinde HIZ satırı, at slotu boşken açıklama, sefer panelinde ve savaş raporunda sınıf yazıyor.
- Ölçüldü: Nadir Savaş Atı → SÜVARİ · hız 9,4; at çıkarılınca → YAYA · hız 7.

### Dayanıklılık eşyaları, güç–hasar bağı ve pazar düzeltmesi (14 Eylül 2026)
- İlkan sordu: *"itemler arasında sağlık yenileme hızını ya da aldığı hasarı azaltan itemler var mı?"* — İYİLEŞME vardı (Zincir Zırh, Demir Nallı Çizme), HASAR AZALTMA yoktu. Eklendi.
- **ZIRHLANMA** yeni bonus türü: alınan hasarı yüzde azaltıyor, hem macerada hem savaşta. Azaltma `hasarVer` içinde — hasarın girdiği TEK kapı orası; her çağırana ayrı azaltma yazmak er geç birinde unutulacak bir tekrar olurdu. **Tavan %50**: tavansız yığılma kahramanı ölümsüz yapar, macera riskini sıfırlardı.
- Yeni eşyalar: **Demir Kalkan** (−%6), **Ayna Zırh** (−%9), **Demir Miğfer** (−%4 + can), **Zincir Etek** (−%4), **Kutup Tilkisi Postu** (iyileşme + −%3), **Şifa Taşı** (+3/sa iyileşme). Artık her slotta bir dayanıklılık seçeneği var — test bunu kilitliyor.
- **SALDIRI GÜCÜ MACERADA HASARI AZALTIYOR** (İlkan'ın kararı): her 200 güç için %1, tavan %40. Mantığı: macerada yıpratan şey yol boyunca karşılaşılan tehlike; daha güçlü vuran kahraman onu daha çabuk bertaraf eder. Azaltma ayrı bir skile değil, saldırı gücünün KENDİSİNE bağlı. **Savaşta işlemiyor** — orada yıpranmayı ordunun kayıp oranı belirliyor ve saldırı gücü zaten kendi kanalından sayılıyor; ikinci kez saymak onu iki katı değerli yapardı.
- Zırhlanma ve güç azaltması **ÇARPIM** hâlinde birleşiyor (toplama değil): ikisi de tavanındayken bile hasar sıfırlanmıyor.
- Macera kartlarında ve raporda artık **GERÇEK** can kaybı yazıyor, ham sayı parantezde. Ham sayıyı göstermek oyuncuya yatırımının karşılığını gizlemek olurdu.
- **İstatistiklere "En güçlü kahraman"** tablosu eklendi. Ordu bilgisinden farkı: seviye bir SONUÇ, gizli bir kuvvet değil — kaç asker olduğunu sızdırmıyor. Köyler üzerinde TOPLANMIYOR, en yükseği alınıyor (kahraman tek; merkez taşınmış hesapta kayıt bir süre iki yerde görünebilir).
- **HATA: pazar yükseltilirken takas kapanıyordu** (İlkan bildirdi). `pazarBinasi` `!b.building` arıyordu; oysa oyunun her yerindeki kural bunun tersi — tarla yükseltilirken üretim, kışla yükseltilirken eğitim durmuyor. **Aynı hata sarayda da vardı**: saray yükseltilirken merkez taşınamıyordu. İkisi de düzeldi; ilk inşaat (seviye 0) hâlâ kapalı.
- Ölçüldü: tam yatırımlı kahraman (8.000 güç + efsane zırh seti) uzun macerada 32 yerine 13 can kaybediyor. Ekranda "Saldırı gücün macerada alınan hasarı %23,4 azaltıyor" ve kuşam özetinde "ALINAN HASAR −%9" görüldü. 211 test geçiyor.

### Kahraman: maceralar, eşyalar, ölüm ve diriltme (14 Eylül 2026)
- **MACERA** (`game/macera.js`): Kahraman Konağında zamanla macera hakkı birikiyor — konak seviyesi hem tavanı (Lvl 1'de 3, Lvl 20'de 12) hem birikme hızını (6 → 2 oyun saati) büyütüyor. Tavan doluyken ilerleme **saklanmıyor**: saklansaydı bir hafta girmeyen oyuncu onlarca macerayı tek seferde patlatırdı.
- **Kısa / uzun macera.** Uzun macera kısanın ~3 katı XP veriyor ama ~4 katı can götürüyor — oran bilerek aleyhte; "her zaman daha iyi" olsaydı seçim diye bir şey kalmazdı. Ödül kurası: hammadde ~%60, asker ~%28, eşya ~%12 (4.000 ödül üzerinde ölçüldü). **XP garanti**, ödül kura: boş dönen macera "zamanımı boşa harcadım" dedirtirdi.
- **Can eşiği**: canı tavanın %30'unun altındaki kahraman maceraya gönderilemiyor. Sınır olmasaydı oyuncu kahramanı her seferinde ölene kadar sürer, ölüm bir risk değil rutin olurdu.
- **EŞYA SİSTEMİ** (`data/heroItemDefs.js` + `game/kusam.js`): dokuz slot (miğfer · silah · kalkan · zırh · pantolon · ayakkabı · bileklik · kolye · at), 18 eşya, dört nadirlik (sıradan 1× · iyi 1,6× · nadir 2,4× · efsane 3,5×). **Nadirlik ÖLÇEKLER, yeni etki eklemez** — farklı bir etki olsaydı her nadirlik ayrı bir eşya gibi öğrenilmek zorunda kalırdı.
- **İKİ BONUS KANALI** (İlkan'ın özel isteği): eşya hem KAHRAMANI (saldırı, can, iyileşme, macera hızı, ganimet) hem **ORDUYU** büyütüyor — birim SINIFLARININ saldırı/savunma yüzdesini. Ordu bonusu ekipman havuzundan **AYRI** hesaplanıyor; aynı yerden geçseydi kılıç/kalkan dengesi bozulur ve oyuncu hangi sistemin ne yaptığını ayırt edemezdi.
- **Eşyanın saldırısı HAM GÜÇ**, skil yüzde tavanına girmiyor: girseydi tam yatırımlı kahramanda efsane kılıç hiçbir şey katmaz, oyuncu topladığı eşyanın işe yaramadığını görürdü.
- **KAHRAMAN ÖLÜR** (İlkan'ın kararı; önceki "bayılır" kuralı kaldırıldı). Canı bitince ölüyor ve kendiliğinden geri gelmiyor: ya **hammadde** ödeniyor (bedel seviyeyle büyüyor — sabit olsaydı yüksek seviyede ölüm bedava olurdu) ya da maceradan düşen **Diriltme İksiri** kullanılıyor. İki yol da bilinçli: biriktiren oyuncu kaynağını korur, macera oynayan iksirle geri alır. Diriltilen kahraman **yarı canla** kalkıyor; seviye ve eşya kaybolmuyor.
- **Kahraman Lvl 1 de dört puanla doğuyor** (İlkan'ın kararı): sıfır puanla doğsaydı ekran ilk açıldığında yapacak hiçbir şey olmazdı.
- **Kahraman TEK BAŞINA gidebiliyor** — saldırı, yağma ve **TAKVİYE**. Takviyedeki kahraman gittiği köyde kalıyor ve savunma bonusunu ORAYA veriyor; kayıt ev sahibinin köyünde (`misafirKahraman`) tutuluyor ki ev sahibi çevrimdışıyken de işlesin. Geri çağırınca bonus HEMEN bitiyor ve kahraman yola çıkıyor (ışınlanmıyor) — tersi olsaydı bonus iki köyde birden sayılırdı.
- **Kuşatma makineleri TAKVİYE ile de gönderilebiliyor**: makineyi müttefikin ya da kendi sınır köyünün yanına yığıp saldırıyı oradan başlatmak meşru bir hamle ve makine yavaş olduğu için asıl kazanç bu. Yağmada hâlâ yasak.
- **Arayüz:** Kahraman sekmesi üç segmente ayrıldı — *Kuşam ve Çanta* (yan yana, sürükle-bırak için ikisi de ekranda), *Skiller* (2×2 kompakt kart), *Maceralar*. Çantada **slota göre süzgeç** var; boş bir kuşam slotuna tıklamak da süzüyor. Eşyanın üstüne gelince bonuslarını yazan **kart** çıkıyor (tarayıcının title özniteliği bir saniye gecikmeli ve tek satır düz metin — iki eşyayı karşılaştırmak imkânsızdı).
- **Kuşam özeti SKİL + EŞYA toplamını** gösteriyor. Eskiden yalnız eşya bonusu vardı ve skil puanı dağıtan oyuncu sayının değişmediğini görüp sistemin çalışmadığını sanıyordu (İlkan bildirdi).
- **Dev kısayolları:** "Kahramana eşya ver" ve "Kahramanı öldür" — eşya uzun maceraların ancak beşte birinde düşüyor, kuşam ekranını bir kez görmek için yedi macera beklemek gerekiyordu (ölçüldü). Üretimde yok (`TRANORD_DEV_CHEATS` kapısı).
- Ölçüldü: 7 uzun macera → Lvl 1'den Lvl 4'e, +13 asker, 1 eşya; dev kısayolu ile 5 eşya → Efsane Amber Kolye kuşanıldı, can tavanı 140 → 262,5; kahraman öldürüldü → iksirle diriltildi, can 131/262,5, iksir tükendi. 40 yeni test.

### Kahraman: temel, skiller ve savaş (14 Eylül 2026)
- **Kahraman Konağı** (yeni bina, askerî, unique, Lvl 20): kahraman burada doğuyor, iyileşiyor, eşyalarını burada tutacak. Konak yıkılırsa kahraman **silinmiyor** — yalnız üssünü kaybediyor; bir mancınık dalgası oyuncunun aylarca biriktirdiği kahramanı sıfırlayamamalı.
- **Kahraman KÖYE değil OYUNCUYA ait.** Kayıt merkez köyün state'inde (görev zinciriyle aynı yerde, ayrı tablo açmamak için). Köy bazında olsaydı beş köylü oyuncunun beş kahramanı olurdu.
- **XP ve seviye:** kuvvet eğrisi (100 × (s−1)^1,6) — Lvl 2 → 100, Lvl 10 → ~3.400, Lvl 20 → ~11.000, Lvl 100 → ~156.000. Ölçek macera ödülüne göre seçildi; denge ayarı iki sabitten yapılıyor.
- **Dört skil, seviye başına 4 puan** (İlkan'ın tarifi): Saldırı Puanı (+80 ham güç/puan), Saldırı Bonusu (+%0,2/puan, tavan %20), Savunma Bonusu (+%0,2/puan, tavan %20), Hammadde Üretimi (+3/sa her ham kaynak). Skil başına tavan 100 puan.
- **Yüzde bonusların TAVANI var** ve sur bonusundan **ayrı çarpan**. Toplansaydı ikisi tek tavana sıkışır, "surum yüksek, kahraman hiçbir şey katmıyor" gibi görünmez bir etki doğardı. Test: tam yatırımlı kahraman + 1 asker, 300 savunanı yenemiyor.
- **Ölmez, bayılır.** Canı 0'a inince 12 oyun saati kullanılamıyor, sonra çeyrek canla kalkıyor (sıfır canla kalksa sonraki savaşta anında yeniden bayılırdı). **Baygınken HİÇBİR bonus vermiyor** — yarım bonus bayılmayı sıradanlaştırırdı. Bayılma ve iyileşme aynı anda işlemiyor: ceza ikisi birden.
- **Skil sıfırlama bedelli ve bedel KATLANIYOR** (200 külçe + 200 tahıl, her seferinde ×2). Bedava olsaydı oyuncu savaştan önce puanları saldırıya, savunma sırasında savunmaya taşıyıp iki tavandan birden faydalanırdı; geri alınamaz olsaydı ilk yanlış dağıtım kalıcı ceza olurdu.
- **Sefere katılıyor** (saldırı ve yağmada; keşif izcinin, yerleşim göçmenin işi, takviyede kahramanı başka köyde bırakmak onu geri alınamaz hâle getirirdi). Gücü **sefer çıkarken donduruluyor** — yola çıktıktan sonra skil dağıtıp saldırıyı büyütmek mümkün değil. Ham güç PİYADE sayılıyor: süvari oranını kaydırıp savunanın atlı/yaya dengesini bozmamalı.
- **XP savaşın BÜYÜKLÜĞÜNE bağlı, sonucuna değil** (öldürülen birim başına 2). Yalnız zaferi ödüllendirseydik kahraman ancak kazanılacağı belli savaşlara sokulurdu. **Hasar kayıp oranına bağlı**: ordu sıyrık almadan kazandıysa kahraman da az yıpranıyor.
- **Raporda ayrı satır**: ham güç, orduya kattığı yüzde, kazanılan XP, can kaybı. Savunanın raporunda da görünüyor (saldıranın gücü + kendi savunma bonusu) — kahramanı köyde tutmanın işe yaradığını göremezse oyuncu onu hep sefere sürer.
- **Yeni sekme: Kahraman** (Ordu ile Seferler arasında, miğfer amblemi). Kimlik kartı + XP/can çubukları, dört skil satırı (açılır açıklama, toplu puan verme), sıfırlama, ve **eşya slotları** — Aşama 4'e kadar boş çerçeveler ama yerleşim şimdiden doğru, oyuncu kahramanın nereye varacağını görsün.
- Görev zincirine iki **YAN HEDEF**: *Kahramanın Evi* (konağı kur) ve *İlk Zaferler* (Lvl 3). Ana hat değil — kahraman güçlü ama oyunu oynamak için şart değil.
- **Yol açarken bulunan hata:** merkez köy YIKILINCA görev zinciri ve kahraman kaydı yıkılan köyle birlikte siliniyordu (`set_capital` taşıyordu, `koyuYokEt` taşımıyordu). Ortak `game/hesapKaydi.js` yazıldı, iki yol da oradan geçiyor, test kilitledi.
- Ölçüldü: konak kuruldu → kahraman doğdu (Lvl 1, can 100/100, +3,5/sa), sefer panelinde "Kahramanı da götür" kutusu çıktı, sefere iliştirildi, savaştan sonra raporda kahraman bloğu göründü ve kahraman üssüne döndü. 25 yeni test.

### Son köyü de düşen oyuncu OYUNDAN SİLİNİR (14 Eylül 2026)
- İlkan'ın kararı: *"köyleri haritadan silinen oyuncu oyundan tamamen silinir"*. Önceki "son köy boş kabuk olarak kalır" kararı geri alındı — kuşatmanın nihai bir bedeli olmadan köy yıkımı yarım bir mekanik kalıyordu.
- `oyuncuyuSil()`: oturum ÖNCE kapatılıyor, sonra kayıt siliniyor. Ters sırada bir sonraki tick yok olmuş bir hesabı kaydetmeye çalışır ve köy geri gelirdi. Oyuncuya `hesap_silindi` olayı gidip bağlantısı kesiliyor — sessizce atsaydık donmuş bir ekranla kalır, sebebini hiç öğrenemezdi.
- `db.js` / `db.dev.js` · `deleteUser`: köyler ve mesajlar ÖNCE siliniyor (yabancı anahtar), mesaj tablosu yoksa hesap silme yarıda kalmıyor.

### Köy yıkımı: bütün binalar düşünce köy haritadan silinir (14 Eylül 2026)
- Eskiden ana binanın altında `ANA_BINA_TABAN = 1` tabanı vardı: mancınık bir yerden sonra hiçbir şey değiştiremiyor, kuşatma anlamsızlaşıyordu. Taban **0** yapıldı.
- Ama köyün yok olma koşulu ana binanın sıfırlanması DEĞİL: **hiç binası kalmaması**. Tek bir mancınık dalgasının köyü silmesi satılan bir oyun için fazla sertti; hiç silinememesi de kuşatmayı boşa çıkarıyordu. Aradaki yer: "her binayı tek tek düşür".
- İki yol da aynı kuraldan geçiyor: **mancınıkla** yıkmak ya da **sahibinin kendi eliyle** yıkması. Kural `kusatma.js · koyBosMu`'da tek yerde, plumbing `index.js · koyuYokEt`'te.
- **Ana Bina artık yıkılabiliyor** — eskiden `demolish_village` `'0,0'` isteğini sessizce reddediyordu, yani oyuncu köyünü kendi eliyle terk edemiyordu.
- **Son binada onay metni ayrı uyarıyor**: "DİKKAT: Bu köyün SON binası. Yıkılırsa KÖY HARİTADAN SİLİNİR, geri alınamaz."
- **SON köy asla silinmiyor** (verilen karar): bütün binaları gitse bile boş kabuk olarak kalıyor ve yeniden inşa edilebiliyor. Hesabın oyundan tamamen düşmesi geri dönüşü olmayan bir ceza olurdu.
- Köy silinince merkez köyse **merkez kalan köylerden birine taşınıyor** (merkezsiz hesap görev kaydını ve kültür puanını kaybederdi), dünya haritasından ve kayıttan düşüyor, sahibinin ekranı `force + statics` ile tazeleniyor — parmak izi yalnız AKTİF köyü özetlediği için başka bir slotun silinmesi 30 sn'lik kalp atışını bekleyecekti.
- `koyBosMu` **tarlaları saymıyor** (arazi, bina değil) ve **inşa hâlindeki binayı "var" sayıyor** (seviye 0 ama kaynak yatırılmış; köyü altından çekmek o kaynağı da silerdi).
- Ölçüldü: iki köylü hesapta Alvby'nin Lvl 20 Ana Binası yıkıldı → köy kayıttan ve haritadan düştü, Bergheim merkez oldu. 135 test geçiyor (kuşatma dosyası 21 → 25).

### Ev sahibi misafir askeri geri yollayabiliyor (14 Eylül 2026)
- Takviyeyi bugüne kadar YALNIZ SAHİBİ geri çağırabiliyordu; ev sahibinin elinde hiçbir düğme yoktu. Oysa misafir askerin ekmeğini **ev sahibi** ödüyor: vazgeçmiş ya da uzun süre girmemiş bir oyuncunun bıraktığı takviye köyü sessizce aç bırakabiliyordu.
- Ordu ekranındaki "Köyümde misafir" listesine **GERİ YOLLA** geldi; sahibin listesiyle aynı miktar seçici (ortak `MiktarSecici` bileşeni) — istediğin kadarını yollarsın, kalanlar savunmaya devam eder.
- Sahibine **rapor** gidiyor: "X takviyeni geri yolladı" + geri yollanan birlikler + sebep. Askerinin neden yolda olduğunu göremezse oyuncu bunu hata sanardı.
- Sahibin köyü önce bellekteki oturumdan, yoksa **kayıttan** okunup geri yazılıyor. Asıl kullanım zaten çevrimdışı oyuncunun unuttuğu takviye; "oyuncu çevrimiçi olsun" şartı işi anlamsız kılardı.
- **GELEN SEFER VARKEN ENGELLENMEDİ — bilerek.** TODO'daki karar notu şöyle çözüldü: ilk bakışta "saldırı anında misafiri kov, savunmayı düşür" gibi bir sömürü var sanılıyor, ama SAHİBİ zaten her an geri çağırabiliyor ve onda böyle bir kısıt yok. Ev sahibine kısıt koymak yeni bir kapı kapatmaz, yalnız asıl kullanımı (açlıktan boğulan köyün fazla boğazı göndermesi) tam da gerektiği anda engellerdi.
- Ev sahibinin listesi de gönderen köy başına gruplandı — iki tarafta iki farklı gruplama aynı askerleri farklı sayıda satırda gösterirdi.
- Ölçüldü: 12 + (5+3) misafir → tek satır "20 asker · 2 sevkiyat" → 14 fjordvakt geri yollandı → kalan 6 asker (eski girdi önce tüketildi), ev sahibinin ekmek tüketimi −17,8'den −14,3'e düştü, sahibine rapor ulaştı.

### Takviye: köy başına tek satır + kısmî geri çağırma (13 Eylül 2026)
- Her takviye GÖNDERİMİ ayrı satırdı: aynı köye üç kez asker yollayan oyuncu üç satır görüyor ve üçünü ayrı ayrı geri çağırıyordu. Artık **köy başına tek satır** — o köydeki bütün askerin toplamı, yanında "N sevkiyat" notu.
- **Kısmî geri çağırma:** satır açılıp birim birim miktar veriliyor, kalanlar orada savunmaya devam ediyor. Tek düğme bırakmak, saldırı gelirken savunmanın yarısını orada tutmayı imkânsız kılıyordu.
- **Kayıt BİRLEŞMİYOR, yalnız görünüm birleşiyor** (TODO'daki karar böyle çözüldü): savunma kayıpları geliş sırasına göre pay ediliyor (`savunmaKayiplariniPayEt`), girdileri kayıtta birleştirmek o sırayı bozardı. Kısmî çekimde sunucu girdileri **eskiden yeniye** tüketiyor — en uzun süredir orada duran asker önce döner.
- Gruplama anahtarı (ev sahibi köy + benim hangi köyümden gittiği): çoklu köyde aynı hedefe iki ayrı köyden asker yollanmış olabilir, her biri kendi köyüne dönmeli.
- Eski istemci uyumu korundu: `takviyeId` gönderen çağrı hâlâ çalışıyor, miktar verilmezse hepsi dönüyor.
- **4 yeni test**: kısmî çekim ve eskiden-yeniye tüketim, olmayan birim isteği, başkasının takviyesi, aynı hedefe iki köyden gönderim.
- Ölçüldü: 10 + 8 asker gönderildi → liste tek satır "18 asker · 2 sevkiyat" gösterdi → 7 çekildi → girdiler 3 ve 8 olarak kaldı (eski girdi önce tüketildi).

### Sekme amblemleri (13 Eylül 2026)
- Sekmelerin çoğu genel bir ikon ya da BAŞKA bir sekmenin ikonuydu: Harita ile Seferler aynı, Görevler ile Yardım aynı, Mesajlar "bilgi" ikonundaydı. İkon sekmeyi ayırt etmiyorsa hiç yok sayılır — telefonda alt barda zaten yalnız ikon var.
- Yeni: **çiftçi** (Köylüler), **tekerlek** (Seferler), **kitap** (Görevler), **parşömen** (Raporlar), **mektup** (Mesajlar), **çubuk grafik** (İstatistik), **kılıç+kalkan** (Simülatör). Ordu artık kılıç.
- Hepsi setin dilinde: 24×24, dolgusuz, stroke tabanlı, kalınlık dışarıdan. Dolu ikon araya girince göz onu "seçili" sanıyor.
- **16 px'te okunurluk ölçüldü** (alt bar boyutu) — üç ikon o boyutta dağıldığı için yeniden çizildi: çiftçinin omzundaki tırpan gövdeye karışıyordu, parşömenin iki ucundaki rulo kıvrımları birbirine giriyordu, kılıç+kalkan üst üste binip tek bir karalama oluyordu. Önizleme sayfası: `client/dev/ikon-onizleme.html` (72/24/16 px yan yana).

### Köyün adı Ana Binadan değiştirilebiliyor (13 Eylül 2026)
- Köy adı yalnız profil menüsünde değiştirilebiliyordu (üst sağdaki oyuncu adına tıklayınca) — kimsenin aramadığı bir yer. Artık köyün adı köyün kalbinden değişiyor.
- Alan Ana Bina posterinin üstünde, başlığın hemen yukarısında. **Panel gövdesine konmadı**: Ana Binada poster bütün paneli kaplıyor ve gövdenin yüksekliği SIFIR kalıyor (ölçüldü: `clientHeight = 0`) — oraya konan alan hiç görünmüyordu.
- Slot **açıkça** gönderiliyor (`activeSlot`), binanın hex slotu değil: ikisini karıştırmak sunucuda "bu köy senin değil" ile sessizce reddedilirdi.
- `NameField` profil menüsünden dışa açıldı; iki yer aynı alanı ve aynı sunucu cevabını (`name_result`) paylaşıyor, birinde değiştirince diğeri kendiliğinden tazeleniyor.
- Oyuncu adı kilitli kalmaya devam ediyor — değişen yalnız köy adı.

### Negatif ekmek akışı — ÖLÇÜLDÜ ve uyarı eklendi (13 Eylül 2026)
**Maddenin ilk iki iddiası ölçümle doğrulanamadı; üçüncü, gerçek sorun bulundu.**

- ❌ *"NPC'ler sonsuz açlıkta kalıyor"* — **üretilemedi.** 39 NPC tohumlandı ve 2000 oyun saati daha ilerletildi: aç köy 0. Kayıtlı dev dünyasındaki 200 NPC'de de aç köy 0. Pi'deki canlı günlükte 3 günde tek bir `[STARVE]` satırı yok. Yiyecek zinciri düzeltmelerinden (bkz. `npcAi.ensureFoodStaffing` un/ekmek ambar payı) sonra kapanmış görünüyor.
- ❌ *"Nüfus/asker/at tüketimi ile fırın kapasitesi dengesi"* — **denge sağlam.** Zincir 1 tahıl → 0,6 ekmek; ham tahılla beslenmeye göre 1,5× verimli, yani fırın kurmak kârlı kalıyor. 1 tahıl işçisi 14,4 köylü ya da 7,2 asker besliyor; 1 at yalnız 0,042 tahıl işçisi tutuyor. Altı Lvl 1 tarla tam kadroyla 518 köylü besliyor — nüfus tavanının kat kat üstünde.
- ✅ **GERÇEK SORUN: oyuncu açlığı ancak BAŞLADIKTAN sonra öğreniyordu.** Ölçüm: yeni bir köy hiçbir şey yapılmazsa **36 oyun saatinde** açlığa giriyor, **45. saatte** ilk köylüsünü kaybediyor. O ana kadar tek işaret, kaynak rayındaki 7,5 punto "AÇLIK" rozetiydi — o da kayıp başladıktan sonra çıkıyor.

**Yapılan:** üst barın altında, her sekmede duran iki kademeli uyarı şeridi.
- SARI: "Ekmek bitiyor: 10 saat 34 dk sonra köyün aç kalacak" + SEBEP + ne yapılacağı.
- KIRMIZI: "KÖYÜN AÇ — nüfusun eriyor".
- Sebep zincirin akış yönünde: tahıl işçisi → değirmen → fırın → ordu. "Aç kalıyorsun" tek başına işe yaramıyordu; oyuncu ne yapacağını bilmiyordu.
- Hesap SUNUCUDA (`tick.js · getFoodOutlook`): zincir oranları ve tüketim sabitleri orada; istemcide ikizini tutmak ikisinin sessizce ayrışması demekti.
- Akış artıdayken şerit hiç çizilmiyor, yer kaplamıyor.
- **6 yeni test** — uyarının zamanı ve sebebi kilitli.

### Mesajlaşma (13 Eylül 2026)
- **Mesajlar sekmesi**: gelen kutusu / gönderdiklerim, yazma formu, okundu takibi, üst barda okunmamış sayacı. Düzen raporlarla AYNI (solda liste, sağda gövde) — oyuncu iki ekran arasında yeni bir düzen öğrenmesin.
- Alıcı **oyuncu adıyla** seçiliyor. Oyuncu listesi vermek hem haritadaki herkesi tek ekranda dökmek hem de toplu mesaj atmayı kolaylaştırmak olurdu; ad zaten benzersiz.
- **Silme yumuşak ve TEK TARAFLI**: gönderenin silmesi alıcının kutusundan mesajı kaldırmıyor. Tek bir `deleted` alanı olsaydı şikâyet edilen mesaj tek tıkla yok edilebilirdi.
- **Engelleme SESSİZ**: engellenen kişi gönderirken hata almıyor, mesaj kutuya düşmüyor. "Engellendin" demek taciz edene hangi hesabın çalıştığını söylemek olurdu. Hız sınırı yine de işliyor — engelli gönderim bedava deneme hakkı olmasın.
- **Hız sınırı** dakikada 5, saatte 40. Engelleme tek başına yetmez: engellenen kişi yeni hesapla döner, hız sınırı hesap açmayı da yavaşlatır.
- Kontrol karakterleri temizleniyor (ad taklidi ve düzen bozma), konu 60 / gövde 2000 karakterle sınırlı, konu boşsa ilk satırdan türetiliyor.
- Okunmamış sayacı OTURUMDA tutuluyor: `emitVillage` senkron ve saniyede bir çalışabiliyor, oraya sorgu koymak tick yoluna veritabanı gecikmesi sokardı.
- Kurallar `server/game/mesaj.js`'te ayrı duruyor — sunucu açmadan sınanabiliyor. **8 yeni test** (4 kural, 4 uçtan uca).
- Birlik mesajı için altyapı hazır: `messages` tablosu ve engel listesi aynı şekilde kullanılacak.

### Onboarding — ilk 10 dakika (13 Eylül 2026)
- **Kayıtta kullanıcı adı.** `/auth/register` artık e-posta + kullanıcı adı + şifre alıyor; ad AYNI INSERT'te yazılıyor (iki adımda yazmak adsız hesap bırakma riski ve ikinci bir yarış penceresi demekti). Benzersizliği veritabanı dizini garanti ediyor. Ad **kalıcı**: `set_player_name` adı olan hesapta reddediyor, profilde alan kilitli gösteriliyor. Adsız ESKİ hesaplar için NameGate kapısı duruyor.
- Ad doğrulama kuralı `server/adKurallari.js`'e alındı — kayıt ve oyun soketi aynı kuralı kullanıyor, ikiz yazılsaydı ayrışırdı.
- **Karşılama anlatımı.** Ekranın ortasında, kapatma düğmesi YOK, beş adım: oyunun amacı → tarlalar → işleme binaları → bina/asker → görevler. "Gördüm" kaydı SUNUCUDA (`quests.egitim`); localStorage'da olsaydı depoyu temizleyen her girişte görür, konsoldan da atlanırdı.
- Yeni oyuncuya **yama notları duvarı çıkmıyor**: anlatım bitene kadar panel çizilmiyor, bitince geçmiş notlar okunmuş sayılıyor. 60+ eski notu oyuna hiç başlamamış birine göstermenin anlamı yok.
- **Görevler 28 → 46**, `zorunlu` bayrağıyla ikiye ayrıldı (29 zorunlu, 17 opsiyonel). Rehber kartı sıradaki ZORUNLU görevi gösteriyor; opsiyonel bir görev kartı kapatıp ana hattı gizlemiyor. "Rehber bitti" ölçüsü de zorunlu görevler.
- Yeni görevler: işlenmiş mal deposu, tahıl ambarı, demir Lvl 2, ekmek/kereste stoğu, nüfus 80, tarla 12, ana bina Lvl 5, zırhçı, hendek, kule, ahır, 50 asker, 5 sefer, ilk araştırma, pazar, taverna, atölye.
- **Görev listesi sıralaması:** ödülü hazır olanlar üstte, alınmışlar altta. Biten görevler tepede birikip sıradakini ekran dışına itiyordu.
- **Telefonda nüfus üst barda** — nüfus ve boş işçi çekmecenin içindeydi, işçi/asker işlemlerinin her adımında bakılan iki sayı.
- **Yan bulgu (gerçek hata):** `playerName`, `adVerilmedi` emitVillage'da hesaplanıp `opts` ile veriliyor ama payload'a HİÇ kopyalanmıyordu. Yani adsız hesaba sorulan ad ekranı hiç açılmıyordu. Karşılama anlatımı aynı alanlara bakınca ortaya çıktı.
- **İkinci yan bulgu (test yakaladı):** `WORLD.ownerByUser` yalnız AÇILIŞTA yükleniyordu; sunucu açıldıktan sonra kaydolan oyuncu adı olduğu hâlde "adsız" sayılıyor, ad ekranı soruluyor ve adını değiştirebiliyordu. Bağlantıda bir kez kayıttan okunuyor.
- **7 yeni test** (kayıt/ad 3, görev-zinciri 4).

### Sefer geri çağırma + kuşatma ayarları (13 Eylül 2026)
- **Sefer geri çağırma — ilk 90 gerçek saniye.** Yola çıkan ordu bu pencerede dönüşe geçirilebiliyor; gittiği yol kadar geri yürüyor (ışınlanma yok), ganimet taşımıyor. Pencere bilerek DAR: her an geri çağrılabilseydi saldırı risksiz olurdu (hedefi izle, son anda çek). Sunucuda ölçülüyor — istemcideki düğmenin görünür olması yetmiyor, yayınlar arası gecikmede sunucu reddediyor ve sebebi uyarı şeridine düşüyor.
- Sayaç `geriCagirTimeLeft` adıyla gidiyor: istemcideki `shiftTimers` `...TimeLeft` ekini tanıyıp iki yayın arasında kendisi sayıyor, düğme 30 saniye boyunca yanlış görünmüyor.
- **Mancınıkla ikinci hedef — atölye Lvl 10.** Tek seferde iki bina hedeflenebiliyor, kuşatma gücü **%60 / %40** bölünüyor. Bonus DEĞİL, tercih: tek binaya tam güç mü iki binaya bölünmüş güç mü. Test bunu kilitliyor (bölünmüş güç aynı binayı daha az indirmeli). İkinci atış birincinin slotunu rastgele havuzundan dışlıyor.
- Atölye seviyesi SUNUCUDA denetleniyor; istemci kutuyu gizliyor ama gizlemek denetim değil.
- **Koç başı artık YALNIZ suru indiriyor.** Eskiden artan puan hendeğe geçiyordu; tek sefer iki savunma yapısını birden siliyor, hendeğe yatırımı anlamsız kılıyordu. Artan puan artık boşa gidiyor — "kaç koç başı göndereyim" gerçek bir hesap.
- **Kuşatma stoğu sağ rayda.** Koç başı/mancınık hiçbir ekranda görünmüyordu: kaç makinen var, atölye doldu mu bilinmiyordu. Cephanelik havuzuna karıştırılmadı — atölyenin kendi kapasitesi, at gibi ayrı blok.
- **Koç başı artık Rún Salonu araştırması istiyor** (Lvl 2). Araştırma `minLevel`den türüyor ve koç başınınki 1 olduğu için hiç kapı yoktu. `minLevel` bilerek değiştirilmedi: onu yükseltmek atölye şartını da yükseltirdi, tek istek için iki kapı olurdu.
- **Koç başı artık Rún Salonu araştırması istiyor** (Lvl 2).
- **MAKİNELER SAVAŞTAN SAĞ ÇIKMIYORDU (kök hata).** `simulateBattle` savaşmayan birimleri (kuşatma, göçmen) güce katmıyordu — doğru — ama `attackerSurvivors`a da koymuyordu. `march.units = survivors` satırıyla mancınıklar savaş biter bitmez YOK oluyordu. İki ayrı arıza olarak görünüyordu: makineler eve dönmüyor VE kuşatma fazı (sağ kalanlara bakıyor) hiçbir şey yıkmadığı için raporda kuşatma kutusu hiç çıkmıyordu. Artık taşınıyorlar ve ordunun kayıp oranında ölüyorlar — kayıpsız taşınsalardı "bir asker + yirmi mancınık" risksiz kuşatma olurdu.
- **Kuşatma yalnız TAM SALDIRIDA.** Yağma vur-kaç, keşif izci işi, takviyede katkısı yok; üstelik makine yavaş olduğu için orduyu boşuna yavaşlatıyordu. Sunucu reddediyor, panel de seçtirmiyor ve mod değişince seçimi düşürüyor.
- **Dev kısayolları:** "Surlu hedef köy" (en yakın NPC'ye sur Lvl 10 + hendek Lvl 5 + binalar) ve "Ordu ver" artık mancınık da veriyor. Kuşatma birimleri listede ÖNE alındı: sunucu nüfus bütçesi kadar veriyor ve listeyi baştan tüketiyor, sonda kalınca tam da test edilecek birim düşüyordu.
- **17 yeni test** (kuşatma 9, geri çağırma 6, payload 4).

### Takviye raporları + yıkımın süresi (13 Eylül 2026)
- **"Destek yolladım, rapor 'saldırdın ve kaybettin' diyordu."** Takviye raporunun `outcome`'u (`takviye_vardi`) rapor ekranında hiç tanınmıyordu: kazanan/kaybeden testine düşüyor, `winner: 'none'` olduğu için herkes kaybediyordu. Artık giden "X köyünü destekledin", gelen "X sana destek gönderdi"; rozet de kırmızı değil savunma yeşili.
- Takviye ayrıntısı savaş kutularını (saldırı gücü, ganimet, dönüş yükü) göstermiyor — savaş değil. Onun yerine giden/gelen birlikler ve **ekmeği kim ödüyor** yazıyor.
- **Yeni: misafir askerin ölünce sahibi haber alıyor.** Takviyen başka köyde savaşa girip eridiğinde hiçbir rapor yazılmıyordu; nüfus düşüyor, ordu eriyor, sebebi hiçbir ekranda görünmüyordu (`takviye_savasti`). Rapor kaybı, orada kalanı ve savunmanın tutup tutmadığını söylüyor.
- Filtre sekmesi "SALDIRILARIM" → **"GİDENLER"**: artık orada saldırı olmayan seferler de var.
- **Koçbaşı ve mancınık görselleri** eklendi. `alevMancınıgı` anahtarı Türkçe harf içerdiği için dosya adına konmadı; `unitImages.js`'te takma ad eşlemesi var (dosya adı ASCII kalsın diye).
- **Bina yıkımı artık anında değil:** onay soruluyor ve o seviyenin **tam kadroyla inşa süresinin onda biri** kadar sürüyor. Yıkım başlayınca personel havuza döner, bina çalışmaz ve yükseltilemez; süre dolunca slot boşalır. Yıkım sürerken **"YIKIMI İPTAL"** ile vazgeçilebiliyor — süre aldığı için geri dönüşü olmayan bir düğme tuzak olurdu. Henüz bitmemiş inşaat anında kalkıyor (ortada yıkılacak bina yok). Oran iki yerde yazılı (sunucu `koyKurallari.js`, istemci `flows.js`) — test ikisini kilitliyor.

### Kuşatma birimleri — Koç Başı ve Mancınık (13 Eylül 2026)
- **Asıl eksik ekipmandı.** `kaleKiran` ve `alevMancınıgı` baştan tanımlıydı ama istedikleri `koc_basi`/`mancinik` ekipmanları HİÇ tanımlı değildi. Üstelik `birimler.js` bu yüzden konmuş bir yamayla kuşatma sınıfını listeden dışlıyordu — yani eksikliği gizliyordu. İkisi de kaldırıldı: artık tek ölçüt "ekipmanı tanımlı mı".
- Ekipmanlar **atölyede** üretiliyor, cephanelik havuzunu paylaşmıyorlar: makine, kişisel teçhizat değil. Atölyenin kendi kapasitesi (`siegeCapPerLevel: 5`, ikisi ortak) — atın ahırda durması gibi.
- **Kuşatma fazı** (`game/kusatma.js`) normal savaştan SONRA, yalnız saldıran KAZANDIYSA ve yalnız SAĞ KALAN makinelerle çalışıyor. Kaybeden kuşatma yapamaz, ölen mancınık vurmaz.
- Seviye maliyeti ARTIYOR: `30 × mevcut seviye`. Sabit olsaydı Lvl 20 sur Lvl 2 kadar kolay düşerdi. Ölçüm: 10 koç başı (600 puan) Lvl 3 suru ve Lvl 2 hendeği sıfırlıyor; 1 koç başı Lvl 20 sura hiç dokunamıyor.
- Koç başı **sur → hendek** sırasıyla; mancınık **seçilen bina tipini**, yoksa rastgele bir binayı. "Hedefin yok" deyip seferi boşa çıkarmak hem oyuncuyu cezalandırır hem köyün içini dolaylı keşfetmeye yarardı.
- Kuşatma **ganimetten ÖNCE** işliyor: mancınık depoyu vurabiliyor, seviye düşünce tavan da düşüyor. Ters sırada oyuncu önce deposunu boşaltıp sonra binasını kaybederdi.
- Yıkılan binanın **işçileri havuza dönüyor** — dönmezse var olmayan bir binada "çalışıyor" görünüp nüfus muhasebesini bozarlardı.
- **KÖY YIKIMI KAPALI:** ana bina Lvl 1'in altına inmiyor. Travian'da 0'a inince köy yok olur; satılan bir oyunda her şeyi tek saldırıda kaybetmek fazla sert bulundu. Açılacaksa tek yer `ANA_BINA_TABAN` — test o kararı kilitliyor.
- Arayüz: gönderme ekranında mancınık hedefi seçici (yalnız seçimde mancınık varken), savaş raporunda "Kuşatma" kutusu (iki tarafa da — savunan surunun düştüğünü görmezse hazırlıksız yakalanır).
- **11 birim testi** (`test/kusatma.test.js`), ikiz tanım testi dahil.
- Yan bulgu: `EQUIPMENT_BUILDINGS` istemcide elle yazılıydı ve `atolye` yoktu — atölye paneli boş açılıyordu. Sabit liste kaldırıldı, artık payload'daki `equipmentByBuilding` tek kaynak. (Araştırmayı tıkayan hatanın aynı sınıfı.)

### Ordu gönderme: hızlı seçim (13 Eylül 2026)
- **TÜM ORDU · SALDIRI · SAVUNMA · TEMİZLE** düğmeleri. Asker tek tek yazmak yerine tek dokunuş.
- **İzci ve göçmen hiçbirine girmez** (İlkan'ın isteği + ölçüm): izci savaşmaz, saldırıda bedavaya ölür; göçmenin saldırısı da savunması da SIFIR, savaşa gönderilirse hem boşa gider hem yerleşim hakkı kaçar.
- Ayrım sabit listeden değil birimin KENDİ değerlerinden: saldırısı ortalama savunmasından büyükse saldırgan. Yeni birim eklendiğinde kendiliğinden doğru yere düşüyor.

### Takviye — başka köye savunma askeri gönderme (13 Eylül 2026)
- Yeni sefer modu `takviye`: çarpışma yok, ganimet yok, dönüş ayağı yok. Asker hedef köyde **misafir** kalır ve o köy saldırı alınca savunmaya katılır (`savunanBirlikler` = kendi ordu + misafirler).
- **BESLEMEYİ EV SAHİBİ ÖDER** (İlkan'ın kararı). Kısıt zaten tahıl olduğu için takviye bedava kalkan değil, ambardan çıkan gerçek yem: `getConsumptionRates` misafiri asker yemeğine katıyor. Misafir NÜFUSA eklenmiyor — o nüfus sahibinin köyünde sayılıyor, yoksa iki kez sayılırdı.
- **Kayıp önce ev sahibinden, artanı misafirlerden.** Tersi olsaydı "takviye çağır, kendi askerin ölmesin" sömürüsü doğardı. Misafir kaybı ev sahibinin nüfusundan düşmüyor; `processMarches` sahibinin köyüne işliyor.
- **Geri çağırma ışınlamıyor** — yürüyüş süresi kadar yolda. Anında olsaydı takviye risksiz olurdu (saldırı gelince tek tuşla geri alınırdı). Sahiplik denetimi var: başkasının takviyesini geri çağırmak rakibin savunmasını dağıtmanın tek satırlık yolu olurdu.
- Kendi köyüne **saldıramazsın ama takviye gönderebilirsin** — çoklu köyde asıl kullanım bu. NPC'ye takviye kapalı.
- Ekipman yükseltmesi olarak **ev sahibinin** seviyeleri uygulanıyor (savaş tek orduyla çözülüyor; sur/hendek/kule de onun). Alternatifi savaş hesabını parçalamayı gerektirirdi.
- Arayüz: gönderme ekranında TAKVİYE modu (tahmin ve taşıma kapasitesi gizli — çarpışma/ganimet yok), Ordu ekranında iki liste — "köyümde misafir, yemeklerini ben ödüyorum" ve "askerim dışarıda" + GERİ ÇAĞIR.
- `structFingerprint`'e takviye eklendi, yoksa varış ekrana ancak kalp atışında (30 sn) yansıyordu.
- **9 birim testi** (`test/takviye.test.js`) + uçtan uca doğrulandı: sefer gönderildi → vardı → `takviyelerim` dolu → geri çağrıldı → dönüş seferi yola çıktı → ordu 60 → **70**.

### Rún Salonu'na işçi atanamıyordu — araştırma tamamen tıkalıydı (13 Eylül 2026)
- Hangi binaların işçi aldığını söyleyen `WORKER_ASSIGNABLE_MILITARY` kümesi sunucuda ve istemcide **ayrı ayrı** yazılıydı ve üçüncü kez ayrıştı: sunucu `runSalonu`, `kosk`, `saray`'ı kabul ediyor, istemci listesinde üçü de yoktu. İstemci bilmeyince atama arayüzü hiç çizilmiyor, sunucuya istek bile gitmiyor.
- Sonuç: **araştırma hiç yapılamıyordu**; ayrıca köşk/saraya eğitmen atanamadığı için göçmen kuyruğu ilerlemiyordu (bu ikincisi bildirilmemişti, arayan bulundu).
- Yorum yeterli olmadığı için `test/tanim-ikizleri.test.js`'e koruma testi eklendi: sunucudaki küme kaynak metinden okunup istemcidekiyle karşılaştırılıyor. Testin gerçekten yakaladığı doğrulandı (`runSalonu` çıkarılınca düştü).

### Üretim adedi: 50 sınırı kalktı + MAKS düğmesi (13 Eylül 2026)
- 50'lik tavan gerçek bir sınır gibi davranıyordu; deposu dolu oyuncu bile bir seferde 50'den fazla sipariş edemiyordu. Asıl sınır zaten kaynak/ekipman/boş işçi — bedel sipariş anında peşin düşülüyor. Tavan 10000'e çekildi (denge değil, saçma girdi kapısı); istemcideki `QTY_TAVAN` ile sunucudaki `ADET_TAVANI` aynı kalmalı.
- **MAKS** düğmesi: asker = min(boş işçi, ekipman/adet, kaynak/adet); ekipman = min(kaynak/adet, **depo boş yeri**). Doğrulandı: silahçıda 80'lik sipariş kuyruğa girdi.
- Adet kutusundaki rakam silinemiyordu (`+e.target.value || 1` boş dizeyi 1'e çeviriyordu) — artık boş kalabiliyor, odak çıkınca gerçek değere dönüyor.

### Mobil oynanabilirlik — denetim aracı ve düzeltmeler (13 Eylül 2026)
- `client/dev/mobil-denetim.html`: oyunu iframe'e alıp 9 çözünürlüğü gezen, denetimi sayfanın içinde çalıştıran araç (bağımlılıksız, üretime çıkmıyor). Kuralları ve **beş yanlış pozitif eleyicisi** `.claude/skills/mobil-denetim/` skill'inde.
- Ölçüm: 1404 → 38 → **0 bulgu** (9 boyut × 28 bina × tarlalar × 10 sekme).
- Düzeltilenler — hepsinin kök nedeni ölçülerek bulundu:
  - **Ölçüt genişlikti, oysa soru "yer var mı"** (dört ayrı hata): yatay telefon 896 px geniş olduğu için "masaüstü" sayılıyordu. Ahırda at siparişi, silahçıda adet kutusu + YÜKSELT görünmüyordu; yüzen görev kartı denetimleri örtüyordu; tablette panel 448 px iken masaüstü şeridi seçilip kutular 74 px'e düşüyordu.
  - **Tarla panelinde YÜKSELT ekran dışındaydı**: konum `prefH` (350) varsayımıyla hesaplanıyor ama panel 551 px; fark kabın dışında kalıyordu. `maxH` artık panelin durduğu yerden ölçülüyor.
  - Kaydırıcılar 6 px'lik dokunma hedefiydi; satır içi `height` CSS'teki dokunmatik kuralını eziyordu. (Satır içi `minHeight` ezer, `height` ezmez — 24 yerde `height` var ve hepsi zararsız.)
  - 320 px'de çıkış düğmesi tamamen ekran dışındaydı; haritada KÖYÜME DÖN taşıyordu; bina adlarına 69 px kalıyordu (→ 256).
  - Ekipman binalarında gövde iki sütuna bölünüp "At" kartını 26 px'e sıkıştırıyordu (→ 214). Kadro/yükseltme kutuları da at siparişi gibi tam genişliğe alındı — binalarda tek tarz.
- **Aracın körlüğü:** geometrik kurallar "sütun kullanılamaz genişliğe düştü"yü yakalamıyor; 26 px'lik kartı kullanıcı gözle buldu. Tarla panelleri de taranmıyordu — o da kullanıcıdan geldi, sonra araca eklendi.

### Görsel temel: tek palet, tabular rakamlar, düğme geri bildirimi (13 Eylül 2026)
- `index.css` ile `theme.js` **iki ayrı palet** kullanıyordu; yedi jetonun yedisi de farklıydı (sayfa zemini, odak halkası, kaydırma çubuğu bir palette, bileşenler başka palette). Tek kaynağa indirildi.
- Sayılar zıplıyordu: `FONT.num`'ı doğrudan kullanan 17 yer tabular rakam almıyordu (ölçüm: Jost'ta "111111" 37.81 px, "888888" 45.88 px). Kural köke taşındı. `FONT.num` monospace değil ama Jost'un tabular rakamları var — stack'e dokunulmadı.
- Düğmelere üzerine gelme/basma geri bildirimi. Zemin satır içi verildiği için CSS'ten `background` işe yaramıyor; `filter`/`transform` satır içinde hiç kullanılmadığından tek kuralla 38/38 düğme kapsandı.

### Savunma yapıları — sur / hendek / kule (Eylül 2026)
- Sur ve hendek hex slotu olmaktan çıktı, köyü **çevreleyen** yapıya dönüştü; isimli slotlara taşındı (`sur`, `hendek`, `kule1…kule6`) ve eski kayıtlar göç ettirildi.
- Sur köyün altıgen dış hattını takip ediyor, arada boşluk yok; kümenin gerçek birleşim sınırından türüyor (ölçüm: 6.062·S).
- Altı kule köyün iç köşelerinde, resimli normal altıgen olarak (SAT çakışma testi: 0.76·S'te en yakın hücreye 13.6 px boşluk).
- Mazgal dişleri kenar yönüne hizalı dikdörtgen; duvara iç/dış yüz farkı ve harpuşta çizgisi; hendekte toprak şev + derinlik gradyanı + dalga.
- **Savunma bonusu tavanı %150**: paylar doğrudan veriliyor — sur maks **%80**, hendek **%35**, altı kule lvl20 tam kadro **%35**. Üçü aynı eğriden ölçekleniyor (`curveTo`); `combat.js` ayrıca sert üst sınır uyguluyor.
- **Kule bonusu okçu dolulukla ölçekli**: boş kule %0 katkı, tam kadro seviye bonusunun tamamı. Kule başına kapasite = seviye × 4 okçu.
- Sur ve hendekten "işçi" ibaresi tamamen kalktı (personel almıyorlar); kulede personelin adı **okçu**.

### Kültür puanı, köşk/saray/taverna (Eylül 2026)
- Mekanikler Travian'dan alındı (kaynaklı): **köşk** Lvl 10 ve 20'de birer hak (2), **saray** Lvl 10/15/20'de birer hak (3), saray yalnız merkez köye, köşk ve saray aynı köyde olamaz, yeni köy için **3 göçmen**.
- **Sayılar bu oyunun ekonomisine kalibre edildi.** Travian'ın 2.000 CP eşiği burada 29. güne düşüyordu (simülasyon: gerçekçi kurulum sırası, günde ~4 bina seviyesi). Eşikler Travian'ın oranlarını koruyarak yeniden ölçeklendi: **300 / 1.200 / 3.000 / 5.850**, sonra ×1.8. Hedef: 2. köy ~11. gün, 3. ~22, 4. ~34.
- Her binaya `cpPerLevel` verildi (1–4 arası, 31 bina). Köyün CP/gün'ü bina seviyelerinin ağırlıklı toplamı; oyun saati başına birikiyor.
- Gerçek tavan `min(kültür puanı, 1 + köşk/saray hakkı)` — ikisi de gerekiyor. Sağ rayda kültür bloğu: puan, günlük üretim, sıradaki eşik, kalan süre ve **neyin engellediği** (kültür mü, bina mı).
- **Taverna** + şölenler: küçük (Lvl 1, 12 saat, bu köyün günlük üretimi), büyük (Lvl 10, 24 saat, bütün köyler × 2). Puan şölenin sonunda yazılır; `cpAtStart` sayesinde şölen sürerken bina yıkıp puan şişirilemiyor.
- Yeni "yonetim" kategorisi + 5 ikon (köşk, saray, taverna, kültür, şölen).
- Doğrulama: CP birikimi 86.400 tick'te tam 1 oyun günü tutuyor; yardım ekranı 56/56 sayfa render oldu; şölen paneli 5 durumda test edildi (kaynak yeter/yetmez, seviye kilidi, süren şölen geri sayımı).
- **Henüz yok:** göçmen üretimi — köy hakkı hesabı ve çoklu köy mimarisi hazır, eksik olan üretim kuyruğu ve göçmen seferi.

### Çoklu köy mimarisi (Eylül 2026)
- **Veritabanı:** `villages` tablosunda `UNIQUE (user_id)` kaldırıldı, benzersizlik `(user_id, slot_key)` oldu, `is_capital` eklendi. Dev JSON deposu `db.villages[userId]` → `db.villages[userId][slotKey]` göçünü ilk açılışta tek seferde yapıyor (gerçek kaydın kopyası üzerinde doğrulandı; ikinci açılışta tekrar göç etmiyor).
- **Oturum:** `makeSession()` bir oyuncunun bütün köylerini `Map`'te tutuyor. `session.village` ve `session.dirty` getter olarak tanımlandığı için ~30 eski çağrı yeri hiç değişmedi. Her köy ayrı tick alıyor, ayrı kirlenip ayrı kaydediliyor — arkadaki köy "durmuyor".
- **Yük:** payload'a `villages` listesi, `activeSlot`, `isCapital` ve oyuncu çapında `culturePoints` eklendi. Kültür puanı köy nesnelerinde birikiyor, oyuncu havuzu toplamdan geliyor (merkez taşınması sorun etmiyor).
- **Arayüz:** üst barda `VillageSwitcher` — merkez tacı, inşaat/açlık işareti, nüfus; tek köyde kendini gizliyor. Köy değiştirince harita anlık görüntüsü de yenileniyor.
- Doğrulama: gerçek kaydın kopyasında iki köylü oturum açıldı, `switch_village` ile geçiş, kaydetme ve yeniden açılışta 2 köyün yüklenmesi ölçüldü.

### Oyun yayında: Raspberry Pi (Eylül 2026)
- Oyun İlkan'ın evindeki Raspberry Pi 4'te yayında: **https://tranord.tail09b828.ts.net** (Tailscale Funnel → nginx :80 → Node :3311 + yerel Postgres). Railway/Vercel planı iptal; istemci de Pi'den servis ediliyor, tek origin.
- Dağıtım: lokalde geliştir → `git push` → `deploy.bat` (ssh + `sudo tranord-guncelle` → `deploy/guncelle.sh`: origin/main'e reset, npm ci, derle, servisi yeniden başlat). **Derleme başarısız olursa servise dokunmuyor.** Gecelik yedek 03:15, 14 gün.
- Şema göçleri `initDB()` içinde idempotent; servis her başlayışta uyguluyor. Yeni kolon/tablo eklerken `IF NOT EXISTS` ile oraya yazılmalı.
- **`deploy/kurulum.sh`'taki iki hata düzeltildi** (İlkan kurulum sırasında yaşayıp belgelemişti): (1) `.ssh` dizinini root oluşturup anahtarı `tranord` kullanıcısına yazdırıyordu → dizin sahipliği artık ssh-keygen'den ÖNCE veriliyor; (2) betik `/home/pi/...` altından çalıştırılınca `sudo -u tranord git ls-remote` çalışma dizinini stat edemeyip patlıyordu → betik başında `cd /tmp`. Ayrıca depo public olduğu için HTTPS adresinde deploy-key adımı tamamen atlanıyor (`NEEDS_KEY`), varsayılan adres HTTPS oldu.

### Asker yemeği iki kez sayılıyordu (Eylül 2026)
- Şikâyet: "9 tarlam var ama tahıl hâlâ çok az geliyor." Ölçüm bambaşka bir yere çıktı.
- **Hata:** `getConsumptionRates` ve `processFoodConsumption` sivil payını `population` üzerinden hesaplıyordu ama `population` askerleri de içeriyor. Yani her asker günde **3 (köylü olarak) + 6 (asker olarak) = 9 ekmek** yiyordu. İlkan'ın köyünde 2.643 asker × 3 / 24 = **331 ekmek/sa hayalet tüketim** — 1.553'lük tüketimin beşte biri.
- Düzeltildi: sivil = nüfus − ordu − seferdeki asker. Tüketim 1.553 → **1.222 ekmek/sa**; ekmek birikimi saatte +36 → **+367**.
- **İkinci hata (arayüz):** akış hesabı işleme binasının NOMİNAL iştahını tüketim yazıyordu. Değirmene 60 işçi atanmışsa ekranda "−5.400 tahıl/sa" görünüyordu; oysa tarlalar 2.648 üretiyor ve motor yalnız var olanı tüketiyor. Ekranda **tahıl −3.264/sa** diye korkutucu bir sayı vardı, gerçek net 0'dı. `computeFlows` artık her binayı girdisinin yettiği kadar çalıştırıyor ve "girdi yetersiz: %53, 28 işçi boşta" bilgisini üretiyor.
- Doğrulama: 6 sınır durumda tüketim testi (askersiz, yarı asker, seferdeki asker, tamamı asker, atlar) 6/6 geçti; akış hesabı motorun 24 saatte gerçekte ürettiğiyle karşılaştırıldı — sapmanın sebebi arazi çarpanlarıydı (2.880 nominal → 2.648 gerçek), hesaplandığında birebir tuttu.
- **Sonuç: tahıl üretimini artırmaya gerek yoktu.** 9 tarla yetiyor; sorun çift sayma ve yanıltıcı gösterimdi.

### Yardım ekranına "Oyunun kuralları" (Eylül 2026)
- Yardım listesinin en üstüne **9 kural sayfası** eklendi (`RuleDetail.jsx`): Oyunun döngüsü, Nüfus ve büyüme, İşçi ve üretim, Yiyecek ve açlık, Depolar, Seviye tavanları, Ordu ve birimler, Savunma bonusu, Köyler ve kültür.
- Sayfalardaki **sayıların hiçbiri elle yazılmadı** — hepsi `villageDefs` / `buildingDefs` / `unitDefs`'ten hesaplanıyor (kapasiteler, işleme oranları, kadro eğrileri, savunma eğrileri, birim seviye kilitleri, ev/nüfus formülü). Denge değişince yardım kendiliğinden güncelleniyor. Yalnız sunucudaki sabitlerin (nüfus hızı, yiyecek oranları) ikizi var; kaynak dosya adıyla not düşüldü.
- Doğrulama: 9 sayfanın 9'u sunucu tarafında render edildi (4,2–13,4 KB), hiçbirinde `undefined`/`NaN` yok; kritik değerler metinde arandı ve bulundu (16 tarla, 5.120 tahıl/sa, 90→72 un, 72→54 ekmek, 3 ve 6 ekmek/gün, depo 31.500/126.000/26.250, Lvl 10 birim kilidi, 21 kişi/saat, ev +100/seviye). Yardım ekranının tamamı da her sayfa açılarak test edildi, eski bina/tarla/birim sayfaları bozulmadı.

### Tahıl → köylü → asker döngüsü oturtuldu (Eylül 2026)
- **Bulunan çıkmaz:** asker `population` içinde sayılıyor ve ev tavanı toplam nüfusu sınırlıyordu. Tavana oturmuş bir köyde işçiyi askere çevirmek yer AÇMIYORDU, dolayısıyla yeni köylü hiç doğmuyordu — ekmek bol olsa bile. Ölçüldü: 200 oyun saati, 1.000 işçi askere çevrildi, **0 yeni köylü**. Toplam asker sonsuza dek "nüfus tavanı − elde tutulan işçi" ile sınırlıydı.
- **Karar 1:** ev tavanı yalnız **SİVİLLERİ** sayar (`civilianCount` = nüfus − ordu − seferdeki asker). Asker evden çıkıp kışlaya gider, yeri boşalır, nüfus yerini doldurur. `population` hâlâ toplamı tutuyor, bu yüzden **işçi muhasebesi hiç değişmedi** (diğer seçenek 6 dosyayı elden geçirmekti).
- **Karar 2:** nüfus artış hızı seviye başına 0,6 → **2,0**. Ana bina Lvl 11 = 21 kişi/saat, Lvl 20 = 39. Eski hızda tahılın besleyebildiği ~9.500 kişilik ordu 56 oyun günü sürüyordu.
- Doğrulama (gerçek motor): 5 turda 1.000'er asker basıldı; her turda sivil 1.050 → 50'ye düşüp 50 oyun saatinde tavana geri döndü. **5 turda 5.000 asker**, havuz her seferinde doldu. Eski modelde ikinci tur 50 askerde tükeniyordu.
- Döngü artık: **ev → sivil tavanı**, **ana bina → büyüme hızı**, **köylü → asker (yeri boşalır)**, **tahıl → herkesi besler**. Gerçek sınır tahıl üretimi.
- Arayüz: sağ rayda büyük rakam artık sivil nüfus (`siviller / tavan`), yanında "+N asker"; toplam ipucu kutusunda.

### Kısıt artık TAHIL (Eylül 2026)
- İstek: "kısıt tahıl olmalı, un ya da ekmek değil." Karar: zincir aynen kalsın (asker de ekmek yesin), ama **değirmen/fırın tarlaların verebileceğinden fazlasını işleyebilsin** — yoksa darboğaz zincir olur, tahıl değil.
- Ölçüm: 16 tahıl tarlası Lvl 20 tam kadro = **5.120 tahıl/sa**. Değirmen 60 işçiyle bunu öğütebilmeli → işçi başına ≥86 tahıl. Girdi 30 → 1.800/sa (zincir tıkar), 60 → 3.600/sa (yine tıkar), **90 → 5.400/sa (tarlaları geçer)**.
- Yeni: değirmen `90 tahıl → 72 un`, fırın `72 un → 54 ekmek`. Zincir sonu 3.240 ekmek/sa, kapasitesi 5.400 tahıl/sa > tarla tavanı 5.120.
- Doğrulama (gerçek motor, 5.550 nüfus, 16 tahıl tarlası, 24 oyun saati): 1.000 asker → açlık yok, tahıl 51k birikiyor; 9.000 asker → açlık yok; 15.000 asker → 2. saatte açlık ve **tahıl sıfıra iniyor** (un/ekmek birikmiyor), yani darboğaz tahıl üretimi.
- Bu köyün besleyebildiği ordu ~9.500 asker. 50k hedefi tek köyle mümkün değil — takviye (başka köyden asker gönderip burada besleme) geldiğinde besleyen köyün tahılı belirleyici olacak.

### Depo kapasitesi ve çoklu depo (Eylül 2026)
- **Ölçüt:** Lvl 20 tek depo ≈ **1 günlük tam üretim** tutsun.
- Yeni tavanlar (Lvl 20, tek depo): hammadde **31.500** (eski 10.500), işlenmiş **25.200** (8.400), tahıl ambarı **126.000** (21.000), granary/un+ekmek **26.250** (5.250). Dayanak: 4 odun tarlası Lvl 20 günde 26.880; işleme binası günde 8.640; 16 tahıl tarlası günde 122.880; fırın günde 25.920.
- **`repeatableWhenMaxed`:** dört depo türü de, mevcut olanların **hepsi Lvl 20 ve inşaatı bitmişse**, bir tane daha kurulabiliyor. Yarım depo yığmayı engelliyor. Kural sunucuda `canRepeat()`, istemcide inşa menüsünde aynı; red mesajı sebebi yazıyor.
- Test: 4/4 geçti — Lvl 1 depo varken ikincisi reddedildi ve sebebi bildirildi; Lvl 20'ye çıkınca kuruldu; odun tavanı 31.800 → 34.800 (ikinci depo kapasiteye ekleniyor).
- **Sırada:** İlkan'ın istediği "başka köyden asker gönderip burada besleme" (destek/takviye) ve "kısıt tahıl olsun, un/ekmek değil" — ikisi birlikte kararlaştırılacak.

### Ekmek zinciri ×3 (Eylül 2026)
- **Ölçüm:** değirmen ve fırın ikisi de `unique`; Lvl 20 tam kadroyla (60'ar işçi) zincirin üst sınırı **360 ekmek/sa** — yalnız 2.880 köylü besliyordu. Hedef durumda (her binada işçi + 1.000 asker = 2.780 nüfus) 598/sa, nüfus tavanında (5.550 + 1.000 asker) 944/sa gerekiyordu. Yani tavana çıkan köy **kesin** açlığa düşüyordu; İlkan'ın ekranındaki "ekmek 0, −996/sa" tam buydu.
- **Karar (İlkan):** bina sayısı değil, işçi başına çıktı ×3. Değirmen `10 tahıl → 8 un` yerine **30 → 24**; fırın `8 un → 6 ekmek` yerine **24 → 18**.
- Sonuç: zincir 1.080 ekmek/sa veriyor, tahıl ihtiyacı 1.800/sa ve 6 tahıl tarlası Lvl 20 tam kadro 1.920/sa üretiyor — yetiyor. Hex maliyeti yok, ev sayısı düşmüyor.
- Doğrulama: gerçek motorda 5.550 nüfus + 1.000 askerle 24 oyun saati çalıştırıldı — hiç açlık olmadı, ekmek stoğu 0'dan 2.860'a çıktı.

### Seviye tavanı, açlık ve ordu kısayolu hataları (Eylül 2026)
- **Bina seviyesi sınırsızdı.** 18 binanın `maxLevel`i tanımsızdı ve yükseltme kontrolü `def.maxLevel && b.level >= def.maxLevel` biçimindeydi: tanımsızsa koşul hiç çalışmıyor, bina Lvl 21, 30… diye gidiyordu (İlkan'ın fırını Lvl 21 olmuştu). Hepsine **maxLevel 20** verildi; ayrıca `DEFAULT_MAX_LEVEL` + `maxLevelOf()` ikinci emniyet — yeni bir tanıma `maxLevel` yazmayı unutmak sınırsız yapmasın. `clampBuildingLevels` yüklemede tavanı aşmış binayı geri çekiyor (fırın 21 → 20 doğrulandı).
- **Açlıkta ölen ASKER nüfustan düşmüyordu** (`tick.js`): `army[x] -= 1` yapılıyor ama `population` sabit kalıyordu. Asker nüfusun parçası olduğu için bu, her açlık turunda bir "hayalet köylü" üretiyordu — kaybolan köylü hatasının ters yönü. Düzeltildi.
- **`dev_grant` nüfus tavanını aşıyordu:** `population += added` yapıp tavanı da yukarı çekiyordu; 6 kez basınca nüfus 7.140 / tavan 5.550 oluyordu. Artık bütçe önceden hesaplanıyor (boş işçi + tavana kalan yer), asker önce havuzdan alınıyor, bütçeden fazlası verilmiyor ve sebebi yazılıyor.
- Test: 5/5 geçti — Lvl 20 bina yükseltilemiyor, tavanı aşan bina kalmadı, 2.500 asker verilirken nüfus artmadı ve tamamı havuzdan alındı (3.705 → 1.205), muhasebe bozulmadı.

### Nüfus tavanı: ev başına 50 → 100 (Eylül 2026)
- **Soru:** ana bina max olunca kaç üretim alanı alınabiliyor, ve her şey fullenince her binaya işçi yetiyor mu?
- **Ölçüm:** ana bina Lvl 11 (max) → **16 üretim tarlası** (`min(16, 5+seviye)`). Tam max bir köyün işçi talebi **1.780**: 16 tarla Lvl 20 = 640, 6 kule Lvl 20 okçu = 480, 11 işleme/askeri bina Lvl 20 = 660.
- 36 hex'in 25'i benzersiz binalara gidiyor (köşk ve saray aynı köyde olamaz), eve 11 hex kalıyor. Eski 50/seviye ile talebi karşılamak **11 evin hepsini** gerektiriyordu.
- **Karar (İlkan):** ev başına nüfus 50 → **100**/seviye. Artık **4 ev** (2.050) talebi karşılıyor, 5 ev 770 asker kadrosu bırakıyor, 8 ev 2.270.
- İlkan'ın merkez köyünde zaten 8 ev var: tavan **1.800 → 3.550**, talep 1.780 → askere 1.770 kişi.
- Sayı üç yerde elle yazılıydı (index.js + npcAi'de iki yer). Tek kaynak oldu: `villageDefs.maxPopulationOf(village)` ve `BASE_POPULATION`. İstemci arayüzü zaten `populationPerLevel`i tanımdan okuyordu.

### Tarla kadro eğrisi + akıllı işçi dağıtımı (Eylül 2026)
- **Ölçüm:** tarla üretimi `işçi × işçi-başına × arazi çarpanı` — **seviye üretime hiç katkı vermiyor**, yalnız kadro tavanını açıyor. Eski eğri Lvl 20'de **490 işçi** istiyordu (Lvl 1'in 490 katı); nüfus ise 4 ev ile 1.050'ye çıkıyor. 11 tarla = **5.390 kadro**, nüfus 589. Yükseltmek işe yaramıyordu.
- **Karar (İlkan):** model kalsın, yalnız kadro eğrisi yumuşasın. Yeni eğri `1,2,3,5,6,8,10,12,14,16,18,20,22,25,27,30,32,35,37,40` (Lvl 20: 490 → **40**). 11 tarla artık 440 işçiyle tam çalışıyor. `productionDefs.js` (sunucu) ve `buildingDefs.js` (istemci) birebir aynı — 5 kaynak × 20 seviye karşılaştırıldı.
- **Eski kayıtlar kırpılıyor:** `clampWorkersToCapacity` yüklemede kadroyu aşan işçiyi **havuza döndürüyor** (silmiyor). Gerçek kayıtta 86 köy kırpıldı; işçi muhasebesi bozulmadı.
- **Akıllı dağıtıcı** (BOŞLARI DAĞIT): sırayla doldurmak yerine — 1) ekmek zinciri (tüketim + %15; tahıl→değirmen→fırın oranları tanımlardan), 2) odun/kil/taş/demir **üretimleri eşitlenir**, 3) işleme binaları ham üretiminin taşıdığı kadar, 4) askeri binalar.
- Ölçüm (11 tarla Lvl 20, 12 bina Lvl 20): **589 işçi** → eski: ekmek 0/sa (AÇLIK), 25 işçi girdisi olmadan boşa çalışıyor; yeni: ekmek 108/sa (tüketim 92), boşa çalışan 0. **200 işçi** → eski: taş 0, kaynaklar arası fark 526/sa; yeni: fark **28/sa** ve ekmek yine kapalı.
- Not: 589 işçide 4 ham kaynak arası fark ikisinde de aynı (326/sa) — sebebi dağıtım değil **tarla bileşimi** (6 tahıl, 1 odun, 1 taş, 1 demir); bütün ham tarlalar zaten kadrosu dolu.

### Köylüler ekranı + işçi kaçağı (Eylül 2026)
- Yeni **Köylüler** sekmesi (`WorkerScreen.jsx`): nüfusun her kişisi bir kovada — boş, tarla, tarla yükseltme, bina personeli, inşaat, ordu, eğitim kuyruğu rezervi, seferdeki asker. Ekran toplamın nüfusa eşit olduğunu **yazıyor**; tutmuyorsa uyarı veriyor.
- Atanabilir her satırda kaydırıcı + −/+ / MAKS. Toplu: **boşları dağıt** (sıra: tarlalar → işleme binaları → askeri binalar) ve **hepsini boşalt**. Yalnız açık köyü gösterir.
- **İşçi kaçağı bulundu ve kapatıldı:** `dev_setup` süren yükseltmeyi iptal ederken `buildWorkers`ı havuza döndürmeden siliyordu. Ölçüm: 7 işçilik yükseltmede tam 7 kişi kayboldu. 14 eylemlik muhasebe testi yazıldı; düzeltmeden önce 1 eylem bozuyordu, sonra 14/14 temiz.
- **Eski kayıtlar onarılıyor:** `hydrateVillage` → `repairWorkerAccounting` her yüklemede değişmez kuralı kontrol ediyor, kayıp varsa boş işçi havuzuna geri yazıyor. Gerçek kayıtta 23 köy onarıldı (merkez köy 83 + 22 NPC, toplam 584 kişi). NPC motoru temiz: 4.000 oyun saati simülasyonunda muhasebe hiç bozulmadı.
- `flows.js` tek kaynak oldu: `WORKER_ASSIGNABLE_MILITARY`, `takesWorkers`, `maxWorkersOf`. VillageCenter'daki elle yazılmış kopyada **kule eksikti**, kulelerin okçu sayacı bu yüzden hiç görünmüyordu — düzeltildi.

### Test kısayolları tek menüde (Eylül 2026)
- Üst bardaki "TEST DOLDUR" düğmesi yerine **TEST menüsü** (`DevMenu.jsx`): depoları doldur, ikinci köy ver, ordu ver. Her satırın altında ne yaptığı yazılı.
- `dev_new_village`: merkeze en yakın boş dünya slotuna kural tanımadan ikinci köy kurar (göçmen, kaynak, yol süresi, köy hakkı sorulmaz). Çoklu köy arayüzünü kültür puanı biriktirmeden denemek için.
- Yalnız `import.meta.env.DEV` + sunucuda `TRANORD_DEV_CHEATS=1`; üretim girişinde ne düğme ne olay var.

### Dünya büyütüldü ve sıfırlandı (Eylül 2026)
- Yarıçap **60 → 134**. NPC sayısı aynı (200) kaldı, köyler birbirinden uzaklaştı: slot 332 → **1.729**, doluluk %60 → **%12**, NPC'lerin merkeze ortalama uzaklığı 40 → **89 halka**. İkinci/üçüncü köyler için **1.528 boş slot** var.
- Kademe halkaları yarıçapla birlikte ölçeklendi (×134/60). Ölçeklenmezse 200 NPC'nin **170'i** en güçlü kademeye ("Konak") düşüyordu — ölçüldü; ölçekli hâlde dağılım eskisiyle aynı (12/29/46/62/51).
- Yarıçap ×5 (R=300, 9.006 slot) denendi ama **uzak zoom arazi çizimi** dünyanın tamamını tek seferde boyuyor: 53.837 hex ≈ 320.000 çizgi parçası, her pan'de yeniden — kaydırma takılıyor. R=300'e çıkmadan önce görüş alanına göre parçalı çizim yazılmalı.
- Dünya **sıfırdan tohumlandı** (kullanıcı kararı: her şey silinsin, hesaplar korundu). Bu aynı zamanda 191 bayat NPC kaydını da temizledi: `.dev-data.json` 1.690 KB → **705 KB**, bayat kayıt **0**.
- Sıfırlama öncesi yedek: `server/.dev-data.YEDEK-*.json` (gitignore kapsamında).
- İlk tohumlama 11.5 sn sürüyor (200 NPC × yaş simülasyonu); sonraki açılışlar kayıttan okuyor.

### Ganimet kuralı netleşti (Eylül 2026)
- **Karar:** ganimet yalnızca taşıma kapasitesine göre alınır; saldırganın deposunda yer olup olmadığına BAKILMAZ. Eve varışta sığmayan kısım **çöp olur**. Depo yönetmek oyunun parçası.
- Kaybedilen miktar rapora `lootLost` olarak yazılıyor ve rapor ekranında "deponun yeri yetmediği için X ziyan oldu" diye görünüyor — bu zaten vardı.
- Boş depoya göre sınırlama denendi, sonra bu karar üzerine geri alındı.

### Yükseltme maliyeti her seviye için (Eylül 2026)
- 21 binada yükseltme **bedavaydı**: sunucu yalnızca `upgradeCostBase` tanımlıysa ücret alıyordu, o alan da sadece 7 binada vardı. Artık taban yoksa binanın **inşa maliyeti** taban kabul ediliyor — her binanın her seviye artışının bedeli var.
- Maliyet = taban × çarpan^(seviye−1). Öntanımlı çarpan **1.25** (Lvl 10'da ~7.5×, Lvl 20'de ~73×); kendi çarpanı olan 7 bina (anaBina 1.7, askeri binalar 1.6–1.7) korundu.
- **İki tanım dosyası birbirinden ayrılmıştı**: 6 askeri binada (zırhçı, silahçı, ahır, kışla, atölye, cephanelik) sunucu maliyet alıyor ama istemcide o alan yoktu — oyuncu "bedava" görürken kaynak düşüyordu. Senkronlandı; 28 bina × 20 seviye = 560 vakada istemci ile sunucu tam eşleşiyor.
- `BuildMenu` kendi formülünü kullanıyordu ve `Math.ceil` ile hesaplıyordu (sunucu `Math.round`) — ekranda 1 fazla gösterebiliyordu. Tek kaynağa çekildi: `villageDefs.upgradeCostAt`.
- Yardım sayfasındaki tablo artık **her seviye** için maliyet + süre (1/3/10 işçi) satırı gösteriyor.

### Yardım / ansiklopedi ekranı (Eylül 2026)
- Yeni sekme **Yardım**: 28 köy binası, 5 üretim alanı, bütün birlikler ve ekipman — aramalı liste + detay sayfası.
- İçerik ELLE YAZILMIYOR: bütün sayılar `villageDefs`, `buildingDefs` ve payload'daki `unitDefs`/`equipmentDefs`'ten türetiliyor. Dengeyi kodda değiştirince sayfa kendiliğinden güncelleniyor.
- Her sayfada: kategori, maksimum seviye, köyde kaç tane, işçi kapasitesi, inşa/yükseltme maliyeti, seviye başına süre tablosu (1/3/10 işçi), üretim oranları, depo kapasitesi, bonus tabloları.
- Bina panelinde **"?" düğmesi** → o binanın yardım sayfasına derin bağlantı (hem poster hem sade başlıkta).
- Süreler tek zaman çeviriciden geçiyor, hız kaydırıcısıyla birlikte değişiyor.
- Gerçek render testi: **53/53 sayfa** sorunsuz basıldı, içerik değerleri örneklemeyle doğrulandı.

### Nüfus artışı ana binaya bağlandı (Eylül 2026)
- Artış hızı **ana bina seviyesinden** gelir, tavanı **ev** belirler. Eskiden sabit 1 kişi/oyun saatiydi; ana binayı yükseltmenin nüfusa etkisi yoktu.
- `popPerGameHour(lv) = 1.0 + (lv-1) × 0.6` → lvl 1: 1/sa (24/gün), lvl 10: 6.4/sa (154/gün), lvl 11: 7/sa.
- Aç ya da tavana dayanmış köy büyümez (eskisi gibi).
- `StatusRail`'deki "+1 nüfus için kalan süre" düzeltildi: `tickMs × 10 / 1000` idi, tick sayısına dayalı eski kuraldan kalmıştı ve gerçek hızla ilgisi yoktu. Artık sunucunun `populationPerHour` değeri + tek zaman çevirici.

### `[STARVE]` log seli kesildi (Eylül 2026)
- Kök neden: `quiet: true` yalnızca `seedNpcVillage`'da atanıyor ve kayda yazılmıyordu; kayıttan yüklenen 200 NPC konuşkan dönüyordu.
- Yükleme noktasında (ve TOWER_SLOTS onarım yolunda) NPC köyü sessiz işaretlenir.
- Ölçüm — aynı kayıtla açılış: **143 STARVE satırı → 0**, toplam log 157 → 13 satır.

### Harita sadeleştirme (Eylül 2026)
- NPC köyleri tek nötr **gri**; renk artık yalnızca anlam taşıyanlarda (sarı = benim, kırmızı = rakip oyuncu, koyu yeşil = birlik — planlı).
- Uzaklaştırınca köy artık uydurma 2.6·S altıgenle değil **gerçekten sahip olunan hex'lerin birleşim sınırıyla** çiziliyor; resim/doku yok, sade dolgu + ince kontur.
- Toprak şekilleri `useMemo` ile bir kez hesaplanıyor (zoom/pan sırasında sadece hazır `d` basılıyor); outline önbelleği 400 → 4000 (200+ köyde her karede temizleniyordu).
- Köy işareti uzakta küçültüldü, etiket eşiği 0.62 → 0.72, kendi köyün nabız halkası en uzak zoom'da kapalı.

### Sağ ray katlanabilir (Eylül 2026)
- İnşaat, Ekipman ve Ordu bloklarının başlığına tıklayınca blok kapanıp açılıyor; kapalıyken başlık ve özet sayı görünür kalıyor.
- Seçim tarayıcıda saklanıyor (`tn.rail.collapsed`), bozuk kayıtta hepsi açık davranışına düşüyor.
- Gerçek render testi: üçü kapalıyken çıktı 17.750 → 7.765 karaktere iniyor, başlıklar duruyor.

### Köy içi görünüm
- Düz tepeli altıgen köy sınırı, binalar arasında hex kenarları boyunca yollar, köşe ceplerinde dekor (çam/kaya).
- Köy içinde ayrı orman dokusu (`koy-orman.png`), haritada eskisi korundu.
- Surun dışındaki dekoratif komşu arazi hex'leri kaldırıldı — tek arka plan (`NordicBackdrop courtyard`).

### Zaman ölçeği ve süre gösterimi
- Bütün süreler **saat:dakika:saniye** biçiminde (`fmtTime`).
- Oyun dakikası → gerçek saniye çevirisi tek yerden (`gameMinutesToRealSeconds`), sunucunun `minutesToClock → clockToRealSeconds` adımlarını birebir taklit ediyor.
- 8 yerde birim hatası düzeltildi (bina inşa, tarla yükseltme/kurma, ana bina, birim eğitimi, ekipman, depo dolma/tükenme ETA). 82 vaka sunucuyla saniye saniye eşleşiyor.

### Ağ ve disk performansı (canlı öncesi)
- Olay bazlı yayın: statik veriler bağlantı başına bir kez, raporlar sadece değişince, 30 sn heartbeat, istemci tarafında ara değer hesabı.
- Kirli-küme kalıcılık + köy başına offline telafi. Disk yazması ~250×, ağ trafiği ~63× azaldı.

### Socket teslim hatası
- `useMemo` içindeki socket StrictMode'da iki kez kuruluyordu; sunucu da oturum başına tek `socketId` tutuyordu — komutlar gidiyor, cevap yanlış socket'e düşüyordu. Modül seviyesinde tek socket + kullanıcı odası (`u<id>`) yayını ile çözüldü.

### Güvenlik ve altyapı
- Üretimde `JWT_SECRET` zorunlu, kısıtlı CORS, girişte hız sınırı (10 deneme / 10 dk / IP).
- `server/env.js` — makine genelindeki `DATABASE_URL` yerel modu üretim sanamaz.
- Üretim PostgreSQL yolu düzeltildi (ilk oyuncu bağlantısında çöküyordu — canlıya çıkışı bozacaktı).
- Dünya her açılışta kısmen yeniden kurulmuyor (kayıtlı slotlar korunuyor).
- `.dev-data.json` gitignore'da (şifre özeti + 1.7 MB dünya kaydı içeriyor).

### Giriş
- Giriş/kayıt ekranı oyunun içinde (ayrı tanıtım sitesi yok).
