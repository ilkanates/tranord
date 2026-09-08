# Tranord — Bina Görselleri / Leonardo AI Prompt Seti

Hedef: her bina için 1 adet hex karo görseli (1:1, 1024×1024), 3/4 izometrik, yeşil fjord yazı paleti.

## Leonardo ayarları
- Model: **Leonardo Phoenix 1.0** (alternatif: Lightning XL)
- Preset Style: **3D Render** veya **Illustration**
- Alchemy: ON · Contrast: Medium · Guidance: 7 · Boyut: 1024×1024
- Transparency: **Foreground only** (Phoenix destekliyor) — yoksa düz arka planla üret, sonra hex maskesiyle kes.
- **Tutarlılık için:** ilk beğendiğin karoyu kaydet, sonraki tüm üretimlerde **Image Guidance → Style Reference** olarak ver (ağırlık ~0.5) ve mümkünse **aynı seed**'i sabitle.

---

## A. STİL ÖNEKİ (her promptun başına aynen yapıştır)

```
isometric hexagonal game tile, 3/4 top-down view, single centered hexagon ground plate with subtle beveled edge,
stylized hand-painted 3D render, Norse Viking Age architecture, dark stained timber beams, turf sod roofs with green grass,
carved dragon-head and runic wood details, mossy granite foundations,
summer fjord palette: moss green grass, weathered oak brown, slate grey stone, warm ochre, muted iron accents,
soft warm daylight from upper left, gentle ambient occlusion, crisp readable silhouette,
clean plain neutral background, game asset, no text, no UI, 1:1 square composition —
SUBJECT: {buraya bina satırı}
```

## B. NEGATIVE PROMPT (hepsinde aynı)

```
text, letters, numbers, watermark, logo, UI elements, frame, border, people, characters, animals in foreground,
photorealistic, blurry, low contrast, cluttered, multiple tiles, grid of tiles, split image, cropped edges,
harsh perspective, snow, ice, winter, modern buildings, fantasy neon, oversaturated
```

---

## C. KAYNAK ALANLARI (üretim hex'leri — 5 adet)

| id | Bina | SUBJECT satırı | Dosya |
|---|---|---|---|
| orman | Orman | `dense Nordic pine and birch grove on the hex, felled logs stacked at the edge, a chopping stump with an axe buried in it, forest floor of moss and ferns` | orman.png |
| tas | Taş Ocağı | `open granite quarry cut into the hex, stepped rock terraces, squared stone blocks ready for hauling, a wooden sled and rope crane, grey dust and scattered rubble` | tas.png |
| kil | Kil Ocağı | `terraced clay pit with reddish-brown wet clay banks, shallow water pooling at the bottom, wooden buckets and a plank ramp, shovel stuck in the clay` | kil.png |
| demir | Demir Madeni | `rocky iron ore outcrop with a timber-framed mine entrance, dark ore chunks piled outside, a small wooden ore cart on plank rails, rust-red streaks in the stone` | demir.png |
| tarla | Tarla | `golden barley field in neat rows filling the hex, low split-rail wooden fence, a few bundled sheaves, straw scarecrow at the edge` | tarla.png |

## D. MERKEZ

| id | Bina | SUBJECT satırı | Dosya |
|---|---|---|---|
| anaBina | Ana Bina | `great Norse longhouse mead hall, long curved turf roof, carved dragon-head gable posts, heavy timber doors, hanging shields along the wall, smoke from a roof vent, small banner poles at the entrance` | anaBina.png |

## E. İŞLEME BİNALARI

| id | Bina | SUBJECT satırı | Dosya |
|---|---|---|---|
| keresteci | Keresteci | `timber sawmill shed with an open side, large water wheel driving a frame saw, stacked cut planks and sawdust piles, raw logs waiting on a ramp` | keresteci.png |
| tuglaci | Tuğlacı | `brick kiln of stacked clay and stone, tall smoking chimney, arched fire mouth glowing orange, pallets of drying red bricks under a wooden lean-to` | tuglaci.png |
| tasci | Taşçı | `open stonemason workshop under a turf roof, half-carved runestone on trestles, chisels and mallets on a bench, squared stone blocks and stone chips around` | tasci.png |
| demirci | Demirci | `iron smelter hut with a tall clay bloomery furnace glowing orange, bellows on the side, rows of iron ingot molds cooling, charcoal heap and dark slag` | demirci.png |
| degirmen | Değirmen | `stone and timber watermill with a turning wheel in a small millrace, turf roof, sacks of flour stacked by the door, millstone leaning against the wall` | degirmen.png |
| firin | Fırın | `stone dome bread oven attached to a small timber bakehouse, warm firelight in the oven mouth, wooden peel and loaves cooling on a rack, flour dusted table` | firin.png |

## F. ASKERİ BİNALAR

