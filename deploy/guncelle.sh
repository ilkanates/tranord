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

systemctl restart tranord
sleep 3
systemctl --no-pager --lines=0 status tranord | head -4
curl -s --max-time 5 http://127.0.0.1:3311/ | head -c 200; echo
