# TraNord — Oyun Tasarım Dökümanı

> **Sürüm 2 · 16 Eylül 2026.** Bir önceki sürüm (14 Eylül) dış bir denge
> analizine verilmişti; gelen 16 maddelik raporun 13'ü uygulandı ve oyunun
> ekonomisi baştan dengelendi. Bu döküman o değişikliklerden SONRAKİ hâli
> anlatıyor.
>
> **Amacı:** oyunun bugün ne olduğunu, hangi mekaniklerin gerçekten
> çalıştığını ve hangi boşlukların açık kaldığını, kodu görmeyen birinin
> anlayabileceği şekilde anlatmak.
>
> **Sonundaki soru hâlâ açık:** oyunun bir AMACI ve BİTİŞİ yok.
>
> **Ekteki bütün tablolar koddan üretildi**, elle yazılmadı — bina, tarla,
> ekipman, birim: her maliyet, her süre, her saldırı/savunma değeri, her
> hız ve her taşıma kapasitesi.
>
> **BÜTÜN SÜRELER 1× HIZA GÖRE.** 1 oyun saati = 1 gerçek saat. Canlı
> sunucu 10× çalışıyor; tanımlar hızdan bağımsız olduğu için sunucu 1×
> başlatıldığında aşağıdaki sayılar birebir geçerli olur.

---

## 0. v1'den (14 Eylül) BERİ NE DEĞİŞTİ

Bir önceki döküman dış bir AI'a analiz ettirildi; gelen 16 maddelik
raporun **13'ü uygulandı**. Aynı önerilerin ikinci kez gelmemesi için
liste:

| # | Madde | Ne yapıldı |
|---|---|---|
| 1+2+3 | Maliyet/süre eğrisi ve depo duvarı | Bütün binalarda çarpan **1,28**. Hiçbir yükseltme tek deponun üstüne çıkmıyor; ölü içerik kalmadı |
| 4 | Ön koşul ağacı yoktu | 32 binaya ön koşul yazıldı, menüde kilit sebebi görünüyor |
| 5 | Ekipman stat/kaynak dengesi | Zırh 20/5/5 → **40/12/10**; beş ekipman da kaynak başına 2,48–2,50 |
| 6 | Tier bonusu yoktu | **Set bonusu** %4/parça; birim statları artık türetiliyor |
| 7 | Yiyecek freni yoktu | Asker yemeği **6 + 2×(n−1)**, tarla verimi 32 → **16** |
| 8 | İzci yağma makinesiydi | Kuzey İzcisi yükü 110 → **0** |
| 9 | Kule 480 okçu istiyordu | Seviye başına okçu yeri 4 → **2** |
| 12 | Oyuncuya karşı koruma yoktu | **Acemi kalkanı** (7 oyun günü / 200 nüfus) + **moral bonusu** |
| 13 | İşleme binası tarlayı boğuyordu | Dönüşüm hacmi **9 kat**, kayıp oranları aynı |
| 14 | Boş işçi birikiyordu | Büyüme boş işçi tamponuna bağlandı; kervan 1 işçi tutuyor |
| 15 | Ekipman süreleri orantısızdı | Süreler dengelendi, ahır at deposu 5 → **20**, kademe kapısı eklendi |
| 16 | Ev tavanı tahıl freninden önce bağlıyordu | Ev nüfus tavanı 100 → **150**/seviye |

**Uygulanmayan üç madde:**

- **Madde 10 (soğuk başlangıç kilidi) YANLIŞTI.** Rapor "külçe olmadan
  demir madeni, demir madeni olmadan külçe kurulamaz" diyordu; başlangıç
  stoğu her işlenmiş maldan 300 veriyor, kilit yok.
- **Madde 11 (slot havuzu) kod sorunu değildi**, v1 dökümanının ifade
  hatasıydı. Havuzlar zaten ayrı.
- **Köy mesafesi 6 → 10 hex** ve **dünya hızı 10× → 2–3×** bilinçli
  olarak ertelendi: birincisi mevcut dünyanın yeniden kurulmasını
  gerektiriyor, ikincisi oyun hissini kökten değiştiren bir karar.

**Raporun iki iç çelişkisi vardı** (madde metinleri esas alındı): EK D
set bonusunu 0,12 yazıyordu ama madde 6 açıkça 0,04 seçip 0,12'yi
reddediyordu; EK D beslenmeyi `6 × n` yazıyordu ama madde 7 onu da açıkça
reddedip `6 + 2×(n−1)` seçiyordu. Ayrıca raporun bütün süre ve maliyet
tabloları **bir seviye kaymıştı** (formül `çarpan^(seviye−1)`, rapor
`çarpan^seviye` saymış): süreleri iki katına kadar abartılı,
maliyet duvarları bir seviye geç görünüyordu. Yön doğruydu, büyüklükler
değil.

---

## 1. Bir bakışta

TraNord, tarayıcıda oynanan, gerçek zamanlı, çok oyunculu bir **köy ve
strateji oyunu**. Travian ailesinden: oyuncu bir köyle başlar, kaynak
üretir, bina diker, asker eğitir, komşularına saldırır, yeni köyler kurar.
Oyun kapalıyken de işler — sunucu zamanı sürekli akıtır.

- **Tema:** İskandinav / fiyort. Bütün arayüz ve içerik **Türkçe**.
- **Gerçek zamanlı ve kesintisiz**: inşaat, üretim, eğitim ve ordu
  yürüyüşü oyuncu çevrimdışıyken de ilerler.
- **PvP açık**: oyuncular birbirinin köyüne saldırabilir, yağmalayabilir,
  keşfedebilir, binalarını yıkabilir ve köyünü tamamen yok edebilir.
- **Ticari bir ürün**: oyun satılacak.

### Travian'dan ayrılan üç yer

1. **İnsan odaklı.** Kaynak "kendiliğinden" akmıyor: her tarlaya ve her
   binaya **işçi atanıyor**. Nüfus hem işçi hem asker havuzu; ikisi aynı
   yerden çıkıyor. Asker basmak ekonomiyi doğrudan yavaşlatıyor.
2. **Ekipman sistemi.** Birim diye sabit bir şey yok: köylü ne kuşanırsa o
   oluyor. Kılıç + kalkan + zırh + at taşıyan asker Jernridder; yalnız
   kılıç taşıyan Fjordvakt. Ekipman ayrı üretiliyor, ayrı depolanıyor.
3. **İşleme zinciri.** Ham madde tek başına işe yaramıyor: odun →
   kereste, kil → tuğla, taş → yontma taş, demir → külçe, tahıl → un →
   ekmek. Her adımda kayıp var ve her adım işçi istiyor.

### Teknik çerçeve

- Sunucu Node.js + Socket.io; istemci React. Tek dünya, tek sunucu süreci.
- Dünya altıgen (hex) ızgara, yarıçap 134 hex, ~1729 köy yeri. Şu an ~200
  NPC köyü ve bir avuç oyuncu var.
- Zaman ölçeği tek bir ortam değişkeni (`TRANORD_HOUR_SECONDS`). Bütün
  tanımlar oyun saati cinsinden, yani hız değişince her şey aynı oranda
  ölçekleniyor — seferler dahil.

---

## 2. Kaynaklar ve üretim zinciri

Beş ham kaynak: **odun, kil, taş, demir, tahıl**. Dördü işlenerek
**kereste, tuğla, yontma taş, külçe** oluyor; tahıl ise **un** ve
**ekmek**'e dönüşüyor. Binalar ve ekipman neredeyse tamamen İŞLENMİŞ mal
istiyor — yani ham madde biriktirmek tek başına hiçbir şey ifade etmiyor.

**Tarlalar köyün DIŞINDA.** Dünya haritasında, köyün çevresindeki
hexlerde. Her hex'in kendi bereketi var (arazi çarpanı); uzağa yayılmak
mümkün ama verim düşüyor. Kaç tarla açılabileceğini Ana Bina seviyesi
belirliyor: `min(25, 5 + anaBinaSeviyesi)`.

**Tarla tavanı Lvl 10** — ama **merkez köyde Lvl 20**. Merkezi başka köye
taşırsan eski merkezin tarlaları Lvl 10'a iner; yoksa oyuncu merkezi
köyden köye taşıyıp hepsini 20 yapardı.

**İşleme binaları köyün İÇİNDE** ve işçi alıyor. Buradaki denge yakın
zamanda düzeltildi: eskiden Lvl 20 bir Keresteci, Lvl 20 bir Ormanın
üretimini bile yetiştiremiyordu ve odun zincirindeki işçilerin %73'ü
keresteci'de oturuyordu. Artık işçi başına dönüşüm hacmi dokuz kat
yüksek (kayıp oranları aynı): beş zincirin de tarla/işleme işçi oranı
~0,30. Ekonominin freni artık dışarıdaki tarlalar — olması gereken yer.

→ Tam tablolar: **EK D** (tarlalar) ve **EK E** (işleme zincirleri).

---

## 3. Nüfus, işçi ve açlık

Nüfus tek bir havuz ve üç yere gidiyor: **boş işçi**, **çalışan işçi**
(tarla/bina/inşaat), **asker**. Asker evden çıkıp kışlaya gidiyor, yani
nüfus tavanını serbest bırakıyor ama ekmek yemeye devam ediyor.

- **Tavan evlerden**: 50 + Σ (ev seviyesi × 150). Ev en fazla Lvl 5 ama
  köyde birden fazla ev kurulabiliyor.
- **Hız Ana Binadan**: Lvl 1'de oyun saatinde 1 kişi, Lvl 20'de 39.
- **Büyüme freni boş işçiye bağlı**: `tampon = 20 + 0,10 × işçi kapasitesi`.
  Boş işçi tamponu doldurunca büyüme yavaşlayıp duruyor. Asker eğitip
  sivil tüketince yeniden açılıyor.

Bu fren yeni. Öncesinde nüfus sınırsız büyüyor ama işçi yerleri yalnız
bina yükseltince artıyordu; aradaki fark boş insan olarak yığılıyordu
(Ana Bina Lvl 10 günde 456 kişi getiriyor, orta bir köyün toplam ihtiyacı
~260). Artık **Ana Bina seviyesi ordu üretim hızının tavanı**.

**Açlık gerçek bir fren.** Köylü günde 3 ekmek, asker **6 + 2×(ekipman−1)**
ekmek, at ayrıca 3 ham tahıl yiyor. Tarla işçi verimi 32'den 16 tahıl/saate
indirildi. Sonuç: bir tarla işçisi ~38 Fjordvakt ya da ~19 Jernridder
besliyor (öncesinde 77 askerdi ve ordunun hiçbir üst sınırı yoktu).

→ **EK I**.

---

## 4. Binalar

33 bina, çoğu Lvl 20'ye kadar. Kategoriler: merkez, işleme, depo, nüfus,
askerî, savunma, yönetim, kültür.

**Maliyet ve süre eğrisi tek.** Her bina için `taban × 1,28^(seviye−1)`.
Bu da yeni: eskiden süre çarpanı beş aileye (1,40–2,00), maliyet çarpanı
üç aileye (1,25/1,60/1,70) dağılmıştı ve ikisi birbirini tutmuyordu.
Ölçülen sonuçları şunlardı:

- Surun son seviyesi tek işçiyle **24,9 yıl** sürüyordu.
- Sarayın Lvl 10→11 maliyeti (32.019 tuğla) **maksimum depodan büyüktü**:
  kaynak hiç biriktirilemiyor, bina orada duruyordu.
- On bir binanın gerçek tavanı Lvl 11–15 arasıydı; üstündeki her şey
  oyuncunun asla göremeyeceği ölü içerikti.

Artık hiçbir yükseltme tek deponun üstüne çıkmıyor ve en pahalı bina son
seviyesine tek işçiyle 3,5 günde çıkıyor.

**Ön koşul ağacı var.** Bu da yeni: 33 binanın hiçbirinde bağımlılık
yoktu, ilk günden saray dikilebiliyordu. Artık Kışla için Ana Bina 3 +
Rún Salonu 1, Silahçı için Demirci 3 + Rún Salonu 1, Ahır için Kışla 3 +
Rún Salonu 3 + Lvl 5 tahıl tarlası gibi kapılar var. Bina menüde yine
görünüyor ama üstünde neyin eksik olduğu yazıyor.

**Slot kıtlığı iki ayrı havuz**: tarla slotu (Ana Bina seviyesiyle, en çok
25) ve köy içi bina slotu (köy sahnesinin hexleri). Sur, hendek ve altı
kule bunların dışında, kendi isimli slotlarında.

→ **EK C** (bina bina, seviye seviye) ve **EK F** (depo tavanları).

---

## 5. Ekipman sistemi

Beş kuşanılabilir ekipman: **kılıç, mızrak, kalkan, zırh, at**. İki
kuşatma parçası: **koçbaşı**, **mancınık**.

Kurallar: her asker kılıç VEYA mızrak taşır (ikisini birden değil);
mızraklı kalkan taşıyamaz; kalkan yalnız kılıçlıyla; zırhı herkes giyer;
süvari ekipmanını atla birlikte alır.

