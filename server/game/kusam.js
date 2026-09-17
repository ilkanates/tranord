/**
 * KUŞAM — eşya kuşanma, çıkarma ve bonusların toplanması.
 *
 * İlkan'ın özel isteği: *"itemler tek tek birimlerin saldırı ve def
 * puanlarını arttırabilsin"*. Bu dosyanın asıl işi o: envanterdeki
 * eşyaları iki ayrı bonus kanalına çevirmek.
 *
 * TEMEL KARARLAR
 *
 * 1) İKİ KANAL: kahramanın kendisine (can, saldırı, iyileşme, macera
 *    hızı, ganimet) ve ORDUYA (birim SINIFLARININ saldırı/savunma
 *    yüzdesi). İkisini tek sayıya toplamak, oyuncunun eşya seçimini
 *    anlamsızlaştırırdı.
 *
 * 2) ORDU BONUSU EKİPMAN HAVUZUNDAN AYRI. Aynı yerden geçseydi kılıç/
 *    kalkan seviyelerinin dengesi bozulur ve oyuncu hangi sistemin ne
 *    yaptığını ayırt edemezdi.
 *
 * 3) NADİRLİK ÖLÇEKLER, YENİ ETKİ EKLEMEZ. "Efsane kılıç"ın sıradan
 *    kılıçtan farkı sayının büyüklüğü; farklı bir etki olsaydı her
 *    nadirlik ayrı bir eşya gibi öğrenilmek zorunda kalırdı.
 *
 * 4) ENVANTER DİZİ. Aynı eşyanın farklı nadirlikleri ayrı ayrı
 *    durabilmeli ve oyuncu hangisini kuşanacağına karar verebilmeli.
 */
const { HERO_SLOTS, HERO_ITEMS, NADIRLIK, KULLANILABILIR } = require('../data/heroItemDefs');
const DEGER = require('./esyaDeger');

/**
 * EŞYANIN TOPLAM ÇARPANI — nadirlik × seviye.
 *
 * Tek cümle, üç yer okuyor (bonus toplama, envanter özeti, kuşanılan
 * özeti). Üçüne ayrı ayrı yazsaydık biri seviyeyi unutur ve ekrandaki
 * sayı savaştakiyle tutmazdı.
 */
function esyaCarpani(esya) {
  return NADIRLIK[esya.nadirlik].carpan * DEGER.seviyeCarpani(esya);
}

/** Envanter girdisi geçerli mi (bilinmeyen anahtar kayıttan gelmiş olabilir) */
function gecerli(giris) {
  return !!(giris && HERO_ITEMS[giris.key] && NADIRLIK[giris.nadirlik]);
}

/**
 * EŞYA KUŞAN — envanterdeki `indeks` numaralı eşyayı slotuna tak.
 *
 * Slotta eşya varsa TAKAS ediliyor: eskisi envantere dönüyor. Reddetmek
 * oyuncuyu "önce çıkar, sonra tak" iki adımına zorlardı; sürükle-bırak
 * arayüzünde bu iki adım hiç beklenmiyor.
 */
function kusan(k, indeks) {
  if (!k || !k.var) return { ok: false, sebep: 'kahraman_yok' };
  const env = Array.isArray(k.envanter) ? k.envanter : [];
  const giris = env[indeks];
  if (!gecerli(giris)) return { ok: false, sebep: 'esya_yok' };

  const slot = HERO_ITEMS[giris.key].slot;
  // Kullanılabilir eşya (iksir) kuşanılmaz — çantada durur, KULLANILIR
  if (!slot) return { ok: false, sebep: 'kusanilmaz' };
  if (!HERO_SLOTS[slot]) return { ok: false, sebep: 'slot_yok' };

  const eski = (k.kusanilan || {})[slot] || null;
  env.splice(indeks, 1);
  (k.kusanilan ||= {})[slot] = { key: giris.key, nadirlik: giris.nadirlik };
  if (eski) env.push(eski);
  k.envanter = env;
  return { ok: true, slot, takilan: giris, cikan: eski };
}

