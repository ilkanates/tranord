/**
 * GÖREV ZİNCİRİ — KAHRAMAN ADIMLARI.
 *
 * Zincire iki adım eklendi: ilk macera ve ilk kuşam. İkisi de "neredeyse
 * doğru" bir ölçümle yazılabilirdi ve o hâlde görev yanlış anda
 * tamamlanırdı:
 *
 *   - Macera BİRİKEN HAKTAN ölçülseydi, macerayı yola çıkarmak görevi
 *     bitirirdi; oyuncu ödülü sonucu görmeden alırdı.
 *   - Kuşam ENVANTERDEN ölçülseydi, eşya düşmesi yeterdi; görev,
 *     oyuncuya asıl öğretmek istediği hareketi (slota tak) yaptırmadan
 *     biterdi.
 *
 * Bu dosya tam olarak o iki farkı kilitliyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const Q = require('../game/quests');
const { QUEST_BY_ID } = require('../data/questDefs');

/** questOlcu bir OTURUM bekliyor: köyleri Map olarak taşıyan sade nesne */
const oturum = (kahraman) => ({ villages: new Map([['0,0', { kahraman }]]) });

test('iki kahraman adimi zincirde ve yan hedef', () => {
  for (const id of ['ilkMacera', 'ilkKusam']) {
    const q = QUEST_BY_ID[id];
    assert.ok(q, `${id} görevi tanımlı olmalı`);
    /*
      YAN HEDEF: kahraman güçlü ama oyunu oynamak için şart değil.
      Zorunlu yapmak, köy kurmayı öğrenmemiş oyuncunun önüne başka bir
      sistem koymak olurdu.
    */
    assert.equal(q.zorunlu, false, `${id} zorunlu olmamalı`);
    assert.equal(q.tab, 'kahraman', `${id} kahraman sekmesine bağlı olmalı`);
    assert.ok(q.reward, `${id} ödülsüz olmamalı`);
  }
});

test('macera olcumu TAMAMLANANI sayiyor, biriken hakki degil', () => {
  const kah = { maceraSayisi: 3, maceraTamamlanan: 0, macera: { tip: 'kisa' } };
  const cond = QUEST_BY_ID.ilkMacera.cond;
  /*
    Üç macera HAKKI var ve biri şu an YOLDA — buna rağmen ölçüm sıfır.
    Haktan ölçseydik burada 3 çıkardı ve görev, macera daha bitmeden
    tamamlanmış sayılırdı.
  */
  assert.equal(Q.questOlcu(cond, oturum(kah)), 0,
    'yoldaki macera tamamlanmış sayılmamalı');
  assert.equal(Q.questOlculuyor(QUEST_BY_ID.ilkMacera, oturum(kah)), false);

  kah.maceraTamamlanan = 1;
  kah.macera = null;
  assert.equal(Q.questOlculuyor(QUEST_BY_ID.ilkMacera, oturum(kah)), true,
    'macera bitince görev sağlanmalı');
});

test('kusam olcumu KUSANILANI sayiyor, envanteri degil', () => {
  const kah = {
    envanter: [{ key: 'demirKilic', nadirlik: 'sade' },
      { key: 'kutupKalkani', nadirlik: 'nadir' }],
    kusanilan: {},
  };
  const q = QUEST_BY_ID.ilkKusam;
  /*
    Çantada iki eşya var ama hiçbiri takılı değil. Envanteri saysaydık
    görev burada biterdi ve oyuncu "eşyam var ama kahramanım güçlenmedi"
    hâlinde kalırdı — görevin öğretmek istediği hareket tam da bu.
  */
  assert.equal(Q.questOlcu(q.cond, oturum(kah)), 0,
    'çantadaki eşya kuşanılmış sayılmamalı');
  assert.equal(Q.questOlculuyor(q, oturum(kah)), false);

  kah.kusanilan = { kilic: { key: 'demirKilic', nadirlik: 'sade' } };
  assert.equal(Q.questOlculuyor(q, oturum(kah)), true, 'kuşanınca sağlanmalı');
});

test('kahramani olmayan oyuncuda olcum sifir, cokmeden', () => {
  /*
    Kahraman ZORUNLU DEĞİL: konağı hiç kurmamış bir oyuncunun oturumunda
    bu koşullar her emitVillage'da ölçülüyor. Fırlatırsa oyuncunun
    bütün paketi gider.
  */
  const bos = { villages: new Map([['0,0', {}]]) };
  assert.equal(Q.questOlcu(QUEST_BY_ID.ilkMacera.cond, bos), 0);
  assert.equal(Q.questOlcu(QUEST_BY_ID.ilkKusam.cond, bos), 0);
});

test('eski kayitta sayac yoksa sifirdan basliyor', () => {
  const HERO = require('../game/kahraman');
  /*
    `maceraTamamlanan` sonradan eklendi. Eski kayıtta alan yok; düzeltme
    olmazsa `undefined + 1` NaN üretir ve görev bir daha asla tamamlanmaz.
  */
  // `var: true` şart: duzelt, kahramanı olmayan kaydı hiç ellemiyor
  const k = { var: true, xp: 0, kusanilan: {}, envanter: [] };
  HERO.duzelt(k);
  assert.equal(k.maceraTamamlanan, 0, 'eksik alan sıfırlanmalı');
  assert.equal(HERO.yeniKahraman().maceraTamamlanan, 0,
    'yeni kahraman sıfırdan başlar');
});
