# SI-SDMK Roadmap

## Phase 1: Stabilization

Goals:

- Login stable on local IP and Cloudflare domain.
- PostgreSQL connection stable from Docker.
- Next.js cache stable.
- Health endpoint available.
- Deployment docs accurate.

Deliverables:

- Correct `.env.casaos`.
- `/api/health`.
- Docker cache tmpfs.
- Postgres pool settings.
- Runbook and troubleshooting docs.

## Phase 2: AI Integration

Goals:

- n8n internal and public workflows active.
- Tool calling with `x-ai-secret`.
- Audit logs for every AI interaction.
- Typed response JSON contract.

Deliverables:

- n8n workflow exports.
- Internal tool schemas.
- AI audit dashboard for `ai_workflow_logs`.
- Timeout/retry monitoring.

## Phase 3: AI Agent

Goals:

- Typo-aware fuzzy search.
- Intent classification.
- Entity extraction.
- Employee profile answers.
- Dashboard answers.
- Draft CRUD tasks.
- Human approval executor.

Deliverables:

- Approval page for `ai_agent_tasks`.
- Apply approved changes with validation.
- Prompt-injection tests.
- Tool-call regression tests.

## Phase 4: Automation

Goals:

- Automated document classification.
- Workflow reminders.
- Notification routing.
- Scheduled data quality checks.

Deliverables:

- Background job runner.
- Notification audit log.
- Automated data anomaly reports.

## Phase 5: Analytics

Goals:

- Executive analytics.
- Trend and anomaly detection.
- Data quality scoring.
- AI-generated explainable summaries.

Deliverables:

- Analytics materialized views.
- Scheduled refresh.
- Exportable reports.

## Phase 6: Mobile Apps

Goals:

- Mobile-first UI polish.
- PWA support.
- Biometric passkey flow stabilized.
- Optional native wrapper.

Deliverables:

- PWA manifest.
- Offline-safe shell.
- Push notification strategy.

## Phase 7: Production Scaling

Goals:

- Multi-replica readiness.
- Centralized rate limiting.
- Central logs and metrics.
- Backup/restore drills.

Deliverables:

- Redis-backed rate limits.
- External object storage.
- Observability stack.
- Disaster recovery runbook.
