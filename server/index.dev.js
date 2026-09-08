/**
 * DEV giriş noktası — PostgreSQL gerektirmez.
 *
 *   cd server && node index.dev.js
 *
 * index.js'i ve auth.js'i hiç değiştirmeden, onların require('./db') çağrısını
 * db.dev.js'e yönlendirir. Oyun motoru birebir aynı çalışır.
 */
const Module = require('module');
const path   = require('path');
const net    = require('net');

const DEV_DB   = path.join(__dirname, 'db.dev.js');
const origLoad = Module._load;

Module._load = function (request, parent, isMain) {
  const isDbRequest   = request === './db' || request === './db.js';
  const fromServerDir = parent && path.dirname(parent.filename) === __dirname;
  if (isDbRequest && fromServerDir) return origLoad(DEV_DB, parent, isMain);
  return origLoad(request, parent, isMain);
};

process.env.JWT_SECRET ||= 'tranord-local-dev-secret';
process.env.PORT       ||= '3311';

const PORT = Number(process.env.PORT);

// Port doluysa net bir hata ver, sessizce çakışma
const probe = net.createServer();
probe.once('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  HATA: ${PORT} portu dolu.`);
    console.error(`  Kim tutuyor:  netstat -ano | findstr :${PORT}`);
    console.error(`  Baska port:   set PORT=3312 && node index.dev.js`);
    console.error(`  (client/.env.local icindeki VITE_SERVER_URL'i de guncelle)\n`);
  } else {
    console.error('  Port kontrolu basarisiz:', err.message);
  }
  process.exit(1);
});
probe.once('listening', () => {
  probe.close(() => {
    console.log('+---------------------------------------------------+');
    console.log('|  TRANORD - DEV MODU (PostgreSQL gerekmez)          |');
    console.log(`|  Sunucu : http://localhost:${PORT}                    |`);
    console.log('|  Giris  : http://localhost:5180/dev-login.html     |');
    console.log('+---------------------------------------------------+');
    require('./index.js');
  });
});
probe.listen(PORT, '0.0.0.0');
