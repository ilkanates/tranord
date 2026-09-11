/**
 * PAZAR — NPC takası ve tüccar kapasitesi.
 *
 * İki ayrı iş var:
 *   1) NPC TAKASI — anında, tüccar harcamadan kaynak dönüştürme. Bedeli
 *      tüccar ya da süre değil, ORANIN KENDİSİ: her takas kaybettirir.
 *   2) TÜCCAR KAPASİTESİ — oyuncular arası gönderiler bunu kullanır.
 *      Tüccar sayısı = pazar seviyesi, her tüccar 2.000 taşır.
 *
 * ── ORANLARIN YÖNÜ ──────────────────────────────────────────────────
 * "1'e 2" bu dosyada "2 VER, 1 AL" demek. Ters yön oyunu bitirirdi:
 * 1 verip 2 alınsaydı odun → kil → odun döngüsü her turda ikiye katlardı.
 *
 * İŞLENMİŞ → HAM KASTEN YOK. Keresteci 8 odun → 6 kereste veriyor. NPC
 * `1 kereste → 2 odun` yapsaydı:
 *     8 odun --keresteci--> 6 kereste --NPC--> 12 odun   (+%50, sonsuz)
 * İşleme binaları kaynak ÜRETEN tek yer olduğu için o yönü açmak her
 * oranda bir döngü riski taşıyor; kapalı tutmak tek güvenli seçim.
 *
 * Ham → işlenmiş 4:1 ise işleme binalarının değerini korur: NPC kereste
 * başına 4 odun isterken keresteci 1,33 odun istiyor. Yani NPC her zaman
 * daha pahalı, bina anlamsızlaşmıyor. Un/ekmek için de aynı: değirmen+fırın
 * zinciri ekmek başına 1,67 tahıl, NPC 4 tahıl.
 */

const HAM = new Set(['odun', 'kil', 'tas', 'demir', 'tahil']);
const ISLENMIS = new Set(['kereste', 'tugla', 'yontmaTas', 'demirKulce', 'un', 'ekmek']);

/** Takasa girebilen bütün kaynaklar */
const TAKAS_KAYNAKLARI = [...HAM, ...ISLENMIS];

/** Her tüccarın taşıdığı miktar */
const TUCCAR_KAPASITESI = 2000;

/**
 * Kaç birim VERİLİR, 1 birim ALINIR.
 * null = bu yön kapalı (bkz. dosya başı — işlenmiş → ham).
 */
function takasOrani(veren, alan) {
  if (veren === alan) return null;
  const vHam = HAM.has(veren), aHam = HAM.has(alan);
  const vIsl = ISLENMIS.has(veren), aIsl = ISLENMIS.has(alan);
  if (!(vHam || vIsl) || !(aHam || aIsl)) return null;

  if (vHam && aHam) return 2;     // ham  -> ham       : 2 ver, 1 al
  if (vHam && aIsl) return 4;     // ham  -> işlenmiş  : 4 ver, 1 al
  if (vIsl && aIsl) return 2;     // işl. -> işlenmiş  : 2 ver, 1 al
  return null;                    // işl. -> ham       : KAPALI
}

/** Köydeki pazar binası (kurulmuş, seviye ≥ 1) */
function pazarBinasi(village) {
  return Object.values(village.villageBuildings || {})
    .find((b) => b.type === 'pazar' && b.level >= 1 && !b.building) || null;
}

/** Toplam tüccar sayısı — pazar seviyesi kadar. Pazar yoksa 0. */
function tuccarKapasitesi(village) {
  const p = pazarBinasi(village);
  return p ? p.level : 0;
}

/**
 * Şu an bağlı tüccarlar: açık tekliflerde bekleyenler + yolda olanlar.
 * Teklif AÇILIRKEN tüccar ayrılıyor, iptalde geri dönüyor — yoksa oyuncu
 * elindeki tek tüccarla on teklif açardı.
 */
function tuccarMesgul(village) {
  let n = 0;
  for (const t of village.teklifler || []) n += t.tuccar || 0;
  for (const g of village.gonderiler || []) n += g.tuccar || 0;
  return n;
}

function tuccarBos(village) {
  return Math.max(0, tuccarKapasitesi(village) - tuccarMesgul(village));
}

/** Bir miktar için kaç tüccar gerekir */
function gerekenTuccar(miktar) {
  return Math.ceil(Math.max(0, miktar) / TUCCAR_KAPASITESI);
}

/**
 * NPC TAKASI — anında dönüşüm.
 *
 * `miktar` VERİLEN kaynağın miktarı. Alınan = miktar / oran (aşağı yuvarlanır).
 * Depo tavanı çağıran tarafta uygulanıyor (caps) — taşan kısım hiç
 * verilmiyor, yani oyuncu kaynağını çöpe atmıyor.
 */
