/**
 * YIKIM SÜRESİ — o seviyenin inşa süresinin onda biri.
 *
 * Kural oyuncuya duyuruldu (yama notu) ve istemcide bir İKİZİ var
 * (client/src/flows.js · yikimDakikasi). Oran burada kilitli: biri
 * değişirse arayüzdeki geri sayım sunucudakiyle tutmaz.
 */
const test = require('node:test');
const assert = require('node:assert');
const K = require('../game/koyKurallari');

test('yıkım süresi = tam kadroyla inşa süresinin 1/10', () => {
  for (const [tip, lvl] of [['anaBina', 1], ['anaBina', 10], ['kisla', 5], ['atolye', 3]]) {
    const insa = K.getVillageBuildMinutes(tip, lvl, K.MAX_BUILDERS(lvl));
    const yikim = K.getVillageDemolishMinutes(tip, lvl);
    assert.ok(Number.isFinite(yikim), `${tip}@${lvl} sonlu bir süre vermeli`);
    assert.ok(Math.abs(yikim - insa / 10) < 1e-9,
      `${tip}@${lvl}: ${yikim} ≠ ${insa}/10`);
  }
});

test('oran 0.1 — istemci ikizi (flows.js YIKIM_ORANI) bununla aynı olmalı', () => {
  assert.equal(K.YIKIM_ORANI, 0.1);
  const fs = require('node:fs');
  const path = require('node:path');
  const flows = fs.readFileSync(
    path.join(__dirname, '..', '..', 'client', 'src', 'flows.js'), 'utf8');
  assert.match(flows, /export const YIKIM_ORANI = 0\.1;/,
    'istemcideki oran sunucudakiyle aynı yazılmalı');
});

test('seviye 0/boş verilse de süre üretiliyor (Lvl 1 gibi sayılır)', () => {
  const lvl1 = K.getVillageDemolishMinutes('anaBina', 1);
  assert.equal(K.getVillageDemolishMinutes('anaBina', 0), lvl1);
  assert.equal(K.getVillageDemolishMinutes('anaBina'), lvl1);
});
