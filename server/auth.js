/**
 * Auth route'ları: /auth/register ve /auth/login
 * JWT döndürür, client bu token'ı Socket.io bağlantısında kullanır.
 */

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { createUser, findUserByEmail } = require('./db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tranord-dev-secret-change-in-prod';
const SALT_ROUNDS = 10;

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
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre gerekli' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }

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
