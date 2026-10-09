#!/usr/bin/env bash
# Idempotent install/update of mdify on the shared VPS. Run as root after the
# repository (with frontend/dist built) has been synced to /opt/mdify/app.
# First run creates the Postgres database and /etc/mdify/backend.env with
# generated secrets (never printed). Every run: install deps, migrate, publish
# the frontend, (re)write the nginx site, request missing TLS certificates,
# restart services and health-check.
set -euo pipefail

APP_DIR=/opt/mdify/app
BACKEND="$APP_DIR/backend"
ENV_DIR=/etc/mdify
ENV_FILE="$ENV_DIR/backend.env"
WWW=/opt/mdify/www
PORT=8017
DB_NAME=mdify
DB_USER=mdify
ACME_ROOT=/var/www/letsencrypt
SITE=/etc/nginx/sites-available/mdify.conf
# Public hostnames. The first one with a certificate is canonical.
HOSTS="${MDIFY_HOSTS:-mdify.js.org mdify.162-35-172-32.sslip.io}"

[ "$(id -u)" -eq 0 ] || { echo "Run as root." >&2; exit 1; }
test -f "$APP_DIR/frontend/dist/index.html" || { echo "Missing frontend build in $APP_DIR/frontend/dist." >&2; exit 1; }

if ss -ltn "sport = :$PORT" | grep -q ":$PORT" && ! systemctl is-active --quiet mdify-backend; then
  echo "Port $PORT is used by another service; aborting." >&2
  exit 1
fi

# --- Database + environment (first run only) ---------------------------------
if [ ! -f "$ENV_FILE" ]; then
  DB_PASSWORD="$(openssl rand -hex 24)"
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
    sudo -u postgres psql -q -c "ALTER ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD';"
  else
    sudo -u postgres psql -q -c "CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD';"
  fi
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
    sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
  fi
  sudo -u postgres psql -q -d "$DB_NAME" -c "REVOKE ALL ON DATABASE $DB_NAME FROM PUBLIC;"

  install -d -m 700 "$ENV_DIR"
  umask 077
  cat > "$ENV_FILE" <<ENV
DEBUG=False
DJANGO_SECRET_KEY=$(openssl rand -base64 48 | tr -d '\n/+=')
DATABASE_URL=postgres://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME
STATIC_ROOT=/opt/mdify/staticfiles
CACHE_DIR=/var/lib/mdify/cache
ALLOWED_HOSTS=
CSRF_TRUSTED_ORIGINS=
ENV
  umask 022
  chmod 600 "$ENV_FILE"
  echo "Created $ENV_FILE with generated secrets."
fi

ALLOWED="$(echo $HOSTS | tr ' ' ','),127.0.0.1,localhost"
ORIGINS="$(for h in $HOSTS; do printf 'https://%s,' "$h"; done | sed 's/,$//')"
# Secret shared with the Cloudflare Pages function (passed in by the workflow).
if [ -n "${PROXY_SECRET_IN:-}" ]; then
  sed -i '/^PROXY_SECRET=/d' "$ENV_FILE"
  printf 'PROXY_SECRET=%s\n' "$PROXY_SECRET_IN" >> "$ENV_FILE"
fi
sed -i -e "s|^ALLOWED_HOSTS=.*|ALLOWED_HOSTS=$ALLOWED|" -e "s|^CSRF_TRUSTED_ORIGINS=.*|CSRF_TRUSTED_ORIGINS=$ORIGINS|" "$ENV_FILE"

