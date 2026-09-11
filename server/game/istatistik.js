/**
 * İSTATİSTİK — dünya sıralamaları.
 *
 * İKİ KURAL BU DOSYAYI BELİRLİYOR:
 *
 * 1) SIRALAMA OYUNCUYA GÖRE, KÖYE GÖRE DEĞİL.
 *    Eskiden her köy ayrı bir satırdı: iki köyü olan oyuncu listede iki
 *    kez görünüyor ve ikisi de kendi başına küçük kaldığı için gerçek
 *    gücü hiçbir yerde okunmuyordu. Artık bir oyuncunun bütün köyleri
 *    toplanıp TEK satır oluyor. Tek istisna "En büyük köy": o tabloda
 *    ölçülen şey zaten tek bir köy.
 *
 * 2) ORDU BİLGİSİ SIRALAMADA YOK.
 *    Asker sayısı, saldırı ve savunma gücü tablolarını kaldırdık. Bir
 *    oyuncunun kaç askeri olduğu bedava öğrenilecek bir şey değil —
 *    öğrenmenin yolu izci göndermek. Sıralamada duran her kalem ya
 *    herkese açık (nüfus, toprak, bina) ya da zaten olmuş bitmiş bir
 *    olayın sonucu (öldürülen asker, getirilen ganimet).
 *
 * NPC'ler sıralamaya girmiyor: burası oyuncu tablosu. NPC köyleri
 * haritada zaten puanıyla görünüyor.
 */

/** Bir köyün üretim tarlası sayısı — "alan" ölçüsü */
function tarlaSayisi(village) {
  return Object.keys(village.productionTiles || {}).length;
}

/** Bina + tarla seviyelerinin toplamı — köyün ne kadar geliştiği */
function seviyeToplami(village) {
  return Object.values(village.villageBuildings || {})
    .reduce((s, b) => s + (b.level || 0), 0)
    + Object.values(village.productionTiles || {})
      .reduce((s, b) => s + (b.level || 0), 0);
}

/**
 * KÖY BÜYÜKLÜĞÜ — bina seviyeleri + nüfus.
 *
 * Eski formülde `army * 3` vardı; bu, ordu tablosunu kaldırsak bile
 * asker sayısını sıralamadan geri sızdırırdı (iki köyün puan farkından
 * ordu tahmin edilebilir). Ordu artık hesaba hiç girmiyor.
 */
function koyPuani(village) {
  return seviyeToplami(village) * 10 + (village.population || 0);
}

/**
 * Bir oyuncunun bütün köylerinden toplanan ölçüler.
 * @param {Array<{v: object, slotKey: string, adi: string}>} koyler
 */
function oyuncuOlculeri(koyler) {
  const t = {
    population: 0, land: 0, killsOffense: 0, killsDefense: 0, lootTotal: 0,
    koySayisi: 0,
  };
  for (const k of koyler) {
    const v = k?.v;
    if (!v) continue;
    const st = v.stats || {};
    t.population += v.population || 0;
    t.land += tarlaSayisi(v);
    t.killsOffense += st.killsOffense || 0;
    t.killsDefense += st.killsDefense || 0;
    t.lootTotal += st.lootTotal || 0;
    t.koySayisi += 1;
  }
  return t;
}

/**
 * Tabloların SIRASI oyuncunun umursadığı sıra: önce büyüme (nüfus),
 * sonra savaş (saldırı, savunma, yağma), sonra toprak ve tek köy.
 */
const TABLOLAR = [
  { key: 'population',   label: 'En büyük nüfus',  icon: 'nufus',  unit: 'kişi',
    desc: 'Bütün köylerinde yaşayan toplam kişi' },
  { key: 'killsOffense', label: 'En iyi saldıran', icon: 'kilic',  unit: 'asker',
    desc: 'Saldırılarında öldürdüğü asker' },
  { key: 'killsDefense', label: 'En iyi savunan',  icon: 'kalkan', unit: 'asker',
    desc: 'Köylerini savunurken öldürdüğü asker' },
  { key: 'lootTotal',    label: 'En çok yağma',    icon: 'depo',   unit: 'kaynak',
    desc: 'Seferlerden getirdiği toplam ganimet' },
  { key: 'land',         label: 'En büyük alan',   icon: 'harita', unit: 'tarla',
    desc: 'Bütün köylerindeki üretim tarlası' },
];

const ILK_N = 10;

/**
 * @param {Map<number, {name: string, koyler: Array<{v, slotKey, adi}>}>} oyuncular
 * @param {number} benimId  — kendi satırı işaretlensin diye
 */
function tablolariKur(oyuncular, benimId) {
  const satirlar = [];
  const koyler = [];
  for (const [userId, o] of oyuncular) {
    const m = oyuncuOlculeri(o.koyler);
    satirlar.push({
      key: `u${userId}`, name: o.name, kind: userId === benimId ? 'self' : 'player',
      sub: m.koySayisi > 1 ? `${m.koySayisi} köy` : null,
      m,
    });
    for (const k of o.koyler) {
      if (!k?.v) continue;
      koyler.push({
        key: `${userId}:${k.slotKey}`,
        name: k.adi || o.name,
        sub: o.name,
        kind: userId === benimId ? 'self' : 'player',
        deger: koyPuani(k.v),
      });
    }
  }

  const tablo = (b) => {
    const sirali = [...satirlar].sort((x, y) => y.m[b.key] - x.m[b.key]);
    return sonuclandir(b, sirali.map((r) => ({ ...r, deger: r.m[b.key] })));
  };

  const boards = TABLOLAR.map(tablo);
  boards.push(sonuclandir(
    { key: 'koyPuani', label: 'En büyük köy', icon: 'koy', unit: 'puan',
      desc: 'Tek bir köyün bina seviyeleri + nüfusu' },
    [...koyler].sort((x, y) => y.deger - x.deger),
  ));
  return boards;
}

/** Sıralanmış listeyi ilk N + "senin sıran" biçimine getirir */
function sonuclandir(b, sirali) {
  const top = sirali.slice(0, ILK_N).map((r, i) => ({
    rank: i + 1, key: r.key, name: r.name, sub: r.sub || null,
    kind: r.kind, value: r.deger,
  }));
  const benIdx = sirali.findIndex((r) => r.kind === 'self');
  const me = benIdx >= 0 ? {
    rank: benIdx + 1, key: sirali[benIdx].key, name: sirali[benIdx].name,
    sub: sirali[benIdx].sub || null, kind: 'self', value: sirali[benIdx].deger,
  } : null;
  return { ...b, rows: top, me, inTop: benIdx >= 0 && benIdx < ILK_N };
}

module.exports = {
  TABLOLAR, ILK_N, tarlaSayisi, seviyeToplami, koyPuani,
  oyuncuOlculeri, tablolariKur,
};
