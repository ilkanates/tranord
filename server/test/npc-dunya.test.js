/**
 * NPC DÜNYASI — kaç köy, nereye sığıyor.
 *
 * İlkan: *"NPC sistemini geliştir, çok daha fazla NPC köyü olsun."*
 * 200'de dünya boş görünüyordu: 1.729 slotun %12'si doluydu ve oyuncunun
 * görüş alanında çoğu zaman hiçbir komşu yoktu.
 *
 * Bu test SAYIYI değil, sayının dayandığı iki cümleyi kilitliyor:
 *
 * 1) NPC'ler haritaya SIĞMALI ve üstüne yer KALMALI. Doluluk %100'e
 *    yaklaşırsa oyuncunun ikinci köyüne ve NPC'lerin kuracağı köylere
 *    yer kalmaz; oyunun genişleme ayağı sessizce ölür.
 * 2) OYUNCULARA AYRILAN MERKEZ korunmalı. NPC seçimi merkezdeki doğuş
 *    halkasını boş bırakmazsa yeni oyuncu haritada yer bulamaz.
 *
 * Sayı ileride değişebilir; bu iki cümle değişmemeli.
 */
const test = require('node:test');
const assert = require('node:assert');
const W = require('../game/world');

test('NPC hedefi haritaya sığıyor ve büyümeye yer bırakıyor', () => {
  const slots = W.generateSlots();
  assert.ok(slots.length > 0, 'slot üretilmedi');

  const doluluk = W.NPC_TARGET / slots.length;
  assert.ok(doluluk < 0.6,
    `doluluk %${Math.round(doluluk * 100)} — %60'ı aşarsa ikinci köylere ve `
    + 'NPC genişlemesine yer kalmaz');
  assert.ok(doluluk > 0.2,
    `doluluk %${Math.round(doluluk * 100)} — çok seyrek dünya boş görünüyor `
    + '(200 NPC / 1729 slot = %12 tam olarak bu yüzden artırıldı)');
});

test('NPC seçimi oyuncuların doğuş halkasını boş bırakıyor', () => {
  const slots = W.generateSlots();
  const secilen = W.pickNpcSlots(slots, W.NPC_TARGET, 8);

  assert.equal(secilen.length, W.NPC_TARGET,
    'harita hedeflenen NPC sayısını karşılayamıyor');

  /*
    MERKEZDE YER KALMALI. `pickNpcSlots` oyunculara slot ayırıyor; ayırmasa
    yeni oyuncu doğuş halkasında yer bulamaz ve haritanın kenarına düşerdi.
  */
  const merkezdeki = slots.filter(s => W.hexDistance(s.q, s.r) <= W.SPAWN_RADIUS);
  const merkezdeSecilen = secilen.filter(s => W.hexDistance(s.q, s.r) <= W.SPAWN_RADIUS);
  assert.ok(merkezdeki.length > merkezdeSecilen.length,
    'doğuş halkasının tamamı NPC ile dolmuş — yeni oyuncuya yer kalmaz');
});

test('seçilen slotlar benzersiz ve gerçek slotlar', () => {
  const slots = W.generateSlots();
  const anahtarlar = new Set(slots.map(s => s.key));
  const secilen = W.pickNpcSlots(slots, W.NPC_TARGET, 8);

  const tekil = new Set(secilen.map(s => s.key));
  assert.equal(tekil.size, secilen.length, 'aynı slot iki kez seçilmiş');
  for (const s of secilen) {
    assert.ok(anahtarlar.has(s.key), `haritada olmayan slot seçildi: ${s.key}`);
  }
});
