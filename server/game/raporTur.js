/**
 * raporTur — bir raporun HANGİ TÜRDEN olduğunu söyleyen tek cümle.
 *
 * Bu ayrım eskiden yalnız istemcide (ReportScreen.jsx) duruyordu ve orada
 * kalamazdı: sayfalama gelince "SALDIRI" filtresinin kaç sonucu olduğunu
 * ve o filtrenin kaçıncı sayfaya kadar sürdüğünü SUNUCU bilmek zorunda —
 * istemcinin elinde artık raporların yalnız bir sayfası var.
 *
 * Aynı kuralı iki yere yazmamak için istemci artık kendi listesini
 * tutmuyor: her rapora `kesif` bayrağı buradan iliştiriliyor (bkz.
 * index.js · tumRaporlar) ve arayüz o bayrağı okuyor. Kural tek yerde,
 * eski raporlar için de çalışıyor — bayrak kaydedilmiyor, `outcome`'dan
 * her seferinde türetiliyor.
 */

/**
 * KEŞİF SAYILAN SONUÇLAR.
 *
 *   kesif             izcim karşı köyü gördü
 *   kesif_basarisiz   izcim yakalandı, bilgi getiremedi
 *   kesfedildim       benim köyüm keşfedildi
 *   kesif_engellendi  izcilerim casusu durdurdu
 */
const KESIF_SONUCLARI = new Set([
  'kesif', 'kesif_basarisiz', 'kesfedildim', 'kesif_engellendi',
]);

const kesifMi = (r) => KESIF_SONUCLARI.has(r?.outcome);

/**
 * FİLTRE ANAHTARLARI — arayüzdeki sekmelerle birebir.
 *
 * Keşif raporları saldırı/savunma sekmelerinden DIŞLANIYOR: izci
 * gönderdiğim her köy "saldırılarım" listesini doldursaydı gerçek
 * saldırılarımı arar hâle gelirdim.
 */
const FILTRELER = {
  all: () => true,
  out: (r) => r.dir === 'out' && !kesifMi(r),
  in: (r) => r.dir === 'in' && !kesifMi(r),
  scout: (r) => kesifMi(r),
};

/** Bilinmeyen anahtar her şeyi döndürüyor — filtre bir gezinme aracı, hata kapısı değil */
function filtrele(raporlar, filtre = 'all') {
  const kural = FILTRELER[filtre] || FILTRELER.all;
  return raporlar.filter(kural);
}

/** Dört sekmenin de sayısı — TÜM raporlar üzerinden, sayfa üzerinden değil */
function sayilar(raporlar) {
  const s = { all: raporlar.length, out: 0, in: 0, scout: 0 };
  for (const r of raporlar) {
    if (FILTRELER.out(r)) s.out += 1;
    else if (FILTRELER.in(r)) s.in += 1;
    if (FILTRELER.scout(r)) s.scout += 1;
  }
  return s;
}

module.exports = { KESIF_SONUCLARI, kesifMi, FILTRELER, filtrele, sayilar };