**Ekipman ayrı bir depoda.** Kılıç/mızrak/kalkan/zırh cephanelik
seviyesi × 200'lük **ortak havuzu** paylaşıyor (Lvl 20'de 4.000 parça);
türler arasında serbestçe dağıtılıyor ama toplam sınırlı. At ayrı: ahır
seviyesi × 20 (Lvl 20'de 400), çünkü canlı hayvan.

**Denge düzeltildi.** Ekipmanların kaynak başına verdiği stat 3,3 kat
farklıydı — zırh kılıcın üçte biri kadar verimli ve en uzun süren
ekipmandı, yani zırh giymek hiçbir koşulda mantıklı değildi ve zırh
taşıyan bütün üst kademe birimler çöptü. Artık beşi de kaynak başına
2,48–2,50 stat veriyor.

**Ekipman seviye yükseltmeleri** (Lvl 20'ye kadar, seviye başına %1,75)
o ekipmanın katkısını büyütüyor. Buradaki süre dengesi hâlâ tartışmalı —
bkz. §12.

→ **EK B**.

---

## 6. Birimler

16 birim: 6 piyade, 7 süvari, 2 kuşatma, 1 göçmen. Statları **türetiliyor**,
elle yazılmıyor:

```
stat = (taban + Σ ekipman) × (1 + 0,04 × (ekipman sayısı − 1))
```

Set bonusu (%4/parça) yeni. Öncesinde stat ekipmanların düz toplamıydı ve
kaynak başına verim ekipman eklendikçe artmıyordu: aynı bütçeyle 10
Fjordvakt, 2,9 Ulv Savaşçısının iki katı güç veriyordu. En ucuz birim her
rolde en verimliydi, yani kademe sistemi tersine çalışıyordu.

**Dengenin çekirdeği: çift para birimi.** Set bonusu tek başına
uygulansaydı bu sefer ucuz birim ölürdü. İkisi birlikte çalışıyor:

| Eksen | Kim önde | Ne zaman bağlayıcı |
|---|---|---|
| **Kaynak** başına | ucuz birim (3,50 → 3,00) | erken oyun |
| **Tahıl** başına | pahalı birim (11,7 → 22,1) | geç oyun |

İki sütun zıt yönde sıralanıyor. Oyuncu büyüdükçe kıtlık kaynaktan tahıla
kayıyor ve üst kademeye geçmek zorunda kalıyor. Krossover buradan doğuyor.

**Kademe kapısı**: eğitim binası seviyesi `1 + 3×(n−1)` — tek ekipmanlı
Lvl 1, iki Lvl 4, üç Lvl 7, dört ekipmanlı Lvl 10. Üstüne bir de Rún
Salonu araştırması var (iki ayrı yatırım hattı).

**Kuzey İzcisi ganimet taşımıyor** (yük 110 → 0). Oyunun en ucuz, en
hızlı ve en çok taşıyan birimi aynı birimdi: yağmanın tek doğru cevabı
izci sürüsüydü ve bütün kademe sistemini atlatıyordu.

→ **EK A** — bütün birimlerin saldırı, yaya savunma, atlı savunma, hız,
taşıma kapasitesi, ekmek tüketimi, maliyeti, eğitim süresi ve kapıları.

---

## 7. Savaş

Tek vuruşluk hesap, Travian mantığı:

```
saldırıToplam = Σ (adet × saldırı)
savunmaToplam = savunmaHam × (1 + sur/100) × (1 + moral/100) × (1 + kahraman/100)
kazananın kayıp oranı = (zayıf / güçlü) ^ 1,5
```

Savunmanın yaya/atlı ağırlığı **saldıranın bileşimine** göre: süvari
ağırlıklı orduya karşı mızrakçı, piyadeye karşı kalkancı işe yarıyor.

**Dört sefer kipi**: tam saldırı (kuşatma taşıyabilir), yağma (kayıp
yarıya iner, ganimet alır), keşif (yalnız izci), takviye (tek yön, hedefte
kalır).

**Savunma yapıları**: sur (%80), hendek (%35), altı kule (toplam %35,
okçu dolulukla ölçekli). Üçü tam seviyede ve kuleler tam kadroluyken
toplam **tam olarak %150** — yani tavan ulaşılabilir, ama altı kuleyi
Lvl 20'de doldurmak 240 okçu istiyor ve o askerler sefere gidemiyor.

**Moral bonusu** yeni: saldıran köy savunandan ne kadar kalabalıksa
savunan o kadar savunma bonusu alıyor — `(saldıranNüfus/savunanNüfus)^0,2 − 1`,
tavan %50. İki katı büyük saldırgana karşı %15, on katına karşı %50.
Küçük saldırırsa ceza yok. Sur bonusuna EKLENMİYOR, ayrı çarpan.

**Sağlık Çadırı**: yalnız SAVUNULAN savaşta ölenlerin bir kısmı yaralı
sayılıyor (seviye × %2, tavan %40). Yatak sınırlı, tedavi eğitim
süresinin iki katı ve kendiliğinden başlamıyor — oyuncu kimi ayağa
kaldıracağına karar veriyor.

→ **EK G** (savunma tabloları) ve **EK H** (formüller, moral, kuşatma).

---

## 8. Kahraman (RPG katmanı)

Her oyuncunun tek bir kahramanı var, Kahraman Konağında duruyor.

- **Seviye ve skil puanı**: XP savaştan ve maceradan geliyor; her seviye
  **4 skil puanı** veriyor. **Dört skil** var: kendi saldırı gücü, orduya
  saldırı yüzdesi (tavan %20), köye savunma yüzdesi (tavan %20) ve ham
  kaynak üretimi. İyileşme hızı, macera hızı, ganimet ve zırhlanma skil
  DEĞİL — kuşanılan **eşyalardan** geliyor.
- **Dokuz ekipman slotu**: miğfer, silah, zırh, kalkan, bileklik,
  pantolon, kolye, ayakkabı, at. Eşyalar **beş nadirlikte** düşüyor — Sıradan (gri),
  Ustaişi (yeşil), Nadir (mavi), Epik (mor), Efsanevi (turuncu) — ve
  nadirlik statı çarpıyor (×1 → ×3,6).
- **At hız veriyor**: kahraman yaya 7, iyi bir atla 12–19,5. Macera süresi
  de hızla ters orantılı kısalıyor.
- **Ölüm ve diriltme**: kahraman savaşta ölebiliyor; diriltmenin kaynak
  bedeli var ya da maceradan düşen diriltme iksiriyle bedava.
- **Macera**: kısa (2 sa) ve uzun (6 sa). Kuşanılabilir eşya kısada ~9,5
  macerada bir, uzunda ~2,6 macerada bir düşüyor.

→ **EK L**.

---

## 9. Ticaret ve pazar

- **NPC takası**: sabit oranla ham ↔ işlenmiş mal. Her zaman açık.
- **Oyuncular arası teklif panosu**: oyuncu kendi oranını koyuyor.
- **Karşılıksız hammadde gönderme**: köy adı ya da oyuncu adı yazarak,
  ya da haritadan kısayolla.
- **Kervanlar yürüyor**: mal anında gitmiyor, tüccar yola çıkıyor ve
  dönüyor. Kervan başına 1 boş işçi tutuluyor, dönüşte iade ediliyor.

→ **EK J**.

---

## 10. Çoklu köy, kültür puanı ve merkez

Yeni köy kurmak İKİ kapıdan geçiyor: **kültür puanı** ve **köşk/saray
seviyesi** (köşk 10/20, saray 10/15/20). Kurmak için 3 göçmen gerekiyor
ve gidiş tek yön — sefer geri çağrılamıyor.

Kültür puanı binalardan birikiyor; **şölenler** toplu puan veriyor.

**Merkez köy** (saray olan köy) tek ayrıcalığa sahip: tarlaları Lvl 20'ye
çıkabiliyor. Merkez taşınırsa eski merkezin tarlaları Lvl 10'a iniyor.

→ **EK K**.

---

## 11. Dünya, NPC'ler ve görevler

- Dünya merkezden dışa **beş kademeye** ayrılmış: Çiftlik → Kasaba → Kale
  → Jarl Köyü → Konak. Dışarı gittikçe NPC'ler zenginleşiyor ve
  güçleniyor (güç çarpanı 0,1 → 1,0).
- ~200 NPC köyü: yağma hedefi ve erken oyunun kaynağı. NPC'ler ara sıra
  oyunculara akın da düzenliyor.
- Köyler arası **en az 6 hex**; her köy çevresindeki **2 hex** yarıçapı
  sahipleniyor.
- **48 rehber görevi** (29 ana hat, 19 yan hedef) oyuncuya sırasıyla işçi
  atamayı, zinciri kurmayı, asker eğitmeyi, keşfi, saldırıyı ve yeni köy
  kurmayı öğretiyor.

**Acemi kalkanı** yeni ve artık OYUNCULARA karşı da geçerli: yeni köy ilk
7 oyun günü ya da nüfusu 200'e ulaşana kadar korunuyor (hangisi önce).
İlk saldırını gönderdiğin an kalkan düşüyor ve geri gelmiyor. Kalkanlı
köye saldırı, yağma ve keşif kapalı; takviye ve hammadde açık.

→ **EK M**.

---

## 12. BUGÜN OLMAYAN VE AÇIK KALAN ŞEYLER

Karar verirken bunları bilmek önemli:

1. **Oyunun bir AMACI yok.** Kazanma, bitiş, sezon, sıralama ödülü,
   "oyun bitti" ekranı — hiçbiri yok. Oyuncu sonsuza kadar büyüyor.
2. **İttifak / birlik yok.** Sırada duruyor ama yazılmadı. Oyuncular
   birbirine takviye ve kaynak gönderebiliyor, o kadar.
3. **Sıralama var ama ödülü yok.** İstatistik ekranında nüfus, ordu,
   savaş sayaçları ve "en güçlü kahraman" tabloları var; hiçbiri bir şeye
   yaramıyor.
4. **Sezon / dünya sıfırlama yok.** Dünya bir kez kuruldu.
5. **Oyuncu elenebiliyor**: bütün köyleri yıkılan oyuncu hesabıyla
   birlikte siliniyor. Yani "kaybetme" var, "kazanma" yok.
6. **Ekipman yükseltme süreleri Travian'ın çok altında.** Stat etkisi
   Travian'a yakın (Lvl 20'de +%35 vs ~+%30) ama süre değil: tam kadro
   bir Silahçıyla bir silahı sıfırdan Lvl 20'ye çıkarmak **1,9 oyun
   saati** sürüyor (Travian'da günler süren bir yatırım). Sebep, sürenin
   atanan işçi sayısına bölünmesi. Açık madde.
7. **Moral ve acemi kalkanı ekranda görünmüyor.** İkisi de savaş
   hesabına giriyor ama savaş raporunda ayrı satır olarak yazmıyor;
   oyuncu beklediğinden fazla kayıp verince sebebini göremiyor.
8. **Uygulanmayan iki denge maddesi**: köy merkezleri arası mesafeyi
   6→10 hex çıkarmak (mevcut dünyanın yeniden kurulmasını gerektirir) ve
   dünya hızını 10×→2–3× indirmek (oyun hissini kökten değiştirir).
   Düzeltilmiş eğriyle 10× sunucuda tek köy 3 günde maksimuma çıkıyor —
   yani hız kararı gerçekten açık bir denge sorusu.

---

## 13. KARAR SORUSU — oyunun amacı ve bitişi

**Soru:** TraNord'un amacı ne olmalı ve oyun nasıl bitmeli / nasıl
kazanılmalı?

### Cevabın uyması gereken kısıtlar

1. **Ticari ürün.** Oyuncunun oynamaya devam etmesi için bir sebep
   gerekiyor ama "asla bitmeyen" bir oyun da satın alınan bir şeyden çok
   bir hizmet gibi duruyor.
2. **Tek dünya, tek sunucu.** Paralel dünya / sezon altyapısı yok; sezon
   öneriliyorsa neyin sıfırlanıp neyin kalacağı da söylenmeli.
3. **Oyuncu sayısı az, dünya büyük** (~1729 slot, ~200 NPC, bir avuç
   oyuncu). Amaç, oyuncuların birbirine DEĞMESİNİ sağlamalı.
4. **Eleme zaten var.** Bir kazanma koşulu bununla çelişmemeli — herkesin
   elenip tek kişinin kalması aylar sürer ve son kalan için de eğlenceli
   olmaz.
5. **Elde hazır duran malzeme**: kültür puanı, çoklu köy, merkez köy,
   kahraman seviyesi, kuşatma ve köy yok etme, ticaret, takviye,
   istatistik sayaçları, NPC kademeleri (merkeze yaklaştıkça güçlenen bir
   dünya), şölen sistemi, acemi kalkanı, moral.
6. **Türkçe ve İskandinav teması** korunmalı.

### Özellikle görüş istenen noktalar

- Bitiş **olmalı mı**? (sezon sonu / kazanan / sonsuz sandbox)
- Kazanma koşulu **bireysel mi, ittifak mı**? (ittifak henüz yok; cevaba
  göre öncelik değişir)
- Dünyanın **merkezi** özel bir rol oynamalı mı? Kademeler zaten merkeze
  doğru güçleniyor — "merkezi ele geçir" gibi bir hedefe hazır zemin var.
- **Kültür puanı** yalnız köy kurmaya yarıyor; bir zafer ölçüsüne
  dönüştürülmeli mi?
- Kaybeden oyuncuya ne olmalı? (şu an tamamen siliniyor)
- Uzun vadeli hedef **inşa odaklı mı** (dünya harikası / anıt), **askerî
  mi** (belirli köyleri ele geçirme), yoksa **ekonomik mi**?
- **Dünya hızı** kaç olmalı? Düzeltilmiş eğriyle 10× çok hızlı görünüyor.

> Cevap verirken lütfen somut ol: hangi mekanik eklenecek, hangi sayı
> hangi eşikte, oyuncu bunu ekranda nasıl görecek ve oyunun kaç haftalık
> bir yay çizmesi bekleniyor.

---

# EK — BÜTÜN SAYILAR

> Bu ekteki **hiçbir sayı elle yazılmadı**: hepsi 16 Eylül 2026 tarihli
> koddan üretildi. Doküman koda göre yanlış olamaz.
>
> **BÜTÜN SÜRELER 1× HIZA GÖRE** — 1 oyun saati = 1 gerçek saat.
> Canlı sunucu 10× çalışıyor; orada aynı süreler gerçek zamanda onda
> birine iner. Dengeyi tartışırken 1× sayıları kullanın.
>
> İnşaat ve üretim süreleri **işçi sayısına bölünür**; tablolarda tek
> işçi karşılığı yazılı, tam kadro sütunu ayrıca veriliyor.

## A. BİRİMLER — güç, hız, taşıma, maliyet, süre

Birim statı **türetiliyor**: `(taban + Σ ekipman) × (1 + 0,04 × (n−1))`,
n = ekipman parçası sayısı. Taban ekipsiz asker: saldırı 0 ·
yaya sav. 10 · atlı sav. 10 · hız 10 · kapasite 60.

Maliyet = taşıdığı ekipmanların toplamı. Eğitim süresi = ekipman sayısı × 5 dk
(en az 3 dk), **eğitmen işçi sayısına bölünür**.

| Birim | Sınıf | Ekipman | Saldırı | Yaya sav. | Atlı sav. | Hız | Taşıma | Ekmek/gün | Kaynak maliyeti | Eğitim (1 eğitmen) | Bina şartı | Araştırma |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Fjordvakt** | Piyade | Kılıç | 30 | 30 | 20 | 7 | 50 | 6 | 16 külçe · 8 kereste | 5 dk | Kışla Lvl 1 | gerekmez |
| **Skjoldvakt** | Piyade | Kılıç + Kalkan | 36 | 57 | 36 | 5 | 40 | 8 | 21 külçe · 21 kereste | 10 dk | Kışla Lvl 4 | Rún Lvl 4 · 252 kereste · 189 tuğla · 189 yontma taş · 252 külçe · 59 dk |
| **Nordkamper** | Piyade | Kılıç + Zırh | 73 | 44 | 31 | 5 | 45 | 8 | 36 külçe · 13 kereste | 10 dk | Kışla Lvl 4 | Rún Lvl 4 · 252 kereste · 189 tuğla · 189 yontma taş · 252 külçe · 59 dk |
| **Ulv Savaşçısı** | Piyade | Kılıç + Zırh + Kalkan | 81 | 72 | 49 | 3 | 35 | 10 | 41 külçe · 26 kereste | 15 dk | Kışla Lvl 7 | Rún Lvl 7 · 769 kereste · 577 tuğla · 577 yontma taş · 769 külçe · 2.7 sa |
| **Spydvakt** | Piyade | Mızrak | 10 | 20 | 40 | 8 | 55 | 6 | 8 külçe · 12 kereste | 5 dk | Kışla Lvl 1 | gerekmez |
| **Isbjørn** | Piyade | Mızrak + Zırh | 52 | 33 | 52 | 6 | 50 | 8 | 28 külçe · 17 kereste | 10 dk | Kışla Lvl 4 | Rún Lvl 4 · 252 kereste · 189 tuğla · 189 yontma taş · 252 külçe · 59 dk |
| **Kuzey İzcisi** | Süvari | At | 10 | 10 | 10 | 14 | 0 | 6 | 40 tahıl · 10 kereste | 5 dk | Ahır Lvl 1 | gerekmez |
| **Demir Atlı** | Süvari | At + Kılıç | 42 | 52 | 42 | 11 | 100 | 8 | 40 tahıl · 18 kereste · 16 külçe | 10 dk | Ahır Lvl 4 | Rún Lvl 4 · 252 kereste · 189 tuğla · 189 yontma taş · 252 külçe · 59 dk |
| **Skjoldreiter** | Süvari | At + Kılıç + Kalkan | 49 | 81 | 59 | 9 | 90 | 10 | 40 tahıl · 31 kereste · 21 külçe | 15 dk | Ahır Lvl 7 | Rún Lvl 7 · 769 kereste · 577 tuğla · 577 yontma taş · 769 külçe · 2.7 sa |
| **Buz Süvarisi** | Süvari | At + Kılıç + Zırh | 86 | 67 | 54 | 9 | 95 | 10 | 40 tahıl · 23 kereste · 36 külçe | 15 dk | Ahır Lvl 7 | Rún Lvl 7 · 769 kereste · 577 tuğla · 577 yontma taş · 769 külçe · 2.7 sa |
| **Jernridder** | Süvari | At + Kılıç + Kalkan + Zırh | 95 | 97 | 73 | 7 | 85 | 12 | 40 tahıl · 36 kereste · 41 külçe | 20 dk | Ahır Lvl 10 | Rún Lvl 10 · 2.345 kereste · 1.759 tuğla · 1.759 yontma taş · 2.345 külçe · 7.4 sa |
| **Vindreiter** | Süvari | At + Mızrak | 21 | 42 | 62 | 12 | 105 | 8 | 40 tahıl · 22 kereste · 8 külçe | 10 dk | Ahır Lvl 4 | Rún Lvl 4 · 252 kereste · 189 tuğla · 189 yontma taş · 252 külçe · 59 dk |
| **Stormridder** | Süvari | At + Mızrak + Zırh | 65 | 56 | 76 | 10 | 100 | 10 | 40 tahıl · 27 kereste · 28 külçe | 15 dk | Ahır Lvl 7 | Rún Lvl 7 · 769 kereste · 577 tuğla · 577 yontma taş · 769 külçe · 2.7 sa |
| **Koçbaşı** | Kuşatma | Koçbaşı Parçaları | 60 | 30 | 75 | 4 | 0 | 6 | 120 kereste · 60 külçe | 5 dk | Atölye Lvl 1 | Rún Lvl 2 · 120 kereste · 90 tuğla · 90 yontma taş · 120 külçe · 30 dk |
| **Alev Mancınığı** | Kuşatma | Mancınık Parçaları | 75 | 60 | 10 | 3 | 0 | 6 | 200 kereste · 120 yontma taş · 100 külçe | 5 dk | Atölye Lvl 10 | Rún Lvl 10 · 2.345 kereste · 1.759 tuğla · 1.759 yontma taş · 2.345 külçe · 7.4 sa |
| **Göçmen** | Göçmen | — | 0 | 0 | 0 | 5 | 0 | 6 | 400 kereste · 350 tuğla · 350 yontma taş · 200 külçe | 4.0 sa | Köşk / Saray Lvl 10 | gerekmez |

**Kademe kapısı**: eğitim binasının seviyesi `1 + 3×(n−1)` olmalı — tek
ekipmanlı Lvl 1, iki Lvl 4, üç Lvl 7, dört ekipmanlı Lvl 10. Kuşatma
araçları bu kuralın dışında (kendi araştırma eşikleri var).

**Verimlilik — dengenin çekirdeği.** Tahıl 0,25 ağırlıkla sayıldı:

| Birim | n | Ağırlıklı kaynak | Toplam stat | stat/kaynak | Ekmek/gün | stat/ekmek |
|---|---|---|---|---|---|---|
| Spydvakt | 1 | 20 | 70 | **3.50** | 6 | **11.7** |
| Fjordvakt | 1 | 24 | 80 | **3.33** | 6 | **13.3** |
| Vindreiter | 2 | 40 | 125 | **3.13** | 8 | **15.6** |
| Demir Atlı | 2 | 44 | 136 | **3.09** | 8 | **17.0** |
| Skjoldvakt | 2 | 42 | 129 | **3.07** | 8 | **16.1** |
| Skjoldreiter | 3 | 62 | 189 | **3.05** | 10 | **18.9** |
| Jernridder | 4 | 87 | 265 | **3.05** | 12 | **22.1** |
| Isbjørn | 2 | 45 | 137 | **3.04** | 8 | **17.1** |
| Stormridder | 3 | 65 | 197 | **3.03** | 10 | **19.7** |
| Nordkamper | 2 | 49 | 148 | **3.02** | 8 | **18.5** |
| Ulv Savaşçısı | 3 | 67 | 202 | **3.01** | 10 | **20.2** |
| Buz Süvarisi | 3 | 69 | 207 | **3.00** | 10 | **20.7** |

İki sütun **zıt yönde** sıralanıyor: kaynak başına ucuz birim, tahıl
başına pahalı birim önde. Erken oyunda kıt olan kaynak, geç oyunda
tahıl — oyuncu büyüdükçe üst kademeye geçmek zorunda kalıyor.

## B. EKİPMAN — maliyet, süre, katkı

| Ekipman | Saldırı | Yaya sav. | Atlı sav. | Hız | Taşıma | Maliyet | Üretim süresi | Üretildiği bina |
|---|---|---|---|---|---|---|---|---|
| **Kılıç** | +30 | +20 | +10 | -3 | -10 | 16 külçe · 8 kereste | 4 sa | Silahçı |
| **Mızrak** | +10 | +10 | +30 | -2 | -5 | 8 külçe · 12 kereste | 3.5 sa | Silahçı |
| **Kalkan** | +5 | +25 | +15 | -2 | -10 | 13 kereste · 5 külçe | 2 sa | Zırhçı |
| **Zırh** | +40 | +12 | +10 | -2 | -5 | 20 külçe · 5 kereste | 2 sa | Zırhçı |
| **Koçbaşı Parçaları** | +20 | +0 | +0 | +0 | +0 | 120 kereste · 60 külçe | 6 sa | Atölye |
| **Mancınık Parçaları** | +25 | +0 | +0 | +0 | +0 | 200 kereste · 120 yontma taş · 100 külçe | 10 sa | Atölye |
| **At** | +10 | +20 | +20 | +4 | +50 | 40 tahıl · 10 kereste | 4 sa | Ahır |

**Ekipman kuralları**

- Her asker Kılıç veya Mızrak'tan birini taşır; ikisini birden taşıyamaz.
- Mızrak kullanan asker Kalkan taşıyamaz.
- Kalkan yalnızca kılıçlı askerlerle kullanılabilir.
- Her asker Zırh giyebilir (kılıçlı da, mızraklı da).
- Süvariler ekipmanlarını atla birlikte alır.

### Ekipman SEVİYE yükseltmeleri

Silahçı ve zırhçıda, 20 seviye. Her seviye o ekipmanın
KENDİ katkısını %1.75 artırıyor;
Lvl 20'de katkı %35 daha fazla.
Dört yükseltilebilir ekipmanın (kılıç, mızrak, kalkan, zırh) maliyeti aynı.
Süre **atanan işçiye bölünüyor**.

| Seviye | Maliyet | Süre (1 işçi) | Süre (60 işçi = Lvl 20 bina) |
|---|---|---|---|
| 0 → 1 | 150 kereste · 110 tuğla · 110 yontma taş · 150 külçe | 20 dk | 0 dk |
| 1 → 2 | 188 kereste · 138 tuğla · 138 yontma taş · 188 külçe | 25 dk | 0 dk |
| 2 → 3 | 234 kereste · 172 tuğla · 172 yontma taş · 234 külçe | 31 dk | 1 dk |
| … | … | … | … |
| 17 → 18 | 6.661 kereste · 4.885 tuğla · 4.885 yontma taş · 6.661 külçe | 14.8 sa | 15 dk |
| 18 → 19 | 8.327 kereste · 6.106 tuğla · 6.106 yontma taş · 8.327 külçe | 18.5 sa | 19 dk |
| 19 → 20 | 10.408 kereste · 7.633 tuğla · 7.633 yontma taş · 10.408 külçe | 23.1 sa | 23 dk |
| **Toplam 0 → 20** | **51.441 kereste · 37.727 tuğla · 37.727 yontma taş · 51.441 külçe** | **4.8 gün** | **1.9 sa** |

## C. KÖY BİNALARI

Kural: **inşa** (0→1) maliyeti `cost`; sonraki her yükseltme
`taban × 1.28^(seviye−1)`. Süre `tabanİş × 1.28^(seviye−1) / işçi`
oyun dakikası. Maliyet ve süre çarpanı **bütün binalarda aynı**.

### C.1 — Bina özeti

| Bina | Max Lvl | Ön koşul | İşçi/seviye | İnşa maliyeti (Lvl 1) | İnşa süresi (1 işçi) | Lvl 20 yükseltmesi | Lvl 20 süre (10 işçi) |
|---|---|---|---|---|---|---|---|
| **Ana Bina** | 20 | — | 3 | — | 50 dk | 2.977 kereste · 10.208 tuğla · 5.104 yontma taş · 4.679 külçe | 9.1 sa |
| **Keresteci** | 20 | Ana Bina Lvl 2 | 5 | 100 odun · 40 taş | 20 dk | 8.507 odun · 3.403 taş | 3.6 sa |
| **Tuğlacı** | 20 | Ana Bina Lvl 2 | 5 | 60 odun · 50 kil | 20 dk | 5.104 odun · 4.254 kil | 3.6 sa |
| **Taşçı** | 20 | Ana Bina Lvl 2 | 5 | 70 odun · 40 taş | 20 dk | 5.955 odun · 3.403 taş | 3.6 sa |
| **Demirci** | 20 | Ana Bina Lvl 2 | 5 | 80 odun · 40 taş | 20 dk | 6.806 odun · 3.403 taş | 3.6 sa |
| **Değirmen** | 20 | Ana Bina Lvl 3 + Tarla Lvl 3 | 5 | 90 odun · 30 taş | 20 dk | 7.656 odun · 2.552 taş | 3.6 sa |
| **Fırın** | 20 | Değirmen Lvl 3 | 5 | 60 odun · 40 kil | 20 dk | 5.104 odun · 3.403 kil | 3.6 sa |
| **Zırhçı** | 20 | Demirci Lvl 3 + Rún Salonu Lvl 1 | 3 | 45 kereste · 35 yontma taş · 35 külçe | 25 dk | 3.828 kereste · 2.977 yontma taş · 2.977 külçe | 4.5 sa |
| **Silahçı** | 20 | Demirci Lvl 3 + Rún Salonu Lvl 1 | 3 | 45 kereste · 35 yontma taş · 35 külçe | 25 dk | 3.828 kereste · 2.977 yontma taş · 2.977 külçe | 4.5 sa |
| **Ahır** | 20 | Kışla Lvl 3 + Rún Salonu Lvl 3 + Tarla Lvl 5 | 3 | 60 kereste · 60 tahıl | 35 dk | 5.104 kereste · 5.104 tahıl | 6.4 sa |
| **Rún Salonu** | 10 | Ana Bina Lvl 3 | 3 | 85 kereste · 110 yontma taş · 75 külçe | 40 dk | 612 kereste · 793 yontma taş · 540 külçe | 37 dk |
| **Kışla** | 20 | Ana Bina Lvl 3 + Rún Salonu Lvl 1 | 3 | 60 kereste · 70 yontma taş | 35 dk | 5.104 kereste · 5.955 yontma taş | 6.4 sa |
| **Atölye** | 20 | Ana Bina Lvl 5 + Demirci Lvl 5 + Rún Salonu Lvl 5 | 3 | 75 kereste · 75 külçe | 30 dk | 6.380 kereste · 6.380 külçe | 5.4 sa |
| **Cephanelik** | 20 | Silahçı/Zırhçı Lvl 1 | 3 | 60 kereste · 70 yontma taş · 35 külçe | 30 dk | 5.104 kereste · 5.955 yontma taş · 2.977 külçe | 5.4 sa |
| **Sağlık Çadırı** | 20 | Kışla Lvl 3 + Fırın Lvl 3 | 3 | 35 kereste · 30 tahıl | 25 dk | 2.977 kereste · 2.552 tahıl | 4.5 sa |
| **Kahraman Konağı** | 20 | Ana Bina Lvl 3 | 1 | 70 kereste · 90 yontma taş · 50 külçe | 35 dk | 5.955 kereste · 7.656 yontma taş · 4.254 külçe | 6.4 sa |
| **Hammadde Deposu** | 20 | Ana Bina Lvl 1 | 3 | 60 kereste · 60 yontma taş · 45 tuğla | 30 dk | 5.104 kereste · 5.104 yontma taş · 3.828 tuğla | 5.4 sa |
| **İşlenmiş Mal Deposu** | 20 | Keresteci/Tuğlacı/Taşçı/Demirci/Değirmen/Fırın Lvl 2 | 3 | 50 kereste · 60 yontma taş · 60 tuğla | 30 dk | 4.254 kereste · 5.104 yontma taş · 5.104 tuğla | 5.4 sa |
| **Tahıl Ambarı** | 20 | Değirmen Lvl 1 | 3 | 50 kereste · 45 yontma taş | 25 dk | 4.254 kereste · 3.828 yontma taş | 4.5 sa |
| **Erzak Ambarı** | 20 | Değirmen Lvl 1 | 3 | 50 kereste · 75 tuğla | 25 dk | 4.254 kereste · 6.380 tuğla | 4.5 sa |
| **Pazar** | 20 | Ana Bina Lvl 3 + Hammadde Deposu Lvl 2 | 3 | 60 kereste · 95 yontma taş | 40 dk | 5.104 kereste · 8.082 yontma taş | 7.3 sa |
| **Demirciler Loncası** | 5 | Demirci Lvl 5 | 3 | 50 kereste · 90 külçe | 30 dk | 105 kereste · 189 külçe | 8 dk |
| **Oduncular Loncası** | 5 | Keresteci Lvl 5 | 3 | 60 kereste · 45 yontma taş | 30 dk | 126 kereste · 94 yontma taş | 8 dk |
| **Taşçılar Loncası** | 5 | Taşçı Lvl 5 | 3 | 50 kereste · 70 yontma taş | 30 dk | 105 kereste · 147 yontma taş | 8 dk |
| **Kilciler Loncası** | 5 | Tuğlacı Lvl 5 | 3 | 50 kereste · 90 tuğla | 30 dk | 105 kereste · 189 tuğla | 8 dk |
| **Tahılcılar Loncası** | 5 | Değirmen Lvl 5 | 3 | 50 kereste · 60 tahıl | 30 dk | 105 kereste · 126 tahıl | 8 dk |
| **Köşk** | 20 | Ana Bina Lvl 5 + Taverna Lvl 1 | 3 | 75 kereste · 150 tuğla · 95 yontma taş · 75 külçe | 40 dk | 6.380 kereste · 12.761 tuğla · 8.082 yontma taş · 6.380 külçe | 7.3 sa |
| **Saray** | 20 | Ana Bina Lvl 8 + Taverna Lvl 3 | 3 | 120 kereste · 270 tuğla · 180 yontma taş · 180 külçe | 1.0 sa | 10.208 kereste · 22.969 tuğla · 15.313 yontma taş · 15.313 külçe | 10.9 sa |
| **Taverna** | 20 | Ana Bina Lvl 5 + Fırın Lvl 3 | 3 | 95 kereste · 180 tuğla · 100 tahıl | 35 dk | 8.082 kereste · 15.313 tuğla · 8.507 tahıl | 6.4 sa |
| **Ev** | 5 | Ana Bina Lvl 2 | 3 | 50 kereste · 75 tuğla | 15 dk | 105 kereste · 157 tuğla | 4 dk |
| **Sur** | 20 | Ana Bina Lvl 1 | 3 | 190 yontma taş · 25 kereste | 50 dk | 16.163 yontma taş · 2.127 kereste | 9.1 sa |
| **Hendek** | 20 | Sur Lvl 5 | 3 | 25 kereste · 95 yontma taş | 40 dk | 2.127 kereste · 8.082 yontma taş | 7.3 sa |
| **Savunma Kulesi** | 20 | Sur Lvl 3 + Rún Salonu Lvl 2 | 2 | 50 kereste · 95 yontma taş · 75 külçe | 45 dk | 4.254 kereste · 8.082 yontma taş · 6.380 külçe | 8.2 sa |

### C.2 — Seviye seviye maliyet ve süre

**Ana Bina** — max Lvl 20

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | — | 50 dk | 5 dk |
| 1 → 2 | 35 kereste · 120 tuğla · 60 yontma taş · 55 külçe | 1.1 sa | 6 dk |
| 2 → 3 | 45 kereste · 154 tuğla · 77 yontma taş · 70 külçe | 1.4 sa | 8 dk |
| 3 → 4 | 57 kereste · 197 tuğla · 98 yontma taş · 90 külçe | 1.7 sa | 10 dk |
| 4 → 5 | 73 kereste · 252 tuğla · 126 yontma taş · 115 külçe | 2.2 sa | 13 dk |
| 5 → 6 | 94 kereste · 322 tuğla · 161 yontma taş · 148 külçe | 2.9 sa | 17 dk |
| 6 → 7 | 120 kereste · 412 tuğla · 206 yontma taş · 189 külçe | 3.7 sa | 22 dk |
| 7 → 8 | 154 kereste · 528 tuğla · 264 yontma taş · 242 külçe | 4.7 sa | 28 dk |
| 8 → 9 | 197 kereste · 676 tuğla · 338 yontma taş · 310 külçe | 6.0 sa | 36 dk |
| 9 → 10 | 252 kereste · 865 tuğla · 432 yontma taş · 396 külçe | 7.7 sa | 46 dk |
| 10 → 11 | 323 kereste · 1.107 tuğla · 553 yontma taş · 507 külçe | 9.8 sa | 59 dk |
| 11 → 12 | 413 kereste · 1.417 tuğla · 708 yontma taş · 649 külçe | 12.6 sa | 1.3 sa |
| 12 → 13 | 529 kereste · 1.813 tuğla · 907 yontma taş · 831 külçe | 16.1 sa | 1.6 sa |
| 13 → 14 | 677 kereste · 2.321 tuğla · 1.161 yontma taş · 1.064 külçe | 20.6 sa | 2.1 sa |
| 14 → 15 | 867 kereste · 2.971 tuğla · 1.486 yontma taş · 1.362 külçe | 1.1 gün | 2.6 sa |
| 15 → 16 | 1.109 kereste · 3.803 tuğla · 1.901 yontma taş · 1.743 külçe | 1.4 gün | 3.4 sa |
| 16 → 17 | 1.420 kereste · 4.868 tuğla · 2.434 yontma taş · 2.231 külçe | 1.8 gün | 4.3 sa |
| 17 → 18 | 1.817 kereste · 6.231 tuğla · 3.115 yontma taş · 2.856 külçe | 2.3 gün | 5.5 sa |
| 18 → 19 | 2.326 kereste · 7.975 tuğla · 3.988 yontma taş · 3.655 külçe | 3.0 gün | 7.1 sa |
| 19 → 20 | 2.977 kereste · 10.208 tuğla · 5.104 yontma taş · 4.679 külçe | 3.8 gün | 9.1 sa |

**Keresteci** — max Lvl 20 · ön koşul: Ana Bina Lvl 2 · 5 işçi/seviye

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 100 odun · 40 taş | 20 dk | 2 dk |
| 1 → 2 | 100 odun · 40 taş | 26 dk | 3 dk |
| 2 → 3 | 128 odun · 51 taş | 33 dk | 3 dk |
| 3 → 4 | 164 odun · 66 taş | 42 dk | 4 dk |
| 4 → 5 | 210 odun · 84 taş | 54 dk | 5 dk |
| 5 → 6 | 268 odun · 107 taş | 1.1 sa | 7 dk |
| 6 → 7 | 344 odun · 137 taş | 1.5 sa | 9 dk |
| 7 → 8 | 440 odun · 176 taş | 1.9 sa | 11 dk |
| 8 → 9 | 563 odun · 225 taş | 2.4 sa | 14 dk |
| 9 → 10 | 721 odun · 288 taş | 3.1 sa | 18 dk |
| 10 → 11 | 922 odun · 369 taş | 3.9 sa | 24 dk |
| 11 → 12 | 1.181 odun · 472 taş | 5.0 sa | 30 dk |
| 12 → 13 | 1.511 odun · 604 taş | 6.4 sa | 39 dk |
| 13 → 14 | 1.934 odun · 774 taş | 8.3 sa | 50 dk |
| 14 → 15 | 2.476 odun · 990 taş | 10.6 sa | 1.1 sa |
| 15 → 16 | 3.169 odun · 1.268 taş | 13.5 sa | 1.4 sa |
| 16 → 17 | 4.056 odun · 1.623 taş | 17.3 sa | 1.7 sa |
| 17 → 18 | 5.192 odun · 2.077 taş | 22.2 sa | 2.2 sa |
| 18 → 19 | 6.646 odun · 2.658 taş | 1.2 gün | 2.8 sa |
| 19 → 20 | 8.507 odun · 3.403 taş | 1.5 gün | 3.6 sa |

**Tuğlacı** — max Lvl 20 · ön koşul: Ana Bina Lvl 2 · 5 işçi/seviye

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 60 odun · 50 kil | 20 dk | 2 dk |
| 1 → 2 | 60 odun · 50 kil | 26 dk | 3 dk |
| 2 → 3 | 77 odun · 64 kil | 33 dk | 3 dk |
| 3 → 4 | 98 odun · 82 kil | 42 dk | 4 dk |
| 4 → 5 | 126 odun · 105 kil | 54 dk | 5 dk |
| 5 → 6 | 161 odun · 134 kil | 1.1 sa | 7 dk |
| 6 → 7 | 206 odun · 172 kil | 1.5 sa | 9 dk |
| 7 → 8 | 264 odun · 220 kil | 1.9 sa | 11 dk |
| 8 → 9 | 338 odun · 281 kil | 2.4 sa | 14 dk |
| 9 → 10 | 432 odun · 360 kil | 3.1 sa | 18 dk |
| 10 → 11 | 553 odun · 461 kil | 3.9 sa | 24 dk |
| 11 → 12 | 708 odun · 590 kil | 5.0 sa | 30 dk |
| 12 → 13 | 907 odun · 756 kil | 6.4 sa | 39 dk |
| 13 → 14 | 1.161 odun · 967 kil | 8.3 sa | 50 dk |
| 14 → 15 | 1.486 odun · 1.238 kil | 10.6 sa | 1.1 sa |
| 15 → 16 | 1.901 odun · 1.585 kil | 13.5 sa | 1.4 sa |
| 16 → 17 | 2.434 odun · 2.028 kil | 17.3 sa | 1.7 sa |
| 17 → 18 | 3.115 odun · 2.596 kil | 22.2 sa | 2.2 sa |
| 18 → 19 | 3.988 odun · 3.323 kil | 1.2 gün | 2.8 sa |
| 19 → 20 | 5.104 odun · 4.254 kil | 1.5 gün | 3.6 sa |

**Taşçı** — max Lvl 20 · ön koşul: Ana Bina Lvl 2 · 5 işçi/seviye

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 70 odun · 40 taş | 20 dk | 2 dk |
| 1 → 2 | 70 odun · 40 taş | 26 dk | 3 dk |
| 2 → 3 | 90 odun · 51 taş | 33 dk | 3 dk |
| 3 → 4 | 115 odun · 66 taş | 42 dk | 4 dk |
| 4 → 5 | 147 odun · 84 taş | 54 dk | 5 dk |
| 5 → 6 | 188 odun · 107 taş | 1.1 sa | 7 dk |
| 6 → 7 | 241 odun · 137 taş | 1.5 sa | 9 dk |
| 7 → 8 | 308 odun · 176 taş | 1.9 sa | 11 dk |
| 8 → 9 | 394 odun · 225 taş | 2.4 sa | 14 dk |
| 9 → 10 | 504 odun · 288 taş | 3.1 sa | 18 dk |
| 10 → 11 | 646 odun · 369 taş | 3.9 sa | 24 dk |
| 11 → 12 | 826 odun · 472 taş | 5.0 sa | 30 dk |
| 12 → 13 | 1.058 odun · 604 taş | 6.4 sa | 39 dk |
| 13 → 14 | 1.354 odun · 774 taş | 8.3 sa | 50 dk |
| 14 → 15 | 1.733 odun · 990 taş | 10.6 sa | 1.1 sa |
| 15 → 16 | 2.218 odun · 1.268 taş | 13.5 sa | 1.4 sa |
| 16 → 17 | 2.840 odun · 1.623 taş | 17.3 sa | 1.7 sa |
| 17 → 18 | 3.635 odun · 2.077 taş | 22.2 sa | 2.2 sa |
| 18 → 19 | 4.652 odun · 2.658 taş | 1.2 gün | 2.8 sa |
| 19 → 20 | 5.955 odun · 3.403 taş | 1.5 gün | 3.6 sa |

**Demirci** — max Lvl 20 · ön koşul: Ana Bina Lvl 2 · 5 işçi/seviye

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 80 odun · 40 taş | 20 dk | 2 dk |
| 1 → 2 | 80 odun · 40 taş | 26 dk | 3 dk |
| 2 → 3 | 102 odun · 51 taş | 33 dk | 3 dk |
| 3 → 4 | 131 odun · 66 taş | 42 dk | 4 dk |
| 4 → 5 | 168 odun · 84 taş | 54 dk | 5 dk |
| 5 → 6 | 215 odun · 107 taş | 1.1 sa | 7 dk |
| 6 → 7 | 275 odun · 137 taş | 1.5 sa | 9 dk |
| 7 → 8 | 352 odun · 176 taş | 1.9 sa | 11 dk |
| 8 → 9 | 450 odun · 225 taş | 2.4 sa | 14 dk |
| 9 → 10 | 576 odun · 288 taş | 3.1 sa | 18 dk |
| 10 → 11 | 738 odun · 369 taş | 3.9 sa | 24 dk |
| 11 → 12 | 944 odun · 472 taş | 5.0 sa | 30 dk |
| 12 → 13 | 1.209 odun · 604 taş | 6.4 sa | 39 dk |
| 13 → 14 | 1.547 odun · 774 taş | 8.3 sa | 50 dk |
| 14 → 15 | 1.981 odun · 990 taş | 10.6 sa | 1.1 sa |
| 15 → 16 | 2.535 odun · 1.268 taş | 13.5 sa | 1.4 sa |
| 16 → 17 | 3.245 odun · 1.623 taş | 17.3 sa | 1.7 sa |
| 17 → 18 | 4.154 odun · 2.077 taş | 22.2 sa | 2.2 sa |
| 18 → 19 | 5.317 odun · 2.658 taş | 1.2 gün | 2.8 sa |
| 19 → 20 | 6.806 odun · 3.403 taş | 1.5 gün | 3.6 sa |

**Değirmen** — max Lvl 20 · ön koşul: Ana Bina Lvl 3 + Tarla Lvl 3 · 5 işçi/seviye

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 90 odun · 30 taş | 20 dk | 2 dk |
| 1 → 2 | 90 odun · 30 taş | 26 dk | 3 dk |
| 2 → 3 | 115 odun · 38 taş | 33 dk | 3 dk |
| 3 → 4 | 147 odun · 49 taş | 42 dk | 4 dk |
| 4 → 5 | 189 odun · 63 taş | 54 dk | 5 dk |
| 5 → 6 | 242 odun · 81 taş | 1.1 sa | 7 dk |
| 6 → 7 | 309 odun · 103 taş | 1.5 sa | 9 dk |
| 7 → 8 | 396 odun · 132 taş | 1.9 sa | 11 dk |
| 8 → 9 | 507 odun · 169 taş | 2.4 sa | 14 dk |
| 9 → 10 | 649 odun · 216 taş | 3.1 sa | 18 dk |
| 10 → 11 | 830 odun · 277 taş | 3.9 sa | 24 dk |
| 11 → 12 | 1.063 odun · 354 taş | 5.0 sa | 30 dk |
| 12 → 13 | 1.360 odun · 453 taş | 6.4 sa | 39 dk |
| 13 → 14 | 1.741 odun · 580 taş | 8.3 sa | 50 dk |
| 14 → 15 | 2.228 odun · 743 taş | 10.6 sa | 1.1 sa |
| 15 → 16 | 2.852 odun · 951 taş | 13.5 sa | 1.4 sa |
| 16 → 17 | 3.651 odun · 1.217 taş | 17.3 sa | 1.7 sa |
| 17 → 18 | 4.673 odun · 1.558 taş | 22.2 sa | 2.2 sa |
| 18 → 19 | 5.982 odun · 1.994 taş | 1.2 gün | 2.8 sa |
| 19 → 20 | 7.656 odun · 2.552 taş | 1.5 gün | 3.6 sa |

**Fırın** — max Lvl 20 · ön koşul: Değirmen Lvl 3 · 5 işçi/seviye

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 60 odun · 40 kil | 20 dk | 2 dk |
| 1 → 2 | 60 odun · 40 kil | 26 dk | 3 dk |
| 2 → 3 | 77 odun · 51 kil | 33 dk | 3 dk |
| 3 → 4 | 98 odun · 66 kil | 42 dk | 4 dk |
| 4 → 5 | 126 odun · 84 kil | 54 dk | 5 dk |
| 5 → 6 | 161 odun · 107 kil | 1.1 sa | 7 dk |
| 6 → 7 | 206 odun · 137 kil | 1.5 sa | 9 dk |
| 7 → 8 | 264 odun · 176 kil | 1.9 sa | 11 dk |
| 8 → 9 | 338 odun · 225 kil | 2.4 sa | 14 dk |
| 9 → 10 | 432 odun · 288 kil | 3.1 sa | 18 dk |
| 10 → 11 | 553 odun · 369 kil | 3.9 sa | 24 dk |
| 11 → 12 | 708 odun · 472 kil | 5.0 sa | 30 dk |
| 12 → 13 | 907 odun · 604 kil | 6.4 sa | 39 dk |
| 13 → 14 | 1.161 odun · 774 kil | 8.3 sa | 50 dk |
| 14 → 15 | 1.486 odun · 990 kil | 10.6 sa | 1.1 sa |
| 15 → 16 | 1.901 odun · 1.268 kil | 13.5 sa | 1.4 sa |
| 16 → 17 | 2.434 odun · 1.623 kil | 17.3 sa | 1.7 sa |
| 17 → 18 | 3.115 odun · 2.077 kil | 22.2 sa | 2.2 sa |
| 18 → 19 | 3.988 odun · 2.658 kil | 1.2 gün | 2.8 sa |
| 19 → 20 | 5.104 odun · 3.403 kil | 1.5 gün | 3.6 sa |

**Zırhçı** — max Lvl 20 · ön koşul: Demirci Lvl 3 + Rún Salonu Lvl 1 · 3 işçi/seviye

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 45 kereste · 35 yontma taş · 35 külçe | 25 dk | 3 dk |
| 1 → 2 | 45 kereste · 35 yontma taş · 35 külçe | 32 dk | 3 dk |
| 2 → 3 | 58 kereste · 45 yontma taş · 45 külçe | 41 dk | 4 dk |
| 3 → 4 | 74 kereste · 57 yontma taş · 57 külçe | 52 dk | 5 dk |
| 4 → 5 | 94 kereste · 73 yontma taş · 73 külçe | 1.1 sa | 7 dk |
| 5 → 6 | 121 kereste · 94 yontma taş · 94 külçe | 1.4 sa | 9 dk |
| 6 → 7 | 155 kereste · 120 yontma taş · 120 külçe | 1.8 sa | 11 dk |
| 7 → 8 | 198 kereste · 154 yontma taş · 154 külçe | 2.3 sa | 14 dk |
| 8 → 9 | 253 kereste · 197 yontma taş · 197 külçe | 3.0 sa | 18 dk |
| 9 → 10 | 324 kereste · 252 yontma taş · 252 külçe | 3.8 sa | 23 dk |
| 10 → 11 | 415 kereste · 323 yontma taş · 323 külçe | 4.9 sa | 30 dk |
| 11 → 12 | 531 kereste · 413 yontma taş · 413 külçe | 6.3 sa | 38 dk |
| 12 → 13 | 680 kereste · 529 yontma taş · 529 külçe | 8.1 sa | 48 dk |
| 13 → 14 | 870 kereste · 677 yontma taş · 677 külçe | 10.3 sa | 1.0 sa |
| 14 → 15 | 1.114 kereste · 867 yontma taş · 867 külçe | 13.2 sa | 1.3 sa |
| 15 → 16 | 1.426 kereste · 1.109 yontma taş · 1.109 külçe | 16.9 sa | 1.7 sa |
| 16 → 17 | 1.825 kereste · 1.420 yontma taş · 1.420 külçe | 21.6 sa | 2.2 sa |
| 17 → 18 | 2.337 kereste · 1.817 yontma taş · 1.817 külçe | 1.2 gün | 2.8 sa |
| 18 → 19 | 2.991 kereste · 2.326 yontma taş · 2.326 külçe | 1.5 gün | 3.5 sa |
| 19 → 20 | 3.828 kereste · 2.977 yontma taş · 2.977 külçe | 1.9 gün | 4.5 sa |

**Silahçı** — max Lvl 20 · ön koşul: Demirci Lvl 3 + Rún Salonu Lvl 1 · 3 işçi/seviye

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 45 kereste · 35 yontma taş · 35 külçe | 25 dk | 3 dk |
| 1 → 2 | 45 kereste · 35 yontma taş · 35 külçe | 32 dk | 3 dk |
| 2 → 3 | 58 kereste · 45 yontma taş · 45 külçe | 41 dk | 4 dk |
| 3 → 4 | 74 kereste · 57 yontma taş · 57 külçe | 52 dk | 5 dk |
| 4 → 5 | 94 kereste · 73 yontma taş · 73 külçe | 1.1 sa | 7 dk |
| 5 → 6 | 121 kereste · 94 yontma taş · 94 külçe | 1.4 sa | 9 dk |
| 6 → 7 | 155 kereste · 120 yontma taş · 120 külçe | 1.8 sa | 11 dk |
| 7 → 8 | 198 kereste · 154 yontma taş · 154 külçe | 2.3 sa | 14 dk |
| 8 → 9 | 253 kereste · 197 yontma taş · 197 külçe | 3.0 sa | 18 dk |
| 9 → 10 | 324 kereste · 252 yontma taş · 252 külçe | 3.8 sa | 23 dk |
| 10 → 11 | 415 kereste · 323 yontma taş · 323 külçe | 4.9 sa | 30 dk |
| 11 → 12 | 531 kereste · 413 yontma taş · 413 külçe | 6.3 sa | 38 dk |
| 12 → 13 | 680 kereste · 529 yontma taş · 529 külçe | 8.1 sa | 48 dk |
| 13 → 14 | 870 kereste · 677 yontma taş · 677 külçe | 10.3 sa | 1.0 sa |
| 14 → 15 | 1.114 kereste · 867 yontma taş · 867 külçe | 13.2 sa | 1.3 sa |
| 15 → 16 | 1.426 kereste · 1.109 yontma taş · 1.109 külçe | 16.9 sa | 1.7 sa |
| 16 → 17 | 1.825 kereste · 1.420 yontma taş · 1.420 külçe | 21.6 sa | 2.2 sa |
| 17 → 18 | 2.337 kereste · 1.817 yontma taş · 1.817 külçe | 1.2 gün | 2.8 sa |
| 18 → 19 | 2.991 kereste · 2.326 yontma taş · 2.326 külçe | 1.5 gün | 3.5 sa |
| 19 → 20 | 3.828 kereste · 2.977 yontma taş · 2.977 külçe | 1.9 gün | 4.5 sa |

**Ahır** — max Lvl 20 · ön koşul: Kışla Lvl 3 + Rún Salonu Lvl 3 + Tarla Lvl 5 · 3 işçi/seviye

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 60 kereste · 60 tahıl | 35 dk | 4 dk |
| 1 → 2 | 60 kereste · 60 tahıl | 45 dk | 4 dk |
| 2 → 3 | 77 kereste · 77 tahıl | 57 dk | 6 dk |
| 3 → 4 | 98 kereste · 98 tahıl | 1.2 sa | 7 dk |
| 4 → 5 | 126 kereste · 126 tahıl | 1.6 sa | 9 dk |
| 5 → 6 | 161 kereste · 161 tahıl | 2.0 sa | 12 dk |
| 6 → 7 | 206 kereste · 206 tahıl | 2.6 sa | 15 dk |
| 7 → 8 | 264 kereste · 264 tahıl | 3.3 sa | 20 dk |
| 8 → 9 | 338 kereste · 338 tahıl | 4.2 sa | 25 dk |
| 9 → 10 | 432 kereste · 432 tahıl | 5.4 sa | 32 dk |
| 10 → 11 | 553 kereste · 553 tahıl | 6.9 sa | 41 dk |
| 11 → 12 | 708 kereste · 708 tahıl | 8.8 sa | 53 dk |
| 12 → 13 | 907 kereste · 907 tahıl | 11.3 sa | 1.1 sa |
| 13 → 14 | 1.161 kereste · 1.161 tahıl | 14.4 sa | 1.4 sa |
| 14 → 15 | 1.486 kereste · 1.486 tahıl | 18.5 sa | 1.8 sa |
| 15 → 16 | 1.901 kereste · 1.901 tahıl | 23.7 sa | 2.4 sa |
| 16 → 17 | 2.434 kereste · 2.434 tahıl | 1.3 gün | 3.0 sa |
| 17 → 18 | 3.115 kereste · 3.115 tahıl | 1.6 gün | 3.9 sa |
| 18 → 19 | 3.988 kereste · 3.988 tahıl | 2.1 gün | 5.0 sa |
| 19 → 20 | 5.104 kereste · 5.104 tahıl | 2.6 gün | 6.4 sa |

**Rún Salonu** — max Lvl 10 · ön koşul: Ana Bina Lvl 3 · 3 işçi/seviye

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 85 kereste · 110 yontma taş · 75 külçe | 40 dk | 4 dk |
| 1 → 2 | 85 kereste · 110 yontma taş · 75 külçe | 51 dk | 5 dk |
| 2 → 3 | 109 kereste · 141 yontma taş · 96 külçe | 1.1 sa | 7 dk |
| 3 → 4 | 139 kereste · 180 yontma taş · 123 külçe | 1.4 sa | 8 dk |
| 4 → 5 | 178 kereste · 231 yontma taş · 157 külçe | 1.8 sa | 11 dk |
| 5 → 6 | 228 kereste · 295 yontma taş · 201 külçe | 2.3 sa | 14 dk |
| 6 → 7 | 292 kereste · 378 yontma taş · 258 külçe | 2.9 sa | 18 dk |
| 7 → 8 | 374 kereste · 484 yontma taş · 330 külçe | 3.8 sa | 23 dk |
| 8 → 9 | 479 kereste · 619 yontma taş · 422 külçe | 4.8 sa | 29 dk |
| 9 → 10 | 612 kereste · 793 yontma taş · 540 külçe | 6.1 sa | 37 dk |

**Kışla** — max Lvl 20 · ön koşul: Ana Bina Lvl 3 + Rún Salonu Lvl 1 · 3 işçi/seviye

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 60 kereste · 70 yontma taş | 35 dk | 4 dk |
| 1 → 2 | 60 kereste · 70 yontma taş | 45 dk | 4 dk |
| 2 → 3 | 77 kereste · 90 yontma taş | 57 dk | 6 dk |
| 3 → 4 | 98 kereste · 115 yontma taş | 1.2 sa | 7 dk |
| 4 → 5 | 126 kereste · 147 yontma taş | 1.6 sa | 9 dk |
| 5 → 6 | 161 kereste · 188 yontma taş | 2.0 sa | 12 dk |
| 6 → 7 | 206 kereste · 241 yontma taş | 2.6 sa | 15 dk |
| 7 → 8 | 264 kereste · 308 yontma taş | 3.3 sa | 20 dk |
| 8 → 9 | 338 kereste · 394 yontma taş | 4.2 sa | 25 dk |
| 9 → 10 | 432 kereste · 504 yontma taş | 5.4 sa | 32 dk |
| 10 → 11 | 553 kereste · 646 yontma taş | 6.9 sa | 41 dk |
| 11 → 12 | 708 kereste · 826 yontma taş | 8.8 sa | 53 dk |
| 12 → 13 | 907 kereste · 1.058 yontma taş | 11.3 sa | 1.1 sa |
| 13 → 14 | 1.161 kereste · 1.354 yontma taş | 14.4 sa | 1.4 sa |
| 14 → 15 | 1.486 kereste · 1.733 yontma taş | 18.5 sa | 1.8 sa |
| 15 → 16 | 1.901 kereste · 2.218 yontma taş | 23.7 sa | 2.4 sa |
| 16 → 17 | 2.434 kereste · 2.840 yontma taş | 1.3 gün | 3.0 sa |
| 17 → 18 | 3.115 kereste · 3.635 yontma taş | 1.6 gün | 3.9 sa |
| 18 → 19 | 3.988 kereste · 4.652 yontma taş | 2.1 gün | 5.0 sa |
| 19 → 20 | 5.104 kereste · 5.955 yontma taş | 2.6 gün | 6.4 sa |

**Atölye** — max Lvl 20 · ön koşul: Ana Bina Lvl 5 + Demirci Lvl 5 + Rún Salonu Lvl 5 · 3 işçi/seviye

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 75 kereste · 75 külçe | 30 dk | 3 dk |
| 1 → 2 | 75 kereste · 75 külçe | 38 dk | 4 dk |
| 2 → 3 | 96 kereste · 96 külçe | 49 dk | 5 dk |
| 3 → 4 | 123 kereste · 123 külçe | 1.0 sa | 6 dk |
| 4 → 5 | 157 kereste · 157 külçe | 1.3 sa | 8 dk |
| 5 → 6 | 201 kereste · 201 külçe | 1.7 sa | 10 dk |
| 6 → 7 | 258 kereste · 258 külçe | 2.2 sa | 13 dk |
| 7 → 8 | 330 kereste · 330 külçe | 2.8 sa | 17 dk |
| 8 → 9 | 422 kereste · 422 külçe | 3.6 sa | 22 dk |
| 9 → 10 | 540 kereste · 540 külçe | 4.6 sa | 28 dk |
| 10 → 11 | 692 kereste · 692 külçe | 5.9 sa | 35 dk |
| 11 → 12 | 885 kereste · 885 külçe | 7.6 sa | 45 dk |
| 12 → 13 | 1.133 kereste · 1.133 külçe | 9.7 sa | 58 dk |
| 13 → 14 | 1.451 kereste · 1.451 külçe | 12.4 sa | 1.2 sa |
| 14 → 15 | 1.857 kereste · 1.857 külçe | 15.8 sa | 1.6 sa |
| 15 → 16 | 2.377 kereste · 2.377 külçe | 20.3 sa | 2.0 sa |
| 16 → 17 | 3.042 kereste · 3.042 külçe | 1.1 gün | 2.6 sa |
| 17 → 18 | 3.894 kereste · 3.894 külçe | 1.4 gün | 3.3 sa |
| 18 → 19 | 4.985 kereste · 4.985 külçe | 1.8 gün | 4.3 sa |
| 19 → 20 | 6.380 kereste · 6.380 külçe | 2.3 gün | 5.4 sa |

**Cephanelik** — max Lvl 20 · ön koşul: Silahçı/Zırhçı Lvl 1

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 60 kereste · 70 yontma taş · 35 külçe | 30 dk | 3 dk |
| 1 → 2 | 60 kereste · 70 yontma taş · 35 külçe | 38 dk | 4 dk |
| 2 → 3 | 77 kereste · 90 yontma taş · 45 külçe | 49 dk | 5 dk |
| 3 → 4 | 98 kereste · 115 yontma taş · 57 külçe | 1.0 sa | 6 dk |
| 4 → 5 | 126 kereste · 147 yontma taş · 73 külçe | 1.3 sa | 8 dk |
| 5 → 6 | 161 kereste · 188 yontma taş · 94 külçe | 1.7 sa | 10 dk |
| 6 → 7 | 206 kereste · 241 yontma taş · 120 külçe | 2.2 sa | 13 dk |
| 7 → 8 | 264 kereste · 308 yontma taş · 154 külçe | 2.8 sa | 17 dk |
| 8 → 9 | 338 kereste · 394 yontma taş · 197 külçe | 3.6 sa | 22 dk |
| 9 → 10 | 432 kereste · 504 yontma taş · 252 külçe | 4.6 sa | 28 dk |
| 10 → 11 | 553 kereste · 646 yontma taş · 323 külçe | 5.9 sa | 35 dk |
| 11 → 12 | 708 kereste · 826 yontma taş · 413 külçe | 7.6 sa | 45 dk |
| 12 → 13 | 907 kereste · 1.058 yontma taş · 529 külçe | 9.7 sa | 58 dk |
| 13 → 14 | 1.161 kereste · 1.354 yontma taş · 677 külçe | 12.4 sa | 1.2 sa |
| 14 → 15 | 1.486 kereste · 1.733 yontma taş · 867 külçe | 15.8 sa | 1.6 sa |
| 15 → 16 | 1.901 kereste · 2.218 yontma taş · 1.109 külçe | 20.3 sa | 2.0 sa |
| 16 → 17 | 2.434 kereste · 2.840 yontma taş · 1.420 külçe | 1.1 gün | 2.6 sa |
| 17 → 18 | 3.115 kereste · 3.635 yontma taş · 1.817 külçe | 1.4 gün | 3.3 sa |
| 18 → 19 | 3.988 kereste · 4.652 yontma taş · 2.326 külçe | 1.8 gün | 4.3 sa |
| 19 → 20 | 5.104 kereste · 5.955 yontma taş · 2.977 külçe | 2.3 gün | 5.4 sa |

**Sağlık Çadırı** — max Lvl 20 · ön koşul: Kışla Lvl 3 + Fırın Lvl 3

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 35 kereste · 30 tahıl | 25 dk | 3 dk |
| 1 → 2 | 35 kereste · 30 tahıl | 32 dk | 3 dk |
| 2 → 3 | 45 kereste · 38 tahıl | 41 dk | 4 dk |
| 3 → 4 | 57 kereste · 49 tahıl | 52 dk | 5 dk |
| 4 → 5 | 73 kereste · 63 tahıl | 1.1 sa | 7 dk |
| 5 → 6 | 94 kereste · 81 tahıl | 1.4 sa | 9 dk |
| 6 → 7 | 120 kereste · 103 tahıl | 1.8 sa | 11 dk |
| 7 → 8 | 154 kereste · 132 tahıl | 2.3 sa | 14 dk |
| 8 → 9 | 197 kereste · 169 tahıl | 3.0 sa | 18 dk |
| 9 → 10 | 252 kereste · 216 tahıl | 3.8 sa | 23 dk |
| 10 → 11 | 323 kereste · 277 tahıl | 4.9 sa | 30 dk |
| 11 → 12 | 413 kereste · 354 tahıl | 6.3 sa | 38 dk |
| 12 → 13 | 529 kereste · 453 tahıl | 8.1 sa | 48 dk |
| 13 → 14 | 677 kereste · 580 tahıl | 10.3 sa | 1.0 sa |
| 14 → 15 | 867 kereste · 743 tahıl | 13.2 sa | 1.3 sa |
| 15 → 16 | 1.109 kereste · 951 tahıl | 16.9 sa | 1.7 sa |
| 16 → 17 | 1.420 kereste · 1.217 tahıl | 21.6 sa | 2.2 sa |
| 17 → 18 | 1.817 kereste · 1.558 tahıl | 1.2 gün | 2.8 sa |
| 18 → 19 | 2.326 kereste · 1.994 tahıl | 1.5 gün | 3.5 sa |
| 19 → 20 | 2.977 kereste · 2.552 tahıl | 1.9 gün | 4.5 sa |

**Kahraman Konağı** — max Lvl 20 · ön koşul: Ana Bina Lvl 3 · 1 işçi/seviye

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 70 kereste · 90 yontma taş · 50 külçe | 35 dk | 4 dk |
| 1 → 2 | 70 kereste · 90 yontma taş · 50 külçe | 45 dk | 4 dk |
| 2 → 3 | 90 kereste · 115 yontma taş · 64 külçe | 57 dk | 6 dk |
| 3 → 4 | 115 kereste · 147 yontma taş · 82 külçe | 1.2 sa | 7 dk |
| 4 → 5 | 147 kereste · 189 yontma taş · 105 külçe | 1.6 sa | 9 dk |
| 5 → 6 | 188 kereste · 242 yontma taş · 134 külçe | 2.0 sa | 12 dk |
| 6 → 7 | 241 kereste · 309 yontma taş · 172 külçe | 2.6 sa | 15 dk |
| 7 → 8 | 308 kereste · 396 yontma taş · 220 külçe | 3.3 sa | 20 dk |
| 8 → 9 | 394 kereste · 507 yontma taş · 281 külçe | 4.2 sa | 25 dk |
| 9 → 10 | 504 kereste · 649 yontma taş · 360 külçe | 5.4 sa | 32 dk |
| 10 → 11 | 646 kereste · 830 yontma taş · 461 külçe | 6.9 sa | 41 dk |
| 11 → 12 | 826 kereste · 1.063 yontma taş · 590 külçe | 8.8 sa | 53 dk |
| 12 → 13 | 1.058 kereste · 1.360 yontma taş · 756 külçe | 11.3 sa | 1.1 sa |
| 13 → 14 | 1.354 kereste · 1.741 yontma taş · 967 külçe | 14.4 sa | 1.4 sa |
| 14 → 15 | 1.733 kereste · 2.228 yontma taş · 1.238 külçe | 18.5 sa | 1.8 sa |
| 15 → 16 | 2.218 kereste · 2.852 yontma taş · 1.585 külçe | 23.7 sa | 2.4 sa |
| 16 → 17 | 2.840 kereste · 3.651 yontma taş · 2.028 külçe | 1.3 gün | 3.0 sa |
| 17 → 18 | 3.635 kereste · 4.673 yontma taş · 2.596 külçe | 1.6 gün | 3.9 sa |
| 18 → 19 | 4.652 kereste · 5.982 yontma taş · 3.323 külçe | 2.1 gün | 5.0 sa |
| 19 → 20 | 5.955 kereste · 7.656 yontma taş · 4.254 külçe | 2.6 gün | 6.4 sa |

**Hammadde Deposu** — max Lvl 20 · ön koşul: Ana Bina Lvl 1

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 60 kereste · 60 yontma taş · 45 tuğla | 30 dk | 3 dk |
| 1 → 2 | 60 kereste · 60 yontma taş · 45 tuğla | 38 dk | 4 dk |
| 2 → 3 | 77 kereste · 77 yontma taş · 58 tuğla | 49 dk | 5 dk |
| 3 → 4 | 98 kereste · 98 yontma taş · 74 tuğla | 1.0 sa | 6 dk |
| 4 → 5 | 126 kereste · 126 yontma taş · 94 tuğla | 1.3 sa | 8 dk |
| 5 → 6 | 161 kereste · 161 yontma taş · 121 tuğla | 1.7 sa | 10 dk |
| 6 → 7 | 206 kereste · 206 yontma taş · 155 tuğla | 2.2 sa | 13 dk |
| 7 → 8 | 264 kereste · 264 yontma taş · 198 tuğla | 2.8 sa | 17 dk |
| 8 → 9 | 338 kereste · 338 yontma taş · 253 tuğla | 3.6 sa | 22 dk |
| 9 → 10 | 432 kereste · 432 yontma taş · 324 tuğla | 4.6 sa | 28 dk |
| 10 → 11 | 553 kereste · 553 yontma taş · 415 tuğla | 5.9 sa | 35 dk |
| 11 → 12 | 708 kereste · 708 yontma taş · 531 tuğla | 7.6 sa | 45 dk |
| 12 → 13 | 907 kereste · 907 yontma taş · 680 tuğla | 9.7 sa | 58 dk |
| 13 → 14 | 1.161 kereste · 1.161 yontma taş · 870 tuğla | 12.4 sa | 1.2 sa |
| 14 → 15 | 1.486 kereste · 1.486 yontma taş · 1.114 tuğla | 15.8 sa | 1.6 sa |
| 15 → 16 | 1.901 kereste · 1.901 yontma taş · 1.426 tuğla | 20.3 sa | 2.0 sa |
| 16 → 17 | 2.434 kereste · 2.434 yontma taş · 1.825 tuğla | 1.1 gün | 2.6 sa |
| 17 → 18 | 3.115 kereste · 3.115 yontma taş · 2.337 tuğla | 1.4 gün | 3.3 sa |
| 18 → 19 | 3.988 kereste · 3.988 yontma taş · 2.991 tuğla | 1.8 gün | 4.3 sa |
| 19 → 20 | 5.104 kereste · 5.104 yontma taş · 3.828 tuğla | 2.3 gün | 5.4 sa |

**İşlenmiş Mal Deposu** — max Lvl 20 · ön koşul: Keresteci/Tuğlacı/Taşçı/Demirci/Değirmen/Fırın Lvl 2

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 50 kereste · 60 yontma taş · 60 tuğla | 30 dk | 3 dk |
| 1 → 2 | 50 kereste · 60 yontma taş · 60 tuğla | 38 dk | 4 dk |
| 2 → 3 | 64 kereste · 77 yontma taş · 77 tuğla | 49 dk | 5 dk |
| 3 → 4 | 82 kereste · 98 yontma taş · 98 tuğla | 1.0 sa | 6 dk |
| 4 → 5 | 105 kereste · 126 yontma taş · 126 tuğla | 1.3 sa | 8 dk |
| 5 → 6 | 134 kereste · 161 yontma taş · 161 tuğla | 1.7 sa | 10 dk |
| 6 → 7 | 172 kereste · 206 yontma taş · 206 tuğla | 2.2 sa | 13 dk |
| 7 → 8 | 220 kereste · 264 yontma taş · 264 tuğla | 2.8 sa | 17 dk |
| 8 → 9 | 281 kereste · 338 yontma taş · 338 tuğla | 3.6 sa | 22 dk |
| 9 → 10 | 360 kereste · 432 yontma taş · 432 tuğla | 4.6 sa | 28 dk |
| 10 → 11 | 461 kereste · 553 yontma taş · 553 tuğla | 5.9 sa | 35 dk |
| 11 → 12 | 590 kereste · 708 yontma taş · 708 tuğla | 7.6 sa | 45 dk |
| 12 → 13 | 756 kereste · 907 yontma taş · 907 tuğla | 9.7 sa | 58 dk |
| 13 → 14 | 967 kereste · 1.161 yontma taş · 1.161 tuğla | 12.4 sa | 1.2 sa |
| 14 → 15 | 1.238 kereste · 1.486 yontma taş · 1.486 tuğla | 15.8 sa | 1.6 sa |
| 15 → 16 | 1.585 kereste · 1.901 yontma taş · 1.901 tuğla | 20.3 sa | 2.0 sa |
| 16 → 17 | 2.028 kereste · 2.434 yontma taş · 2.434 tuğla | 1.1 gün | 2.6 sa |
| 17 → 18 | 2.596 kereste · 3.115 yontma taş · 3.115 tuğla | 1.4 gün | 3.3 sa |
| 18 → 19 | 3.323 kereste · 3.988 yontma taş · 3.988 tuğla | 1.8 gün | 4.3 sa |
| 19 → 20 | 4.254 kereste · 5.104 yontma taş · 5.104 tuğla | 2.3 gün | 5.4 sa |

**Tahıl Ambarı** — max Lvl 20 · ön koşul: Değirmen Lvl 1

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 50 kereste · 45 yontma taş | 25 dk | 3 dk |
| 1 → 2 | 50 kereste · 45 yontma taş | 32 dk | 3 dk |
| 2 → 3 | 64 kereste · 58 yontma taş | 41 dk | 4 dk |
| 3 → 4 | 82 kereste · 74 yontma taş | 52 dk | 5 dk |
| 4 → 5 | 105 kereste · 94 yontma taş | 1.1 sa | 7 dk |
| 5 → 6 | 134 kereste · 121 yontma taş | 1.4 sa | 9 dk |
| 6 → 7 | 172 kereste · 155 yontma taş | 1.8 sa | 11 dk |
| 7 → 8 | 220 kereste · 198 yontma taş | 2.3 sa | 14 dk |
| 8 → 9 | 281 kereste · 253 yontma taş | 3.0 sa | 18 dk |
| 9 → 10 | 360 kereste · 324 yontma taş | 3.8 sa | 23 dk |
| 10 → 11 | 461 kereste · 415 yontma taş | 4.9 sa | 30 dk |
| 11 → 12 | 590 kereste · 531 yontma taş | 6.3 sa | 38 dk |
| 12 → 13 | 756 kereste · 680 yontma taş | 8.1 sa | 48 dk |
| 13 → 14 | 967 kereste · 870 yontma taş | 10.3 sa | 1.0 sa |
| 14 → 15 | 1.238 kereste · 1.114 yontma taş | 13.2 sa | 1.3 sa |
| 15 → 16 | 1.585 kereste · 1.426 yontma taş | 16.9 sa | 1.7 sa |
| 16 → 17 | 2.028 kereste · 1.825 yontma taş | 21.6 sa | 2.2 sa |
| 17 → 18 | 2.596 kereste · 2.337 yontma taş | 1.2 gün | 2.8 sa |
| 18 → 19 | 3.323 kereste · 2.991 yontma taş | 1.5 gün | 3.5 sa |
| 19 → 20 | 4.254 kereste · 3.828 yontma taş | 1.9 gün | 4.5 sa |

**Erzak Ambarı** — max Lvl 20 · ön koşul: Değirmen Lvl 1

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 50 kereste · 75 tuğla | 25 dk | 3 dk |
| 1 → 2 | 50 kereste · 75 tuğla | 32 dk | 3 dk |
| 2 → 3 | 64 kereste · 96 tuğla | 41 dk | 4 dk |
| 3 → 4 | 82 kereste · 123 tuğla | 52 dk | 5 dk |
| 4 → 5 | 105 kereste · 157 tuğla | 1.1 sa | 7 dk |
| 5 → 6 | 134 kereste · 201 tuğla | 1.4 sa | 9 dk |
| 6 → 7 | 172 kereste · 258 tuğla | 1.8 sa | 11 dk |
| 7 → 8 | 220 kereste · 330 tuğla | 2.3 sa | 14 dk |
| 8 → 9 | 281 kereste · 422 tuğla | 3.0 sa | 18 dk |
| 9 → 10 | 360 kereste · 540 tuğla | 3.8 sa | 23 dk |
| 10 → 11 | 461 kereste · 692 tuğla | 4.9 sa | 30 dk |
| 11 → 12 | 590 kereste · 885 tuğla | 6.3 sa | 38 dk |
| 12 → 13 | 756 kereste · 1.133 tuğla | 8.1 sa | 48 dk |
| 13 → 14 | 967 kereste · 1.451 tuğla | 10.3 sa | 1.0 sa |
| 14 → 15 | 1.238 kereste · 1.857 tuğla | 13.2 sa | 1.3 sa |
| 15 → 16 | 1.585 kereste · 2.377 tuğla | 16.9 sa | 1.7 sa |
| 16 → 17 | 2.028 kereste · 3.042 tuğla | 21.6 sa | 2.2 sa |
| 17 → 18 | 2.596 kereste · 3.894 tuğla | 1.2 gün | 2.8 sa |
| 18 → 19 | 3.323 kereste · 4.985 tuğla | 1.5 gün | 3.5 sa |
| 19 → 20 | 4.254 kereste · 6.380 tuğla | 1.9 gün | 4.5 sa |

**Pazar** — max Lvl 20 · ön koşul: Ana Bina Lvl 3 + Hammadde Deposu Lvl 2

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 60 kereste · 95 yontma taş | 40 dk | 4 dk |
| 1 → 2 | 60 kereste · 95 yontma taş | 51 dk | 5 dk |
| 2 → 3 | 77 kereste · 122 yontma taş | 1.1 sa | 7 dk |
| 3 → 4 | 98 kereste · 156 yontma taş | 1.4 sa | 8 dk |
| 4 → 5 | 126 kereste · 199 yontma taş | 1.8 sa | 11 dk |
| 5 → 6 | 161 kereste · 255 yontma taş | 2.3 sa | 14 dk |
| 6 → 7 | 206 kereste · 326 yontma taş | 2.9 sa | 18 dk |
| 7 → 8 | 264 kereste · 418 yontma taş | 3.8 sa | 23 dk |
| 8 → 9 | 338 kereste · 535 yontma taş | 4.8 sa | 29 dk |
| 9 → 10 | 432 kereste · 685 yontma taş | 6.1 sa | 37 dk |
| 10 → 11 | 553 kereste · 876 yontma taş | 7.9 sa | 47 dk |
| 11 → 12 | 708 kereste · 1.122 yontma taş | 10.1 sa | 1.0 sa |
| 12 → 13 | 907 kereste · 1.436 yontma taş | 12.9 sa | 1.3 sa |
| 13 → 14 | 1.161 kereste · 1.838 yontma taş | 16.5 sa | 1.7 sa |
| 14 → 15 | 1.486 kereste · 2.352 yontma taş | 21.1 sa | 2.1 sa |
| 15 → 16 | 1.901 kereste · 3.011 yontma taş | 1.1 gün | 2.7 sa |
| 16 → 17 | 2.434 kereste · 3.854 yontma taş | 1.4 gün | 3.5 sa |
| 17 → 18 | 3.115 kereste · 4.933 yontma taş | 1.8 gün | 4.4 sa |
| 18 → 19 | 3.988 kereste · 6.314 yontma taş | 2.4 gün | 5.7 sa |
| 19 → 20 | 5.104 kereste · 8.082 yontma taş | 3.0 gün | 7.3 sa |

**Demirciler Loncası** — max Lvl 5 · ön koşul: Demirci Lvl 5

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 50 kereste · 90 külçe | 30 dk | 3 dk |
| 1 → 2 | 50 kereste · 90 külçe | 38 dk | 4 dk |
| 2 → 3 | 64 kereste · 115 külçe | 49 dk | 5 dk |
| 3 → 4 | 82 kereste · 147 külçe | 1.0 sa | 6 dk |
| 4 → 5 | 105 kereste · 189 külçe | 1.3 sa | 8 dk |

**Oduncular Loncası** — max Lvl 5 · ön koşul: Keresteci Lvl 5

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 60 kereste · 45 yontma taş | 30 dk | 3 dk |
| 1 → 2 | 60 kereste · 45 yontma taş | 38 dk | 4 dk |
| 2 → 3 | 77 kereste · 58 yontma taş | 49 dk | 5 dk |
| 3 → 4 | 98 kereste · 74 yontma taş | 1.0 sa | 6 dk |
| 4 → 5 | 126 kereste · 94 yontma taş | 1.3 sa | 8 dk |

**Taşçılar Loncası** — max Lvl 5 · ön koşul: Taşçı Lvl 5

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 50 kereste · 70 yontma taş | 30 dk | 3 dk |
| 1 → 2 | 50 kereste · 70 yontma taş | 38 dk | 4 dk |
| 2 → 3 | 64 kereste · 90 yontma taş | 49 dk | 5 dk |
| 3 → 4 | 82 kereste · 115 yontma taş | 1.0 sa | 6 dk |
| 4 → 5 | 105 kereste · 147 yontma taş | 1.3 sa | 8 dk |

**Kilciler Loncası** — max Lvl 5 · ön koşul: Tuğlacı Lvl 5

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 50 kereste · 90 tuğla | 30 dk | 3 dk |
| 1 → 2 | 50 kereste · 90 tuğla | 38 dk | 4 dk |
| 2 → 3 | 64 kereste · 115 tuğla | 49 dk | 5 dk |
| 3 → 4 | 82 kereste · 147 tuğla | 1.0 sa | 6 dk |
| 4 → 5 | 105 kereste · 189 tuğla | 1.3 sa | 8 dk |

**Tahılcılar Loncası** — max Lvl 5 · ön koşul: Değirmen Lvl 5

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 50 kereste · 60 tahıl | 30 dk | 3 dk |
| 1 → 2 | 50 kereste · 60 tahıl | 38 dk | 4 dk |
| 2 → 3 | 64 kereste · 77 tahıl | 49 dk | 5 dk |
| 3 → 4 | 82 kereste · 98 tahıl | 1.0 sa | 6 dk |
| 4 → 5 | 105 kereste · 126 tahıl | 1.3 sa | 8 dk |

**Köşk** — max Lvl 20 · ön koşul: Ana Bina Lvl 5 + Taverna Lvl 1

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 75 kereste · 150 tuğla · 95 yontma taş · 75 külçe | 40 dk | 4 dk |
| 1 → 2 | 75 kereste · 150 tuğla · 95 yontma taş · 75 külçe | 51 dk | 5 dk |
| 2 → 3 | 96 kereste · 192 tuğla · 122 yontma taş · 96 külçe | 1.1 sa | 7 dk |
| 3 → 4 | 123 kereste · 246 tuğla · 156 yontma taş · 123 külçe | 1.4 sa | 8 dk |
| 4 → 5 | 157 kereste · 315 tuğla · 199 yontma taş · 157 külçe | 1.8 sa | 11 dk |
| 5 → 6 | 201 kereste · 403 tuğla · 255 yontma taş · 201 külçe | 2.3 sa | 14 dk |
| 6 → 7 | 258 kereste · 515 tuğla · 326 yontma taş · 258 külçe | 2.9 sa | 18 dk |
| 7 → 8 | 330 kereste · 660 tuğla · 418 yontma taş · 330 külçe | 3.8 sa | 23 dk |
| 8 → 9 | 422 kereste · 844 tuğla · 535 yontma taş · 422 külçe | 4.8 sa | 29 dk |
| 9 → 10 | 540 kereste · 1.081 tuğla · 685 yontma taş · 540 külçe | 6.1 sa | 37 dk |
| 10 → 11 | 692 kereste · 1.384 tuğla · 876 yontma taş · 692 külçe | 7.9 sa | 47 dk |
| 11 → 12 | 885 kereste · 1.771 tuğla · 1.122 yontma taş · 885 külçe | 10.1 sa | 1.0 sa |
| 12 → 13 | 1.133 kereste · 2.267 tuğla · 1.436 yontma taş · 1.133 külçe | 12.9 sa | 1.3 sa |
| 13 → 14 | 1.451 kereste · 2.901 tuğla · 1.838 yontma taş · 1.451 külçe | 16.5 sa | 1.7 sa |
| 14 → 15 | 1.857 kereste · 3.714 tuğla · 2.352 yontma taş · 1.857 külçe | 21.1 sa | 2.1 sa |
| 15 → 16 | 2.377 kereste · 4.754 tuğla · 3.011 yontma taş · 2.377 külçe | 1.1 gün | 2.7 sa |
| 16 → 17 | 3.042 kereste · 6.085 tuğla · 3.854 yontma taş · 3.042 külçe | 1.4 gün | 3.5 sa |
| 17 → 18 | 3.894 kereste · 7.788 tuğla · 4.933 yontma taş · 3.894 külçe | 1.8 gün | 4.4 sa |
| 18 → 19 | 4.985 kereste · 9.969 tuğla · 6.314 yontma taş · 4.985 külçe | 2.4 gün | 5.7 sa |
| 19 → 20 | 6.380 kereste · 12.761 tuğla · 8.082 yontma taş · 6.380 külçe | 3.0 gün | 7.3 sa |

**Saray** — max Lvl 20 · ön koşul: Ana Bina Lvl 8 + Taverna Lvl 3

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 120 kereste · 270 tuğla · 180 yontma taş · 180 külçe | 1.0 sa | 6 dk |
| 1 → 2 | 120 kereste · 270 tuğla · 180 yontma taş · 180 külçe | 1.3 sa | 8 dk |
| 2 → 3 | 154 kereste · 346 tuğla · 230 yontma taş · 230 külçe | 1.6 sa | 10 dk |
| 3 → 4 | 197 kereste · 442 tuğla · 295 yontma taş · 295 külçe | 2.1 sa | 13 dk |
| 4 → 5 | 252 kereste · 566 tuğla · 377 yontma taş · 377 külçe | 2.7 sa | 16 dk |
| 5 → 6 | 322 kereste · 725 tuğla · 483 yontma taş · 483 külçe | 3.4 sa | 21 dk |
| 6 → 7 | 412 kereste · 928 tuğla · 618 yontma taş · 618 külçe | 4.4 sa | 26 dk |
| 7 → 8 | 528 kereste · 1.187 tuğla · 792 yontma taş · 792 külçe | 5.6 sa | 34 dk |
| 8 → 9 | 676 kereste · 1.520 tuğla · 1.013 yontma taş · 1.013 külçe | 7.2 sa | 43 dk |
| 9 → 10 | 865 kereste · 1.946 tuğla · 1.297 yontma taş · 1.297 külçe | 9.2 sa | 55 dk |
| 10 → 11 | 1.107 kereste · 2.490 tuğla · 1.660 yontma taş · 1.660 külçe | 11.8 sa | 1.2 sa |
| 11 → 12 | 1.417 kereste · 3.188 tuğla · 2.125 yontma taş · 2.125 külçe | 15.1 sa | 1.5 sa |
| 12 → 13 | 1.813 kereste · 4.080 tuğla · 2.720 yontma taş · 2.720 külçe | 19.3 sa | 1.9 sa |
| 13 → 14 | 2.321 kereste · 5.223 tuğla · 3.482 yontma taş · 3.482 külçe | 1.0 gün | 2.5 sa |
| 14 → 15 | 2.971 kereste · 6.685 tuğla · 4.457 yontma taş · 4.457 külçe | 1.3 gün | 3.2 sa |
| 15 → 16 | 3.803 kereste · 8.557 tuğla · 5.704 yontma taş · 5.704 külçe | 1.7 gün | 4.1 sa |
| 16 → 17 | 4.868 kereste · 10.953 tuğla · 7.302 yontma taş · 7.302 külçe | 2.2 gün | 5.2 sa |
| 17 → 18 | 6.231 kereste · 14.019 tuğla · 9.346 yontma taş · 9.346 külçe | 2.8 gün | 6.6 sa |
| 18 → 19 | 7.975 kereste · 17.945 tuğla · 11.963 yontma taş · 11.963 külçe | 3.5 gün | 8.5 sa |
| 19 → 20 | 10.208 kereste · 22.969 tuğla · 15.313 yontma taş · 15.313 külçe | 4.5 gün | 10.9 sa |

**Taverna** — max Lvl 20 · ön koşul: Ana Bina Lvl 5 + Fırın Lvl 3

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 95 kereste · 180 tuğla · 100 tahıl | 35 dk | 4 dk |
| 1 → 2 | 95 kereste · 180 tuğla · 100 tahıl | 45 dk | 4 dk |
| 2 → 3 | 122 kereste · 230 tuğla · 128 tahıl | 57 dk | 6 dk |
| 3 → 4 | 156 kereste · 295 tuğla · 164 tahıl | 1.2 sa | 7 dk |
| 4 → 5 | 199 kereste · 377 tuğla · 210 tahıl | 1.6 sa | 9 dk |
| 5 → 6 | 255 kereste · 483 tuğla · 268 tahıl | 2.0 sa | 12 dk |
| 6 → 7 | 326 kereste · 618 tuğla · 344 tahıl | 2.6 sa | 15 dk |
| 7 → 8 | 418 kereste · 792 tuğla · 440 tahıl | 3.3 sa | 20 dk |
| 8 → 9 | 535 kereste · 1.013 tuğla · 563 tahıl | 4.2 sa | 25 dk |
| 9 → 10 | 685 kereste · 1.297 tuğla · 721 tahıl | 5.4 sa | 32 dk |
| 10 → 11 | 876 kereste · 1.660 tuğla · 922 tahıl | 6.9 sa | 41 dk |
| 11 → 12 | 1.122 kereste · 2.125 tuğla · 1.181 tahıl | 8.8 sa | 53 dk |
| 12 → 13 | 1.436 kereste · 2.720 tuğla · 1.511 tahıl | 11.3 sa | 1.1 sa |
| 13 → 14 | 1.838 kereste · 3.482 tuğla · 1.934 tahıl | 14.4 sa | 1.4 sa |
| 14 → 15 | 2.352 kereste · 4.457 tuğla · 2.476 tahıl | 18.5 sa | 1.8 sa |
| 15 → 16 | 3.011 kereste · 5.704 tuğla · 3.169 tahıl | 23.7 sa | 2.4 sa |
| 16 → 17 | 3.854 kereste · 7.302 tuğla · 4.056 tahıl | 1.3 gün | 3.0 sa |
| 17 → 18 | 4.933 kereste · 9.346 tuğla · 5.192 tahıl | 1.6 gün | 3.9 sa |
| 18 → 19 | 6.314 kereste · 11.963 tuğla · 6.646 tahıl | 2.1 gün | 5.0 sa |
| 19 → 20 | 8.082 kereste · 15.313 tuğla · 8.507 tahıl | 2.6 gün | 6.4 sa |

**Ev** — max Lvl 5 · ön koşul: Ana Bina Lvl 2

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 50 kereste · 75 tuğla | 15 dk | 2 dk |
| 1 → 2 | 50 kereste · 75 tuğla | 19 dk | 2 dk |
| 2 → 3 | 64 kereste · 96 tuğla | 25 dk | 2 dk |
| 3 → 4 | 82 kereste · 123 tuğla | 31 dk | 3 dk |
| 4 → 5 | 105 kereste · 157 tuğla | 40 dk | 4 dk |

**Sur** — max Lvl 20 · ön koşul: Ana Bina Lvl 1

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 190 yontma taş · 25 kereste | 50 dk | 5 dk |
| 1 → 2 | 190 yontma taş · 25 kereste | 1.1 sa | 6 dk |
| 2 → 3 | 243 yontma taş · 32 kereste | 1.4 sa | 8 dk |
| 3 → 4 | 311 yontma taş · 41 kereste | 1.7 sa | 10 dk |
| 4 → 5 | 398 yontma taş · 52 kereste | 2.2 sa | 13 dk |
| 5 → 6 | 510 yontma taş · 67 kereste | 2.9 sa | 17 dk |
| 6 → 7 | 653 yontma taş · 86 kereste | 3.7 sa | 22 dk |
| 7 → 8 | 836 yontma taş · 110 kereste | 4.7 sa | 28 dk |
| 8 → 9 | 1.070 yontma taş · 141 kereste | 6.0 sa | 36 dk |
| 9 → 10 | 1.369 yontma taş · 180 kereste | 7.7 sa | 46 dk |
| 10 → 11 | 1.752 yontma taş · 231 kereste | 9.8 sa | 59 dk |
| 11 → 12 | 2.243 yontma taş · 295 kereste | 12.6 sa | 1.3 sa |
| 12 → 13 | 2.871 yontma taş · 378 kereste | 16.1 sa | 1.6 sa |
| 13 → 14 | 3.675 yontma taş · 484 kereste | 20.6 sa | 2.1 sa |
| 14 → 15 | 4.704 yontma taş · 619 kereste | 1.1 gün | 2.6 sa |
| 15 → 16 | 6.021 yontma taş · 792 kereste | 1.4 gün | 3.4 sa |
| 16 → 17 | 7.707 yontma taş · 1.014 kereste | 1.8 gün | 4.3 sa |
| 17 → 18 | 9.865 yontma taş · 1.298 kereste | 2.3 gün | 5.5 sa |
| 18 → 19 | 12.628 yontma taş · 1.662 kereste | 3.0 gün | 7.1 sa |
| 19 → 20 | 16.163 yontma taş · 2.127 kereste | 3.8 gün | 9.1 sa |

**Hendek** — max Lvl 20 · ön koşul: Sur Lvl 5

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 25 kereste · 95 yontma taş | 40 dk | 4 dk |
| 1 → 2 | 25 kereste · 95 yontma taş | 51 dk | 5 dk |
| 2 → 3 | 32 kereste · 122 yontma taş | 1.1 sa | 7 dk |
| 3 → 4 | 41 kereste · 156 yontma taş | 1.4 sa | 8 dk |
| 4 → 5 | 52 kereste · 199 yontma taş | 1.8 sa | 11 dk |
| 5 → 6 | 67 kereste · 255 yontma taş | 2.3 sa | 14 dk |
| 6 → 7 | 86 kereste · 326 yontma taş | 2.9 sa | 18 dk |
| 7 → 8 | 110 kereste · 418 yontma taş | 3.8 sa | 23 dk |
| 8 → 9 | 141 kereste · 535 yontma taş | 4.8 sa | 29 dk |
| 9 → 10 | 180 kereste · 685 yontma taş | 6.1 sa | 37 dk |
| 10 → 11 | 231 kereste · 876 yontma taş | 7.9 sa | 47 dk |
| 11 → 12 | 295 kereste · 1.122 yontma taş | 10.1 sa | 1.0 sa |
| 12 → 13 | 378 kereste · 1.436 yontma taş | 12.9 sa | 1.3 sa |
| 13 → 14 | 484 kereste · 1.838 yontma taş | 16.5 sa | 1.7 sa |
| 14 → 15 | 619 kereste · 2.352 yontma taş | 21.1 sa | 2.1 sa |
| 15 → 16 | 792 kereste · 3.011 yontma taş | 1.1 gün | 2.7 sa |
| 16 → 17 | 1.014 kereste · 3.854 yontma taş | 1.4 gün | 3.5 sa |
| 17 → 18 | 1.298 kereste · 4.933 yontma taş | 1.8 gün | 4.4 sa |
| 18 → 19 | 1.662 kereste · 6.314 yontma taş | 2.4 gün | 5.7 sa |
| 19 → 20 | 2.127 kereste · 8.082 yontma taş | 3.0 gün | 7.3 sa |

**Savunma Kulesi** — max Lvl 20 · ön koşul: Sur Lvl 3 + Rún Salonu Lvl 2 · 2 işçi/seviye

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa 0→1 | 50 kereste · 95 yontma taş · 75 külçe | 45 dk | 5 dk |
| 1 → 2 | 50 kereste · 95 yontma taş · 75 külçe | 58 dk | 6 dk |
| 2 → 3 | 64 kereste · 122 yontma taş · 96 külçe | 1.2 sa | 7 dk |
| 3 → 4 | 82 kereste · 156 yontma taş · 123 külçe | 1.6 sa | 9 dk |
| 4 → 5 | 105 kereste · 199 yontma taş · 157 külçe | 2.0 sa | 12 dk |
| 5 → 6 | 134 kereste · 255 yontma taş · 201 külçe | 2.6 sa | 15 dk |
| 6 → 7 | 172 kereste · 326 yontma taş · 258 külçe | 3.3 sa | 20 dk |
| 7 → 8 | 220 kereste · 418 yontma taş · 330 külçe | 4.2 sa | 25 dk |
| 8 → 9 | 281 kereste · 535 yontma taş · 422 külçe | 5.4 sa | 32 dk |
| 9 → 10 | 360 kereste · 685 yontma taş · 540 külçe | 6.9 sa | 42 dk |
| 10 → 11 | 461 kereste · 876 yontma taş · 692 külçe | 8.9 sa | 53 dk |
| 11 → 12 | 590 kereste · 1.122 yontma taş · 885 külçe | 11.3 sa | 1.1 sa |
| 12 → 13 | 756 kereste · 1.436 yontma taş · 1.133 külçe | 14.5 sa | 1.5 sa |
| 13 → 14 | 967 kereste · 1.838 yontma taş · 1.451 külçe | 18.6 sa | 1.9 sa |
| 14 → 15 | 1.238 kereste · 2.352 yontma taş · 1.857 külçe | 23.8 sa | 2.4 sa |
| 15 → 16 | 1.585 kereste · 3.011 yontma taş · 2.377 külçe | 1.3 gün | 3.0 sa |
| 16 → 17 | 2.028 kereste · 3.854 yontma taş · 3.042 külçe | 1.6 gün | 3.9 sa |
| 17 → 18 | 2.596 kereste · 4.933 yontma taş · 3.894 külçe | 2.1 gün | 5.0 sa |
| 18 → 19 | 3.323 kereste · 6.314 yontma taş · 4.985 külçe | 2.7 gün | 6.4 sa |
| 19 → 20 | 4.254 kereste · 8.082 yontma taş · 6.380 külçe | 3.4 gün | 8.2 sa |

## D. ÜRETİM ALANLARI (tarlalar)

Tarlalar köyün DIŞINDA, dünya haritasında. Ana Bina seviyesi kaç tarla
açılabileceğini belirler: `min(25, 5 + anaBinaSeviyesi)`. Tarla tavanı
normal köyde Lvl 10, MERKEZ köyde Lvl 20.

| Tarla | Ürün | İşçi başına/saat | Slot | Lvl 1 işçi | Lvl 10 işçi | Lvl 20 işçi | Lvl 20 üretim/saat |
|---|---|---|---|---|---|---|---|
| **Orman** | odun | 22 | 3 | 3 | 21 | 42 | 924 |
| **Demir Madeni** | demir | 14 | 3 | 3 | 21 | 42 | 588 |
| **Kil Ocağı** | kil | 22 | 3 | 3 | 21 | 42 | 924 |
| **Taş Ocağı** | taş | 22 | 3 | 3 | 21 | 42 | 924 |
| **Tarla** | tahıl | 16 | 6 | 3 | 21 | 42 | 672 |

> Arazi çarpanı: her hex'in kendi bereketi var (haritada `1.60×` gibi
> görünür), bu tablo çarpansız taban üretimi gösteriyor.

**Orman**

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) | Max işçi | Üretim/saat |
|---|---|---|---|---|---|
| 0 → 1 | 12 kereste · 30 tuğla · 18 yontma taş · 15 külçe | 5 dk | 1 dk | 3 | 66 |
| 1 → 2 | 15 kereste · 38 tuğla · 23 yontma taş · 19 külçe | 6 dk | 1 dk | 5 | 110 |
| 2 → 3 | 20 kereste · 49 tuğla · 29 yontma taş · 25 külçe | 8 dk | 1 dk | 7 | 154 |
| 3 → 4 | 25 kereste · 63 tuğla · 38 yontma taş · 31 külçe | 10 dk | 1 dk | 9 | 198 |
| 4 → 5 | 32 kereste · 81 tuğla · 48 yontma taş · 40 külçe | 13 dk | 1 dk | 11 | 242 |
| 5 → 6 | 41 kereste · 103 tuğla · 62 yontma taş · 52 külçe | 17 dk | 2 dk | 13 | 286 |
| 6 → 7 | 53 kereste · 132 tuğla · 79 yontma taş · 66 külçe | 22 dk | 2 dk | 15 | 330 |
| 7 → 8 | 68 kereste · 169 tuğla · 101 yontma taş · 84 külçe | 28 dk | 3 dk | 17 | 374 |
| 8 → 9 | 86 kereste · 216 tuğla · 130 yontma taş · 108 külçe | 36 dk | 4 dk | 19 | 418 |
| 9 → 10 | 111 kereste · 277 tuğla · 166 yontma taş · 138 külçe | 46 dk | 5 dk | 21 | 462 |
| 10 → 11 | 142 kereste · 354 tuğla · 213 yontma taş · 177 külçe | 59 dk | 6 dk | 23 | 506 |
| 11 → 12 | 181 kereste · 453 tuğla · 272 yontma taş · 227 külçe | 1.3 sa | 8 dk | 25 | 550 |
| 12 → 13 | 232 kereste · 580 tuğla · 348 yontma taş · 290 külçe | 1.6 sa | 10 dk | 27 | 594 |
| 13 → 14 | 297 kereste · 743 tuğla · 446 yontma taş · 371 külçe | 2.1 sa | 12 dk | 29 | 638 |
| 14 → 15 | 380 kereste · 951 tuğla · 570 yontma taş · 475 külçe | 2.6 sa | 16 dk | 31 | 682 |
| 15 → 16 | 487 kereste · 1.217 tuğla · 730 yontma taş · 608 külçe | 3.4 sa | 20 dk | 33 | 726 |
| 16 → 17 | 623 kereste · 1.558 tuğla · 935 yontma taş · 779 külçe | 4.3 sa | 26 dk | 35 | 770 |
| 17 → 18 | 798 kereste · 1.994 tuğla · 1.196 yontma taş · 997 külçe | 5.5 sa | 33 dk | 37 | 814 |
| 18 → 19 | 1.021 kereste · 2.552 tuğla · 1.531 yontma taş · 1.276 külçe | 7.1 sa | 43 dk | 39 | 858 |
| 19 → 20 | 1.307 kereste · 3.267 tuğla · 1.960 yontma taş · 1.633 külçe | 9.1 sa | 54 dk | 42 | 924 |

