# TraNord — Yapılacaklar

Son güncelleme: 17 Eylül 2026

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
- ~~Görev zincirine kahraman adımları~~ — **TAMAMLANDI**: dört adım (*konağı kur*,
  *seviye 3*, *ilk macera*, *ilk kuşam*). Bkz. Tamamlandı.
- ~~Kahramanın **hızı** ve at slotu~~ — yapıldı: at eki birim tanımlarından
  ölçülüyor, nadirlik hızı büyütüyor, macera süresi hıza bağlı.
- ~~Kahramanın ganimet payı~~ — **YAPILDI** (bkz. Tamamlandı · kahraman ganimet payı).
- KALAN: macera/eşya geldikten sonra uçtan uca denge ölçümü (kahramansız
  ve kahramanlı aynı savaş, fark yüzdesi).

**Kararlar (verildi):**
- Kahraman **oyuncuya** ait, üssü konağın olduğu köy.
- **Ölmez, bayılır**; iyileşme oyun saati üzerinden (hız çarpanına uyar).
- Eşya **maceradan** düşer (yağma ganimetinden değil) — macera sistemi
  zaten kuruluyor, iki ayrı düşme yolu dengeyi iki yerden bozardı.
- Kaynak üretimi bonusu **var** (skil olarak) — Travian'daki gibi.

**Açık kalan:** kahraman başka oyuncunun köyünde takviye olarak durabilir mi.

### 2. ~~Elçilik ve birlik (ittifak)~~ — **YAPILDI** (bkz. Tamamlandı)

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

## 🟠 Büyük iş: NPC sistemi — yaşayan bir dünya (18 Eylül 2026)

İlkan'ın tarifi: *"NPC sistemini geliştir, çok daha fazla NPC köyü olsun
ve bunlar gelişsinler, item alsınlar, saldırsınlar, köy büyütsünler.
Çok büyük bir NPC sistemi kur, yapay zekâ gibi yapılsınlar."*

**BUGÜNKÜ HÂLİ.** NPC'ler sahte bir büyüme eğrisi değil, oyuncunun
oynadığı MOTORUN AYNISI ile çalışıyor (`npcAi.js` · `processTick`):
işçi atıyor, bina kuruyor, yükseltiyor, ekipman üretiyor, asker
eğitiyor. Yakındaki oyuncuya yağma da gönderiyorlar. **Olmayanlar:**
birbirleriyle savaş, ikinci köy kurma, kahraman/eşya, kişilik farkı.

**ÖLÇÜM** (dizüstü; Pi 4 kabaca 4 kat yavaş):

| NPC | `stepVillage`/tik | AI turu | heap |
|---|---|---|---|
| 200 | 1.08 ms | 5.16 ms | 14 MB |
| 800 | 4.32 ms | 19.75 ms | 26 MB |

Saniyelik maliyet yalnız `stepVillage`; AI turu ~100 dakikada bir
koşuyor. Yani sayı CPU'dan değil, açılış tohumlamasından ve harita
çiziminden sınırlıydı.

### Aşama 1 — Dünya dolsun (200 → 700) — ~~YAPILDI~~
Bkz. Tamamlandı · "NPC dünyası 700 köye çıktı".

### Aşama 2 — NPC'ler birbirine saldırsın — ~~YAPILDI~~
Bkz. Tamamlandı · "NPC'ler birbirine saldırıyor".
- **KALAN:** oyuncu bunu haritada GÖRSÜN — "şu an kim kime saldırıyor"
  işareti. Bugün yalnız kendi seferlerin haritada görünüyor; NPC
  savaşları sıralamadaki yer değişiminden dolaylı hissediliyor.

### Aşama 3 — NPC'ler yeni köy kursun
Harita zamanla dolsun; dünya oyuncu girmeden de değişsin.
- Kültür puanı ve göçmen zaten motorun içinde — NPC'nin bunları
  kullanması gerekiyor.
- Kuyruk altyapısı hazır (`durum.js · tohumKuyrugu`): çalışma anında
  köy eklemek artık açılışı bloke etmiyor.
- **Sınır şart:** dünya doluluğu %60'ı aşmamalı (bkz. `npc-dunya.test.js`),
  yoksa oyuncunun ikinci köyüne yer kalmaz.

### Aşama 4 — NPC kahramanı ve eşyası
- NPC'nin kahramanı olsun, maceraya çıksın, eşya kuşansın.
- Açık artırmaya girsinler — pazar tek oyunculu bir ekonomi olmaktan
  çıkar. *(Açık: NPC'nin gümüşü nereden gelecek? Yağma ganimeti mi,
  üretim mi? Sonsuz gümüş açık artırmayı anlamsızlaştırır.)*

### Aşama 5 — Kişilikler
Her NPC'ye karakter: saldırgan · ekonomist · savunmacı. Bugün hepsi
aynı kararı veriyor, yani dünyada 700 tane aynı köy var. Kişilik,
davranışı tek bir katsayı yerine gerçekten farklılaştıran şey.

---

## 🟢 Oyun mekaniği

### Pazar — kalanlar
NPC takası, oyuncular arası teklif ve tüccar yürüyüşü **yapıldı**
(`server/game/pazar.js`, `pazarYol.js`; `pazar_takas`, `pazar_teklif_ac/
kabul/iptal`). Bu maddede kalan:
- ~~Karşılıksız hammadde gönderme~~ — yapıldı: pazarda HAMMADDE GÖNDER sekmesi
  + haritada kısayol (bkz. Tamamlandı).
- ~~Teklif listesinde arama/süzme~~ — **YAPILDI** (bkz. Tamamlandı).
- ~~Teklifin süresi dolunca otomatik iptal~~ — **YAPILMAYACAK** (İlkan'ın kararı,
  16 Eylül 2026). Teklif açan oyuncu onu kendisi iptal edebiliyor; süre
  koymak açık teklifi sessizce yok eden ikinci bir kural eklerdi.
