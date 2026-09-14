# TraNord — Oyun Tasarım Dökümanı

> **Bu dökümanın amacı:** Oyunun bugün ne olduğunu, hangi mekaniklerin
> gerçekten çalıştığını ve hangi boşlukların açık kaldığını, kodu
> görmeyen birinin anlayabileceği şekilde anlatmak.
>
> **Sonundaki soru:** Oyunun bir AMACI ve BİTİŞİ yok. Döküman bu kararı
> vermek için gereken bütün bilgiyi taşıyor; son bölümde soru ve
> kısıtlar açıkça yazılı.
>
> Bütün sayılar 14 Eylül 2026 tarihli koddan çıkarıldı; tahmin yok.
>
> **Dökümanın sonundaki EK**, her binanın her seviyesinin maliyet ve
> süresini, bütün ekipmanları, bütün birimleri ve diğer maliyetleri
> tablo hâlinde taşıyor — hepsi 1× hıza göre.

---

## 1. Bir bakışta

TraNord, tarayıcıda oynanan, gerçek zamanlı, çok oyunculu bir **köy ve
strateji oyunu**. Travian ailesinden: oyuncu bir köyle başlar, kaynak
üretir, bina diker, asker eğitir, komşularına saldırır, yeni köyler
kurar. Oyun kapalıyken de işler — sunucu zamanı sürekli akıtır.

- **Tema:** İskandinav / fiyort. Bütün arayüz ve içerik **Türkçe**.
- **Tarayıcı oyunu**: yükleme yok, hesapla giriliyor.
- **Gerçek zamanlı ve kesintisiz**: inşaat, üretim, eğitim ve ordu
  yürüyüşü oyuncu çevrimdışıyken de ilerler.
- **PvP açık**: oyuncular birbirinin köyüne saldırabilir, yağmalayabilir,
  keşfedebilir, binalarını yıkabilir ve köyünü tamamen yok edebilir.
- **Ticari bir ürün**: oyun satılacak.

### Teknik çerçeve (kararı etkileyebileceği kadarıyla)
- Sunucu Node.js + Socket.io; istemci React. Tek dünya, tek sunucu süreci.
- Dünya altıgen (hex) ızgara, **yarıçap 134 hex**, ~1729 köy yeri.
  Şu an ~200 NPC köyü ve bir avuç oyuncu var.
- **Zaman ölçeği ayarlanabilir.** Bütün süreler "oyun saati" cinsinden
  tanımlı; dünya hızı bir çarpan ve bütün oyunu aynı oranda
  hızlandırıyor.

  **Bu dökümandaki BÜTÜN süreler 1× hıza göredir**, yani 1 oyun saati =
  1 gerçek saat. (Canlı sunucu şu an 10× çalışıyor; orada aynı süreler
  gerçek zamanda onda birine iner. Dengeyi tartışırken 1× sayıları
  kullanın.)

---

## 2. Kaynaklar ve üretim zinciri

**Beş ham kaynak** tarlalardan çıkar, dördü işleme binalarında
**işlenmiş mala** dönüşür. Bina ve ekipman maliyetleri ağırlıkla
işlenmiş mal ister; yani her şey iki aşamalı.

| Ham | İşlenmiş | İşleyen bina | Dönüşüm (işçi başına/saat) |
|---|---|---|---|
| Odun | Kereste | Keresteci | 8 odun → 6 kereste |
| Kil | Tuğla | Tuğlacı | 8 kil → 6 tuğla |
| Taş | Yontma Taş | Taşçı | 8 taş → 6 yontma taş |
| Demir | Külçe Demir | Demirci | **5 demir → 4 külçe** (en dar boğaz) |
| Tahıl | Un → Ekmek | Değirmen → Fırın | 90 tahıl → 72 un → 54 ekmek |

- Dönüşümde daima kayıp var (%25 civarı); ham kaynak biriktirmek
  işlenmiş mal biriktirmekten kolay.
- **Demir en dar dönüşüm** ve külçe hem silah, zırh, kuşatma makinesi hem
  de ağır binalar için gerekli. Ordu büyütmek isteyen ilk burada sıkışır.
- Değirmen tek işçiyle bile tarlaların verebileceğinden fazlasını
  öğütür — yiyecek zincirinde darboğaz **tahıl üretimi**, değirmen değil.

### Tarlalar (üretim alanları)
- Beş tür: Orman, Kil Ocağı, Taş Ocağı, Demir Madeni, Tarla (tahıl).
- Seviye ÜRETMİYOR, **işçi kapasitesi** açıyor: Lvl 1'de 3 işçi, Lvl 10'da
  21, Lvl 20'de 42. Gerçek üretimi **atanan işçi sayısı** belirliyor.
- İşçi başına saatlik taban: odun/kil/taş 22, demir 14, tahıl 32.
- Tarla sayısının tavanını **Ana Bina seviyesi** belirler: Lvl 1'de 6
  slot, Lvl 20'de 25.
- Hexlerin kendi **bonusları** var (+%10…+%50) ve merkeze uzaklık üretimi
  düşürüyor — nerede tarla açtığın önemli.
- **Tarla seviye tavanı: merkez köyde 20, diğer köylerde 10.** Merkez
  başka köye taşınırsa eski merkezin tarlaları 10'a iner.

### Depolar
Her kaynağın tavanı var; tavan dolunca üretim **boşa akar**.

| Depo | Neyi tutar | Taban (deposuz) | Lvl 1 ekler | Sonraki her seviye |
|---|---|---|---|---|
| Hammadde Deposu | odun, kil, taş, demir (ayrı ayrı) | 1000 | +3000 | +1500 |
| İşlenmiş Mal Deposu | kereste, tuğla, yontma taş, külçe | 800 | +2400 | +1200 |
| Tahıl Ambarı | ham tahıl | 1000 | +12000 | +6000 |
| Erzak Ambarı | un + ekmek (**ortak** tavan) | 600 | +2500 | +1250 |

En yüksek seviyeye ulaşan depoların **ikincisi** kurulabiliyor.

---

## 3. Nüfus, işçi ve açlık

- **Nüfus = sivil + asker.** Her asker 1 nüfus tüketir.
- Nüfus TAVANINI **Ev** binaları belirler (seviye başına +100, en fazla
  Lvl 5, ama köyde birden fazla ev kurulabilir).
- Nüfus BÜYÜME HIZINI **Ana Bina** belirler: Lvl 1'de oyun saatinde 1
  kişi, her seviye +2, Lvl 20'de 39.
- **İşçi** = boştaki sivil. Tarlalara, işleme binalarına, kışlaya,
  inşaata ve kulelere atanır. İşçi oyunun asıl para birimi gibi: her şey
  onun için yarışır.
- **Beslenme:** köylü günde 3 ekmek, asker günde 6 (iki katı), at günde
  3 HAM tahıl. Önce ekmek, bitince un, en son ham tahıl yenir.
- Yiyecek biterse **açlık**: her 10 oyun saatinde 1 nüfus ölür.
  Minimum nüfus 10'da korunur (köy tamamen boşalmaz).

---

## 4. Binalar

33 bina var. Köy merkezi bir hex ızgara; her binaya bir slot gerekiyor
ve **slot sayısı sınırlı** (Ana Bina seviyesiyle açılan 25 hex + sur,
hendek ve 6 kule için ayrı slotlar). Yani "her binayı kur" mümkün değil,
köyler **uzmanlaşmak zorunda**.

### Merkez
| Bina | Ne yapar |
|---|---|
| **Ana Bina** (max 20) | Üretim alanı slot sayısı (6→25) ve nüfus büyüme hızı (1→39/sa) |

### İşleme (hepsi max 20, seviye başına 5 işçi)
Keresteci · Tuğlacı · Taşçı · Demirci · Değirmen · Fırın — yukarıdaki
dönüşüm zinciri.

### Askerî
| Bina | Max | Ne yapar |
|---|---|---|
| **Kışla** | 20 | Piyade eğitir. İşçi sayısı eğitim süresini kısaltır |
| **Ahır** | 20 | Süvari eğitir; **seviye × 5 at** depolar |
| **Atölye** | 20 | Koç başı + mancınık; **seviye × 5** makine (ortak) |
| **Silahçı** | 20 | Kılıç + mızrak üretir; **ekipman seviyesini** yükseltir |
| **Zırhçı** | 20 | Zırh + kalkan üretir; **ekipman seviyesini** yükseltir |
| **Cephanelik** | 20 | Kılıç/mızrak/kalkan/zırh için **ortak havuz**: seviye × 200 yer (cephanelik yoksa yalnız 80) |
| **Rún Salonu** | 10 | Birim **araştırması**. Bir birimi eğitmek için hem bina seviyesi hem buradaki araştırma gerekir |
| **Sağlık Çadırı** | 20 | Savunulan savaşta ölenlerin bir kısmı yaralı sayılıp çadıra alınır (bkz. §9) |
| **Kahraman Konağı** | 20 | Kahramanın evi; iyileşme hızı, macera tavanı ve macera birikme süresi (bkz. §10) |

### Savunma
| Bina | Max | Bonus (Lvl 20) |
|---|---|---|
| **Sur** | 20 | %80 — savunan bütün birliklere yüzde savunma |
| **Hendek** | 20 | %35 — surun yarısı eğrisi |
| **Savunma Kulesi** (×6) | 20 | Altısı birden %35. **Okçu ister** (seviye × 4); boş kule 0 verir |

Üçünün toplamı **%150'de sınırlı**, ama tam kadro bugün **%149,8**
ediyor — yani tavan pratikte ulaşılamaz, tablolar zaten oraya nişan
almış.

### Ekonomik / yönetim / nüfus
| Bina | Max | Ne yapar |
|---|---|---|
| **Pazar** | 20 | NPC takası, oyuncu teklifleri, karşılıksız hammadde gönderme. **Seviye = tüccar sayısı**, her tüccar 2000 taşır |
| **Loncalar** (5 tür) | 5 | İlgili ham kaynağın tarla üretimini +%5/seviye, en fazla +%25 |
| **Köşk** | 20 | Lvl 10 ve 20'de birer **yeni köy hakkı**; göçmen eğitir |
| **Saray** | 20 | Oyuncu başına **tek**. Lvl 10/15/20'de üç köy hakkı; göçmen eğitir; **merkez köyü buradan değiştirilir** |
| **Taverna** | 20 | Şölen → **kültür puanı** |
| **Ev** (çoklu) | 5 | Seviye başına +100 nüfus tavanı |

---

## 5. Ekipman sistemi (Travian'dan ayrılan yer)

Asker eğitmek yalnız kaynak değil **ekipman** istiyor. Her birimin bir
ekipman listesi var ve o parçalar **önceden üretilmiş** olmalı.

| Ekipman | Saldırı | Yaya sav. | Atlı sav. | Hız | Kapasite | Üretildiği yer |
|---|---|---|---|---|---|---|
| Kılıç | +30 | +20 | +10 | −3 | −10 | Silahçı |
| Mızrak | +10 | +10 | +30 | −2 | −5 | Silahçı |
| Kalkan | +5 | +25 | +15 | −2 | −10 | Zırhçı |
| Zırh | +20 | +5 | +5 | −2 | −5 | Zırhçı |
| At | +10 | +20 | +20 | +4 | +50 | Ahır |
| Koçbaşı parçaları | +20 | — | — | — | — | Atölye |
| Mancınık parçaları | +25 | — | — | — | — | Atölye |

- Bir birimin statları, **taşıdığı ekipmanların toplamıdır**. "Jernridder"
  = at + kılıç + kalkan + zırh.
- Kılıç/mızrak/kalkan/zırh **tek bir ortak havuzda** duruyor
  (Cephanelik). Tek tür havuzun tamamını doldurabilir — ne üreteceğin
  senin kararın.
- **Ekipman SEVİYESİ ayrı bir eksen**: Silahçı/Zırhçı'da kılıç, mızrak,
  kalkan ve zırh yükseltilebiliyor ve yükseltme **bütün orduya birden**
  işliyor. Bir seferde tek ekipman yükseltilir.

---

## 6. Birimler

16 birim var. Piyade Kışla'da, süvari Ahır'da, kuşatma Atölye'de,
göçmen Köşk/Saray'da eğitiliyor. Hepsi ayrıca **Rún Salonu araştırması**
istiyor.

| Birim | Sınıf | Saldırı | Yaya sav. | Atlı sav. | Hız | Yük | Ekipman |
|---|---|---|---|---|---|---|---|
| Fjordvakt | piyade | 30 | 30 | 20 | 7 | 50 | kılıç |
| Skjoldvakt | piyade | 35 | 55 | 35 | 5 | 40 | kılıç+kalkan |
| Nordkamper | piyade | 50 | 35 | 25 | 5 | 45 | kılıç+zırh |
| Ulv Savaşçısı | piyade | 55 | 60 | 40 | 3 | 35 | kılıç+zırh+kalkan |
| Spydvakt | piyade | 10 | 20 | 40 | 8 | 55 | mızrak |
| Isbjørn | piyade | 30 | 25 | 45 | 6 | 50 | mızrak+zırh |
| Kuzey İzcisi | süvari | 10 | 10 | 10 | **14** | 110 | at |
| Demir Atlı | süvari | 40 | 50 | 40 | 11 | 100 | at+kılıç |
| Skjoldreiter | süvari | 45 | 75 | 55 | 9 | 90 | at+kılıç+kalkan |
| Buz Süvarisi | süvari | 60 | 55 | 45 | 9 | 95 | at+kılıç+zırh |
| Jernridder | süvari | 65 | 80 | 60 | 7 | 85 | at+kılıç+kalkan+zırh |
| Vindreiter | süvari | 20 | 40 | 60 | 12 | 105 | at+mızrak |
| Stormridder | süvari | 30 | 45 | 65 | 10 | 100 | at+mızrak+zırh |
| Koçbaşı | kuşatma | 60 | 30 | 75 | 4 | 0 | koçbaşı |
| Alev Mancınığı | kuşatma | 75 | 60 | 10 | 3 | 0 | mancınık |
| Göçmen | göçmen | 0 | 0 | 0 | 5 | 0 | — |

**Taş-kâğıt-makas:** mızraklı birimler atlıya karşı güçlü (atlı sav.
yüksek), kılıçlı birimler yayaya karşı. Saldıran hangi sınıfı
gönderdiğine, savunan hangi sınıfa hazırlandığına bakar.

**Hız haritada belirleyici**: en yavaş birim yürüyüşün hızını belirler.
Mancınık (3) ile giden bir ordu çok yavaştır — kuşatmanın bedeli bu.

---

## 7. Savaş

- Saldıran ordunun toplam **saldırısı**, savunanın **yaya/atlı savunma**
  karışımına karşı hesaplanır (saldıran ordunun sınıf dağılımına göre).
- Savunmaya **sur + hendek + kule** bonusu yüzde olarak biner.
- Kayıplar **Kirilloid eğrisiyle** (üs 1,5) dağıtılır: yakın güçlerde
  iki taraf da ağır kaybeder, ezici üstünlükte kazanan neredeyse
  kayıpsız çıkar.
- **Yağma kipinde kayıplar yarıya iner** — düşük riskli, düşük getirili
  akın.
- Göçmen ve kuşatma birimleri **güce katılmaz** ama kayıpta pay alır.
- Köyde duran **misafir (takviye) birlikler** savunmaya katılır; kayıp
  önce ev sahibinden, artanı misafirlerden düşer.
- **Kahraman** savaşa tek birim gibi girer; ham gücü atlıysa süvari,
  değilse piyade tarafına yazılır (bkz. §10).

### Sefer kipleri
| Kip | Ne yapar |
|---|---|
| **Saldırı** | Tam savaş. Kuşatma makineleri yalnız bu kipte gider |
| **Yağma** | Savaş + ganimet; kayıplar yarı |
| **Keşif** | Yalnız izci. Savunanın **izcilerine** karşı savaşır; sur/hendek işlemez, yalnız kule. Kazanırsan ordu, sur, hendek ve depo görünür; kaybedersen hiçbir bilgi gelmez |
| **Takviye** | Başka köye savunma için asker bırakırsın. Ev sahibi onları besler ve geri yollayabilir; sahibi geri çağırabilir |
| **Yerleşim** | 3 göçmen boş araziye → yeni köy |