**Demir Madeni**

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) | Max işçi | Üretim/saat |
|---|---|---|---|---|---|
| 0 → 1 | 14 kereste · 24 tuğla · 27 yontma taş · 9 külçe | 6 dk | 1 dk | 3 | 42 |
| 1 → 2 | 18 kereste · 31 tuğla · 35 yontma taş · 12 külçe | 7 dk | 1 dk | 5 | 70 |
| 2 → 3 | 23 kereste · 39 tuğla · 44 yontma taş · 15 külçe | 9 dk | 1 dk | 7 | 98 |
| 3 → 4 | 29 kereste · 50 tuğla · 57 yontma taş · 19 külçe | 12 dk | 1 dk | 9 | 126 |
| 4 → 5 | 38 kereste · 64 tuğla · 72 yontma taş · 24 külçe | 15 dk | 1 dk | 11 | 154 |
| 5 → 6 | 48 kereste · 82 tuğla · 93 yontma taş · 31 külçe | 19 dk | 2 dk | 13 | 182 |
| 6 → 7 | 62 kereste · 106 tuğla · 119 yontma taş · 40 külçe | 24 dk | 2 dk | 15 | 210 |
| 7 → 8 | 79 kereste · 135 tuğla · 152 yontma taş · 51 külçe | 31 dk | 3 dk | 17 | 238 |
| 8 → 9 | 101 kereste · 173 tuğla · 195 yontma taş · 65 külçe | 40 dk | 4 dk | 19 | 266 |
| 9 → 10 | 129 kereste · 221 tuğla · 249 yontma taş · 83 külçe | 51 dk | 5 dk | 21 | 294 |
| 10 → 11 | 165 kereste · 283 tuğla · 319 yontma taş · 106 külçe | 1.1 sa | 6 dk | 23 | 322 |
| 11 → 12 | 212 kereste · 363 tuğla · 408 yontma taş · 136 külçe | 1.4 sa | 8 dk | 25 | 350 |
| 12 → 13 | 271 kereste · 464 tuğla · 522 yontma taş · 174 külçe | 1.8 sa | 11 dk | 27 | 378 |
| 13 → 14 | 347 kereste · 594 tuğla · 668 yontma taş · 223 külçe | 2.3 sa | 14 dk | 29 | 406 |
| 14 → 15 | 444 kereste · 761 tuğla · 856 yontma taş · 285 külçe | 2.9 sa | 17 dk | 31 | 434 |
| 15 → 16 | 568 kereste · 974 tuğla · 1.095 yontma taş · 365 külçe | 3.7 sa | 22 dk | 33 | 462 |
| 16 → 17 | 727 kereste · 1.246 tuğla · 1.402 yontma taş · 467 külçe | 4.8 sa | 29 dk | 35 | 490 |
| 17 → 18 | 930 kereste · 1.595 tuğla · 1.794 yontma taş · 598 külçe | 6.1 sa | 37 dk | 37 | 518 |
| 18 → 19 | 1.191 kereste · 2.042 tuğla · 2.297 yontma taş · 766 külçe | 7.8 sa | 47 dk | 39 | 546 |
| 19 → 20 | 1.524 kereste · 2.613 tuğla · 2.940 yontma taş · 980 külçe | 10.0 sa | 60 dk | 42 | 588 |

