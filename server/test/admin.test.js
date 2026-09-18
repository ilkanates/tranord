/**
 * ADMİN PANELİ — yetki kapısı.
 *
 * İlkan: *"admin olarak herkesin kullanıcısına girebiliyor olmalıyım."*
 *
 * Bu, oyunun en hassas kapısı: başkasının hesabına girme yetkisi. O
 * yüzden test edilen şey özelliğin ÇALIŞTIĞI değil, KAPALI OLDUĞU:
 *
 * 1) Yetki listesi boşsa HİÇ KİMSE admin değil. Eksik yapılandırma
 *    kapıyı açık bırakmamalı — "kimse admin değil" güvenli tarafta hata
 *    yapmak, "ilk kullanıcı admindir" gibi bir tahmin ise değil.
 * 2) Admin olmayana 404 dönüyor, 401 değil. 401 "doğru yetkiyle
 *    erişilebilecek bir uç var" demek ve saldırgana hedef gösterir.
 * 3) Geçerli bir OYUNCU token'ı admin yetkisi vermiyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const ADMIN_YOL = path.join(__dirname, '..', 'admin.js');

/** Ortam değişkeni modül yüklenirken okunuyor — önbelleği temizleyerek dene */
function adminModulu(deger) {
  const eski = process.env.TRANORD_ADMIN;
  if (deger === undefined) delete process.env.TRANORD_ADMIN;
  else process.env.TRANORD_ADMIN = deger;
  delete require.cache[require.resolve(ADMIN_YOL)];
  const m = require(ADMIN_YOL);
  if (eski === undefined) delete process.env.TRANORD_ADMIN;
  else process.env.TRANORD_ADMIN = eski;
  return m;
}

test('liste boşsa HİÇ KİMSE admin değil — güvenli varsayılan', () => {
  const m = adminModulu(undefined);
  assert.equal(m.isAdminEmail('ben@ornek.com'), false);
  assert.equal(m.isAdminEmail(''), false);
  assert.equal(m.isAdminEmail(null), false);
  assert.equal(m.ADMIN_EMAILS.size, 0);

  /* Boş dize de liste sayılmamalı */
  const bos = adminModulu('');
  assert.equal(bos.ADMIN_EMAILS.size, 0);
  assert.equal(bos.isAdminEmail('ben@ornek.com'), false);
});

test('listedeki e-posta admin, ötekiler değil', () => {
  const m = adminModulu('ben@ornek.com, ortak@ornek.com');
  assert.equal(m.isAdminEmail('ben@ornek.com'), true);
  assert.equal(m.isAdminEmail('ortak@ornek.com'), true);
  assert.equal(m.isAdminEmail('baskasi@ornek.com'), false);
});

test('büyük/küçük harf ve boşluk yetkiyi atlatmıyor', () => {
  const m = adminModulu('  Ben@Ornek.COM  ');
  assert.equal(m.isAdminEmail('ben@ornek.com'), true);
  assert.equal(m.isAdminEmail('BEN@ORNEK.COM'), true);
  assert.equal(m.isAdminEmail('  ben@ornek.com '), true);
  /* Benzer ama farklı adres geçmemeli */
  assert.equal(m.isAdminEmail('ben@ornek.com.tr'), false);
  assert.equal(m.isAdminEmail('xben@ornek.com'), false);
});