/** EŞYA ÇIKAR — slottaki eşyayı envantere geri koy. */
function cikar(k, slot) {
  if (!k || !k.var) return { ok: false, sebep: 'kahraman_yok' };
  if (!HERO_SLOTS[slot]) return { ok: false, sebep: 'slot_yok' };
  const esya = (k.kusanilan || {})[slot];
  if (!esya) return { ok: false, sebep: 'slot_bos' };
  delete k.kusanilan[slot];
  (k.envanter ||= []).push(esya);
  return { ok: true, slot, cikan: esya };
}

/**
 * EŞYA AT — kalıcı olarak sil.
 *
 * Envanter sınırsız olsaydı yüzlerce sıradan eşya birikir ve ekran
 * kullanılamaz hâle gelirdi. Silme oyuncunun kararı; sunucu envanteri
 * kendi başına budamıyor — bir oyuncunun eşyasını sessizce yok etmek
 * satılan bir oyunda kabul edilemez.
 */
function at(k, indeks) {
  if (!k || !k.var) return { ok: false, sebep: 'kahraman_yok' };
  const env = Array.isArray(k.envanter) ? k.envanter : [];
  if (!gecerli(env[indeks])) return { ok: false, sebep: 'esya_yok' };
  const [atilan] = env.splice(indeks, 1);
  k.envanter = env;
  return { ok: true, atilan };
}

/**
 * KULLANILABİLİR EŞYAYI ÇANTADAN DÜŞ.
 *
 * Ne yaptığını çağıran biliyor (index.js: iksir kahramanı diriltiyor);
 * bu dosyanın işi yalnız envanteri doğru tutmak.
 */
function kullan(k, key) {
  if (!k || !k.var) return { ok: false, sebep: 'kahraman_yok' };
  if (!KULLANILABILIR.has(key)) return { ok: false, sebep: 'kullanilamaz' };
  const env = Array.isArray(k.envanter) ? k.envanter : [];
  const i = env.findIndex(e => e && e.key === key);
  if (i < 0) return { ok: false, sebep: 'esya_yok' };
  const [kullanilan] = env.splice(i, 1);
  k.envanter = env;
  return { ok: true, kullanilan };
}

/**
 * KAHRAMAN SÜVARİ Mİ? — at slotunda bir eşya varsa evet.
 *
 * Savaşta ham gücünün piyadeye mi süvariye mi yazılacağını bu belirliyor
 * (İlkan'ın kararı: "kahraman atlı ise atlı gibi vursun, at yoksa yaya
 * askeri gibi"). At slotunun dolu olması tek ölçü — ayrı bir bayrak
 * tutmak, eşya çıkarılınca unutulabilecek ikinci bir gerçek olurdu.
 */
function suvariMi(k) {
  return gecerli((k?.kusanilan || {}).at);
}

/** Çantada bu kullanılabilir eşyadan var mı? */
function elindeVarMi(k, key) {
  return (Array.isArray(k?.envanter) ? k.envanter : []).some(e => e && e.key === key);
}

/**
 * KUŞANILAN EŞYALARIN TOPLAM BONUSU.
 *
 * @returns {{kahraman:object, birim:object}}
 *   kahraman: { saldiri, can, iyilesme, maceraHizi, ganimet }
 *   birim:    { piyade:{saldiri,savunma}, suvari:{saldiri,savunma} } — YÜZDE
 *
 * Birim bonusu YÜZDE: düz sayı olsaydı 10 askerlik orduda devasa,
 * 1000 askerlik orduda görünmez olurdu.
 */
function kusamBonuslari(k) {
  const out = {
    kahraman: {
      saldiri: 0, can: 0, zirhlanma: 0, hiz: 0,
      iyilesme: 0, maceraHizi: 0, ganimet: 0,
    },
    birim: { piyade: { saldiri: 0, savunma: 0 }, suvari: { saldiri: 0, savunma: 0 } },
  };
  if (!k || !k.var) return out;

  for (const [slot, esya] of Object.entries(k.kusanilan || {})) {
    if (!HERO_SLOTS[slot] || !gecerli(esya)) continue;
    const def = HERO_ITEMS[esya.key];
    const carpan = esyaCarpani(esya);

    for (const [alan, taban] of Object.entries(def.kahramanBonus || {})) {
      if (alan in out.kahraman) out.kahraman[alan] += taban * carpan;
    }
    for (const [sinif, bonus] of Object.entries(def.birimBonus || {})) {
      if (!out.birim[sinif]) continue;
      for (const [tur, taban] of Object.entries(bonus)) {
        if (tur in out.birim[sinif]) out.birim[sinif][tur] += taban * carpan;
      }
    }
  }

  // Kesir birikmesin — arayüzde 6,000000000001 gibi sayılar görünmesin
  const yuvarla = (n) => Math.round(n * 10) / 10;
  for (const key of Object.keys(out.kahraman)) out.kahraman[key] = yuvarla(out.kahraman[key]);
  for (const sinif of Object.keys(out.birim)) {
    for (const tur of Object.keys(out.birim[sinif])) {
      out.birim[sinif][tur] = yuvarla(out.birim[sinif][tur]);
    }
  }
  return out;
}