- Köy başına aynı anda **8 sefer**.
- Sefer gönderildikten sonra **90 saniyelik geri çağırma penceresi** var.
- Ordu **yürür**, ışınlanmaz; dönüş de aynı süre.

### Kuşatma
- **Koçbaşı yalnız SURU** kırar; hendeğe dokunmaz ve sur sıfırlandıktan
  sonra artan güç boşa gider.
- **Mancınık seçilen BİNAYI** yıkar (Atölye Lvl 10'dan itibaren iki hedef).
- Kuşatma yalnız **saldıran kazanırsa** işler.
- **Bütün binaları yıkılan köy haritadan silinir.** Son köyü de giden
  oyuncu oyundan tamamen düşer.

### Savunma sonrası: Revir (Sağlık Çadırı)
- Savunulan savaşta ölen askerlerin **seviye × %2'si** (Lvl 20'de %40)
  yaralı sayılıp çadıra alınır.
- Yatak sayısı **seviye × 10** (Lvl 20'de 200); sığmayan yaralı ölür.
- Tedavi **kendiliğinden başlamaz** — oyuncu hangi birliği ayağa
  kaldıracağını seçer; seçilen birlik kendi **eğitim süresinin 2 katı**
  kadar sürede orduya döner.
- Yalnız ev sahibinin askerine işler, yalnız savunmada.

---

## 8. Kahraman (RPG katmanı)

Oyuncu başına **tek ve kalıcı** bir kahraman. Köye değil oyuncuya ait;
üssü Kahraman Konağı'nın olduğu köy.

- **Seviye 1–100**, seviye başına **4 skil puanı**, dört skil:
  - Saldırı Puanı: puan başına **+80 ham güç** (savaşta kendi vuruşu)
  - Saldırı Bonusu: orduya **+%0,2/puan**, tavan %20
  - Savunma Bonusu: bulunduğu köye **+%0,2/puan**, tavan %20
  - Hammadde Üretimi: bulunduğu köye **+3/saat** ham kaynak
- **Can**: taban 100, seviye başına +10. Ölürse kendiliğinden gelmez —
  ya hammadde ödenip diriltilir (bedel seviyeyle artar) ya da maceradan
  düşen **Diriltme İksiri** kullanılır.
- **Hız**: yaya 7; at takınca **+4,6** (bu sayı süvari ve piyade
  ortalamalarının farkından ölçülüyor) artı atın kendi hızı. Tavan 20.
  Atlı kahraman süvari mertebesinde hızlı ve savaşta **süvari** sayılır.
- **Maceralar**: Kısa (2 sa, 40 XP) ve Uzun (6 sa, 130 XP). Macera hakkı
  Konak seviyesine göre birikiyor. Ödül: hammadde, asker ya da **eşya**.
  Macera süresi kahramanın hızıyla kısalıyor.
- **Eşya**: 9 kuşam slotu (miğfer, silah, zırh, kalkan, bileklik,
  pantolon, kolye, ayakkabı, at) ve **beş nadirlik**:

| Sınıf | Renk | Bonus çarpanı | Düşme şansı |
|---|---|---|---|
| Sıradan | gri | 1× | %55,8 |
| Ustaişi | yeşil | 1,5× | %26,9 |
| Nadir | mavi | 2,1× | %12 |
| Epik | mor | 2,8× | %4 |
| Efsanevi | turuncu | 3,6× | %1,2 |

  Eşyalar iki ayrı şeyi büyütüyor: **kahramanı** (saldırı, can,
  zırhlanma, hız, iyileşme, macera hızı) ve **orduyu** (tek tek birim
  tiplerinin saldırı/savunması, yüzde olarak).
- Kahraman tek başına saldırıya, yağmaya ya da takviyeye gönderilebilir.

---

## 9. Ticaret ve pazar

- **NPC takası**: sabit oranlı, anında (2:1, 4:1 gibi).
- **Oyuncu teklifleri**: oran serbest; "2000 odun veririm, 6000 kereste
  isterim". Mal ve tüccar teklif açılırken ayrılır.
- **Karşılıksız hammadde gönderme**: istediğin oyuncuya köy adı ya da
  oyuncu adı arayarak. Tek kervan, karışık yük. Geri alınamaz.
- **Tüccar**: pazar seviyesi kadar, her biri 2000 taşır, hızı 10
  hex/saat. Gidip **geri dönene** kadar bağlı — uzağa ticaret pahalı.

---

## 10. Çoklu köy, kültür puanı ve merkez

- **Kültür puanı (KP)** binaların seviyelerinden günlük birikiyor (bina
  başına 1–4 KP/gün) ve **Taverna şölenleriyle** toplu olarak kazanılıyor.
- Yeni köy kurmak için **hem KP eşiği hem köy hakkı** gerekiyor:
  - KP eşikleri: 2. köy **300**, 3. köy **1200**, 4. köy **3000**,
    5. köy **5850**… (her adımda ×1,8 büyüyor)
  - Köy hakkı: Köşk Lvl 10 ve 20 (2 hak), Saray Lvl 10/15/20 (3 hak)
- Yeni köy: 3 göçmen boş bir araziye yürür ve orada köy kurar.
- Köyler arasında **kaynak** (pazar tüccarı) ve **asker** (takviye)
  gönderilebiliyor.
- **Merkez köy (başkent)**: Saray'ın olduğu köy. Oyuncu başına tek.
  - Görev zinciri ve kahraman kaydı merkezde durur.
  - **Tarlalar yalnız merkezde Lvl 20'ye çıkar** (diğerlerinde 10).
  - Merkez taşınırsa eski merkezin tarlaları 10'a iner.

---

## 11. Dünya, NPC'ler ve görevler

- Dünya merkezden dışa doğru **beş kademeye** ayrılmış: Çiftlik →
  Kasaba → Kale → Jarl Köyü → Konak. Dışarı gittikçe NPC köyleri
  zenginleşiyor ve güçleniyor (güç çarpanı 0,1 → 1,0).
- ~200 NPC köyü var; bunlar yağma hedefi ve erken oyunun kaynağı.
  NPC'ler ara sıra oyunculara akın da düzenliyor.
- Köyler arasında **en az 6 hex** mesafe; her köy çevresindeki **2 hex**
  yarıçapı sahipleniyor (tarlalar oradan açılıyor).
- **ACEMİ KORUMASI (yalnız NPC'lere karşı)**: hiç saldırı yapmamış VE
  toplam birim sayısı **20'nin altında** olan köye NPC akın göndermiyor
  (`PROTECT_MIN_ARMY = 20`, `server/sabitler.js`). İki şarttan biri
  bozulunca koruma kalkıyor ve bir daha geri gelmiyor: ilk saldırıyı
  gönderdiğin an `hasAttacked` kalıcı olarak işaretleniyor.
  **DİKKAT — bu koruma OYUNCU saldırılarını engellemiyor.** Bir oyuncu,
  bir günlük acemiyi ilk dakikadan itibaren yağmalayabilir. Bitiş/eleme
  tasarımı yapılırken bu boşluk önemli: bugün yeni oyuncuyu güçlü
  komşudan koruyan hiçbir kural yok.
- **48 rehber görevi** var (29'u ana hat, 19'u yan hedef): oyuncuya
  sırasıyla işçi atamayı, zinciri kurmayı, asker eğitmeyi, keşfi,
  saldırıyı ve yeni köy kurmayı öğretiyor. Ödülleri kaynak.

---

## 12. BUGÜN OLMAYAN ŞEYLER

Karar verirken bunların **yok** olduğunu bilmek önemli:

1. **Oyunun bir AMACI yok.** Kazanma, bitiş, sezon, sıralama ödülü,
   "oyun bitti" ekranı — hiçbiri yok. Oyuncu sonsuza kadar büyüyor.
2. **İttifak / birlik yok.** Sırada duruyor ama yazılmadı. Oyuncular
   birbirine takviye ve kaynak gönderebiliyor, o kadar; ortak bir
   yapı, ortak hedef ya da diplomasi yok.
3. **Moral bonusu yok.** Küçük oyuncunun büyüğe karşı avantajı yok;
   büyük olan küçüğü bedava eziyor.
4. **Sıralama var ama ödülü yok.** İstatistik ekranında nüfus, ordu,
   savaş sayaçları ve "en güçlü kahraman" tabloları var; hiçbiri bir
   şeye yaramıyor.
5. **Sezon / dünya sıfırlama yok.** Dünya bir kez kuruldu, sonsuza
   kadar sürüyor.
6. **Oyuncu elenebiliyor**: bütün köyleri yıkılan oyuncu oyundan
   tamamen siliniyor. Yani "kaybetme" var, "kazanma" yok.
7. **Oyuncuyu oyuncudan koruyan hiçbir kural yok.** Tek koruma acemi
   köyünü NPC akınından muaf tutuyor (bkz. §11); gerçek oyuncular buna
   takılmıyor. Moral bonusu da olmadığı için güçlü oyuncu ile yeni
   oyuncu arasında hiçbir tampon yok.

---

## 13. KARAR SORUSU — oyunun amacı ve bitişi

**Soru:** TraNord'un amacı ne olmalı ve oyun nasıl bitmeli / nasıl
kazanılmalı?

### Cevabın uyması gereken kısıtlar
1. **Ticari ürün.** Oyuncunun oynamaya devam etmesi için bir sebep
   gerekiyor ama "asla bitmeyen" bir oyun da satın alınan bir şeyden
   çok bir hizmet gibi duruyor. İkisinin dengesi önemli.
2. **Tek dünya, tek sunucu.** Şu an paralel dünyalar / sezon altyapısı
   yok; sezon fikri öneriliyorsa neyin sıfırlanıp neyin kalacağı da
   söylenmeli.
3. **Oyuncu sayısı az ve dünya büyük** (~1729 slot, ~200 NPC, bir avuç
   oyuncu). Erken dönemde oyuncular birbirini zor buluyor. Amaç,
   oyuncuların birbirine DEĞMESİNİ sağlamalı.
4. **Eleme zaten var** (bütün köyleri yıkılan oyuncu siliniyor). Bir
   kazanma koşulu bu elemeyle çelişmemeli — herkesin elenip tek kişinin
   kalması aylar sürer ve son kalan için de eğlenceli olmaz.
5. **Yeni sistem yazmak mümkün** ama elde hazır duran malzeme şunlar:
   kültür puanı, çoklu köy, merkez köy, kahraman seviyesi, kuşatma ve
   köy yok etme, ticaret, takviye, istatistik sayaçları, NPC kademeleri
   (merkeze yaklaştıkça güçlenen bir dünya), şölen sistemi.
6. **Türkçe ve İskandinav teması** korunmalı.

### Özellikle görüş istenen noktalar
- Bitiş **olmalı mı**? (sezon sonu / kazanan / sonsuz sandbox)
- Kazanma koşulu **bireysel mi, ittifak mı** olmalı? (ittifak henüz yok;
  cevaba göre öncelik değişir)
- Dünyanın **merkezi** özel bir rol oynamalı mı? (kademeler zaten
  merkeze doğru güçleniyor — "merkezi ele geçir" gibi bir hedefe hazır
  bir zemin var)
- **Kültür puanı** yalnız köy kurmaya yarıyor; bir zafer ölçüsüne
  dönüştürülmeli mi?
- Kaybeden oyuncuya ne olmalı? (şu an tamamen siliniyor — yeniden
  başlama, koruma kalkanı, ya da "son köy yıkılmaz" gibi bir yumuşatma
  gerekir mi?)
- Uzun vadeli hedef **inşa odaklı mı** (dünya harikası / anıt),
  **askerî mi** (belirli köyleri ele geçirme), yoksa **ekonomik mi**
  (belirli bir üretim/ticaret eşiği) olmalı?

> Cevap verirken lütfen somut ol: hangi mekanik eklenecek, hangi sayı
> hangi eşikte, oyuncu bunu ekranda nasıl görecek ve oyunun kaç haftalık
> bir yay çizmesi bekleniyor.

---

# EK — BÜTÜN MALİYETLER VE SÜRELER

> **Süreler 1× hıza göredir.** Oyun içi süreler "oyun saati"
> cinsinden tanımlı; 1× hızda 1 oyun saati = 1 gerçek saat. Canlı
> sunucu şu an 10× hızda çalışıyor, yani aşağıdaki süreler gerçek
> zamanda onda birine iner. Dengeyi tartışırken **1× sayıları**
> kullanın.
>
> İnşaat ve eğitim süreleri **işçi sayısına bölünür**; tablolarda
> hem 1 işçi hem 10 işçi karşılığı var.

## A. Köy binaları — seviye seviye maliyet ve süre

Kural: **inşa** (0→1) maliyeti `cost`; sonraki her yükseltme
`upgradeCostBase × çarpan^(seviye-1)`. Süre
`buildBaseWork × buildMultiplier^(seviye-1) / işçi` oyun dakikası.

### Ana Bina (`anaBina`) — Merkez, max Lvl 20

- seviye başına +2 kültür puanı/gün

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | — | 50 dk | 5 dk |
| 1 → 2 | 35 kereste · 120 tuğla · 60 yontma taş · 55 külçe | 1 sa 30 dk | 9 dk |
| 2 → 3 | 60 kereste · 204 tuğla · 102 yontma taş · 94 külçe | 2 sa 42 dk | 16 dk |
| 3 → 4 | 101 kereste · 347 tuğla · 173 yontma taş · 159 külçe | 4 sa 52 dk | 29 dk |
| 4 → 5 | 172 kereste · 590 tuğla · 295 yontma taş · 270 külçe | 8 sa 45 dk | 52 dk |
| 5 → 6 | 292 kereste · 1.002 tuğla · 501 yontma taş · 459 külçe | 15 sa 45 dk | 1 sa 34 dk |
| 6 → 7 | 497 kereste · 1.704 tuğla · 852 yontma taş · 781 külçe | 1 g 4 sa | 2 sa 50 dk |
| 7 → 8 | 845 kereste · 2.897 tuğla · 1.448 yontma taş · 1.328 külçe | 2 g 3 sa | 5 sa 6 dk |
| 8 → 9 | 1.436 kereste · 4.924 tuğla · 2.462 yontma taş · 2.257 külçe | 3 g 19 sa | 9 sa 11 dk |
| 9 → 10 | 2.442 kereste · 8.371 tuğla · 4.185 yontma taş · 3.837 külçe | 6 g 21 sa | 16 sa 32 dk |
| 10 → 11 | 4.151 kereste · 14.231 tuğla · 7.115 yontma taş · 6.522 külçe | 12 g 9 sa | 1 g 5 sa |
| 11 → 12 | 7.056 kereste · 24.192 tuğla · 12.096 yontma taş · 11.088 külçe | 22 g 7 sa | 2 g 5 sa |
| 12 → 13 | 11.995 kereste · 41.126 tuğla · 20.563 yontma taş · 18.850 külçe | 40 g 4 sa | 4 g |
| 13 → 14 | 20.392 kereste · 69.915 tuğla · 34.957 yontma taş · 32.044 külçe | 72 g 7 sa | 7 g 5 sa |
| 14 → 15 | 34.666 kereste · 118.855 tuğla · 59.427 yontma taş · 54.475 külçe | 130 g 3 sa | 13 g |
| 15 → 16 | 58.932 kereste · 202.053 tuğla · 101.027 yontma taş · 92.608 külçe | 234 g 6 sa | 23 g 10 sa |
| 16 → 17 | 100.185 kereste · 343.491 tuğla · 171.745 yontma taş · 157.433 külçe | 421 g 15 sa | 42 g 4 sa |
| 17 → 18 | 170.314 kereste · 583.934 tuğla · 291.967 yontma taş · 267.637 külçe | 758 g 23 sa | 75 g 21 sa |
| 18 → 19 | 289.534 kereste · 992.688 tuğla · 496.344 yontma taş · 454.982 külçe | 1366 g 4 sa | 136 g 14 sa |
| 19 → 20 | 492.208 kereste · 1.687.570 tuğla · 843.785 yontma taş · 773.470 külçe | 2459 g 3 sa | 245 g 21 sa |

### Keresteci (`keresteci`) — İşleme, max Lvl 20

- seviye × 5 işçi alır
- seviye başına +1 kültür puanı/gün

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 100 odun · 40 taş | 20 dk | 2 dk |
| 1 → 2 | 100 odun · 40 taş | 36 dk | 4 dk |
| 2 → 3 | 125 odun · 50 taş | 1 sa 5 dk | 6 dk |
| 3 → 4 | 156 odun · 63 taş | 1 sa 57 dk | 12 dk |
| 4 → 5 | 195 odun · 78 taş | 3 sa 30 dk | 21 dk |
| 5 → 6 | 244 odun · 98 taş | 6 sa 18 dk | 38 dk |
| 6 → 7 | 305 odun · 122 taş | 11 sa 20 dk | 1 sa 8 dk |
| 7 → 8 | 381 odun · 153 taş | 20 sa 24 dk | 2 sa 2 dk |
| 8 → 9 | 477 odun · 191 taş | 1 g 12 sa | 3 sa 40 dk |
| 9 → 10 | 596 odun · 238 taş | 2 g 18 sa | 6 sa 37 dk |
| 10 → 11 | 745 odun · 298 taş | 4 g 23 sa | 11 sa 54 dk |
| 11 → 12 | 931 odun · 373 taş | 8 g 22 sa | 21 sa 25 dk |
| 12 → 13 | 1.164 odun · 466 taş | 16 g 1 sa | 1 g 14 sa |
| 13 → 14 | 1.455 odun · 582 taş | 28 g 22 sa | 2 g 21 sa |
| 14 → 15 | 1.819 odun · 728 taş | 52 g 1 sa | 5 g 4 sa |
| 15 → 16 | 2.274 odun · 909 taş | 93 g 16 sa | 9 g 8 sa |
| 16 → 17 | 2.842 odun · 1.137 taş | 168 g 15 sa | 16 g 20 sa |
| 17 → 18 | 3.553 odun · 1.421 taş | 303 g 14 sa | 30 g 8 sa |
| 18 → 19 | 4.441 odun · 1.776 taş | 546 g 11 sa | 54 g 15 sa |
| 19 → 20 | 5.551 odun · 2.220 taş | 983 g 15 sa | 98 g 8 sa |

### Tuğlacı (`tuglaci`) — İşleme, max Lvl 20

- seviye × 5 işçi alır
- seviye başına +1 kültür puanı/gün

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 60 odun · 50 kil | 20 dk | 2 dk |
| 1 → 2 | 60 odun · 50 kil | 34 dk | 3 dk |
| 2 → 3 | 75 odun · 63 kil | 58 dk | 6 dk |
| 3 → 4 | 94 odun · 78 kil | 1 sa 38 dk | 10 dk |
| 4 → 5 | 117 odun · 98 kil | 2 sa 47 dk | 17 dk |
| 5 → 6 | 146 odun · 122 kil | 4 sa 44 dk | 28 dk |
| 6 → 7 | 183 odun · 153 kil | 8 sa 3 dk | 48 dk |
| 7 → 8 | 229 odun · 191 kil | 13 sa 41 dk | 1 sa 22 dk |
| 8 → 9 | 286 odun · 238 kil | 23 sa 15 dk | 2 sa 20 dk |
| 9 → 10 | 358 odun · 298 kil | 1 g 15 sa | 3 sa 57 dk |
| 10 → 11 | 447 odun · 373 kil | 2 g 19 sa | 6 sa 43 dk |
| 11 → 12 | 559 odun · 466 kil | 4 g 18 sa | 11 sa 25 dk |
| 12 → 13 | 698 odun · 582 kil | 8 g 2 sa | 19 sa 25 dk |
| 13 → 14 | 873 odun · 728 kil | 13 g 18 sa | 1 g 9 sa |
| 14 → 15 | 1.091 odun · 909 kil | 23 g 9 sa | 2 g 8 sa |
| 15 → 16 | 1.364 odun · 1.137 kil | 39 g 18 sa | 3 g 23 sa |
| 16 → 17 | 1.705 odun · 1.421 kil | 67 g 14 sa | 6 g 18 sa |
| 17 → 18 | 2.132 odun · 1.776 kil | 114 g 21 sa | 11 g 11 sa |
| 18 → 19 | 2.665 odun · 2.220 kil | 195 g 7 sa | 19 g 12 sa |
| 19 → 20 | 3.331 odun · 2.776 kil | 332 g 1 sa | 33 g 4 sa |

### Taşçı (`tasci`) — İşleme, max Lvl 20

- seviye × 5 işçi alır
- seviye başına +1 kültür puanı/gün

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 70 odun · 40 taş | 20 dk | 2 dk |
| 1 → 2 | 70 odun · 40 taş | 34 dk | 3 dk |
| 2 → 3 | 88 odun · 50 taş | 58 dk | 6 dk |
| 3 → 4 | 109 odun · 63 taş | 1 sa 38 dk | 10 dk |
| 4 → 5 | 137 odun · 78 taş | 2 sa 47 dk | 17 dk |
| 5 → 6 | 171 odun · 98 taş | 4 sa 44 dk | 28 dk |
| 6 → 7 | 214 odun · 122 taş | 8 sa 3 dk | 48 dk |
| 7 → 8 | 267 odun · 153 taş | 13 sa 41 dk | 1 sa 22 dk |
| 8 → 9 | 334 odun · 191 taş | 23 sa 15 dk | 2 sa 20 dk |
| 9 → 10 | 417 odun · 238 taş | 1 g 15 sa | 3 sa 57 dk |
| 10 → 11 | 522 odun · 298 taş | 2 g 19 sa | 6 sa 43 dk |
| 11 → 12 | 652 odun · 373 taş | 4 g 18 sa | 11 sa 25 dk |
| 12 → 13 | 815 odun · 466 taş | 8 g 2 sa | 19 sa 25 dk |
| 13 → 14 | 1.019 odun · 582 taş | 13 g 18 sa | 1 g 9 sa |
| 14 → 15 | 1.273 odun · 728 taş | 23 g 9 sa | 2 g 8 sa |
| 15 → 16 | 1.592 odun · 909 taş | 39 g 18 sa | 3 g 23 sa |
| 16 → 17 | 1.990 odun · 1.137 taş | 67 g 14 sa | 6 g 18 sa |
| 17 → 18 | 2.487 odun · 1.421 taş | 114 g 21 sa | 11 g 11 sa |
| 18 → 19 | 3.109 odun · 1.776 taş | 195 g 7 sa | 19 g 12 sa |
| 19 → 20 | 3.886 odun · 2.220 taş | 332 g 1 sa | 33 g 4 sa |

### Demirci (`demirci`) — İşleme, max Lvl 20

- seviye × 5 işçi alır
- seviye başına +1 kültür puanı/gün

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 80 odun · 40 taş | 20 dk | 2 dk |
| 1 → 2 | 80 odun · 40 taş | 36 dk | 4 dk |
| 2 → 3 | 100 odun · 50 taş | 1 sa 5 dk | 6 dk |
| 3 → 4 | 125 odun · 63 taş | 1 sa 57 dk | 12 dk |
| 4 → 5 | 156 odun · 78 taş | 3 sa 30 dk | 21 dk |
| 5 → 6 | 195 odun · 98 taş | 6 sa 18 dk | 38 dk |
| 6 → 7 | 244 odun · 122 taş | 11 sa 20 dk | 1 sa 8 dk |
| 7 → 8 | 305 odun · 153 taş | 20 sa 24 dk | 2 sa 2 dk |
| 8 → 9 | 381 odun · 191 taş | 1 g 12 sa | 3 sa 40 dk |
| 9 → 10 | 477 odun · 238 taş | 2 g 18 sa | 6 sa 37 dk |
| 10 → 11 | 596 odun · 298 taş | 4 g 23 sa | 11 sa 54 dk |
| 11 → 12 | 745 odun · 373 taş | 8 g 22 sa | 21 sa 25 dk |
| 12 → 13 | 931 odun · 466 taş | 16 g 1 sa | 1 g 14 sa |
| 13 → 14 | 1.164 odun · 582 taş | 28 g 22 sa | 2 g 21 sa |
| 14 → 15 | 1.455 odun · 728 taş | 52 g 1 sa | 5 g 4 sa |
| 15 → 16 | 1.819 odun · 909 taş | 93 g 16 sa | 9 g 8 sa |
| 16 → 17 | 2.274 odun · 1.137 taş | 168 g 15 sa | 16 g 20 sa |
| 17 → 18 | 2.842 odun · 1.421 taş | 303 g 14 sa | 30 g 8 sa |
| 18 → 19 | 3.553 odun · 1.776 taş | 546 g 11 sa | 54 g 15 sa |
| 19 → 20 | 4.441 odun · 2.220 taş | 983 g 15 sa | 98 g 8 sa |

### Değirmen (`degirmen`) — İşleme, max Lvl 20

- seviye × 5 işçi alır
- seviye başına +1 kültür puanı/gün

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 90 odun · 30 taş | 20 dk | 2 dk |
| 1 → 2 | 90 odun · 30 taş | 34 dk | 3 dk |
| 2 → 3 | 113 odun · 38 taş | 58 dk | 6 dk |
| 3 → 4 | 141 odun · 47 taş | 1 sa 38 dk | 10 dk |
| 4 → 5 | 176 odun · 59 taş | 2 sa 47 dk | 17 dk |
| 5 → 6 | 220 odun · 73 taş | 4 sa 44 dk | 28 dk |
| 6 → 7 | 275 odun · 92 taş | 8 sa 3 dk | 48 dk |
| 7 → 8 | 343 odun · 114 taş | 13 sa 41 dk | 1 sa 22 dk |
| 8 → 9 | 429 odun · 143 taş | 23 sa 15 dk | 2 sa 20 dk |
| 9 → 10 | 536 odun · 179 taş | 1 g 15 sa | 3 sa 57 dk |
| 10 → 11 | 671 odun · 224 taş | 2 g 19 sa | 6 sa 43 dk |
| 11 → 12 | 838 odun · 279 taş | 4 g 18 sa | 11 sa 25 dk |
| 12 → 13 | 1.048 odun · 349 taş | 8 g 2 sa | 19 sa 25 dk |
| 13 → 14 | 1.310 odun · 437 taş | 13 g 18 sa | 1 g 9 sa |
| 14 → 15 | 1.637 odun · 546 taş | 23 g 9 sa | 2 g 8 sa |
| 15 → 16 | 2.046 odun · 682 taş | 39 g 18 sa | 3 g 23 sa |
| 16 → 17 | 2.558 odun · 853 taş | 67 g 14 sa | 6 g 18 sa |
| 17 → 18 | 3.197 odun · 1.066 taş | 114 g 21 sa | 11 g 11 sa |
| 18 → 19 | 3.997 odun · 1.332 taş | 195 g 7 sa | 19 g 12 sa |
| 19 → 20 | 4.996 odun · 1.665 taş | 332 g 1 sa | 33 g 4 sa |

### Fırın (`firin`) — İşleme, max Lvl 20

- seviye × 5 işçi alır
- seviye başına +1 kültür puanı/gün

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 60 odun · 40 kil | 20 dk | 2 dk |
| 1 → 2 | 60 odun · 40 kil | 34 dk | 3 dk |
| 2 → 3 | 75 odun · 50 kil | 58 dk | 6 dk |
| 3 → 4 | 94 odun · 63 kil | 1 sa 38 dk | 10 dk |
| 4 → 5 | 117 odun · 78 kil | 2 sa 47 dk | 17 dk |
| 5 → 6 | 146 odun · 98 kil | 4 sa 44 dk | 28 dk |
| 6 → 7 | 183 odun · 122 kil | 8 sa 3 dk | 48 dk |
| 7 → 8 | 229 odun · 153 kil | 13 sa 41 dk | 1 sa 22 dk |
| 8 → 9 | 286 odun · 191 kil | 23 sa 15 dk | 2 sa 20 dk |
| 9 → 10 | 358 odun · 238 kil | 1 g 15 sa | 3 sa 57 dk |
| 10 → 11 | 447 odun · 298 kil | 2 g 19 sa | 6 sa 43 dk |
| 11 → 12 | 559 odun · 373 kil | 4 g 18 sa | 11 sa 25 dk |
| 12 → 13 | 698 odun · 466 kil | 8 g 2 sa | 19 sa 25 dk |
| 13 → 14 | 873 odun · 582 kil | 13 g 18 sa | 1 g 9 sa |
| 14 → 15 | 1.091 odun · 728 kil | 23 g 9 sa | 2 g 8 sa |
| 15 → 16 | 1.364 odun · 909 kil | 39 g 18 sa | 3 g 23 sa |
| 16 → 17 | 1.705 odun · 1.137 kil | 67 g 14 sa | 6 g 18 sa |
| 17 → 18 | 2.132 odun · 1.421 kil | 114 g 21 sa | 11 g 11 sa |
| 18 → 19 | 2.665 odun · 1.776 kil | 195 g 7 sa | 19 g 12 sa |
| 19 → 20 | 3.331 odun · 2.220 kil | 332 g 1 sa | 33 g 4 sa |

### Zırhçı (`zirh`) — Askerî, max Lvl 20

- seviye × 3 işçi alır
- seviye başına +1 kültür puanı/gün

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 45 kereste · 35 yontma taş · 35 külçe | 25 dk | 3 dk |
| 1 → 2 | 45 kereste · 35 yontma taş · 35 külçe | 45 dk | 5 dk |
| 2 → 3 | 72 kereste · 56 yontma taş · 56 külçe | 1 sa 21 dk | 8 dk |
| 3 → 4 | 115 kereste · 90 yontma taş · 90 külçe | 2 sa 26 dk | 15 dk |
| 4 → 5 | 184 kereste · 143 yontma taş · 143 külçe | 4 sa 22 dk | 26 dk |
| 5 → 6 | 295 kereste · 229 yontma taş · 229 külçe | 7 sa 52 dk | 47 dk |
| 6 → 7 | 472 kereste · 367 yontma taş · 367 külçe | 14 sa 10 dk | 1 sa 25 dk |
| 7 → 8 | 755 kereste · 587 yontma taş · 587 külçe | 1 g 1 sa | 2 sa 33 dk |
| 8 → 9 | 1.208 kereste · 940 yontma taş · 940 külçe | 1 g 21 sa | 4 sa 35 dk |
| 9 → 10 | 1.933 kereste · 1.503 yontma taş · 1.503 külçe | 3 g 10 sa | 8 sa 16 dk |
| 10 → 11 | 3.092 kereste · 2.405 yontma taş · 2.405 külçe | 6 g 4 sa | 14 sa 53 dk |
| 11 → 12 | 4.948 kereste · 3.848 yontma taş · 3.848 külçe | 11 g 3 sa | 1 g 2 sa |
| 12 → 13 | 7.916 kereste · 6.157 yontma taş · 6.157 külçe | 20 g 2 sa | 2 g |
| 13 → 14 | 12.666 kereste · 9.852 yontma taş · 9.852 külçe | 36 g 3 sa | 3 g 14 sa |
| 14 → 15 | 20.266 kereste · 15.763 yontma taş · 15.763 külçe | 65 g 1 sa | 6 g 12 sa |
| 15 → 16 | 32.426 kereste · 25.220 yontma taş · 25.220 külçe | 117 g 3 sa | 11 g 17 sa |
| 16 → 17 | 51.881 kereste · 40.352 yontma taş · 40.352 külçe | 210 g 19 sa | 21 g 2 sa |
| 17 → 18 | 83.010 kereste · 64.564 yontma taş · 64.564 külçe | 379 g 11 sa | 37 g 22 sa |
| 18 → 19 | 132.817 kereste · 103.302 yontma taş · 103.302 külçe | 683 g 2 sa | 68 g 7 sa |
| 19 → 20 | 212.506 kereste · 165.283 yontma taş · 165.283 külçe | 1229 g 13 sa | 122 g 22 sa |

### Silahçı (`silahci`) — Askerî, max Lvl 20

- seviye × 3 işçi alır
- seviye başına +1 kültür puanı/gün

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 45 kereste · 35 yontma taş · 35 külçe | 25 dk | 3 dk |
| 1 → 2 | 45 kereste · 35 yontma taş · 35 külçe | 45 dk | 5 dk |
| 2 → 3 | 72 kereste · 56 yontma taş · 56 külçe | 1 sa 21 dk | 8 dk |
| 3 → 4 | 115 kereste · 90 yontma taş · 90 külçe | 2 sa 26 dk | 15 dk |
| 4 → 5 | 184 kereste · 143 yontma taş · 143 külçe | 4 sa 22 dk | 26 dk |
| 5 → 6 | 295 kereste · 229 yontma taş · 229 külçe | 7 sa 52 dk | 47 dk |
| 6 → 7 | 472 kereste · 367 yontma taş · 367 külçe | 14 sa 10 dk | 1 sa 25 dk |
| 7 → 8 | 755 kereste · 587 yontma taş · 587 külçe | 1 g 1 sa | 2 sa 33 dk |
| 8 → 9 | 1.208 kereste · 940 yontma taş · 940 külçe | 1 g 21 sa | 4 sa 35 dk |
| 9 → 10 | 1.933 kereste · 1.503 yontma taş · 1.503 külçe | 3 g 10 sa | 8 sa 16 dk |
| 10 → 11 | 3.092 kereste · 2.405 yontma taş · 2.405 külçe | 6 g 4 sa | 14 sa 53 dk |
| 11 → 12 | 4.948 kereste · 3.848 yontma taş · 3.848 külçe | 11 g 3 sa | 1 g 2 sa |
| 12 → 13 | 7.916 kereste · 6.157 yontma taş · 6.157 külçe | 20 g 2 sa | 2 g |
| 13 → 14 | 12.666 kereste · 9.852 yontma taş · 9.852 külçe | 36 g 3 sa | 3 g 14 sa |
| 14 → 15 | 20.266 kereste · 15.763 yontma taş · 15.763 külçe | 65 g 1 sa | 6 g 12 sa |
| 15 → 16 | 32.426 kereste · 25.220 yontma taş · 25.220 külçe | 117 g 3 sa | 11 g 17 sa |
| 16 → 17 | 51.881 kereste · 40.352 yontma taş · 40.352 külçe | 210 g 19 sa | 21 g 2 sa |
| 17 → 18 | 83.010 kereste · 64.564 yontma taş · 64.564 külçe | 379 g 11 sa | 37 g 22 sa |
| 18 → 19 | 132.817 kereste · 103.302 yontma taş · 103.302 külçe | 683 g 2 sa | 68 g 7 sa |
| 19 → 20 | 212.506 kereste · 165.283 yontma taş · 165.283 külçe | 1229 g 13 sa | 122 g 22 sa |

### Ahır (`ahir`) — Askerî, max Lvl 20

- seviye × 3 işçi alır
- seviye başına +1 kültür puanı/gün
- at kapasitesi seviye × 5

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 60 kereste · 60 tahıl | 35 dk | 4 dk |
| 1 → 2 | 60 kereste · 60 tahıl | 1 sa 7 dk | 7 dk |
| 2 → 3 | 102 kereste · 102 tahıl | 2 sa 6 dk | 13 dk |
| 3 → 4 | 173 kereste · 173 tahıl | 4 sa | 24 dk |
| 4 → 5 | 295 kereste · 295 tahıl | 7 sa 36 dk | 46 dk |
| 5 → 6 | 501 kereste · 501 tahıl | 14 sa 27 dk | 1 sa 27 dk |
| 6 → 7 | 852 kereste · 852 tahıl | 1 g 3 sa | 2 sa 45 dk |
| 7 → 8 | 1.448 kereste · 1.448 tahıl | 2 g 4 sa | 5 sa 13 dk |
| 8 → 9 | 2.462 kereste · 2.462 tahıl | 4 g 3 sa | 9 sa 54 dk |
| 9 → 10 | 4.185 kereste · 4.185 tahıl | 7 g 20 sa | 18 sa 49 dk |
| 10 → 11 | 7.115 kereste · 7.115 tahıl | 14 g 21 sa | 1 g 11 sa |
| 11 → 12 | 12.096 kereste · 12.096 tahıl | 28 g 7 sa | 2 g 19 sa |
| 12 → 13 | 20.563 kereste · 20.563 tahıl | 53 g 19 sa | 5 g 9 sa |
| 13 → 14 | 34.957 kereste · 34.957 tahıl | 102 g 5 sa | 10 g 5 sa |
| 14 → 15 | 59.427 kereste · 59.427 tahıl | 194 g 4 sa | 19 g 10 sa |
| 15 → 16 | 101.027 kereste · 101.027 tahıl | 368 g 23 sa | 36 g 21 sa |
| 16 → 17 | 171.745 kereste · 171.745 tahıl | 701 g 1 sa | 70 g 2 sa |
| 17 → 18 | 291.967 kereste · 291.967 tahıl | 1332 g | 133 g 4 sa |
| 18 → 19 | 496.344 kereste · 496.344 tahıl | 2530 g 20 sa | 253 g 2 sa |
| 19 → 20 | 843.785 kereste · 843.785 tahıl | 4808 g 15 sa | 480 g 20 sa |

### Rún Salonu (`runSalonu`) — Askerî, max Lvl 10

- seviye × 3 işçi alır
- seviye başına +2 kültür puanı/gün

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 85 kereste · 110 yontma taş · 75 külçe | 40 dk | 4 dk |
| 1 → 2 | 85 kereste · 110 yontma taş · 75 külçe | 1 sa 16 dk | 8 dk |
| 2 → 3 | 145 kereste · 187 yontma taş · 128 külçe | 2 sa 24 dk | 14 dk |
| 3 → 4 | 246 kereste · 318 yontma taş · 217 külçe | 4 sa 34 dk | 27 dk |
| 4 → 5 | 418 kereste · 540 yontma taş · 368 külçe | 8 sa 41 dk | 52 dk |
| 5 → 6 | 710 kereste · 919 yontma taş · 626 külçe | 16 sa 30 dk | 1 sa 39 dk |
| 6 → 7 | 1.207 kereste · 1.562 yontma taş · 1.065 külçe | 1 g 7 sa | 3 sa 8 dk |
| 7 → 8 | 2.052 kereste · 2.655 yontma taş · 1.810 külçe | 2 g 11 sa | 5 sa 58 dk |
| 8 → 9 | 3.488 kereste · 4.514 yontma taş · 3.078 külçe | 4 g 17 sa | 11 sa 19 dk |
| 9 → 10 | 5.929 kereste · 7.673 yontma taş · 5.232 külçe | 8 g 23 sa | 21 sa 31 dk |

### Kışla (`kisla`) — Askerî, max Lvl 20

- seviye × 3 işçi alır
- seviye başına +1 kültür puanı/gün

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 60 kereste · 70 yontma taş | 35 dk | 4 dk |
| 1 → 2 | 60 kereste · 70 yontma taş | 1 sa 7 dk | 7 dk |
| 2 → 3 | 102 kereste · 119 yontma taş | 2 sa 6 dk | 13 dk |
| 3 → 4 | 173 kereste · 202 yontma taş | 4 sa | 24 dk |
| 4 → 5 | 295 kereste · 344 yontma taş | 7 sa 36 dk | 46 dk |
| 5 → 6 | 501 kereste · 585 yontma taş | 14 sa 27 dk | 1 sa 27 dk |
| 6 → 7 | 852 kereste · 994 yontma taş | 1 g 3 sa | 2 sa 45 dk |
| 7 → 8 | 1.448 kereste · 1.690 yontma taş | 2 g 4 sa | 5 sa 13 dk |
| 8 → 9 | 2.462 kereste · 2.872 yontma taş | 4 g 3 sa | 9 sa 54 dk |
| 9 → 10 | 4.185 kereste · 4.883 yontma taş | 7 g 20 sa | 18 sa 49 dk |
| 10 → 11 | 7.115 kereste · 8.301 yontma taş | 14 g 21 sa | 1 g 11 sa |
| 11 → 12 | 12.096 kereste · 14.112 yontma taş | 28 g 7 sa | 2 g 19 sa |
| 12 → 13 | 20.563 kereste · 23.990 yontma taş | 53 g 19 sa | 5 g 9 sa |
| 13 → 14 | 34.957 kereste · 40.784 yontma taş | 102 g 5 sa | 10 g 5 sa |
| 14 → 15 | 59.427 kereste · 69.332 yontma taş | 194 g 4 sa | 19 g 10 sa |
| 15 → 16 | 101.027 kereste · 117.864 yontma taş | 368 g 23 sa | 36 g 21 sa |
| 16 → 17 | 171.745 kereste · 200.370 yontma taş | 701 g 1 sa | 70 g 2 sa |
| 17 → 18 | 291.967 kereste · 340.628 yontma taş | 1332 g | 133 g 4 sa |
| 18 → 19 | 496.344 kereste · 579.068 yontma taş | 2530 g 20 sa | 253 g 2 sa |
| 19 → 20 | 843.785 kereste · 984.416 yontma taş | 4808 g 15 sa | 480 g 20 sa |

### Atölye (`atolye`) — Askerî, max Lvl 20

- seviye × 3 işçi alır
- seviye başına +1 kültür puanı/gün
- kuşatma kapasitesi seviye × 5

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 75 kereste · 75 külçe | 30 dk | 3 dk |
| 1 → 2 | 75 kereste · 75 külçe | 57 dk | 6 dk |
| 2 → 3 | 128 kereste · 128 külçe | 1 sa 48 dk | 11 dk |
| 3 → 4 | 217 kereste · 217 külçe | 3 sa 26 dk | 21 dk |
| 4 → 5 | 368 kereste · 368 külçe | 6 sa 31 dk | 39 dk |
| 5 → 6 | 626 kereste · 626 külçe | 12 sa 23 dk | 1 sa 14 dk |
| 6 → 7 | 1.065 kereste · 1.065 külçe | 23 sa 31 dk | 2 sa 21 dk |
| 7 → 8 | 1.810 kereste · 1.810 külçe | 1 g 20 sa | 4 sa 28 dk |
| 8 → 9 | 3.078 kereste · 3.078 külçe | 3 g 12 sa | 8 sa 30 dk |
| 9 → 10 | 5.232 kereste · 5.232 külçe | 6 g 17 sa | 16 sa 8 dk |
| 10 → 11 | 8.894 kereste · 8.894 külçe | 12 g 18 sa | 1 g 6 sa |
| 11 → 12 | 15.120 kereste · 15.120 külçe | 24 g 6 sa | 2 g 10 sa |
| 12 → 13 | 25.704 kereste · 25.704 külçe | 46 g 2 sa | 4 g 14 sa |
| 13 → 14 | 43.697 kereste · 43.697 külçe | 87 g 14 sa | 8 g 18 sa |
| 14 → 15 | 74.284 kereste · 74.284 külçe | 166 g 11 sa | 16 g 15 sa |
| 15 → 16 | 126.283 kereste · 126.283 külçe | 316 g 6 sa | 31 g 15 sa |
| 16 → 17 | 214.682 kereste · 214.682 külçe | 600 g 22 sa | 60 g 2 sa |
| 17 → 18 | 364.959 kereste · 364.959 külçe | 1141 g 17 sa | 114 g 4 sa |
| 18 → 19 | 620.430 kereste · 620.430 külçe | 2169 g 7 sa | 216 g 22 sa |
| 19 → 20 | 1.054.731 kereste · 1.054.731 külçe | 4121 g 16 sa | 412 g 4 sa |

### Cephanelik (`cephane`) — Askerî, max Lvl 20

- seviye başına +1 kültür puanı/gün
- ekipman havuzu seviye × 200

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 60 kereste · 70 yontma taş · 35 külçe | 30 dk | 3 dk |
| 1 → 2 | 60 kereste · 70 yontma taş · 35 külçe | 54 dk | 5 dk |
| 2 → 3 | 96 kereste · 112 yontma taş · 56 külçe | 1 sa 37 dk | 10 dk |
| 3 → 4 | 154 kereste · 179 yontma taş · 90 külçe | 2 sa 55 dk | 17 dk |
| 4 → 5 | 246 kereste · 287 yontma taş · 143 külçe | 5 sa 15 dk | 31 dk |
| 5 → 6 | 393 kereste · 459 yontma taş · 229 külçe | 9 sa 27 dk | 57 dk |
| 6 → 7 | 629 kereste · 734 yontma taş · 367 külçe | 17 sa | 1 sa 42 dk |
| 7 → 8 | 1.007 kereste · 1.174 yontma taş · 587 külçe | 1 g 6 sa | 3 sa 4 dk |
| 8 → 9 | 1.611 kereste · 1.879 yontma taş · 940 külçe | 2 g 7 sa | 5 sa 31 dk |
| 9 → 10 | 2.577 kereste · 3.006 yontma taş · 1.503 külçe | 4 g 3 sa | 9 sa 55 dk |
| 10 → 11 | 4.123 kereste · 4.810 yontma taş · 2.405 külçe | 7 g 10 sa | 17 sa 51 dk |
| 11 → 12 | 6.597 kereste · 7.697 yontma taş · 3.848 külçe | 13 g 9 sa | 1 g 8 sa |
| 12 → 13 | 10.555 kereste · 12.315 yontma taş · 6.157 külçe | 24 g 2 sa | 2 g 9 sa |
| 13 → 14 | 16.888 kereste · 19.703 yontma taş · 9.852 külçe | 43 g 9 sa | 4 g 8 sa |
| 14 → 15 | 27.022 kereste · 31.525 yontma taş · 15.763 külçe | 78 g 2 sa | 7 g 19 sa |
| 15 → 16 | 43.235 kereste · 50.440 yontma taş · 25.220 külçe | 140 g 13 sa | 14 g 1 sa |
| 16 → 17 | 69.175 kereste · 80.705 yontma taş · 40.352 külçe | 252 g 23 sa | 25 g 7 sa |
| 17 → 18 | 110.680 kereste · 129.127 yontma taş · 64.564 külçe | 455 g 9 sa | 45 g 12 sa |
| 18 → 19 | 177.089 kereste · 206.604 yontma taş · 103.302 külçe | 819 g 17 sa | 81 g 23 sa |
| 19 → 20 | 283.342 kereste · 330.566 yontma taş · 165.283 külçe | 1475 g 11 sa | 147 g 13 sa |

### Sağlık Çadırı (`saglikCadiri`) — Askerî, max Lvl 20

- seviye başına +1 kültür puanı/gün

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 35 kereste · 30 tahıl | 25 dk | 3 dk |
| 1 → 2 | 35 kereste · 30 tahıl | 43 dk | 4 dk |
| 2 → 3 | 44 kereste · 38 tahıl | 1 sa 12 dk | 7 dk |
| 3 → 4 | 55 kereste · 47 tahıl | 2 sa 3 dk | 12 dk |
| 4 → 5 | 68 kereste · 59 tahıl | 3 sa 29 dk | 21 dk |
| 5 → 6 | 85 kereste · 73 tahıl | 5 sa 55 dk | 35 dk |
| 6 → 7 | 107 kereste · 92 tahıl | 10 sa 3 dk | 1 sa |
| 7 → 8 | 134 kereste · 114 tahıl | 17 sa 6 dk | 1 sa 43 dk |
| 8 → 9 | 167 kereste · 143 tahıl | 1 g 5 sa | 2 sa 54 dk |
| 9 → 10 | 209 kereste · 179 tahıl | 2 g 1 sa | 4 sa 56 dk |
| 10 → 11 | 261 kereste · 224 tahıl | 3 g 12 sa | 8 sa 24 dk |
| 11 → 12 | 326 kereste · 279 tahıl | 5 g 22 sa | 14 sa 17 dk |
| 12 → 13 | 407 kereste · 349 tahıl | 10 g 2 sa | 1 g |
| 13 → 14 | 509 kereste · 437 tahıl | 17 g 4 sa | 1 g 17 sa |
| 14 → 15 | 637 kereste · 546 tahıl | 29 g 5 sa | 2 g 22 sa |
| 15 → 16 | 796 kereste · 682 tahıl | 49 g 16 sa | 4 g 23 sa |
| 16 → 17 | 995 kereste · 853 tahıl | 84 g 11 sa | 8 g 10 sa |
| 17 → 18 | 1.243 kereste · 1.066 tahıl | 143 g 14 sa | 14 g 8 sa |
| 18 → 19 | 1.554 kereste · 1.332 tahıl | 244 g 3 sa | 24 g 9 sa |
| 19 → 20 | 1.943 kereste · 1.665 tahıl | 415 g 1 sa | 41 g 12 sa |

### Kahraman Konağı (`kahramanKonagi`) — Askerî, max Lvl 20

- seviye × 1 işçi alır
- seviye başına +2 kültür puanı/gün

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 70 kereste · 90 yontma taş · 50 külçe | 35 dk | 4 dk |
| 1 → 2 | 70 kereste · 90 yontma taş · 50 külçe | 1 sa 5 dk | 6 dk |
| 2 → 3 | 119 kereste · 153 yontma taş · 85 külçe | 2 sa | 12 dk |
| 3 → 4 | 202 kereste · 260 yontma taş · 144 külçe | 3 sa 42 dk | 22 dk |
| 4 → 5 | 344 kereste · 442 yontma taş · 246 külçe | 6 sa 50 dk | 41 dk |
| 5 → 6 | 585 kereste · 752 yontma taş · 418 külçe | 12 sa 38 dk | 1 sa 16 dk |
| 6 → 7 | 994 kereste · 1.278 yontma taş · 710 külçe | 23 sa 23 dk | 2 sa 20 dk |
| 7 → 8 | 1.690 kereste · 2.172 yontma taş · 1.207 külçe | 1 g 19 sa | 4 sa 20 dk |
| 8 → 9 | 2.872 kereste · 3.693 yontma taş · 2.052 külçe | 3 g 8 sa | 8 sa |
| 9 → 10 | 4.883 kereste · 6.278 yontma taş · 3.488 külçe | 6 g 4 sa | 14 sa 48 dk |
| 10 → 11 | 8.301 kereste · 10.673 yontma taş · 5.929 külçe | 11 g 9 sa | 1 g 3 sa |
| 11 → 12 | 14.112 kereste · 18.144 yontma taş · 10.080 külçe | 21 g 2 sa | 2 g 2 sa |
| 12 → 13 | 23.990 kereste · 30.845 yontma taş · 17.136 külçe | 39 g 1 sa | 3 g 21 sa |
| 13 → 14 | 40.784 kereste · 52.436 yontma taş · 29.131 külçe | 72 g 6 sa | 7 g 5 sa |
| 14 → 15 | 69.332 kereste · 89.141 yontma taş · 49.523 külçe | 133 g 16 sa | 13 g 8 sa |
| 15 → 16 | 117.864 kereste · 151.540 yontma taş · 84.189 külçe | 247 g 7 sa | 24 g 17 sa |
| 16 → 17 | 200.370 kereste · 257.618 yontma taş · 143.121 külçe | 457 g 13 sa | 45 g 18 sa |
| 17 → 18 | 340.628 kereste · 437.951 yontma taş · 243.306 külçe | 846 g 11 sa | 84 g 15 sa |
| 18 → 19 | 579.068 kereste · 744.516 yontma taş · 413.620 külçe | 1566 g | 156 g 14 sa |
| 19 → 20 | 984.416 kereste · 1.265.678 yontma taş · 703.154 külçe | 2897 g 3 sa | 289 g 17 sa |

### Hammadde Deposu (`hammaddeDepo`) — Depo, max Lvl 20

- seviye başına +1 kültür puanı/gün
- Lvl 1 depo +3.000, sonraki her seviye +1.500

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 60 kereste · 60 yontma taş · 45 tuğla | 30 dk | 3 dk |
| 1 → 2 | 60 kereste · 60 yontma taş · 45 tuğla | 54 dk | 5 dk |
| 2 → 3 | 75 kereste · 75 yontma taş · 56 tuğla | 1 sa 37 dk | 10 dk |
| 3 → 4 | 94 kereste · 94 yontma taş · 70 tuğla | 2 sa 55 dk | 17 dk |
| 4 → 5 | 117 kereste · 117 yontma taş · 88 tuğla | 5 sa 15 dk | 31 dk |
| 5 → 6 | 146 kereste · 146 yontma taş · 110 tuğla | 9 sa 27 dk | 57 dk |
| 6 → 7 | 183 kereste · 183 yontma taş · 137 tuğla | 17 sa | 1 sa 42 dk |
| 7 → 8 | 229 kereste · 229 yontma taş · 172 tuğla | 1 g 6 sa | 3 sa 4 dk |
| 8 → 9 | 286 kereste · 286 yontma taş · 215 tuğla | 2 g 7 sa | 5 sa 31 dk |
| 9 → 10 | 358 kereste · 358 yontma taş · 268 tuğla | 4 g 3 sa | 9 sa 55 dk |
| 10 → 11 | 447 kereste · 447 yontma taş · 335 tuğla | 7 g 10 sa | 17 sa 51 dk |
| 11 → 12 | 559 kereste · 559 yontma taş · 419 tuğla | 13 g 9 sa | 1 g 8 sa |
| 12 → 13 | 698 kereste · 698 yontma taş · 524 tuğla | 24 g 2 sa | 2 g 9 sa |
| 13 → 14 | 873 kereste · 873 yontma taş · 655 tuğla | 43 g 9 sa | 4 g 8 sa |
| 14 → 15 | 1.091 kereste · 1.091 yontma taş · 819 tuğla | 78 g 2 sa | 7 g 19 sa |
| 15 → 16 | 1.364 kereste · 1.364 yontma taş · 1.023 tuğla | 140 g 13 sa | 14 g 1 sa |
| 16 → 17 | 1.705 kereste · 1.705 yontma taş · 1.279 tuğla | 252 g 23 sa | 25 g 7 sa |
| 17 → 18 | 2.132 kereste · 2.132 yontma taş · 1.599 tuğla | 455 g 9 sa | 45 g 12 sa |
| 18 → 19 | 2.665 kereste · 2.665 yontma taş · 1.998 tuğla | 819 g 17 sa | 81 g 23 sa |
| 19 → 20 | 3.331 kereste · 3.331 yontma taş · 2.498 tuğla | 1475 g 11 sa | 147 g 13 sa |

### İşlenmiş Mal Deposu (`islenmisMalDepo`) — Depo, max Lvl 20

- seviye başına +1 kültür puanı/gün
- Lvl 1 depo +2.400, sonraki her seviye +1.200

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 50 kereste · 60 yontma taş · 60 tuğla | 30 dk | 3 dk |
| 1 → 2 | 50 kereste · 60 yontma taş · 60 tuğla | 54 dk | 5 dk |
| 2 → 3 | 63 kereste · 75 yontma taş · 75 tuğla | 1 sa 37 dk | 10 dk |
| 3 → 4 | 78 kereste · 94 yontma taş · 94 tuğla | 2 sa 55 dk | 17 dk |
| 4 → 5 | 98 kereste · 117 yontma taş · 117 tuğla | 5 sa 15 dk | 31 dk |
| 5 → 6 | 122 kereste · 146 yontma taş · 146 tuğla | 9 sa 27 dk | 57 dk |
| 6 → 7 | 153 kereste · 183 yontma taş · 183 tuğla | 17 sa | 1 sa 42 dk |
| 7 → 8 | 191 kereste · 229 yontma taş · 229 tuğla | 1 g 6 sa | 3 sa 4 dk |
| 8 → 9 | 238 kereste · 286 yontma taş · 286 tuğla | 2 g 7 sa | 5 sa 31 dk |
| 9 → 10 | 298 kereste · 358 yontma taş · 358 tuğla | 4 g 3 sa | 9 sa 55 dk |
| 10 → 11 | 373 kereste · 447 yontma taş · 447 tuğla | 7 g 10 sa | 17 sa 51 dk |
| 11 → 12 | 466 kereste · 559 yontma taş · 559 tuğla | 13 g 9 sa | 1 g 8 sa |
| 12 → 13 | 582 kereste · 698 yontma taş · 698 tuğla | 24 g 2 sa | 2 g 9 sa |
| 13 → 14 | 728 kereste · 873 yontma taş · 873 tuğla | 43 g 9 sa | 4 g 8 sa |
| 14 → 15 | 909 kereste · 1.091 yontma taş · 1.091 tuğla | 78 g 2 sa | 7 g 19 sa |
| 15 → 16 | 1.137 kereste · 1.364 yontma taş · 1.364 tuğla | 140 g 13 sa | 14 g 1 sa |
| 16 → 17 | 1.421 kereste · 1.705 yontma taş · 1.705 tuğla | 252 g 23 sa | 25 g 7 sa |
| 17 → 18 | 1.776 kereste · 2.132 yontma taş · 2.132 tuğla | 455 g 9 sa | 45 g 12 sa |
| 18 → 19 | 2.220 kereste · 2.665 yontma taş · 2.665 tuğla | 819 g 17 sa | 81 g 23 sa |
| 19 → 20 | 2.776 kereste · 3.331 yontma taş · 3.331 tuğla | 1475 g 11 sa | 147 g 13 sa |

### Tahıl Ambarı (`tahilAmbar`) — Depo, max Lvl 20

- seviye başına +1 kültür puanı/gün
- Lvl 1 depo +12.000, sonraki her seviye +6.000

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 50 kereste · 45 yontma taş | 25 dk | 3 dk |
| 1 → 2 | 50 kereste · 45 yontma taş | 43 dk | 4 dk |
| 2 → 3 | 63 kereste · 56 yontma taş | 1 sa 12 dk | 7 dk |
| 3 → 4 | 78 kereste · 70 yontma taş | 2 sa 3 dk | 12 dk |
| 4 → 5 | 98 kereste · 88 yontma taş | 3 sa 29 dk | 21 dk |
| 5 → 6 | 122 kereste · 110 yontma taş | 5 sa 55 dk | 35 dk |
| 6 → 7 | 153 kereste · 137 yontma taş | 10 sa 3 dk | 1 sa |
| 7 → 8 | 191 kereste · 172 yontma taş | 17 sa 6 dk | 1 sa 43 dk |
| 8 → 9 | 238 kereste · 215 yontma taş | 1 g 5 sa | 2 sa 54 dk |
| 9 → 10 | 298 kereste · 268 yontma taş | 2 g 1 sa | 4 sa 56 dk |
| 10 → 11 | 373 kereste · 335 yontma taş | 3 g 12 sa | 8 sa 24 dk |
| 11 → 12 | 466 kereste · 419 yontma taş | 5 g 22 sa | 14 sa 17 dk |
| 12 → 13 | 582 kereste · 524 yontma taş | 10 g 2 sa | 1 g |
| 13 → 14 | 728 kereste · 655 yontma taş | 17 g 4 sa | 1 g 17 sa |
| 14 → 15 | 909 kereste · 819 yontma taş | 29 g 5 sa | 2 g 22 sa |
| 15 → 16 | 1.137 kereste · 1.023 yontma taş | 49 g 16 sa | 4 g 23 sa |
| 16 → 17 | 1.421 kereste · 1.279 yontma taş | 84 g 11 sa | 8 g 10 sa |
| 17 → 18 | 1.776 kereste · 1.599 yontma taş | 143 g 14 sa | 14 g 8 sa |
| 18 → 19 | 2.220 kereste · 1.998 yontma taş | 244 g 3 sa | 24 g 9 sa |
| 19 → 20 | 2.776 kereste · 2.498 yontma taş | 415 g 1 sa | 41 g 12 sa |

### Erzak Ambarı (`granary`) — Depo, max Lvl 20

- seviye başına +1 kültür puanı/gün
- Lvl 1 depo +2.500, sonraki her seviye +1.250

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 50 kereste · 75 tuğla | 25 dk | 3 dk |
| 1 → 2 | 50 kereste · 75 tuğla | 43 dk | 4 dk |
| 2 → 3 | 63 kereste · 94 tuğla | 1 sa 12 dk | 7 dk |
| 3 → 4 | 78 kereste · 117 tuğla | 2 sa 3 dk | 12 dk |
| 4 → 5 | 98 kereste · 146 tuğla | 3 sa 29 dk | 21 dk |
| 5 → 6 | 122 kereste · 183 tuğla | 5 sa 55 dk | 35 dk |
| 6 → 7 | 153 kereste · 229 tuğla | 10 sa 3 dk | 1 sa |
| 7 → 8 | 191 kereste · 286 tuğla | 17 sa 6 dk | 1 sa 43 dk |
| 8 → 9 | 238 kereste · 358 tuğla | 1 g 5 sa | 2 sa 54 dk |
| 9 → 10 | 298 kereste · 447 tuğla | 2 g 1 sa | 4 sa 56 dk |
| 10 → 11 | 373 kereste · 559 tuğla | 3 g 12 sa | 8 sa 24 dk |
| 11 → 12 | 466 kereste · 698 tuğla | 5 g 22 sa | 14 sa 17 dk |
| 12 → 13 | 582 kereste · 873 tuğla | 10 g 2 sa | 1 g |
| 13 → 14 | 728 kereste · 1.091 tuğla | 17 g 4 sa | 1 g 17 sa |
| 14 → 15 | 909 kereste · 1.364 tuğla | 29 g 5 sa | 2 g 22 sa |
| 15 → 16 | 1.137 kereste · 1.705 tuğla | 49 g 16 sa | 4 g 23 sa |
| 16 → 17 | 1.421 kereste · 2.132 tuğla | 84 g 11 sa | 8 g 10 sa |
| 17 → 18 | 1.776 kereste · 2.665 tuğla | 143 g 14 sa | 14 g 8 sa |
| 18 → 19 | 2.220 kereste · 3.331 tuğla | 244 g 3 sa | 24 g 9 sa |
| 19 → 20 | 2.776 kereste · 4.163 tuğla | 415 g 1 sa | 41 g 12 sa |

### Pazar (`pazar`) — Ekonomik, max Lvl 20

- seviye başına +2 kültür puanı/gün

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 60 kereste · 95 yontma taş | 40 dk | 4 dk |
| 1 → 2 | 60 kereste · 95 yontma taş | 1 sa 12 dk | 7 dk |
| 2 → 3 | 75 kereste · 119 yontma taş | 2 sa 10 dk | 13 dk |
| 3 → 4 | 94 kereste · 148 yontma taş | 3 sa 53 dk | 23 dk |
| 4 → 5 | 117 kereste · 186 yontma taş | 7 sa | 42 dk |
| 5 → 6 | 146 kereste · 232 yontma taş | 12 sa 36 dk | 1 sa 16 dk |
| 6 → 7 | 183 kereste · 290 yontma taş | 22 sa 40 dk | 2 sa 16 dk |
| 7 → 8 | 229 kereste · 362 yontma taş | 1 g 16 sa | 4 sa 5 dk |
| 8 → 9 | 286 kereste · 453 yontma taş | 3 g 1 sa | 7 sa 21 dk |
| 9 → 10 | 358 kereste · 566 yontma taş | 5 g 12 sa | 13 sa 13 dk |
| 10 → 11 | 447 kereste · 708 yontma taş | 9 g 22 sa | 23 sa 48 dk |
| 11 → 12 | 559 kereste · 885 yontma taş | 17 g 20 sa | 1 g 18 sa |
| 12 → 13 | 698 kereste · 1.106 yontma taş | 32 g 3 sa | 3 g 5 sa |
| 13 → 14 | 873 kereste · 1.382 yontma taş | 57 g 20 sa | 5 g 18 sa |
| 14 → 15 | 1.091 kereste · 1.728 yontma taş | 104 g 2 sa | 10 g 9 sa |
| 15 → 16 | 1.364 kereste · 2.160 yontma taş | 187 g 9 sa | 18 g 17 sa |
| 16 → 17 | 1.705 kereste · 2.700 yontma taş | 337 g 7 sa | 33 g 17 sa |
| 17 → 18 | 2.132 kereste · 3.375 yontma taş | 607 g 4 sa | 60 g 17 sa |
| 18 → 19 | 2.665 kereste · 4.219 yontma taş | 1092 g 22 sa | 109 g 7 sa |
| 19 → 20 | 3.331 kereste · 5.274 yontma taş | 1967 g 7 sa | 196 g 17 sa |

### Demirciler Loncası (`loncaDemir`) — Ekonomik, max Lvl 5

- seviye başına +2 kültür puanı/gün
- seviye başına +%5 (demir)

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 50 kereste · 90 külçe | 30 dk | 3 dk |
| 1 → 2 | 50 kereste · 90 külçe | 1 sa | 6 dk |
| 2 → 3 | 63 kereste · 113 külçe | 2 sa | 12 dk |
| 3 → 4 | 78 kereste · 141 külçe | 4 sa | 24 dk |
| 4 → 5 | 98 kereste · 176 külçe | 8 sa | 48 dk |

### Oduncular Loncası (`loncaOdun`) — Ekonomik, max Lvl 5

- seviye başına +2 kültür puanı/gün
- seviye başına +%5 (odun)

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 60 kereste · 45 yontma taş | 30 dk | 3 dk |
| 1 → 2 | 60 kereste · 45 yontma taş | 1 sa | 6 dk |
| 2 → 3 | 75 kereste · 56 yontma taş | 2 sa | 12 dk |
| 3 → 4 | 94 kereste · 70 yontma taş | 4 sa | 24 dk |
| 4 → 5 | 117 kereste · 88 yontma taş | 8 sa | 48 dk |

### Taşçılar Loncası (`loncaTas`) — Ekonomik, max Lvl 5

- seviye başına +2 kültür puanı/gün
- seviye başına +%5 (taş)

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 50 kereste · 70 yontma taş | 30 dk | 3 dk |
| 1 → 2 | 50 kereste · 70 yontma taş | 1 sa | 6 dk |
| 2 → 3 | 63 kereste · 88 yontma taş | 2 sa | 12 dk |
| 3 → 4 | 78 kereste · 109 yontma taş | 4 sa | 24 dk |
| 4 → 5 | 98 kereste · 137 yontma taş | 8 sa | 48 dk |

### Kilciler Loncası (`loncaKil`) — Ekonomik, max Lvl 5

- seviye başına +2 kültür puanı/gün
- seviye başına +%5 (kil)

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 50 kereste · 90 tuğla | 30 dk | 3 dk |
| 1 → 2 | 50 kereste · 90 tuğla | 1 sa | 6 dk |
| 2 → 3 | 63 kereste · 113 tuğla | 2 sa | 12 dk |
| 3 → 4 | 78 kereste · 141 tuğla | 4 sa | 24 dk |
| 4 → 5 | 98 kereste · 176 tuğla | 8 sa | 48 dk |

### Tahılcılar Loncası (`loncaTahil`) — Ekonomik, max Lvl 5

- seviye başına +2 kültür puanı/gün
- seviye başına +%5 (tahıl)

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 50 kereste · 60 tahıl | 30 dk | 3 dk |
| 1 → 2 | 50 kereste · 60 tahıl | 1 sa | 6 dk |
| 2 → 3 | 63 kereste · 75 tahıl | 2 sa | 12 dk |
| 3 → 4 | 78 kereste · 94 tahıl | 4 sa | 24 dk |
| 4 → 5 | 98 kereste · 117 tahıl | 8 sa | 48 dk |

### Köşk (`kosk`) — Yönetim, max Lvl 20

- seviye başına +3 kültür puanı/gün
- Saray ile aynı köyde olamaz
- köy hakkı: Lvl 10, 20

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 75 kereste · 150 tuğla · 95 yontma taş · 75 külçe | 40 dk | 4 dk |
| 1 → 2 | 75 kereste · 150 tuğla · 95 yontma taş · 75 külçe | 1 sa 12 dk | 7 dk |
| 2 → 3 | 128 kereste · 255 tuğla · 162 yontma taş · 128 külçe | 2 sa 10 dk | 13 dk |
| 3 → 4 | 217 kereste · 433 tuğla · 275 yontma taş · 217 külçe | 3 sa 53 dk | 23 dk |
| 4 → 5 | 368 kereste · 737 tuğla · 467 yontma taş · 368 külçe | 7 sa | 42 dk |
| 5 → 6 | 626 kereste · 1.253 tuğla · 793 yontma taş · 626 külçe | 12 sa 36 dk | 1 sa 16 dk |
| 6 → 7 | 1.065 kereste · 2.130 tuğla · 1.349 yontma taş · 1.065 külçe | 22 sa 40 dk | 2 sa 16 dk |
| 7 → 8 | 1.810 kereste · 3.621 tuğla · 2.293 yontma taş · 1.810 külçe | 1 g 16 sa | 4 sa 5 dk |
| 8 → 9 | 3.078 kereste · 6.155 tuğla · 3.898 yontma taş · 3.078 külçe | 3 g 1 sa | 7 sa 21 dk |
| 9 → 10 | 5.232 kereste · 10.464 tuğla · 6.627 yontma taş · 5.232 külçe | 5 g 12 sa | 13 sa 13 dk |
| 10 → 11 | 8.894 kereste · 17.788 tuğla · 11.266 yontma taş · 8.894 külçe | 9 g 22 sa | 23 sa 48 dk |
| 11 → 12 | 15.120 kereste · 30.240 tuğla · 19.152 yontma taş · 15.120 külçe | 17 g 20 sa | 1 g 18 sa |
| 12 → 13 | 25.704 kereste · 51.408 tuğla · 32.558 yontma taş · 25.704 külçe | 32 g 3 sa | 3 g 5 sa |
| 13 → 14 | 43.697 kereste · 87.393 tuğla · 55.349 yontma taş · 43.697 külçe | 57 g 20 sa | 5 g 18 sa |
| 14 → 15 | 74.284 kereste · 148.569 tuğla · 94.093 yontma taş · 74.284 külçe | 104 g 2 sa | 10 g 9 sa |
| 15 → 16 | 126.283 kereste · 252.567 tuğla · 159.959 yontma taş · 126.283 külçe | 187 g 9 sa | 18 g 17 sa |
| 16 → 17 | 214.682 kereste · 429.363 tuğla · 271.930 yontma taş · 214.682 külçe | 337 g 7 sa | 33 g 17 sa |
| 17 → 18 | 364.959 kereste · 729.918 tuğla · 462.281 yontma taş · 364.959 külçe | 607 g 4 sa | 60 g 17 sa |
| 18 → 19 | 620.430 kereste · 1.240.860 tuğla · 785.878 yontma taş · 620.430 külçe | 1092 g 22 sa | 109 g 7 sa |
| 19 → 20 | 1.054.731 kereste · 2.109.463 tuğla · 1.335.993 yontma taş · 1.054.731 külçe | 1967 g 7 sa | 196 g 17 sa |

### Saray (`saray`) — Yönetim, max Lvl 20

- seviye başına +4 kültür puanı/gün
- oyuncu başına TEK
- Köşk ile aynı köyde olamaz
- köy hakkı: Lvl 10, 15, 20

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 120 kereste · 270 tuğla · 180 yontma taş · 180 külçe | 1 sa | 6 dk |
| 1 → 2 | 120 kereste · 270 tuğla · 180 yontma taş · 180 külçe | 1 sa 54 dk | 11 dk |
| 2 → 3 | 204 kereste · 459 tuğla · 306 yontma taş · 306 külçe | 3 sa 37 dk | 22 dk |
| 3 → 4 | 347 kereste · 780 tuğla · 520 yontma taş · 520 külçe | 6 sa 52 dk | 41 dk |
| 4 → 5 | 590 kereste · 1.327 tuğla · 884 yontma taş · 884 külçe | 13 sa 2 dk | 1 sa 18 dk |
| 5 → 6 | 1.002 kereste · 2.255 tuğla · 1.503 yontma taş · 1.503 külçe | 1 g | 2 sa 29 dk |
| 6 → 7 | 1.704 kereste · 3.834 tuğla · 2.556 yontma taş · 2.556 külçe | 1 g 23 sa | 4 sa 42 dk |
| 7 → 8 | 2.897 kereste · 6.517 tuğla · 4.345 yontma taş · 4.345 külçe | 3 g 17 sa | 8 sa 56 dk |
| 8 → 9 | 4.924 kereste · 11.079 tuğla · 7.386 yontma taş · 7.386 külçe | 7 g 1 sa | 16 sa 59 dk |
| 9 → 10 | 8.371 kereste · 18.835 tuğla · 12.556 yontma taş · 12.556 külçe | 13 g 10 sa | 1 g 8 sa |
| 10 → 11 | 14.231 kereste · 32.019 tuğla · 21.346 yontma taş · 21.346 külçe | 25 g 13 sa | 2 g 13 sa |
| 11 → 12 | 24.192 kereste · 54.432 tuğla · 36.288 yontma taş · 36.288 külçe | 48 g 12 sa | 4 g 20 sa |
| 12 → 13 | 41.126 kereste · 92.534 tuğla · 61.689 yontma taş · 61.689 külçe | 92 g 5 sa | 9 g 5 sa |
| 13 → 14 | 69.915 kereste · 157.308 tuğla · 104.872 yontma taş · 104.872 külçe | 175 g 5 sa | 17 g 12 sa |
| 14 → 15 | 118.855 kereste · 267.424 tuğla · 178.282 yontma taş · 178.282 külçe | 332 g 22 sa | 33 g 7 sa |
| 15 → 16 | 202.053 kereste · 454.620 tuğla · 303.080 yontma taş · 303.080 külçe | 632 g 13 sa | 63 g 6 sa |
| 16 → 17 | 343.491 kereste · 772.854 tuğla · 515.236 yontma taş · 515.236 külçe | 1201 g 20 sa | 120 g 4 sa |
| 17 → 18 | 583.934 kereste · 1.313.852 tuğla · 875.901 yontma taş · 875.901 külçe | 2283 g 11 sa | 228 g 8 sa |
| 18 → 19 | 992.688 kereste · 2.233.549 tuğla · 1.489.032 yontma taş · 1.489.032 külçe | 4338 g 15 sa | 433 g 20 sa |
| 19 → 20 | 1.687.570 kereste · 3.797.033 tuğla · 2.531.355 yontma taş · 2.531.355 külçe | 8243 g 9 sa | 824 g 8 sa |

### Taverna (`taverna`) — Yönetim, max Lvl 20

- seviye başına +3 kültür puanı/gün

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 95 kereste · 180 tuğla · 100 tahıl | 35 dk | 4 dk |
| 1 → 2 | 95 kereste · 180 tuğla · 100 tahıl | 1 sa | 6 dk |
| 2 → 3 | 152 kereste · 288 tuğla · 160 tahıl | 1 sa 41 dk | 10 dk |
| 3 → 4 | 243 kereste · 461 tuğla · 256 tahıl | 2 sa 52 dk | 17 dk |
| 4 → 5 | 389 kereste · 737 tuğla · 410 tahıl | 4 sa 52 dk | 29 dk |
| 5 → 6 | 623 kereste · 1.180 tuğla · 655 tahıl | 8 sa 17 dk | 50 dk |
| 6 → 7 | 996 kereste · 1.887 tuğla · 1.049 tahıl | 14 sa 5 dk | 1 sa 24 dk |
| 7 → 8 | 1.594 kereste · 3.020 tuğla · 1.678 tahıl | 23 sa 56 dk | 2 sa 24 dk |
| 8 → 9 | 2.550 kereste · 4.832 tuğla · 2.684 tahıl | 1 g 16 sa | 4 sa 4 dk |
| 9 → 10 | 4.080 kereste · 7.731 tuğla · 4.295 tahıl | 2 g 21 sa | 6 sa 55 dk |
| 10 → 11 | 6.528 kereste · 12.370 tuğla · 6.872 tahıl | 4 g 21 sa | 11 sa 46 dk |
| 11 → 12 | 10.445 kereste · 19.791 tuğla · 10.995 tahıl | 8 g 7 sa | 20 sa |
| 12 → 13 | 16.713 kereste · 31.666 tuğla · 17.592 tahıl | 14 g 3 sa | 1 g 9 sa |
| 13 → 14 | 26.740 kereste · 50.665 tuğla · 28.147 tahıl | 24 g 1 sa | 2 g 9 sa |
| 14 → 15 | 42.784 kereste · 81.065 tuğla · 45.036 tahıl | 40 g 22 sa | 4 g 2 sa |
| 15 → 16 | 68.455 kereste · 129.704 tuğla · 72.058 tahıl | 69 g 13 sa | 6 g 22 sa |
| 16 → 17 | 109.528 kereste · 207.526 tuğla · 115.292 tahıl | 118 g 6 sa | 11 g 19 sa |
| 17 → 18 | 175.244 kereste · 332.041 tuğla · 184.467 tahıl | 201 g 1 sa | 20 g 2 sa |
| 18 → 19 | 280.391 kereste · 531.266 tuğla · 295.148 tahıl | 341 g 19 sa | 34 g 4 sa |
| 19 → 20 | 448.625 kereste · 850.026 tuğla · 472.237 tahıl | 581 g 1 sa | 58 g 2 sa |

### Ev (`ev`) — Nüfus, max Lvl 5

- seviye başına +1 kültür puanı/gün
- seviye başına +100 nüfus tavanı

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 50 kereste · 75 tuğla | 15 dk | 2 dk |
| 1 → 2 | 50 kereste · 75 tuğla | 24 dk | 2 dk |
| 2 → 3 | 63 kereste · 94 tuğla | 38 dk | 4 dk |
| 3 → 4 | 78 kereste · 117 tuğla | 1 sa 1 dk | 6 dk |
| 4 → 5 | 98 kereste · 146 tuğla | 1 sa 38 dk | 10 dk |

### Sur (`sur`) — Savunma, max Lvl 20

- seviye başına +1 kültür puanı/gün

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 190 yontma taş · 25 kereste | 50 dk | 5 dk |
| 1 → 2 | 190 yontma taş · 25 kereste | 1 sa 40 dk | 10 dk |
| 2 → 3 | 238 yontma taş · 31 kereste | 3 sa 20 dk | 20 dk |
| 3 → 4 | 297 yontma taş · 39 kereste | 6 sa 40 dk | 40 dk |
| 4 → 5 | 371 yontma taş · 49 kereste | 13 sa 20 dk | 1 sa 20 dk |
| 5 → 6 | 464 yontma taş · 61 kereste | 1 g 2 sa | 2 sa 40 dk |
| 6 → 7 | 580 yontma taş · 76 kereste | 2 g 5 sa | 5 sa 20 dk |
| 7 → 8 | 725 yontma taş · 95 kereste | 4 g 10 sa | 10 sa 40 dk |
| 8 → 9 | 906 yontma taş · 119 kereste | 8 g 21 sa | 21 sa 20 dk |
| 9 → 10 | 1.132 yontma taş · 149 kereste | 17 g 18 sa | 1 g 18 sa |
| 10 → 11 | 1.416 yontma taş · 186 kereste | 35 g 13 sa | 3 g 13 sa |
| 11 → 12 | 1.770 yontma taş · 233 kereste | 71 g 2 sa | 7 g 2 sa |
| 12 → 13 | 2.212 yontma taş · 291 kereste | 142 g 5 sa | 14 g 5 sa |
| 13 → 14 | 2.765 yontma taş · 364 kereste | 284 g 10 sa | 28 g 10 sa |
| 14 → 15 | 3.456 yontma taş · 455 kereste | 568 g 21 sa | 56 g 21 sa |
| 15 → 16 | 4.320 yontma taş · 568 kereste | 1137 g 18 sa | 113 g 18 sa |
| 16 → 17 | 5.400 yontma taş · 711 kereste | 2275 g 13 sa | 227 g 13 sa |
| 17 → 18 | 6.750 yontma taş · 888 kereste | 4551 g 2 sa | 455 g 2 sa |
| 18 → 19 | 8.438 yontma taş · 1.110 kereste | 9102 g 5 sa | 910 g 5 sa |
| 19 → 20 | 10.547 yontma taş · 1.388 kereste | 18204 g 10 sa | 1820 g 10 sa |

### Hendek (`hendek`) — Savunma, max Lvl 20

- seviye başına +1 kültür puanı/gün

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 25 kereste · 95 yontma taş | 40 dk | 4 dk |
| 1 → 2 | 25 kereste · 95 yontma taş | 1 sa 16 dk | 8 dk |
| 2 → 3 | 31 kereste · 119 yontma taş | 2 sa 24 dk | 14 dk |
| 3 → 4 | 39 kereste · 148 yontma taş | 4 sa 34 dk | 27 dk |
| 4 → 5 | 49 kereste · 186 yontma taş | 8 sa 41 dk | 52 dk |
| 5 → 6 | 61 kereste · 232 yontma taş | 16 sa 30 dk | 1 sa 39 dk |
| 6 → 7 | 76 kereste · 290 yontma taş | 1 g 7 sa | 3 sa 8 dk |
| 7 → 8 | 95 kereste · 362 yontma taş | 2 g 11 sa | 5 sa 58 dk |
| 8 → 9 | 119 kereste · 453 yontma taş | 4 g 17 sa | 11 sa 19 dk |
| 9 → 10 | 149 kereste · 566 yontma taş | 8 g 23 sa | 21 sa 31 dk |
| 10 → 11 | 186 kereste · 708 yontma taş | 17 g | 1 g 16 sa |
| 11 → 12 | 233 kereste · 885 yontma taş | 32 g 8 sa | 3 g 5 sa |
| 12 → 13 | 291 kereste · 1.106 yontma taş | 61 g 11 sa | 6 g 3 sa |
| 13 → 14 | 364 kereste · 1.382 yontma taş | 116 g 19 sa | 11 g 16 sa |
| 14 → 15 | 455 kereste · 1.728 yontma taş | 221 g 22 sa | 22 g 4 sa |
| 15 → 16 | 568 kereste · 2.160 yontma taş | 421 g 16 sa | 42 g 4 sa |
| 16 → 17 | 711 kereste · 2.700 yontma taş | 801 g 5 sa | 80 g 2 sa |
| 17 → 18 | 888 kereste · 3.375 yontma taş | 1522 g 7 sa | 152 g 5 sa |
| 18 → 19 | 1.110 kereste · 4.219 yontma taş | 2892 g 10 sa | 289 g 5 sa |
| 19 → 20 | 1.388 kereste · 5.274 yontma taş | 5495 g 14 sa | 549 g 13 sa |

### Savunma Kulesi (`kule`) — Savunma, max Lvl 20

- seviye × 4 işçi alır
- seviye başına +1 kültür puanı/gün
- köyde en fazla 6 tane

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| inşa → 1 | 50 kereste · 95 yontma taş · 75 külçe | 45 dk | 5 dk |
| 1 → 2 | 50 kereste · 95 yontma taş · 75 külçe | 1 sa 30 dk | 9 dk |
| 2 → 3 | 63 kereste · 119 yontma taş · 94 külçe | 3 sa | 18 dk |
| 3 → 4 | 78 kereste · 148 yontma taş · 117 külçe | 6 sa | 36 dk |
| 4 → 5 | 98 kereste · 186 yontma taş · 146 külçe | 12 sa | 1 sa 12 dk |
| 5 → 6 | 122 kereste · 232 yontma taş · 183 külçe | 1 g | 2 sa 24 dk |
| 6 → 7 | 153 kereste · 290 yontma taş · 229 külçe | 2 g | 4 sa 48 dk |
| 7 → 8 | 191 kereste · 362 yontma taş · 286 külçe | 4 g | 9 sa 36 dk |
| 8 → 9 | 238 kereste · 453 yontma taş · 358 külçe | 8 g | 19 sa 12 dk |
| 9 → 10 | 298 kereste · 566 yontma taş · 447 külçe | 16 g | 1 g 14 sa |
| 10 → 11 | 373 kereste · 708 yontma taş · 559 külçe | 32 g | 3 g 4 sa |
| 11 → 12 | 466 kereste · 885 yontma taş · 698 külçe | 64 g | 6 g 9 sa |
| 12 → 13 | 582 kereste · 1.106 yontma taş · 873 külçe | 128 g | 12 g 19 sa |
| 13 → 14 | 728 kereste · 1.382 yontma taş · 1.091 külçe | 256 g | 25 g 14 sa |
| 14 → 15 | 909 kereste · 1.728 yontma taş · 1.364 külçe | 512 g | 51 g 4 sa |
| 15 → 16 | 1.137 kereste · 2.160 yontma taş · 1.705 külçe | 1024 g | 102 g 9 sa |
| 16 → 17 | 1.421 kereste · 2.700 yontma taş · 2.132 külçe | 2048 g | 204 g 19 sa |
| 17 → 18 | 1.776 kereste · 3.375 yontma taş · 2.665 külçe | 4096 g | 409 g 14 sa |
| 18 → 19 | 2.220 kereste · 4.219 yontma taş · 3.331 külçe | 8192 g | 819 g 4 sa |
| 19 → 20 | 2.776 kereste · 5.274 yontma taş · 4.163 külçe | 16384 g | 1638 g 9 sa |

## B. Üretim alanları (tarlalar) — seviye seviye

Seviye üretmiyor, **işçi kapasitesi** açıyor. Gerçek üretim =
atanan işçi × taban × hex çarpanı.

**Tavan: merkez köyde Lvl 20, diğer köylerde Lvl 10.**

### Orman (`odun`) — işçi başına 22/saat

| Seviye | Maliyet | İşçi kap. | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|---|
| inşa → 1 | 12 kereste · 30 tuğla · 18 yontma taş · 15 külçe | 3 | 5 dk | 1 dk |
| 1 → 2 | 19 kereste · 48 tuğla · 29 yontma taş · 24 külçe | 5 | 7 dk | 1 dk |
| 2 → 3 | 31 kereste · 77 tuğla · 46 yontma taş · 38 külçe | 7 | 10 dk | 1 dk |
| 3 → 4 | 49 kereste · 123 tuğla · 74 yontma taş · 62 külçe | 9 | 14 dk | 1 dk |
| 4 → 5 | 79 kereste · 196 tuğla · 118 yontma taş · 98 külçe | 11 | 19 dk | 2 dk |
| 5 → 6 | 126 kereste · 315 tuğla · 189 yontma taş · 157 külçe | 13 | 27 dk | 3 dk |
| 6 → 7 | 201 kereste · 503 tuğla · 302 yontma taş · 252 külçe | 15 | 38 dk | 4 dk |
| 7 → 8 | 322 kereste · 805 tuğla · 483 yontma taş · 403 külçe | 17 | 53 dk | 5 dk |
| 8 → 9 | 515 kereste · 1.288 tuğla · 773 yontma taş · 644 külçe | 19 | 1 sa 14 dk | 7 dk |
| 9 → 10 | 825 kereste · 2.062 tuğla · 1.237 yontma taş · 1.031 külçe | 21 | 1 sa 43 dk | 10 dk |
| 10 → 11 | 1.319 kereste · 3.298 tuğla · 1.979 yontma taş · 1.649 külçe | 23 | 2 sa 25 dk | 14 dk |
| 11 → 12 | 2.111 kereste · 5.278 tuğla · 3.166 yontma taş · 2.639 külçe | 25 | 3 sa 22 dk | 20 dk |
| 12 → 13 | 3.378 kereste · 8.444 tuğla · 5.066 yontma taş · 4.222 külçe | 27 | 4 sa 43 dk | 28 dk |
| 13 → 14 | 5.404 kereste · 13.511 tuğla · 8.107 yontma taş · 6.755 külçe | 29 | 6 sa 37 dk | 40 dk |
| 14 → 15 | 8.647 kereste · 21.617 tuğla · 12.970 yontma taş · 10.809 külçe | 31 | 9 sa 16 dk | 56 dk |
| 15 → 16 | 13.835 kereste · 34.588 tuğla · 20.752 yontma taş · 17.294 külçe | 33 | 12 sa 58 dk | 1 sa 18 dk |
| 16 → 17 | 22.136 kereste · 55.340 tuğla · 33.204 yontma taş · 27.670 külçe | 35 | 18 sa 9 dk | 1 sa 49 dk |
| 17 → 18 | 35.418 kereste · 88.544 tuğla · 53.127 yontma taş · 44.272 külçe | 37 | 1 g 1 sa | 2 sa 32 dk |
| 18 → 19 | 56.668 kereste · 141.671 tuğla · 85.003 yontma taş · 70.835 külçe | 39 | 1 g 11 sa | 3 sa 33 dk |
| 19 → 20 | 90.669 kereste · 226.674 tuğla · 136.004 yontma taş · 113.337 külçe | 42 | 2 g 1 sa | 4 sa 59 dk |

### Demir Madeni (`demir`) — işçi başına 14/saat

| Seviye | Maliyet | İşçi kap. | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|---|
| inşa → 1 | 14 kereste · 24 tuğla · 27 yontma taş · 9 külçe | 3 | 6 dk | 1 dk |
| 1 → 2 | 23 kereste · 38 tuğla · 43 yontma taş · 14 külçe | 5 | 8 dk | 1 dk |
| 2 → 3 | 37 kereste · 62 tuğla · 69 yontma taş · 23 külçe | 7 | 11 dk | 1 dk |
| 3 → 4 | 59 kereste · 98 tuğla · 111 yontma taş · 37 külçe | 9 | 15 dk | 2 dk |
| 4 → 5 | 94 kereste · 157 tuğla · 177 yontma taş · 59 külçe | 11 | 21 dk | 2 dk |
| 5 → 6 | 151 kereste · 252 tuğla · 283 yontma taş · 94 külçe | 13 | 30 dk | 3 dk |
| 6 → 7 | 242 kereste · 403 tuğla · 453 yontma taş · 151 külçe | 15 | 41 dk | 4 dk |
| 7 → 8 | 387 kereste · 644 tuğla · 725 yontma taş · 242 külçe | 17 | 58 dk | 6 dk |
| 8 → 9 | 619 kereste · 1.031 tuğla · 1.160 yontma taş · 386 külçe | 19 | 1 sa 21 dk | 8 dk |
| 9 → 10 | 990 kereste · 1.649 tuğla · 1.856 yontma taş · 619 külçe | 21 | 1 sa 54 dk | 11 dk |
| 10 → 11 | 1.583 kereste · 2.639 tuğla · 2.969 yontma taş · 990 külçe | 23 | 2 sa 39 dk | 16 dk |
| 11 → 12 | 2.533 kereste · 4.222 tuğla · 4.750 yontma taş · 1.583 külçe | 25 | 3 sa 43 dk | 22 dk |
| 12 → 13 | 4.053 kereste · 6.755 tuğla · 7.600 yontma taş · 2.533 külçe | 27 | 5 sa 12 dk | 31 dk |
| 13 → 14 | 6.485 kereste · 10.809 tuğla · 12.160 yontma taş · 4.053 külçe | 29 | 7 sa 17 dk | 44 dk |
| 14 → 15 | 10.376 kereste · 17.294 tuğla · 19.456 yontma taş · 6.485 külçe | 31 | 10 sa 11 dk | 1 sa 1 dk |
| 15 → 16 | 16.602 kereste · 27.670 tuğla · 31.129 yontma taş · 10.376 külçe | 33 | 14 sa 16 dk | 1 sa 26 dk |
| 16 → 17 | 26.563 kereste · 44.272 tuğla · 49.806 yontma taş · 16.602 külçe | 35 | 19 sa 58 dk | 2 sa |
| 17 → 18 | 42.501 kereste · 70.835 tuğla · 79.690 yontma taş · 26.563 külçe | 37 | 1 g 3 sa | 2 sa 48 dk |
| 18 → 19 | 68.002 kereste · 113.337 tuğla · 127.504 yontma taş · 42.501 külçe | 39 | 1 g 15 sa | 3 sa 55 dk |
| 19 → 20 | 108.803 kereste · 181.339 tuğla · 204.006 yontma taş · 68.002 külçe | 42 | 2 g 6 sa | 5 sa 29 dk |

### Kil Ocağı (`kil`) — işçi başına 22/saat

| Seviye | Maliyet | İşçi kap. | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|---|
| inşa → 1 | 7 kereste · 45 tuğla · 14 yontma taş · 18 külçe | 3 | 5 dk | 0 dk |
| 1 → 2 | 11 kereste · 72 tuğla · 23 yontma taş · 29 külçe | 5 | 7 dk | 1 dk |
| 2 → 3 | 18 kereste · 115 tuğla · 37 yontma taş · 46 külçe | 7 | 9 dk | 1 dk |
| 3 → 4 | 29 kereste · 184 tuğla · 59 yontma taş · 74 külçe | 9 | 13 dk | 1 dk |
| 4 → 5 | 47 kereste · 295 tuğla · 94 yontma taş · 118 külçe | 11 | 18 dk | 2 dk |
| 5 → 6 | 75 kereste · 472 tuğla · 151 yontma taş · 189 külçe | 13 | 26 dk | 3 dk |
| 6 → 7 | 121 kereste · 755 tuğla · 242 yontma taş · 302 külçe | 15 | 36 dk | 4 dk |
| 7 → 8 | 193 kereste · 1.208 tuğla · 387 yontma taş · 483 külçe | 17 | 50 dk | 5 dk |
| 8 → 9 | 309 kereste · 1.933 tuğla · 619 yontma taş · 773 külçe | 19 | 1 sa 10 dk | 7 dk |
| 9 → 10 | 495 kereste · 3.092 tuğla · 989 yontma taş · 1.237 külçe | 21 | 1 sa 38 dk | 10 dk |
| 10 → 11 | 792 kereste · 4.948 tuğla · 1.583 yontma taş · 1.979 külçe | 23 | 2 sa 17 dk | 14 dk |
| 11 → 12 | 1.267 kereste · 7.916 tuğla · 2.533 yontma taş · 3.166 külçe | 25 | 3 sa 12 dk | 19 dk |
| 12 → 13 | 2.026 kereste · 12.666 tuğla · 4.053 yontma taş · 5.067 külçe | 27 | 4 sa 29 dk | 27 dk |
| 13 → 14 | 3.242 kereste · 20.266 tuğla · 6.485 yontma taş · 8.107 külçe | 29 | 6 sa 17 dk | 38 dk |
| 14 → 15 | 5.188 kereste · 32.426 tuğla · 10.376 yontma taş · 12.970 külçe | 31 | 8 sa 48 dk | 53 dk |
| 15 → 16 | 8.301 kereste · 51.881 tuğla · 16.602 yontma taş · 20.752 külçe | 33 | 12 sa 19 dk | 1 sa 14 dk |
| 16 → 17 | 13.282 kereste · 83.010 tuğla · 26.563 yontma taş · 33.204 külçe | 35 | 17 sa 15 dk | 1 sa 43 dk |
| 17 → 18 | 21.250 kereste · 132.817 tuğla · 42.501 yontma taş · 53.127 külçe | 37 | 1 g | 2 sa 25 dk |
| 18 → 19 | 34.001 kereste · 212.507 tuğla · 68.002 yontma taş · 85.003 külçe | 39 | 1 g 9 sa | 3 sa 23 dk |
| 19 → 20 | 54.402 kereste · 340.011 tuğla · 108.803 yontma taş · 136.004 külçe | 42 | 1 g 23 sa | 4 sa 44 dk |

### Taş Ocağı (`tas`) — işçi başına 22/saat

| Seviye | Maliyet | İşçi kap. | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|---|
| inşa → 1 | 10 kereste · 27 tuğla · 29 yontma taş · 10 külçe | 3 | 5 dk | 1 dk |
| 1 → 2 | 15 kereste · 43 tuğla · 46 yontma taş · 17 külçe | 5 | 7 dk | 1 dk |
| 2 → 3 | 25 kereste · 69 tuğla · 74 yontma taş · 27 külçe | 7 | 10 dk | 1 dk |
| 3 → 4 | 39 kereste · 111 tuğla · 118 yontma taş · 43 külçe | 9 | 14 dk | 1 dk |
| 4 → 5 | 63 kereste · 177 tuğla · 189 yontma taş · 69 külçe | 11 | 20 dk | 2 dk |
| 5 → 6 | 100 kereste · 283 tuğla · 302 yontma taş · 110 külçe | 13 | 28 dk | 3 dk |
| 6 → 7 | 161 kereste · 453 tuğla · 483 yontma taş · 176 külçe | 15 | 40 dk | 4 dk |
| 7 → 8 | 258 kereste · 725 tuğla · 773 yontma taş · 282 külçe | 17 | 55 dk | 6 dk |
| 8 → 9 | 412 kereste · 1.160 tuğla · 1.237 yontma taş · 451 külçe | 19 | 1 sa 17 dk | 8 dk |
| 9 → 10 | 660 kereste · 1.856 tuğla · 1.979 yontma taş · 722 külçe | 21 | 1 sa 48 dk | 11 dk |
| 10 → 11 | 1.055 kereste · 2.969 tuğla · 3.166 yontma taş · 1.155 külçe | 23 | 2 sa 32 dk | 15 dk |
| 11 → 12 | 1.689 kereste · 4.750 tuğla · 5.066 yontma taş · 1.847 külçe | 25 | 3 sa 33 dk | 21 dk |
| 12 → 13 | 2.702 kereste · 7.600 tuğla · 8.106 yontma taş · 2.956 külçe | 27 | 4 sa 58 dk | 30 dk |
| 13 → 14 | 4.323 kereste · 12.160 tuğla · 12.970 yontma taş · 4.729 külçe | 29 | 6 sa 57 dk | 42 dk |
| 14 → 15 | 6.917 kereste · 19.456 tuğla · 20.753 yontma taş · 7.566 külçe | 31 | 9 sa 43 dk | 58 dk |
| 15 → 16 | 11.068 kereste · 31.129 tuğla · 33.204 yontma taş · 12.106 külçe | 33 | 13 sa 37 dk | 1 sa 22 dk |
| 16 → 17 | 17.709 kereste · 49.806 tuğla · 53.126 yontma taş · 19.369 külçe | 35 | 19 sa 3 dk | 1 sa 54 dk |
| 17 → 18 | 28.334 kereste · 79.690 tuğla · 85.003 yontma taş · 30.991 külçe | 37 | 1 g 2 sa | 2 sa 40 dk |
| 18 → 19 | 45.335 kereste · 127.504 tuğla · 136.004 yontma taş · 49.585 külçe | 39 | 1 g 13 sa | 3 sa 44 dk |
| 19 → 20 | 72.536 kereste · 204.006 tuğla · 217.606 yontma taş · 79.336 külçe | 42 | 2 g 4 sa | 5 sa 14 dk |

### Tarla (`tahil`) — işçi başına 32/saat

| Seviye | Maliyet | İşçi kap. | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|---|
| inşa → 1 | 6 kereste · 21 tuğla · 11 yontma taş · 6 külçe | 3 | 4 dk | 0 dk |
| 1 → 2 | 10 kereste · 34 tuğla · 17 yontma taş · 10 külçe | 5 | 6 dk | 1 dk |
| 2 → 3 | 15 kereste · 54 tuğla · 28 yontma taş · 15 külçe | 7 | 8 dk | 1 dk |
| 3 → 4 | 25 kereste · 86 tuğla · 44 yontma taş · 25 külçe | 9 | 12 dk | 1 dk |
| 4 → 5 | 39 kereste · 137 tuğla · 71 yontma taş · 39 külçe | 11 | 16 dk | 2 dk |
| 5 → 6 | 63 kereste · 220 tuğla · 113 yontma taş · 63 külçe | 13 | 23 dk | 2 dk |
| 6 → 7 | 101 kereste · 352 tuğla · 181 yontma taş · 101 külçe | 15 | 32 dk | 3 dk |
| 7 → 8 | 161 kereste · 564 tuğla · 290 yontma taş · 161 külçe | 17 | 45 dk | 4 dk |
| 8 → 9 | 258 kereste · 902 tuğla · 464 yontma taş · 258 külçe | 19 | 1 sa 3 dk | 6 dk |
| 9 → 10 | 412 kereste · 1.443 tuğla · 742 yontma taş · 412 külçe | 21 | 1 sa 28 dk | 9 dk |
| 10 → 11 | 660 kereste · 2.309 tuğla · 1.187 yontma taş · 660 külçe | 23 | 2 sa 3 dk | 12 dk |
| 11 → 12 | 1.056 kereste · 3.694 tuğla · 1.900 yontma taş · 1.055 külçe | 25 | 2 sa 52 dk | 17 dk |
| 12 → 13 | 1.689 kereste · 5.911 tuğla · 3.040 yontma taş · 1.689 külçe | 27 | 4 sa 1 dk | 24 dk |
| 13 → 14 | 2.702 kereste · 9.458 tuğla · 4.864 yontma taş · 2.702 külçe | 29 | 5 sa 37 dk | 34 dk |
| 14 → 15 | 4.324 kereste · 15.132 tuğla · 7.782 yontma taş · 4.324 külçe | 31 | 7 sa 52 dk | 47 dk |
| 15 → 16 | 6.918 kereste · 24.211 tuğla · 12.452 yontma taş · 6.917 külçe | 33 | 11 sa 1 dk | 1 sa 6 dk |
| 16 → 17 | 11.068 kereste · 38.738 tuğla · 19.922 yontma taş · 11.068 külçe | 35 | 15 sa 26 dk | 1 sa 33 dk |
| 17 → 18 | 17.709 kereste · 61.981 tuğla · 31.876 yontma taş · 17.709 külçe | 37 | 21 sa 36 dk | 2 sa 10 dk |
| 18 → 19 | 28.334 kereste · 99.170 tuğla · 51.002 yontma taş · 28.334 külçe | 39 | 1 g 6 sa | 3 sa 1 dk |
| 19 → 20 | 45.335 kereste · 158.672 tuğla · 81.602 yontma taş · 45.335 külçe | 42 | 1 g 18 sa | 4 sa 14 dk |

## C. Ekipman — maliyet, süre ve stat katkısı

Asker eğitmek için ekipmanın **önceden üretilmiş** olması şart.
Bir birimin statları taşıdığı ekipmanların toplamıdır.

| Ekipman | Üretildiği yer | Maliyet (1 adet) | Süre (1 işçi) | Saldırı | Yaya sav. | Atlı sav. | Hız | Yük |
|---|---|---|---|---|---|---|---|---|
| Kılıç (`kilic`) | Silahçı | 10 külçe · 5 kereste | 2 sa | 30 | 20 | 10 | -3 | -10 |
| Mızrak (`mizrak`) | Silahçı | 5 külçe · 10 kereste | 1 sa | 10 | 10 | 30 | -2 | -5 |
| Kalkan (`kalkan`) | Zırhçı | 15 kereste · 5 külçe | 1 sa 30 dk | 5 | 25 | 15 | -2 | -10 |
| Zırh (`zirh`) | Zırhçı | 20 külçe · 5 kereste | 3 sa | 20 | 5 | 5 | -2 | -5 |
| Koçbaşı Parçaları (`koc_basi`) | Atölye | 120 kereste · 60 külçe | 6 sa | 20 | 0 | 0 | 0 | 0 |
| Mancınık Parçaları (`mancinik`) | Atölye | 200 kereste · 120 yontma taş · 100 külçe | 10 sa | 25 | 0 | 0 | 0 | 0 |
| At (`at`) | Ahır | 40 tahıl · 10 kereste | 4 sa | 10 | 20 | 20 | 4 | 50 |

## D. Ekipman SEVİYE yükseltmeleri

Kılıç, mızrak, kalkan ve zırh ayrıca **seviye** kazanır ve seviye
BÜTÜN orduya birden işler. Bir seferde tek ekipman yükseltilir.
Maksimum seviye: **20**.

Maliyet ve süre BÜTÜN ekipmanlar için aynı (kılıç, mızrak, kalkan, zırh).

| Seviye | Maliyet | Süre (1 işçi) | Süre (10 işçi) |
|---|---|---|---|
| 1 → 2 | 188 kereste · 138 tuğla · 138 yontma taş · 188 külçe | 25 dk | 3 dk |
| 2 → 3 | 234 kereste · 172 tuğla · 172 yontma taş · 234 külçe | 31 dk | 3 dk |
| 3 → 4 | 293 kereste · 215 tuğla · 215 yontma taş · 293 külçe | 39 dk | 4 dk |
| 4 → 5 | 366 kereste · 269 tuğla · 269 yontma taş · 366 külçe | 49 dk | 5 dk |
| 5 → 6 | 458 kereste · 336 tuğla · 336 yontma taş · 458 külçe | 1 sa 1 dk | 6 dk |
| 6 → 7 | 572 kereste · 420 tuğla · 420 yontma taş · 572 külçe | 1 sa 16 dk | 8 dk |
| 7 → 8 | 715 kereste · 525 tuğla · 525 yontma taş · 715 külçe | 1 sa 35 dk | 10 dk |
| 8 → 9 | 894 kereste · 656 tuğla · 656 yontma taş · 894 külçe | 1 sa 59 dk | 12 dk |
| 9 → 10 | 1.118 kereste · 820 tuğla · 820 yontma taş · 1.118 külçe | 2 sa 29 dk | 15 dk |
| 10 → 11 | 1.397 kereste · 1.024 tuğla · 1.024 yontma taş · 1.397 külçe | 3 sa 6 dk | 19 dk |
| 11 → 12 | 1.746 kereste · 1.281 tuğla · 1.281 yontma taş · 1.746 külçe | 3 sa 53 dk | 23 dk |
| 12 → 13 | 2.183 kereste · 1.601 tuğla · 1.601 yontma taş · 2.183 külçe | 4 sa 51 dk | 29 dk |
| 13 → 14 | 2.728 kereste · 2.001 tuğla · 2.001 yontma taş · 2.728 külçe | 6 sa 4 dk | 36 dk |
| 14 → 15 | 3.411 kereste · 2.501 tuğla · 2.501 yontma taş · 3.411 külçe | 7 sa 35 dk | 46 dk |
| 15 → 16 | 4.263 kereste · 3.126 tuğla · 3.126 yontma taş · 4.263 külçe | 9 sa 28 dk | 57 dk |
| 16 → 17 | 5.329 kereste · 3.908 tuğla · 3.908 yontma taş · 5.329 külçe | 11 sa 51 dk | 1 sa 11 dk |
| 17 → 18 | 6.661 kereste · 4.885 tuğla · 4.885 yontma taş · 6.661 külçe | 14 sa 48 dk | 1 sa 29 dk |
| 18 → 19 | 8.327 kereste · 6.106 tuğla · 6.106 yontma taş · 8.327 külçe | 18 sa 30 dk | 1 sa 51 dk |
| 19 → 20 | 10.408 kereste · 7.633 tuğla · 7.633 yontma taş · 10.408 külçe | 23 sa 8 dk | 2 sa 19 dk |
| 20 → 21 | 13.010 kereste · 9.541 tuğla · 9.541 yontma taş · 13.010 külçe | 1 g 4 sa | 2 sa 54 dk |

## E. Birimler — maliyet, süre ve statlar

**Birimlerin kendi kaynak maliyeti YOKTUR** (göçmen hariç): bedelleri
taşıdıkları **ekipmandır**. Aşağıdaki "ekipman maliyeti" sütunu, o
birimin ekipmanlarının toplam kaynak bedelidir — yani bir asker
gerçekte bu kadara mal olur.

Eğitim süresi = ekipman sayısı × 5 oyun dakikası (en az 3).

| Birim | Sınıf | Eğitildiği yer | Ekipman | Ekipman maliyeti | Eğitim (1 işçi) | Eğitim (10 işçi) | Sal | Yaya sav | Atlı sav | Hız | Yük |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Fjordvakt (`fjordvakt`) | piyade | Kışla | kilic | 10 külçe · 5 kereste | 5 dk | 1 dk | 30 | 30 | 20 | 7 | 50 |
| Skjoldvakt (`skjoldvakt`) | piyade | Kışla | kilic+kalkan | 15 külçe · 20 kereste | 10 dk | 1 dk | 35 | 55 | 35 | 5 | 40 |
| Nordkamper (`nordkamper`) | piyade | Kışla | kilic+zirh | 30 külçe · 10 kereste | 10 dk | 1 dk | 50 | 35 | 25 | 5 | 45 |
| Ulv Savaşçısı (`ulvSavasci`) | piyade | Kışla | kilic+zirh+kalkan | 35 külçe · 25 kereste | 15 dk | 2 dk | 55 | 60 | 40 | 3 | 35 |
| Spydvakt (`spydvakt`) | piyade | Kışla | mizrak | 5 külçe · 10 kereste | 5 dk | 1 dk | 10 | 20 | 40 | 8 | 55 |
| Isbjørn (`isbjorn`) | piyade | Kışla | mizrak+zirh | 25 külçe · 15 kereste | 10 dk | 1 dk | 30 | 25 | 45 | 6 | 50 |
| Kuzey İzcisi (`kuzeyIzcisi`) | suvari | Ahır | at | 40 tahıl · 10 kereste | 5 dk | 1 dk | 10 | 10 | 10 | 14 | 110 |
| Demir Atlı (`demirAtli`) | suvari | Ahır | at+kilic | 40 tahıl · 15 kereste · 10 külçe | 10 dk | 1 dk | 40 | 50 | 40 | 11 | 100 |
| Skjoldreiter (`skjoldreiter`) | suvari | Ahır | at+kilic+kalkan | 40 tahıl · 30 kereste · 15 külçe | 15 dk | 2 dk | 45 | 75 | 55 | 9 | 90 |
| Buz Süvarisi (`buzSuvarisi`) | suvari | Ahır | at+kilic+zirh | 40 tahıl · 20 kereste · 30 külçe | 15 dk | 2 dk | 60 | 55 | 45 | 9 | 95 |
| Jernridder (`jernridder`) | suvari | Ahır | at+kilic+kalkan+zirh | 40 tahıl · 35 kereste · 35 külçe | 20 dk | 2 dk | 65 | 80 | 60 | 7 | 85 |
| Vindreiter (`vindreiter`) | suvari | Ahır | at+mizrak | 40 tahıl · 20 kereste · 5 külçe | 10 dk | 1 dk | 20 | 40 | 60 | 12 | 105 |
| Stormridder (`stormridder`) | suvari | Ahır | at+mizrak+zirh | 40 tahıl · 25 kereste · 25 külçe | 15 dk | 2 dk | 30 | 45 | 65 | 10 | 100 |
| Koçbaşı (`kaleKiran`) | kusatma | Atölye | koc_basi | 120 kereste · 60 külçe | 5 dk | 1 dk | 60 | 30 | 75 | 4 | 0 |
| Alev Mancınığı (`alevMancınıgı`) | kusatma | Atölye | mancinik | 200 kereste · 120 yontma taş · 100 külçe | 5 dk | 1 dk | 75 | 60 | 10 | 3 | 0 |
| Göçmen (`gocmen`) | gocmen | Köşk / Saray | — | 400 kereste · 350 tuğla · 350 yontma taş · 200 külçe | 4 sa | 24 dk | 0 | 0 | 0 | 5 | 0 |

## F. Diğer maliyetler

### Şölenler (Taverna)

| Şölen | Gereken Taverna | Süre | Maliyet | Verdiği kültür puanı |
|---|---|---|---|---|
| Küçük şölen (`kucuk`) | Lvl 1 | 12 sa | 400 kereste · 300 tuğla · 200 yontma taş · 200 tahıl | bu köyün günlük üretimi × 1 |
| Büyük şölen (`buyuk`) | Lvl 10 | 1 g | 1.200 kereste · 900 tuğla · 600 yontma taş · 600 tahıl · 300 külçe | bütün köylerin günlük üretimi × 2 |

### Kahramanı diriltme

Bedel seviyeyle büyür: taban
300 tahıl · 200 külçe, seviye başına +90 tahıl · 60 külçe.

| Kahraman seviyesi | Diriltme bedeli |
|---|---|
| Lvl 1 | 300 tahıl · 200 külçe |
| Lvl 5 | 660 tahıl · 440 külçe |
| Lvl 10 | 1.110 tahıl · 740 külçe |
| Lvl 20 | 2.010 tahıl · 1.340 külçe |
| Lvl 30 | 2.910 tahıl · 1.940 külçe |
| Lvl 50 | 4.710 tahıl · 3.140 külçe |
| Lvl 75 | 6.960 tahıl · 4.640 külçe |
| Lvl 100 | 9.210 tahıl · 6.140 külçe |

### Yıkım

Bir binayı yıkmak, o seviyenin inşa süresinin **onda biri** kadar sürer.
Kaynak iadesi yoktur.
