# SI-SDMK AI Architecture

## Goal

Build a real AI agent system that reads HRIS data safely, handles typo/fuzzy search, uses role-aware tools, records audit logs, and routes workflows through n8n without hardcoded answers.

## Production Architecture

```text
Browser Chat UI
  -> Next.js API Gateway
  -> n8n Webhook Orchestrator
  -> Internal Tool APIs on Next.js
  -> PostgreSQL si_data
  -> n8n response JSON
  -> Next.js normalized response
  -> Browser Chat UI
```

## Components

- Frontend
  - `InternalAiChat.jsx` for authenticated users.
  - `PublicAiChat.jsx` for public QnA.
  - Each browser chat creates a stable `conversation_id`.

- API Gateway
  - `/api/ai/chat` for internal authenticated AI.
  - `/api/ai/public-chat` for public AI QnA.
  - Same-origin guard enabled.
  - n8n webhook timeout and retry handled centrally.

- n8n Orchestrator
  - Intent classification.
  - Entity extraction.
  - Tool routing.
  - RAG retrieval.
  - Verification and final answer generation.
  - Error handling and retry.

- Internal Tools
  - `/api/internal-ai/tools/employee-count`
  - `/api/internal-ai/tools/search-employee`
  - `/api/internal-ai/tools/employee-profile`
  - `/api/internal-ai/tools/dashboard-summary`
  - `/api/internal-ai/tools/public-qna`
  - `/api/internal-ai/tools/pegawai-change-draft`

- Database
  - PostgreSQL 16.
  - `pg_trgm` for fuzzy search.
  - pgvector migration exists for vector memory/RAG.
  - Audit tables include `audit_logs`, `ai_workflow_logs`, `ai_agent_tasks`, and `ai_agent_audit_logs`.

## Tool Security Model

n8n calls internal tools with:

```text
x-ai-secret: N8N_API_SECRET
```

The tool payload must include normalized user scope:

```json
{
  "user": {
    "id": "1",
    "username": "superadmin",
    "role": "SUPER_ADMIN",
    "wilayah": "Provinsi",
    "nama_ukpd": "Dinas Kesehatan"
  }
}
```

Role rules:

- `SUPER_ADMIN`: can read all HRIS data and create draft changes.
- `ADMIN_WILAYAH`: scoped to wilayah.
- `ADMIN_UKPD`: scoped to its own UKPD.
- Public user: only public QnA tool.

## Hallucination Reduction

Required n8n pattern:

1. Classify intent.
2. Extract entities.
3. Call one or more tools.
4. If confidence is medium, ask clarification.
5. If no verified tool result exists, say data is unavailable.
6. Generate answer only from tool output or approved RAG context.
7. Include `verification`, `confidence`, `tool`, and `entities` in JSON response.
8. Log every interaction.

## CRUD Model

Direct LLM writes to `pegawai` are not allowed.

CRUD uses a safe two-step path:

1. n8n calls `/api/internal-ai/tools/pegawai-change-draft`.
2. The tool creates `ai_agent_tasks` with `status=pending_approval`.
3. Super Admin reviews and approves/rejects.
4. Approval executor applies validated changes and writes audit logs.

The draft tool is implemented. The approval executor is a high-priority next task.

## Memory Model

Short-term memory:

- `conversation_id` from frontend.
- n8n workflow memory keyed by `conversation_id`.
- Last intent, selected candidate, and recent tool result.

Long-term memory:

- PostgreSQL tables for chat/session history.
- pgvector knowledge embeddings for RAG.
- Audit logs for traceability.

## Response Contract

n8n should return JSON:

```json
{
  "answer": "Jawaban final berbasis data terverifikasi.",
  "source": "n8n",
  "intent": "employee_profile",
  "entities": {
    "nama": "contoh"
  },
  "tool": "employee-profile",
  "verification": "verified",
  "confidence": 0.93,
  "candidates": [],
  "selected_candidate": null,
  "tool_result": {},
  "suggestions": []
}
```

Invalid JSON is treated as workflow failure.