| id | Bina | SUBJECT satırı | Dosya |
|---|---|---|---|
| zirh | Zırhçı | `armorer workshop, round Viking shields painted red and blue hanging on the wall, a mail hauberk on a wooden stand, riveting bench with rings and tongs` | zirh.png |
| silahci | Silahçı | `weaponsmith forge with an anvil under a covered porch, rack of swords and spears, quench barrel steaming, hammer and tongs on the block` | silahci.png |
| ahir | Ahır | `long timber stable with open stalls, hay loft above, bales and a water trough outside, saddles and bridles hanging on the beam, fenced paddock corner` | ahir.png |
| kisla | Kışla | `barracks longhouse with a small training yard, spear rack and straw practice dummies, round shields leaning on the wall, campfire ring` | kisla.png |
| atolye | Atölye | `siege engine workshop, open timber frame hall, a half-built catapult and a ram beam on trestles, coiled ropes, heavy beams and wooden gears` | atolye.png |
| cephane | Cephanelik | `fortified armory storehouse of heavy timber and stone, iron-banded door, racks of spears and shields visible through the opening, weapon crates stacked outside` | cephane.png |
| saglikCadiri | Sağlık Çadırı | `healer's tent of pale canvas over a wooden frame, drying herb bundles hanging at the entrance, a cauldron over a small fire, clay jars and clean linen on a bench` | saglikCadiri.png |

## G. DEPOLAR

| id | Bina | SUBJECT satırı | Dosya |
|---|---|---|---|
| hammaddeDepo | Hammadde Deposu | `open-sided timber storage shed, piles of raw logs, unhewn stone, clay and iron ore sorted into wooden bays, turf roof on stout posts` | hammaddeDepo.png |
| islenmisMalDepo | İşlenmiş Mal Deposu | `closed timber warehouse with double doors, stacked crates, sealed barrels and bundled planks, iron ingots on a pallet, tally board mark-free plain wood` | islenmisMalDepo.png |
| tahilAmbar | Tahıl Ambarı | `raised Norse stabbur granary on thick stilts with round rat-guards, short ladder to the door, turf roof, grain sacks at the base` | tahilAmbar.png |
| granary | Granary (Ekmek/Erzak Deposu) | `stone-walled provision cellar with a low turf-covered roof and a timber door, bread loaves in baskets and hanging provisions inside, barrels by the entrance` | granary.png |

## H. EKONOMİK BİNALAR
> Loncaların hepsi **aynı gövde** (küçük ahşap lonca salonu) + farklı **amblem** ve malzeme rengi. Silüetleri kasten benzer olsun.

| id | Bina | SUBJECT satırı | Dosya |
|---|---|---|---|
| pazar | Pazar | `open market square with striped canvas awnings over wooden stalls, trade goods in baskets and open sacks, scales on a counter, a small cart with barrels` | pazar.png |
| loncaDemir | Demirciler Loncası | `small timber guild hall with turf roof and a carved wooden sign board showing a hammer and anvil emblem, dark iron fittings on the door, iron grey accents` | loncaDemir.png |
| loncaOdun | Oduncular Loncası | `small timber guild hall with turf roof and a carved sign board showing crossed axes emblem, fresh-cut log seats outside, warm honey-toned timber accents` | loncaOdun.png |
| loncaTas | Taşçılar Loncası | `small timber guild hall on a stone plinth, turf roof, carved sign board showing a chisel and stone block emblem, grey granite accents` | loncaTas.png |
| loncaKil | Kilciler Loncası | `small timber guild hall with turf roof, carved sign board showing a clay pot emblem, red-brown brick chimney and pottery lined up on a shelf outside` | loncaKil.png |
| loncaTahil | Tahılcılar Loncası | `small timber guild hall with turf roof, carved sign board showing a wheat sheaf emblem, grain sacks and a scythe leaning by the door, golden ochre accents` | loncaTahil.png |

## I. NÜFUS

| id | Bina | SUBJECT satırı | Dosya |
|---|---|---|---|
| ev | Ev | `cluster of two or three small turf-roofed cottages with low stone walls, a wooden fence, drying laundry line, firewood stack, tiny vegetable patch` | ev.png |

## J. SAVUNMA

| id | Bina | SUBJECT satırı | Dosya |
|---|---|---|---|
| sur | Sur | `defensive rampart segment following the hexagon edge, stone base with a sharpened timber palisade above, wooden walkway and a small gate, hexagon interior left as plain grass` | sur.png |
| hendek | Hendek | `earthen defensive ditch ring following the hexagon edge, dark water at the bottom, sharpened stakes angled outward, raised soil bank with grass, hexagon interior left as plain grass` | hendek.png |
| kule | Savunma Kulesi | `square watchtower of stone base and timber upper floors, turf roof, open lookout platform with a railing, ladder and a signal brazier on top` | kule.png |

---

## K. Üretim sırası önerisi
1. Önce **anaBina** üret → stil referansı olarak sabitle.
2. Kaynak alanları (5) → harita zemininin tonunu bu 5 karo belirler.
3. Loncaları peş peşe üret (aynı seed) → aile benzerliği korunsun.
4. Sur / hendek karolarında hex kenarı boş kalmalı; kesimde kenarın taşmadığını kontrol et.

## L. Kesim / entegrasyon notu
- Üretilen 1024×1024 kareyi hex maskesiyle kes (flat-top mı pointy-top mı — oyundaki hex yönüne göre tek maske hazırla, hepsine uygula).
- Oyunda hex yarıçapı 60 → 128×128 veya 256×256 PNG yeterli; retina için 256 öner.
