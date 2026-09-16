const fs = require('fs');

/*
  SABİT TANIM PAKETİ KİLİDİ.

  Amblem hatasının kök sebebi bir tanımın İKİ yerde yaşamasıydı:
  index.js'te `statics ? {...} : null` koşulu ve payload.js'teki
  `STATIC_PAYLOAD_KEYS` listesi. Biri eklenip öteki unutulunca alan
  delta pakette `null` gidiyor ve istemcideki kopyayı eziyor — oyuncu
  için "birkaç saniye sonra kaybolan" bir arayüz oluyor.

  Bu test index.js'in KAYNAĞINI okuyup `statics ?` ile yazılmış her
  alanı buluyor ve listede olmasını şart koşuyor. Kaynağı okumak
  alışılmadık ama tek yolu bu: koşul çalışma anında görünmüyor, yalnız
  kodda duruyor.
*/
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { STATIC_PAYLOAD_KEYS } = require('../game/payload');

test('statics ile gönderilen her alan STATIC_PAYLOAD_KEYS icinde', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  /*
    `  birlikTanim: statics ? {` biçimindeki her alanı yakala. Koşulun
    sonu önemli değil; önemli olan alanın delta pakette DOLMAMASI.
  */
  const bulunan = [...src.matchAll(/^\s{4}(\w+):\s*statics\s*\?/gm)].map(m => m[1]);
  assert.ok(bulunan.length > 0, 'en az bir statics alanı bulunmalı');
  for (const alan of bulunan) {
    assert.ok(
      STATIC_PAYLOAD_KEYS.includes(alan),
      `'${alan}' yalnız statics pakette doluyor ama STATIC_PAYLOAD_KEYS `
      + 'içinde değil — delta pakette null gidip istemcideki kopyayı eziyor. '
      + 'Bu tam olarak amblem seçicinin boşalma hatasıydı.');
  }
});

test('delta pakette sabit tanim anahtari hic yok, null da degil', () => {
  /*
    Anahtarın SİLİNMESİ gerekiyor, `null` yazılması değil: istemci
    geleni öncekinin üzerine birleştiriyor, yani `null` eski değeri
    eziyor ama eksik anahtar dokunmuyor.
  */
  const { buildPayload } = require('../game/payload');
  const { createVillage } = require('../game/villageState');
  const koy = createVillage();
  const delta = buildPayload(koy, 1000, { birlikTanim: { amblemler: ['kilic'] } });
  for (const k of STATIC_PAYLOAD_KEYS) {
    assert.equal(k in delta, false, `${k} delta pakette bulunmamalı`);
  }
  const tam = buildPayload(koy, 1000, {
    statics: true, birlikTanim: { amblemler: ['kilic'] },
  });
  assert.deepEqual(tam.birlikTanim, { amblemler: ['kilic'] },
    'statics pakette tanım dolu gelmeli');
});
