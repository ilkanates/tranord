/**
 * PAZAR ORANLARI — kâr getiren bir döngü var mı?
 *
 * Bu testlerin varlık sebebi tek bir soru: oyuncu kaynak üreterek değil,
 * TAKAS EDEREK zenginleşebiliyor mu? Ekonomide kaynak üreten iki yer var —
 * tarlalar ve işleme binaları. Takas hiçbir zaman üçüncü bir kaynak olmamalı.
 *
 * YÖNTEM
 * Her dönüşümü bir ÇARPAN olarak yazıyoruz: "1 birim girdi kaç birim çıktı
 * verir". NPC takası "N ver, 1 al" olduğu için çarpanı 1/N. İşleme binası
 * `outputPerHour / inputPerHour`.
 *
 * Kârlı bir döngü ancak çarpanların ÇARPIMI 1'i geçerse olur. Bütün
 * çarpanlar 1'in ALTINDAysa hiçbir döngü kâr edemez — grafiği taramaya
 * gerek kalmadan. Test bu değişmezi koruyor.
 *
 * Somut tehlike (bu yüzden işlenmiş → ham kapalı):
 *     8 odun --keresteci(0,75)--> 6 kereste --NPC(1 kereste = 2 odun)--> 12 odun
 * İkinci adım açık olsaydı çarpım 0,75 × 2 = 1,5 olurdu: her turda +%50.
 */
const test = require('node:test');
const assert = require('node:assert');
const P = require('../game/pazar');
const { VILLAGE_DEFS } = require('../data');

const TUM = [...P.TAKAS_KAYNAKLARI];

/** Ekonomideki bütün dönüşümler: {ad, from, to, carpan} */
function tumDonusumler() {
  const kenarlar = [];
  for (const a of TUM) {
    for (const b of TUM) {
      const oran = P.takasOrani(a, b);
      if (oran) kenarlar.push({ ad: `NPC ${a}->${b}`, from: a, to: b, carpan: 1 / oran });
    }
  }
  for (const [tip, def] of Object.entries(VILLAGE_DEFS)) {
    const pr = def.processes;
    if (!pr) continue;
    kenarlar.push({
      ad: `${tip} ${pr.input}->${pr.output}`,
      from: pr.input, to: pr.output,
      carpan: pr.outputPerHour / pr.inputPerHour,
    });
  }
  return kenarlar;
}

test('hiçbir dönüşüm kazandırmaz — her çarpan 1\'in altında', () => {
  const kotu = tumDonusumler().filter((k) => k.carpan >= 1);
  assert.deepEqual(kotu.map((k) => `${k.ad} = ${k.carpan}`), [],
    'Çarpanı 1 veya üzeri olan dönüşüm, tek başına para basar');
});

test('kârlı takas döngüsü yok', () => {
  /*
    Çarpanların hepsi < 1 olduğu için matematiksel olarak döngü kâr edemez,
    ama değişmezi VARSAYMAK yerine ölçüyoruz: log uzayında en iyi (en az
    kaybettiren) döngüyü Floyd-Warshall ile arıyoruz. Herhangi bir düğümün
    kendine dönüş çarpanı 1'i geçerse döngü kârlıdır.
  */
  const kenarlar = tumDonusumler();
  const en = {};                              // en[a][b] = en iyi çarpan
  for (const a of TUM) { en[a] = {}; for (const b of TUM) en[a][b] = 0; }
  for (const k of kenarlar) en[k.from][k.to] = Math.max(en[k.from][k.to], k.carpan);

  for (const orta of TUM) {
    for (const a of TUM) {
      for (const b of TUM) {
        const yol = en[a][orta] * en[orta][b];
        if (yol > en[a][b]) en[a][b] = yol;
      }
    }
  }

  const karli = TUM.filter((a) => en[a][a] > 1)
    .map((a) => `${a} -> ... -> ${a} = ${en[a][a].toFixed(3)}x`);
  assert.deepEqual(karli, [], 'Kârlı döngü bulundu — takas kaynak üretiyor');
});

test('işlenmiş -> ham yönü kapalı', () => {
  for (const i of P.ISLENMIS) {
    for (const h of P.HAM) {
      assert.equal(P.takasOrani(i, h), null,
        `${i} -> ${h} açık; işleme binalarıyla birlikte sonsuz döngü kurar`);
    }
  }
});

test('oranlar konuşulduğu gibi: ham 2, ham->işlenmiş 4, işlenmiş 2', () => {
  assert.equal(P.takasOrani('odun', 'kil'), 2);
  assert.equal(P.takasOrani('tahil', 'demir'), 2);
  assert.equal(P.takasOrani('odun', 'kereste'), 4);
  assert.equal(P.takasOrani('tahil', 'ekmek'), 4);
  assert.equal(P.takasOrani('kereste', 'tugla'), 2);
  assert.equal(P.takasOrani('un', 'ekmek'), 2);
  assert.equal(P.takasOrani('odun', 'odun'), null, 'aynı kaynağa takas anlamsız');
});

