# Tranord — Kahraman Eşyası Görsel Promptları

Kaynak: `server/data/heroItemDefs.js` (28 eşya: 1 kullanılabilir + 27 kuşanılabilir)

Nadirlik farkı görselle değil, envanterdeki **çerçeve rengiyle** veriliyor
(`NADIRLIK.renk`) — her eşya için tek görsel yeterli, 5 varyant üretme.

## Üretim ayarları

- Çıktı 1:1, en az 1024×1024
- Referans/style olarak daha önce onaylanan bina görsellerinden birini verirsen
  ışık ve doku tutarlılığı artar
- Arka planı düz koyu tut; oyunda kart içinde kullanılacak

## A. STİL KALIBI

Her promptta sadece `{KONU}` değişir:

```
A single Norse {KONU}, game inventory item icon, one
object only, centered, seen at a three quarter angle,
floating against a plain dark background with a soft
rim light. Weathered iron, worn leather and aged wood,
frost and fine snow caught in the crevices. Realistic
game asset concept art, cinematic dramatic lighting,
highly detailed, cold blue-grey palette with warm metal
highlights. No sci-fi, no glow, no magic effects, no
hands, no people, no background scenery, no shadow
props, no text, no watermark. 1:1 square.
```

**Atlar için** `floating against a plain dark background` yerine:

```
standing on a thin patch of snow against a plain dark
background
```

## B. NEGATIVE PROMPT (destekleyen modellerde)

```
glow, magic, particles, sparkles, neon, sci-fi, fantasy
ornament overload, hands, arms, people, character,
background scenery, room, table, multiple items, grid,
collage, text, letters, runes as writing, numbers,
watermark, logo, blurry, low detail
```

## C. EŞYA LİSTESİ

### Kullanılabilir

| anahtar | ad | {KONU} |
|---|---|---|
| diriltmeIksiri | Diriltme İksiri | `small clay flask sealed with wax and wrapped in cord, a rune tag hanging from its neck` |

### Silah (sağ el)

| anahtar | ad | {KONU} |
|---|---|---|
| fjordKilici | Fjord Kılıcı | `forged longsword with a straight crossguard and a leather-wrapped grip, blade angled upward` |
| savasBaltasi | Savaş Baltası | `heavy two-handed war axe with a broad bearded blade and a long wooden haft` |
| avMizragi | Av Mızrağı | `long hunting spear with a leaf-shaped iron head and a bound wooden shaft` |

### Kalkan (sol el)

| anahtar | ad | {KONU} |
|---|---|---|
| yuvarlakKalkan | Yuvarlak Kalkan | `round wooden shield with an iron boss and painted knotwork rim` |
| demirKalkan | Demir Kalkan | `round shield fully plated in riveted iron, heavy and plain` |
| kuleKalkani | Kule Kalkanı | `tall rectangular tower shield of bound planks with iron bands top and bottom` |

### Zırh

| anahtar | ad | {KONU} |
|---|---|---|
| zincirZirh | Zincir Zırh | `chainmail shirt with short sleeves, hanging as if on an invisible stand` |
| aynaZirh | Ayna Zırh | `polished iron plate cuirass with a round mirror disc riveted at the chest` |
| pulZirh | Pul Zırh | `scale armour vest of overlapping iron lamellae on leather` |

### Miğfer

| anahtar | ad | {KONU} |
|---|---|---|
| boynuzluMigfer | Boynuzlu Miğfer | `iron helmet with two curved horns and a nose guard` |
| gozlukluMigfer | Gözlüklü Miğfer | `iron spectacle helmet with two rounded eye guards over the brow` |
| demirMigfer | Demir Miğfer | `plain heavy iron helmet with a nose guard and a chainmail neck curtain` |

### Pantolon

| anahtar | ad | {KONU} |
|---|---|---|
| deriPantolon | Deri Pantolon | `pair of thick leather trousers with cross-strapped shins` |
| zincirEtek | Zincir Etek | `chainmail skirt hanging from a wide leather belt` |
| zirhliPantolon | Zırhlı Pantolon | `armoured leg harness, leather trousers with riveted iron plates over the thighs and shins` |

### Ayakkabı

| anahtar | ad | {KONU} |
|---|---|---|
| kurtPostuCizme | Kurt Postu Çizme | `pair of tall leather boots wrapped in grey wolf fur at the top` |
| demirNalliCizme | Demir Nallı Çizme | `pair of heavy leather boots with iron plates and iron studs on the soles` |
| kutupTilkisiPostu | Kutup Tilkisi Postu | `pair of boots lined with thick white arctic fox fur` |

### Bileklik

| anahtar | ad | {KONU} |
|---|---|---|
| runBileklik | Rún Bilekliği | `wide leather bracer with iron rivets and carved rune marks burned into it` |
| gumusBileklik | Gümüş Bileklik | `heavy twisted silver arm ring with animal head terminals` |
| sifaTasi | Şifa Taşı | `smooth pale green healing stone bound in a leather wrist strap` |

### Kolye

| anahtar | ad | {KONU} |
|---|---|---|
| kurtDisiKolye | Kurt Dişi Kolye | `necklace of leather cord strung with large wolf teeth` |
| amberKolye | Amber Kolye | `necklace with a large polished amber pendant on a braided cord` |

### At (kar zeminli varyantı kullan)

| anahtar | ad | {KONU} |
|---|---|---|
| koyBeygiri | Köy Beygiri | `sturdy shaggy farm horse standing in profile, plain rope halter, worn pack saddle` |
| zirhliAt | Zırhlı At | `heavy warhorse standing in profile, covered in a plated iron barding and a caparison` |
| savasAti | Savaş Atı | `powerful muscular warhorse standing in profile, war saddle and studded leather chest strap` |
| fiyortMidillisi | Fiyort Midillisi | `small thick-coated fjord pony standing in profile, upright mane, simple bridle` |
| bozkirAti | Bozkır Atı | `lean fast steppe horse standing in profile, light saddle, long mane` |
| kuzeyRuzgari | Kuzey Rüzgârı | `pale grey horse standing in profile, long flowing mane and tail streaming in the wind, minimal tack` |

## D. Teslim ve entegrasyon

1. Beğendiğin görseli sohbete at, hangi anahtara ait olduğunu yaz
2. İşleme: kare kırpma + %80 küçültme + koyu vinyet (`pipeline.py`, binalarla aynı)
3. Dosya: `client/src/assets/items/<anahtar>.jpg`, orijinali `items/yedek/`
4. Kayıt: `client/src/components/itemArt.js` → `ITEM_IMAGE[<anahtar>]`
   (bina haritalarıyla karışmasın diye ayrı modül)

## E. Kabul kriteri

- Tek nesne mi? (model sık sık ikinci bir kopya veya zemin objesi ekliyor)
- Arka plan düz koyu mu, sahne kaçağı var mı?
- Işık yönü diğer eşyalarla aynı tarafta mı?
- Aynı slottaki üç eşya birbirinden ilk bakışta ayrılıyor mu?
  (özellikle üç miğfer ve üç kalkan)
