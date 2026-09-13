# TraNord — Yapılacaklar

Son güncelleme: 13 Eylül 2026

Sıralama önem sırasına göre. Her madde bitince **Tamamlandı** bölümüne taşınır.

---

## 🟠 Büyük iş: Çoklu köy ve genişleme

Bu bölüm tek bir sistem — parçalarını ayrı ayrı yapmak mümkün değil, sıralı gitmek gerekiyor.

### 0. ~~Önce mimari: bir kullanıcı = birden fazla köy~~ — YAPILDI
Bkz. Tamamlandı · "Çoklu köy mimarisi". Bu maddede kalan tek iş:
- **Kendi köyleri arasında kaynak/asker gönderimi.** Kaynak tarafı pazarla
  çözüldü (tüccar yürüyüşü); asker tarafı da yapıldı — bkz. Tamamlandı · "Takviye".

### 1. ~~Göçmen ve yeni köy kurma~~ — YAPILDI (uçtan uca oynanarak doğrulanmadı)
Kod yolları yerinde: `gocmen` birimi (köşk/saray Lvl 10, 240 dk, maliyeti
tanımlı), `mode: 'yerlesim'` seferi, kültür puanı + köy hakkı denetimi
sefer BAŞLARKEN yapılıyor, varışta `foundVillageAt` köyü kuruyor.

Kalan:
- Uçtan uca bir oyun turunda denenmedi — 3 göçmen üret, boş araziye gönder,
  köyün gerçekten kurulduğunu ve köy listesine düştüğünü gör.
- Arazi varışta dolmuşsa göçmenler kayboluyor; oyuncuya bunun için bir
  rapor/uyarı gidiyor mu, kontrol edilmeli.

### 0. Ev sahibi misafir askeri geri yollayabilsin
Şu an takviyeyi YALNIZ SAHİBİ geri çağırabiliyor (`takviye_geri_cagir`,
sahiplik denetimi var). Ev sahibinin elinde hiçbir düğme yok.

- Ordu ekranındaki "bu köydeki takviyeler" listesine **GERİ YOLLA** gelsin.
- Asker sahibinin köyüne dönüş seferi olarak yola çıksın (mevcut
  `takviyeGeriCagir` yolu birebir kullanılabilir — tek fark yetkilendirme).
- **Neden gerekli:** misafir askerin ekmeğini EV SAHİBİ ödüyor. Çevrimdışı
  ya da vazgeçmiş bir oyuncunun bıraktığı takviye, ev sahibinin köyünü
  sessizce aç bırakabiliyor ve çıkış yolu yok.
- Sahibine bir rapor gitmeli ("X köyü takviyeni geri yolladı") — askerin
  neden yolda olduğunu göremezse oyuncu hata sanır.
- **Karar gerekiyor:** ev sahibi geri yollarken asker yolda savunmaya
  katılmıyor; kötüye kullanım var mı (saldırı anında misafiri kovmak)?
  Muhtemel çözüm: gelen sefer varken geri yollama kapalı.

### 1. Kahraman (Travian mantığı)
Oyuncunun TEK ve kalıcı kahramanı olsun; seferle birlikte yürüsün.

- **Kahraman konağı** (yeni bina): kahraman burada doğar, burada dirilir.
- **Deneyim ve seviye**: savaşta öldürdüğü birim başına XP, seviye atlayınca
  dağıtılacak puan. Travian'daki dört eksen: saldırı gücü, savunma gücü,
  kaynak üretimi, dirilme hızı.
- **Savaşta tek birim gibi davranır** ama ölmez — yaralanır ve konakta
  belli bir sürede iyileşir. Ölüm kalıcı olsaydı kimse kahramanı riske atmazdı.
- **Eşya**: silah/zırh/at/at nalı gibi kuşanılabilir parçalar. Kaynağı:
  yağmada düşen ganimet (Travian'da "macera"; bizde NPC seferinden düşme
  olabilir — ayrı bir macera sistemi kurmadan).
- **Karar gerekiyor:**
  - Kahraman hangi köye ait? Çoklu köyde konağın olduğu köy mü, aktif köy mü?
  - Ölüm/iyileşme süresi gerçek zaman mı oyun saati mi?
  - Eşya nasıl düşecek — macera sistemi mi, sefer ganimetinden mi?
  - Kahraman kaynak üretimi (Travian'da köy üretimine ekleniyor) olsun mu,
    yoksa yalnız savaş birimi mi kalsın?
- Sunucu tarafı: kahraman durumu oyuncu bazında (merkez köyün state'inde,
  görev kaydıyla aynı yerde), sefer paketine kahraman bayrağı, savaş
  hesabına tek birimlik özel giriş.

### 2. Elçilik ve birlik (ittifak)
- Yeni bina: **Elçilik**. Buradan birlik kurulur ve başka oyuncular birliğe davet edilir.
- Haritada birlik üyeleri **koyu yeşil** görünmeli (kendi köyüm açık yeşil, rakip oyuncu kırmızı, NPC gri).
- Elçilik seviyesi birlik üye sayısı tavanını belirlesin (Travian mantığı).
- **Karar gerekiyor:** davet/kabul akışı, birlik yönetimi (kurucu yetkileri, üye atma), birliğe saldırı yasağı olsun mu.
- Sunucu tarafı: birlik tablosu + üyelik, harita anlık görüntüsüne köy başına `allianceId` eklenmesi.

### 3. Ayarlar menüsü ve ses
- **Ayarlar menüsü** eklenmeli (üst barda dişli ikonu).
- ~~**Arka plan müziği**~~ — yapıldı: `client/src/audio.js` + üst bardaki müzik düğmesi (aç/kapa, ses seviyesi, sıradaki parça). Ayarlar menüsü gelince oraya taşınmalı.
- **Olay sesleri** — her biri tek tek açılıp kapanabilir ve seviyesi ayarlanabilir olmalı:
  - saldırı geldiğinde / saldırı sonucu
  - bina inşası bittiğinde
  - asker üretimi bittiğinde
  - (aday) ekipman bitti, depo doldu, açlık başladı
- Ana bir "ses" ana kısması (master) + kategori bazlı ayarlar.
- Tercihler tarayıcıda saklanmalı (sağ raydaki katlama gibi, `localStorage`).
- **Karar gerekiyor:** ses dosyaları nereden gelecek (üretilecek mi, hazır kütüphane mi), format (mp3/ogg) ve toplam boyut sınırı.
- Not: tarayıcılar kullanıcı etkileşimi olmadan otomatik ses çalmayı engelliyor — müzik ilk tıklamadan sonra başlamalı.

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

### Sağlık çadırı
- `saglikCadiri` binası tanımlı, mekaniği yok.
- Savaş sonrası **savunanın** kayıplarının bir kısmı iyileştirilir.
- Öneri: `iyileşme = min(0.5, seviye × 0.05)` → Lvl 10'da %50 tavan.

### Moral bonusu
- Küçük köy büyüğe saldırırsa saldırgana bonus (Travian mantığı).
- Formül: `moral = min(1, (saldıran_nüfus / savunan_nüfus)^0.2)`.
- Köy puan sistemi netleşince eklenir.

### Pazar — kalanlar
NPC takası, oyuncular arası teklif ve tüccar yürüyüşü **yapıldı**
(`server/game/pazar.js`, `pazarYol.js`; `pazar_takas`, `pazar_teklif_ac/
kabul/iptal`). Bu maddede kalan:
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