**Kil Ocağı**

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) | Max işçi | Üretim/saat |
|---|---|---|---|---|---|
| 0 → 1 | 7 kereste · 45 tuğla · 14 yontma taş · 18 külçe | 5 dk | 0 dk | 3 | 66 |
| 1 → 2 | 9 kereste · 58 tuğla · 18 yontma taş · 23 külçe | 6 dk | 1 dk | 5 | 110 |
| 2 → 3 | 11 kereste · 74 tuğla · 23 yontma taş · 29 külçe | 8 dk | 1 dk | 7 | 154 |
| 3 → 4 | 15 kereste · 94 tuğla · 29 yontma taş · 38 külçe | 10 dk | 1 dk | 9 | 198 |
| 4 → 5 | 19 kereste · 121 tuğla · 38 yontma taş · 48 külçe | 13 dk | 1 dk | 11 | 242 |
| 5 → 6 | 24 kereste · 155 tuğla · 48 yontma taş · 62 külçe | 16 dk | 2 dk | 13 | 286 |
| 6 → 7 | 31 kereste · 198 tuğla · 62 yontma taş · 79 külçe | 21 dk | 2 dk | 15 | 330 |
| 7 → 8 | 39 kereste · 253 tuğla · 79 yontma taş · 101 külçe | 27 dk | 3 dk | 17 | 374 |
| 8 → 9 | 50 kereste · 324 tuğla · 101 yontma taş · 130 külçe | 34 dk | 3 dk | 19 | 418 |
| 9 → 10 | 65 kereste · 415 tuğla · 129 yontma taş · 166 külçe | 44 dk | 4 dk | 21 | 462 |
| 10 → 11 | 83 kereste · 531 tuğla · 165 yontma taş · 213 külçe | 56 dk | 6 dk | 23 | 506 |
| 11 → 12 | 106 kereste · 680 tuğla · 212 yontma taş · 272 külçe | 1.2 sa | 7 dk | 25 | 550 |
| 12 → 13 | 135 kereste · 870 tuğla · 271 yontma taş · 348 külçe | 1.5 sa | 9 dk | 27 | 594 |
| 13 → 14 | 173 kereste · 1.114 tuğla · 347 yontma taş · 446 külçe | 2.0 sa | 12 dk | 29 | 638 |
| 14 → 15 | 222 kereste · 1.426 tuğla · 444 yontma taş · 570 külçe | 2.5 sa | 15 dk | 31 | 682 |
| 15 → 16 | 284 kereste · 1.825 tuğla · 568 yontma taş · 730 külçe | 3.2 sa | 19 dk | 33 | 726 |
| 16 → 17 | 363 kereste · 2.337 tuğla · 727 yontma taş · 935 külçe | 4.1 sa | 25 dk | 35 | 770 |
| 17 → 18 | 465 kereste · 2.991 tuğla · 930 yontma taş · 1.196 külçe | 5.3 sa | 32 dk | 37 | 814 |
| 18 → 19 | 595 kereste · 3.828 tuğla · 1.191 yontma taş · 1.531 külçe | 6.7 sa | 40 dk | 39 | 858 |
| 19 → 20 | 762 kereste · 4.900 tuğla · 1.524 yontma taş · 1.960 külçe | 8.6 sa | 52 dk | 42 | 924 |

