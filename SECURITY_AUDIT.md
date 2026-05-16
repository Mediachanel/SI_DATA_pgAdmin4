# SI-SDMK Security Audit

Tanggal audit: 2026-05-16

## Scope

Audit mencakup:

- Next.js App Router.
- JWT HttpOnly cookie session.
- PostgreSQL access layer.
- Docker/CasaOS deployment.
- Cloudflare Tunnel.
- n8n AI Agent integration.
- Upload, AI tools, audit logs, and environment handling.

## Session And JWT

Current controls:

- Session cookie `sdm_session` is HttpOnly.
- Cookie uses SameSite Strict.
- Production requires strong `JWT_SECRET`.
- `COOKIE_SECURE=true` required on HTTPS domain.
- Same-origin guard is used on sensitive POST routes and AI gateway.
- Cloudflare compatibility requires `TRUST_PROXY_HEADERS=true`.

Risks:

- Login rate limit is in-memory. Multi-replica deployment needs Redis or database-backed limiter.
- Session revocation list is not implemented.

Priority:

- Add Redis-backed rate limiting.
- Add token version/session revocation for forced logout after password reset.

## SQL Injection

Current controls:

- Application uses parameterized queries through PostgreSQL compatibility layer.
- n8n must call approved tool endpoints, not execute arbitrary AI-generated SQL.
- AI tools apply role scope server-side.

Risks:

- Compatibility SQL rewrite is complex and should stay covered by tests.
- Future n8n workflows must not introduce raw SQL execution from LLM output.

Priority:

- Add tests for every internal AI tool.
- Keep a strict tool allowlist in n8n.

## SSRF

Current controls:

- Next.js only calls configured `N8N_WEBHOOK_URL` and `N8N_PUBLIC_WEBHOOK_URL`.
- Internal tools require `x-ai-secret`.

Risks:

- If env webhook URL is compromised, app can call an attacker-controlled endpoint.

Priority:

- Restrict webhook URLs to expected hostnames in production.
- Alert on webhook host mismatch.

## RCE

Current controls:

- Docker app runs as `node`.
- `no-new-privileges` and `cap_drop: ALL` are enabled.
- n8n AI is not allowed to execute shell commands through the app.

Risks:

- Document parsing and future AI automation must avoid executing user content.
- n8n credentials must be locked down.

Priority:

- Keep file extraction sandboxed.
- Disable unsafe n8n nodes for production workflows where possible.

## XSS

Current controls:

- React escapes text by default.
- CSP is configured in `next.config.mjs`.
- User-generated AI responses are rendered as text, not HTML.

Risks:

- `script-src` still allows `'unsafe-inline'` due to Next/runtime requirements.

Priority:

- Avoid `dangerouslySetInnerHTML`.
- Continue sanitizing imports and AI document text.

## CSRF

Current controls:

- Same-origin validation checks `Origin` or `Referer`.
- `APP_URL`, `APP_ORIGIN`, and `ALLOWED_ORIGINS` are supported.
- SameSite Strict cookie reduces cross-site request risk.

Risks:

- Missing origin headers are rejected only in production.

Priority:

- Add regression tests for Cloudflare forwarded origin handling.

## Docker Privilege

Current controls:

- App container uses non-root user.
- `cap_drop: ALL`.
- `no-new-privileges:true`.
- Next cache uses tmpfs instead of broad writable image path.

Risks:

- `read_only: true` was removed for runtime stability. File writes should be limited by mounted volumes and tmpfs.

Priority:

- Keep only `/app/storage`, `/tmp`, and `/app/.next/cache` writable.
- Consider reintroducing read-only root only after validating Next.js runtime writes.

## Cloudflare Security

Current controls:

- HTTPS public domain.
- Secure cookies.
- Proxy headers trusted only when configured.

Risks:

- Tunnel exposes whatever service is configured. Misrouting can expose Adminer/n8n.

Priority:

- Protect n8n with authentication.
- Do not expose Adminer publicly.
- Use Cloudflare Access for admin-only tools.

## Environment Leaks

Current controls:

- Docs use placeholders for secrets.
- Health endpoint does not expose DB host, user, password, or raw connection errors.

Risks:

- Secrets have appeared in local chat/screenshots and must be rotated before production finalization.

Priority:

- Rotate `POSTGRES_PASSWORD`, `JWT_SECRET`, `N8N_API_SECRET`, and provider API keys.
- Keep `.env.casaos` outside commits.

## AI Security

Current controls:

- AI must go through n8n.
- Internal tools require shared secret.
- Tool outputs mask sensitive identifiers where designed.
- AI write path creates draft approval tasks.

Risks:

- Prompt injection can still influence n8n if workflow does not enforce tool gates.
- Approval executor is not complete.

Priority:

- Add n8n verification gate.
- Add prompt injection test cases.
- Implement approval executor with audit log.

## Overall Risk Rating

Current state: medium.

The system is suitable for controlled pilot after validating production env, database restore, login, and n8n workflow. It is not yet ready for unattended AI write automation until approval execution, workflow export, and AI safety tests are complete.