# --- Backend --------------------------------------------------------------------
usable_python() {
  local real
  real="$(readlink -f "$1" 2>/dev/null)" || return 1
  case "$real" in /root/*|/home/*) return 1 ;; esac
  "$real" -c 'import sys; sys.exit(sys.version_info < (3, 10))' 2>/dev/null || return 1
  echo "$real"
}
PYTHON=""
for candidate in python3.13 python3.12 python3.11 python3.10 python3; do
  path="$(command -v "$candidate" 2>/dev/null)" || continue
  if PYTHON="$(usable_python "$path")"; then break; fi
  PYTHON=""
done
test -n "$PYTHON" || { echo "A system Python 3.10+ outside /root and /home is required." >&2; exit 1; }

cd "$BACKEND"
usable_python .venv/bin/python >/dev/null || "$PYTHON" -m venv --clear .venv
.venv/bin/python -m pip install --quiet --upgrade pip
.venv/bin/python -m pip install --quiet -r requirements.txt
chmod 755 /opt/mdify
chmod -R go+rX "$APP_DIR"

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a
install -d -o www-data -g www-data -m 750 /var/lib/mdify /var/lib/mdify/cache
chown -R www-data:www-data /var/lib/mdify

.venv/bin/python manage.py check --deploy --fail-level ERROR
if ! .venv/bin/python manage.py migrate --check >/dev/null 2>&1; then
  BACKUP_DIR=/var/backups/mdify
  install -d -m 700 "$BACKUP_DIR"
  pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip > "$BACKUP_DIR/pre-migrate-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
  ls -1t "$BACKUP_DIR"/pre-migrate-*.sql.gz | tail -n +11 | xargs -r rm -f
fi
.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py collectstatic --noinput --clear >/dev/null

# --- Frontend -------------------------------------------------------------------
install -d -m 755 "$WWW"
rsync -a --delete "$APP_DIR/frontend/dist/" "$WWW/"
chmod -R go+rX "$WWW" /opt/mdify/staticfiles

# --- Services -------------------------------------------------------------------
install -m 644 "$APP_DIR"/deploy/systemd/mdify-backend.service "$APP_DIR"/deploy/systemd/mdify-purge.service "$APP_DIR"/deploy/systemd/mdify-purge.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --quiet mdify-backend mdify-purge.timer
systemctl restart mdify-backend
systemctl start mdify-purge.timer

# --- Nginx + TLS ----------------------------------------------------------------
install -m 644 "$APP_DIR/deploy/nginx/mdify-app.conf" /etc/nginx/snippets/mdify-app.conf
install -d -m 755 "$ACME_ROOT"

write_site() {
  {
    echo "# Generated by deploy_mdify.sh; edits are overwritten."
    for h in $HOSTS; do
      cert="/etc/letsencrypt/live/$h"
      echo "server {"
      echo "    listen 80;"
      echo "    listen [::]:80;"
      echo "    server_name $h;"
      echo "    location ^~ /.well-known/acme-challenge/ { root $ACME_ROOT; }"
      if [ -f "$cert/fullchain.pem" ]; then
        echo "    location / { return 301 https://\$host\$request_uri; }"
        echo "}"
        echo "server {"
        echo "    listen 443 ssl;"
        echo "    listen [::]:443 ssl;"
        echo "    http2 on;"
        echo "    server_name $h;"
        echo "    ssl_certificate $cert/fullchain.pem;"
        echo "    ssl_certificate_key $cert/privkey.pem;"
        echo "    include /etc/nginx/snippets/mdify-app.conf;"
      else
        echo "    include /etc/nginx/snippets/mdify-app.conf;"
      fi
      echo "}"
    done
  } > "$SITE"
  ln -sf "$SITE" /etc/nginx/sites-enabled/mdify.conf
  if ! nginx -t 2>/dev/null; then
    # Older nginx without the `http2` directive.
    sed -i -e 's/^    http2 on;$//' -e 's/listen 443 ssl;/listen 443 ssl http2;/' -e 's/listen \[::\]:443 ssl;/listen [::]:443 ssl http2;/' "$SITE"
  fi
  if ! nginx -t; then
    # Never leave a broken config behind: other apps on this server reload nginx too.
    rm -f /etc/nginx/sites-enabled/mdify.conf
    echo "nginx -t failed; mdify site disabled." >&2
    exit 1
  fi
  systemctl reload nginx
}

write_site
issued=0
if command -v certbot >/dev/null; then
  for h in $HOSTS; do
    [ -f "/etc/letsencrypt/live/$h/fullchain.pem" ] && continue
    if certbot certonly --webroot -w "$ACME_ROOT" -d "$h" --non-interactive --agree-tos \
        --register-unsafely-without-email --deploy-hook "systemctl reload nginx" >/dev/null 2>&1; then
      echo "Issued certificate for $h."
      issued=1
    else
      echo "No certificate for $h yet (DNS not pointing here?). Serving HTTP only for it."
    fi
  done
else
  echo "certbot not installed; serving HTTP only." >&2
fi
[ "$issued" -eq 1 ] && write_site

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORT/api/health/" >/dev/null; then
    echo "mdify deployed and healthy. Hosts: $HOSTS"
    exit 0
  fi
  sleep 1
done
journalctl -u mdify-backend -n 40 --no-pager
echo "mdify backend did not become healthy in time." >&2
exit 1
