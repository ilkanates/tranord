#!/usr/bin/env bash
# Gecelik PostgreSQL yedeği — 14 gün saklanır.
set -euo pipefail
DIR=/var/backups/tranord
mkdir -p "$DIR"
F="$DIR/tranord-$(date +%F-%H%M).sql.gz"
sudo -u postgres pg_dump tranord | gzip > "$F"
find "$DIR" -name 'tranord-*.sql.gz' -mtime +14 -delete
echo "yedek: $F ($(du -h "$F" | cut -f1))"
