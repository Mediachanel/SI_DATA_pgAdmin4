# SI-SDMK Troubleshooting

## Login Shows Username Or Password Invalid

Check backend status first:

```bash
curl -i http://127.0.0.1:8091/api/health
docker exec sisdmk2-app npm run check:postgres
docker logs --tail 100 sisdmk2-app
```

Meaning:

- HTTP 503 from `/api/auth/login`: app cannot connect to PostgreSQL or runtime dependency is unhealthy.
- HTTP 401 from `/api/auth/login`: database is reachable, but username/password does not match.
- Browser says username/password invalid while server logs show 503: frontend is masking a service failure; check `/api/health`.

## PostgreSQL Host Cannot Be Resolved

Symptoms:

```text
getaddrinfo ENOTFOUND postgres
getaddrinfo ENOTFOUND pasarkita-postgres
getaddrinfo ENOTFOUND pasir-postgres
```

Fix:

```bash
docker ps --format "table {{.Names}}\t{{.Networks}}"
docker network connect sisdmk2-network sisdmk-postgres 2>/dev/null || true
docker network connect sisdmk2-network sisdmk2-app 2>/dev/null || true
docker exec sisdmk2-app printenv | grep POSTGRES
```

Correct env:

```env
POSTGRES_HOST=sisdmk-postgres
POSTGRES_HOSTS=sisdmk-postgres
POSTGRES_DATABASE=si_data
POSTGRES_USER=sisdmk_admin
```

## Next.js Cache Error

Symptom:

```text
ENOENT mkdir /app/.next/cache/images
```

Fix source compose must include:

```yaml
tmpfs:
  - /tmp
  - /app/.next/cache:uid=1000,gid=1000,mode=1770
```

Then redeploy:

```bash
docker compose --env-file .env.casaos -f docker-compose.casaos.yml up -d --build
```

## Cookie Or Session Fails On Domain

Required env behind Cloudflare:

```env
APP_URL=https://dinkes.kepegawaian.media
APP_ORIGIN=https://dinkes.kepegawaian.media
ALLOWED_ORIGINS=https://dinkes.kepegawaian.media
COOKIE_SECURE=true
ALLOW_INSECURE_LOCAL_HTTP=false
TRUST_PROXY_HEADERS=true
```

After changes:

```bash
docker compose --env-file .env.casaos -f docker-compose.casaos.yml up -d
```

## Cloudflare 502 Or Blank Page

Check app port and tunnel target:

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
curl -I http://127.0.0.1:8091/login
curl -I https://dinkes.kepegawaian.media/login
```

Expected app port:

```text
0.0.0.0:8091->3000/tcp
```

## n8n AI Does Not Answer

Check app env:

```bash
docker exec sisdmk2-app printenv | grep N8N
```

Check app logs:

```bash
docker logs --tail 100 sisdmk2-app
docker logs --tail 100 sisdmk-n8n
```

The n8n workflow must return JSON:

```json
{
  "answer": "jawaban final",
  "intent": "employee_search",
  "tool": "search-employee",
  "verification": "verified",
  "confidence": 0.92,
  "entities": {}
}
```

## AI Tool Returns Forbidden

n8n must send:

```text
x-ai-secret: same-as-N8N_API_SECRET
```

Internal tool routes:

```text
/api/internal-ai/tools/employee-count
/api/internal-ai/tools/search-employee
/api/internal-ai/tools/employee-profile
/api/internal-ai/tools/dashboard-summary
/api/internal-ai/tools/public-qna
/api/internal-ai/tools/pegawai-change-draft
```

## Docker No Space Left

Symptoms:

```text
no space left on device
ENOSPC
```

Fix is operational:

- Move Docker data root to external storage.
- Prune only after backup:

```bash
docker system df
docker builder prune
docker image prune
```

Avoid deleting volumes unless a verified database backup exists.