**Taş Ocağı**

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) | Max işçi | Üretim/saat |
|---|---|---|---|---|---|
| 0 → 1 | 10 kereste · 27 tuğla · 29 yontma taş · 10 külçe | 5 dk | 1 dk | 3 | 66 |
| 1 → 2 | 13 kereste · 35 tuğla · 37 yontma taş · 13 külçe | 7 dk | 1 dk | 5 | 110 |
| 2 → 3 | 16 kereste · 44 tuğla · 48 yontma taş · 16 külçe | 9 dk | 1 dk | 7 | 154 |
| 3 → 4 | 21 kereste · 57 tuğla · 61 yontma taş · 21 külçe | 11 dk | 1 dk | 9 | 198 |
| 4 → 5 | 27 kereste · 72 tuğla · 78 yontma taş · 27 külçe | 14 dk | 1 dk | 11 | 242 |
| 5 → 6 | 34 kereste · 93 tuğla · 100 yontma taş · 34 külçe | 18 dk | 2 dk | 13 | 286 |
| 6 → 7 | 44 kereste · 119 tuğla · 128 yontma taş · 44 külçe | 23 dk | 2 dk | 15 | 330 |
| 7 → 8 | 56 kereste · 152 tuğla · 163 yontma taş · 56 külçe | 30 dk | 3 dk | 17 | 374 |
| 8 → 9 | 72 kereste · 195 tuğla · 209 yontma taş · 72 külçe | 38 dk | 4 dk | 19 | 418 |
| 9 → 10 | 92 kereste · 249 tuğla · 267 yontma taş · 92 külçe | 48 dk | 5 dk | 21 | 462 |
| 10 → 11 | 118 kereste · 319 tuğla · 342 yontma taş · 118 külçe | 1.0 sa | 6 dk | 23 | 506 |
| 11 → 12 | 151 kereste · 408 tuğla · 438 yontma taş · 151 külçe | 1.3 sa | 8 dk | 25 | 550 |
| 12 → 13 | 193 kereste · 522 tuğla · 561 yontma taş · 193 külçe | 1.7 sa | 10 dk | 27 | 594 |
| 13 → 14 | 248 kereste · 668 tuğla · 718 yontma taş · 248 külçe | 2.2 sa | 13 dk | 29 | 638 |
| 14 → 15 | 317 kereste · 856 tuğla · 919 yontma taş · 317 külçe | 2.8 sa | 17 dk | 31 | 682 |
| 15 → 16 | 406 kereste · 1.095 tuğla · 1.176 yontma taş · 406 külçe | 3.5 sa | 21 dk | 33 | 726 |
| 16 → 17 | 519 kereste · 1.402 tuğla · 1.506 yontma taş · 519 külçe | 4.5 sa | 27 dk | 35 | 770 |
| 17 → 18 | 665 kereste · 1.794 tuğla · 1.927 yontma taş · 665 külçe | 5.8 sa | 35 dk | 37 | 814 |
| 18 → 19 | 851 kereste · 2.297 tuğla · 2.467 yontma taş · 851 külçe | 7.4 sa | 45 dk | 39 | 858 |
| 19 → 20 | 1.089 kereste · 2.940 tuğla · 3.158 yontma taş · 1.089 külçe | 9.5 sa | 57 dk | 42 | 924 |

