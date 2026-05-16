# SI-SDMK TODO Priority

## Urgent

- Verify production `.env.casaos` on server uses `sisdmk-postgres`, `sisdmk_admin`, `APP_ORIGIN=https://dinkes.kepegawaian.media`, `COOKIE_SECURE=true`, and `TRUST_PROXY_HEADERS=true`.
- Run `docker exec sisdmk2-app npm run check:postgres` after every redeploy.
- Import or create the correct Super Admin account and password.
- Confirm `/api/health` returns success from inside server and through Cloudflare.
- Connect `sisdmk2-app`, `sisdmk-postgres`, and `sisdmk-n8n` to the intended Docker network.

## High

- Export final n8n workflows to `docs/n8n/`.
- Implement approval executor for `ai_agent_tasks`.
- Add tests for n8n internal tool routes.
- Add prompt-injection and unsafe CRUD tests.
- Add Redis or database-backed rate limits for login and AI endpoints.
- Add database backup schedule and restore drill.
- Review all env files and rotate secrets that were shared outside server.

## Medium

- Build AI audit UI for `ai_workflow_logs`.
- Add RAG document indexing pipeline.
- Add pgvector semantic retrieval in n8n flow.
- Add structured OpenAPI-style schemas for internal tools.
- Add Cloudflare Tunnel documentation with screenshots/config export.
- Add graceful degradation UI when n8n is down.

## Low

- Add dashboard cards for Docker/app health.
- Add admin UI for n8n workflow status.
- Add PWA support.
- Add mobile app wrapper feasibility study.
- Add database ERD export to docs.
