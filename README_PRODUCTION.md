# SI-SDMK Production Runbook

## Production Identity

```text
System      : SI-SDMK
Framework   : Next.js 15
Runtime     : Docker on CasaOS/Armbian
Database    : PostgreSQL 16
App domain  : https://dinkes.kepegawaian.media
n8n domain  : https://n8n.kepegawaian.media
```

Current server mapping:

```text
App container      : sisdmk2-app
Database container : sisdmk-postgres
Database           : si_data
Database user      : sisdmk_admin
AI container       : sisdmk-n8n
Docker network     : sisdmk2-network
```

## Required Environment

Production `.env.casaos` must contain:

```env
APP_PORT=8091
APP_URL=https://dinkes.kepegawaian.media
APP_ORIGIN=https://dinkes.kepegawaian.media
ALLOWED_ORIGINS=https://dinkes.kepegawaian.media
ALLOW_INSECURE_LOCAL_HTTP=false
COOKIE_SECURE=true
TRUST_PROXY_HEADERS=true

JWT_SECRET=change-to-long-random-secret
NEXTAUTH_SECRET=

POSTGRES_HOST=sisdmk-postgres
POSTGRES_HOSTS=sisdmk-postgres
POSTGRES_PORT=5432
POSTGRES_DATABASE=si_data
POSTGRES_DATABASES=si_data
POSTGRES_USER=sisdmk_admin
POSTGRES_PASSWORD=from-server-secret
POSTGRES_CONNECT_TIMEOUT_MS=1500
POSTGRES_IDLE_TIMEOUT_MS=30000
POSTGRES_POOL_MAX=10
POSTGRES_POOL_VERIFY_INTERVAL_MS=15000
POSTGRES_APPLICATION_NAME=sisdmk2-app
DASHBOARD_CACHE_TTL_MS=30000
DASHBOARD_DATA_CACHE_TTL_MS=30000

STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=/app/storage

AI_ENABLE_N8N=true
N8N_WEBHOOK_URL=https://n8n.kepegawaian.media/webhook/sisdmk-internal-chat
N8N_PUBLIC_WEBHOOK_URL=https://n8n.kepegawaian.media/webhook/sisdmk-public-chat
N8N_API_SECRET=change-to-shared-secret
N8N_WEBHOOK_TIMEOUT_MS=20000
N8N_WEBHOOK_RETRIES=1
```

Do not commit real secrets.

## Runtime Requirements

- Docker data root should live on external storage to avoid `ENOSPC`.
- `sisdmk2-app`, `sisdmk-postgres`, and `sisdmk-n8n` must be on the same Docker network when using container hostnames.
- Cloudflare Tunnel must forward `dinkes.kepegawaian.media` to the app port and `n8n.kepegawaian.media` to n8n.
- Next.js image cache must be writable. Compose uses tmpfs at `/app/.next/cache`.
- Dashboard uses short in-memory caches (`DASHBOARD_CACHE_TTL_MS` and `DASHBOARD_DATA_CACHE_TTL_MS`, default 30 seconds) to avoid rebuilding heavy chart payloads and rereading scoped employee data on every page/filter open.
- PostgreSQL selected pool probing is throttled by `POSTGRES_POOL_VERIFY_INTERVAL_MS` so every query does not run an extra `SELECT 1`.

## Health Checks

Application health:

```bash
curl -fsS http://127.0.0.1:8091/api/health
```

Database health from app:

```bash
docker exec sisdmk2-app npm run check:postgres
```

Database table check:

```bash
docker exec -it sisdmk-postgres psql -U sisdmk_admin -d si_data -c "\dt"
```

## Production Invariants

- Login cookie must be HttpOnly, Secure, SameSite Strict.
- `TRUST_PROXY_HEADERS=true` is required behind Cloudflare Tunnel.
- `ALLOW_INSECURE_LOCAL_HTTP=false` is required for the public HTTPS domain.
- AI must go through n8n webhooks and internal tools with `x-ai-secret`.
- AI writes must be draft + approval, not direct LLM mutation.
- All production data changes need audit logs.

## Key Documents

- `README_DEPLOYMENT.md`
- `README_TROUBLESHOOTING.md`
- `README_AI_AGENT.md`
- `AI_ARCHITECTURE.md`
- `N8N_WORKFLOW_PLAN.md`
- `SECURITY_AUDIT.md`
- `docs/PROJECT_AUDIT.md`