**Tarla**

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) | Max işçi | Üretim/saat |
|---|---|---|---|---|---|
| 0 → 1 | 6 kereste · 21 tuğla · 11 yontma taş · 6 külçe | 4 dk | 0 dk | 3 | 48 |
| 1 → 2 | 8 kereste · 27 tuğla · 14 yontma taş · 8 külçe | 5 dk | 1 dk | 5 | 80 |
| 2 → 3 | 10 kereste · 34 tuğla · 18 yontma taş · 10 külçe | 7 dk | 1 dk | 7 | 112 |
| 3 → 4 | 13 kereste · 44 tuğla · 23 yontma taş · 13 külçe | 9 dk | 1 dk | 9 | 144 |
| 4 → 5 | 16 kereste · 56 tuğla · 30 yontma taş · 16 külçe | 11 dk | 1 dk | 11 | 176 |
| 5 → 6 | 21 kereste · 72 tuğla · 38 yontma taş · 21 külçe | 15 dk | 1 dk | 13 | 208 |
| 6 → 7 | 26 kereste · 92 tuğla · 48 yontma taş · 26 külçe | 19 dk | 2 dk | 15 | 240 |
| 7 → 8 | 34 kereste · 118 tuğla · 62 yontma taş · 34 külçe | 24 dk | 2 dk | 17 | 272 |
| 8 → 9 | 43 kereste · 151 tuğla · 79 yontma taş · 43 külçe | 31 dk | 3 dk | 19 | 304 |
| 9 → 10 | 55 kereste · 194 tuğla · 101 yontma taş · 55 külçe | 39 dk | 4 dk | 21 | 336 |
| 10 → 11 | 71 kereste · 248 tuğla · 130 yontma taş · 71 külçe | 50 dk | 5 dk | 23 | 368 |
| 11 → 12 | 91 kereste · 317 tuğla · 166 yontma taş · 91 külçe | 1.1 sa | 6 dk | 25 | 400 |
| 12 → 13 | 116 kereste · 406 tuğla · 213 yontma taş · 116 külçe | 1.4 sa | 8 dk | 27 | 432 |
| 13 → 14 | 149 kereste · 520 tuğla · 272 yontma taş · 149 külçe | 1.8 sa | 11 dk | 29 | 464 |
| 14 → 15 | 190 kereste · 666 tuğla · 349 yontma taş · 190 külçe | 2.2 sa | 13 dk | 31 | 496 |
| 15 → 16 | 243 kereste · 852 tuğla · 446 yontma taş · 243 külçe | 2.9 sa | 17 dk | 33 | 528 |
| 16 → 17 | 312 kereste · 1.090 tuğla · 571 yontma taş · 312 külçe | 3.7 sa | 22 dk | 35 | 560 |
| 17 → 18 | 399 kereste · 1.396 tuğla · 731 yontma taş · 399 külçe | 4.7 sa | 28 dk | 37 | 592 |
| 18 → 19 | 510 kereste · 1.786 tuğla · 936 yontma taş · 510 külçe | 6.0 sa | 36 dk | 39 | 624 |
| 19 → 20 | 653 kereste · 2.287 tuğla · 1.198 yontma taş · 653 külçe | 7.7 sa | 46 dk | 42 | 672 |

