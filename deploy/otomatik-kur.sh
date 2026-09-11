#!/usr/bin/env bash
#
# TraNord — otomatik güncelleme + gecelik yedek zamanlayıcılarını kurar.
#
# Pi'de BİR KEZ, root olarak çalıştırılır:
#   ssh pi@100.99.69.108 "sudo bash /opt/tranord/deploy/otomatik-kur.sh"
#
# Tekrar çalıştırılabilir: var olanı bozmadan eksikleri tamamlar.
#
# NE KURAR
#   tranord-otomatik.timer  → 5 dakikada bir origin/main'i kontrol eder,
#                             DEĞİŞMİŞSE günceller. Değişmemişse hiçbir şey
#                             yapmaz (servise dokunmaz).
#   tranord-yedek.timer     → her gece 04:30 PostgreSQL yedeği.
#                             Bu betik yazılmıştı ama HİÇBİR ZAMANLAYICIYA
#                             bağlı değildi: yedek script'i vardı, yedek yoktu.
#
# /usr/local/bin altındaki üç giriş de ince sarmalayıcı: asıl mantık
# /opt/tranord/deploy/*.sh içinde, yani `git pull` onları da günceller.
#
set -euo pipefail

APP_DIR=/opt/tranord
UNIT_DIR=/etc/systemd/system

[ "$(id -u)" = 0 ] || { echo "root olarak çalıştır: sudo bash $0"; exit 1; }
[ -d "$APP_DIR/deploy" ] || { echo "HATA: $APP_DIR/deploy yok"; exit 1; }

log() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }

log "1/4 Komut sarmalayıcıları"
sarmala() {
  local ad="$1" hedef="$2"
  printf '#!/usr/bin/env bash\nexec bash %s "$@"\n' "$hedef" > "/usr/local/bin/$ad"
  chmod 755 "/usr/local/bin/$ad"
  echo "  /usr/local/bin/$ad -> $hedef"
}
sarmala tranord-guncelle "$APP_DIR/deploy/guncelle.sh"
sarmala tranord-otomatik "$APP_DIR/deploy/otomatik-guncelle.sh"
sarmala tranord-yedek    "$APP_DIR/deploy/yedek.sh"

log "2/4 systemd birimleri"
for f in tranord-otomatik.service tranord-otomatik.timer \
         tranord-yedek.service tranord-yedek.timer; do
  install -m 644 "$APP_DIR/deploy/$f" "$UNIT_DIR/$f"
  echo "  $UNIT_DIR/$f"
done
systemctl daemon-reload

log "3/4 Zamanlayıcıları başlat"
systemctl enable --now tranord-otomatik.timer
systemctl enable --now tranord-yedek.timer

log "4/4 Durum"
systemctl list-timers --no-pager 'tranord-*' || true
echo
echo "  Ne yaptığını görmek için:"
echo "    journalctl -u tranord-otomatik -n 50 --no-pager"
echo "    journalctl -u tranord-yedek    -n 20 --no-pager"
echo
echo "  EL FRENİ — otomatik güncellemeyi geçici durdurmak için:"
echo "    sudo touch /etc/tranord-otomatik-kapali     # durdur"
echo "    sudo rm    /etc/tranord-otomatik-kapali     # devam"
echo
echo "  Bozuk bir sürüm gelirse betik kendini geri alır ve el frenini"
echo "  ÇEKER; sebebi o dosyanın içine yazılır."
