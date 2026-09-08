/**
 * Auth route'ları: /auth/register ve /auth/login
 * JWT döndürür, client bu token'ı Socket.io bağlantısında kullanır.
 */

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { createUser, findUserByEmail } = require('./db');

const router = express.Router();

/**
 * JWT ANAHTARI — üretimde ZORUNLU.
 *
 * Eskiden env yoksa sabit bir yedeğe düşüyordu; o sabit depoda yazılı olduğu
 * için anahtarı bilen herkes kendine geçerli token üretebilirdi. Artık
 * yalnızca yerel geliştirmede (NODE_ENV !== 'production' ve DATABASE_URL yok)
 * yedek kullanılıyor, üretimde sunucu açılmayı reddediyor.
 */
const { IS_PROD } = require('./env');
const JWT_SECRET = process.env.JWT_SECRET
  || (IS_PROD ? null : 'tranord-dev-secret-yalnizca-yerel');

if (!JWT_SECRET) {
  console.error('[AUTH] JWT_SECRET tanımlı değil — üretimde sabit anahtara düşmek '
    + 'kimlik doğrulamayı anlamsız kılar. Ortam değişkenini ayarlayıp tekrar başlatın.');
  process.exit(1);
}
if (JWT_SECRET.length < 24) {
  console.warn(`[AUTH] JWT_SECRET çok kısa (${JWT_SECRET.length} karakter) — en az 24 karakter önerilir.`);
}

const SALT_ROUNDS = 10;

/**
 * GİRİŞ DENEME SINIRI — IP başına kayan pencere.
 * Sunucu tek süreç olduğu için bellekte tutmak yeterli; dağıtık kurulumda
 * yerini Redis/Railway eklentisi alır.
 */
const LOGIN_WINDOW_MS = 10 * 60 * 1000;   // 10 dakika
const LOGIN_MAX_TRIES = 10;               // pencere başına 10 başarısız deneme
const loginHits = new Map();              // ip -> [zaman damgaları]

function loginAllowed(ip) {
  const now = Date.now();
  const hits = (loginHits.get(ip) || []).filter(t => now - t < LOGIN_WINDOW_MS);
  loginHits.set(ip, hits);
  if (loginHits.size > 5000) loginHits.clear();   // bellek koruması
  return hits.length < LOGIN_MAX_TRIES;
}
function loginFailed(ip) {
  const hits = loginHits.get(ip) || [];
  hits.push(Date.now());
  loginHits.set(ip, hits);
}
function loginSucceeded(ip) { loginHits.delete(ip); }

const clientIp = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  || req.socket?.remoteAddress || 'bilinmeyen';

// Token oluştur
function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Token doğrula (middleware veya socket auth için)
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre gerekli' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Bu email zaten kayıtlı' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser(email, passwordHash);
    const token = signToken(user);

    res.json({ token, email: user.email, userId: user.id });
  } catch (err) {
    console.error('[AUTH] Register error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const ip = clientIp(req);
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre gerekli' });
    }
    if (!loginAllowed(ip)) {
      console.warn(`[AUTH] deneme sınırı aşıldı: ${ip}`);
      return res.status(429).json({
        error: 'Çok fazla başarısız deneme. 10 dakika sonra tekrar deneyin.',
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      loginFailed(ip);
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      loginFailed(ip);
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }

    loginSucceeded(ip);
    const token = signToken(user);
    res.json({ token, email: user.email, userId: user.id });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// GET /auth/me  (token doğrulama — opsiyonel)
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token yok' });
  }
  try {
    const payload = verifyToken(authHeader.slice(7));
    res.json({ userId: payload.userId, email: payload.email });
  } catch {
    res.status(401).json({ error: 'Geçersiz token' });
  }
});

module.exports = { router, verifyToken };
