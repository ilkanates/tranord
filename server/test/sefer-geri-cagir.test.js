/**
 * SEFER GERİ ÇAĞIRMA — yola çıktıktan sonra ilk 90 GERÇEK saniye.
 *
 * Korunan kararlar:
 *
 * 1) Pencere DAR. Her an geri çağrılabilseydi saldırı risksiz olurdu:
 *    orduyu yollar, hedefi izler, son anda geri çekerdin.
 * 2) Ölçü GERÇEK saniye (`departAt`), oyun saati değil — dünya hızı
 *    değişince pencerenin uzayıp kısalması oyuncu için anlamsız.
 * 3) Işınlanma yok: ordu gittiği yol kadar geri yürür.
 * 4) Ganimet YOK — hedefe hiç varmadı.
 */
const test = require('node:test');
const assert = require('node:assert');
const ARMY = require('../game/army');

function sefer(ek = {}) {
  return {
    id: 1, mode: 'attack', phase: 'outbound',
    toName: 'Hedef', toKey: '3,0',
    units: { fjordvakt: 10 },
    legHours: 4, remainingHours: 3.9,
    departAt: Date.now(),
    loot: null,
    ...ek,
  };
}
const koy = (m) => ({ marches: m ? [m] : [] });

test('pencere içinde geri çağrılıyor: dönüşe geçer, gidilen yol kadar yürür', () => {
  const m = sefer();
  const v = koy(m);
  const res = ARMY.seferGeriCagir(v, 1);
  assert.equal(res.ok, true);
  assert.equal(m.phase, 'return');
  assert.ok(Math.abs(m.remainingHours - 0.1) < 1e-9,
    'dönüş = gidilen yol (4 - 3.9), ışınlanma yok');
  assert.deepEqual(m.loot, {}, 'hedefe varmadı, ganimet olmamalı');
  assert.equal(m.geriCagrildi, true);
});

test('90 saniye geçtiyse reddediliyor', () => {
  const m = sefer({ departAt: Date.now() - 91_000 });
  const res = ARMY.seferGeriCagir(koy(m), 1);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'sure_doldu');
  assert.equal(m.phase, 'outbound', 'sefer yoluna devam etmeli');
});

test('dönüşteki sefer geri çağrılamaz', () => {
  const m = sefer({ phase: 'return' });
  const res = ARMY.seferGeriCagir(koy(m), 1);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'zaten_donuyor');
});

test('olmayan sefer sunucuyu düşürmüyor', () => {
  assert.equal(ARMY.seferGeriCagir(koy(null), 99).reason, 'sefer_yok');
  assert.equal(ARMY.seferGeriCagir({}, 1).reason, 'sefer_yok');
});

test('kalan süre: yeni seferde ~90, yarıda azalmış, dönüşte 0', () => {
  assert.ok(ARMY.geriCagirmaKalan(sefer()) > 89);
  const yari = ARMY.geriCagirmaKalan(sefer({ departAt: Date.now() - 45_000 }));
  assert.ok(yari > 44 && yari < 46, `45 civarı olmalı, ${yari} geldi`);
  assert.equal(ARMY.geriCagirmaKalan(sefer({ phase: 'return' })), 0);
  assert.equal(ARMY.geriCagirmaKalan(null), 0);
});

test('pencere sabiti 90 sn — denge buradan ayarlanır', () => {
  assert.equal(ARMY.GERI_CAGIRMA_SANIYE, 90);
});