## E. İŞLEME ZİNCİRLERİ

Ham madde tek başına işe yaramıyor: her bina bir hammaddeyi işlenmiş
mala çeviriyor ve arada **kayıp** var. Oranlar işçi BAŞINA saatlik.

| Bina | Girdi | Çıktı | Girdi/saat/işçi | Çıktı/saat/işçi | Kayıp | Lvl 20 kadro | Lvl 20 kapasite |
|---|---|---|---|---|---|---|---|
| **Keresteci** | odun | kereste | 72 | 54 | %25 | 100 | 7.200 odun/sa |
| **Tuğlacı** | kil | tuğla | 72 | 54 | %25 | 100 | 7.200 kil/sa |
| **Taşçı** | taş | yontma taş | 72 | 54 | %25 | 100 | 7.200 taş/sa |
| **Demirci** | demir | külçe | 50 | 40 | %20 | 100 | 5.000 demir/sa |
| **Değirmen** | tahıl | un | 120 | 96 | %20 | 100 | 12.000 tahıl/sa |
| **Fırın** | un | ekmek | 96 | 72 | %25 | 100 | 9.600 un/sa |

**Tarla → işleme işçi oranı** (Lvl 20 tarla, tek tarla başına):

| Zincir | Tarla işçisi | Gereken işleme işçisi | Oran |
|---|---|---|---|
| Orman → Keresteci | 42 | 12.8 | **0.31** |
| Kil Ocağı → Tuğlacı | 42 | 12.8 | **0.31** |
| Taş Ocağı → Taşçı | 42 | 12.8 | **0.31** |
| Demir Madeni → Demirci | 42 | 11.8 | **0.28** |
| Tarla → Değirmen | 42 | 5.6 | **0.13** |

