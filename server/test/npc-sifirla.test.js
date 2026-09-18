/**
 * NPC SIFIRLAMA — geri alınamaz bir düğmenin sınırları.
 *
 * İlkan: *"NPC'leri sıfırla, baştan başlasınlar."* Düğme admin panelinde
 * ve tek tıkla 700 köyü siliyor. Bu testin sorduğu tek soru şu:
 *
 *   SİLME OYUNCU VERİSİNE DOKUNUYOR MU?
 *
 * Güvenliğin asıl garantisi yapısal: NPC'ler `world_villages`
 * tablosunda, oyuncu köyleri `villages` tablosunda; ayrım koşulda değil
 * TABLODA. Ama yapısal garanti ancak DOĞRU İŞLEV çağrılıyorsa işe yarar
 * ve bu depodaki hataların çoğu tam da bağlantıda yaşıyor — o yüzden
 * burada gerçek sunucu ayağa kalkıyor, gerçek oyuncu köyü kuruluyor ve
 * sıfırlamadan SONRA köyün hâlâ yerinde olduğu okunuyor.
 *
 * İkinci soru: kapı kime açık? Sıfırlama yolu index.js'te duruyor ama
 * admin.js'teki AYNI kapıdan geçmeli; ayrı bir kontrol yazılsaydı iki
 * kural zamanla ayrışırdı. Burada sıradan oyuncunun da 404 aldığı
 * sınanıyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const { sunucuBaslat, hesapAc, baglan } = require('./sunucu');
const W = require('../game/world');

const ADMIN = 'sifirlama-admin@ornek.test';

test('sifirlama NPC dunyasini siliyor, oyuncu koyune DOKUNMUYOR', async (t) => {
  const sunucu = await sunucuBaslat({ ortam: { TRANORD_ADMIN: ADMIN } });
  t.after(() => sunucu.kapat());

  const admin = await hesapAc(sunucu, { email: ADMIN });
  const oyuncu = await hesapAc(sunucu);

  /* Oyuncunun köyü GERÇEKTEN kurulsun — sokete bağlanınca kuruluyor */
  const oturum = await baglan(sunucu, oyuncu.token);
  const oncekiKoy = oturum.koy;
  oturum.kapat();
  assert.ok(oncekiKoy?.productionTiles, 'oyuncu köyü kurulmadı, test anlamsız');

  /*
    NPC DÜNYASI = kurulmuş köyler + kuyrukta bekleyenler. Tohumlama tik
    başına birkaç köy ilerliyor (bkz. npcTohumTiki), yani taze bir
    sunucuda köylerin neredeyse tamamı henüz kuyrukta. Tek başına
    `npcs`e bakmak testi tohumlama hızına bağlardı.
  */
  const oncekiDurum = await fetch(sunucu.taban).then(r => r.json());
  assert.ok(oncekiDurum.npcs + oncekiDurum.npcKuyruk > 0,
    'sıfırlanacak NPC yok, test anlamsız');

  const yanit = await fetch(sunucu.taban + '/admin/npc-sifirla', {
    method: 'POST',
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  assert.equal(yanit.status, 200, 'admin sıfırlayamadı');
  const sonuc = await yanit.json();
  assert.equal(sonuc.ok, true);
  /*
    TAM BİR DÜNYA yeniden kuyruğa girmeli. "> 0" yetmez: hedefin altında
    bir sayı, sıfırlamanın dünyayı kalıcı olarak küçülttüğü anlamına
    gelirdi ve bu ancak haftalar sonra fark edilirdi.
  */
  assert.equal(sonuc.kuyrukta, W.NPC_TARGET,
    'sıfırlama sonrası dünya eksik kuruluyor');
  assert.ok(sonuc.silinen >= 0 && Number.isFinite(sonuc.silinen),
    'silinen kayıt sayısı bildirilmedi');

  /*
    ASIL İDDİA: oyuncu hâlâ orada ve köyü aynı köy. Yeniden bağlanmak
    oturumu sıfırdan kuruyor, yani veri diskten/bellekten geri okunuyor —
    silme oyuncu tarafına sıçradıysa burada görülür.
  */
  const durum = await fetch(sunucu.taban).then(r => r.json());
  assert.equal(durum.players, oncekiDurum.players, 'oyuncu slotları kayboldu');

  const yeniOturum = await baglan(sunucu, oyuncu.token);
  t.after(() => yeniOturum.kapat());
  assert.ok(yeniOturum.koy?.productionTiles, 'sıfırlamadan sonra oyuncunun köyü yok');
  assert.deepEqual(
    Object.keys(yeniOturum.koy.productionTiles).sort(),
    Object.keys(oncekiKoy.productionTiles).sort(),
    'oyuncunun tarlaları değişti'
  );
  assert.deepEqual(
    Object.keys(yeniOturum.koy.resources || {}).sort(),
    Object.keys(oncekiKoy.resources || {}).sort(),
    'oyuncunun hammadde deposu değişti'
  );
});

test('sifirlama yolu sIRADAN OYUNCUYA kapali', async (t) => {
  const sunucu = await sunucuBaslat({ ortam: { TRANORD_ADMIN: ADMIN } });
  t.after(() => sunucu.kapat());

  const oyuncu = await hesapAc(sunucu);   // admin DEĞİL

  const yanit = await fetch(sunucu.taban + '/admin/npc-sifirla', {
    method: 'POST',
    headers: { Authorization: `Bearer ${oyuncu.token}` },
  });
  /* 404, 401 değil — bkz. admin.js · kapı saldırgana hedef göstermiyor */
  assert.equal(yanit.status, 404, 'sıradan oyuncu NPC dünyasını silebiliyor');

  const tokensiz = await fetch(sunucu.taban + '/admin/npc-sifirla', { method: 'POST' });
  assert.equal(tokensiz.status, 404);

  /* Hiçbiri geçmemiş olmalı: NPC dünyası (kurulan + kuyrukta) yerinde */
  const durum = await fetch(sunucu.taban).then(r => r.json());
  assert.ok(durum.npcs + durum.npcKuyruk > 0, 'yetkisiz istek NPC dünyasını sildi');
});
