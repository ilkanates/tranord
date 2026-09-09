# TraNord — Yapılacaklar

Son güncelleme: 9 Eylül 2026

Sıralama önem sırasına göre. Her madde bitince **Tamamlandı** bölümüne taşınır.

---

## 🔴 Canlıya çıkmadan önce

### 1. Negatif ekmek akışı
- Bazı köylerde ekmek üretimi tüketimin altında ve hiç toparlanmıyor; NPC'ler sonsuz açlıkta kalıyor.
- Nüfus/asker/at tüketimi ile fırın kapasitesi arasındaki denge gözden geçirilecek.

### 2. Nüfus artışı yok
- `StatusRail` "Her X içinde +1 nüfus" yazıyor ama sunucuda nüfusu artıran **hiçbir kod yok**.
- Nüfus sadece asker eğitiminde (işçi → asker) ve dev-cheat ile değişiyor.
- Karar gerekiyor: ev seviyesine bağlı artış hızı mı, tahıl fazlasına bağlı mı?

### 3. Bayat NPC kayıtları
- Veritabanında 278 NPC kaydı artık hiçbir slota bağlı değil (dünya yeniden tohumlanınca kalmış).
- Temizlik betiği yazılacak; `.dev-data.json` boyutu da düşer.

### 4. Ganimet boş depo kadar sınırlanmalı
- Şu an ganimet hedefin deposundan alınıyor ama saldırganın boş depo yeri kontrol edilmiyor — taşma oluyor.

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

### 1. Kültür puanı
- Her bina her seviyesinde belirli bir **kültür puanı** üretir; köyün toplamı oyuncunun toplamına eklenir.
- Belirli eşiklere ulaşınca yeni köy hakkı açılır (2. köy için X puan, 3. için Y…).
- Ekranda görünmeli: mevcut puan, sıradaki eşik, kalan.
- **Karar gerekiyor:** puan tablosu (bina başına kaç puan) ve eşikler.

### 2. Köşk ve Saray
- **Köşk** — her köye kurulabilir. Lvl **10** ve **20**'de birer yeni köy hakkı verir (toplam 2).
- **Saray** — YALNIZCA merkez köye kurulabilir. Lvl **10**, **15** ve **20**'de birer hak verir (toplam 3).
- Saray yıkılıp başka bir köyde kurulabilir → **merkez köy oraya taşınır**.
- Bir köyde ikisi birden olamaz (Travian kuralı) — karar: bu kural konsun mu?
- **Karar gerekiyor:** saray yıkılınca o hakla alınmış köyler ne olur? (Travian'da köyler kalır, hak yeniden kullanılamaz.)
- **Karar gerekiyor:** merkez köyün başka bir avantajı olsun mu (yıkılamazlık, üretim bonusu)?

### 3. Göçmen ve yeni köy kurma
- Göçmen köşk veya saraydan üretilir (asker gibi kuyruklu üretim).
- **3 göçmen** boş bir araziye gönderilir → oraya yeni köy kurulur.
- Kurulum için hem kültür puanı eşiği hem köy hakkı (köşk/saray seviyesi) sağlanmış olmalı.
- Boş arazi seçimi: haritada slotu olan ama sahibi olmayan hex.
- **Karar gerekiyor:** göçmen maliyeti (kaynak + nüfus) ve üretim süresi.

### 4. Taverna ve festivaller
- Yeni bina: **Taverna**. Festival düzenleyip kültür puanı üretir.
- **Küçük festival** — az kaynak, az puan, kısa süre.
- **Büyük festival** — çok kaynak, çok puan, uzun süre; muhtemelen daha yüksek taverna seviyesi gerektirir.
- Aynı anda tek festival; süre boyunca geri sayım görünmeli.
- **Karar gerekiyor:** maliyet / süre / puan değerleri ve taverna seviye gereksinimleri.

### 5. Elçilik ve birlik (ittifak)
- Yeni bina: **Elçilik**. Buradan birlik kurulur ve başka oyuncular birliğe davet edilir.
- Haritada birlik üyeleri **koyu yeşil** görünmeli (kendi köyüm açık yeşil, rakip oyuncu kırmızı, NPC gri).
- Elçilik seviyesi birlik üye sayısı tavanını belirlesin (Travian mantığı).
- **Karar gerekiyor:** davet/kabul akışı, birlik yönetimi (kurucu yetkileri, üye atma), birliğe saldırı yasağı olsun mu.
- Sunucu tarafı: birlik tablosu + üyelik, harita anlık görüntüsüne köy başına `allianceId` eklenmesi.

### 6. Ayarlar menüsü ve ses
- **Ayarlar menüsü** eklenmeli (üst barda dişli ikonu).
- **Arka plan müziği** — açık/kapalı + ses seviyesi.
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
