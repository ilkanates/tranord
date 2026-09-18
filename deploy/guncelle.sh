#!/usr/bin/env bash
# TraNord — kodu güncelle ve servisi yeniden başlat. root olarak çalıştır.
set -euo pipefail
APP_DIR=/opt/tranord
APP_USER=tranord

cd "$APP_DIR"
ONCE="$(sudo -u $APP_USER git rev-parse --short HEAD)"
sudo -u "$APP_USER" git fetch --quiet origin
sudo -u "$APP_USER" git reset --hard --quiet origin/main
SONRA="$(sudo -u $APP_USER git rev-parse --short HEAD)"
echo "kod: $ONCE -> $SONRA"

sudo -u "$APP_USER" npm ci --omit=dev --prefix "$APP_DIR/server" --no-audit --no-fund
sudo -u "$APP_USER" npm ci --prefix "$APP_DIR/client" --no-audit --no-fund
sudo -u "$APP_USER" npm run build --prefix "$APP_DIR/client"
[ -f "$APP_DIR/client/dist/index.html" ] || { echo "HATA: derleme çıktı vermedi, servise dokunulmadı"; exit 1; }

# ── nginx ayarı: depodaki sürüm sunucuya uygulanır ──────────────────
#
# Eskiden yalnız kurulumda kopyalanıyordu; depo ile sunucu ayrışıyor ve
# fark ancak bir özellik canlıda patlayınca görülüyordu (admin uçları
# iletilmiyordu). Bozuk ayar siteyi indirebileceği için önce sınanıyor.
NGINX_KAYNAK="$APP_DIR/deploy/nginx-tranord.conf"
NGINX_HEDEF=/etc/nginx/sites-available/tranord
if [ -f "$NGINX_KAYNAK" ] && ! cmp -s "$NGINX_KAYNAK" "$NGINX_HEDEF"; then
  echo "nginx ayarı değişmiş — sınanıyor"
  cp -a "$NGINX_HEDEF" "$NGINX_HEDEF.yedek"
  install -m 644 "$NGINX_KAYNAK" "$NGINX_HEDEF"
  if nginx -t 2>&1; then
    systemctl reload nginx
    echo "nginx ayarı güncellendi"
  else
    cp -a "$NGINX_HEDEF.yedek" "$NGINX_HEDEF"
    echo "!!! nginx ayarı GEÇERSİZ — eski ayar geri konuldu, nginx'e dokunulmadı"
  fi
fi

systemctl restart tranord
sleep 3
systemctl --no-pager --lines=0 status tranord | head -4
curl -s --max-time 5 http://127.0.0.1:3311/ | head -c 200; echo
