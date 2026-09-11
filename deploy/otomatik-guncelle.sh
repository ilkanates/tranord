#!/usr/bin/env bash
#
# TraNord — OTOMATİK GÜNCELLEME.
#
# systemd timer'ı bunu periyodik çağırır. İki şey kritik:
#
#   1) DEĞİŞİKLİK YOKSA HİÇBİR ŞEY YAPMA. guncelle.sh koşulsuz çalışır:
#      npm ci + build + `systemctl restart`. Doğrudan timer'a bağlansaydı
#      hiç yeni commit olmasa bile servis her turda yeniden başlar ve o an
#      oynayan herkes düşerdi. Burada önce `git fetch` + karşılaştırma var.
#
#   2) BOZUK SÜRÜM CANLIDA KALMASIN. Güncelleme sonrası sağlık kontrolü
#      yapılıyor; sunucu cevap vermiyorsa ÖNCEKİ commit'e geri dönülüyor ve
#      EL FRENİ çekiliyor — yoksa aynı bozuk commit her 5 dakikada bir
#      yeniden denenir ve oyun sürekli inip kalkar.
#
# El freni: $FREN dosyası varken otomatik güncelleme atlanır. Denge ayarı
# yaparken ya da elle müdahale sırasında `touch` ile çekilir, `rm` ile bırakılır.
#
#   systemctl status tranord-otomatik.timer     # çalışıyor mu
#   journalctl -u tranord-otomatik -n 50        # ne yaptı
#
set -uo pipefail        # -e YOK: hata dallarını aşağıda kendimiz yönetiyoruz

APP_DIR=/opt/tranord
APP_USER=tranord
FREN=/etc/tranord-otomatik-kapali
SAGLIK=http://127.0.0.1:3311/

g() { sudo -u "$APP_USER" "$@"; }
log() { printf '%s\n' "$*"; }

if [ -f "$FREN" ]; then
  log "el freni çekili ($FREN) — atlandı"
  exit 0
fi

cd "$APP_DIR" || { log "HATA: $APP_DIR yok"; exit 1; }

# Ağ bir an gitmiş olabilir; bu bir hata değil, sonraki turda yine denenir
if ! g git fetch --quiet origin 2>/dev/null; then
  log "git fetch başarısız (ağ?) — sonraki turda tekrar denenecek"
  exit 0
fi

YEREL=$(g git rev-parse HEAD)
UZAK=$(g git rev-parse origin/main)
[ "$YEREL" = "$UZAK" ] && exit 0          # değişiklik yok: servise DOKUNMA

log "yeni sürüm: ${YEREL:0:7} -> ${UZAK:0:7}"

saglikli() { curl -sf --max-time 10 "$SAGLIK" >/dev/null 2>&1; }

if bash "$APP_DIR/deploy/guncelle.sh"; then
  sleep 5
  if saglikli; then
    log "OK: ${UZAK:0:7} canlıda"
    exit 0
  fi
  log "SAĞLIK KONTROLÜ BAŞARISIZ — ${YEREL:0:7} sürümüne geri dönülüyor"
else
  log "GÜNCELLEME BAŞARISIZ — ${YEREL:0:7} sürümüne geri dönülüyor"
fi

# ── Geri alma ────────────────────────────────────────────────────────
g git reset --hard --quiet "$YEREL"
g npm ci --omit=dev --prefix "$APP_DIR/server" --no-audit --no-fund >/dev/null 2>&1
g npm ci --prefix "$APP_DIR/client" --no-audit --no-fund >/dev/null 2>&1
g npm run build --prefix "$APP_DIR/client" >/dev/null 2>&1
systemctl restart tranord
sleep 5

if saglikli; then
  log "geri alındı: ${YEREL:0:7} tekrar canlıda"
else
  log "GERİ ALMA DA BAŞARISIZ — ELLE MÜDAHALE GEREKİYOR"
fi

# Aynı bozuk commit her turda yeniden denenmesin
{
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)  ${UZAK:0:7} bozuk geldi, otomatik güncelleme durduruldu."
  echo "Düzeltip yeni commit gönderdikten sonra bu dosyayı silin:"
  echo "  sudo rm $FREN"
} > "$FREN"
log "EL FRENİ ÇEKİLDİ: $FREN"
exit 1