## F. DEPOLAMA TAVANLARI

Deposuz taban: ham 1.000 · işlenmiş 800 · tahıl 1.000 · erzak 600.
Depo binası bunun ÜSTÜNE ekliyor.

| Depo | Neyi tutar | Lvl 1 | Lvl 20 | TEK depoyla toplam tavan |
|---|---|---|---|---|
| **Hammadde Deposu** | odun, kil, taş, demir | 3.000 | 31.500 | **32.500** |
| **İşlenmiş Mal Deposu** | kereste, tuğla, yontma taş, külçe | 2.400 | 25.200 | **26.000** |
| **Tahıl Ambarı** | tahıl | 12.000 | 126.000 | **127.000** |
| **Erzak Ambarı** | un, ekmek | 2.500 | 26.250 | **26.850** |

> Depolar tavana ulaşınca bir tane daha kurulabiliyor. Ama hiçbir
> yükseltme TEK deponun üstüne çıkmıyor — ikinci depo konfor, zorunluluk değil.

## G. SAVUNMA YAPILARI

Sur + hendek + kule toplamı **%150** ile sınırlı.
Kule bonusu okçu DOLULUĞUYLA ölçekli: boş kule hiçbir şey vermiyor.
Altı kule slotu var, kule başına seviye × 2 okçu yeri.

| Seviye | Sur | Hendek | Kule (tek, tam dolu) | Altı kule toplamı |
|---|---|---|---|---|
| 0 | %0 | %0 | %0.00 | %0 |
| 1 | %3 | %1.3 | %0.22 | %1.3 |
| 2 | %6.1 | %2.6 | %0.43 | %2.6 |
| 3 | %9.2 | %4 | %0.67 | %4 |
| 4 | %12.5 | %5.5 | %0.92 | %5.5 |
| 5 | %15.8 | %6.9 | %1.15 | %6.9 |
| 6 | %19.3 | %8.4 | %1.40 | %8.4 |
| 7 | %22.8 | %10 | %1.67 | %10 |
| 8 | %26.5 | %11.6 | %1.93 | %11.6 |
| 9 | %30.3 | %13.2 | %2.20 | %13.2 |
| 10 | %34.1 | %14.9 | %2.48 | %14.9 |
| 11 | %38.1 | %16.7 | %2.78 | %16.7 |
| 12 | %42.3 | %18.5 | %3.08 | %18.5 |
| 13 | %46.6 | %20.4 | %3.40 | %20.4 |
| 14 | %50.9 | %22.3 | %3.72 | %22.3 |
| 15 | %55.4 | %24.2 | %4.03 | %24.2 |
| 16 | %60 | %26.3 | %4.38 | %26.3 |
| 17 | %64.8 | %28.4 | %4.73 | %28.4 |
| 18 | %69.7 | %30.5 | %5.08 | %30.5 |
| 19 | %74.8 | %32.7 | %5.45 | %32.7 |
| 20 | %80 | %35 | %5.83 | %35 |

**Tam savunma**: %80 + %35 + %35 = **%150.0** (tavan %150).
Altı kuleyi Lvl 20'de doldurmak 240 okçu istiyor ve bu askerler sefere gidemiyor.

## H. SAVAŞ

```
saldırıToplam = Σ (adet × saldırı)                    [+ kahraman]
savunmaHam    = Σ (adet × (yayaOran × yayaSav + atlıOran × atlıSav))
savunmaToplam = savunmaHam × (1 + surBonus/100)
                            × (1 + moral/100)
                            × (1 + kahramanSavunma/100)

kazanan güçlü taraf; kaybedenin kaybı %100.
kazananın kayıp oranı = (zayıf / güçlü) ^ 1.5
yağmada saldıranın kaybı ayrıca × 0.5
```

Savunmanın yaya/atlı ağırlığı SALDIRANIN bileşimine göre: süvari ağırlıklı
bir orduya karşı mızrakçı, piyadeye karşı kalkancı işe yarıyor.

### Moral bonusu

`moral = (saldıranNüfus / savunanNüfus)^0.2 − 1`, tavan **%50**.
Saldıran küçükse bonus **yok** — moral ezileni korumak için var.
Sur bonusuna EKLENMİYOR, ayrı çarpan (yoksa %150 tavanı ikisini birden yutardı).

| Saldıran / Savunan nüfus | Savunana bonus |
|---|---|
| 1× / 1× | %0 |
| 1.5× / 1× | %8.4 |
| 2× / 1× | %14.9 |
| 3× / 1× | %24.6 |
| 5× / 1× | %38 |
| 10× / 1× | %50 |
| 20× / 1× | %50 |
| 1× / 5× | %0 |

### Kuşatma

| Araç | Ne yapar | Saldırı katkısı |
|---|---|---|
| Koçbaşı Parçaları | Yalnız SURU yıkar (hendeğe dokunmaz). Saldıran kazanırsa etki eder. | 20 |
| Mancınık Parçaları | Seçilen binayı yıkar. Yalnız saldıran kazanırsa etki eder. | 25 |

## I. NÜFUS, İŞÇİ VE BESLENME

| Kalem | Değer |
|---|---|
| Başlangıç nüfusu | 50 |
| Nüfus tavanı | 50 + Σ (ev seviyesi × 150) |
| Ev max seviye | 5 (köyde birden fazla ev kurulabilir) |
| Büyüme hızı | Ana Bina Lvl 1'de 1/oyun saati, her seviye +2, Lvl 20'de 39 |
| Büyüme freni | boş işçi tamponu = 20 + 0.1 × işçi kapasitesi; tampon dolunca büyüme durur |
| Köylü yemeği | 3 ekmek/gün |
| Asker yemeği | 6 + 2 × (ekipman sayısı − 1) ekmek/gün |
| At yemeği | 3 HAM tahıl/gün (un/ekmek değil) |
| Açlık cezası | kesintisiz 10 oyun saati aç kalınca 1 nüfus ölür |

Beslenme zinciri: ekmek 1,0 · un 1,5 · ham tahıl 2,5 birim doyum başına —
yani işlenmemiş yemek daha çok tüketiliyor, fırın kurmak kârlı kalıyor.

**Bir tarla işçisi kaç asker besler** (tam zincir: tahıl → un → ekmek):

| Birim | Ekmek/gün | 1 tarla işçisinin beslediği |
|---|---|---|
| Fjordvakt | 6 | 38.4 asker |
| Skjoldvakt | 8 | 28.8 asker |
| Ulv Savaşçısı | 10 | 23.0 asker |
| Jernridder | 12 | 19.2 asker |

## J. TİCARET

| Kalem | Değer |
|---|---|
| Tüccar kapasitesi | 2000 birim/tüccar |
| Tüccar sayısı | pazar seviyesine bağlı |
| Kervan işçisi | gönderi başına 1 boş işçi, dönüşte iade |

NPC takas oranları ham ↔ işlenmiş mal arasında; oyuncular arası takas
serbest oranla, teklif panosu üzerinden.

## K. KÜLTÜR PUANI VE YENİ KÖY

| Köy sayısı | Gereken kültür puanı |
|---|---|
| 2. köy | 300 |
| 3. köy | 1.200 |
| 4. köy | 3.000 |
| 5. köy | 5.850 |
| 6. köy | 10.530 |
| 7. köy | 18.954 |
| 8. köy | 34.117 |
| 9. köy | 61.411 |

Köy hakkı İKİ kapıdan geçiyor: kültür puanı VE köşk/saray seviyesi
(köşk 10/20, saray 10/15/20). Yeni köy kurmak 3 göçmen istiyor.

**Şölenler** — kültür puanı üretir:

| Şölen | Şart | Süre | Maliyet | Kazanç |
|---|---|---|---|---|
| Küçük şölen | Taverna Lvl 1 | 12 sa | 400 kereste · 300 tuğla · 200 yontma taş · 200 tahıl | bu köy günlük CP × 1 |
| Büyük şölen | Taverna Lvl 10 | 24 sa | 1.200 kereste · 900 tuğla · 600 yontma taş · 600 tahıl · 300 külçe | bütün köyler günlük CP × 2 |

## L. KAHRAMAN

| Kalem | Değer |
|---|---|
| En yüksek seviye | 100 |
| Seviye başına skil puanı | 4 |
| Can | 100 + seviye × 10 |
| Taban hız | 7 (at kuşanınca +4.6, tavan 20) |
| Diriltme bedeli | 300 tahıl · 200 külçe + her seviye için 90 tahıl · 60 külçe |
| Zırhlanma tavanı | %50 |

Seviyeye göre diriltme bedeli örnekleri:

| Kahraman seviyesi | Diriltme bedeli |
|---|---|
| 1 | 300 tahıl · 200 külçe |
| 25 | 2.460 tahıl · 1.640 külçe |
| 50 | 4.710 tahıl · 3.140 külçe |
| 100 | 9.210 tahıl · 6.140 külçe |

**Skiller** — seviye başına 4 puan dağıtılıyor

| Skil | Puan başına | Tavan | Ne yapar |
|---|---|---|---|
| Saldırı Puanı | 80 | — | Kahramanın KENDİ saldırı gücü. Seferde tek bir birim gibi savaşır; bu puan onun vuruşudur. |
| Saldırı Bonusu | 0.2% | %20 | Kahraman sefere katıldığında ORDUNUN saldırısına yüzde ek. |
| Savunma Bonusu | 0.2% | %20 | Kahraman köydeyken o köyün TÜM savunmasına yüzde ek. |
| Hammadde Üretimi | 3/saat | — | Kahramanın bulunduğu köyün ham kaynak üretimine saatlik ek. |

**Eşya bonusları** — skillerden AYRI, kuşanılan eşyalardan geliyor

| Bonus | Birim |
|---|---|
| Kahraman saldırısı | düz sayı |
| Can tavanı | düz sayı |
| Alınan hasar | yüzde |
| Hız | düz sayı |
| İyileşme hızı | saatlik |
| Macera hızı | yüzde |
| Ganimet | yüzde |

**Eşya slotları**: Miğfer · Silah · Zırh · Kalkan · Bileklik · Pantolon · Kolye · Ayakkabı · At.

**Macera**

| Kalem | Değer |
|---|---|
| Macera hakkı | 3 + 0.5 × (konak seviyesi − 1) |
| Yenilenme | 6 oyun saati (konak seviyesiyle kısalır, en az 2) |

| Macera | Süre | XP | Can | Ödül sayısı | Eşya şansı |
|---|---|---|---|---|---|
| Kısa Macera | 2 sa | 40 | −8 | 1 | %12 |
| Uzun Macera | 6 sa | 130 | −32 | 2 | %22 |

Eşya düşerse nadirliği ikinci bir kura belirliyor:

| Nadirlik | Stat çarpanı | Düşme ağırlığı |
|---|---|---|
| Sıradan | ×1 | 56 |
| Ustaişi | ×1.5 | 27 |
| Nadir | ×2.1 | 12 |
| Epik | ×2.8 | 4 |
| Efsanevi | ×3.6 | 1.2 |

## M. DÜNYA

| Kalem | Değer |
|---|---|
| Harita yarıçapı | 134 hex |
| Köy merkezleri arası min mesafe | 6 hex |
| Köyün sahiplendiği alan | 2 hex yarıçap |
| NPC köy sayısı | ~200 |
| Oyuncu doğma halkası | ilk 12 hex |

**Kademeler** — merkeze yaklaştıkça NPC güçleniyor:

| Kademe | Ad | Halka | Güç çarpanı |
|---|---|---|---|
| 1 | Çiftlik | ≤ 34 | 0.1 |
| 2 | Kasaba | ≤ 60 | 0.28 |
| 3 | Kale | ≤ 87 | 0.52 |
| 4 | Jarl Köyü | ≤ 114 | 0.78 |
| 5 | Konak | ≤ 134 | 1 |

### Acemi kalkanı

| Kalem | Değer |
|---|---|
| Süre | 168 oyun saati (7 gün) |
| Nüfus eşiği | 200 |
| NPC koruması | ordu < 20 ve hiç saldırmamışken |

Kalkan üç koşuldan biri bozulunca düşüyor ve GERİ GELMİYOR: süre dolar,
nüfus eşiğe ulaşır ya da oyuncu ilk saldırısını gönderir. Kalkanlı köye
saldırı, yağma ve **keşif** kapalı; takviye ve hammadde açık.

## N. DİĞER MALİYETLER

| Kalem | Bedel |
|---|---|
| Göçmen (birim) | 400 kereste · 350 tuğla · 350 yontma taş · 200 külçe · 4.0 sa |
| Yeni köy | 3 göçmen |
| Bina yıkımı | o seviyenin inşa süresinin 1/10'u, kaynak iadesi YOK |
| Kahraman diriltme | 300 tahıl · 200 külçe + her seviye için 90 tahıl · 60 külçe (maceradan düşen iksirle bedava) |
| Skil sıfırlama | 200 külçe · 200 tahıl, her seferinde × 2 |

### Sağlık Çadırı (revir)

| Kalem | Değer |
|---|---|
| Yaralı kurtarma oranı | seviye × %2, tavan %40 |
| Yatak sayısı | seviye × 10 |
| İyileşme süresi | eğitim süresinin 2 katı |

Yalnız **savunulan** savaşta ölen askerlerin bir kısmı yaralı sayılıyor.
Yataklar dolduysa fazlası ölüyor. Tedavi kendiliğinden başlamıyor —
oyuncu hangi birliği ayağa kaldıracağına karar veriyor.
