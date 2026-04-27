# Tranord — Deploy Rehberi

## Genel Mimari

```
Cloudflare Pages          Railway                    Railway
(landing site)    ──→    (game server)    ──→    (PostgreSQL DB)
GameAI/           JWT    tranord/server/           otomatik bağlı
```

---

## 1. Railway'e Game Server Deploy

### Adımlar

1. **railway.com**'a git, GitHub hesabınla giriş yap.
2. **New Project → Deploy from GitHub repo** seç.
3. `tranord` klasörünü (ya da o klasörü içeren repo'yu) seç.
4. Railway `railway.json` dosyasını okuyacak ve `server/` klasörünü deploy edecek.
   - Eğer monorepo ise: **Root Directory** = `server` olarak ayarla.

### PostgreSQL ekle

1. Proje sayfasında **+ New → Database → PostgreSQL** tıkla.
2. Railway otomatik olarak `DATABASE_URL` env variable'ını server'a bağlar.

### Environment Variables (Server)

Railway dashboard → Service → Variables sekmesinde şunları ekle:

| Değişken | Örnek Değer | Açıklama |
|---|---|---|
| `JWT_SECRET` | `super-gizli-rastgele-string-123` | JWT imzalama anahtarı (güçlü, rastgele seç) |
| `CLIENT_URL` | `https://tranord-game.vercel.app` | Oyun client'ının URL'i (aşağıda ayarlanacak) |
| `DATABASE_URL` | *(otomatik eklenir)* | PostgreSQL bağlantı URL'i |
| `PORT` | *(otomatik eklenir)* | Railway otomatik set eder |

### Server URL'ini not al
Deploy sonrası Railway sana bir URL verir:
`https://tranord-server-xxxx.up.railway.app`
Bu URL'i bir yere not et.

---

## 2. Oyun Client Deploy (Vercel veya aynı Railway servisi)

### Seçenek A: Vercel (Önerilen)
1. `tranord/client/` klasörünü Vercel'e deploy et (ya da aynı repo'dan root dir = `client`).
2. Vercel'de **Environment Variables** ekle:

| Değişken | Değer |
|---|---|
| `VITE_SERVER_URL` | `https://tranord-server-xxxx.up.railway.app` |
| `VITE_LANDING_URL` | `https://tranord.pages.dev` (Cloudflare Pages URL'in) |

3. Deploy sonrası oyun URL'ini not al: `https://tranord-game.vercel.app`
4. Bu URL'i Railway'deki `CLIENT_URL` değişkenine gir.

### Seçenek B: Railway'de aynı servisle (Express static serve)
Server'a statik dosya serve eklenebilir ama Vercel daha kolay.

---

## 3. Cloudflare Pages (Landing Site) Güncelleme

`GameAI/index.html` dosyasına aşağıdaki satırları `<head>` içine ekle:

```html
<!-- API ve oyun URL'lerini Cloudflare Pages environment variable olarak set edebilirsin -->
<!-- ya da doğrudan aşağıdaki satırları ekleyebilirsin: -->
<script>
  window.TRANORD_API_URL  = 'https://tranord-server-xxxx.up.railway.app';
  window.TRANORD_GAME_URL = 'https://tranord-game.vercel.app';
</script>
```

Bu satırları mevcut `<script>` etiketlerinden ÖNCE koy.

> **İpucu:** Cloudflare Pages'te `_worker.js` veya environment variable ile de ayarlayabilirsin.
> Ama en basit yol: URL'leri doğrudan `index.html`'e yazmak.

---

## 4. Yerel Test (geliştirme ortamı)

### Server
```bash
cd tranord/server
npm install          # pg, bcrypt, jsonwebtoken yüklenir
# .env dosyası oluştur:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/tranord
# JWT_SECRET=local-dev-secret
npm start
```

### Client
```bash
cd tranord/client
# .env.local dosyası oluştur:
# VITE_SERVER_URL=http://localhost:3001
# VITE_LANDING_URL=http://localhost:8080
npm install
npm run dev
```

### Landing site
```bash
# GameAI/index.html'i herhangi bir static server ile aç
cd Downloads/GameAI
npx serve .   # ya da python -m http.server 8080
```

---

## 5. İlk Çalıştırma Akışı

1. Landing site açılır → kullanıcı kayıt olur (`/auth/register`)
2. Server JWT döndürür → `localStorage`'a kaydedilir
3. "Play Now" butonuna tıklanır → `?token=xxx` ile oyuna yönlendirilir
4. Oyun token'ı okur → Socket.io ile server'a bağlanır
5. Server token doğrular → DB'den köy yüklenir (ya da yeni oluşturulur)
6. Oyun başlar!

---

## 6. Güvenlik Notları

- `JWT_SECRET` kesinlikle güçlü ve rastgele olmalı (min 32 karakter).
- HTTPS her iki deployment'ta da otomatik aktif (Railway + Vercel + Cloudflare hepsi HTTPS sağlar).
- `bcrypt` ile şifreler hash'lenerek saklanır, düz metin yok.
- Token `localStorage`'da tutulur; 30 gün geçerli (değiştirmek için `auth.js`'teki `expiresIn`'i düzenle).