function npcTakas(village, veren, alan, miktar, caps, granaryCap) {
  const oran = takasOrani(veren, alan);
  if (!oran) return { ok: false, sebep: 'gecersiz_yon' };
  if (!pazarBinasi(village)) return { ok: false, sebep: 'pazar_yok' };

  const ver = Math.floor(Number(miktar) || 0);
  if (ver < oran) return { ok: false, sebep: 'miktar_az' };
  if ((village.resources[veren] || 0) < ver) return { ok: false, sebep: 'kaynak_yetersiz' };

  const alinacak = Math.floor(ver / oran);
  if (alinacak < 1) return { ok: false, sebep: 'miktar_az' };

  // Depoya sığmayan kısmı hiç alma — oyuncu boşa harcamasın
  const gida = alan === 'un' || alan === 'ekmek';
  const tavan = gida ? granaryCap : caps?.[alan];
  if (tavan != null) {
    const mevcut = gida
      ? (village.resources.un || 0) + (village.resources.ekmek || 0)
      : (village.resources[alan] || 0);
    const yer = Math.max(0, tavan - mevcut);
    if (alinacak > yer) return { ok: false, sebep: 'depo_dolu', sigan: yer };
  }

  const harcanan = alinacak * oran;        // yuvarlama artığını geri ver
  village.resources[veren] -= harcanan;
  village.resources[alan] = (village.resources[alan] || 0) + alinacak;
  return { ok: true, harcanan, alinan: alinacak, oran };
}

/**
 * Her kaynak için depoda kalan yer.
 *
 * İstemci bunu bilmeden "Takas et" düğmesini açık gösteriyordu: oyuncu
 * basıyor, sunucu `depo_dolu` diyor, ekranda hiçbir şey olmuyordu.
 * Tavanı istemciye de söyleyince düğme baştan kapanıyor.
 *
 * Un ve ekmek ambarı PAYLAŞIYOR — ikisinin toplamı granaryCap'i aşamaz,
 * o yüzden boş yer ikisi için de aynı sayı.
 */
function bosYerler(village, caps, granaryCap) {
  const r = village.resources || {};
  const gidaDolu = (r.un || 0) + (r.ekmek || 0);
  const out = {};
  for (const k of TAKAS_KAYNAKLARI) {
    const gida = k === 'un' || k === 'ekmek';
    const tavan = gida ? granaryCap : caps?.[k];
    out[k] = tavan == null ? null : Math.max(0, Math.floor(tavan - (gida ? gidaDolu : (r[k] || 0))));
  }
  return out;
}

/** İstemciye giden pazar özeti */
function pazarOzeti(village, caps, granaryCap) {
  const p = pazarBinasi(village);
  return {
    seviye: p ? p.level : 0,
    tuccarToplam: tuccarKapasitesi(village),
    tuccarBos: tuccarBos(village),
    tuccarKapasitesi: TUCCAR_KAPASITESI,
    kaynaklar: TAKAS_KAYNAKLARI,
    bosYer: bosYerler(village, caps, granaryCap),
  };
}

/* ══════════════════════════════════════════════════════════════════
   OYUNCULAR ARASI TEKLİFLER
   ══════════════════════════════════════════════════════════════════

   TEKLİF AÇILIRKEN MAL ve TÜCCAR AYRILIR.

   Yoksa aynı 2.000 odunla on teklif açılır, biri kabul edilince
   diğer dokuzu karşılıksız kalırdı. Açık teklifte duran mal köyün
   deposundan çıkmış sayılıyor; iptalde geri geliyor.

   TEKLİF SAHİBİNİN TÜCCARI da baştan ayrılıyor: kabul anında "tüccarım
   yokmuş" demek, karşı tarafın malını yolladıktan sonra sözü bozmak olurdu.

   KABUL EDEN kendi malını ve kendi tüccarını o an veriyor. İki gönderi
   birden yola çıkıyor; ikisi de mesafeye göre sürüyor.
*/

/** Bir teklifin taşınması için gereken tüccar (iki yön ayrı hesaplanır) */
function teklifTuccari(miktar) {
  return gerekenTuccar(miktar);
}

/** Teklif geçerli mi — oran serbest, ama kaynaklar takasa girebilmeli */
function teklifGecerliMi(veren, alan, verenMiktar, alanMiktar) {
  if (!TAKAS_KAYNAKLARI.includes(veren)) return 'gecersiz_kaynak';
  if (!TAKAS_KAYNAKLARI.includes(alan)) return 'gecersiz_kaynak';
  if (veren === alan) return 'ayni_kaynak';
  if (!(verenMiktar > 0) || !(alanMiktar > 0)) return 'miktar_sifir';
  return null;
}

module.exports = {
  HAM, ISLENMIS, TAKAS_KAYNAKLARI, TUCCAR_KAPASITESI,
  takasOrani, pazarBinasi, tuccarKapasitesi, tuccarMesgul, tuccarBos,
  gerekenTuccar, npcTakas, bosYerler, pazarOzeti,
  teklifTuccari, teklifGecerliMi,
};
