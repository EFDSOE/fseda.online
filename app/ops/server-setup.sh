#!/usr/bin/env bash
# Runs ON THE SERVER as root (deploy.sh calls it via sudo after uploading the code).
# Safe to run again and again: it only changes what differs.
set -euo pipefail

ROOT=/var/www/fseda.online
OPS="$ROOT/app/ops"
SITE=/etc/nginx/sites-available/fseda.online

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

say "Node.js prüfen"
if ! command -v node >/dev/null; then
  echo "Node.js fehlt. Installiere es zuerst (siehe README)."; exit 1
fi
if ! node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=13)?0:1)'; then
  echo "Node.js $(node -v) ist zu alt. Benötigt wird mindestens 22.13 (eingebautes SQLite)."; exit 1
fi
echo "Node.js $(node -v) ok"

say "Datenordner"
install -d -o deploy -g deploy -m 750 "$ROOT/data"
echo "$ROOT/data"

say "systemd-Dienste"
changed=0
for unit in fseda-api.service fseda-backup.service fseda-backup.timer; do
  if ! cmp -s "$OPS/$unit" "/etc/systemd/system/$unit"; then
    install -m 644 "$OPS/$unit" "/etc/systemd/system/$unit"
    echo "aktualisiert: $unit"
    changed=1
  fi
done
[ "$changed" = 1 ] && systemctl daemon-reload
systemctl enable --quiet fseda-api.service fseda-backup.timer
systemctl start fseda-backup.timer
systemctl restart fseda-api.service
echo "fseda-api neu gestartet"

say "Nginx"
if cmp -s "$OPS/nginx-fseda.online.conf" "$SITE"; then
  echo "Konfiguration unverändert"
else
  missing=0
  for f in /etc/letsencrypt/live/fseda.online/fullchain.pem /etc/letsencrypt/live/fseda.online/privkey.pem \
           /etc/letsencrypt/options-ssl-nginx.conf /etc/letsencrypt/ssl-dhparams.pem; do
    if [ ! -e "$f" ]; then echo "fehlt: $f"; missing=1; fi
  done
  if [ "$missing" = 1 ]; then
    echo "Zertifikatsdateien fehlen – Nginx-Konfiguration bleibt unverändert. Erst Certbot ausführen (siehe README)."
  else
    backup="$SITE.bak-$(date +%Y%m%d-%H%M%S)"
    [ -e "$SITE" ] && cp "$SITE" "$backup" && echo "Sicherung: $backup"
    install -m 644 "$OPS/nginx-fseda.online.conf" "$SITE"
    ln -sf "$SITE" /etc/nginx/sites-enabled/fseda.online
    if nginx -t 2>&1; then
      systemctl reload nginx
      echo "Nginx neu geladen"
    else
      echo "nginx -t fehlgeschlagen – alte Konfiguration wird wiederhergestellt"
      [ -e "$backup" ] && cp "$backup" "$SITE"
      nginx -t && systemctl reload nginx
      exit 1
    fi
  fi
fi

say "API-Gesundheitscheck"
for i in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo "API antwortet auf Port 3000"
    exit 0
  fi
  sleep 1
done
echo "Die API antwortet nicht. Letzte Log-Zeilen:"
journalctl -u fseda-api -n 30 --no-pager
exit 1
