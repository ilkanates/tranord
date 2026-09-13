---
name: tranord-dongu
description: TraNord'da bir işi baştan sona bitirme döngüsü — TODO'dan koda, teste, tarayıcı doğrulamasına, yama notuna, commit ve deploy'a. İlkan onay beklemeden sıradaki maddeye geçilmesini istiyor; bu skill o döngünün adımlarını ve tuzaklarını tutuyor.
---

# TraNord — iş döngüsü

İlkan tek tek onay vermek istemiyor: **"bütün işleri tek tek yap, benden
onay beklemene gerek yok"**. Bir madde bitince deploy edilir ve sıradakine
geçilir. Bu skill o döngünün adımlarını ve daha önce düşülen tuzakları
tutuyor.

## Döngü

Her madde için sırayla:

1. **TODO.md'den al.** Madde yoksa önce yaz — İlkan'ın kuralı: yapılan her
   iş TODO'ya yazılır, bitince **Tamamlandı**'ya taşınır.
2. **Önce ÖLÇ, sonra düzelt.** Maddenin iddiası doğru mu? Birkaç kez
   TODO'daki teşhis yanlış çıktı (NPC açlığı üretilemedi; asıl sorun
   uyarının olmamasıydı). Yanlışsa bunu açıkça söyle, maddeyi ölçümle
   birlikte kapat.
3. **Uygula.** Kararın NEDENİNİ koda yorum olarak yaz — "ne yaptığını"
   değil, "neden böyle" ve "alternatifi neden olmadı".
4. **Test yaz.** Kararı kilitleyen test: sabit, sıra, yetkilendirme.
   `cd server && npm test` (≈4 dk, `--test-concurrency=1`).
5. **Lint.** `npx eslint .` — istemcide **taban 71 hata / 8 uyarı**,
   sunucuda **0 hata / 4 uyarı**. Sayı artmışsa senin eklediğindir.
6. **Tarayıcıda doğrula.** Aşağıdaki "Tarayıcı" bölümüne bak.
7. **Yama notu.** Oynanışa yansıyan her değişiklik
   `client/src/data/yamaNotlari.js`'e, **deploy'dan önce** (bkz.
   `tranord-yama-notu-yaz` hafızası). Refactor/test/lint girmez.
8. **TODO'yu güncelle** — madde Tamamlandı'ya, ölçümlerle birlikte.
9. **Commit.** Türkçe gövde, kararların gerekçesi, `Co-Authored-By`.
10. **Deploy.** `git push` + `ssh pi@100.99.69.108 "sudo tranord-guncelle"`.
    Servisin `active` olduğunu ve sağlık ucunun `{"ok":true}` döndüğünü gör.
11. **Sıradaki maddeye geç.** Onay bekleme.

## Ortam

| Ne | Nerede |
|---|---|
| Oyun sunucusu (yerel) | `cd server && node index.dev.js` → :3311 |
| İstemci (yerel) | vite :5180 (`preview_start` ile `tranord-client`) |
| Canlı | Pi 4, `ssh pi@100.99.69.108`, `sudo tranord-guncelle` |
| Yerel veri | `server/.dev-data.json` (silinince sıfırlanır) |

**Sunucu kodunu değiştirdiysen dev sunucuyu YENİDEN BAŞLAT.** Vite yalnız
istemciyi tazeliyor; `index.dev.js` eski kodla çalışmaya devam eder ve
"doğruladım" dediğin şey eski davranış olur — bu bir kez oldu, bina
yıkımının süresi hiç çalışmamışken çalışıyor sanıldı.

## Tarayıcı doğrulaması

- Dev menüsü (üst bar **TEST**): ordu ver, depoları doldur, binaları son
  seviyeye, surlu hedef köy, **oyun hızı** (128×'e kadar).
- Hızı yükseltip bekle, işin bitince **1×'e geri al** (kaydırıcının 2.
  adımı).
- `window.confirm` bu tarayıcıda kendiliğinden reddediliyor. Onay
  akışını denemek için geçici olarak `window.confirm = () => true`
  yaz — **ama sonra ne tıkladığına dikkat et**: bir kez böyle bir
  tıklama İlkan'ın Lvl 12 deposunu yıktı.
- Harita üzerinde köy bulmak zor; `document.querySelectorAll('svg image')`
  içinden `merkez2.png` olanların koordinatını alıp tıkla. Ekran çerçevesi
  ile CSS pikseli farklı olabilir: oran `800/window.innerWidth`.
- Ekranda doğrulayamadıysan **bunu söyle**. "Doğruladım" demeden önce
  gerçekten gördüğünden emin ol.

## Kod tuzakları

- **Çalışma kopyası CRLF.** Çok satırlı `String.replace` LF ile eşleşmez.
  Satır sonu farkını yok sayan yardımcıyı kullan (regex'e `\r?\n`).
- **Heredoc backslash yiyor.** `cat > x.js <<'JS'` içinde `\\` tek `\`
  oluyor; regex ve kaçış içeren dosyaları **Write** aracıyla yaz.
- **İkiz tanımlar.** `server/data/villageDefs.js` ↔
  `client/src/data/villageDefs.js`, hız/oran sabitleri
  (`koyKurallari.js` ↔ `flows.js`). Birini değiştirdiysen diğerini de;
  `test/tanim-ikizleri.test.js` bir kısmını yakalıyor.
- **Payload'a eklemeyi unutma.** `emitVillage`'da `opts` ile verilen alan
  `buildPayload` içinde payload nesnesine KOPYALANMAZSA istemciye hiç
  gitmez — `adVerilmedi` aylarca böyle sessizce ölü kaldı.
- **Anahtarlar kalıcı.** Birim/ekipman/görev anahtarları oyuncuların
  kaydında duruyor; görünen adı değiştir, anahtarı asla.
- **`client/dev/` üretime çıkmaz**, `client/public/` çıkar. Geliştirme
  sayfaları yalnız `client/dev/` altında (test bunu kilitliyor).
- **Hız çubuğu yalnız yerelde.** `TRANORD_DEV_CHEATS=1` Pi'ye asla
  eklenmez (bkz. `tranord-hiz-cubugu-sadece-local` hafızası).

## Sınırlar

- Sudo isteyen kurulum, şifre girme, gerçek ödeme: İlkan yapar.
- İlkan'ın YEREL kaydında yıkıcı bir şey yaptıysan (bina yıkma, kaynak
  sıfırlama) **söyle** — sessizce geçme.
- Bir kararı sen veremiyorsan işi durdurma: varsayımını yazıp devam et,
  sonunda "şunu şöyle varsaydım, değiştirmemi istersen" de.