test('NPC her zaman işleme binasından PAHALI — bina anlamsızlaşmıyor', () => {
  const sorun = [];
  for (const [tip, def] of Object.entries(VILLAGE_DEFS)) {
    const pr = def.processes;
    if (!pr) continue;
    const npc = P.takasOrani(pr.input, pr.output);      // NPC: kaç girdi / 1 çıktı
    if (!npc) continue;
    const bina = pr.inputPerHour / pr.outputPerHour;     // bina: kaç girdi / 1 çıktı
    if (npc <= bina) {
      sorun.push(`${tip}: NPC ${npc} girdi/çıktı, bina ${bina.toFixed(2)} — NPC daha ucuz`);
    }
  }
  assert.deepEqual(sorun, [],
    'NPC takası işleme binasından ucuzsa bina kurmanın anlamı kalmaz');
});

test('tüccar sayısı pazar seviyesi kadar, her tüccar 2000 taşır', () => {
  const koy = (seviye) => ({
    villageBuildings: seviye ? { p: { type: 'pazar', level: seviye } } : {},
    resources: {},
  });
  assert.equal(P.TUCCAR_KAPASITESI, 2000);
  assert.equal(P.tuccarKapasitesi(koy(0)), 0, 'pazarsız köyde tüccar olmaz');
  assert.equal(P.tuccarKapasitesi(koy(5)), 5);
  assert.equal(P.tuccarKapasitesi(koy(20)), 20);
  // 5 tüccar = 10.000 taşıma
  assert.equal(P.gerekenTuccar(2000), 1);
  assert.equal(P.gerekenTuccar(2001), 2, 'artan miktar için bir tüccar daha');
  assert.equal(P.gerekenTuccar(6000), 3, 'örnekteki 6000 kereste = 3 tüccar');
});

test('inşa hâlindeki pazar tüccar vermez', () => {
  const koy = { villageBuildings: { p: { type: 'pazar', level: 0, building: true } }, resources: {} };
  assert.equal(P.tuccarKapasitesi(koy), 0);
});

test('npcTakas kaynağı doğru düşürüp doğru ekliyor', () => {
  const koy = {
    villageBuildings: { p: { type: 'pazar', level: 3 } },
    resources: { odun: 1000, kil: 0 },
  };
  const caps = { odun: 9999, kil: 9999 };
  const s = P.npcTakas(koy, 'odun', 'kil', 500, caps, 9999);
  assert.equal(s.ok, true);
  assert.equal(s.alinan, 250, '500 odun / 2 = 250 kil');
  assert.equal(koy.resources.odun, 500);
  assert.equal(koy.resources.kil, 250);
});

test('yuvarlama artığı oyuncuda kalıyor', () => {
  const koy = {
    villageBuildings: { p: { type: 'pazar', level: 3 } },
    resources: { odun: 1000, kereste: 0 },
  };
  // 4:1 oranında 999 odun -> 249 kereste (996 odun harcanır, 3 odun kalır)
  const s = P.npcTakas(koy, 'odun', 'kereste', 999, { odun: 9999, kereste: 9999 }, 9999);
  assert.equal(s.alinan, 249);
  assert.equal(s.harcanan, 996);
  assert.equal(koy.resources.odun, 4, '1000 - 996 = 4; artık çöpe gitmiyor');
});

test('depoya sığmayan takas hiç yapılmıyor', () => {
  const koy = {
    villageBuildings: { p: { type: 'pazar', level: 3 } },
    resources: { odun: 1000, kil: 95 },
  };
  const s = P.npcTakas(koy, 'odun', 'kil', 1000, { odun: 9999, kil: 100 }, 9999);
  assert.equal(s.ok, false);
  assert.equal(s.sebep, 'depo_dolu');
  assert.equal(koy.resources.odun, 1000, 'başarısız takas kaynağa dokunmamalı');
});

test('pazarsız köyde takas yapılamaz', () => {
  const koy = { villageBuildings: {}, resources: { odun: 1000 } };
  const s = P.npcTakas(koy, 'odun', 'kil', 100, {}, 9999);
  assert.equal(s.ok, false);
  assert.equal(s.sebep, 'pazar_yok');
});

test('özet depodaki boş yeri de bildiriyor', () => {
  const koy = {
    villageBuildings: { p: { type: 'pazar', level: 4 } },
    resources: { odun: 800, kil: 0, un: 60, ekmek: 40 },
  };
  const ozet = P.pazarOzeti(koy, { odun: 1000, kil: 1000 }, 150);
  assert.equal(ozet.bosYer.odun, 200);
  assert.equal(ozet.bosYer.kil, 1000);
  // un + ekmek ambarı paylaşıyor: 150 - (60+40) = 50, ikisi için de aynı
  assert.equal(ozet.bosYer.un, 50);
  assert.equal(ozet.bosYer.ekmek, 50);
  assert.equal(ozet.bosYer.tugla, null, 'tavanı bilinmeyen kaynak null kalır');
});
