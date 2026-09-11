/**
 * ÜRETİM PAKETİ — canlıya ne çıkıyor?
 *
 * Vite `client/public/` içeriğini olduğu gibi `dist/`e kopyalar. Oraya konan
 * her dosya CANLI SUNUCUDA açık adres olur. Bu sessiz bir kapı: dosyayı
 * koyarken kimse "bu üretime çıkacak mı?" diye düşünmüyor.
 *
 * Gerçekten oldu: `dev-login.html` public/ altındaydı ve üretime çıkıyordu.
 * Sayfa e-posta + şifreyi `?server=` parametresindeki adrese POST ediyordu,
 * yani oyunun kendi alan adındaki bir bağlantı kurbanın şifresini başka bir
 * sunucuya yazdırabiliyordu. Yanında beş tasarım prototipi de açıktı.
 *
 * Geliştirme sayfaları artık `client/dev/` altında ve yalnız `vite dev`
 * sırasında servis ediliyor (bkz. client/vite.config.js → devSayfalari).
 * Bu test o ayrımın korunduğunu denetliyor.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ISTEMCI = path.join(__dirname, '..', '..', 'client');
const PUBLIC = path.join(ISTEMCI, 'public');
const DEV = path.join(ISTEMCI, 'dev');

test('public/ içinde HTML sayfası yok — oraya konan her şey canlıya çıkar', () => {
  const htmlDosyalari = fs.readdirSync(PUBLIC)
    .filter(f => f.toLowerCase().endsWith('.html'));

  assert.deepEqual(htmlDosyalari, [],
    'client/public/ içindeki HTML dosyaları üretime çıkar ve canlı sunucuda\n'
    + '    açık adres olur. Geliştirme sayfaları client/dev/ altına konmalı —\n'
    + '    orası yalnız `vite dev` sırasında servis ediliyor.\n'
    + '    Bulunanlar: ' + htmlDosyalari.join(', '));
});

test('geliştirme sayfaları client/dev/ altında duruyor', () => {
  assert.ok(fs.existsSync(DEV), 'client/dev/ dizini yok');
  const sayfalar = fs.readdirSync(DEV).filter(f => f.endsWith('.html'));
  assert.ok(sayfalar.includes('dev-login.html'),
    'dev-login.html client/dev/ altında bulunamadı — taşınmış ya da silinmiş olabilir');
});

test('vite.config.js geliştirme sayfalarını yalnız dev modunda servis ediyor', () => {
  const cfg = fs.readFileSync(path.join(ISTEMCI, 'vite.config.js'), 'utf8');
  assert.match(cfg, /apply:\s*'serve'/,
    "vite.config.js'teki dev sayfa eklentisinde `apply: 'serve'` yok — "
    + 'bu olmadan eklenti derlemede de çalışır ve sayfalar üretime sızabilir');
  assert.match(cfg, /devSayfalari/,
    'vite.config.js dev sayfa eklentisini kullanmıyor');
});

test('dev-login.html sunucu adresini yerel adreslerle sınırlıyor', () => {
  const html = fs.readFileSync(path.join(DEV, 'dev-login.html'), 'utf8');
  assert.match(html, /YEREL_ADRES/,
    'dev-login.html ?server= parametresini doğrulamıyor — sayfa şifreyi\n'
    + '    parametredeki adrese POST ediyor, adres serbest bırakılamaz');

  // Doğrulama düzeninin kendisini de sına: dosyadan çıkarıp çalıştır
  const m = /const YEREL_ADRES = (\/.*\/);/.exec(html);
  assert.ok(m, 'YEREL_ADRES deseni okunamadı');
  const desen = eval(m[1]);   // dosyadan okunan sabit desen
  for (const iyi of ['http://localhost:3311', 'https://127.0.0.1:3311', 'http://[::1]:5180']) {
    assert.ok(desen.test(iyi), `yerel adres reddedildi: ${iyi}`);
  }
  for (const kotu of ['https://kotu-site.example', 'http://localhost.kotu-site.example',
    'http://127.0.0.1.kotu-site.example', '//localhost:3311']) {
    assert.ok(!desen.test(kotu), `dış adres KABUL EDİLDİ: ${kotu}`);
  }
});
