#!/usr/bin/env bash
#
# TraNord — Hetzner CX23 (Ubuntu 24.04) tek sunucu kurulumu.
#
# Mimari: nginx istemciyi servis eder ve /auth + /socket.io isteklerini aynı
# makinedeki Node sunucusuna geçirir. Tek origin olduğu için CORS diye bir
# mesele yok. PostgreSQL de aynı makinede, dışa kapalı.
#
#   nginx :80  ──/──────────►  /opt/tranord/client/dist   (statik)
#              ──/auth──────►  127.0.0.1:3311  (node)
#              ──/socket.io─►  127.0.0.1:3311  (websocket)
#                                    └─────────►  postgres 127.0.0.1:5432
#
# Kullanım (root olarak):
#   bash kurulum.sh git@github.com:ilkanates/tranord.git
#
# Betik iki kez çalıştırılabilir: var olanı bozmadan eksikleri tamamlar.
set -euo pipefail

REPO="${1:-git@github.com:ilkanates/tranord.git}"
APP_USER=tranord
APP_DIR=/opt/tranord
NODE_MAJOR=22
PORT=3311
ENV_FILE=/etc/tranord.env

log() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mHATA: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || die "root olarak çalıştır (sudo -i)."

log "1/9 Sistem paketleri"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg git nginx postgresql \
  postgresql-contrib ufw jq >/dev/null

log "2/9 Node.js ${NODE_MAJOR}"
if ! command -v node >/dev/null || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt "$NODE_MAJOR" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
node -v

log "3/9 Takas alanı (2 GB)"
# 4 GB RAM build sırasında yeter, ama takas alanı ucuz sigorta.
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

log "4/9 Uygulama kullanıcısı ve dizin"
id -u "$APP_USER" >/dev/null 2>&1 || adduser --system --group --home "$APP_DIR" "$APP_USER"
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ── Depoya erişim: salt-okunur deploy key ────────────────────────────
# Depo private olduğu için sunucunun kendi anahtarı olmalı. Anahtar burada
# üretilir ve ÖZEL kısmı sunucudan hiç çıkmaz.
SSH_DIR="$APP_DIR/.ssh"
mkdir -p "$SSH_DIR"; chmod 700 "$SSH_DIR"
if [ ! -f "$SSH_DIR/id_ed25519" ]; then
  sudo -u "$APP_USER" ssh-keygen -t ed25519 -N '' -C "tranord-deploy" -f "$SSH_DIR/id_ed25519" >/dev/null
fi
chown -R "$APP_USER:$APP_USER" "$SSH_DIR"
ssh-keyscan -H github.com >> "$SSH_DIR/known_hosts" 2>/dev/null
sort -u "$SSH_DIR/known_hosts" -o "$SSH_DIR/known_hosts"
chown "$APP_USER:$APP_USER" "$SSH_DIR/known_hosts"

if ! sudo -u "$APP_USER" git ls-remote "$REPO" -q >/dev/null 2>&1; then
  cat <<MSG

  ──────────────────────────────────────────────────────────────────
  Depoya erişim yok. Aşağıdaki satırı GitHub'a DEPLOY KEY olarak ekle:

    GitHub → tranord deposu → Settings → Deploy keys → Add deploy key
    (Başlık: hetzner-cx23 · "Allow write access" İŞARETLEMEDEN ekle)

MSG
  cat "$SSH_DIR/id_ed25519.pub"
  cat <<MSG

  Ekledikten sonra bu betiği tekrar çalıştır:  bash kurulum.sh $REPO
  ──────────────────────────────────────────────────────────────────
MSG
  exit 2
fi

