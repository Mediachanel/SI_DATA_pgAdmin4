# SI-SDMK Production Checklist

Use this before declaring a deployment healthy.

## Server

- Docker data root is on external storage.
- `sisdmk2-app` is running.
- `sisdmk-postgres` is running.
- `sisdmk-n8n` is running.
- Containers are connected to `sisdmk2-network`.

## Environment

- `APP_ORIGIN=https://dinkes.kepegawaian.media`
- `APP_URL=https://dinkes.kepegawaian.media`
- `COOKIE_SECURE=true`
- `ALLOW_INSECURE_LOCAL_HTTP=false`
- `TRUST_PROXY_HEADERS=true`
- `POSTGRES_HOST=sisdmk-postgres`
- `POSTGRES_USER=sisdmk_admin`
- `POSTGRES_DATABASE=si_data`
- `AI_ENABLE_N8N=true`

## App

- `/api/health` returns success.
- Login works on public domain.
- Session persists after refresh.
- Logout clears session.
- Image/cache pages do not produce `/app/.next/cache/images` errors.

## Database

- `docker exec sisdmk2-app npm run check:postgres` passes.
- `si_data` contains imported production tables.
- Super Admin account exists.
- Backup file exists after restore.

## AI

- n8n webhook URLs are configured.
- n8n sends `x-ai-secret`.
- Internal chat receives JSON response.
- Public chat only answers published QnA.
- AI tool calls are visible in audit logs.

## Security

- Secrets rotated.
- Adminer is not public.
- n8n is protected.
- Cloudflare Tunnel does not expose unintended services.
- Backups are stored off-device.
