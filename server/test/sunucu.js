/**
 * TEST YARDIMCISI — gerçek sunucuyu ayağa kaldırır.
 *
 * Neden gerçek süreç? Bulunan hataların çoğu tek bir fonksiyonda değil,
 * KATMANLARIN ARASINDA yaşıyor: soket handler'ı fırlatıyor, Socket.io
 * yakalamıyor, süreç ölüyor. Bunu ancak sunucuyu gerçekten çalıştırıp
 * "hâlâ cevap veriyor mu?" diye sorarak yakalayabiliyoruz.
 *
 * İZOLASYON: her koşum kendi geçici veri dosyasını kullanır
 * (TRANORD_DEV_DATA). Yol sabitken testler geliştiricinin GERÇEK dev
 * dünyasına yazıyordu — test kullanıcıları aynı dosyaya ekleniyor, testin
 * ortasında kesilen bir kayıt oyuncunun köyünü bozabiliyordu.
 */
const { spawn } = require('node:child_process');
const path = require('node:path');
const os   = require('node:os');
const fs   = require('node:fs');
const net  = require('node:net');

const SUNUCU_DIZINI = path.join(__dirname, '..');

/** socket.io-client sunucunun devDependency'si (üretimde --omit=dev ile atlanır) */
function socketIstemcisi() {
  try {
    return require('socket.io-client').io;
  } catch {
    throw new Error(
      'socket.io-client bulunamadı. Testleri çalıştırmak için: cd server && npm install'
    );
  }
}

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/** İşletim sisteminden boş bir port iste */
function bosPort() {
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.once('error', rej);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
}

/**
 * Dev sunucusunu başlat ve HTTP'ye cevap verene kadar bekle.
 * Döndürülen nesne `kapat()` ile temizlenir — testin sonunda MUTLAKA çağır.
 */
async function sunucuBaslat({ hile = true, acilisSaniye = 90 } = {}) {
  const gecici = fs.mkdtempSync(path.join(os.tmpdir(), 'tranord-test-'));
  const port = await bosPort();

  const surec = spawn(process.execPath, ['index.dev.js'], {
    cwd: SUNUCU_DIZINI,
    env: {
      ...process.env,
      PORT: String(port),
      TRANORD_DEV: '1',
      TRANORD_DEV_DATA: path.join(gecici, 'dev-data.json'),
      TRANORD_DEV_CHEATS: hile ? '1' : '0',
    },
  });

  let kayit = '';
  surec.stdout.on('data', (d) => { kayit += d; });
  surec.stderr.on('data', (d) => { kayit += d; });
  let cikisKodu = null;
  surec.on('exit', (c) => { cikisKodu = c; });

  const taban = `http://127.0.0.1:${port}`;
  const bitis = Date.now() + acilisSaniye * 1000;
  let hazir = false;
  while (Date.now() < bitis) {
    if (cikisKodu !== null) break;
    await bekle(400);
    try { if ((await fetch(taban)).ok) { hazir = true; break; } } catch { /* daha açılmadı */ }
  }

  const sunucu = {
    port,
    taban,
    get kayit() { return kayit; },
    get cikisKodu() { return cikisKodu; },
    /** Sunucu hâlâ istek karşılıyor mu? Çökme testlerinin ölçütü budur. */
    async ayaktaMi() {
      if (cikisKodu !== null) return false;
      try { return (await fetch(taban, { signal: AbortSignal.timeout(4000) })).ok; }
      catch { return false; }
    },
    async kapat() {
      surec.kill();
      await bekle(300);
      try { fs.rmSync(gecici, { recursive: true, force: true }); } catch { /* Windows kilidi */ }
    },
  };

  if (!hazir) {
    await sunucu.kapat();
    throw new Error(`Sunucu ${acilisSaniye} sn içinde açılmadı. Çıktı:\n${kayit}`);
  }
  return sunucu;
}

/** Yeni bir hesap aç, jetonu döndür */
async function hesapAc(sunucu) {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ornek.test`;
  const yanit = await fetch(sunucu.taban + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'parola123' }),
  }).then((r) => r.json());
  if (!yanit.token) throw new Error('kayıt başarısız: ' + JSON.stringify(yanit));
  return { email, token: yanit.token };
}

/**
 * Sokete bağlan ve İLK köy paketini bekle.
 * `koy` alanı gelen her `village_update` ile birleşerek güncel kalır —
 * sunucu değişmeyen alanları göndermiyor (bkz. emitVillage).
 */
async function baglan(sunucu, token) {
  const io = socketIstemcisi();
  const s = io(sunucu.taban, { auth: { token }, transports: ['websocket'] });

  const ilk = await new Promise((res, rej) => {
    const zaman = setTimeout(() => rej(new Error('village_update gelmedi')), 25000);
    s.once('village_update', (v) => { clearTimeout(zaman); res(v); });
    s.once('connect_error', (e) => { clearTimeout(zaman); rej(e); });
  });

  const oturum = { soket: s, koy: ilk, kapat: () => s.close() };
  s.on('village_update', (v) => { oturum.koy = { ...oturum.koy, ...v }; });
  return oturum;
}

module.exports = { sunucuBaslat, hesapAc, baglan, bekle };
