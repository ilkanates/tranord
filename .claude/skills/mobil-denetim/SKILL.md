---
name: mobil-denetim
description: Web arayüzünü her telefon/tablet çözünürlüğünde denetler — kırpılan tuşlar, ekran dışı kalan denetimler, çökmüş sütunlar, küçük dokunma hedefleri. Responsive hata ararken, "telefonda şu görünmüyor/basılamıyor" şikâyetlerinde, mobil düzeltme yaptıktan sonra doğrularken kullan. Bulunmuş yanlış pozitif eleyicilerini ve tekrar eden hata kalıplarını içerir.
---

# Mobil denetim

Bu skill, elle bulunması pahalı bir hata sınıfını yakalar: **öğe DOM'da var ama
oyuncu ona ulaşamıyor.** Kırpılmış, ekran dışında, üstü kapalı, ya da
kullanılamaz genişliğe çökmüş.

Elle kontrol ölçeklenmiyor: 32 bina × 9 çözünürlük = 288 panel durumu.

## Ne zaman kullan

- "Telefonda X görünmüyor / basamıyorum" şikâyeti
- Responsive bir düzeltme yaptıktan **sonra** (doğrulama)
- Yeni bir panel/ekran eklendikten sonra
- Bir eşik değeri (breakpoint) ya da düzen koşulu değiştirdiğinde

## Önce oku: ÖLÇMEDEN DÜZELTME

Bu alanda tahmin sürekli yanlış çıkıyor. Kural:

1. **Önce ölç.** Hangi öğe, kaç piksel, neyin içinde, kim kırpıyor.
2. **Sonra kök nedeni bul.** Belirtiyi değil.
3. **Sonra düzelt ve yeniden ölç.**

Ölçmeden yapılan üç "düzeltme" bu projede boşa gitti ya da zarar verdi:

- Satır içi `height`'lerin dokunma hedefini bozduğu sanıldı — **bozmuyor**,
  CSS'te `min-height` `height`'i yener. 24 dosya boşuna değiştirilecekti.
- `FONT.num`'ın monospace olmadığı görülüp değiştirilmek istendi — ölçüm
  Jost'un tabular rakamlarının zaten çalıştığını gösterdi (48.73 = 48.73).
- Denetim aracının ilk sürümü 1404 bulgu verdi; hepsi gürültüydü.

## Araç

`client/dev/mobil-denetim.html` — oyunu aynı origin'de iframe'e alır,
iframe boyutunu değiştirerek cihaz taklidi yapar, denetimi iframe'in
**içinde** çalıştırır. Tarayıcı otomasyonu bağımlılığı yok.

Başka bir projede yoksa aynı desenle yeniden yaz; kurallar ve eleyiciler
aşağıda.

Kullanım:

```
vite dev  →  http://localhost:5180/mobil-denetim.html  →  "Tara"
```

Gerçek cihazda da açılır. **44 px dokunma hedefi kuralı YALNIZ gerçek
cihazda ölçülebilir** — o kuralı veren CSS `@media (hover: none)` altında
ve masaüstü tarayıcıda hiç çalışmaz. Masaüstünde zorlamak her tuşu hatalı
gösterir; araç bu durumda kuralı atlar ve raporda "ATLANDI" yazar.

## Denetlenen kurallar

| kural | ne arar |
|---|---|
| `kirpilmis` | `overflow: hidden` bir atanın dışında kalan tıklanabilir öğe |
| `ekran-disi-x/y` | ekran dışında ve kaydırma kutusu içinde DEĞİL |
| `sifir-boyut` | çizilen ama boyutu sıfır olan tıklanabilir |
| `ustu-kapali` | merkezine basınca başka öğe yakalıyor |
| `kucuk-hedef` | dokunmatikte 44×44'ten küçük |
| `sayfa-yatay-kayiyor` | `document.scrollWidth > clientWidth` |
| `yazi-kesik` | kasıtsız kırpılan yazı |

### Aracın GÖREMEDİĞİ şey

Geometrik kurallar "bu sütun kullanılamaz genişliğe düştü"yü yakalamaz.
Gerçek örnek: ahır panelinde ekipman kartı **26 px**'e sıkışmıştı; hiçbir
şey kırpılmadığı için araç "temiz" dedi, kullanıcı gözle gördü.

**Araç gözün yerine geçmez.** Tarama temiz çıksa bile ana ekranlara bak.

## Yanlış pozitif eleyicileri (hepsi pahalıya öğrenildi)

Bunlar olmadan rapor okunmaz — 1404 bulgu → 12.

1. **Çizilmeyeni denetleme.** `el.getClientRects().length === 0` ise atla.
   Sadece öğenin kendi `display`ine bakmak yetmez; onu gizleyen ATASI olur.
