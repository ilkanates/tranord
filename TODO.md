# TraNord — Yapılacaklar

Son güncelleme: 9 Eylül 2026

Sıralama önem sırasına göre. Her madde bitince **Tamamlandı** bölümüne taşınır.

---

## 🔴 Canlıya çıkmadan önce

### 1. Negatif ekmek akışı
- Bazı köylerde ekmek üretimi tüketimin altında ve hiç toparlanmıyor; NPC'ler sonsuz açlıkta kalıyor.
- Nüfus/asker/at tüketimi ile fırın kapasitesi arasındaki denge gözden geçirilecek.

---

## 🟠 Büyük iş: Çoklu köy ve genişleme

Bu bölüm tek bir sistem — parçalarını ayrı ayrı yapmak mümkün değil, sıralı gitmek gerekiyor.

### 0. Önce mimari: bir kullanıcı = birden fazla köy
**Bu sistemin en büyük kısmı bu ve şu an hiç yok.** Mevcut kod bir kullanıcıya TEK köy varsayıyor:
- `villages.user_id` sütununda **UNIQUE kısıtı** var — veritabanı seviyesinde ikinci köy imkânsız.
- Sunucuda `session.village` tek nesne; tick döngüsü, kayıt, offline telafi, yayın (`emitVillage`) hepsi bunun üstüne kurulu.
- İstemcide bütün paneller tek köyün verisiyle çalışıyor.

Yapılacaklar:
- `villages` tablosundan UNIQUE kaldır, `is_capital` sütunu ekle (`slot_key` unique kalsın).
- `session.village` → `session.villages` + aktif köy; tick her köy için dönmeli, kayıt ve offline telafi köy başına.
- Yayın (`buildPayload` / `emitVillage`) aktif köyü göndersin, köy listesi ayrı hafif bir alan olarak gitsin.
- İstemciye köy değiştirici (üstte sekme veya açılır liste); bütün paneller aktif köye bağlanmalı.
- Kendi köyleri arasında kaynak/asker gönderimi (mevcut yürüyüş altyapısı kullanılabilir).

### 1. Göçmen ve yeni köy kurma
- Göçmen köşk veya saraydan üretilir (asker gibi kuyruklu üretim).
- **3 göçmen** boş bir araziye gönderilir → oraya yeni köy kurulur.
- Kurulum için hem kültür puanı eşiği hem köy hakkı (köşk/saray seviyesi) sağlanmış olmalı.
- Boş arazi seçimi: haritada slotu olan ama sahibi olmayan hex.
- **Karar gerekiyor:** göçmen maliyeti (kaynak + nüfus) ve üretim süresi.

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

### Kuşatma birimleri (Koç Başı, Mancınık)
- Normal savaştan **sonra** çalışan ayrı faz.
- Koç Başı: saldırgan kazanırsa `saldırı × sayı` oranında sur + hendek seviyesi düşer.
- Mancınık: saldırgan hedef bina seçer, seviyesi düşürülür.
- Şu an savaş hesabına hiç dahil değil (simülatörde de seçilemez).

### Sağlık çadırı
- `saglikCadiri` binası tanımlı, mekaniği yok.
- Savaş sonrası **savunanın** kayıplarının bir kısmı iyileştirilir.
- Öneri: `iyileşme = min(0.5, seviye × 0.05)` → Lvl 10'da %50 tavan.

### Moral bonusu
- Küçük köy büyüğe saldırırsa saldırgana bonus (Travian mantığı).
- Formül: `moral = min(1, (saldıran_nüfus / savunan_nüfus)^0.2)`.
- Köy puan sistemi netleşince eklenir.

### Pazar
- `pazar` binası tanımlı, al-sat ve köyler arası gönderi mekaniği yok.

---

## 🔵 Arayüz / içerik

- Köy içi görsel: kalan hammadde görselleri (`koy-tahil.png` vb.) istenirse köye özel arazi dokusu olarak eklenebilir.
- `client/public/` içindeki 5 tasarım önizleme sayfası (`koy-sekil*.html`, `koy-tasarim.html`, `sur-onizleme.html`) — `koy-sekil3.html` referans olarak kalsın, diğerleri silinebilir.
- Savaş simülatörüne kule girdisi eklenmedi (şu an `kulePct = 0` ile çalışıyor, yani kulesiz simülasyon).

---

## ✅ Tamamlandı

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
