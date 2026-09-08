# Tranord — Bina Amblemleri / Prompt Seti

Hedef: 28 bina için tek stilde, dolu siluet, hex tepesinde 17–19 px'te okunan amblem.
Referans (onaylanan stil): zincir zırh amblemi — `client/src/assets/buildings/yedek/zirh_path.json`

## Üretim ayarları

- Modelde **Image Guidance → Style Reference** olarak onaylanan zırh ikonunu ver (ağırlık ~0.6)
- Mümkünse **aynı seed**'i sabitle; yoksa 28 ikon arasında çizgi/kütle dengesi kayar
- Çıktı 1:1, en az 512×512, **siyah şekil + saf beyaz zemin**
- PNG olarak indir (JPEG'in sıkıştırma kiri kenarları bozuyor)

## A. STİL KALIBI (her promptun başına aynen yapıştır)

```
Norse woodcarving style pictogram, solid filled black
silhouette on pure white background. Bold chunky mass
with angular chiseled edges, as if carved into wood or
engraved on a runestone. Negative space cut as thick
grooves and sharp wedges. No thin outlines, no
hairlines, no fine dot patterns, no shading, no
gradient, no grey, no background elements, no frame, no
circle badge. Single centered symbol filling most of
the frame with even margins, strong readable silhouette
at 20 pixels. Interior detail coarse and chunky only —
if a texture is needed use few LARGE thick elements,
never small repeating dots. Subject: {KONU}.
1:1 square, single icon only, no grid, no variations,
no text, no runes, no letters, no watermark.
```

## B. KONU LİSTESİ

| id | Bina | {KONU} |
|---|---|---|
| anaBina | Ana Bina | `a Norse longhouse with a curved roof and a dragon head gable post` |
| keresteci | Keresteci | `a stack of three thick cut planks with a saw blade behind them` |
| tuglaci | Tuğlacı | `a segment of brick wall, five large bricks only` |
| tasci | Taşçı | `a broad chisel over a large squared stone block` |
| demirci | Demirci | `a heavy hammer crossed over an anvil` |
| degirmen | Değirmen | `a water wheel with six thick paddles` |
| firin | Fırın | `a round bread loaf with two deep score cuts` |
| zirh | Zırhçı | ONAYLANDI — zincir zırh (referans ikon) |
| silahci | Silahçı | `a single upright broadsword with a straight crossguard` |
| ahir | Ahır | `a horse head in profile, thick neck, chunky mane` |
| kisla | Kışla | `a horned viking helmet, front view, solid nose guard` |
| atolye | Atölye | `a catapult in side view, thick throwing arm raised` |
| cephane | Cephanelik | `a spear and a sword crossed behind a round shield` |
| saglikCadiri | Sağlık Çadırı | `a mortar with a pestle standing in it` |
| hammaddeDepo | Hammadde Deposu | `a pile of three log ends beside two rough stones` |
| islenmisMalDepo | İşlenmiş Mal Deposu | `a closed wooden crate with two thick iron bands` |
| tahilAmbar | Tahıl Ambarı | `a bound sheaf of wheat, few thick stalks` |
| granary | Granary | `a tied grain sack, plain solid body` |
| pazar | Pazar | `a two pan balance scale` |
| loncaDemir | Demirciler Loncası | `an anvil alone, seen from the side` |
| loncaOdun | Oduncular Loncası | `two crossed felling axes` |
| loncaTas | Taşçılar Loncası | `a chisel over a squared stone block` |
| loncaKil | Kilciler Loncası | `a rounded clay pot with a wide rim` |
| loncaTahil | Tahılcılar Loncası | `a bound sheaf of wheat with a scythe behind it` |
| ev | Ev | `a small house with a steep roof and a chimney` |
| sur | Sur | `a palisade wall segment of five thick pointed logs` |
| hendek | Hendek | `a trench cut with three angled spikes on the far bank` |
| kule | Savunma Kulesi | `a square watchtower with a lookout platform and a roof` |

## C. NEGATIVE PROMPT (destekleyen modellerde)

```
thin lines, hairlines, outline style, line art, dots,
dot pattern, halftone, stipple, texture, gradient, grey,
shadow, 3d, perspective, photo, realistic, frame,
border, circle badge, background, text, letters, runes,
numbers, watermark, multiple icons, grid
```

## D. Teslim ve entegrasyon

1. Beğendiğin PNG'yi sohbete at (siyah/beyaz, kırpılmamış)
2. Vektörleştirme: OpenCV kontur + Douglas-Peucker sadeleştirme, 24×24 viewBox, `fill-rule="evenodd"`
3. Hedef yol uzunluğu **2.000–7.000 karakter**; üstüne çıkarsa tolerans artırılır
4. `client/src/components/Icons.jsx` → `FILLED` haritasına `<id>Amblem` olarak eklenir
5. `client/src/components/buildingArt.js` → `TEXTURE_EMBLEM` içinde bina id'sine bağlanır (`size` 17–19)

## E. Kabul kriteri

- 20 px'te siluet tanınıyor mu? (küçük önizleme ile kontrol edilir)
- İç detay 3'ten fazla kesik içermiyor mu?
- Kaynak PNG'de gri/anti-alias bulanıklık yok mu? (kontur kirliliği yapar)