2. **Kırpılma kararı taşılan eksendeki İLK kaydırma davranışına bakar.**
   Ata `auto/scroll` ise öğe sadece kaydırılmamış, hata değil. Yukarı
   çıkarken ilk `visible` olmayan değeri kullan.
3. **`ustu-kapali`, öğe kaydırma kutusunun görünür alanı dışındaysa atlanır.**
   Yoksa `elementFromPoint` doğal olarak kutuyu döndürür.
4. **`yazi-kesik` yalnız kasıtsızsa.** `text-overflow: ellipsis` veya
   `-webkit-line-clamp` varsa kırpma bilerek yapılmış.
5. **44 px kuralı yalnız gerçek `hover: none` altında.**

## Çözünürlük matrisi

```
320×568   iPhone SE            360×640   Android küçük
375×667   iPhone SE 2/3        390×844   iPhone 12/13/14
414×896   iPhone 11/XR/11 Pro Max        430×932   Pro Max
896×414   iPhone 11 yatay      844×390   iPhone 14 yatay
768×1024  tablet
```

Yatay boyutlar şart: yan çevrilmiş telefon genişlik ölçütüne göre
"masaüstü" sayılır ama dokunmatiktir. Bu projedeki hataların dördü
doğrudan bundan çıktı.

## Tekrar eden hata kalıpları

Yeni bir responsive hata ararken önce bunlara bak.

### 1. Ölçüt genişlik, oysa soru "yer var mı"

En verimli kalıp. `w < 760` yatay telefonda (896 px) yanlış cevap verir.

```js
// YANLIŞ
const dar = viewSize.w < 760;
// DOĞRU — yükseklik de ölçüte girer
const dar = viewSize.w < 760 || viewSize.h < 520;
```

Ayrıca ölçütleri çoğaltma: bu projede dört ayrı tanım (`vp.mobile`,
`darEkran`, `compact`, `hover: none`) birbirini tutmuyordu.

### 2. Satır içi stil CSS kuralını eziyor

Dokunma hedefi kuralı `@media (hover: none) { button { min-height: 44px } }`
ise, bileşendeki satır içi **`minHeight`** onu ezer ve hedef küçülür.
Satır içi `height` ezmez (min-height kazanır) — ikisini karıştırma.

```js
style={btn('good', { minHeight: 26 })}   // 26 px hedef — HATA
style={btn('good', {})}                  // CSS 44'e çıkarır
```

`input[type=range]` istisna: CSS kuralı `height` kullanıyorsa satır içi
`height` onu ezer.

### 3. Sabit `flexShrink: 0` + `overflow: hidden`

Bir satırdaki her öğe daralamıyorsa, sığmayan **son** öğe kesilir ve
genellikle o en önemli düğmedir. Bilgi daralsın, düğmeler daralmasın:

```jsx
<div style={{ display:'flex', overflow:'hidden' }}>
  <div style={{ flex:'1 1 auto', minWidth:0, overflow:'hidden' }}>…bilgi…</div>
  <button style={{ flexShrink:0 }}>İŞ YAPAN DÜĞME</button>
</div>
```

### 4. Çıplak `minmax(Npx, …)`

Kap N'den darsa ızgara taşar. Tabanı kaba bağla:

```css
repeat(auto-fit, minmax(min(320px, 100%), 1fr))
```

### 5. İki yerde ayrı yazılan sabit

Bir yerde posterin en azı `max(150, x)`, öbür yerde gövdenin tavanı
`calc(100% - 150px)` idi; toplamları paneli aşıyordu. Tek kaynaktan
oku. Aynı sınıf: istemci/sunucu ikizleri — sabiti kopyalamak yerine
**test yaz** (kopyalanan liste bu projede üç kez ayrıştı).

### 6. Sabit genişlikli yan sütun dar panelde

Kuyruk sütunu sabit 118 px alınca 188 px'lik kapta içeriğe 26 px kalıyordu.
Dar ekranda yan yana değil **alt alta** koy.

## Akış

1. Aracı çalıştır, bulguları oku.
2. Her bulgunun **kök nedenini** ölç — hangi ata kırpıyor, hangi değer
   nereden geliyor. Belirtiye yama yapma.
3. Düzelt.
4. Aracı yeniden çalıştır, sayının düştüğünü gör.
5. Ana ekranlara **gözle** bak — aracın körlüğü için.
6. Düzeltmeyi yaparken hangi ölçümün onu gerektirdiğini koda yorum olarak yaz.
   Bu projedeki her düzeltmenin yanında ölçülen sayı duruyor; bir sonraki
   kişi "burası neden böyle" diye sormuyor.

## Test köyü uyarısı

Araç yalnız **kurulu** binaları gezer. Test hesabında 8 bina varken tarama
"temiz" diyordu; 28 bina kurulunca iki yeni hata çıktı. Denetimden önce
içeriğin gerçekten var olduğundan emin ol.
