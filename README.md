# mdify

Write Markdown, share it with a link. React (Vite) frontend, Django + Postgres API.

- Guests: up to 10 documents, kept up to 7 days.
- Signed-in users (optional email + password): up to 100 documents, kept up to 90 days.
- Expired documents are hidden immediately and deleted hourly (`mdify-purge.timer` runs `manage.py purge_expired`).

## Local development

```sh
cd backend && uv venv .venv && uv pip install -p .venv/bin/python -r requirements.txt
DEBUG=1 .venv/bin/python manage.py migrate
DEBUG=1 .venv/bin/python manage.py runserver 8017

cd frontend && npm install && npm run dev   # proxies /api to :8017
```

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`: build the frontend, rsync the repo to
`/opt/mdify/app` on the shared VPS and run `deploy/deploy_mdify.sh` (idempotent: creates the
database and `/etc/mdify/backend.env` on first run, migrates, publishes the frontend to
`/opt/mdify/www`, writes the nginx site, requests Let's Encrypt certificates, restarts services).

Repository secrets (same values as the other VPS apps): `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.

Gunicorn listens on `127.0.0.1:8017`. Hostnames are set by `HOSTS` in the deploy script.

Create an admin on the server:

```sh
cd /opt/mdify/app/backend && set -a && . /etc/mdify/backend.env && set +a
.venv/bin/python manage.py createsuperuser
```