/** Envanteri istemciye gidecek biçime çevir (ad, slot, bonus özeti) */
function envanterOzeti(k) {
  // Eski kayıtta envanter SÖZLÜK olabiliyor — kahraman.js · duzelt bunu
  // düzeltiyor ama okuma yolu tek başına da sağlam kalmalı
  const env = Array.isArray(k?.envanter) ? k.envanter : [];
  return env.map((giris, i) => {
    if (!gecerli(giris)) return null;
    const def = HERO_ITEMS[giris.key];
    const n = NADIRLIK[giris.nadirlik];
    return {
      indeks: i, key: giris.key, nadirlik: giris.nadirlik,
      /*
        SEVİYE ve BEDEL PAKETTE: yükseltme düğmesi "kaç gümüş" ve
        "daha yükselebilir mi" sorularını sunucuya sormadan
        cevaplayabilmeli, yoksa her eşya için ayrı tur atılırdı.
      */
      seviye: DEGER.seviye(giris),
      maksSeviye: DEGER.MAKS_SEVIYE,
      yukseltmeBedeli: DEGER.yukseltmeBedeli(giris),
      yukseltmeEngeli: DEGER.yukseltilebilirMi(giris),
      tabanFiyat: DEGER.tabanFiyat(giris),
      ad: giris.nadirlik === 'siradan' ? def.ad : `${n.ad} ${def.ad}`,
      slot: def.slot, slotAd: def.slot ? (HERO_SLOTS[def.slot]?.ad || def.slot) : null,
      kullanilir: KULLANILABILIR.has(giris.key),
      ikon: def.ikon, renk: n.renk, carpan: n.carpan,
      aciklama: def.aciklama,
      kahramanBonus: olcekle(def.kahramanBonus, esyaCarpani(giris)),
      birimBonus: olcekleIc(def.birimBonus, esyaCarpani(giris)),
    };
  }).filter(Boolean);
}

function olcekle(obj, carpan) {
  if (!obj) return null;
  const out = {};
  for (const [k2, v] of Object.entries(obj)) out[k2] = Math.round(v * carpan * 10) / 10;
  return out;
}
function olcekleIc(obj, carpan) {
  if (!obj) return null;
  const out = {};
  for (const [k2, v] of Object.entries(obj)) out[k2] = olcekle(v, carpan);
  return out;
}

/** Kuşanılanların istemci biçimi — slot → eşya özeti */
function kusanilanOzeti(k) {
  const out = {};
  for (const [slot, esya] of Object.entries(k?.kusanilan || {})) {
    if (!gecerli(esya)) continue;
    const def = HERO_ITEMS[esya.key];
    const n = NADIRLIK[esya.nadirlik];
    out[slot] = {
      key: esya.key, nadirlik: esya.nadirlik,
      seviye: DEGER.seviye(esya),
      ad: esya.nadirlik === 'siradan' ? def.ad : `${n.ad} ${def.ad}`,
      ikon: def.ikon, renk: n.renk, aciklama: def.aciklama,
      kahramanBonus: olcekle(def.kahramanBonus, esyaCarpani(esya)),
      birimBonus: olcekleIc(def.birimBonus, esyaCarpani(esya)),
    };
  }
  return out;
}

module.exports = {
  kusan, cikar, at, kullan, elindeVarMi, suvariMi, esyaCarpani,
  kusamBonuslari, envanterOzeti, kusanilanOzeti,
  HERO_SLOTS, HERO_ITEMS, NADIRLIK,
};
