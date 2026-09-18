/**
 * ADMIN PANELİ — başka bir oyuncunun hesabına girme.
 *
 * İlkan: *"bir admin paneli girişi ekle. Admin olarak herkesin
 * kullanıcısına girebiliyor olmalıyım."*
 *
 * ── GÜVENLİK MODELİ ────────────────────────────────────────────────
 *
 * Bu dosya BAŞKASININ HESABINA GİRME yetkisi veriyor, yani oyunun en
 * hassas kapısı. Üç kural:
 *
 * 1) YETKİ LİSTESİ ORTAM DEĞİŞKENİNDE (`TRANORD_ADMIN`), kodda değil.
 *    E-postayı kaynağa gömmek, herkese açık bir depoda yetkili hesabı
 *    ilan etmek olurdu; ayrıca yetkiyi değiştirmek için sürüm çıkmak
 *    gerekirdi.
 *
 * 2) GÜVENLİ VARSAYILAN: değişken boşsa ADMIN YOK. Eksik yapılandırma
 *    kapıyı açık bırakmamalı — "kimse admin değil" güvenli tarafta
 *    hata yapmak, "ilk kullanıcı admindir" gibi bir tahmin ise değil.
 *
 * 3) HER TAKLİT KAYDA GEÇİYOR. Kim, kimin hesabına, ne zaman girdi —
 *    denetlenebilir olmayan bir arka kapı, arka kapıdır.
 *
 * Adminin KENDİ girişi normal akıştan geçiyor (e-posta + şifre); burada
 * yeni bir şifre yolu yok. Taklit, adminin zaten doğrulanmış token'ıyla
 * yapılıyor.
 */
const express = require('express');
const { verifyToken } = require('./auth');
const { findUserById, listPlayers } = require('./db');

const router = express.Router();

/**
 * ADMİN E-POSTALARI — virgülle ayrılmış liste.
 *
 * Örnek: TRANORD_ADMIN="ben@ornek.com,ortak@ornek.com"
 * Boşsa admin yok (bkz. dosya başı · güvenli varsayılan).
 */
const ADMIN_EMAILS = new Set(
  String(process.env.TRANORD_ADMIN || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
);

/** Bu e-posta admin mi? Liste boşsa hiç kimse değil. */
function isAdminEmail(email) {
  if (!ADMIN_EMAILS.size) return false;
  return ADMIN_EMAILS.has(String(email || '').trim().toLowerCase());
}

/**
 * İsteğin sahibi admin mi — token'dan okunuyor.
 *
 * TOKEN'DAKİ E-POSTA YETERLİ DEĞİL: token 30 gün geçerli ve bu sürede
 * yetki listesinden çıkarılmış olabilir. Liste her istekte yeniden
 * okunuyor (değişken süreç ömrü boyunca sabit, ama kontrol tek yerde
 * duruyor ve ileride veritabanına taşınabilir).
 */
function adminOf(req) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  try {
    const p = verifyToken(h.slice(7));
    if (!isAdminEmail(p.email)) return null;
    return p;
  } catch {
    return null;
  }
}

/** Admin değilse 404 — "burada bir kapı var" bilgisini bile vermiyoruz */
function adminGate(req, res, next) {
  const admin = adminOf(req);
  if (!admin) {
    /*
      401 DEĞİL 404: 401, "doğru yetkiyle erişilebilecek bir uç var"
      demektir ve saldırgana hedef gösterir. Admin olmayan için bu yol
      hiç yok.
    */
    return res.status(404).json({ error: 'Bulunamadı' });
  }
  req.admin = admin;
  next();
}

/**
 * GET /admin/users — oyuncu listesi.
 *
 * Şifre ÖZETİ bile dönmüyor: panelin ihtiyacı kimlik ve ad; hash'i
 * ağa çıkarmanın hiçbir faydası yok, sızma riski var.
 */
router.get('/users', adminGate, async (req, res) => {
  try {
    const liste = await listPlayers();
    res.json({
      admin: req.admin.email,
      users: liste.map(u => ({
        id: u.id,
        email: u.email,
        name: u.display_name || u.name || null,
        koySayisi: u.village_count ?? null,
      })),
    });
  } catch (err) {
    console.error('[ADMIN] liste:', err.message);
    res.status(500).json({ error: 'Liste alınamadı' });
  }
});

/**
 * POST /admin/impersonate { userId } — o kullanıcının token'ı.
 *
 * Dönen token NORMAL bir oyuncu token'ı: admin o hesaba girdiğinde
 * oyunun geri kalanı için sıradan bir oyuncu oluyor. Ayrı bir "admin
 * modu" eklemek, her özelliğin iki kere düşünülmesi demekti.
 */
router.post('/impersonate', adminGate, async (req, res) => {
  try {
    const userId = Number(req.body?.userId);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: 'userId gerekli' });
    }
    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı yok' });

    /* Denetim kaydı — kim kimin hesabına girdi */
    console.log(`[ADMIN] ${req.admin.email} → ${user.email} (#${user.id}) hesabına girdi`);

    const { signToken } = require('./auth');
    res.json({ token: signToken(user), email: user.email, userId: user.id });
  } catch (err) {
    console.error('[ADMIN] impersonate:', err.message);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

/*
  `adminGate` DIŞA AÇIK: NPC sıfırlama yolu index.js'te duruyor (WORLD
  ve tohumlama kuyruğu orada), ama AYNI kapıdan geçmek zorunda. İkinci
  bir yetki kontrolü yazmak, iki kuralın ayrışması demekti.
*/
module.exports = { router, isAdminEmail, ADMIN_EMAILS, adminGate };
