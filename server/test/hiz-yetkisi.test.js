/**
 * HIZ ÇUBUĞU YETKİSİ — `set_speed` global `WORLD.speed`'i değiştiriyor.
 *
 * Ekonomi, NPC'ler ve seferler o çarpanla akıyor, yani bu olay bir oyuncunun
 * kendi ayarı değil DÜNYANIN ayarı. Üretimde erişilebilir olması hem ekonomi
 * hilesi hem griefing yüzeyi demek. Kapı sunucuda: TRANORD_DEV_CHEATS.
 *
 * İstemcideki `import.meta.env.DEV` kapısı yalnızca düğmeyi gizliyor — bu
 * testler onu değil, SUNUCUNUN kendisini ölçüyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const { sunucuBaslat, hesapAc, baglan, bekle } = require('./sunucu');

/** Yayın yalnız yapısal değişiklikte/kalp atışında gidiyor — birini zorla */
function paketiZorla(oturum) {
  const tarla = Object.keys(oturum.koy.productionTiles || {})[0];
  oturum.soket.emit('assign_production_workers', { slotKey: tarla, workers: 1 });
}

test('hile kapalıyken set_speed dünya hızını değiştiremez', async (t) => {
  const sunucu = await sunucuBaslat({ hile: false });
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  const oncekiTickMs = oturum.koy.tickMs;
  assert.equal(oncekiTickMs, 1000, 'varsayılan tickMs 1000 bekleniyordu');

  // Üretimde bir oyuncunun konsoldan yapabileceği şey birebir bu
  oturum.soket.emit('set_speed', { tickMs: 7 });      // 143× dünya hızı
  await bekle(1500);
  paketiZorla(oturum);
  await bekle(1500);

  assert.equal(oturum.koy.tickMs, oncekiTickMs,
    'set_speed hile kapalıyken dünya hızını değiştirdi');
  assert.ok(!/\[HIZ\]/.test(sunucu.kayit),
    'sunucu hız değişikliği logladı — handler kayıtlı kalmış:\n' + sunucu.kayit.slice(-800));

  // Sunucu bu olayı görmezden gelmeli, ÇÖKMEMELİ
  assert.ok(await sunucu.ayaktaMi(), 'sunucu çöktü — çıkış kodu: ' + sunucu.cikisKodu);
});

test('hile açıkken (yerel geliştirme) set_speed çalışmaya devam eder', async (t) => {
  const sunucu = await sunucuBaslat({ hile: true });
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  assert.equal(oturum.koy.tickMs, 1000);
  oturum.soket.emit('set_speed', { tickMs: 500 });    // 2× — denge ayarı için gerekli
  await bekle(2000);

  assert.equal(oturum.koy.tickMs, 500,
    'yerel geliştirmede hız çubuğu çalışmalı (denge ayarı buna bağlı)');
});
