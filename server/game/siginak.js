/**
 * SIĞINAK — yağmadan kaçırılan hammadde.
 *
 * İlkan: *"hammaddeleri saklamak için sığınak yapılacak bina."*
 *
 * NEDEN VAR. Çevrimdışı bir oyuncu üst üste yağmalanınca sıfırlanıyor ve
 * oyuna dönecek kaynağı kalmıyor. Satılan bir oyunda "bir gün giremedim,
 * her şeyim gitti" en hızlı bırakma sebebi; sığınak yeni oyuncuyu oyunda
 * tutan tek mekanik.
 *
 * ── KİLİTLENEN KARARLAR ────────────────────────────────────────────
 *
 * 1) HER KAYNAK İÇİN AYRI, AYNI MİKTAR. Tek bir havuz da olabilirdi ama
 *    o zaman yalnız tahılını yağmalanan oyuncu bütün korumayı tahılda
 *    harcar, geri döndüğünde elinde bina yapacak kereste bulunmazdı.
 *    Ayrı ayrı olunca oyuncu HER KAYNAKTAN bir taban ile dönüyor —
 *    "yeniden başlayabilir" garantisi ancak böyle veriliyor.
 *
 * 2) İŞLENMİŞ MALLAR DA GİZLENİYOR. Yalnız hamı gizleseydik saldırgan
 *    değerli yarıyı (kereste, tuğla, külçe) tam olarak sıyırıp
 *    götürürdü ve binanın vaadi yarım kalırdı. Yağmalanabilen ne varsa
 *    aynı tabanı alıyor (bkz. army.js · LOOTABLE).
 *
 * 3) TEK SIĞINAK. Travian'da birden fazla kurulabiliyor ve yağmayı
 *    tamamen öldürüyor — köyünü sığınakla dolduran oyuncudan hiçbir şey
 *    alınamıyor. Burada `unique` ve `repeatableWhenMaxed` yok.
 *
 * 4) KAPASİTE DOĞRUSAL. Depolarla aynı dil (taban + seviye başına), çünkü
 *    oyuncu bu binayı depolarla karşılaştırarak okuyor. Katlanan bir eğri
 *    geç oyunda hazineyi dokunulmaz yapardı.
 *
 * 5) GİZLENEN MİKTAR İSTİHBARAT SIZDIRMAZ. Ne saldırganın raporu ne de
 *    keşif raporu "şu kadarını sakladı" demiyor; ikisi de yalnız
 *    GÖRÜNEN kısmı gösteriyor. Aksi hâlde saldırgan sığınağın seviyesini
 *    çıkarır ve bina bir bilgi sızıntısına dönerdi.
 *
 * Sığınağın kendisi mancınıkla yıkılabiliyor (kusatma.js · vurulabilirler
 * sur ve hendek dışındaki her yapıyı hedefliyor) — yoksa savunmanın
 * cevabı olmayan bir duvar olurdu.
 */

/** Yapı yıkılırken/yükselirken bile geçerli: seviye 0 ise gizleme yok */
function siginakSeviyesi(village) {
  let enYuksek = 0;
  for (const b of Object.values(village?.villageBuildings || {})) {
    if (b?.type === 'siginak') enYuksek = Math.max(enYuksek, b.level || 0);
  }
  return enYuksek;
}

/**
 * BİR KAYNAKTAN NE KADARI GİZLİ.
 *
 * Tek cümle: yağma hesabı da keşif raporu da arayüz de buradan okuyor.
 * İki yere yazılsaydı kaçınılmaz olarak ayrışırdı — bu depoda defalarca
 * oldu (fiyatlar, takas oranı, nüfus tavanı).
 */
function gizlenen(village, defs) {
  const seviye = siginakSeviyesi(village);
  if (seviye <= 0) return 0;
  const d = defs?.siginak;
  if (!d) return 0;
  return Math.max(0, Math.round(
    (d.baseCapacity || 0) + (seviye - 1) * (d.capacityPerLevel || 0)));
}

/**
 * YAĞMACININ GÖREBİLDİĞİ MİKTAR — gerçek stok eksi gizlenen.
 *
 * Sıfırın altına düşmüyor: sığınağı deposundan büyük olan oyuncunun
 * kaynağı eksiye dönmemeli, sadece tamamen gizlenmeli.
 */
function gorunen(miktar, gizli) {
  return Math.max(0, Math.floor(miktar || 0) - Math.max(0, gizli || 0));
}

module.exports = { siginakSeviyesi, gizlenen, gorunen };
