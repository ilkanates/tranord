/**
 * DÜNYANIN YAŞI — "oyun başlayalı ne kadar oldu?"
 *
 * İlkan: *"bulunan hammaddelerde serverın zamanına göre olmalı, oyun
 * başlayalı ne kadar olmuş gibi bir hesaptan yapılmalı. Item lvl'leri de
 * yine server zamanına göre hesaplansın: ilk ay Lvl 1'ler, ikinci ay
 * Lvl 2'ler düşmeye başlasın gibi."* ve *"oyun zamanına göre — yani oyun
 * 1× ise gerçekten 1 ay, ama 10× ise 3 gün."*
 *
 * ── ÖLÇÜ OYUN ZAMANI, GERÇEK ZAMAN DEĞİL ────────────────────────────
 *
 * Bu ayrım kuralın tamamı. Gerçek zamanı ölçseydik 10× bir sunucuda
 * oyuncular her şeyi on kat hızlı yaşarken eşya kademesi gerçek takvimi
 * bekler, dünya olgunlaşmışken hâlâ Lvl 1 eşya düşerdi. Oyun zamanı
 * hız çarpanını zaten içinde taşıyor: 1× sunucuda bir ay gerçekten bir
 * ay, 10× sunucuda üç gün.
 *
 * ── AY = 30 OYUN GÜNÜ ───────────────────────────────────────────────
 *
 * Takvim ayı (28/30/31) kullanmak, oyuncunun hiçbir zaman göremeyeceği
 * bir düzensizlik katardı. Otuz gün tek sayı, her yerde aynı.
 *
 * Bu dosya SAF KURAL: dünyanın yaşını nereden okuduğu çağıranın işi
 * (bkz. index.js · dunyaOyunSaati), burada yalnız yaştan ne çıktığı var.
 */

/** Bir oyun ayı kaç oyun saati — 30 gün */
const AY_SAAT = 30 * 24;

/** Oyun saatinden oyun ayına */
function oyunAyi(oyunSaati) {
  return Math.max(0, (Number(oyunSaati) || 0) / AY_SAAT);
}

/**
 * DÜŞEBİLECEK EN YÜKSEK EŞYA SEVİYESİ.
 *
 * İlkan'ın tarifi birebir: ilk ay yalnız Lvl 1, ikinci ay Lvl 2'ler de
 * düşmeye başlar, böyle gider. Tavan eşyanın kendi seviye sınırı
 * (esyaDeger · MAKS_SEVIYE) — dünya yaşlanınca bile onu aşamaz.
 *
 * NEDEN KADEMELİ: bütün seviyeler ilk günden düşseydi dünya
 * olgunlaştıkça "daha iyi eşya bulma" diye bir ilerleme kalmaz, açık
 * artırmada da fiyat farkı ilk haftada donardı. Kademe, eski oyuncunun
 * envanterine zamanla değer katıyor.
 */
function esyaSeviyeTavani(ay, maksSeviye) {
  const kademe = 1 + Math.floor(Math.max(0, ay));
  return Math.max(1, Math.min(maksSeviye, kademe));
}

/**
 * DÜŞEN EŞYANIN SEVİYESİ — tavana kadar, ALT SEVİYELERE AĞIRLIKLI.
 *
 * Düz kura olsaydı tavanın açıldığı gün eşyaların beşte biri anında en
 * üst seviyede düşerdi ve yükseltme diye bir iş kalmazdı. Karesi alınmış
 * zar alt seviyeleri ağırlıklandırıyor: üst seviye eşya bulmak bir olay
 * olarak kalıyor, yükseltme de anlamını koruyor.
 */
function dusenEsyaSeviyesi(ay, maksSeviye, rnd = Math.random) {
  const tavan = esyaSeviyeTavani(ay, maksSeviye);
  const r = rnd();
  return Math.max(1, Math.min(tavan, 1 + Math.floor(r * r * tavan)));
}

/**
 * MACERA HAMMADDE ÇARPANI — dünya yaşlandıkça ödül büyüyor.
 *
 * İlkan: *"bulunan hammaddelerde serverın zamanına göre olmalı."*
 * Sabit miktar ilk gün cömert, üçüncü ay gürültüydü: maxlı bir köy ham
 * kaynak başına saatte ~4.600 üretiyor, uzun maceranın sabit 600'ü
 * sekiz dakikalık üretim ediyordu.
 *
 * AY BAŞINA +1 KAT, ondan sonra doğrusal. Katlanan bir büyüme birkaç ay
 * sonra macerayı ekonominin tamamı hâline getirirdi; doğrusal artış
 * üretimin kendi büyümesiyle aynı mertebede kalıyor.
 *
 * TAVAN VAR: bir dünya yıllarca açık kalabilir ve tavansız bir çarpan
 * o dünyada macerayı sınırsız kılardı.
 */
const HAMMADDE_AY_BASINA = 1;
const HAMMADDE_TAVAN = 12;

function hammaddeCarpani(ay) {
  return Math.min(HAMMADDE_TAVAN, 1 + HAMMADDE_AY_BASINA * Math.max(0, ay));
}

module.exports = {
  AY_SAAT, HAMMADDE_AY_BASINA, HAMMADDE_TAVAN,
  oyunAyi, esyaSeviyeTavani, dusenEsyaSeviyesi, hammaddeCarpani,
};