log "5/9 Kod"
if [ -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git -C "$APP_DIR" fetch --quiet origin
  sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard --quiet origin/main
else
  sudo -u "$APP_USER" git clone --quiet "$REPO" "$APP_DIR/kod"
  shopt -s dotglob; mv "$APP_DIR/kod"/* "$APP_DIR"/; shopt -u dotglob
  rmdir "$APP_DIR/kod"
  chown -R "$APP_USER:$APP_USER" "$APP_DIR"
fi
sudo -u "$APP_USER" git -C "$APP_DIR" log -1 --oneline

log "6/9 PostgreSQL"
systemctl enable --now postgresql >/dev/null
DB_PASS_FILE=/root/.tranord-db-pass
if [ ! -f "$DB_PASS_FILE" ]; then
  openssl rand -hex 24 > "$DB_PASS_FILE"; chmod 600 "$DB_PASS_FILE"
fi
DB_PASS="$(cat "$DB_PASS_FILE")"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='tranord'" | grep -q 1 \
  || sudo -u postgres psql -qc "CREATE ROLE tranord LOGIN PASSWORD '$DB_PASS'"
sudo -u postgres psql -qc "ALTER ROLE tranord PASSWORD '$DB_PASS'"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='tranord'" | grep -q 1 \
  || sudo -u postgres createdb -O tranord tranord

log "7/9 Ortam değişkenleri ($ENV_FILE)"
# Sunucunun genel IP'si — Hetzner metadata servisinden, dışa istek atmadan.
PUBLIC_IP="$(curl -s --max-time 3 http://169.254.169.254/hetzner/v1/metadata/public-ipv4 || true)"
[ -n "$PUBLIC_IP" ] || PUBLIC_IP="$(hostname -I | awk '{print $1}')"
if [ ! -f "$ENV_FILE" ]; then
  JWT="$(openssl rand -hex 32)"
  cat > "$ENV_FILE" <<VARS
# TraNord üretim ortamı. Bu dosya sırlar içeriyor: chmod 600, repoya girmez.
NODE_ENV=production
PORT=$PORT
# Node yalnız döngü arayüzünde dinler; dışarıya nginx bakar.
HOST=127.0.0.1
DATABASE_URL=postgresql://tranord:$DB_PASS@127.0.0.1:5432/tranord
JWT_SECRET=$JWT
# Tarayıcıdan hangi adreslere izin verilecek (virgülle birden fazla).
# Alan adı alınca buraya https://alanadi.com yaz ve servisi yeniden başlat.
CLIENT_URL=http://$PUBLIC_IP
VARS
  chmod 600 "$ENV_FILE"
else
  # Şifre yenilendiyse bağlantı satırını güncel tut
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://tranord:$DB_PASS@127.0.0.1:5432/tranord|" "$ENV_FILE"
fi
grep -E '^(NODE_ENV|PORT|CLIENT_URL)=' "$ENV_FILE"

log "8/9 Bağımlılıklar ve istemci derlemesi"
sudo -u "$APP_USER" npm ci --omit=dev --prefix "$APP_DIR/server" --no-audit --no-fund
sudo -u "$APP_USER" npm ci --prefix "$APP_DIR/client" --no-audit --no-fund
# VITE_SERVER_URL VERİLMİYOR: istemci aynı origin'e bağlanır (bkz. App.jsx)
sudo -u "$APP_USER" npm run build --prefix "$APP_DIR/client"
[ -f "$APP_DIR/client/dist/index.html" ] || die "istemci derlemesi çıktı vermedi"

log "9/9 systemd + nginx + güvenlik duvarı"
install -m 644 "$APP_DIR/deploy/tranord.service" /etc/systemd/system/tranord.service
install -m 644 "$APP_DIR/deploy/nginx-tranord.conf" /etc/nginx/sites-available/tranord
ln -sf /etc/nginx/sites-available/tranord /etc/nginx/sites-enabled/tranord
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl daemon-reload
systemctl enable --now tranord >/dev/null
systemctl restart tranord
systemctl reload nginx

ufw allow 22/tcp >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

# Gecelik yedek: 03:15'te pg_dump, 14 gün saklanır
install -m 755 "$APP_DIR/deploy/yedek.sh" /usr/local/bin/tranord-yedek
mkdir -p /var/backups/tranord
( crontab -l 2>/dev/null | grep -v tranord-yedek; echo "15 3 * * * /usr/local/bin/tranord-yedek" ) | crontab -

sleep 4
log "Durum"
systemctl --no-pager --lines=0 status tranord | head -4 || true
echo
curl -s --max-time 5 "http://127.0.0.1:$PORT/" | head -c 300; echo
cat <<MSG

  ──────────────────────────────────────────────────────────────────
  Oyun:      http://$PUBLIC_IP
  Kayıtlar:  journalctl -u tranord -f
  Güncelle:  bash $APP_DIR/deploy/guncelle.sh
  Yedekler:  /var/backups/tranord (gecelik, 14 gün)

  NOT: HTTP üzerinden şifreler düz metin gider. Alan adı alınca:
    apt install certbot python3-certbot-nginx
    certbot --nginx -d alanadi.com
    ve $ENV_FILE içindeki CLIENT_URL'i https:// olarak güncelle.
  ──────────────────────────────────────────────────────────────────
MSG
