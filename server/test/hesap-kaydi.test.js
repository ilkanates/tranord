/**
 * HESAP KAYDI — merkez köy değişince görev zinciri ve kahraman taşınır.
 *
 * Bu test bir HATAYI kilitliyor: köy yıkımı eklendiğinde merkez köy yok
 * olduğunda `capitalSlot` taşınıyor ama görev/kahraman kaydı yıkılan
 * köyle birlikte siliniyordu — oyuncu kahramanını köyüyle beraber
 * kaybediyordu. Oysa ikisi de KÖYE değil HESABA ait.
 */
const test = require('node:test');
const assert = require('node:assert');
const { hesapKaydiniTasi, HESAP_ALANLARI } = require('../game/hesapKaydi');

test('görev ve kahraman kaydı yeni merkeze taşınıyor', () => {
  const eski = { quests: { claimed: ['a'], done: ['a'] }, kahraman: { xp: 4200 } };
  const yeni = {};
  const tasinan = hesapKaydiniTasi(eski, yeni);

  assert.deepEqual(tasinan.sort(), ['kahraman', 'quests']);
  assert.equal(yeni.kahraman.xp, 4200, 'kahraman köyle birlikte yok olmamalı');
  assert.deepEqual(yeni.quests.claimed, ['a']);
  assert.equal('quests' in eski, false, 'eski köyde kopya kalmamalı');
  assert.equal('kahraman' in eski, false);
});

test('hedefte ZATEN kayıt varsa ezilmiyor', () => {
  /*
    İki kayıt birleştirilemez; dolu olanı ezmek, taşımanın önlemeye
    çalıştığı kaybın ta kendisi olurdu.
  */
  const eski = { kahraman: { xp: 10 } };
  const yeni = { kahraman: { xp: 9999 } };
  const tasinan = hesapKaydiniTasi(eski, yeni);
  assert.deepEqual(tasinan, []);
  assert.equal(yeni.kahraman.xp, 9999);
  assert.equal(eski.kahraman.xp, 10, 'taşınmadıysa kaynaktan silinmemeli');
});

test('eksik ya da aynı köyle çağrılınca hiçbir şey olmuyor', () => {
  assert.deepEqual(hesapKaydiniTasi(null, {}), []);
  assert.deepEqual(hesapKaydiniTasi({}, null), []);
  const k = { quests: { claimed: [] } };
  assert.deepEqual(hesapKaydiniTasi(k, k), [], 'aynı köy: kayıt silinmemeli');
  assert.ok(k.quests, 'kendine taşımak kaydı yok etmemeli');
});

test('boş kaynak taşınmıyor — yeni merkezde alan uydurulmuyor', () => {
  const yeni = {};
  assert.deepEqual(hesapKaydiniTasi({}, yeni), []);
  assert.deepEqual(Object.keys(yeni), []);
});

test('hesap alanları listesi kayıt yerlerini kapsıyor', () => {
  /*
    Yeni bir HESAP düzeyi kayıt eklenirse bu listeye de eklenmeli; aksi
    hâlde merkez değişiminde sessizce kaybolur. Test listeyi görünür
    kılıyor — büyüdüğünde bilinçli büyüsün.
  */
  /*
    KESE SONRADAN EKLENDİ (17 Eylül 2026). Gümüş/altın cüzdanı da hesaba
    ait: köy başına cüzdan olsaydı oyuncu parasını köyler arasında
    taşımak zorunda kalırdı. Listeye girmeseydi merkez köy değişince
    ya da yıkılınca oyuncunun bütün parası sessizce yok olurdu.
  */
  assert.deepEqual([...HESAP_ALANLARI].sort(), ['kahraman', 'kese', 'quests']);
});