- ~~Tüccar kapasitesinin pazar seviyesiyle ilişkisi~~ — **GÖZDEN GEÇİRİLMEYECEK**
  (İlkan'ın kararı, 16 Eylül 2026). Mevcut hâli bırakılıyor.

---

## 🔵 Arayüz / içerik

### ~~Köy görünümü: hex haritaya alternatif "kart/kategori" görünümü~~ — **YAPILDI** (bkz. Tamamlandı)

- Köy içi görsel: kalan hammadde görselleri (`koy-tahil.png` vb.) istenirse köye özel arazi dokusu olarak eklenebilir.
- ~~`client/public/` içindeki 5 tasarım önizleme sayfası~~ — yapıldı: altı geliştirme sayfası (5 prototip + `dev-login.html`) `client/dev/` altına taşındı ve yalnız `vite dev` sırasında servis ediliyor; üretime çıkmıyorlar. `koy-sekil3.html` referans olarak duruyor, diğer dördü istendiğinde silinebilir.
- ~~Savaş simülatörüne kule girdisi~~ — **YAPILDI** (bkz. Tamamlandı · savaş simülatörü).

---

## 🟣 Büyük iş: Gümüş, altın ve açık artırma (17 Eylül 2026 — İlkan'ın tarifi)

İlkan'ın sözleri: *"kahramanlar itemlerini satabilmeli gümüş karşılığında. gümüş ile de ileride birşeyler alabileceğiz. itemlerin min tutarları olsun, kimse almasa bile açık arttırma bitince o parayı kullanıcı alsın, item NPC'ye satılmış olsun. her satış 24 saat açık arttırmada dursun, fazla parayı veren alsın. gümüşün asıl kazanma olasılığı kahramanın maceraları olsun. başlangıçta herkese birkaç item alacak kadar gümüş verilsin. oyunda bir de altın olsun, yine bunu canlıya alınca bir miktar altın verelim kullanıcıya. kullanıcı altını gümüşe, gümüşü altına çevirebilsin. bunun için bir binaya gerek yok, kendi menüsü olsun yukarıda. altınla 1'e 1 hammadde ticareti yapabilsin. üretim bonusu, depo bonusu ve bina yapımını hızlı bitirme gibi şeylerde de kullanabilsin."*

> **DURUM (17 Eylül 2026):** 1–3 **YAPILDI** — kese, açık artırma ve eşya
> seviyeleri çalışıyor (bkz. Tamamlandı). ALTIN cüzdanı da var ama kalan
> iki iş duruyor: **gerçek parayla altın satın alma** (ödeme sağlayıcısı)
> ve **altının bonus kullanımları** (üretim bonusu, depo bonusu, binayı
> anında bitirme). Bunların sayıları hâlâ İlkan'ın kararını bekliyor.
>
> **ALTINLA HAMMADDE ALIMI İPTAL** (İlkan, 17 Eylül 2026:
> *"parayla hammadde alınamamalı"*). Kısa süre açıktı, kaldırıldı.

### 1. ~~GÜMÜŞ — kahramanın parası~~ — **YAPILDI**
- **Kaynağı asıl olarak MACERA** (İlkan'ın kararı). Yağmadan ya da üretimden gelmiyor: gümüş kahramana ait bir ekonomi, köy ekonomisinden ayrı durmalı.
- **Başlangıç bakiyesi**: herkese birkaç eşya alacak kadar. *(Açık: "birkaç eşya" kaç gümüş? Eşya taban fiyatları belirlenince türetilebilir.)*
- Harcama yeri: açık artırmadan eşya almak. İleride başka şeyler.

### 2. ~~AÇIK ARTIRMA — eşya pazarı~~ — **YAPILDI**
- Kahraman eşyasını satışa koyuyor, **24 saat** açık kalıyor, **en yüksek teklifi veren** alıyor.
- **TABAN FİYAT (min tutar) VAR ve kimse teklif vermezse bile satış OLUYOR**: süre bitince eşya "NPC'ye satılmış" sayılıyor, satıcı taban fiyatı alıyor. Bu, İlkan'ın açık isteği ve önemli bir denge kararı — eşya hiç satılmazsa oyuncu emeğinin karşılığını alamazdı.
- **Açık sorular (denge kararı gerekiyor):**
  - Taban fiyat nadirliğe göre mi, slota göre mi, ikisine birden mi?
  - Teklif verirken gümüş rezerve ediliyor mu (yoksa aynı gümüşle on açık artırmaya girilebilir)?
  - Teklifi geçilen oyuncuya gümüş anında mı dönüyor?
  - Son dakika teklifi süreyi uzatıyor mu (snipe koruması)?
  - Satıştan NPC'ye giden eşyalar dünyadan siliniyor mu, yoksa havuzda mı kalıyor?
- **Mimari notu**: süre bitimi zamanlayıcı ister — mevcut sefer/kuyruk tikine bağlanabilir, ayrı bir zamanlayıcı kurmak ikinci bir zaman kaynağı olurdu (bu projede zaman TEK yerden akıyor: `gameTime.js`).

### 3. ~~EŞYA SEVİYESİ — eşyalar yükseltilebilsin~~ — **YAPILDI**
- İlkan: *"itemlerin de lvl'leri 5 lvl arttırılabilecek, onu da ekle."*
- Her eşya **5 seviye** yükseltilebilecek; bonusları seviyeyle büyüyecek.
- **Açık sorular (denge kararı gerekiyor):**
  - Yükseltmenin bedeli ne? Gümüş mü, altın mı, hammadde mi, ikisi birden mi? (Gümüş ekonomisiyle aynı turda karara bağlanmalı — eşya yükseltmek gümüşün ikinci harcama yeri olabilir ve açık artırma fiyatlarını doğrudan etkiler.)
  - Seviye başına artış sabit mi (her seviye +%20) yoksa katlanan mı?
  - Nadirlik ile seviye nasıl birleşiyor? Sıradan bir eşyanın Lvl 5'i, efsanevi bir eşyanın Lvl 1'inden güçlü olmalı mı? (Olursa nadirlik anlamsızlaşır; olmazsa sıradan eşyayı yükseltmek boşa yatırım olur.)
  - Yükseltilmiş eşya açık artırmada satılabilir mi, satılırsa taban fiyatı seviyesiyle büyüyor mu?
  - Yükseltme başarısız olabilir mi (risk) yoksa her zaman kesin mi? *(Öneri: kesin olsun — bu oyunda başka hiçbir yerde "ödedin ama olmadı" yok, tek istisna tutarsız olurdu.)*
- **Mimari notu**: eşya kaydı şu an `{ key, nadirlik }` (bkz. `kusam.js`); seviye üçüncü bir alan olarak girecek ve `kusamBonuslari` onu çarpan olarak okuyacak. Bonus hesabı TEK yerde duruyor, orada çarpmak yeterli — iki yere yazmak bu projede defalarca patladı.

### 4. ~~ALTIN — gerçek para karşılığı~~ — CÜZDAN TARAFI **YAPILDI**
Kalanı: gerçek parayla satın alma (ödeme sağlayıcısı) ve altının
BONUS kullanımları (üretim bonusu, depo bonusu, binayı anında bitirme).
Aşağıdaki eski notlar o kısım için duruyor.

### 4b. ALTIN — kalan işler
- **Canlıya geçince kullanıcıya bir miktar altın verilecek** (İlkan'ın kararı).
- **Altın ↔ gümüş çevrilebilir.** *(Açık: kur ne? Tek yönlü mü çift yönlü mü? Çift yönlü ve sabit kurda, iki para birimi tek para birimine düşer — kur farkı ya da tek yön düşünülmeli.)*
- **Altınla 1'e 1 hammadde ticareti** — oyuncu altını hammaddeye çevirebiliyor. *(Açık: "1'e 1" hangi ölçek? 1 altın = 1 hammadde mi, yoksa 1 altın = 1 birim paket mi?)*
- Altının kullanım alanları: **üretim bonusu**, **depo bonusu**, **bina yapımını anında bitirme**. *(Açık: bonuslar ne kadar, ne kadar sürer, üst üste binebilir mi?)*
- **BİNAYA GEREK YOK**: kendi menüsü üst barda. Pazar binasından ayrı — pazar köyler arası hammadde ticareti, bu hesap düzeyinde bir cüzdan.

### 5. YAPILMADAN ÖNCE KARAR BEKLEYENLER
Bu sistem **satılan bir oyunun para ekonomisi**, o yüzden sayılar tahminle konulmamalı:
- Gümüş/altın kurları, taban fiyatlar, bonus oranları ve süreleri.
- Altın gerçek parayla mı alınacak (ödeme sağlayıcısı gerekir) yoksa yalnız hediye mi?
- Altın bonusları oyunu "öde-kazan" hâline getirmemeli; üretim/depo bonusu ile bina hızlandırma bu dengenin tam sınırında.

---

## 🔵 Küçük işler (17 Eylül 2026)

### ~~Grup mesajı gelince sayaç artmıyor~~ — **YAPILDI**

### ~~Birlik grup mesajlarına elçilikten de girilebilsin~~ — **YAPILDI**

<details><summary>Eski notlar</summary>

### Grup mesajı gelince sayaç artmıyor
- İlkan: *"grup mesajlarından gelen mesajlarda mesaj kısmında uyarı çıkmıyor."*
- Üst bardaki Mesajlar rozeti yalnız DOĞRUDAN mesajları sayıyor (`mesajOkunmamis`); grup mesajları sayılmıyor, yani gruba yazılan mesaj ekranda hiçbir iz bırakmıyor.
- Yapılacak: okunmamış grup mesajı sayısı da rozete eklenmeli. Veri zaten var — `gruplarim` her satırda `okunmamis` döndürüyor; toplamı oturuma yazıp `mesajOkunmamis` ile birlikte göstermek yeterli. Rozet iki sayının TOPLAMI olmalı, ayrı ikinci bir rozet oyuncuya iki yere bakmayı öğretirdi.

### Birlik grup mesajlarına elçilikten de girilebilsin
- İlkan: *"birlik içi grup mesajlarına elçilikten de girilebilir."*
- Şu an yalnız Mesajlar > GRUPLAR sekmesinden. Elçilikte birlik grubu varsa oradan da açılabilmeli — birliğin yazışması birliğin merkezinde dursun.
- Yapılacak: Elçilik panelinde beşinci bir sekme ya da ÜYELER sekmesinde "Birlik yazışması" kısayolu; mevcut `GroupMessages` bileşeni aynen kullanılır (yeni panel yazılmamalı — grup ekranı zaten tek kaynak).

</details>


---

## ✅ Tamamlandı

### NPC'ler hiç gelişmiyordu — üç kilit, aynı hata deseni (18 Eylül 2026)
- 2. aşamayı (NPC savaşı) ölçerken çıktı: **hiç sefer açılmıyordu.** Sebep savaş kodunda değildi — dünyada saldıracak ordu yoktu.
- **ÖLÇÜM (700 kayıtlı NPC köyü):** fırın **0** · değirmen **0** · keresteci/taşçı/tuğlacı/demirci **0** · ev 34 · kışla **2** · ordusu olan köy **1**. Buna karşılık ahır 496, cephane 420, silahçı 364 — yani askeri atölyeleri kurup içini hiç dolduramıyorlardı.
- **AYNI HATA DESENİ ÜÇ YERDE:** yapay zekâ bu binaları *yalnız YÜKSELTİYOR, hiç KURMUYORDU*. Hiç kurulmadığı için `buildingsOfType(...)[0]` her zaman undefined ve dal boşa dönüyordu.
  1. **Yiyecek zinciri.** Fırın yok → ekmek üretimi 0 → `foodShort` KALICI true → `tryMilitary` daha ilk satırda dönüyor, üstelik 120 ağırlıklı yiyecek dalı her turu kapatıyordu. Köy sonsuza kadar acil yiyecek kipinde kilitliydi.
  2. **İşleme zinciri.** Ham kaynaklar tavanda (1000) ama kereste 4, tuğla 5, yontma taş 12 — köy üretiyor, ürettiğini kullanamıyordu. Neredeyse her bina işlenmiş mal istiyor (kışla 60 kereste + 70 yontma taş), yani ev de kışla da alınamıyordu.
  3. **Sıra hatası.** İlk düzeltmeden sonra köyler zenginleşince değirmen HER TUR başarıyla yükseliyor ve `return true` fırına hiç sıra bırakmıyordu (19 değirmen, 11 fırın). Eksik halkayı kurmak, var olan halkayı büyütmekten önceliklidir: değirmeni Lvl 10 yapmak fırını olmayan köyü doyurmuyor.
- **ÖLÇÜLEN SONUÇ** (20 köy, 900 oyun saati):

  | | önce | sonra |
  |---|---|---|
  | ortalama nüfus | 150 | **1.840** |
  | fırın | 0 | 18/20 |
  | kışla | 0 | 18/20 |
  | ordusu olan köy | 0 | **15/20** |
  | ortanca ordu | 0 | **215** |

- **Yan etkisi: NPC yağması da dirildi.** `NPC_RAID_MIN_ARMY` 25 ve dünyada neredeyse hiçbir NPC'nin ordusu yoktu — "NPC'ler oyuncuya saldırır" özelliği açık görünüyor ama fiilen hiç çalışmıyordu.
- İşleme dalının ağırlığı 20 → 55: ekonominin kilidi orası ve düşük ağırlıkta tarla/depo dalları her turu kapıyordu.

### NPC'ler birbirine saldırıyor (18 Eylül 2026)
- İlkan: *"NPC'ler ... saldırsınlar ... yapay zekâ gibi yapılsınlar."* Bugüne kadar NPC yalnız OYUNCUYA saldırıyordu; aralarındaki dünya donuktu.
- Kodun eski notu *"NPC-NPC savaşı dengelenmiş ekonomiyi bozar"* diyordu ve endişe **haklıydı**. Çözüm savaşı hiç yapmamak değil, sınırlarını koymak — dört sınır:
  1. **AYRI BÜTÇE.** Oyuncuya giden yağma tek bir küresel sayaçla kısıtlı (`lastNpcRaidAt`: dünyada 6 oyun saatinde bir). NPC savaşı o sayacı kullanmıyor; kullansaydı NPC'ler birbirine saldırdıkça oyuncuya hiç yağma gelmez, yani bir özellik diğerini sessizce kapatırdı.
  2. **AYNI ANDA YOLDA OLAN SEFER TAVANI** (40). 700 NPC serbest bırakılırsa yüzlerce sefer aynı anda yolda olur; hem `processMarches` maliyeti hem de dünyanın okunabilirliği bundan zarar görür.
  3. **EZİLMİŞ KÖY FARM OLMUYOR.** Ordusu eşiğin altındaki köye saldırı yok, her hedefin kendi bekleme süresi var. Bu, aşamanın en kritik sınırı: aksi hâlde güçlü NPC zayıf komşusunu sonsuza kadar yağmalar, o köy toparlanamaz ve **dünya zamanla boşalırdı**.
  4. **YAĞMA, İŞGAL DEĞİL.** Kaynağın bir kısmı gidiyor, bina yıkılmıyor, köy yok olmuyor. Kazanan büyüyor, kaybeden fakirleşiyor ama ayakta kalıyor.
- **HEDEF KENDİNDEN ZAYIF OLAN**, en yakın komşu. Rastgele hedef, güçlü bir köyün kendinden güçlüsüne koşup ordusunu eritmesi demekti; yakınlık hem daha ucuz hem daha inandırıcı.
- **KARAR `game/npcSavas.js`'te, bağlantı `index.js`'te.** Kural index.js'te kalsaydı doğruluğunu ancak sunucuyu bir AI turu (100 dakika) izleyerek görebilirdim; ayrı modülde saniyede sınanıyor (`npc-savas.test.js`, 6 test).
- Doğrulandı: AI turu geçici olarak 3 tike indirilip ~9.000 çağrı koşturuldu, hata yok; sefer kaydı `[NPC SAVAŞ]` satırıyla görülüyor.

### NPC dünyası 700 köye çıktı, tohumlama açılışı bloke etmiyor (18 Eylül 2026)
- İlkan: *"çok daha fazla NPC köyü olsun."* 200'de 1.729 slotun %12'si doluydu; oyuncunun görüş alanında çoğu zaman hiçbir komşu yoktu.
- **ÖNCE ÖLÇÜLDÜ, SONRA SAYI KONULDU.** Dizüstünde 200 NPC → `stepVillage` 1.08 ms/tik, 800 NPC → 4.32 ms. Doğrusal. Pi 4'te (≈4 kat yavaş) 700 NPC ~15 ms, yani **%1,5 CPU**. AI turu (~69 ms) 100 dakikada bir koşuyor. CPU sınır değildi.
- **ASIL SINIR AÇILIŞ TOHUMLAMASIYDI.** Köy kurmak ~28 ms (dizüstü) / ~110 ms (Pi); 500 yeni köy Pi'de sunucuyu **bir dakika** kapalı tutardı ve bu her NPC artışında tekrarlanırdı. Tohumlama açılıştan çıkarıldı: kayıtlı köyler açılışta yükleniyor (ucuz), yeni slotlar `durum.js · tohumKuyrugu`'na giriyor ve dinleme başladıktan sonra tik başına 2 tanesi kuruluyor. **Ölçüldü: açılış 56 ms**, 500 köy ~4 dakikada tamamlanıyor. Dünya ilk dakikalarda seyrek başlıyor — kapalı bir sunucudan iyi.
- Bu aynı zamanda 3. aşamanın altyapısı: NPC'ler köy kurmaya başlayınca dünya çalışma anında büyüyecek ve aynı kuyruk kullanılacak.
- **%40 doluluk bilinçli.** Kalan %60 hem oyuncuların ikinci köylerine hem de NPC'lerin kuracağı köylere yer bırakıyor; `npc-dunya.test.js` bu cümleyi kilitliyor (doluluk %20–60 arasında kalmalı, doğuş halkası boş kalmalı).

### Uzak haritada oyuncu adları (17 Eylül 2026)
- İlkan: *"uzak harita modunda oyuncuların adı yazsın."*
- Etiket `scale > 0.72` ile kapalıydı ve açıkken KÖY ADINI yazıyordu. Uzaklaşınca sorulan soru değişiyor — yakında "bu köy hangisi", uzakta "burası kimin" — ve dünya görünümünde köy adları o işi hiç yapmıyordu.
- **Aynı satır zoom'a göre cevabını değiştiriyor:** yakında `v.name`, uzakta `v.owner`. İki ayrı etiketi üst üste yazmak haritayı kalabalıklaştırırdı.
- **Uzakta yalnız oyuncu köyleri etiketleniyor.** NPC'nin sahibi yok ve dünyada yüzlercesi var; hepsini yazmak haritayı okunmaz yapardı. NPC'nin ne olduğu rengi ve kademe halkasından okunuyor.
- **Yazı boyu düzeltildi.** Eski etiketteki `8 / max(0.5, scale)` kelepçesi 0.5'in altında yazıyı ekranda KÜÇÜLTÜYORDU (dünya zoom'unda 0.3 → 4.8 px), yani tam gereken yerde okunmuyordu. Sahip etiketi `/ scale` ile ölçekleniyor, ekrandaki boyu her zoom'da sabit; koyu kontur ile arazinin üstünde okunuyor.

### Mobilde sayfa sağa kayıyordu (17 Eylül 2026)
- İlkan: *"mobilde sıralama ekranına girince sağa kayıyor."*
- **ÖLÇÜLDÜ** (375 px ekran): `#root`'un `scrollWidth`'i 548, `scrollLeft`'i 94 — bütün sayfa 94 px sağa kaymıştı.
- **İKİ KUSUR ÜST ÜSTE:** (1) üst bar telefona sığmıyor — sağdaki küme (nüfus · kese · müzik · ayarlar · profil · çıkış) 340 px, marka + köy değiştirici 149 px, toplam 489 px; geliştirme menüsü hariç ölçüldü, yani yayındaki derlemede de böyle. (2) `overflow-x: hidden` bir KAYDIRMA KABI yaratıyor — kullanıcının sürmesini engeller ama tarayıcının kaydırmasını engellemez. Alt sekmedeki son düğmeye basınca tarayıcı onu görünür kılmak için en yakın kaydırılabilir kabı, yani sayfanın kendisini sürüyordu. Sıralama ekranıyla ilgisi yoktu; o düğme sadece şeridin en sağındaydı.
- **DÜZELTME:** `#root` yatayda `clip` (kaydırma kabı yaratmıyor, dolayısıyla `scrollIntoView` de bir şey kaydıramıyor; dikey kaydırma etkilenmiyor) + üst barın sağ kümesi telefonda daralıyor ve sığmazsa kendi içinde kayıyor. Kırpma tek başına olsaydı taşan düğmeler erişilemez kalırdı.
- Doğrulandı: kök `scrollWidth` 548 → 375, `scrollLeft` 0, masaüstü etkilenmiyor.

### Ordu dengesi: süvari kışlayı anlamsız kılıyordu (17 Eylül 2026)
- İlkan: *"bu dediğin doğruysa oyunda dengesizlik var. Hem kışla hem ahır full olmalı; senin bahsettiğin senaryoda diğer birimlere hiç gerek yok."* Haklıydı, ölçüm doğruladı.
- **ÖLÇÜLEN DENGESİZLİK** (ekipman Lvl 20): Jernridder en iyi piyadeyi HER BAŞLIKTA yeniyordu — saldırı 124.8'e 107.3, yaya savunma 124.0'a 92.0, hız 7'ye 3, taşıma 85'e 35 — ve **aynı silahçı + zırhçı yükünü** kullanıyordu. Tek farkı 2 ekmekti.
- **KÖK SEBEP ATIN SÜRESİYDİ, GÜCÜ DEĞİL.** Köyde silahçı, zırhçı ve ahırın üçü de Lvl 20'de 60 işçi alıyor ve PARALEL çalışıyor. Piyade üç atölyeden ikisini, süvari üçünü kullanıyor; atölyeler paralel olduğu için at, boşta duran bir fabrikayı açmaktan ibaretti — 4 saatti, kılıçla aynı, yani zaman olarak bedava.
- **DÜZELTME: at 4 → 8 saat.** Denge kendiliğinden kuruluyor: 8 saatte ahır 1 at, silahçı 2 kılıç, zırhçı 4 parça üretiyor = **1 Jernridder + 1 Ulv Savaşçısı**, üç atölye de tam dolu. Saf süvari 15.6 saldırı/atölye-saati, karışık ordu **29**. Yani karışmak artık bir tercih değil, açık ara doğru olan.
- **Güce dokunulmadı.** Süvariyi zayıflatmak da bir çözümdü ama o zaman at takmanın anlamı kalmazdı; bedel üretim hızına konuldu. Mevcut ordular etkilenmiyor, ekmek dengesi de değişmiyor (İlkan'ın köyü zaten ekmek eksisinde).
- **Elenen seçenekler:** (a) eğitilmiş atların da tahıl yemesi — mevcut orduyu aç bırakırdı; (b) süvarinin 2 boş işçi tüketmesi — asker basmayı yeniden zorlaştırırdı.
- Test: `ordu-dengesi.test.js` — at kılıçtan uzun mu, karışık ordu saf ordulardan iyi mi, 1:1 karışımda üç atölye eşit yüklü mü, süvari hâlâ en güçlü asker mi.

### Kahramanın ganimet payı + rapor sadeleşmesi + simülatör "ters çevir" (17 Eylül 2026)
- **KAHRAMAN GANİMET TAŞIMIYORDU.** Sefere katılıyor, savaşıyor, yara alıyordu ama `carryCapacity` yalnız birimleri sayıyordu — kahraman tek bir odun taşımıyordu. Kahraman katmanının kalan son eksiğiydi.
  - **Sayı uydurulmadı, birim tanımlarından türetildi.** Hızda İlkan'ın kuralı *"kahramana at verince normal birimler attan ne bonus alıyorsa alsın"*dı; taşıma aynı cümlenin devamı: yaya ≈46 (ortalama piyade), atlı ≈96 (ortalama süvari). Sabit yazsaydık birim kapasiteleri dengelenirken kahraman sessizce ayrışırdı.
  - **Seviyeyle büyümüyor** — hız da büyümüyor. Seviyeye bağlasaydık ganimet, savaş gücünün yanında ikinci bir seviye ödülü olurdu.
  - **Bayılan kahraman taşımıyor.** Bunu yazarken bir SIRA hatası çıktı ve test yakaladı: `march.kahramanSonuc` ganimetten SONRA hesaplanıyordu, yani "bayıldı mı" sorusunun cevabı sorulduğunda henüz yoktu. Kahramanın hesabı ganimete hiçbir şey borçlu olmadığı için yukarı taşındı.
- **RAPORDA PORTRE YERİNE ARMA** (İlkan: *"raporlara artık resim koyma, askerlerin simgelerini koy; ama üzerlerine gelince resim ve isim çıksın"*). 44×60'lık portreler sekiz birimlik bir savaşta raporu albüme çeviriyordu. Kart `createPortal` ile body'ye çiziliyor: ölçüldü, `position: fixed` transform'lu bir üst kutunun içinde viewport'a göre konumlanmıyor (hesaplanan `left` 650 iken ekrandaki yer 1197 çıktı). Fareli cihazda hover, dokunmatikte tıklama — ikisini birden bağlamak işe yaramıyor (mouseenter açıyor, click hemen kapatıyor).
- **"NE VARDI, NE KALDI" İKİ TARAF İÇİN.** Kalan türetiliyor, kaydedilmiyor: üçüncü bir alan tutmak kayıp hesabı değiştiğinde ayrışırdı. Savunanın raporuna kendi ordusu da yazılıyor artık (`defenderUnits`) — "oyuncu zaten biliyor" diye yazılmıyordu ama o andaki ordu artık yok ve misafir takviyeler de oradaydı.
- **SİMÜLATÖRDE TERS ÇEVİR.** Savaş simetrik değil (piyade/süvari savunması ayrı, sur bonusu yalnız savunanda), yani "bana saldıran bu orduya ben saldırsam" sorusu ancak rolleri değiştirerek cevaplanıyor. Savunma yapıları yerinde kalıyor: köye ait, orduya değil.

### Savaş simülatörü: kule girdisi, birim armaları, rapordan açılma (17 Eylül 2026)
- İlkan: *"birim amblemlerini savaş simülatöründe de göster ve simülatöre kale/kule/hendek de ekle. Bir de savaş ya da casus raporlarına direkt simülatöre git tuşu ekle — simülatör rapordaki asker sayılarıyla açılsın."*
- **KULE SUNUCUDA VARDI, ARAYÜZDE YOKTU.** `simulate_battle` `kulePct` parametresini kabul ediyordu ama simülatör onu hiç göndermiyordu; altı kulesi olan bir köyü simüle eden oyuncu kulesiz bir sonuç görüyordu. Sur ve hendek zaten vardı.
- **KULE KUTUSU BİR YÜZDE, SEVİYE DEĞİL.** Önce seviye seçici yaptım; rapordan gelen savaşta ekranda "KULE 20 · %115" çıktı — kendisiyle çelişen bir çift. Sebep: savaş raporu sur/hendek SEVİYESİNİ saklamıyor, yalnız toplam `wallBonusPct` var (combat.js'te sur + hendek + kule toplamı). Toplamı bir seviyeye çevirmek uydurma olurdu; kutu artık ne olduğunu dürüstçe söylüyor ve sunucunun aldığı sayının aynısını taşıyor.
- **RAPORDAN AÇILMA — üç ayrı eşleme** (`ReportScreen · simKurulumu`): saldırımda iki ordu da yazılı (`sent` + `theirSent`), savaş birebir tekrar oynatılabiliyor; bana gelen saldırıda yalnız saldıran ordu yazılı (savunanın kendi listesi rapora girmiyor), savunmayı oyuncu "ORDUMU YÜKLE" ile dolduruyor; keşifte görülen ordu ve sur/hendek/kule doğrudan geliyor. Simüle edilecek sayı yoksa tuş HİÇ çizilmiyor — boş simülatör açan bir düğme yalan söylerdi.
- **GEÇİŞ KİMLİKLE, ETKİYLE DEĞİL.** İlk yazımda kurulum bir `useEffect` ile durumlara kopyalanıyordu; lint haklı olarak "etki içinde setState" dedi. Simülatör artık `key={kurulum.id}` ile çiziliyor, yani yeni rapor = yeni bileşen ve durumlar doğrudan kurulumla başlıyor.
- Birim armaları simülatör listesine ve kategori başlıklarına eklendi.

### Sığınak — yağmadan kaçırılan hammadde (17 Eylül 2026)
- İlkan: *"hammaddeleri saklamak için sığınak yapılacak bina."* Travian'daki Cranny.
- **NEDEN GEREKLİYDİ:** çevrimdışı oyuncu üst üste yağmalanınca sıfırlanıyor ve oyuna dönecek kaynağı kalmıyordu. Satılan bir oyunda "bir gün giremedim, her şeyim gitti" en hızlı bırakma sebebi.
- **KURAL TEK DOSYADA** (`server/game/siginak.js`). Üç okuyucusu var — yağma hesabı, keşif raporu ve arayüzdeki canlı sayı — ve üçü de aynı cümleyi okuyor. Arayüz kendi hesabını yapsaydı denge ayarında ekran bir şey yazar, yağma başka bir şey uygulardı (bu depodaki en sık tekrarlayan hata sınıfı).
- **Kilitlenen kararlar:**
  - *Her kaynak için AYRI, aynı miktar.* Tek havuz olsaydı yalnız tahılı yağmalanan oyuncu bütün korumasını orada harcar, döndüğünde bina yapacak kereste bulamazdı. Ayrı olunca HER kaynaktan bir taban ile dönüyor — "yeniden başlayabilir" garantisi ancak böyle veriliyor.
  - *İşlenmiş mallar da gizleniyor.* Yalnız ham korunsaydı saldırgan değerli yarıyı (kereste, tuğla, külçe) tam olarak sıyırırdı.
  - *Tek sığınak* (`unique`, `repeatableWhenMaxed` yok). Travian'da birden fazla kurulabiliyor ve yağmayı tamamen öldürüyor.
  - *Kapasite doğrusal:* 200 + 150/seviye → Lvl 20'de kaynak başına 3.050. Depolarla aynı dil; katlanan bir eğri geç oyunda hazineyi dokunulmaz yapardı.
  - *İstihbarat sızdırmıyor:* ne saldırgan raporu ne keşif gizleneni gösteriyor. Aksi hâlde saldırgan keşifle yağmayı karşılaştırıp seviyeyi çıkarır, savunmayı gizleyen bina savunmayı ele veren binaya dönerdi.
  - *Sıra: önce gizleme, sonra baskın payı.* Tersi olsaydı sığınak baskında yarı yarıya korurdu — oyuncuya "her kaynaktan 200 gizli" dedik, %50'si değil.
- Mancınık zaten yıkabiliyor: `kusatma.js · vurulabilirler` sur ve hendek dışındaki her yapıyı hedefliyor, yani ayrı bir kod gerekmedi. `tick.js` depo tavanını `def.stores` üzerinden hesapladığı için sığınağın `baseCapacity`'si yanlışlıkla depo kapasitesine eklenmiyor.
- Testler: `siginak.test.js` (8) — yağma, baskın sırası, ham/işlenmiş eşitliği, stok gizlenenden azken eksiye düşmeme, yıkılınca korumanın bitmesi, keşif raporu.

### Amblem tutarlılığı, yuvarlak kalkan, kart şeridi çakışması (17 Eylül 2026)
- İlkan: *"hâlâ yarısı farklı yarısı farklı amblem, bir de kalkan tam yuvarlak olmamış ve biraz küçük olmuş simgeler, biraz büyüt"* ve *"iç içe girmiş görseller var, telefonda da böyle."*
- **AMBLEM KARARI ÇAĞRI YERLERİNE DAĞILMIŞTI.** `Amblem` amblemi olmayan anahtar için `null` dönüyordu ve yedeği çağıran taraf düşünecekti; kimi düşündü kimi düşünmedi. Üstelik kuyrukta ve ordu listelerinde birimin KENDİ arması değil kategorisine göre genel bir "at"/"kalkan" ikonu çiziliyordu — aynı asker bir ekranda arması, öbüründe jenerik bir kalkan oluyordu. `Amblem` artık yedeğe kendi düşüyor; yeni bir amblem eklemek için dosyayı klasöre atmak yetiyor (`import.meta.glob`), hiçbir çağrı yeri değişmiyor.
- Çevrilen yerler: kuyruk satırı (`queueUI`), kışla kuyruğu (`UnitTrainingPanel`), silahçı yükseltmeleri (`EquipmentUpgradePanel`), ordu miktar seçici ve birim rozetleri (`ArmyPanel`), birim kartı ekipmanları (`UnitDetail`), sağ şeritteki ekipman havuzu (`StatusRail`). Boyutlar 10–16 px'ten 15–24 px'e.
- **KALKAN SİLUETİ ELİPSTİ.** Ölçüldü: alfa sınır kutusu 116×92 (en/boy 1.26). `contain` maskesi kare kutuya çizdiği için ekranda basık duruyordu. Yüksek çözünürlüklü kaynak (`amblems/yedek/`) işe yaramadı — o hâlâ arka planlı ham çizim, siluet değil. Düzeltme mevcut siluet üzerinde: içerik dikeyde gerilip 120×120 kareye oturtuldu. İçerideki perçinler de gerildi ama 15–22 pikselde görünmüyor.
- **KART ŞERİDİNDE İKİ AYRI SEBEP, AYNI GÖRÜNTÜ:** (1) kategori düğmelerinde `flexShrink` kapatılmamıştı, tarayıcı yatay kaydırmaya başvurmadan önce düğmeleri doğal genişliğinin altına eziyordu ve `nowrap` yazıyı komşunun üstüne taşıyordu (ölçüldü: "HEPSİ" 70 px yerine 36 px); (2) görünüm anahtarı için ayrılan 78 px, anahtarın gerçek 107 px'inden dardı ve anahtar dar ekranda iki satıra sarıyordu. Genişlik artık tek sabit (`GORUNUM_ANAHTARI_W`), iki taraf da onu okuyor.

### Rapor arşivi: sayfalama, sunucu tarafı süzme, mobil akordeon (17 Eylül 2026)
- İlkan: *"raporlar sadece 25 tane gözüküyor. İlk ekranda ekrana sığacak kadar gözüksün, kalanını sayfa sayfa ilerleyecek şekilde aşağıya koy, bütün raporlar saklanmalı. Ayrıca mobilde rapora tıklayınca bilgiler raporun hemen altında çıkmalı — aşağı ok gibi bir genişlet tuşu. Aksi hâlde raporu seçip sayfanın en aşağısına gitmek zorunda kalıyorum."* ve *"raporlarda düşen itemin görselini daha da büyüt."*
- **RAPORLAR GERÇEKTEN SİLİNİYORDU.** Köy başına tavan 40'tı (`army.js · MAX_REPORTS`) ve pakete yalnız 25'i giriyordu; yani 25 sınırı bir görüntüleme sınırı değildi, üstündeki raporlar **yoktu**. Tavan **250**'ye çıktı, paket bir SAYFA taşıyor (15), gerisi `rapor_sayfa` olayıyla isteniyor. Bütün raporları her pakete koymak yüz kilobaytı durmadan yollamak olurdu; hiç koymamak ekranın boş açılması demekti.
- **SÜZME VE SAYIM SUNUCUYA TAŞINDI** (`server/game/raporTur.js`). İlk yazımda süzme istemcide kalmıştı ve sayfalamayla birlikte yalan söylemeye başladı: rozetler elde duran 15 raporu sayıyor (200 raporluk hesapta "HEPSİ 15"), "kaç sayfa var" hesabı da süzülmemiş toplamdan çıkıyordu — KEŞİFLER sekmesinde 14 sayfa görünüp 13'ü boş çıkıyordu. Artık sunucu ÖNCE süzüyor SONRA dilimliyor.
- **KURAL TEK YERDE.** Hangi sonucun keşif sayıldığı iki yere yazılmadı: sunucu her rapora `kesif` bayrağını iliştiriyor (kaydetmiyor, `outcome`'dan türetiyor — eski raporlar da doğru), istemci o bayrağı okuyor. Bu depodaki tekrarlayan hata sınıfı tam olarak buydu.
- **MOBİLDE AKORDEON.** Liste ve ayrıntı iki ayrı kutuydu, dar ekranda alt alta diziliyordu. Artık ayrıntı tıklanan satırın altında açılıyor, satırda dönen bir ▾ oku hangisinin açık olduğunu gösteriyor, ikinci dokunuş kapatıyor. Masaüstünde iki sütun kaldı — orada kaydırma zaten gerekmiyor, akordeon listeyi boşuna uzatırdı.
- Maceradan düşen eşyanın görseli **42 → 76 px**.
- `App.jsx` bağlantısı da bu işte kuruldu: sayfalama props'ları (`socket`, `toplam`, `sayfaBoyu`, `sayilar`) hiç bağlanmamıştı, yani sayfalayıcı tarayıcıda hiç çizilmiyordu.
- Testler: `rapor-filtre.test.js` (kural) + `rapor-sayfa-uctan.test.js` (paket alanları null gelmiyor mu, olay cevap veriyor mu, filtre yankılanıyor mu, sınır aşımı sunucuyu düşürüyor mu).

### Nüfus darboğazı: asker basacak adam yoktu (17 Eylül 2026)
- İlkan: *"nüfus çoğalma hızını ve limitini acil arttır. Dünya kadar kılıcım var ama adam yokluğundan asker basamıyorum."*
- **ASIL DARBOĞAZ TAVAN DEĞİL, BOŞ İŞÇİ TAMPONUYDU.** Ölçüldü (6 ev Lvl 5, Lvl 20 ana bina, 18 tarla Lvl 20): nüfus tavanı **4.550**, işçi kapasitesi 906, ama boş işçi tamponu **111**. Köy dört bin beş yüz kişi taşıyabildiği hâlde boşta 111 kişi birikince büyüme TAMAMEN duruyordu. Asker eğitimi boş işçi tükettiği için bin asker basmak 111'erlik dokuz dalga beklemek demekti — elindeki kılıç yığını tam bu yüzden işe yaramıyordu. İlkan tavanı sorun sanmıştı; ölçüm başka yeri gösterdi.
- **FRENİ GEVŞETMEK GÜVENLİ, ÇÜNKÜ ASIL FREN TAHIL.** Siviller de yiyecek tüketiyor (`tick.js · getConsumptionRates`), yani nüfusu büyütmek tahıl faturasını da büyütüyor ve gerçek tavan zaten ekonomide. Tampon **tamamen kaldırılmadı**: tamponsuz bir köy bir gecede on binlerce boş sivil biriktirip aç kalır ve oyuncu neden köylü kaybettiğini anlamazdı.
- Yeni değerler ve ölçümleri (aynı köy):
  - boş işçi tamponu **20 + %10 → 100 + %40** · 111 → **462**
  - büyüme hızı **1 + (lv−1)×2 → 3 + (lv−1)×4** · Lvl 20'de 39 → **79 kişi/oyun saati**
  - ev başına kişi **150 → 250**, evsiz taban **50 → 150** · tavan 4.550 → **7.650**
  - yeni köy (tek ev Lvl 1, Lvl 3 ana bina): tavan 400 · hız 11 · tampon 108
- İstemcideki ikiz değerler (`client/src/data/villageDefs.js`) birlikte güncellendi; `tanim-ikizleri.test.js` ikisini karşılaştırıyor.

### Yükseltilen eşya kuşanınca seviyesini kaybediyordu (17 Eylül 2026)
- İlkan: *"bir itemi lvl atlatıp giyip çıkardığımda lvl'i kayboluyor."*
- **ALAN LİSTESİ YERİNE NESNENİN KENDİSİ.** `kusan` slota yeni bir nesne yazıyordu: `{ key: giris.key, nadirlik: giris.nadirlik }`. Yani envanter girdisinin yalnız İKİ alanı taşınıyordu; seviye alanı sonradan eklendiği için burada sessizce düşüyordu. Oyuncu gümüş ödeyip yükselttiği eşyayı bir kez kuşanınca Lvl 1'e dönüyordu — geri alınamaz bir kayıp.
- Alanları tek tek saymak, eşyaya her yeni alan eklendiğinde burayı güncellemeyi gerektiren gizli bir bakım borcuydu; nitekim ilk eklemede unutuldu. Artık `{ ...giris }`.
- Kilit: iki test — seviye kuşanıp çıkarınca korunuyor VE kuşanılan eşyanın bonusu seviyesiyle büyüyor. İkisi ayrı şey: alanın korunması ve o alanın hesaba girmesi.

### İki yeni eşya ve sikke görselleri (17 Eylül 2026)
- İlkan dört görsel verdi: *"4 yeni item. Coinleri üst menüde ve macerada bulursa büyük resim olarak raporda göster. Diğeri biri canını arttıran potion, bunu da ekle oyuna. Diğeri de skilleri sıfırlamana yarayan kitap, onu da maceradan düşecek gibi ayarla. Artık skill sıfırlama sadece bu kitapla."*
- **CAN İKSİRİ** canı DOLDURUYOR, tavanı büyütmüyor. Tavanı kalıcı büyütseydi sınırsız birikebilen bir istatistik olurdu ve yeterince macera yapan kahraman ölümsüzleşirdi. Ölü kahramana işlemiyor — o diriltme iksirinin işi; ikisi aynı şeyi yapsaydı diriltme iksirinin nadirliği anlamsız kalırdı. **Tam dolu canda reddediliyor**: nadir bir eşyayı karşılıksız yakmak, yanlışlıkla basmakla olacak en sinir bozucu şey olurdu.
- **BİLGELİK KİTABI skil sıfırlamanın TEK yolu.** Hammadde ödeme yolu kaldırıldı. Bedel her seferinde katlanıyordu ama istismara yalnız FİYATLA direniyordu: kaynağı bol oyuncu için sınır yoktu. Artık sınır **bulunurluk** — kitap maceradan ~34 uzun macerada bir düşüyor (ölçüldü).
- **KURA SABİT ANAHTAR YAZIYORDU** ve iki yeni eşya tanımlı olmalarına rağmen maceradan HİÇ düşmüyordu. Testle yakalandı; havuz ağırlıklı hâle getirildi (diriltme 35 · can iksiri 40 · kitap 25). Kitap en seyrek olan: bollaşırsa istismar fiyatsız hâlde geri gelir.
- **ÇANTADA HER SARF MALZEMESİNİN KENDİ DÜĞMESİ VAR.** Tek bir "KULLAN" düğmesi hepsini diriltme iksiri sanıyordu; iki yeni eşya eklenince o düğme ölü kahraman beklemeye devam eder ve ikisi hiç kullanılamazdı. Artık DİRİLT · CANI DOLDUR · SKİLLERİ SIFIRLA, her biri kendi koşuluyla ve kapalıyken sebebiyle.
- **SİKKE GÖRSELLERİ** (`paraArt.js`): üst bardaki kese rozeti, kese penceresi, açık artırma ve macera raporu aynı iki resmi kullanıyor. Çizgi ikon iki parayı yalnız RENKLE ayırıyordu; renk oyunun her yerinde başka anlamlar taşıyor (nadirlik, ilişki, uyarı) ve renk körü bir oyuncu için ikisi aynı daireydi.
- **TEST menüsüne "Altın ve gümüş ver"** eklendi (İlkan'ın isteği): açık artırmayı ve yükseltmeyi denemek için macera turu beklemeye gerek kalmasın.
- Kilit: `kullanilabilir-esya.test.js` — 7 test. En önemlisi "sıfırlamanın hammadde yolu kapalı" ve "maceradan düşüyorlar" (bu projede "sabit tanımlı ama hiç okunmuyor" hatası daha önce yaşandı).
- **TARAYICIDA DOĞRULANDI**: TEST düğmesi bakiyeyi 625→50.625 gümüş / 99→599 altın yaptı; iki sikke görseli üst barda yüklendi; kitap yokken SIFIRLA kapalı ve sebebi yazıyordu; kitap düşünce satırında "SKİLLERİ SIFIRLA" çıktı, basınca 400 puan geri geldi ve kitap tükendi.

### Ödüller dünyanın yaşına göre (17 Eylül 2026)
- İlkan: *"bulunan hammaddelerde serverın zamanına göre olmalı, oyun başlayalı ne kadar olmuş gibi bir hesaptan yapılmalı. Item lvl'leri de yine server zamanına göre hesaplansın: ilk ay Lvl 1'ler, ikinci ay Lvl 2'ler düşmeye başlasın gibi."* ve *"oyun zamanına göre — oyun 1× ise gerçekten 1 ay, 10× ise 3 gün."*
- **ÖLÇÜ OYUN ZAMANI, GERÇEK ZAMAN DEĞİL.** Bu ayrım kuralın tamamı: gerçek zamanı ölçseydik 10× bir sunucuda oyuncular her şeyi on kat hızlı yaşarken eşya kademesi takvimi bekler, dünya olgunlaşmışken hâlâ Lvl 1 eşya düşerdi. Oyun zamanı hız çarpanını zaten içinde taşıyor.
- **ÇIPA İÇİN YENİ TABLO AÇILMADI.** Dünyanın yaşı = *en eski köyün sanal saati − ilk hesabın açılış anı*. `village.clockMs` kuruluşta `Date.now()` ile başlıyor ve sonra YALNIZ oyun zamanıyla ilerliyor, yani birikim saatin kendisinde duruyor — **hız değişse bile doğru**. Ayrı bir "dünya kuruldu" kaydı hem iki veritabanı sürümünde ikiz bakım hem de yaşayan dünyada "bugün kuruldu" diyen yanlış bir değer demekti.
- **EŞYA KADEMESİ**: tavan = 1 + tam ay, eşyanın kendi sınırına (5) kadar. Kura **alt seviyelere ağırlıklı** (karesi alınmış zar): düz kura olsaydı tavanın açıldığı gün eşyaların beşte biri anında en üst seviyede düşer ve yükseltme diye bir iş kalmazdı.
- **HAMMADDE**: ay başına +1 kat, tavan 12. Katlanan büyüme birkaç ay sonra macerayı ekonominin tamamı yapardı; doğrusal artış üretimin kendi büyümesiyle aynı mertebede kalıyor.
- **İKSİRİN SEVİYESİ OLMAZ** — kuşanılmayan eşyanın büyüyecek bonusu yok.
- Kilit: `dunya-yasi.test.js` — 6 test. En önemlisi "10× dünyada bir ay üç gerçek gün eder" ve "macera ödülü dünyanın yaşını GERÇEKTEN kullanıyor" (bu projede "sabit tanımlı ama hiç okunmuyor" hatası daha önce yaşandı).

### Macera raporunda amblemler tekleşti (17 Eylül 2026)
- İlkan (ekran görüntüsüyle): *"macerada ne aldığını amblemi pazardaki amblemler ve renkler olsun, her yerde aynı amblemler kullanılsın. İtemlerde büyük resmi gösterebilirsin."*
- Ekran üç sorunu birden gösteriyordu: **gümüş ödülü adsız bir sayı** olarak çıkıyordu (gümüş eklenirken bu ekran güncellenmemişti), **bütün hammaddeler aynı "depo" ikonundaydı** (oysa kaynak rayı, pazar ve depo her kaynağın kendi amblemini ve rengini kullanıyor), **eşya yalnız bir miğfer çizgisiydi** (oysa üretilmiş görseli var ve kuşam ekranında zaten kullanılıyor).
- Hepsi TEK KAYNAKTAN çözüldü: renk `theme · RES_COLOR`, amblem `Icon` (kaynak anahtarı ikon adıyla aynı), eşya resmi `ITEM_IMAGE`, nadirlik rengi sunucudan (açık artırma satırıyla aynı gerekçe). Bu ekrana özel bir palet yazmak dördüncü bir tanım olurdu.
- **TARAYICIDA DOĞRULANDI**: "Gümüş +79" kendi sikkesiyle, "Demir +3049" kendi amblemi ve rengiyle, "Ustaişi Diriltme İksiri" büyük resmiyle ve nadirlik renginde çerçeveyle göründü.

### Savaş ve macera düzeltmeleri (17 Eylül 2026)
Dört ayrı bildirim, hepsi ölçülerek doğrulandı ve uçtan uca testle kilitlendi.

- **KAHRAMANIN SAVAŞ HASARI BAŞTAN YAZILDI.** İki bildirim art arda geldi: *"normal köye saldırdığımda kahramanın da canı düşmeli"* ve *"canının ne kadar düşeceği üzerindeki zırha ve karşılaştığı ordu ile kendi yanındaki ordunun gücüne bağlı; gönderdiğim ordu tamamen öldüyse kahraman kolay kolay canlı çıkamaz."*
  - **ESKİ EĞRİ İKİ UÇTA DA YANLIŞTI.** Hasar = kayıp oranı × SABİT 70. Ezici zaferde oran sıfıra yuvarlanıyor, kahraman hiç yıpranmıyordu (sefere katmak bedavaydı); ordunun tamamı kırıldığında ise 1.090 canlı kahraman için 70 hasar, yani canının %6'sı — ordusu yok olan kahraman sapasağlam dönüyordu.
  - **YENİ EĞRİ**: `hasar = canTavani × (0,05 + 1,75 × kayipOrani^1,5)`. Hasar CAN TAVANININ YÜZDESİ (sabit sayı aynı savaşta yeni kahramanı öldürür, yüksek seviyeliyi çizmezdi). **Kayıp oranı zaten iki ordunun güç oranı** (`attackerLossRate`: kazanınca (savunma/saldırı)^K, kaybedince 1) — ayrı bir güç hesabı yazmak aynı şeyi ikinci kez tanımlamak olurdu. **Üs 1,5** çünkü doğrusal eğride rutin yağma da kahramanın canından ciddi pay alıyordu; üs eğriyi düşük kayıplarda yatırıp yüksek kayıplarda dikleştiriyor.
  - **ORDU YOK OLUNCA HASAR CAN TAVANININ 1,8 KATI**: zırhsız kahraman ölür, **tam zırhlı (%50 tavan) canının onda biriyle çıkar**. "Kolay kolay canlı çıkamaz" tarifi tam bu — imkânsız değil, ama ancak tam zırhla. Zırh yatırımı tam olarak bu anda karşılığını veriyor.
  - **ZIRHIN ETKİSİ RAPORDA GÖRÜNÜYOR.** Rapor HAM hasarı yazıyordu; oyuncu zırhının işe yarayıp yaramadığını hiçbir yerde göremiyordu (macera raporunda bu ayrım vardı, savaşta yoktu). Rapor savaş anında kuruluyor ama hasar sonra uygulanıyor, o yüzden uygulamadan sonra düzeltiliyor ve ham değer de bırakılıyor — fark ancak ikisi yan yanayken okunuyor.
  - **Savunmasız köye girmek savaş sayılmıyor** — orada hasar da yok. Ölçüm (1.090 canlı, zırhsız): kayıp %2 → 60 hasar · %10 → 115 · %30 → 368 · %50 → 729 · %100 → 1962 (ölüm).
- **KAHRAMAN ORDUSUNDAN ÖNCE EVE DÖNÜYORDU.** İlkan: *"kahraman başka köye saldırdı, geri geliyor; daha gelmeden maceraya yolladım. Yollayamamam lazım."* Savaş biter bitmez "üssünde" sayılıyordu, yani seferin dönüş ayağı kahraman için hiç yoktu ve uzaklık kahramanın maliyetine girmiyordu. Artık sefer eve varınca serbest kalıyor — **ikinci bir sayaç yok**, seferin kendi zamanı kullanılıyor. XP ve hasar yine savaş anında işleniyor: sonuç savaşta belli oluyor, dönüş yolu onu değiştirmiyor.
- **RAPOR KARŞI TARAFIN ORDUSUNU GÖSTERMİYORDU.** İlkan: *"raporda karşı tarafın kaç askeri vardı onu göremiyorum."* Yalnız KAYIPLARI yazıyorduk; savunan kazandıysa kaybı küçük olur ve oyuncu neye çarptığını hiç öğrenemezdi. "40 öldürdüm" tek başına anlamsız — 40/45 ile 40/900 tamamen farklı iki savaş. Rapora `theirSent` eklendi (misafirler dahil, köyü savunan her şey tek orduydu) ve özet satırı artık "kaçta kaç" yazıyor. İstihbarat sızıntısı değil: onunla çarpıştın, ne olduğunu gördün.
- **MACERADAN GELEN ASKER DÜNYAYLA BÜYÜMÜYORDU.** İlkan: *"5k askerim var, maceradan 1 asker bulup getiriyor."* Ödül sabitti (kısa 1-3, uzun 1-6): ilk günde hediye, olgun dünyada gürültü — üç ödül kanalından biri ölü doğmuştu. Artık **dünyanın ORTALAMA ordusuna** göre ölçekleniyor (kısa %0,4 · uzun %1,2, ±%40 dalgalanma, taban 1/2). **Kendi ordusuna bağlanmadı**: bileşik bir döngü kurar, çok askeri olan daha çok bulur ve fark her maceradan sonra açılırdı. Ortalama 60 sn önbellekli — her macera bitişinde bütün oturumları taramak gereksiz. Ölçüm: ortalama 5.000 iken uzun macera ~60 asker getiriyor (eskiden 1-6).
- Kilit: `kahraman-savas.test.js` (+3 kural testi), `kahraman-savas-hasar-uctan.test.js` (3 uçtan uca: can düşüyor · rapor orduyu yazıyor · yoldaki kahraman maceraya çıkamıyor), `macera.test.js` (+3).

### Açık artırma ve eşya seviyeleri (17 Eylül 2026)
- İlkan: *"kahramanlar itemlerini satabilmeli gümüş karşılığında… itemlerin min tutarları olsun, kimse almasa bile açık artırma bitince o parayı kullanıcı alsın, item NPC'ye satılmış olsun. her satış 24 saat açık artırmada dursun, fazla parayı veren alsın."* ve *"itemlerin de lvl'leri 5 lvl arttırılabilecek."*
- **TABAN FİYATI SİSTEM KOYUYOR, satıcı değil.** Satıcı tabanı kendi yazsaydı ve teklif gelmeyince NPC o tabanı ödeseydi herkes tabana milyon yazıp bedava para basardı. Taban eşyadan türüyor (nadirlik² × seviye).
- **SÜRE 24 GERÇEK SAAT**, oyun saati değil. Dünya 10× hızda: 24 oyun saati 2,4 gerçek saat eder ve günde bir giren oyuncu hiçbir ilanı göremezdi. Açık artırma bir pazar; insanların görebildiği bir saatte durmalı. Travian da hız sunucularında 24 gerçek saat kullanıyor.
- **TEKLİFTE GÜMÜŞ BLOKE**, geçilince ANINDA iade. Blokaj olmasaydı aynı gümüşle on açık artırma kazanılır, dokuzu karşılıksız kalırdı; iade gecikseydi kimse teklif vermek istemezdi.
- **KENDİ İLANINA TEKLİF YASAK** — fiyat şişirme (shill bidding) açık artırmanın en bilinen dolandırıcılığı ve blokaj yüzünden risksiz olurdu.
- **SON 10 DAKİKA UZATIYOR**: uzatma olmasaydı kazanan, eşyayı en çok isteyen değil son saniyede en hızlı tıklayan olurdu.
- **YARIŞ İKİ YERDE KOŞULLU YAZMAYLA KAPATILDI**: teklif `WHERE teklif = $5`, kapatma `WHERE bitti = FALSE`. Önce okuyup sonra yazsaydık iki oyuncu aynı anda kazanmış sayılır, ya da satıcı parayı iki kez alırdı.
- **ÇEVRİMDIŞI OYUNCU DA ÖDENİYOR**: bütün oturumlar açılışta belleğe yükleniyor, o yüzden satıcı bağlı olmasa da kesesine yazılabiliyor. Olmasaydı "24 saat sonra biter" sözü tutulamazdı.
- **EŞYA SEVİYESİ**: 5 seviye, her biri bonusu %20 büyütüyor (toplamalı). Katlanan artış sıradan eşyanın Lvl 5'ini efsanevinin Lvl 1'ine yaklaştırırdı; toplamalı artış nadirliğin üstünlüğünü koruyor. Yükseltme her zaman başarılı — bu oyunda başka hiçbir yerde "ödedin ama olmadı" yok.
- **İKİ PARA DÖNGÜSÜ DE TESTLE KAPALI**: çevirme turu zarar ettiriyor, yükseltip satmak her nadirlikte maliyetin altında kalıyor.
- Kilit: `acik-artirma.test.js` (13 kural testi) + `acik-artirma-uctan.test.js` (6 uçtan uca: blokaj, iade, envanter, yükseltme).
- **TARAYICIDA DOĞRULANDI**: efsanevi kolye 518 taban fiyatla listelendi ve "1g 0sa" kalan süreyle göründü; eşya yükseltme Lvl 1→2 yaptı, bonus +60'tan +72'ye çıktı, gümüş 600'den 546'ya düştü (tam 54).

### NPC takası her yöne açıldı, altınla hammadde kalktı (17 Eylül 2026)
- İlkan: *"parayla hammadde alınamamalı. pazarda NPC ticareti tuşu olmalı, ona bastığım an istediğimi istediğime çevirebiliyor olmalıyım."*
- **İŞLENMİŞ → HAM YÖNÜ AÇILDI** (2 ver, 1 al). Kapalıydı ve gerekçesi bir DÖNGÜ korkusuydu: keresteci 8 odun → 6 kereste veriyor, NPC "1 kereste → 2 odun" yapsaydı 8 odun bir turda 12 odun olurdu. **Korku oranın kendisindeymiş, yönde değil**: 2:1 ile aynı tur 8 odun → 6 kereste → 3 odun veriyor, yani %62 kaybettiriyor. Ekmek için de aynı (zincir 1,67 tahıl harcıyor, NPC 0,5 tahıl veriyor).
- **İSTEMCİDEKİ İKİZ KOPYA YAKALANDI**: `PazarPanel.jsx` oranın kendi kopyasını taşıyor (düğmeyi kapatabilmek için) ve sunucu açılınca o kapalı kalmıştı — ekran "bu yön yok" derken sunucu kabul ediyordu. Artık `tanim-ikizleri.test.js` ikisini karşılaştırıyor; testin ayrışmayı gerçekten yakaladığı ölçülerek doğrulandı.
- **ALTINLA HAMMADDE ALIMI KALDIRILDI**. Altınla kaynak alınabilseydi oyun "para öde, kaynak al" hâline gelir, ödeyenin üretim yapmaya ihtiyacı kalmazdı. Kese penceresi artık oyuncuyu pazara yönlendiriyor. Testi de "kapı hiç yok" diye yeniden yazıldı: işlev geri eklenirse — başka bir adla bile — yakalanıyor.

### Kese: gümüş ve altın (17 Eylül 2026)
- İlkan'ın tarifi: *"oyunda bir de altın olsun… kullanıcı altını gümüşe, gümüşü altına çevirebilsin… altınla 1'e 1 hammadde ticareti yapabilsin… bunun için bir binaya gerek yok, kendi menüsü olsun yukarıda."*
- **KESE HESABA AİT, KÖYE DEĞİL** (`server/game/kese.js`). Merkez köyün state'inde, kahraman ve görev zinciriyle aynı yerde; merkez değişince birlikte taşınıyor (`hesapKaydi.js · HESAP_ALANLARI`). Köy başına cüzdan olsaydı oyuncu parasını köyler arasında taşımak zorunda kalırdı.
- **SEKME DEĞİL ROZET.** Üst barda iki sikke duruyor ve bakiyeyi yazıyor; tıklayınca kese açılıyor. On ikinci sekme yapsaydık şerit yine taşardı (on birde zaten taşıyordu) ve bakiyeyi görmek için ekran değiştirmek gerekirdi.
- **KURLAR**: 1 altın = 100 gümüş; geri dönüş 150 gümüş = 1 altın. **Makas zorunlu**: çift yönlü ve aynı kurda çevrilseydi iki para tek paraya düşer, turu döndürerek para basmak mümkün olurdu. Test bunu ölçüyor (`kese.test.js` · "para üreten döngü yok").
- **ALTINLA HAMMADDE**: 1 altın = 1.000 birim, seçilen tek HAM kaynaktan. İşlenmiş mal yok — olsaydı işleme binaları zincirinin tamamı atlanabilirdi. Mal AKTİF köye iniyor; depo taşarsa alım hiç yapılmıyor (altın da harcanmıyor).
- **GÜMÜŞÜN KAYNAĞI MACERA** (İlkan'ın kararı): ödül havuzuna `gumus` eklendi, uzun macera kısanın ~3 katı. Yağmadan ya da üretimden gelmiyor — büyük oyuncunun köy ekonomisi kahraman ekonomisini satın almasın.
- **BAŞLANGIÇ**: 500 gümüş + 100 altın, eski hesaplar dahil (kese ilk okumada kendiliğinden doluyor, ayrı bir göç adımı yok).
- **EŞYA DEĞERİ TANIMLANDI** (`esyaDeger.js`): taban fiyat = 40 × (nadirlik çarpanı)². **Kare**, çünkü nadirlik hem ETKİYİ hem SEYREKLİĞİ büyütüyor (efsanevi eşya sıradanın ~47 katı seyrek); doğrusal fiyat efsaneviyi gülünç ucuz yapardı. 40 · 90 · 176 · 314 · 518. Yükseltme bedeli tabanın %60'ı, seviye tavanı 5, seviye başına +%20 (toplamalı).
- **İKİ PARA DÖNGÜSÜ DE TESTLE KAPALI**: çevirme turu zarar ettiriyor, yükseltip satmak her nadirlikte maliyetin altında kalıyor. Bir ekonomide en pahalı hata bir turu döndürünce fazlasıyla çıkabilmektir.
- **TARAYICIDA DOĞRULANDI**: rozet 500/100 gösterdi, "ALTINI BOZDUR" sonrası 600/99 oldu ve panelde "1 altın verildi, 100 gümüş alındı" yazdı.

### Rapor kutusu hesap çapında oldu (17 Eylül 2026)
- İlkan: *"raporlar her köye ayrı geliyor. bir mesajı bir köyde okuyorum, diğerinde okunmamış gözüküyor."*
- **İKİ KAYIT AYRIŞMIŞTI**: rapor KÖY başına saklanıyor ve pakete yalnız aktif köyünki gidiyordu; "okundu" işareti ise HESAP çapında (tarayıcıda rapor kimliğine göre). Sonuç: köy değiştirince rozet yeniden yanıyor, oyuncu ikinci köyünün savaşını kaçırabiliyordu.
- Paket artık BÜTÜN köylerin raporlarını tek listede taşıyor (`tumRaporlar`), zamana göre sıralı, kesme birleştirdikten SONRA (25). Her satırda köy adı etiketi var — yoksa liste birleşmiş ama okunaksız olurdu.
- **PARMAK İZİ DE GENİŞLEDİ**: yalnız aktif köyün en üstteki raporuna bakılıyordu, ikinci köye gelen rapor yayını tetiklemiyor ve ancak o köye geçince görünüyordu.
- **KİMLİK ÇAKIŞMASI ÇIKTI ve düzeltildi**: rapor kimliği `${march.id}-${now}` ve `march.id` köy başına sayaç; ayrıca kendi köyüme takviyede giden/gelen raporu aynı kimliği taşıyor. Ayrı listelerde sorun değildi, birleşince React satırları karıştırdı ve "okundu" bir raporu okuyunca ötekini de işaretledi. Kimlik artık `köy#id` (`raporKimligi`, tek cümle; köy listesindeki `reportIds` de aynı yerden okuyor). Bir kezlik bedel: mevcut raporlar bir kez okunmamış görünüyor.
- **SAKLAMA DEĞİŞMEDİ** — rapor hâlâ ilgilendirdiği köyün içinde. Tek bir hesap listesine taşımak "köy silinince raporlar ne olacak" gibi yeni sorular açardı.

### Kahramanı köyden köye yollama (17 Eylül 2026)
- İlkan: *"hâlâ kahramanı bir köyden başka köye yollayamıyorum; destek olarak yolla demem lazım ve o köyü kalıcı köyü yap işareti çıkması lazım desteğe yollarken."*
- **ÖLÇÜM ÖNCE SUNUCUYU TEMİZE ÇIKARDI**: kahramanın TEK BAŞINA takviyeye çıkması zaten kabul ediliyordu (`kahramanAtlandi: null`). Engel İSTEMCİDEYDİ — gönder düğmesi `chosenTotal <= 0` ile kapalıydı, yani kahramanı taşımak isteyen oyuncu yanına asker katmak zorundaydı. Düğme neden kapalı olduğunu da yazmıyordu. "Sunucu izin veriyor, arayüz engelliyor" — bu projede tekrarlayan bir sınıf.
- **YUVA ARTIK SEÇİM**: kendi köyüne giden kahraman ORAYI kendiliğinden üs yapıyordu, dolayısıyla kahramanı geçici savunmaya yollamak imkânsızdı. Takviye ekranında yeni kutu: *"Bu köyü kahramanın yuvası yap"*. İşaretli → taşınır; işaretsiz → misafir kalır ve geri çağrılabilir. Varsayılan işaretli (eski davranış ve en sık istenen).
- **YOLDAKİ ESKİ SEFERLER BOZULMUYOR**: alan yoksa (`!== false`) yuva yapılıyor.
- Kilit: `kahraman-koy-tasima.test.js` — dört uçtan uca test (tek başına çıkabiliyor · askersiz+kahramansız hâlâ reddediliyor · yuva işaretliyken üs taşınıyor · işaretsizken misafir kalıyor).

### Genç köy tek mancınıkla siliniyordu (17 Eylül 2026)
- İlkan: *"birinin ana binasını yıkarken köy direk kayboluyor galiba, ilk onu çözmen lazım."*
- **ÖLÇÜLDÜ, doğrulandı.** Yeni kurulan köyün TEK binası var (`villageState.js` · `'0,0': anaBina Lvl 1`). Köyün yok olma şartı "bütün binaları bitsin"di; genç köyde bu şart "ana bina bitsin"e eşitti. Bir mancınık, bir sefer, köy haritadan siliniyordu. `kusatma.js`'in kendi başlığı bunun tersini söylüyordu: *"Tek bir mancınık dalgasının köyü silmesi satılan bir oyun için fazla sertti."* Kural öyle yazılmıştı ama genç köyde tersini yapıyordu.
- **Düzeltme: `koyBosMu` artık TARLALARI da sayıyor.** Köy ancak binaları VE tarlaları sıfırlanınca yok oluyor — Travian'ın "nüfus sıfırlanınca ölür" kuralının karşılığı. Ölçüm: aynı köy 1 dalgada değil **6 dalgada** düşüyor (en çıplak hâliyle; gerçek kurulum dokuz tarlalı).
- **Tarlaları saymak, mancınığın tarlayı VURABİLMESİNİ zorunlu kıldı**: vurulamayan bir şeyi sayınca köy ölümsüz olurdu — dosyanın tarlaları eskiden dışarıda tutma sebebi tam olarak buydu. İkisi aynı kararın iki yüzü. Mancınık hedef listesine tarlalar eklendi (`SendArmyPanel` · iki `optgroup`: Köy binaları / Tarlalar), rapor tarlanın ADINI taşıyor (`ad` alanı sunucuda yazılıyor — `VILLAGE_DEFS`'te tarla adı yok, istemci ham anahtarı gösterirdi).
- **TERK ETME YOLU AYRI CÜMLEYE ALINDI** (`binasiKalmadi`). Yıkım düğmesi yalnız köy binalarında var; tarla yıkılamıyor. Terk etmeyi de "her şey bitsin"e bağlasaydık oyuncu köyünü hiç bırakamazdı. İki gerçekten farklı olay: biri saldırganın emeği, öteki sahibinin kararı.
- Kilit: `kusatma.test.js`'e dört test (genç köy tek dalgada silinmiyor · ısrarlı kuşatma yine de silebiliyor · tarla hedefi çalışıyor · `binasiKalmadi` ile `koyBosMu` ayrışıyor). Eski "TARLALAR köyü ayakta tutmaz" testi tersine çevrildi.

### Hammadde ikinci köyden ilkine gitmiyordu (17 Eylül 2026)
- İlkan: *"ilk köyümden ikinciye hammadde yollayabiliyorum ama tam tersini yapamıyorum."*
- **İKİ HATA ÜST ÜSTE BİNMİŞTİ, ikisi de SESSİZ.**
- **(1) Panel sunucuyu beklemeden kapanıyordu.** `gonder()` isteği yollayıp hemen `onGonderildi` çağırıyordu; sunucu ne derse desin panel kapanıyor, yazılan sayılar siliniyordu. Ret ekranda hiçbir iz bırakmıyordu. Artık sunucu her sonucu `hammadde_sonuc` ile söylüyor, panel cevabı bekliyor ve sebebi düğmenin hemen üstünde yazıyor.
- **(2) "Hedef zaten bulunduğum köy mü" denetimi hiç çalışmıyordu.** İstemci `pazar.slotKey` ile karşılaştırıyordu ama pazar özeti böyle bir alan GÖNDERMİYORDU: karşılaştırma hep `undefined` ile yapılıyor, hep `false` dönüyordu. Oyuncu köy değiştirmeden ilk köyüne "gönder" diyebiliyor, sunucu haklı olarak reddediyor, panel sessizce kapanıyordu. `slotKey` pakete eklendi (`opts.activeSlot` ile aynı kaynaktan — ikinci bir tanım değil).
- **Asıl üçüncü sebep artık GÖRÜNÜR**: gönderi GÖNDEREN köyün pazarından çıkıyor. İkinci köyde pazar yoksa gönderi olmuyor — eskiden ekranda "1 tüccar gerekiyor, 0 boşta" yazıyordu (doğru ama yanıltıcı: eksik olan tüccar değil binaydı). Artık açıkça *"Bu köyde pazar yok"* diyor. Testte de tam bu çıktı: `dev_max_buildings` yalnız aktif köye işlediği için ikinci köy pazarsız kaldı ve sunucu sebebi söyledi.
- Kilit: `hammadde-iki-koy.test.js` — uçtan uca üç test (her iki yön de çalışıyor · bulunduğun köye ret sebebiyle birlikte geliyor · paket `pazar.slotKey`'i taşıyor ve köy değişince güncelleniyor).

### Boş kuşam slotlarının simgeleri (16 Eylül 2026)
- İlkan: *"bunları kahramanın slotlarındaki simgeler olarak kullan. item yoksa bunlar gözüksün."* Sekiz siluet üretti: at, bileklik, zırh, miğfer, ayakkabı, pantolon, kalkan, kılıç. **Kolye eksik** — o slot eski çizgi ikonunda kaldı.
- **MASKE OLARAK ÇİZİLİYOR, DÜZ RESİM OLARAK DEĞİL.** Boş slotun rengi duruma göre değişiyor: normalde sönük, seçiliyken buz mavisi, sürüklenen eşya uymuyorsa soluk. Düz bir `<img>` sabit renkli olurdu ve bu üç durumun hiçbirini gösteremezdi — eski çizgi ikonları `color` ile boyanıyordu, o davranışı kaybetmek geriye gitmek olurdu. Şekil `mask-image`, renk `backgroundColor`.
- **DÖNÜŞÜM YEREL YAPILDI**: ffmpeg/ImageMagick/sharp yok, tarayıcı indirmesi de dosya sistemine düşmedi. Windows'un `System.Drawing`'i (PowerShell) kullanıldı: koyu piksellerin sınır kutusu `LockBits` ile tarandı, kare kırpıldı (%5 pay), 96 px'e indirildi, sonra **alfa = 255 − parlaklık** yazılıp RGB beyaza çevrildi. Kaynaklar 1024+ px, çıktılar **2,6–6,9 KB** (toplam 40 KB).
- 96 px seçildi çünkü simge 46 px çiziliyor — yüksek yoğunluklu ekranda da net kalsın diye iki katı.
- Görseli olmayan slot sessizce eski ikonuna düşüyor (`SLOT_MASK` haritasında yoksa), yani listeyi tek tek doldurmak arayüzü hiçbir aşamada bozmuyor.
- **TARAYICIDA DOĞRULANDI**: dokuz slot da boşaltıldı, sekiz maske doğru slotta ve doğru dosyayla çizildi (46×46, `rgb(196,236,255)`), kolye eski ikonunda kaldı. Konsolda hata yok.


### Değirmen kilidi — yeni köyün İKİNCİ çıkışsız odası (16 Eylül 2026)
- İlkan: *"yeni köy kurarken hâlâ hammaddeler ve binalar birbirini kilitliyor. değirmen kuracağım, Ana Bina Lvl 3 istiyor; Ana Bina için tuğla istiyor vs. köyün içindeki üretim binaları tarlalardan toplananlarla geliştirilmeli, işlenmişlerle değil."*
- **ÖLÇÜM ÖNCE KURALIN NEREDE TUTTUĞUNU GÖSTERDİ**: altı üretim binasının da (keresteci, tuğlacı, taşçı, demirci, değirmen, fırın) hem kuruluşu HEM DE her seviyedeki yükseltmesi zaten **ham** kaynak istiyor. `getScaledUpgradeCost` taban yoksa `cost`a düşüyor, o da ham. Yani İlkan'ın kuralının MALİYET tarafı sağlanıyordu.
- Kilit ÖN KOŞUL zincirindeydi: `degirmen → anaBina Lvl 3 + tahıl Lvl 3`, `anaBina Lvl 1→2 → 120 tuğla`. Ham kaynakla çalışan bir binaya ulaşmanın yolu işlenmiş maldan geçiyordu.
- Düzeltme: `degirmen.requires` → `[{ tarla: "tahil", seviye: 1 }]`. Şart KALKMADI ("değirmen için tahıl tarlan olmalı" hâlâ doğru ve kodda yazılı) ama **bedeli sıfır**: köy iki Lvl 1 tahıl tarlasıyla başlıyor. Fırının şartı (değirmen Lvl 3) duruyor.
- Ana Bina'nın işlenmiş mal istemesine **dokunulmadı**: sorun pahalı olması değil, üretim tiyerini KİLİTLEMESİYDİ.
- **KİLİT GENİŞLETİLDİ**: `koy-bootstrap.test.js` önce yalnız İNŞAAT MALZEMESİ üreten dört binayı kapsıyordu — değirmen/fırın dışarıdaydı ve ikinci hata tam oradan çıktı. Artık `processes` alanı olan HER bina kapsamda, hem kuruluş hem **dört ayrı seviyedeki** yükseltme hem ön koşul bedeli ölçülüyor. Tek seviyeye bakmak yetmez: `upgradeCostBase` eklenirse yalnız üst seviyelerde işlenmiş mal belirebilir.
- **Kilidin tuttuğu doğrulandı**: `anaBina Lvl 3` şartı geri konunca iki test birden patlıyor.
- **GERÇEK SUNUCUDA UÇTAN UCA**: yeni köy kuruldu, işlenmişi tarlalara harcatıldı (tuğla 300 → 84), sonra altı bina denendi. keresteci/tuğlacı/taşçı **kuruldu**; demirci ve değirmen yalnız *"Yetersiz kaynak — 10/20 odun eksik"* dedi (ham, tarladan geri geliyor); fırın *"Önce gerekli: Değirmen Lvl 3"* dedi. **Hiçbir yerde ön koşul kilidi kalmadı.**


### Kahraman eşya görselleri (16 Eylül 2026)
- İlkan: *"hero itemleri için görseller yükledim, onları da al oyuna."*
- `client/src/components/itemArt.js` — bina haritasından (`buildingArt.js`) AYRI dosya: iki liste farklı hızda büyüyor, aynı dosyada olsalardı her eşya eklemesi bina dosyasını da kilitlerdi.
- **KAPSAM ÖLÇÜLDÜ**: `heroItemDefs` 30 eşya tanımlıyor, klasörde 30 jpg var, `ITEM_IMAGE` haritasında 30 giriş — **görseli olmayan eşya yok, sahipsiz dosya yok**. Anahtarlar sunucu tanımıyla birebir.
- `EsyaGorsel` iki yerde kullanılıyor: çantada **34 px**; kuşam ızgarasında ise görsel **kareyi KAPLIYOR** (İlkan: *"görselleri daha büyüt, o kareyi kaplasınlar, ismi ve yazılar resmin üstünde durabilir"*). Ölçüldü: hücre 108×108, görsel **106×106** `object-fit: cover`, ad alt şeritte hücrenin %22'si. Eski hâli 38 px idi — hücrenin üçte biri bile değil, eşya tanınmıyordu.
- **OKUNURLUK ŞERİDİ**: görselin üstüne düz yazı koymak açık renkli resimlerde (kar, gümüş, buz) adı okunmaz yapıyordu; alt kenardan yukarı saydamlaşan koyu dolgu + gölge kontrastı arkası ne olursa olsun sabit tutuyor. En uzun adlarda bile ("Ustaişi Kutup Tilkisi Postu") taşma yok — altı dolu slotta ölçüldü. Boş slot eski ikon yerleşiminde kaldı: kaplayacak resim yok ve ikonu kareye yaymak bulanık bir lekeye çevirirdi. Görseli olmayan eşya sessizce eski çizgi ikonuna düşüyor, yani görselleri tek tek eklemek arayüzü hiçbir aşamada bozmuyor.
- Boyut: 30 dosya, toplam **1,5 MB**, ortalama 53 KB (512×512). nginx bunları `location ~* \.(jpg|…)$` dalından 1 gün önbellekle veriyor.
- **TARAYICIDA DOĞRULANDI**: kahramana 12 eşya verilip ekran açıldı — çantada 16 görsel yüklendi (hepsi 512×512), beş eşya kuşanılınca ızgarada nadirlik renginde çerçeveyle çıktı. Konsolda eşya görselleriyle ilgili hata yok.
- Not: bu iş çalışma kopyasında commit edilmemiş duruyordu; İlkan onaylayınca alındı.


### Elçilik ve birlik (16 Eylül 2026)
- İlkan'ın tarifi: *"elçilik kuran kişiler birlik oluşturabilir, birliğin adını ve amblemini seçer, sonra birliğe oyuncu davet eder. elçilikten davetler kısmına girip oyuncu adı aratıp daveti yollar. karşı taraf kabul ederse birliğe katılır. birlik oyuncuları haritada alanları yeşil çerçeve ile gözükür. iki birlik oyuncusunun alanı yan yana ise aralarına koyu yeşil çizgi çizilir. birlik oyuncularına saldırmak serbesttir. kurucu birliğe adam alabilir çıkartabilir, 2 yetkili alt yönetici seçilebilir. buradaki kral ve alt yöneticilerini Nord mitolojisine göre ayarla, yarl vs gibi terimler kullan."*

**RÜTBELER — Rígsþula'dan.** İskandinav toplum düzeninde üç sınıf var: Jarl (soylu), Karl (hür adam), Þræll (köle); üstlerinde Konungr (kral). Þræll alınmadı — oyuncu köle değil. Kalan üçü rütbe merdivenini olduğu gibi veriyor: **Konung → Jarl → Karl**.

| | Konung | Jarl | Karl |
|---|---|---|---|
| davet et / iptal | ✓ | ✓ | ✗ |
| üye at | ✓ (Jarl dahil) | ✓ (yalnız Karl) | ✗ |
| Jarl seç / indir | ✓ | ✗ | ✗ |
| ad / amblem değiştir | ✓ | ✗ | ✗ |
| birliği dağıt | ✓ | ✗ | ✗ |
| ayrıl | ✗ | ✓ | ✓ |

- **Jarl tavanı 2** (İlkan'ın kararı). Jarl Jarl atamıyor: izin verseydik iki yönetici birbirini atmaya çalışır ve sonucu kimin daha hızlı tıkladığı belirlerdi.
- **Konung ayrılamıyor**: ayrılabilseydi birlik kralsız kalır, kimse davet gönderemez, kimse atamaz — kimsenin çözemediği ölü bir kayıt.
- **Üye tavanı = KONUNG'un elçilik seviyesi × 3** (Lvl 1 → 3 üye, Lvl 20 → 60). Bütün üyelerin elçilikleri toplansaydı her yeni üye tavanı da açar ve tavan diye bir şey kalmazdı.
- **Birlik içi saldırı SERBEST.** Kuralın kodda bir yeri var (`birlikIciSaldiriSerbest()`) ki ileride "acaba yasak mıydı" diye kimse aramasın; yasak konacaksa değişecek tek yer orası. Elçilik ekranında da sarı bir kutuda yazıyor — oyuncu birliğe girerken korunduğunu sanıp savunmasını ihmal ederse bu bizim hatamız olur.

**Mimari.** Üç katman, bilerek ayrı:
- `game/birlik.js` — SAF KURALLAR (kim ne yapabilir, ad geçerli mi, kaç üye sığar). Veritabanı görmüyor, oturum bilmiyor.
- `game/birlikServis.js` — kuralları VERİYE uyguluyor; belleği (`WORLD`) ve diski birlikte güncelliyor. Her işlem ÖNCE DİSKE, sonra belleğe: tersi olsaydı disk yazımı patladığında bellek yalan söyler ve sunucu yeniden başlayana kadar kimse fark etmezdi.
- `index.js` — sekiz soket olayı, hepsi aynı kalıpta. Yayın ETKİLENEN HERKESE gidiyor, yalnız işlemi yapana değil: davet gönderince hedefin ekranında davet belirmeli, üye atılınca atılanın ekranından birlik kalkmalı.

- **Veritabanı**: `alliances` · `alliance_members` · `alliance_invites`, hem PostgreSQL hem dev (JSON) sürümü aynı API ile. `alliance_members.user_id` TEKİL ve kısıt uygulamada değil **şemada**: "önce sorgula sonra ekle" iki eşzamanlı kabulde ikisini de geçirirdi. Birlik adı da tekil (küçük harfe indirilmiş).
- **Bellek**: birlikler açılışta yükleniyor (`WORLD.birlikler` / `birlikByUser` / `davetByUser`). Haritanın rengi her anlık görüntüde okunuyor; veritabanına gitmek 217 köy için 217 sorgu olurdu. Üç ayrı indeks çünkü üç ayrı soru var ("bu birlik kim", "ben neredeyim", "bana ne geldi").
- **Parmak izi**: birlik durumu delta parmak izine girdi — girmezse yayın hiç olmaz ve oyuncu davet gönderdikten sonra 30 saniyelik kalp atışını bekler. Ucuz tutuldu (kimlik + rütbe + üye sayısı + davet sayısı); üye adlarını katmak her yayında dize kurmak olurdu.
- **Yetkiler SUNUCUDAN gidiyor** (`birlik.yetkilerim`), istemci yeniden hesaplamıyor. Kural iki yerde yaşarsa ayrışır — bu projede asker yemi muhasebesi tam olarak öyle ayrışmıştı.

**Harita.** Sunucu yalnız KİMLİĞİ veriyor (`birlikId` + ad), çerçeveyi istemci çiziyor. `birlikSinirPath` bir köyün kenarlarını TEK GEÇİŞTE ikiye ayırıyor: dışarıya bakanlar parlak yeşil (birliğin dış sınırı), birlik arkadaşının hex'ine bakanlar koyu yeşil (iç sınır). İkinci bir tarama 200+ köyde iki katı iş olurdu. Birlik kimliği herkese açık — ordu ve sur keşifle öğreniliyor ama birlik bir BAYRAK.

**Görseller** (İlkan üretti): `elcilik.jpg` + `elcilik.mp4` — karlı bir Nord uzun evi, cephesinde beş klan sancağı (ayı, baltalar, ejder, kartal, kurt), çatısında kuzgun heykeli. Hex amblemi için **kuzgun** ikonu İlkan'ın verdiği görselden vektörlendi (siluet + göz ve iki kanat çentiği; tam tüy detayı 18 px'te gri lekeye dönüyordu). Odin'in haber taşıyan kuzgunları Huginn ve Muninn düşünülürse elçilik için yerinde bir simge.

- **TARAYICIDA UÇTAN UCA DOĞRULANDI**: elçilik kuruldu (Lvl 20), panel "Elçiliğin Lvl 20, yani birliğe 60 üye sığar" diyor; "Kuzey Kurtları" kuruldu, panel "sen: Konung · 1/60" gösteriyor; oyuncu adıyla davet gönderildi ve "CEVAP BEKLEYENLER" listesinde GERİ AL düğmesiyle belirdi. Diskte de doğrulandı (`alliances` 1 kayıt, `alliance_members` konung, `alliance_invites` 1 davet). Olmayan bir ada davet `oyuncu_yok` ile reddedildi.
- Testler: `birlik.test.js` 11 kilit — rütbe merdiveni, yetki tablosu, atma zinciri, Jarl tavanı, üye tavanı sayıları, elçilik şartı, tavanın KABUL ANINDA bakılması, ad doğrulaması (görünmez karakter dahil), amblem listesi, saldırı serbestliği ve elçilik binasının tavanıyla birlik tavanının tutması.

### Eşya görsellerinin yönü tekleştirildi (16 Eylül 2026)
- İlkan: *"itemlerin yönünü düzenle, biri sağa biri sola bakmasın."*
- **ÖNCE SAYILDI, SONRA ÇEVRİLDİ.** Otuz görselin hepsi etiketli bir kontakt sayfasına dizilip bakıldı; yönü gerçekten belli olan iki grup var: **atlar (6)** ve **çizmeler (3)**. Zırh, kalkan, miğfer, bileklik ve kolyeler cepheden çizilmiş, yönleri yok.
- **Yön LEFT seçildi** çünkü en büyük yönlü grup olan atların 4'ü zaten sola bakıyordu. Sağ seçilseydi dört atın sanatı değişecekti; sol seçilince iki at + üç çizme (beş dosya) aynalandı ve atların çoğunluğu olduğu gibi kaldı.
- Aynalanan dosyalar: `kuzeyRuzgari`, `savasAti`, `demirNalliCizme`, `kurtPostuCizme`, `kutupTilkisiPostu`.
- **AYNALAMA ASILDAN YAPILDI** (`items/yedek/`, 1024×1024), canlı 512'lik dosyadan değil: canlıdan aynalasaydık ikinci bir JPEG kaybı binerdi. Asıl aynalanıp yeniden 512'ye indirildi, yani canlı dosya yine asıldan tek kuşak uzakta. Kalite 92, boyutlar 56–67 KB (eskisiyle aynı aralıkta).
- **`items/yedek/` ELLENMEDİ**: orası İlkan'ın verdiği asılların arşivi. Yukarıdaki beş dosya arşivdeki asıllara göre AYNALI — arşivden yeniden türetilirse aynalama tekrar uygulanmalı.
- Aynalanan hiçbir görselde yazı/rün yok (kontrol edildi); `runBileklik` rünlü ama yönsüz olduğu için listede değil.
- **DOĞRULANDI**: çevirme sonrası kontakt sayfasında altı atın ve üç çizmenin hepsi sola bakıyor; oyunda kuşam ızgarasında yan yana duran çizme ve at aynı yöne bakıyor.

**ÇERÇEVELER DE KIRPILDI** (İlkan: *"kırp"*). İki görselin kendi kenarlığı vardı — `kuzeyRuzgari` koyu bir tablo çerçevesi, `zincirEtek` açık renkli bir kenarlık; öteki yirmi sekizin zemini kenara kadar düz gidiyor.
- **Pay gözle değil ÖLÇÜLEREK seçildi.** Her kenardan içeri doğru satır/sütun ortalama parlaklığı tarandı: `zincirEtek`'te beyaz kenarlık 22 pikselde sahne zeminine iniyor (26 kırpıldı), `kuzeyRuzgari`'nda ahşap çerçevenin iç gölgesi 38'de net düşüyor (42 kırpıldı). Tahminle kırpmak ya çerçeveyi bırakır ya sanattan yer yerdi.
- Kırpma da ASILDAN yapıldı; `kuzeyRuzgari` aynı geçişte yeniden aynalandı. Pay her kenarda eşit olduğu için kırp/aynala sırası sonucu değiştirmiyor.
- **ÖLÇÜLDÜ**: kırpma sonrası dört kenarın ortalama parlaklığı `zincirEtek` 15–21, `kuzeyRuzgari` 10–21 — dokunulmamış görsellerle aynı aralıkta (`deriPantolon` 12–13, `bozkirAti` 24–26). Kalıntı kenarlık yok.

### Harita renkleri: kim değil NE (17 Eylül 2026)
- İlkan: *"her oyuncuya ayrı renk atama, çerçeve renkleri standart olsun. Kendi köylerimi mavi çerçevelesin, dostları yeşil, tarafsızları gri, düşmanları kırmızı boyayalım. İstediğim adamı da işaretleyebileyim istediğim renkte. İki köy arasındaki birleşimler hâlâ sıkıntı."*

**ESKİ MODEL** her oyuncuya paletten ayrı bir ton veriyordu (açgözlü boyama, iki palet, 9 hex komşuluk taraması). Harita rengârenkti ama renk hiçbir şey **anlatmıyordu**: mor bir köyün mavi bir köyden farkı yoktu, ikisi de yabancıydı. "Kime saldırabilirim" sorusu renge bakarak cevaplanamıyordu. Ton dağıtan kod tamamen silindi — iki renk sistemini birlikte bırakmak "hangisi çalışıyor" sorusu doğururdu.

**YENİ MODEL — dört sabit renk + elle işaret.** Kural tek dosyada (`haritaRenk.js`); canvas da SVG de oradan okuyor. İki katmanın ayrışması bu projede defalarca patlayan hata sınıfı ve nitekim ilk denemede yakalandı: canvas yeni kurala geçmişti ama SVG kendi köyleri hâlâ yeşil çiziyordu, yani aynı köy uzakta mavi yakında yeşil görünüyordu.

| Durum | Renk | Nereden |
|---|---|---|
| Kendi köyüm | mavi `#5aa9ff` | `kind === 'self'` |
| Dost | yeşil `#7fe04d` | aynı birlik · konfederasyon · saldırmazlık |
| Tarafsız | gri `#9aa7b4` | geri kalan herkes |
| Düşman | kırmızı `#ff6f78` | birliğimin savaşta olduğu birlik |
| Elle işaret | seçilen renk | oyuncunun kendi kararı — **hepsini ezer** |

- **Sıra önemli**: elle işaret otomatik çıkarımı ezer ("tarafsız görünüyor ama bana saldırdı"), ama **kendi köyüm her zaman mavi** — kendi toprağını düşman renginde görmek haritayı okunamaz yapardı.
- **Yeşil artık DOST rengi**, kendi toprağım değil: ikisi aynı renkte kalsaydı "bu benim mi, müttefikimin mi" sorusu renkle cevaplanamazdı.
- **Diplomaside yalnız YÜRÜRLÜKTEKİ ilişkiler** renk değiştiriyor; bekleyen teklif değiştirmiyor — teklif gönderdin diye adamı yeşil göstermek, onay gelmeden dost saymak olurdu.

**İŞARETLER SUNUCUDA** (`player_marks`), tarayıcıda değil: `localStorage` daha kolaydı ama işaret telefonda ve bilgisayarda ayrı tutulurdu; İlkan ikisini de kullanıyor. Hedef **oyuncu adıyla** saklanıyor, kullanıcı numarasıyla değil — harita anlık görüntüsü numara taşımıyor (bilerek: oyuncuları numaralarıyla eşleştirmeye yarardı) ve ad zaten benzersiz. İşaret **oyuncu bazında**, köy bazında değil: altı köylü bir oyuncuyu altı kez işaretlemek saçma olurdu.

**BİRLEŞİM SORUNU ÇÖZÜLDÜ.** Komşu iki köyün **ortak kenarı aynı geometriyle iki kez** çiziliyordu, her biri kendi renginde; hangisinin görüneceğini çizim sırası belirliyordu (mavi ile kırmızı yan yana gelince biri ötekini tamamen örtüyordu). Artık her toprağın çevresi 3 piksel içeri çekilerek çiziliyor — hatlar birbirine değmiyor, iki renk de okunuyor. Kalınlık 3,2 → 2,8.

**Paket**: `birlikIliskilerim` (birlikId → yürürlükteki tür) ve `isaretlerim` (ad → renk) pakette gidiyor, istek üzerine değil — harita ilk çizimde doğru renkte açılsın, sonra zıplamasın. İkisi de bağlantıda bir kez okunup oturumda tutuluyor (`emitVillage` senkron, oraya sorgu koymak tik yoluna gecikme sokardı) ve ilgili olayda tazeleniyor.

- **Yakalanan tuzak**: `opts` alanları `payload.js`'e açıkça yazılmadıkça istemciye gitmiyor — bu dosyanın bilinen kuralı, yine unutuldu ve iki alan da pakette çıkmadı. Ölçülerek görüldü (istemcide `birlikIliskilerim` hiç gelmiyordu), eklenince düzeldi.
- **TARAYICIDA DOĞRULANDI**: SVG çerçeve renkleri sayıldı — mavi 2 (kendi), gri 8 (tarafsız), kırmızı 2 (savaş ilan edilen birlik), mor 2 (elle işaretlenen oyuncu). Kalıntı hue tonu yok. İşaretin diske yazıldığı da doğrulandı; test işareti ve test savaşı sonra geri alındı.

### Haritadaki beyaz dikişler (17 Eylül 2026)
- İlkan ekran görüntüsüyle bildirdi: *"görseller arası beyazlıklar vs var. haritayı çok güzel görünen akıcı çalışan bir hale getir."*

**SEBEP ÖLÇÜLDÜ, TAHMİN EDİLMEDİ.** Doku dosyaları 1024×1024 kare ve altıgen sanatın çevresi BEYAZ:

| doku | sanatın sınırı | kenar rengi |
|---|---|---|
| `tahil_tile` | x 74–950, y 130–910 | RGB 254,254,254 |
| `orman_tile` | x 63–960, y 123–900 | RGB 244,236,217 |
| `tas_ocagi` | x 10–1023, y 46–992 | — |
| `kil`, `demir`, `bos` | tam kare | payı yok |

Sprite pişirilirken bütün kare altıgen maskeyle kırpılıyordu; maske sanattan BÜYÜK olduğu için beyaz pay maskenin içinde kalıyor ve her karonun çevresinde beyaz bir halka oluşuyordu. Ekran görüntüsünde yalnız buğday ve ormanın halkalı olması da bunu doğruluyordu — payı olmayan dokularda halka yoktu.

**Çözüm iki parçalı.**
1. **Sanatın sınırı ölçülüp maskeye oturtuluyor.** Sınır elle yazılmıyor: yüklemede orta satır ve orta sütun taranarak bulunuyor, böylece doku değiştiğinde sayıları güncellemek gerekmiyor. Ölçüm saçma çıkarsa (sanat karenin %40'ından küçük görünürse) kare olduğu gibi kullanılıyor — bozuk bir dokunun haritayı büsbütün bozmaması için.
2. **Maskenin %4 dışına taşırılıyor.** Kırpma kenarında yarı saydam pikseller kalıyor; sanat tam maske boyunda olsaydı bu piksellerin altından zemin sızar ve bu sefer KOYU dikişler görünürdü.
- Ayrıca komşu karolar **yarım piksel bindiriliyor**: kırpma kenarındaki yarı saydam pikseller iki komşuda toplanınca %100 etmiyor ve aralarında saç teli inceliğinde koyu bir dikiş kalıyordu.

**Yükleme maliyeti düşürüldü.** İlk hâlde sınır taraması doku başına 1024×1024'lük bir canvas açıyordu (altı doku = 24 MB anlık ayırma), oysa okunan yalnız orta satırla orta sütun. Artık kaynak dikdörtgeniyle doğrudan iki şerit çiziliyor (~8 KB). Telefonda açılış takılmasının sebebi tam da böyle şeyler.

- **TARAYICIDA DOĞRULANDI**: beyaz halkalar kayboldu, karolar birbirine dikişsiz oturuyor; yakın zoomda da temiz. Konsolda yeni hata yok.

### Kahramanın üssü konaktan ayrıldı — Travian modeli (17 Eylül 2026)
- İlkan: *"kahramanı köyünü nasıl değiştireceğim? Şu an 2. köyümde, ilk köyüme gitsin oradan saldırıya katılsın istiyorum. Normal destek olarak ilk köyüme gönderip, gönderirken 'gittiği yeri kahramanın ana köyü yap' demeliyim."* → seçenek soruldu, cevap: *"Travian gibi olsun."*

**ESKİ MODEL:** üs = Kahraman Konağı'nın olduğu köy ve **her tikte** oradan yeniden yazılıyordu (`kahramaniSenkronla`). Kahraman başka köyüne gitse bile üssü konakta kalıyor, taşınmanın hiçbir yolu olmuyordu.

**YENİ MODEL — üs, kahramanın YAŞADIĞI köy:**
- **Taşınmanın yolu mevcut takviye seferi.** Kahraman kendi köyüne takviyeye gidince varışta orası üssü oluyor (`usSlot = toKey`, `nerede = 'koy'`, `misafirSlot = null`). Ayrı bir "kahramanı taşı" düğmesi eklemedim: aynı işi ikinci bir kapıdan yapmak, iki ayrı yolun bakımını gerektirirdi.
- **Başkasının köyünde misafir kalıyor**, orası üs olmuyor. Olsaydı kahraman başkasının toprağında yaşıyor sayılırdı ve ev sahibi onu istemediğinde gidecek yeri kalmazdı.
- **Konak artık yalnız doğum, iyileşme ve diriliş için.** İyileşme ve macera birikimi kahramanın **bulunduğu köydeki** konak seviyesinden hesaplanıyor; herhangi bir köydeki konağı saysaydık, kahraman konaksız bir köye taşındığında bile tam hızla iyileşir ve konağı taşımanın anlamı kalmazdı. Konaksız köyde iyileşme **durmuyor**, taban hızda sürüyor — sıfır olsaydı konaksız köye taşınmak kahramanı kalıcı sakat bırakırdı.
- **Üs artık silinmiyor.** Eskiden konak yıkılınca `usSlot` null oluyor ve kahraman "yürüyecek yeri yok" durumuna düşüyordu. Artık yalnız köyün KENDİSİ elden çıkarsa üs merkeze (yoksa kalan ilk köye) taşınıyor.
- Diriltme bedeli zaten üssün köyünden alınıyordu; üs kahramanı takip ettiği için bu da kendiliğinden doğru yere kaydı.

- **Testler**: `kahraman-us-tasima.test.js` 5 kilit (taşınan üsten sefer çıkabilme, eski üsten çıkamama, başkasının köyünde misafir kalma, konaksız köyde iyileşmenin durmaması, özetin `bulunduguSlot` taşıması).
- **GERÇEK SUNUCUDA UÇTAN UCA DOĞRULANDI**: kahraman Alvstad'dan Bergsund'a takviye olarak gönderildi; varışta `usSlot=-14,0 nerede=koy misafirSlot=null` oldu ve **sonraki tiklerde orada kaldı** — konak hâlâ Alvstad'da (`2,0 Lvl1`) olmasına rağmen. Eski kodda bir sonraki tikte konağa geri dönerdi. Ölçüldü: Bergsund'dan sefere çıkabiliyor, Alvstad'dan `baska_koyde` ile reddediliyor.

### Harita boyaması ve üst bar taşması (17 Eylül 2026)
- İlkan: *"haritada oyuncu köylerini boyama, sadece dış çevresini çerçeve ile boya ve biraz kalın bir çizgi ile. Ek olarak ormanın etrafında da çerçeve yeşil, o da karıştırıyor — üretim alanlarının etrafındaki renkli çerçeveleri kaldır."* ve *"tepedeki menüler ekrana sığmadığı için scroll çıkıyor, çıkmayacak gibi ayarla, yani scale olsun PC'de."*

**HARİTA — üç değişiklik.**
1. **Sahiplik dolgusu kalktı.** Her sahipli hex oyuncunun renginde yarı saydam boyanıyordu; altındaki arazi dokusu (orman, taş, tarla) rengin altında kayboluyor ve harita renk lekesine dönüyordu. Sahiplik artık yalnız çerçeveyle anlatılıyor.
2. **Çerçeve yalnız DIŞ SINIRDA ve kalın** (3,2 px). Her hex'in kendi altıgeni çiziliyordu: altı köylü bir oyuncunun toprağı içeriden petek ızgarasına dönüyor, dış hat iç çizgilerin arasında kayboluyordu. Artık yalnız **komşusu başkası olan** kenar çiziliyor — aynı OYUNCUYA ait komşu iç sayılıyor, yani bitişik köyleri tek toprak gibi okunuyor. Yan etki: daha az çizim.
3. **Bonuslu karoların renkli çerçevesi kalktı.** Ormanınki yeşildi ve oyuncu sınırının yeşiliyle karışıyordu. Bonusun ne olduğu dokusundan ve yüzde rozetinden zaten belli.
- Komşu testi için sahiplik haritası **tek geçişte** kuruluyor: her kenar için `list` dizisini taramak 2.160 hex'te altı kat iş olurdu.

**ÜST BAR — iki aşamalı daralma.**
- **ÖLÇÜLDÜ**: 900 px'lik pencerede marka + köy seçici + sağdaki denetimlerden sonra şeride 328 px kalıyor; 11 sekme etiketleriyle **1215 px** istiyor. Yalnız ölçek uygulasaydık 0,27 gerekirdi — yazı okunmaz olurdu.
- Bu yüzden iki aşama: önce **ölçek** (0,70'e kadar), sonra **yalnız ikon** (ikonlar bilerek birbirinden ayrı seçilmişti, tek başına sekmeyi ayırt ediyorlar; etiket düşünce şerit 1215 → **461 px**'e iniyor). İkon modunda taban 0,55.
- **EŞİK İLE TABAN AYNI SAYI** (`ETIKET_TABANI`): ayrı seçilince aralarında bir aralık kalıyordu — gereken ölçek 0,73 iken mod hâlâ etiketli, taban 0,78, şerit kırpılıyordu (ölçüldü). Kural tek cümle: *gereken ölçek tabanın altına düşüyorsa etiketler düşer.* Çıkış eşiği 0,86 — tam sınırda pencere birkaç piksel oynayınca şerit titremesin diye.
- **İki ölçüm tuzağı yaşandı ve ikisi de not edildi:**
  - `requestAnimationFrame` ile yeniden ölçmek YETMİYOR: geri çağrı React'in yeni durumu çizmesinden ÖNCE koşuyor, şerit hâlâ etiketliyken ölçülüyor ve ölçek tabana yapışıyordu. Çözüm: mod değişimine bağlı bir efekt (çizimden sonra koşuyor).
  - `ResizeObserver` şeridin kendisinde hiç tetiklenmiyor: şerit bir flex öğesi, kabına sıkıştığı için **kutusu** hep aynı genişlikte, değişen yalnız `scrollWidth`. Ayrıca tarayıcı panelinde kap 328 → 928 olduğu hâlde geri çağrı hiç koşmadı; bu yüzden `window.resize` de dinleniyor.
- Doğal genişlik `scrollWidth` ile okunuyor: CSS dönüşümü yerleşimi değiştirmediği için sayı ölçek uygulanmışken de doğru. `getBoundingClientRect()` ölçeklenmiş genişliği okur, ondan yeni ölçek üretir ve şerit her karede küçülürdü.
- **DOĞRULANDI**: 1500 px'te etiketler duruyor, ölçek 0,734, görünen genişlik = kap genişliği (kırpma yok). 900 px'te etiketler düşüyor, ölçek 0,711, yine tam oturuyor. Hiçbir genişlikte kaydırma yok.

**Kart görünümü düğmesi.** Telefonda iki küçük ikon vardı ve başlık balonu olmadığı için hangisinin ne yaptığı belirsizdi (İlkan kart görünümünü telefonda bulamadı); artık seçili görünümün adı yanında yazıyor. Ayrıca varsayılan eşiği elle yazılmış 760 yerine uygulamanın kendi kırılma noktasına (`BP.mobile`) bağlandı — sayı aynıydı ama iki yerde tutulunca er geç ayrışırdı.

### Köy kart görünümü (17 Eylül 2026)
- TODO'daki madde: *"Oyuncu iki görünüm arasında seçebilsin; tercih saklansın. Üstte kategori sekmeleri, seçilen kategorinin binaları altta kart olarak açılır; oyuncu binayı köy görselinden değil karttan seçer ve NE SEÇTİĞİNİ NET GÖRÜR."*

**YENİ PANEL YAZILMADI — yalnız binaya ULAŞMA YOLU değişti.** Karta basmak hex'e basmakla aynı şeyi yapıyor (`setSelected(slotKey)`); açılan panel, kuyruklar, işçi atama, yükseltme hepsi aynı kod. İkinci bir panel yazsaydık her yeni bina özelliği iki yerde bakım isterdi — bu projede "aynı şey iki yerde" hatası defalarca patladı. Panel zaten ekranın ORTASINDA açılıyor (`center: true`), yani kartın nerede olduğunun bir önemi yok.

**TODO'daki dört açık soru, gerekçeleriyle kapatıldı:**
1. **Seçim köy ekranının İÇİNDE**, üst barda değil. Üst bar bütün sekmelerin ortak alanı; yalnız köy ekranını ilgilendiren bir tercih orada başka ekranlarda da görünen ölü bir düğme olurdu.
2. **Kategori sekmeleri yatay kaydırmalı şerit**, açılır liste değil: kategori sayısı az (en çok sekiz) ve şerit tek dokunuşla geziliyor; açılır liste her kategori değişimine fazladan bir tık eklerdi.
3. **Boş alanlar HALKAYA göre sıralı** — üretim çarpanı halkaya bağlı, merkeze yakın slot daha değerli. Anahtar sırası oyuncuya hiçbir şey söylemeyen bir koordinat yığını olurdu.
4. **Varsayılan ekrana göre**: telefonda (< 760 px) kart, masaüstünde hex. Oyuncu bir kez seçim yaparsa `localStorage`'a yazılıyor ve varsayılanı eziyor — tercihi cihaz adına yeniden yorumlamak, seçimini her açılışta geri almak olurdu.

**Kararlar.**
- **Kart görünümünde hex sahne HİÇ ÇİZİLMİYOR**, gizlenmiyor: sahne yüzlerce SVG düğümü, pinch/pan dinleyicileri ve her karede dönen bir dönüşüm demek — telefonda asıl kazanç onu hiç çizmemek.
- Kap (container) korunuyor çünkü **bina paneli onun İÇİNDE**; kabı koşullu çizmek paneli de götürürdü. Koşullu olan yalnız sahne (svg + yakınlaştırma + hover kartı + kategori anahtarı).
- Kart modunda **pinch/pan ve flex ortalama kapalı**: kabın dokunma dinleyicileri listenin kaydırmasını yutardı, flex ortalama listeyi dikeyde ortalayıp üstünü kırpardı.
- Yalnız **dolu kategoriler** sekme oluyor — boş sekme tıklanacak bir yalan.
- Kartta görsel tam genişlik (panelin posteri gibi), ad ve seviye görselin ÜSTÜNDE: altına yazsaydık göz her kartta aşağı inip geri çıkardı. Açık görsellerde okunurluk için alttan yukarı koyulaşan bir şerit var (eşya kartlarındaki çözümün aynısı).
- `railInset` listeye iç kenar boşluğu olarak veriliyor: köy ekranının solunda kaynak, sağında nüfus şeridi sahnenin üstünde duruyor ve tam genişlik kullanan liste altlarına giriyordu (tarayıcıda görüldü). Sabit sayı yazsaydık şerit genişliği değiştiğinde ikisi ayrışırdı.

- **TARAYICIDA DOĞRULANDI**: masaüstünde sekmeler "HEPSİ 21 · MERKEZ 1 · İŞLEME 6 · SAVUNMA 5 · DEPO 4 · BOŞ ALAN 21" olarak çıktı; Değirmen kartına basınca bina paneli birebir aynı açıldı (poster, kadro çubuğu, açıklama). Boş alan sekmesi halkaya göre sıralı. **375 px'te kayıtlı tercih yokken varsayılan kart görünümü geldi** ve kartlar tam genişlik, parmak boyunda çıktı. Konsolda hata yok.
- Telefonda ölçülüp düzeltilen bir ayrıntı: sekme sayıları bir sonraki etikete yapışık okunuyordu ("HEPSİ 21MERKEZ"); sayı ayrı bir soluk rozete alındı ve sekme aralığı büyütüldü.

### Kahraman sefere neden katılmıyor — üç hata (17 Eylül 2026)
- İlkan: *"başka bir köye saldırırken kahramanımı da gönderdiğimde saldırı bonusu orduya yansıyor mu, kesin kontrol yap. bir de kahramanı şu an saldırıya ekleyemiyorum, başka köyde diyor."*

**SORU 1: BONUS YANSIYOR MU? — EVET, ÖLÇÜLDÜ.** Aynı savaş kahramanlı ve kahramansız çözülüp sayılar karşılaştırıldı (200 fjordvakt + 100 nordkamper → 150 fjordvakt, sursuz):

| katkı | ölçüm |
|---|---|
| Saldırı Puanı (ham güç) | ordu toplamına **birebir** ekleniyor: 13.300 → 13.552 (+252) |
| Saldırı Bonusu (yüzde) | ordunun **TAMAMINI** çarpıyor: %10 → ×1,1000 · %25 → ×1,2500 · %50 → ×1,5000 (tam) |
| ikisi birlikte | (ordu + kahraman) × yüzde — yani yüzde kahramanın **kendi gücünü de kapsıyor**: 16.940 = (13.300 + 252) × 1,25 |
| savaşa etkisi | saldıran kaybı 59 → **41** |

- **ÖNEMLİ KAYIT — İlkan'ın kahramanında ordu yüzdesi %0.** Sebebi hata değil: yüzde `saldiriBonus` SKİLİNDEN geliyor (puan başına %0,2, tavan %20) ve kahramanda **300 skil puanı dağıtılmamış** duruyor. Puan dağıtılmadan kahraman yalnız kendi vuruşunu (252) ekliyor. Oyuncunun "bonus yansıyor mu" sorusunun asıl cevabı bu.
- **Kilit**: `kahraman-saldiri-bonusu.test.js` 7 test — ham gücün birebir eklenmesi, yüzdenin ORDUNUN TAMAMINA uygulanması, ikisinin sırası, savaş SONUCUNUN değişmesi, atlı kahramanın gücünün süvari tarafına yazılması, raporda ayrı satır, ve sıfır bonusun hiçbir şeyi değiştirmemesi.

**SORU 2: "BAŞKA KÖYDE" — ÜÇ AYRI HATA ÇIKTI.**

1. **Kural ÜÇ yerde elle yazılıydı ve ayrışmıştı** (istemcide bir, sunucuda iki). İstemci *"usSlot doluysa ve farklıysa engelle"*, sunucu *"usSlot mySlot'a EŞİT olmalı"* diyordu. Konağı olmayan kahramanda (`usSlot = null`) istemci kutuyu **açık** gösteriyor, sunucu kahramanı **almıyordu**. Bu oturumda "aynı kural iki yerde" sınıfından **sekizinci** hata. Artık tek kaynak: `HERO.seferEngeli()`.
2. **Sunucu kahramanı SESSİZCE düşürüyordu.** Uygun değilse sefer kahramansız gidiyor ve oyuncuya hiçbir şey söylenmiyordu — kahramanını yolladığını sanıp savaşı kahramansız veriyordu. Seferi iptal etmemek doğru (ölü kahraman yüzünden saldırıyı çöpe atmak olurdu) ama **susmak** değil. Sebep artık `army_sent` ile dönüyor ve gönderim ekranında sarı kutuda yazıyor.
3. **Kahraman bulunduğu köyden çıkamıyordu.** Kural "yalnız konağın olduğu köyden" idi; kahraman kendi başka köyüne takviyeye gönderilebiliyor ama oradan sefere çıkamıyordu, tek çıkışı geri çağırmaktı. Artık **fiilen bulunduğu** köyden yürüyor (`bulunduguSlot` = takviyedeyse misafir olduğu köy, değilse üssü). Başkasının köyünde misafirken yine çıkamıyor — zaten oradan sefer gönderilemez, yani o dal kendiliğinden kapalı. Yola çıkarken ev sahibi köydeki misafir kaydı siliniyor, yoksa o köy olmayan bir kahramanın savunma bonusunu almaya devam ederdi.
- Ayrıca uyarı artık **hangi köy** olduğunu adıyla söylüyor ("Bergsund köyünde — sefer oradan çıkmalı"); eskiden "Başka köyde" deyip bırakıyordu ve oyuncu kahramanını aramak için köyleri tek tek geziyordu.

- **Kilit**: `kahraman-sefer-engel.test.js` 8 test — her dal (ev/başka köy/takviye/sefer/macera/dönüş/ölü/konaksız), slot verilmediğinde yalnız durum sorgulanması ve özetin `bulunduguSlot` taşıması.
**DÖRDÜNCÜ VE ASIL HATA: SALDIRI TAHMİNİ KAHRAMANI HİÇ SAYMIYORDU.**
- İlkan: *"saldırı bonusu olması lazım, 24 puan verdim kahramana."*
- `simulate_battle` kahramanla ilgili **tek bir parametre almıyordu**: ne ham güç, ne ordu yüzdesi, ne süvari sınıfı, ne eşya birim bonusu. Oyuncu gönderim ekranında kutuyu işaretliyor, tahmindeki sayılar **kıl payı değişmiyor** ve haklı olarak "bonus yansımıyor" diyordu. Savaşın kendisi doğruydu — **tahmin yalan söylüyordu**, ki bu daha kötüsü: oyuncu kararını tahmine bakarak veriyor.
- **Güç SUNUCUDA hesaplanıyor**, istemciden gelmiyor: istemci yalnız "kahramanı götürüyorum" diyebiliyor. Bonusu istemciden alsaydık uydurulmuş bir kahraman gücüyle tahmin istenebilirdi — üstelik tahmin ekranı hedefin savunmasını da gösterdiği için bu bilgi sızdırırdı.
- **Uygunluk aynı tek kaynaktan** (`HERO.seferEngeli`): kahraman o köyden çıkamıyorsa tahmine de girmiyor. Yoksa tahmin kahramanlı, gerçek sefer kahramansız olurdu — tam da düzeltilmeye çalışılan yanılgı.
- İstemcide `kahramanYuruyor` tahmin efektinin bağımlılığına eklendi: kutu değişince tahmin yeniden isteniyor.

**BONUS EĞRİSİ DEĞİŞMEDİ** (İlkan'ın kararı: *"bonus böyle kalsın"*). Kayıt için ölçülen değerler: `saldiriBonus` puan başına %0,2, tavan %20 — yani 24 puan **%4,8**, tavan için 100 puan gerekiyor. Oyuncunun "bonus yok" hissinin sebebi eğri değil, tahmin ekranının yalan söylemesiydi.

- **TARAYICIDA DOĞRULANDI**: kahramanlı sefer isteği gönderildi, sunucu `kahramanAtlandi: "konak_yok"` döndürdü ve sefer yine gitti — sessiz düşme bitti. Paket `usSlot`, `misafirSlot` ve `bulunduguSlot` alanlarını taşıyor.

### Elçilik birliğin merkezi oldu — diplomasi, günlük, profil, istatistik (17 Eylül 2026)
- İlkan: *"elçilik binasına birlik ile alakalı her şeyi ekle. travianda ne varsa bizim elçilikte de olsun. benzer oyunlara da bak."*

**ÖNCE SAYIM.** Travian'ın (ve Tribal Wars'ın) ittifak ekranında olup bizde olmayanlar çıkarıldı:

| Travian'da var | Bizde durum |
|---|---|
| Üye listesinde nüfus, köy, saldırı/savunma puanı, çevrimiçi | **eklendi** |
| İttifak profili / tanıtım metni | **eklendi** |
| Diplomasi (konfederasyon · saldırmazlık · savaş) | **eklendi** |
| İttifak günlüğü | **eklendi** |
| İttifak sıralaması ve toplam güç | **eklendi** |
| İttifak forumu | **zaten vardı** — konulu grup mesajları (16 Eylül) |
| Esnek yetki tablosu (pozisyon başına kutucuk) | **yapılmadı** — üç rütbe yetiyor, bkz. aşağıda |
| İttifak bonusu (kaynak bağışıyla açılan seviyeler) | **yapılmadı** — denge kararı gerekiyor, bkz. aşağıda |

**DİPLOMASİ — üçlü, Travian'la aynı.**
- **Konfederasyon** ve **saldırmazlık** KARŞILIKLI: teklif edilir, karşı tarafın Konung'u cevaplar.
- **Savaş TEK TARAFLI.** Onaya bağlasaydık hiç kimseye savaş ilan edilemezdi — düşman sadece "kabul etme"yi seçerdi. Savaş bir anlaşma değil, bir bildirimdir.
- **İki birlik arasında TEK ilişki** ve benzersizlik ŞEMADA (`UNIQUE (a_id, b_id)`): "hem müttefikiz hem savaştayız" okunamaz bir durum olurdu. Yeni hamle eskisinin üzerine yazıyor; saldırmazlığı olan bir birliğe savaş ilan etmek anlaşmayı da bozuyor ve bu **iki tarafın da günlüğüne** geçiyor.
- **Çift normalleştirilmiş**: küçük kimlik her zaman `a_id`. Yoksa (3,7) ve (7,3) iki ayrı satır olur ve iki birlik aynı anda hem müttefik hem düşman görünürdü. Yön bilgisi `teklif_eden_id`'de duruyor.
- **Teklifi yalnız KARŞI taraf cevaplayabiliyor.** Gönderen kendi teklifini kabul edip ilişkiyi tek başına kurabilseydi karşılıklılık diye bir şey kalmazdı. Tarayıcıda denendi: `senin_teklifin` ile reddedildi ve ilişki teklif olarak kaldı.
- **Anlaşmayı bozmak onay istemiyor**: karşı tarafın rızasına bağlasaydık kimse konfederasyondan çıkamazdı. Bozan taraf iki günlüğe birden yazılıyor — bedeli itibar.
- **Diplomasi yalnız Konung'un.** Jarl davet eder ve üye atar ama savaş ilan edemez: savaş bütün birliği bağlayan, geri alınması pahalı bir karar; iki yetkiliye vermek birliği ikiye bölerdi. (Travian'da da ayrı bir yetki.) **Profil ise Jarl'a açık** — geri alınabilir bir metin, Konung'a kilitlemek tanıtımı tek kişinin çevrimiçi olmasına bağlardı.
- **ANLAŞMA KALKAN DEĞİL**: saldırmazlık saldırıyı ENGELLEMİYOR, söz veriyor. Birlik içi saldırının serbest olmasıyla aynı çizgi ve ekranda sarı kutuda yazıyor — oyuncu anlaşmaya güvenip savunmasını ihmal ederse bu bizim hatamız olur.

**GÜNLÜK.** `alliance_log`; metin SUNUCUDA üretiliyor (istemciye yazdırmak, oyuncuya birliğin geçmişini yazdırmak olurdu). Kayıt **işlemin içinde** yazılıyor, çağrı yerinde değil: index.js'te yazsaydık her yeni çağrı yerinde "burayı da ekle" kuralı olurdu ve er geç unutulurdu — birliğin hafızasında sessizce delik açan bir hata. Bunun için servise ad okuyucu enjekte edildi (`baglaAdOku`), veritabanının enjekte edildiği gibi. Günlük yazımı **hata yutuyor**: kayıt bir kural değil, yazılamadıysa işlem yine geçerli olmalı.

**İSTATİSTİKLER SIRALAMA İLE AYNI KAYNAKTAN.** Oyuncu-köy toplayıcı tek yere çıkarıldı (`oyuncuKoyleriniTopla`); ikinci bir toplayıcı yazsaydık sıralamadaki nüfusla elçilikteki nüfus er geç ayrışırdı. **Çevrimdışı üyeler de sayılıyor** (diskteki son hâlleriyle): birliğin gücü kimin o an bağlı olduğuna göre değişmemeli.

**NE PAKETTE, NE İSTEK ÜZERİNE** — ayrım bilinçli:
- **Pakette**: birlik kimliği, üyeler, rütbeler, açıklama, **çevrimiçi bayrağı**. Çevrimiçi bilgisi oturum tablosundan geliyor, yani bedava; "kim şu an burada" da ekranın en çok bakılan bilgisi.
- **İstek üzerine**: istatistikler, günlük, birlik listesi. Üçü de veritabanına gidiyor; her yayına koymak saniyede birkaç kez bütün köy tablosunu okumak olurdu. Delta paketinin ucuz kalması bu oyunun taşıyıcı kararlarından biri.
- Parmak izine açıklama UZUNLUĞU ve çevrimiçi üye SAYISI eklendi (metnin kendisi değil): profil yazılınca ya da biri girip çıkınca yayın olsun ama 600 karakterlik metin her karşılaştırmada dizeye katılmasın.

**DİPLOMASİ DEĞİŞTİ DÜRTMESİ.** Liste istek üzerine geldiği için hamleden sonra ekran eski kalıyordu; daha kötüsü teklifi ALAN tarafta hiçbir şey belirmiyordu, yani teklif pratikte kayboluyordu (tarayıcıda ölçüldü). Sunucu iki birliğin üyelerine tek bir "değişti" olayı yolluyor, listeyi istemci kendisi tazeliyor — listeyi itmek her alıcı için ayrı hesap demekti.

**YAPILMAYANLAR ve gerekçeleri:**
- **Esnek yetki tablosu** (Travian'da pozisyon başına kutucuk): üç rütbe (Konung · Jarl · Karl) ve sabit yetkiler şimdilik yetiyor. Kutucuklu tablo, yetkiyi iki yerde (sunucu kuralı + kayıt) tutmak demek; mevcut tek kaynak (`yetkiler()`) bozulurdu.
- **Birlik bonusu** (kaynak bağışıyla açılan seviyeler): denge kararı gerekiyor — hangi bonus, hangi eğri, hangi maliyet. İlkan'a sorulacak; kod tarafı hazır (günlük, üyelik, veritabanı deseni yerinde).

**Bulunan iki hata (ikisi de "iki sürüm ayrıştı" sınıfı, bu oturumda altıncı ve yedinci):**
1. `loadAlliances` birlik AÇIKLAMASINI db.js'te taşıyor, db.dev.js'te düşürüyordu — profil kaydediliyor, günlüğe yazılıyor ama ekranda hiç görünmüyordu. Tarayıcıda yakalandı.
2. Diplomasi hata kodlarının Türkçesi yoktu; oyuncu ekranda `senin_teklifin` yazısını görüyordu. Tarayıcıda yakalandı.
- **Kilit**: `db-ikizleri.test.js` — iki veritabanı sürümünün dışa verdiği işlev kümesi birebir aynı olmalı, birlik/grup ailesi tam olmalı, dev yükleyicisi açıklamayı taşımalı ve `BOS_DB` bütün tabloları içermeli.

- **Testler**: `birlik-diplomasi.test.js` 11 kilit (üçlü ilişki, karşılıklılık, yetki, kendi birliğiyle ilişki, kendi teklifini kabul, açıklama doğrulama, günlük türleri) + `db-ikizleri.test.js` 4 kilit.
- **TARAYICIDA UÇTAN UCA DOĞRULANDI**: saldırmazlık teklif edildi → "SALDIRMAZLIK · yollandı" rozeti; kendi teklifini kabul denemesi `senin_teklifin` ile reddedildi ve ilişki değişmedi; savaş ilan edildi → bekleyen teklifin yerine geçti ve ANINDA yürürlüğe girdi; savaş bitirildi → ilişki silindi. Günlükte yedi kayıt doğru metinlerle; profil metni paragraflarıyla çizildi; sıralama "2 birlik içinde 2. sıra" yazdı; üye satırında çevrimiçi noktası ve "2 köy · 122 nüfus · 1/6" göründü.

### Görev zincirine kahraman adımları tamamlandı (16 Eylül 2026)
- TODO'da bekleyen madde: *"iki tanesi eklendi (konağı kur, seviye 3), macera ve eşya gelince ikisi daha eklenmeli."* İkisi de artık oyunda, adımlar eklendi.
- **"Yola Çık"** (`ilkMacera`) — ilk macerayı TAMAMLA. **Biriken haktan (`maceraSayisi`) ölçülmüyor**: haktan ölçseydik macerayı yola çıkarmak görevi bitirirdi ve oyuncu ödülü sonucu görmeden alırdı; maceranın öğrettiği şey tam da sonucu. Bunun için yeni bir sayaç geldi: `maceraTamamlanan` (yalnız artıyor, hak harcandıkça azalıyor — ikisi ayrı kavram).
- **"Kuşan"** (`ilkKusam`) — bir eşyayı SLOTA TAK. **Envanterden ölçülmüyor**: envanteri saysaydık eşyanın düşmesi yeterdi ve görev, oyuncuya asıl öğretmek istediği hareketi yaptırmadan biterdi. Eşya çantada dururken hiçbir bonus vermiyor; "eşyam var ama kahramanım güçlenmedi" hâli tam olarak bu yüzden oluşuyordu.
- İkisi de **yan hedef** (`zorunlu: false`), zincirin kahraman kolunun geri kalanı gibi: kahraman güçlü ama oyunu oynamak için şart değil.
- Eski kayıtlarda `maceraTamamlanan` yok; `duzelt()` sıfırlıyor — yoksa `undefined + 1` NaN üretir ve görev bir daha asla tamamlanmazdı. Geçmiş maceralar geri sayılmıyor (sayılamaz da), ama yan hedef olduğu için kimsenin ilerlemesi geri gitmiyor.
- **Testler**: `gorev-kahraman.test.js` 5 kilit — iki adımın zincirde ve yan hedef olduğu, yoldaki maceranın tamamlanmış sayılmadığı, çantadaki eşyanın kuşanılmış sayılmadığı, kahramanı olmayan oyuncuda ölçümün çökmeden sıfır döndüğü (koşullar her `emitVillage`'da ölçülüyor; fırlatırsa oyuncunun bütün paketi giderdi) ve eski kaydın sıfırdan başladığı.

### Grup mesajlaşması — konulu, çok kişili (16 Eylül 2026)
- İlkan: *"mesajlaşmalarda yeni bir msj kısmı oluştur birlik oyuncuları için. yeni msj grubu oluşturulabilsin bu bir kişi yada birden fazla kişi olabilsin yada direk birlik seçilebilsin. msj gruplarında konu yazılabilmeli. mesele defans konulu bir birlik içi toplu msj laşma yapılabilmeli."*

**İKİ TİP GRUP, TEK TABLO.**
- **ÖZEL** — üyeler kuruluşta seçiliyor, sabit kalıyor. Tavan **20 kişi**: tek istekle yüzlerce kişiye bildirim göndermek bir spam aracı; sayı birlik tavanının (60) altında bilerek tutuldu ki kalabalık yazışmanın yolu birlik olsun.
- **BİRLİK** — üye listesi **YOK**; katılımcılar her okumada birliğin O ANKİ üyeleri. Birliğe katılan konuyu hazır buluyor, birlikten çıkan erişimini aynı anda kaybediyor. Üyeler kuruluşta kopyalansaydı **birlikten atılan biri savunma yazışmasını okumaya devam ederdi** — kozmetik bir tutarsızlık değil, güvenlik açığı.
- **Aynı birlik için birden çok konu açılabilir.** İlkan'ın örneği ("defans konulu") tek bir birlik kanalı değil, KONUYA göre ayrılmış yazışma istiyor; tek kanal olsaydı savunma çağrısı sohbetin içinde kaybolurdu.

**Kararlar.**
- **Okundu takibi mesaj başına değil, `okundu_id` (son okunan kimlik) üzerinden.** Altmış kişilik bir grupta her mesaj için üye başına satır yazmak tek mesajda altmış yazma demekti. "Nereye kadar okudum" tek sayı; akış zaten sıralı. Geri gitmiyor (`GREATEST`): birkaç sekme açıkken eski kimlik gelip okunmuş sohbeti yeniden okunmamış gösteriyordu.
- **Hız sınırı doğrudan mesajla ORTAK.** Ayrı sayaç olsaydı grup, mesaj sınırını aşmanın yolu olurdu — üstelik tek mesajla altmış kişiye ulaşan bir yol.
- **Engelleyen kişi gruba sessizce alınmıyor.** Hata döndürmek "seni engelledi" demek olurdu; doğrudan mesajda da engel sessiz çalışıyor.
- **Erişim her istekte yeniden hesaplanıyor**, oturuma yazılmıyor: birlik üyeliği her an değişiyor ve birlik yazışması bir güvenlik sınırı.
- **Liste tek sorguda** geliyor (son mesaj + okunmamış sayısı dahil, LATERAL birleşim). Grup başına ayrı sorgu N+1 olurdu: on gruplu bir oyuncu ekranı her açtığında yirmi bir sorgu.
- Birlik grubundan **tek tek ayrılmak yok**: izin verseydik "birlikte ama grubu görmeyen üye" hâli doğar ve Konung'un "herkese duyurdum" varsayımı yalan olurdu. Grubu yalnız kuran dağıtabilir.

**Mimari** (birlik sistemiyle aynı desen): `game/mesajGrup.js` saf kurallar · `db.js`/`db.dev.js` üç tablo (`message_threads`, `thread_members`, `thread_messages`) aynı sözleşmeyle · `index.js` yedi soket olayı · `components/GroupMessages.jsx` ayrı ekran, `MessageScreen` içinde KİŞİLER/GRUPLAR sekmesi. İki liste bilerek karışmıyor: grup yazışmasında yanlış yere yazmak bir savunma planını düşmana yazmak olabilir.

- **Testler**: `mesaj-grup.test.js` 10 saf kural + `mesaj-grup-uctan.test.js` 6 uçtan uca (yabancı ne listede görüyor ne akışı çekebiliyor ne yazabiliyor; yazamadığı VERİDE de doğrulandı, okunmamış sayısı alıcıda 1 yazanda 0, ayrılan ve dağıtılan gruplar).
- **TARAYICIDA DOĞRULANDI**: birlik grubu kuruldu ("Defans çağrısı" · yeşil şerit · "Birlik yazışması · Kuzey Kurtları · 1 üye"), mesaj yazıldı ve akışta çıktı; arama ile iki oyuncu seçilip özel grup kuruldu ("Kuzey sınırı nöbeti" · 3 kişi). Konsolda hata yok.
- Ek düzeltme: sohbet ve grup satırlarında `border` + `borderLeft` kısayolları karışıyordu (React uyarısı, sol şerit sıraya bağlı kalıyordu); dört kenar ayrı yazıldı.

### Taze dev veritabanı eksik tablolarla açılıyordu (16 Eylül 2026)
- Grup testleri her koşumda TEMİZ bir veri dosyasıyla başladığı için ortaya çıktı: varsayılan tablolar İKİ YERDE tanımlıydı (`let db = {...}` ve `load()` içindeki `||=` satırları) ve ayrışmıştı — `alliances`, `allianceMembers`, `allianceInvites` yalnız ikinci dalda vardı.
- **Sonuç**: veri dosyası hiç yokken `loadAlliances()` tanımsız diziye `.map` çağırıyordu. **Ölçüldü**: eski kodda taze dosyayla "Cannot read properties of undefined (reading 'map')", düzeltmeden sonra sorunsuz açılıyor. Yerelde görünmüyordu çünkü herkesin dosyası çoktan oluşmuştu.
- Artık tek kaynak: `BOS_DB()`. Dosya varsa üzerine okunuyor, eksik alanlar şemadan tamamlanıyor.
- *Bu oturumda "aynı değer iki yerde" sınıfından **dördüncü** hata: asker yemi, inşa red sebebi, depo tavanı, dev şeması — beşincisi de aynı gün çıktı (amblem/statics).*

### Üretim zinciri: duran bina sebebini söylüyor (16 Eylül 2026)
- İlkan: *"depoda tahıl var ama tahıl üretimim yok, o yüzden değirmen depodaki tahılı kullanıp un üretmiyor... depodaki hammaddeleri işlemesi lazım, bu mantık her üretim için geçerli."*
- **ÖLÇÜLDÜ: değirmen DEPODAKİ tahılı zaten işliyordu** — tarlada sıfır işçiyle 900 tahıldan 471 un çıktı. Yani kural doğruydu, görünen davranış yanlıştı. Üç gerçek sebep vardı:
  1. **Ambar tahıla göre beş kat küçüktü**: tahıl tavanı ayrı, un+ekmek tavanı ayrı ve çok daha alçaktı; değirmen birkaç saatte tavanı doldurup duruyordu. Ambar tabanı 2.500 → **6.000**, seviye başına 1.250 → **3.000**.
  2. **Duruş sebebi hiçbir yerde yazmıyordu.** `tick.js` artık her işleme binasına `duraklama` bayrağı yazıyor (`girdi_yok` | `depo_dolu`) ve bina kartı bunu çiziyor — depo dolu SARI (iyi sorun: ürettin, yerin bitti), girdi yok KIRMIZI (zincir kopmuş, tarlaya işçi lazım). Sebep ortadan kalkınca kendiliğinden temizleniyor.
  3. **Depo tavanı İKİ YERDE hesaplanıyordu** ve ayrışmıştı: ekranda kereste için 200 yazarken gerçek tavan 800'dü. `payload.js` artık `getStorageCaps` kullanıyor. — *Bu, bu oturumda aynı sınıftan ÜÇÜNCÜ hata (asker yemi, inşa red sebebi, depo tavanı). Ortak ders: bir sayı iki yerde hesaplanıyorsa er geç ayrışıyor.*

### Elçilikte oyuncu listesi ve arama (16 Eylül 2026)
- İlkan: *"elçilikte oyuncular listelensin ve ben oyuncular arasında arama yapabileyim."*
- Eskiden davet için adı **tam** yazmak gerekiyordu; adı bilmiyorsan kimseyi davet edemiyordun.
- **Arama SUNUCUDA** (`birlik_oyuncu_listesi`), sonuç 60 satırla sınırlı. Hepsini gönderip istemcide süzmek, oyuncu sayısı büyüdükçe her elçilik açılışında bütün tabloyu indirmek olurdu. Tuş başına istek atmamak için 250 ms gecikme — pazar teklif aramasıyla aynı.
- **Sıralama davet edilebilirliğe göre**: birliği olmayanlar üstte. Oyuncunun sorduğu şey "kimi çağırabilirim".
- **Satırın kendisi durumu söylüyor** (`davetli` / `başka birlikte` / `birliğinde` / `birlik dolu`); hiçbir satır tıklanıp sunucudan hata almıyor.
- **TARAYICIDA DOĞRULANDI**: panel "3 oyuncu" yazdı, satırlar köy sayısı ve durumla çıktı; "rag" → 1 sonuç, "zzz" → "Bu ada uyan oyuncu yok", kutu temizlenince 3'e döndü.

### Birlik kurarken amblemler kayboluyordu (16 Eylül 2026)
- İlkan: *"birliğin amblemini göremiyorum birlik kurarken."*
- **Sebep**: `birlikTanim` (amblem listesi, rütbeler, ad sınırları) yalnız `statics` paketinde doluyor ama `STATIC_PAYLOAD_KEYS` listesinde değildi. Delta pakette `null` olarak gidiyor ve istemci geleni öncekinin ÜZERİNE birleştirdiği için kaydedilmiş listeyi eziyordu. Bağlantıdan birkaç saniye sonra elçiliği açan oyuncu **hiçbir amblem karesi** görmüyordu.
- **Düzeltme**: anahtar listeye eklendi — delta pakette artık `null` yazılmıyor, anahtar tamamen **siliniyor**, yani istemcideki kopya yerinde kalıyor.
- **Kilit**: `sabit-tanim-paketi.test.js` — `index.js`'in kaynağını okuyup `statics ? {...}` ile yazılmış HER alanın listede olmasını şart koşuyor. Düzeltme geri alınarak testin kırmızıya döndüğü doğrulandı. (Yine "tanım iki yerde" sınıfı: koşul index.js'te, liste payload.js'te.)
- **ÖLÇÜLDÜ**: düzeltmeden önce delta pakette `birlikTanim: null`; sonra anahtar pakette hiç yok.

### Eşya kartı geri geldi, nadirlik renginde (16 Eylül 2026)
- İlkan: *"kahraman itemlerinin üzerine gelince 'çıkarmak için tıkla' yazısını kaldır, itemin özellikleri geri yaz ama itemin nadirlik rengi ne ise o renkte yaz"* ve *"itemin üzerine gelince kullanılır yazıyor onu sil."*
- **BENİM REGRESYONUM**: görseli kareye sığdırırken hücreye `overflow: hidden` koymuştum (köşe yuvarlaması için); kart hücrenin YANINA açıldığı için kırpılıp tamamen görünmez olmuştu. Geriye yalnız tarayıcının tek satırlık `title` balonu kalmıştı. Kırpma görselin kendi `borderRadius`ına taşındı.
- Dolu slotta `title` kaldırıldı (kart zaten her şeyi gösteriyor); **boş** slotta duruyor — orada kart yok.
- Kart artık nadirlik renginde: zemin, kenar ve yazılar `color-mix` ile o rengin tonlarında, bonus değeri tam renkte. Rengi bilmeden beyazla karıştırdığımız için nadirlik paleti değişirse burası kendiliğinden uyuyor.
- **"Kullanılır" satırı silindi**: `kusanilanOzeti` `slotAd` alanını hiç doldurmuyordu, yani KUŞANILMIŞ her eşya bu yedek yazıya düşüyordu — kalkanın altında "Kullanılır" yazıyordu.

### Yeni binaya işçi tavanı sessizce reddediliyordu (16 Eylül 2026)
- Elçiliği kurmaya çalışırken çıktı: `build_village` `isci > MAX_BUILDERS(0)` ise reddediyor (yeni bina için tavan **2**) ama `buildRefusalReason` bu dalı hiç taşımıyordu — oyuncu "İnşa edilemedi." diye sebepsiz bir cümle görüyordu.
- Artık "Yeni bir binaya en fazla 2 inşaat işçisi verilebilir." diyor. (Bugünkü kaynak sebebi düzeltmesiyle aynı sınıf hata: sessiz red oyuncuyu çaresiz bırakıyor.)

### Otomatik deploy dosyaları silindi (16 Eylül 2026)
- `deploy/tranord-otomatik.timer` (`OnUnitActiveSec=5min`), `tranord-otomatik.service`, `otomatik-guncelle.sh`, `otomatik-kur.sh` — dördü de silindi (İlkan'ın kararı). Pi'ye hiç kurulmamışlardı ama depoda durmaları ileride biri `otomatik-kur.sh` çalıştırdığında sürpriz olurdu. Deploy elle, `sudo tranord-guncelle` ile.


### Moral bonusu tamamen kaldırıldı (16 Eylül 2026)
- İlkan önce *"moral bonusunu bana açıkla"* dedi, açıklandıktan sonra *"moral bonusunu tamamen kaldır"*.
- Kaldırılan: saldıranın nüfusu savunanınkinden büyükse savunana ek savunma yüzdesi (`(a/d)^0,2 − 1`, tavan %50).
- **Somut etki ölçüldü**: 500 Fjordvakt → 200 Spydvakt savunmaya karşı, saldıran on kat büyükken 126 asker kaybediyordu; moral kalkınca eşit nüfusla aynı, **69**. Büyük oyuncunun küçüğe saldırısı ucuzladı — bu bilinçli bir karar.
- **YARIM BIRAKILMADI**: `moralBonusPct`, `MORAL_USTEL`, `MORAL_TAVAN`, savaş çarpanı, tahmin yolundaki hesap ve istemcinin gönderdiği `defenderPopulation` alanı birlikte kalktı. Ölü kod bırakmak "moral var ama çalışmıyor" gibi okunan bir tuzak olurdu — `ODUL_AGIRLIK.esya` tam olarak öyle bir tuzaktı.
- Eski test moral eğrisini kilitliyordu; yerine **sökümün kendisi** kilitlendi: `simulateBattle` bilinmeyen bir seçeneği sessizce yok sayar, yani biri `moralPct` göndermeye devam etse hiç hata almaz ve "çalışıyor" sanırdı. Yeni test `moralPct: 50` ile `{}` sonucunun AYNI olduğunu ve fonksiyonun dışarı verilmediğini ölçüyor.

### Göçmenler yok olmuyor, eve dönüyor (16 Eylül 2026)
- İlkan: *"göçmenler vardığında arazi doldu ise geri dönmeye başlasınlar, yok olmasınlar. bana rapor gelsin köy kurulamadı diye."*
- Eski kural: slot bu arada dolmuşsa göçmenler siliniyordu. Göçmen köşk/saray Lvl 10 istiyor, 240 dk eğitiliyor, üçü birden gerekiyor — oyuncunun hatası olmayan bir sebeple saatlerce biriktirilen yatırım gidiyordu.
- Düzeltme: kuruluş başarısızsa sefer siliniyor değil **dönüşe geçiyor** (`phase = 'return'`, `remainingHours = legHours`); eve varınca `resolveReturn` göçmenleri orduya geri katıyor.
- **RAPOR EKRANINDA İKİ AYRI HATA BULUNDU** (ikisi de bu maddeden bağımsız duruyordu):
  1. `verdictOf` yerleşim sonuçlarını (`koy_kuruldu`, `arazi_dolu`) hiç tanımıyordu; ikisi de kazanan/kaybeden testine düşüyor ve `winner: 'none'` olduğu için **"kaybettin"** yazıyordu — köyü BAŞARIYLA kurduğunda bile.
  2. Raporun `message` alanı ReportScreen.jsx'te **hiç çizilmiyordu** (dosyada tek geçişi bile yok). Yani "arazi doldu" açıklaması yazılıyor ama oyuncuya hiçbir zaman ulaşmıyordu.
- **AÇIK KALAN**: dönüş dalının kendisi otomatik testle kaplı değil. Başarısızlık ancak "sefer yoldayken araziyi başkası kapar" durumunda oluşuyor ve bunu canlı soket testinde kurmak iki hesabın zamanlamasını gerektiriyor. Kod gözden geçirildi, kalıp mevcut dönüş kurulumlarıyla birebir aynı.

### Ekipman yükseltme süreleri uzatıldı (16 Eylül 2026)
- İlkan: *"ekipman update lerini uzat şu an çok kısa."*
- **ÖLÇÜM ASIL SEBEBİ GÖSTERDİ**: tablodaki ham dakika yanıltıcı, gerçek süre `equipmentUpgradeMinutes(lvl) / işçi` (tick.js) ve silahçı seviye başına 3 işçi alıyor — Lvl 20'de 60 işçi. Eski değerlerle (taban 20, adım 1,25) **30 işçili atölye tam Lvl 20'yi 23 dakikada** bitiriyordu; 60 işçiyle 11 dakika.
- Yeni: taban **20 → 60** oyun dakikası, adım **1,25 → 1,35**. Ölçüldü (10× hız): 30 işçiyle tam Lvl 20 **3,8 saat**, son seviye **1 saat**, 60 işçiyle tam set 1,9 saat, dört ekipmanın hepsi 15,4 saat.
- Erken oyun korundu: Lvl 1 atölyede (3 işçi) ilk yükseltme hâlâ 2 gerçek dakika.
- Adım 1,35 oyunun standart 1,28'inden **bilerek** sapıyor: 1,28 ile tam set 1,6 saatte bitiyor, sorunun ancak yarısı çözülüyordu. Gerekçe ekipmanın ordu geneline işlemesi — bina seviyesi tek binayı, ekipman seviyesi bütün orduyu büyütüyor.
- Maliyet tablosuna dokunulmadı (İlkan yalnız süreleri istedi).
- Test HAM SABİTİ değil **oyuncunun gördüğü süreyi** kilitliyor: 30 işçiyle tam yol 20-60 oyun saati aralığında, son seviye en az 5 oyun saati, ilk yükseltme en çok 30 oyun dakikası, eğri monoton.

### Pazarda teklif arama ve süzme (16 Eylül 2026)
- İlkan: *"teklif listesinde aramayı yapalım."* (Aynı mesajda teklif SÜRESİ ve tüccar kapasitesi maddeleri **yapılmayacak** diye işaretlendi.)
- Üç süzgeç + bir anahtar: satıcının VERDİĞİ mal · İSTEDİĞİ mal · satıcı adı (metin) · "yalnız karşılayabildiklerim" (kaynağı ve tüccarı yeten teklifler).
- Süzgeç açıkken başlık **"12 / 34"** gösteriyor: yalnız süzülmüş sayıyı yazsaydık oyuncu "teklif kalmamış" sanırdı. Boş sonuçta da "Süzgece uyan teklif yok — N teklif gizli" yazıyor.
- `MalSuzgec` `MalSecici`den AYRI bir bileşen: orada bir kaynak seçilmek zorunda (teklif açıyorsun), burada seçmemek de bir cevap ("hepsi"). Aynı bileşene `null` kabul ettirmek onu iki işin arasında sıkıştırırdı.
- **TARAYICIDA DOĞRULANDI**: tek teklifli listede "casus" aramasında 1 sonuç, "zzzyok" aramasında 0 sonuç + "Süzgece uyan teklif yok" mesajı + başlıkta "0 / 1"; SÜZGECİ TEMİZLE'ye basınca teklif geri geliyor.

### nginx: index.html önbelleği (16 Eylül 2026)
- **Canlıdan ölçüldü**: `curl -sI http://127.0.0.1/` yanıtında yalnız `ETag` ve `Last-Modified` var, **`Cache-Control` YOK**. Böyle olunca tarayıcı kendi buluşsal kuralıyla index.html'i bir süre sormadan önbellekten kullanabiliyor; index.html hangi hash'li dosyanın yükleneceğini söylediği için yeni deploy hiç görünmüyor ("deploy ettim ama değişmedi").
- `deploy/nginx-tranord.conf` şablonuna `location = /index.html { add_header Cache-Control "no-cache"; }` eklendi — yeni kurulumlar (Hetzner) doğru başlasın.
- **Pi'ye elle kurulacak**: parolasız sudo yalnız `tranord-guncelle` ve `tranord-yedek` için tanımlı (`sudo -n -l` ile doğrulandı), nginx dosyası root'a ait. Değiştirilmiş dosya Pi'de `~/tranord-nginx.new` olarak hazır ve `diff` ile doğrulandı (tek fark eklenen blok). Kurulum komutu İlkan'a verildi.

### Otomatik deploy: kurulu DEĞİL (16 Eylül 2026)
- İlkan: *"pi hâlâ 5 dakikada bir deploy yapıyor mu, yapıyorsa kapat."*
- **Dört yer tarandı, çalışan bir şey yok**: systemd timer'ları (16 timer, hepsi sistem işi), `pi` crontab'ı (yok), `/etc/cron.d` (yalnız e2scrub_all + sysstat), bu oturumun zamanlanmış görevleri (yok), Windows zamanlanmış görevleri (eşleşen yok).
- **Kesin kanıt**: `tranord.service` günlüğünde bugünkü her yeniden başlatma elle yapılan deploy'lara denk geliyor (12:57, 13:16, 14:27, 14:37, 15:16, 15:56, 16:20, 17:19, 18:22) — aralar 10-71 dakika, hiçbir yerde 5 dakikalık düzen yok. `NRestarts=0`.
- **Makine depoda DURUYORDU** (`tranord-otomatik.timer` · `OnUnitActiveSec=5min`, `tranord-otomatik.service`, `otomatik-guncelle.sh`, `otomatik-kur.sh`) ama Pi'ye hiç kurulmamıştı — İlkan'ın hatırladığı bu dosyalardı. **Dördü de silindi** (İlkan'ın kararı): kurulu olmayan ama duran bir otomatik deploy, ileride biri `otomatik-kur.sh` çalıştırdığında sürpriz olurdu. Deploy elle, `sudo tranord-guncelle` ile.


### Kahramanın üretim skili düz ek yerine YÜZDE (16 Eylül 2026)
- İlkan: *"kahramanın hammadde üretimine lvl verdiğimde rakam olarak değil yüzde olarak üretimi arttırsın. max seviyede 1000 hammadde üretimi arttırsın."*
- Eski hâli `puanBasina: 3` düz saatlik ek (tavanda +300/sa) ve tarla döngüsünün DIŞINDA, doğrudan kaynağa yazılıyordu. Eğrisi tersti: yeni köyde (altı Lvl 1 tarla ≈ 66 odun/sa) üretimi beşe katlıyor, maxlı köyde %6,5'te kalıyordu — skil tarla yatırımının ödülü değil YERİNE geçiyordu.
- Yeni hâli `puanBasina: 0.2`, `tavanYuzde: 20` — diğer iki yüzde skiliyle aynı şekil, oyuncu tek bir ölçek aklında tutuyor. Çarpan `perHour` üzerinden uygulanıyor (tarla döngüsünün İÇİNDE), yani mesafe cezası ve arazi bonusu hesaba girmiş GERÇEK üretimle orantılı.
- **TAVAN ÖLÇÜLEREK SEÇİLDİ.** Maxlı merkez köy (25 slot, tür başına 5 tarla, Lvl 20) ham kaynak başına ~4.620/saat üretiyor; %20'si **+924/saat** — İlkan'ın istediği "max seviyede 1000" tam buraya düşüyor. (%1000 okunuşu ölçümle elendi: +46.200/saat ederdi.)
- **SONUÇ ÖLÇÜLDÜ** (maxlı köy, tik başına): odun 4.620 → 5.544 (+924), kil 4.435 → 5.322 (+887), taş 4.389 → 5.267 (+878), demir 2.734 → 3.281 (+547). Dördü de tam %20,0. Tahıl 3.024 → 3.024, değişmedi.
- Tahıl bilerek hariç — eski düz ek de tahıla dokunmuyordu. Ekmek oyunun dar boğazı; kahramanı açlığın çaresi yapmak dar boğazı kaldırırdı.
- Alan adı `uretimSaatlik` → `uretimYuzde` olarak DEĞİŞTİRİLDİ (eski ad bırakılmadı): dursaydı tick.js ya da arayüz yanlışlıkla ona bakmaya devam eder, bonus sessizce kaybolurdu. `kahraman.test.js` eski adın artık `undefined` olduğunu da kilitliyor.
- Arayüz metni ve toplam bonus satırı `/sa` yerine `%` gösteriyor. Tarayıcıda doğrulandı: 100 puan verilince "100/100" ve açıklama "+%0,2/puan · tavan %20".

### Misafir ve yoldaki asker ekmek yemiyordu (16 Eylül 2026)
- İlkan: *"askerler desteğe gittikleri köye ulaştıkları an o köyden ekmek yemeye başlarlar. aynı şekilde ben desteğimi geri çektiğim anda da benim köyden ekmek tüketmeye başlarlar. bunu kontrol et öyle değilse düzelt."* **Kontrol edildi, öyle değildi.**
- **Delik 1 — misafir bedava yiyordu.** `getConsumptionRates` (ekranda gösterilen) takviyeleri sayıyordu, ekmeği GERÇEKTEN düşen `processFoodConsumption` saymıyordu. Ölçüldü: 10 kendi + 20 misafir askerli köyde ekran **12,50/sa** diyor, ambardan **7,50/sa** düşüyordu. Ekran doğru sayıyı gösterdiği için hata görünmüyordu; `takviye.test.js`'teki "misafiri ev sahibi besler" kararı da kâğıt üstünde kalmıştı.
- **Delik 2 — yoldaki asker hiçbir yerde yemiyordu.** `createMarch` askerleri `village.army`'den çıkarıyor ve sefer boyunca kimse yemini ödemiyordu. Geri çağırma da askeri ev sahibinin `takviyeler`inden alıp sahibinin `marches`ine koyuyor — yani İlkan'ın "geri çektiğim anda benim köyden yemeye başlasın" dediği an, asker tam da kimsenin beslemediği kümeye geçiyordu. Ayrıca sömürü: orduyu uzun sefere yollayıp ekmek faturasından kaçmak.
- Kural tek cümleye indi: **bir asker her zaman bir köyün ekmeğini yer** — köyde duruyorsa o köy (`army`), misafirse EV SAHİBİ (`takviyeler`), yoldaysa seferi TAŞIYAN köy (`marches`). Saldırı/yağma seferleri de dahil; ayrı tutmak "saldırıya yolla, bedava beslen" deliğini açardı.
- **Hatanın kökü iki fonksiyonun aynı şeyi ayrı ayrı hesaplamasıydı.** Tek kaynak `koyunAskerYemi()` / `koyunAskerSayisi()` yazıldı; hem gerçek tüketim hem ekran oradan okuyor.
- **SONUÇ ÖLÇÜLDÜ** (ekran / ambar): sade 7,50 / 7,50 · misafirli 12,50 / 12,50 · seferli 9,38 / 9,38 · misafir+seferli 14,38 / 14,38. Dördü de tutuyor.
- Eski test yalnız iki GÖSTERİM fonksiyonunu karşılaştırıyordu (ikisi de misafiri sayıyordu, o yüzden yeşil yanıyordu). Yeni test **AMBARI** ölçüyor: bir tik işletip kaybolan yiyeceği sayıyor. **Kilidin tuttuğu doğrulandı** — hata geri konunca test "ekranda 12.5/sa ama ambardan 7.50/sa düştü" diye patlıyor.


### İkinci köy kalıcı kilitleniyordu — ÖN KOŞUL AĞACININ AÇTIĞI HATA (16 Eylül 2026)
- İlkan: *"2. köy kurarken köy içindeki üretim alanlarını yapmak için ana bina seviyesi istiyor ama ana binayı da işlenmiş hammaddeler olmadan kuramıyorum, hiçbir türlü yeni köyü geliştiremiyorum"* → sonra tam teşhisi kendi koydu: *"ana bina tuğla ile yükseltilebiliyor, tuğlacı da ana bina lvl istiyor, birbirlerini kilitliyor yani."*
- **BU BENİM AÇTIĞIM HATA** (`d39d063` · ön koşul ağacı). Zincir:
  - keresteci/tuğlacı/taşçı/demirci → `anaBina Lvl 2` ister
  - anaBina Lvl 1→2 → 35 kereste, **120 tuğla**, 60 yontma taş, 55 külçe ister
  - bu dört mal → **yalnız o dört işlikten** çıkar
- Yeni köy 300'er işlenmiş malla başlıyor ama bu TEK SEFERLİK bütçe: tarla yükseltmeleri de aynı maldan yiyor (ölçüldü: altı tarla bir kez yükseltilince tuğla 300 → 84). Bütçe bitince köy bir daha ASLA işlenmiş mal üretemiyor. Tek kaçış başka köyden tüccarla mal yollamak — onu bilmeyen oyuncunun köyü ölü.
- Düzeltme: dört işliğin `requires` listesi boşaltıldı (hem `server/data/villageDefs.js` hem istemci ikizi). Gerekçe yorumda: **inşaat malzemesi üreten binaya yalnız HAM kaynakla ulaşılabilmeli.** Ham kaynak her zaman var — köy altı Lvl 1 tarlayla başlıyor ve tarlalar bedava üretiyor. Değirmen/fırın kapsam dışı: un ve ekmek inşaatı kilitlemiyor.
- **YAPISAL KİLİT**: `server/test/koy-bootstrap.test.js`. Üreten binaları `processes.output` üzerinden TÜRETİYOR (elle liste yok), her birinin kuruluş maliyetinin ve ön koşullarına ULAŞMA bedelinin ham olduğunu ardışık olarak doğruluyor, ayrıca işlenmişi sıfırlanmış gerçek bir köyde `canBuildAt` ile dördünü de kurabildiğini ölçüyor. **Kilidin tuttuğu doğrulandı**: ön koşul geri konunca iki test birden patlıyor ve mesaj hatayı kendisi anlatıyor ("Çıkışsız oda: işlenmiş malı biten köy bu binayı kuramaz").
- **Teşhisi imkânsız kılan ikinci hata**: `build_village`, `upgrade_village`, `build_production`, `upgrade_production` — dördü de kaynak yetmediğinde **sessizce `return`** ediyordu. Oyuncu düğmeye basıyor, hiçbir şey olmuyor, sebep yok. (`build_village`'ın üstündeki yorum "sessiz red oyuncuyu çaresiz bırakıyordu" diyor — ön koşul dalı konuşturulmuş ama kaynak dalı öyle kalmış.) Ortak `kaynakYeter()` yardımcısı eklendi, dördü de `Yetersiz kaynak — 10 odun eksik.` diyor. Canlı sunucuda doğrulandı.

### Haritada oyuncu renkleri + kaybolan komşu tarlası (16 Eylül 2026)
- İlkan: *"haritada bütün kullanıcılar aynı renkte pembe... yan yana olan köyleri olan kullanıcıların renkleri farklı olmalı. ayrıca iki kullanıcının tarlaları yan yana gelince diğeri kayboluyor."*
- **Renk**: `colOf` `kind === 'player'` olan HERKESE tek `PLAYER_COL` veriyordu. Köy başına açgözlü hue dağıtımı zaten yazılıydı ama yalnız `else` dalına, yani pratikte hiçbir yere uygulanıyordu. Yeni `assignPlayerHues` renk veriyor ama **köy başına değil OYUNCU başına** — altı köylü bir oyuncu haritada altı ayrı tehdit gibi görünmesin. Palet ilk tonu 356° (eski düşman kırmızısı) ve yeşili (65–160°) atlıyor.
- **GERÇEK VERİDE ÖLÇÜLDÜ** (217 köy, 13 oyuncu): aynı sahibin bütün köyleri tek renk (Bjorn'un üç köyü de 25°), 9 hex içindeki farklı sahipler arasında **sıfır** renk çakışması, 13 sahip 5 tona dağılmış (uzaktakiler tekrar kullanıyor). Tarayıcıda çizilen tonlar: 285°, 356°, 25°, 200° + NPC gri + kendi köyüm yeşil.
- Hover kartındaki "Sahibi" satırı da artık o oyuncunun rengini kullanıyor; sabit pembe kalsaydı kart haritayı yalanlardı.
- **Kaybolan tarla**: `claimBlocked` yabancı köyün toprağını SABİT claim halkası (yarıçap 2) sayıyordu, oysa yayılma sabit değil — "her yeni tarla yeni komşular açar". Halkanın dışına taşan tarla `claimBlocked`'a girmiyor → `myFieldKeys` onu benim yayılma sınırıma alıyor → `myClaim`e giriyor → `computeWild` `myClaim.has(key)` diye **atlıyor** → hex hiçbir katmanda çizilmiyor. Düzeltme: yabancı köyün GERÇEK tarlaları da `claimBlocked`'a giriyor.
- **Hatanın gerçekliği ölçüldü**: dev dünyasında 157 tarladan 1'i halkanın dışında (köy `0,0`, yerel `3,-2`, uzaklık 3). Oran düşük çünkü dev köyleri genç; gerçek sunucuda büyümüş komşularda oran çok daha yüksek — İlkan'ın gördüğü bu.
- `tileOwners` üzerinden ikinci bir güvence de yazılmıştı ama geri alındı: `claimBlocked` artık onun üst kümesi, yani hiçbir yeni hex yakalamıyordu ama `myFieldKeys`e Map bağımlılığı ekleyip React derleyicisinin memolamasını bozuyordu (lint +1). Kural yorumda duruyor.


### Takviye saldırı sayılıyordu + uyarı şeridi tıklamayı yutuyordu (16 Eylül 2026)
- İlkan: *"bir köye defans yolladığımda karşı tarafta saldırı geliyor yazıyor. ek olarak saldırı geliyor görseli başka şeylere basmamı engelliyor özellikle telefonda."*
- **Hata 1 — kip süzgeci yoktu.** `incomingMarchesFor` yalnız `GIZLI_MODLAR` (keşif, yerleşim) eliyordu; takviye kırmızı "SALDIRI YOLDA" şeridini açıyordu. `gelenSeferSayilari` (köy değiştiricideki tehdit sayacı) ise takviyeyi **yalnız kendi köyümden gelince** eliyordu (`slotKeys.has(m.fromKey)`), o da iki slotun birden istenen kümede olmasına bağlıydı — müttefik takviyesi sayaçta saldırı gibi görünüyordu.
- Düzeltme: `DOST_MODLAR = new Set(['takviye'])`. Takviye **listede kalıyor** (savunan yardımın yolda olduğunu ve ne zaman varacağını bilmeli) ama `dost: true` ile geliyor; tehdit sayacına hiç girmiyor. Arayüzde yeşil zemin + kalkan simgesi + "TAKVİYE gönderiyor"; kırmızı şerit `dost` olmayanları süzüyor.
- **Hata 2 — şerit `position: fixed` bir tıklama tuzağıydı.** Genişliği `min(420px, 92vw)`, telefonda ekranın neredeyse tamamı; altındaki düğmeler basılamıyordu ve saldırı varana kadar orada duruyordu. Üstelik yalnız DOST sefer varken bile **boş ama yine de fixed** bir kutu çiziliyordu (`incoming.length > 0` koşulu kipe bakmıyordu), yani hiç saldırı yokken de tıklama yutuluyordu.
- Düzeltme: şeride çarpı eklendi (`onKapat`); kapatılan saldırıların anahtarları tutuluyor, **YENİ** bir saldırı yola çıkınca şerit kendiliğinden geri geliyor. Koşul artık düşman seferi üzerinden, yani dost sefer boş kutu açmıyor.
- **TARAYICIDA ÖLÇÜLDÜ**: hedef köyde 3 gelen sefer varken (2 takviye + 1 yağma) şerit **"SALDIRI YOLDA"** (tekil) diyor — eskiden "3 SALDIRI YOLDA" derdi. Çarpıya basınca `position:fixed, zIndex:900` kutu sayısı **1 → 0**. Seferler sekmesinde takviye satırları `rgba(87,201,138,.09)` yeşil, yağma satırı `rgba(255,111,120,.09)` kırmızı.
- Testler: `takviye.test.js`'e iki kilit — takviye `dost` işaretli gelir ve tehdit sayacına girmez; kendi köyüme gönderdiğim takviye **tek slot sorulsa da** tehdit sayılmaz (eski süzgecin kaçtığı hâl).

### Kendi köyüne her kip açıldı (16 Eylül 2026)
- İlkan: *"KENDİ KÖYÜNDE YAĞMA VS DE GÖNDEREBİLMELİSİN, DİĞER KÖYLER İLE AYNI OLMALI."*
- `send_army` içindeki `p.userId === userId && mode !== 'takviye'` → `kendi_koyun` kuralı kaldırıldı. İstemci tarafında `canAttack` kendi köyümde de açık, `SendArmyPanel` kip listesini artık daraltmıyor (yalnız **varsayılan** kip kendi köyümde takviye, çünkü oraya gönderilen şey neredeyse hep destek).
- **AÇILAN KAPIYI NOT EDİYORUM**: kendi köyüne yağma, tüccar kapasitesini ve pazar sistemini atlayarak ordunun taşıma kapasitesi kadar kaynak taşımanın yolu; kendi köyüne saldırı iki taraftaki askeri birden öldürür. İkisi de bilinçli olarak oyuncuya bırakıldı.
- Tek yasak duruyor: `targetKey === mySlot`, yani **İÇİNDE bulunduğun** köy — orada sefer sıfır mesafeli olurdu.
- Yeni canlı soket testi `kendi-koy-sefer.test.js`: gerçek sunucuda ikinci köy kurup dört kipi de gönderiyor (hepsi `army_sent`), ayrıca aktif köye seferin hâlâ `kendi_koyun` ile reddedildiğini kilitliyor.
- Tarayıcıda da doğrulandı: kendi ikinci köyüme yağma gönderildi, sunucu kabul etti, hedef köyün ekranında kırmızı saldırı uyarısı olarak göründü.


### Macera eşya kurası: at çarpıklığı + oranlar (16 Eylül 2026)
- İlkan: *"item düşme yüzdelerini arttır, attan başka item düşmedi, bir enayilik var."* Enayilik GERÇEKTEN vardı.
- **ÖNCE ÖLÇTÜM** (300.000 macera): düşen her kuşanılabilir eşyanın **%20,7 si at**. Sebep kurada: `KUSANILABILIR[Math.floor(rnd() * KUSANILABILIR.length)]` düz çekiyordu ve at slotunda **6 eşya** var, diğer slotlarda 3, kolyede 2. Yani at, herhangi bir silahın tam iki katı sıklıkta düşüyordu — oyuncunun TEK at slotu olmasına rağmen.
- Düzeltme: kura önce **SLOTU** seçiyor (9 slot, eşit şans), sonra o slottaki eşyayı. `SLOT_HAVUZU` + `kusanilabilirSec()`. At payı **%20,7 → %11,1**, kalan sekiz slot buna karşılık yükseldi. Kural bir slota yeni eşya eklendiğinde de bozulmuyor — eskisinde yeni bir at tanımlamak dengeyi sessizce kaydırıyordu.
- Oranlar yükseldi: `esyaSansi` kısa **0,12 → 0,22**, uzun **0,22 → 0,32**. Gerekçe: ham tempo ilerleme temposu değil — düşenlerin %56 sı SIRADAN nadirlikte, aynı slota ikinci sıradan parça hiçbir şey ilerletmiyor. Seyrekliği nadirlik kurası taşıyor (efsane %1,2), tempo değil.
- **SONUÇ ÖLÇÜLDÜ**: kuşanılabilir parça kısada her **9,4 → 5,2** macerada bir, uzunda her **2,6 → 1,8** macerada bir. Slot payları %11,0 ± 0,2.
- Eşyanın envantere yazılma yolu (`maceraIlerlet` → `kahraman.envanter` → `envanterOzeti`) baştan sona okundu: orada eşya yutan bir hata YOK, parmak izi de `envanter.length` taşıyor. Sorun yalnızca kuradaydı.
- Testler: mevcut tempo kilidi zaten yakaladı (sınırlar güncellendi), üstüne **slot adaleti kilidi** eklendi — dokuz slotun hepsi düşmeli ve hiçbirinin payı %11,1 den 1,5 puandan fazla sapmamalı.

### Kendi köyüne destek gönderilemiyordu (16 Eylül 2026)
- İlkan: *"kendi köyümden kendi köyüme destek atamıyorum"*.
- Sunucu izin veriyordu (`send_army` · `p.userId === userId && mode !== 'takviye'` reddediyor, takviye geçiyor), `ForeignVillagePanel` de `canReinforce` ile DESTEK düğmesini çiziyordu, `SendArmyPanel` de `kind === 'self'` te kipleri takviyeye daraltıyordu. **Bütün zincir hazırdı, panele ulaşılamıyordu.**
- İki kapı kapalıydı:
  1. `clickVillage` `kind === 'self'` olan HER köyde haritayı ortalayıp `return` ediyordu. Tek köylü oyundan kalma bir davranış; sunucu `self` i userId ye göre veriyor, yani ikinci köyüm de `self`.
  2. Yakın zumda (`scale >= Z_TERRAIN`) kendi öbür köyümün TIKLANABİLİR ÇEKİRDEĞİ hiç çizilmiyordu: çekirdeği yalnız `visibleForeign` çiziyor ve o `self` i eliyor. Uzaklaşmadan tıklamak imkânsızdı.
- Düzeltme: ortalama yalnız AKTİF köye (`v.key === kk(wq, wr)`); ayrı bir `visibleSelf` listesi kendi öbür köylerime `ForeignCore` çiziyor (CLAIM_GREEN, çerçeve tekrarı yok — o zaten claim yolundan geliyor); hover kartı da artık kendi öbür köylerimde çıkıyor.
- `mapPanels.jsx`: başlıktaki alt satır `self` te `tierLabel` okuyordu, **"undefined · -14,0"** yazıyordu. Artık "KENDİ KÖYÜN · -14,0".
- **TARAYICIDA UÇTAN UCA DOĞRULANDI**: iki köylü test hesabı açıldı, yakın zumda ikinci köyün çekirdeği (`vc--14-0`) çiziliyor, tıklayınca pencere "Bergsund · KENDİ KÖYÜN · -14,0 · Mesafe 6 hex" ile açılıyor, SALDIR/YAĞMA/KEŞFET yok, DESTEK + HAMMADDE var. DESTEK → 20 Fjordvakt gönderildi, sunucu `army_sent` döndü (6 hex, 1029 sn), `army_error` gelmedi.
- Yan düzeltme: `client/dev/dev-login.html` hesap AÇAMIYORDU — `/auth/register` artık `username` istiyor, sayfa yollamıyordu. Ad e-postanın @ öncesinden türetiliyor. (Bu dosya yalnız yerel geliştirmede, üretime çıkmıyor.)


### Sade köy görünümü ayarı (16 Eylül 2026)
- İlkan: *"ayarlara bir ayar ekle. isteyen köy merkezinde bina görselleri olmadan sadece amblemlerle köyü görebilsin ama amblemler resmin kapladığı alanı kaplasın yani büyüsün. işçi ve bina lvl i daha görünür olsun."*
- `ayarlar.js` ye `sadeKoy` eklendi (varsayılan **kapalı**, tarayıcıda saklanıyor); Ayarlar → Görünüm sekmesinde **KÖY MERKEZİ** başlığı altında anahtar.
- Sahne tarafı: `sade` açıkken `tex` null yapılıyor, yani hem `<image>` hem de onun küçük tepe amblemi düşüyor; yerine hexEmblem den gelen amblem `S*0.92` boyunda çiziliyor. Merkez binanın kendi altın amblemi var.
- İşçi sayacı sade modda 32×14 den **46×20** ye, yazı 9 dan **13** e; LVL yazısı 11 den **15** e çıkıyor.
- **YERLEŞİM ÖLÇÜLEREK DÜZELTİLDİ**: ilk denemede amblem `S*1.15` ve merkezi `y−0,16S` idi; alt kenarı y+22,7 ye iniyor, sayaç y+16,5 te başlıyordu — tarayıcıda üst üste bindikleri görüldü. Hexin 2S lik dikey açıklığı alttan yukarı bölündü: LVL yazısı, üstünde sayaç (`y+0,20S`), kalanı amblem (`y−0,26S` merkezli, `S*0.92`). Üçü de birbirine değmiyor.
- Tarayıcıda doğrulandı: anahtar açıkken amblemler ve sayaçlar büyük ve ayrık, kapatınca görseller geri geliyor; tercih sayfa yenilendikten sonra da duruyor. Konsolda hata yok.


### Köy sahnesi olabildiğince büyük (16 Eylül 2026)
- İlkan: *"köy merkezindeki altıgen daha büyük olsun, olabildiğince büyük olmalı"*.
- **ÖNCE ÖLÇTÜM** (830×882 kap): sahne 562×498 çiziliyordu, ölçek 0,598. İki ayrı sebep buldum:
  1. **Tavan 1 de kilitliydi** (`Math.min(1, ...)`). 1920×1080 de yer 1,78 kat büyümeye yetiyor ama ölçek 1 de duruyordu.
  2. **Boş kutuya sığdırılıyordu.** Kutu 860×860 ama içerik **850×736** (`getBBox` ile ölçüldü): altıgen yerleşimin dikey açıklığı genişliğin √3/2 si kadar, üstte ve altta 124 birim boş. Yükseklik kısıtı bu boşluğu da sayınca sahne olduğundan küçük kalıyordu.
- Düzeltme: tavan 2, yükseklik kısıtı `ICERIK_H = H × √3/2` (745) üzerinden.
- **SONUÇ ÖLÇÜLDÜ**: 1920×1080 de ölçek **1,00 → 1,299** (%30 büyük). `kirpilanVarMi: false` — 29 bina görselinin hiçbiri kaba taşmıyor; kırpılan yalnız üstteki/alttaki BOŞLUK (üst 91 px, alt 34 px pay kaldı).
- Dar pencerede (830 px) ölçek 0,598 te kaldı — orada **genişlik** kısıtlıyor (iki yan ray 2×158 px yer tutuyor), yani regresyon yok, kazanç da yok. Kazanç geniş ekranda.
- **Doku çözünürlüğü sorun değil**: bina görselleri 1024×1024 ve sahnede 110 birimlik kutuya çiziliyor, 2 kat büyütmede bile kaynağın çok altında. Tavanın 2 olmasının sebebi bu.


### Arayüz ölçeği DOM ölçümünü bozuyordu + Esc ile kapatma + çark simgesi (16 Eylül 2026)
- İlkan: *"ayarlar menüsündeki işareti tam çark yap, güneş gibi duruyor. bir de yazıları büyütme tuşu basınca açılan bina resimlerini de büyütüyor, resim ekrana sığmıyor ve tuşlara basılmıyor. bu büyüt tuşu yazıları ve gerekiyorsa yazıların içinde olduğu kutucukları büyütmeli."* + *"menülerden x yerine esc ile çıkabilmeliyiz"*.

**KÖK SEBEP — `getBoundingClientRect` zoom ile çarpılıyor.**
- **ÖLÇÜLDÜ** (830×942 pencere, `--tn-olcek: 2`): `getBoundingClientRect()` → **830 × 982** (gerçek piksel), `offsetWidth/offsetHeight` → **415 × 491** (zoom uzayı). CSS e yazdığımız her uzunluk zoom uzayında.
- Kod pencereyi rect ile ölçüp sonucu doğrudan CSS yüksekliği olarak yazıyordu: %200 de panel 982 zoom-px = **1964 gerçek px** boyunda kuruluyor, yani ekranın tam iki katı. Poster `flex: 1` olduğu için taşan yeri o yutuyor ve düğmeler ekranın dışında kalıyordu.
- Yani sorun **resmin kendisi değildi**, panelin ölçüsü yanlış hesaplanıyordu. Panel doğru boyda kurulunca poster kalan yeri alıyor ve yazı büyüdükçe kendiliğinden küçülüyor — İlkanın istediği davranış.
- **DOĞRULANDI**: bina görseli %100 de 732 px, %200 de **549 px**. Panel %200 de 1368×500, ekran 1440×900 → sığıyor.
- Yeni ortak yardımcı `client/src/olcum.js`: `kutuOlcusu` (offset*, zaten doğru uzayda) ve `fareKonumu` (gerçek pikseli ölçeğe böler). Üç yerde kullanıldı.
- **İKİNCİ HATA AYNI KÖKTEN**: harita fare→hex çevriminde `clientX - rect.left` (gerçek px) ile `size`/`layerOff` (zoom uzayı) karıştırılıyordu, yani ölçek 2 de harita tıklamaları iki kat sapıyordu. İlkan bunu bildirmemişti ama aynı düzeltmeyle kapandı.

**ESC İLE KAPATMA.** Ayarlar, sefer gönderme, birim kartı ve harita pencereleri zaten Esc dinliyordu; en çok açılan ikisi dinlemiyordu: **bina paneli** ve **yama notları**. Ortak kanca `client/src/useEsc.js` yazıldı (kapalıyken dinleyici kurmuyor) ve ikisine bağlandı. Tarayıcıda doğrulandı: panel açıkken Esc → panel kapandı.
- Not: `YamaNotlari` erken dönüşlü (`acik` değilse null), o yüzden kanca dönüşten ÖNCE çağrılıyor — koşullu kanca React kural ihlali olurdu.

**ÇARK SİMGESİ.** Eski çizim çember + sekiz DÜZ IŞIN idi, yani tam bir güneş. Yeni yol koddan üretildi (8 diş, uç yarıçapı 10,3 · dip 7,6; diş ucu ±11° · dip ±20°) — elle koordinat yazmak yerine hesaplandı ki dişler eşit aralıklı olsun. Tarayıcıda 120 px e büyütülüp bakıldı: dişler gövdeye bitişik, ortası delik.


### Savunan izci keşifte ölmüyor (16 Eylül 2026)
- İlkan: *"defansta iken casus ölmemeli"*.
- Keşif bir **casus düellosu**, savaş değil: riski alan taraf casusunu GÖNDEREN. Nöbetçinin kendi evinde ölmesi için bir sebep yok. Kayıp hesabı yine yapılıyor (kimin kazandığını ve saldıranın kaybını o belirliyor), yalnız savunana **uygulanmıyor**.
- **DENGEYE ETKİSİ bilinçli**: savunanın izci perdesi artık AŞINDIRILAMIYOR. Saldıran arka arkaya ucuz dalgalar yollayıp perdeyi teker teker kırarak sonunda bedava keşif yapamıyor; her denemede perdeyi TEK seferde geçecek kadar casus göndermesi gerekiyor. İzci böylece gerçek bir yatırım oluyor — bir kez kurulan nöbet kalıcı.
- **Normal saldırıda değişen yok**: orada izci ordunun parçası ve öbür askerlerle birlikte kayıp veriyor. Kural yalnız keşif kipinde.
- İki yeni test: savunanın izcisi ve nüfusu eksilmiyor, iki tarafın raporunda da savunan kaybı boş; beş ardışık keşif dalgası savunanı eritmiyor. Testler 311 → **313**.


### Kahraman seferde mahsur kalıyordu + Seferler ekranı bütün köyleri gösteriyor (16 Eylül 2026)
- İlkan: *"kahraman bir yere gitmiş dönmemiş seferde gözüküyor buglandı. bir de kimin nerede olduğunu hangi ekrandan bakabilirim"*.

**BUG — kahraman `nerede: "sefer"` olarak mahsur kalıyor.**
- Kahraman orduyla birlikte YÜRÜMÜYOR (bilinçli): savaş çözülür çözülmez üssünde sayılıyor, dönüş yolu yalnız orduya ait. Eve dönüşü yazan **tek satır** `processMarches` içinde ve yalnız `m.kahramanSonuc` doluysa çalışıyor — yani ancak gerçekten bir savaş olduysa.
- Savaşın hiç olmadığı **iki yol** var ve ikisinde de kahraman sonsuza kadar seferde kalıyordu:
  1. **Sefer geri çağrıldı** (ilk 90 sn). `seferGeriCagir` seferi döndürüyor, savaş yok, `kahramanSonuc` yazılmıyor.
  2. **Hedef yok oldu.** `resolveArrival` `!target` dalında "hedef_yok" raporuyla orduyu döndürüyor, savaş yok.
- **Bedeli ağır**: hem sefer hem macera kapısı `nerede === "koy"` şartına bakıyor, yani mahsur kahraman **kalıcı olarak kullanılamaz** hâle geliyordu.
- **İki katmanlı düzeltme.** (A) Geri çağırma artık kahramanı da eve alıyor ve sefere iliştirilmiş kahraman kaydını siliyor — olmayan bir savaşın XP/hasarı uygulanmasın. (B) `kahramanMahsurKaldiysaOnar` her tikte çalışıyor: kahraman "seferde" görünüyor ama köylerinin hiçbirinde onu taşıyan sefer yoksa üssüne alınıyor. **Bu ağ mevcut mahsur kahramanları da kurtarıyor** (İlkanınki dahil) ve aklıma gelmeyen üçüncü bir yolu da kapatıyor. Onaracak bir şey yoksa hiçbir şey yapmıyor.
- Yeni test dosyası `server/test/kahraman-mahsur.test.js` (4 test): iki mahsur kalma yolunu, mahsur kalmanın BEDELİNİ (macera kapısı kapanıyor) ve zaten kapalı olan üçüncü yolu (seferde ölen kahraman üssüne dönüyor) kilitliyor. Testler 307 → **311**.

**"Kimin nerede olduğunu hangi ekrandan bakabilirim" — Seferler ekranı genişletildi.**
- `village.marches` tanımı gereği **tek köyün** seferleri. Çoklu köyde ikinci köyünden çıkan ordu hiçbir listede görünmüyordu; görmek için köy değiştirip Seferler'e tekrar bakmak gerekiyordu. Gelen saldırı uyarısı zaten bütün köyler için vardı (`villageList`), giden sefer yoktu.
- Sunucu `digerKoySeferleri(session)` gönderiyor, panel alt bölümde **"ÖTEKİ KÖYLERİMDEN"** başlığıyla listeliyor: hangi köyden çıktı, nereye, birlikler ve varışa kalan süre (`kalanTimeLeft` — canlı geri sayım).
- Salt okunur: geri çağırma soket işleyicisi aktif köye (`v()`) bakıyor, o yüzden çağırmak için o köye geçmek gerekiyor. Satırda çıktığı köyün adı yazıyor.

**Oyuncunun "ne nerede" için bakacağı ekranlar** (mevcut durum):
- **Seferler**: giden seferler (artık bütün köyler), gelen saldırılar, kahramanın durumu (macera/sefer/takviye/dönüyor)
- **Ordu**: evdeki ordu, köyümdeki misafir takviyeler, başka köylerde duran kendi askerim
- **Harita**: o an yürüyen seferlerin canlı rozetleri (kılıç/kalkan/dürbün/çadır + geri sayım)
- **Köylüler**: işçilerin hangi tarlada/binada olduğu


### Oyun tasarım dökümanı v2 — denge paketi sonrası yenilendi (16 Eylül 2026)
- İlkan: *"tekrar bir oyun tasarımı dosyası oluştur ve olanı yenile. bütün üretim masraflarını, sürelerini, saldırı savunma güçlerini, hızlarını, taşıma kapasitelerini ekle. tekrar analiz edeceğim"*.
- `docs/OYUN-TASARIMI.md` **sıfırdan üretildi** (1.748 satır). v1 (14 Eylül) denge paketinden önceydi ve artık neredeyse her sayısı yanlıştı.
- **EK'teki hiçbir sayı elle yazılmadı**: `tablo-uret2.js` on dört bölümü doğrudan koddan üretiyor. Doküman koda göre yanlış olamaz — v1 deki en büyük risk buydu.
- **EK A — BİRİMLER** (İlkanın asıl istediği tablo): 16 birimin saldırı, yaya savunma, atlı savunma, **hız**, **taşıma kapasitesi**, ekmek tüketimi, kaynak maliyeti, eğitim süresi, bina şartı ve araştırma bedeli. Altında verimlilik tablosu: `stat/kaynak` ve `stat/ekmek` zıt yönde sıralanıyor.
- **EK B** ekipman (katkı, maliyet, süre, hız/taşıma etkisi + 20 seviye yükseltme) · **EK C** 33 binanın seviye seviye maliyet ve süresi · **EK D** 5 tarla × 20 seviye · **EK E** işleme zincirleri ve tarla/işleme işçi oranı · **EK F** depo tavanları · **EK G** sur/hendek/kule tabloları · **EK H** savaş formülleri + moral · **EK I** nüfus ve beslenme · **EK J** ticaret · **EK K** kültür · **EK L** kahraman · **EK M** dünya · **EK N** diğer maliyetler.
- **Bölüm 0 yeni: "v1den beri ne değişti"** — analizi yapacak AI hangi maddelerin zaten uygulandığını bilmezse aynı önerileri ikinci kez yazar. Uygulanan 13 madde, uygulanmayan 3 madde ve raporun **yanlış çıkan** maddeleri (10, 11) tabloyla yazılı; raporun iki iç çelişkisi ve bir seviye kayan tabloları da not edildi.
- **Üretirken üç eskimiş/yanlış bilgi yakalandı ve düzeltildi**:
  1. *"Tam savunma %149,8, tavan ulaşılamaz"* — bu ölçüm ESKİ. Kule bonusundaki yuvarlama düzeltildikten sonra toplam **tam %150**, yani tavan ulaşılabilir. Eski sayı analizi yapacak kişiyi yanlış yönlendirirdi.
  2. Kahraman **4 skile** sahip (saldırı puanı, saldırı bonusu, savunma bonusu, hammadde üretimi); anlatı 7 sayıyordu. İyileşme hızı, macera hızı, ganimet ve zırhlanma skil DEĞİL, **eşya bonusu** — ikisi ayrı tabloya alındı.
  3. Diriltme ve skil sıfırlama bedelleri kaynak NESNESİ, sayı değil; tabloda `[object Object]` yazıyordu. Seviyeye göre örnek tablo eklendi (Lvl 1 / 25 / 50 / 100).
- Son tarama: dökümanda tek bir `undefined`, `NaN` ya da `[object Object]` yok.
- **Süreler 1× hıza göre** ve bu hem başlıkta hem ekin başında yazılı; canlı sunucu 10× çalışıyor.


### Saldırı ekranındaki tahmin saniyede bir siliniyordu (15 Eylül 2026)
- İlkan: *"haritadan bir köye tıklayıp saldır dediğimde karşı tarafın defansını ve benim saldırı puanımı gösteren bir satır çıkıyor kayboluyor sürekli"* + *"galiba son rapora göre bildirim veriyor ama bir görünüp kaybolmasın"*.
- **SEBEP ZİNCİRİ** (koddan okundu, tahmin değil):
  1. `App.jsx` her saniye `extrapolate(serverVillage, …)` çağırıyor; `flows.js · shiftTimers` bunu yaparken köy nesnesinin TAMAMINI yeniden kuruyor (diziler `map`, nesneler yeniden `{}`) — iki sunucu paketi arasında sayaçlar aksın diye.
  2. Yani `marchInfo.scoutUnits` ve `unitDefs` her saniye YENİ NESNE.
  3. `scoutSet` memosu bu ikisine KİMLİĞE göre bağlıydı → her saniye yeni Set.
  4. "Mod değişince seçimi temizle" efekti `scoutSet`e bağlıydı ve içinde `setPred(null)` var → **tahmin her saniye siliniyordu**; 220 ms sonra yeni istek dönüp geri yazıyordu.
- **ÇÖZÜM: kimliğe değil İÇERİĞE bağlan.** `scoutSet` artık `scoutUnits.join(",")` ve `Object.keys(unitDefs).join(",")` metinlerine, tahmin efekti de `intelAnahtar` (keşfin `at` damgası + sur/hendek/kule/nüfus + ordu) metnine bağlı. Metinler değere göre karşılaştırıldığı için saniyelik yeniden kurulum efektleri artık tetikleyemiyor. `setPred(null)` yalnız MOD değişince çalışıyor.
- **Yan fayda**: panel açıkken sunucuya saniyede bir gereksiz `simulate_battle` gidiyordu, artık gitmiyor.
- **İKİNCİ HATA — tahmin MORALİ saymıyordu.** Moral bonusu dün eklendi ve gerçek savaşta uygulanıyor ama önizleme onu hesaba katmıyordu: ekran "kazanırsın" derken savaş kaybedilebilirdi. En kötü türden yanlış bilgi — oyuncu ordusunu ona güvenip harcar. İstemci artık `defenderPopulation` (keşiften) gönderiyor, oranı sunucu hesaplıyor (formül tek yerde).
- **ÜÇÜNCÜ HATA — çürümüş yedek kural.** İstemcideki `scoutSet` yedek yolu hâlâ *"kapasite ≥ 100 ve saldırı ≤ 10"* diyordu; izcinin yükü 0a indirildiği için o dal çalışsaydı liste BOŞ kalır ve keşif modunda hiçbir birim seçilemezdi. Sunucu listeyi gönderdiği için görünmüyordu. Artık tanımdaki `kesif` bayrağına bakıyor — sunucudaki kuralla aynı.
- Tahmin kutusunun başlığı artık *"Son keşfe göre tahmin · 15.09 23:41"* yazıyor: hangi rapordan geldiğini oyuncunun tahmin etmesi gerekmiyor. Saat `intel.at`ten geliyor, render sırasında `Date.now()` okumuyor (saf olmayan çağrı React derleyicisinden hata alıyordu).
- `dev_kesif_raporu` kısayolu artık `village.intel` kaydını da kuruyor — gerçek keşif dönüşü ikisini birden yazıyor, kısayol yalnız raporu yazdığı için tahmin kutusu kısayolla hiç sahnelenemiyordu.
- Lint: istemci uyarıları 8 → 6 (iki `exhaustive-deps` uyarısı bu düzeltmeyle kapandı), hata sayısı taban değerinde. 307 test geçiyor.


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
