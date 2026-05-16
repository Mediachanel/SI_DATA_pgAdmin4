# SI-SDMK Deployment Guide

## 1. Prepare Server

Run on CasaOS/Armbian as root or a Docker-capable user.

```bash
docker ps
docker network inspect sisdmk2-network >/dev/null 2>&1 || docker network create sisdmk2-network
docker network connect sisdmk2-network sisdmk-postgres 2>/dev/null || true
docker network connect sisdmk2-network sisdmk-n8n 2>/dev/null || true
```

Make sure Docker storage is on external storage before heavy builds/restores.

## 2. Configure Env

Create or update `/DATA/AppData/si-kepegawaian/source/.env.casaos`.

Minimum production values:

```env
APP_PORT=8091
APP_URL=https://dinkes.kepegawaian.media
APP_ORIGIN=https://dinkes.kepegawaian.media
ALLOWED_ORIGINS=https://dinkes.kepegawaian.media
ALLOW_INSECURE_LOCAL_HTTP=false
COOKIE_SECURE=true
TRUST_PROXY_HEADERS=true

JWT_SECRET=long-random-secret

POSTGRES_HOST=sisdmk-postgres
POSTGRES_HOSTS=sisdmk-postgres
POSTGRES_PORT=5432
POSTGRES_DATABASE=si_data
POSTGRES_DATABASES=si_data
POSTGRES_USER=sisdmk_admin
POSTGRES_PASSWORD=server-postgres-password

AI_ENABLE_N8N=true
N8N_WEBHOOK_URL=https://n8n.kepegawaian.media/webhook/sisdmk-internal-chat
N8N_PUBLIC_WEBHOOK_URL=https://n8n.kepegawaian.media/webhook/sisdmk-public-chat
N8N_API_SECRET=shared-secret
```

## 3. Deploy

From the project root on server:

```bash
cd /DATA/AppData/si-kepegawaian/source
git pull origin main
docker compose --env-file .env.casaos -f docker-compose.casaos.yml up -d --build
```

Check:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker logs --tail 100 sisdmk2-app
docker exec sisdmk2-app npm run check:postgres
curl -fsS http://127.0.0.1:8091/api/health
```

## 4. Database Restore

Restore plain SQL:

```bash
docker cp si_data.sql sisdmk-postgres:/tmp/si_data.sql
docker exec -i sisdmk-postgres psql -U sisdmk_admin -d si_data -v ON_ERROR_STOP=1 -f /tmp/si_data.sql
docker exec sisdmk-postgres rm -f /tmp/si_data.sql
```

Restore compressed SQL from host:

```bash
gzip -dc si_data.sql.gz | docker exec -i sisdmk-postgres psql -U sisdmk_admin -d si_data -v ON_ERROR_STOP=1
```

## 5. Backup

Custom format:

```bash
docker exec sisdmk-postgres pg_dump -U sisdmk_admin -d si_data -Fc -f /tmp/si_data.backup
docker cp sisdmk-postgres:/tmp/si_data.backup ./backup/si_data-$(date +%F-%H%M).backup
```

Plain SQL:

```bash
docker exec sisdmk-postgres pg_dump -U sisdmk_admin -d si_data > ./backup/si_data-$(date +%F-%H%M).sql
```

## 6. Cloudflare Tunnel

Ingress example:

```yaml
ingress:
  - hostname: dinkes.kepegawaian.media
    service: http://127.0.0.1:8091
  - hostname: n8n.kepegawaian.media
    service: http://127.0.0.1:5678
  - service: http_status:404
```

After changing Cloudflare or env, restart app:

```bash
docker compose --env-file .env.casaos -f docker-compose.casaos.yml up -d
```
