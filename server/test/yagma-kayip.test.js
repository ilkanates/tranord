/**
 * YAĞMADA KAYIP — tavan yok, güç oranı belirliyor.
 *
 * İlkan: *"yağmaya yolladığımda ordunun sadece %50'si ölüyor, çok saçma.
 * Ölüm oranları ordu güçlerine göre olmalı. Yağmaya giden ordunun tamamı
 * da ölebilir."*
 *
 * Eskiden yağma iki tarafın kaybını da yarıya indiriyordu (Travian'ın
 * gerçek yağma kuralı). Sonucu şuydu: KAYBEDİLDİĞİ AN ORAN SABİTLENİYOR.
 * 100 asker saldırırken savunan 100 de olsa 2000 de olsa kayıp %50'ydi;
 * güç farkı sonuca hiç yansımıyor ve yağma risksiz bir yoklama oluyordu.
 *
 * Bu testin asıl işi o tavanın GERİ GELMEMESİ. Tavan, tek bir çarpanla
 * sessizce geri konabilir ve hiçbir şey kırılmaz — yalnız oyun yeniden
 * risksizleşir.
 */
const test = require('node:test');
const assert = require('node:assert');
const C = require('../game/combat');

const say = (o) => Object.values(o || {}).reduce((s, n) => s + n, 0);
const kayipOrani = (savunanAdet, mode) => {
  const r = C.simulateBattle(
    { fjordvakt: 100 },
    savunanAdet ? { fjordvakt: savunanAdet } : {},
    { mode });
  return say(r.attackerLosses) / 100;
};

test('YAGMA ile SALDIRI ayni kaybi veriyor', () => {
  /*
    Fark ganimette (bkz. army.js · RAID_LOOT_SHARE), kayıpta değil.
    İki mod arasında kayıp farkı kalırsa tavan geri gelmiş demektir.
  */
  for (const savunan of [20, 50, 100, 500, 2000]) {
    assert.equal(kayipOrani(savunan, 'raid'), kayipOrani(savunan, 'normal'),
      `savunan ${savunan}: yağma ve saldırı kaybı ayrıştı`);
  }
});

test('KAYBEDEN ORDUSUNUN TAMAMINI kaybediyor — yagmada da', () => {
  /* Asıl istek: "yağmaya giden ordunun tamamı da ölebilir" */
  assert.equal(kayipOrani(2000, 'raid'), 1, 'ezici savunmaya karşı ordu tam ölmedi');
  assert.equal(kayipOrani(500, 'raid'), 1);
});

test('KAZANIRKEN kayip GUC ORANINA bagli, sabit degil', () => {
  /*
    "Ölüm oranları ordu güçlerine göre olmalı." Kazanan tarafta kayıp
    (zayıf/güçlü)^1.5 — savunan güçlendikçe artmalı.
  */
  const a = kayipOrani(20, 'raid');
  const b = kayipOrani(50, 'raid');
  assert.ok(a > 0, 'savunma varken kayıpsız kazanıldı');
  assert.ok(b > a, `kayıp güçle artmadı: ${a} → ${b}`);
  assert.ok(b < 1, 'kazanırken ordu tamamen ölmemeli');
});

test('SABIT %50 YOK — farkli guclerde farkli oranlar', () => {
  /*
    Hatanın imzası buydu: birbirinden çok farklı savunmalara karşı AYNI
    oran. Üç ayrı kayıp değeri görmek, tavanın olmadığının kanıtı.
  */
  const oranlar = [20, 50, 80].map(n => kayipOrani(n, 'raid'));
  assert.equal(new Set(oranlar).size, 3,
    `farklı savunmalara aynı kayıp oranı: ${oranlar.join(', ')}`);
  assert.ok(!oranlar.includes(0.5), `hâlâ %50 tavanı var: ${oranlar.join(', ')}`);
});

test('savunmasiz koye yagma KAYIPSIZ', () => {
  /* Tavanı kaldırmak, boş köye giden yağmayı cezalandırmamalı */
  assert.equal(kayipOrani(0, 'raid'), 0);
});

test('RAID_LOSS_MULT artik disa verilmiyor', () => {
  /*
    Sabit dursaydı biri onu yeniden çarpan olarak kullanabilirdi ve
    tavan sessizce geri gelirdi.
  */
  assert.equal(C.RAID_LOSS_MULT, undefined, 'yağma kayıp çarpanı hâlâ duruyor');
});
