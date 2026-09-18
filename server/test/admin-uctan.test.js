/**
 * ADMİN KAPISI — UÇTAN UCA.
 *
 * Kural `admin.test.js`'te kilitli; burada KATMAN ARASI sınanıyor. Bu
 * depodaki hataların çoğu kuralın kendisinde değil bağlantıda yaşıyordu
 * ve bu kapı için bağlantı hatası = herkesin herkesin hesabına girmesi.
 *
 * Test sunucusu \`TRANORD_ADMIN\` olmadan açılıyor, yani HİÇ KİMSE admin
 * değil — sınanan şey tam olarak bu: geçerli bir oyuncu token'ı admin
 * yollarını AÇMIYOR.
 */
const test = require('node:test');
const assert = require('node:assert');
const { sunucuBaslat, hesapAc } = require('./sunucu');

test('gecerli oyuncu tokeni admin yollarini ACMIYOR', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);

  const basliklar = { Authorization: `Bearer ${token}` };

  /*
    404, 401 DEĞİL. 401 "doğru yetkiyle erişilebilecek bir uç var"
    demektir ve saldırgana hedef gösterir; admin olmayan için bu yol
    hiç yok.
  */
  const liste = await fetch(sunucu.taban + '/admin/users', { headers: basliklar });
  assert.equal(liste.status, 404, 'oyuncu token\'ı listeyi açtı');

  const taklit = await fetch(sunucu.taban + '/admin/impersonate', {
    method: 'POST',
    headers: { ...basliklar, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 1 }),
  });
  assert.equal(taklit.status, 404, 'oyuncu token\'ı taklit açtı');
});

test('tokensiz ve bozuk tokenle admin yollari kapali', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());

  const tokensiz = await fetch(sunucu.taban + '/admin/users');
  assert.equal(tokensiz.status, 404);

  const bozuk = await fetch(sunucu.taban + '/admin/users', {
    headers: { Authorization: 'Bearer bu-gecerli-bir-token-degil' },
  });
  assert.equal(bozuk.status, 404);

  /* Sunucu bu denemelerden sonra hâlâ ayakta olmalı */
  assert.equal(await sunucu.ayaktaMi(), true);
});
