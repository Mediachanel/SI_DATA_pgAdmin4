# n8n Workflow Plan

## Workflow 1: Internal HRIS Agent

Webhook:

```text
POST /webhook/sisdmk-internal-chat
```

Expected input:

```json
{
  "request_id": "uuid",
  "conversation_id": "uuid",
  "message": "berapa pegawai pns di jakarta timur",
  "source": "internal_chat",
  "user": {
    "id": "1",
    "username": "superadmin",
    "role": "SUPER_ADMIN",
    "wilayah": "Provinsi",
    "nama_ukpd": "Dinas Kesehatan"
  }
}
```

Nodes:

1. Webhook Trigger
2. Validate `x-ai-secret`
3. Load conversation memory by `conversation_id`
4. Intent Classifier
5. Entity Extractor
6. Role Scope Builder
7. Tool Router
8. Tool HTTP Request
9. Clarification Gate
10. RAG Retrieval if needed
11. Answer Generator
12. Verification Gate
13. Persist Memory
14. Audit Log
15. Respond JSON

Intent examples:

```text
employee_count
employee_search
employee_profile
dashboard_summary
pegawai_change_create
pegawai_change_update
pegawai_change_delete
public_qna
unknown
```

Tool routing:

```text
employee_count          -> /api/internal-ai/tools/employee-count
employee_search         -> /api/internal-ai/tools/search-employee
employee_profile        -> /api/internal-ai/tools/employee-profile
dashboard_summary       -> /api/internal-ai/tools/dashboard-summary
pegawai_change_create   -> /api/internal-ai/tools/pegawai-change-draft
pegawai_change_update   -> /api/internal-ai/tools/pegawai-change-draft
pegawai_change_delete   -> /api/internal-ai/tools/pegawai-change-draft
```

## Workflow 2: Public QnA Agent

Webhook:

```text
POST /webhook/sisdmk-public-chat
```

Rules:

- Only answer from public QnA.
- Never expose employee personal data.
- If question is private/internal, ask user to login.
- Use `/api/internal-ai/tools/public-qna`.

## Required HTTP Headers For Tool Calls

```text
Content-Type: application/json
x-ai-secret: {{$env.N8N_API_SECRET}}
x-request-id: {{$json.request_id}}
```

## Required Response JSON

```json
{
  "answer": "Jawaban final",
  "source": "n8n",
  "intent": "employee_count",
  "entities": {
    "status_pegawai": "PNS",
    "wilayah": "Jakarta Timur"
  },
  "tool": "employee-count",
  "verification": "verified",
  "confidence": 0.94,
  "candidates": [],
  "selected_candidate": null,
  "tool_result": {
    "total": 123
  },
  "suggestions": [
    "Tampilkan per UKPD",
    "Bandingkan dengan PPPK"
  ]
}
```

## Guardrails

- Do not execute SQL from LLM text.
- Do not call PostgreSQL directly from arbitrary AI-generated SQL.
- Use only approved HTTP tools.
- Require clarification if `requires_clarification=true`.
- Refuse if tool returns `not_found=true` and no verified evidence exists.
- Mask sensitive data unless an approved role and approved tool explicitly returns it.
- Create draft tasks for writes; do not mutate `pegawai` directly.

## Memory

Use `conversation_id` as the memory key.

Recommended memory fields:

```json
{
  "last_intent": "employee_profile",
  "last_entities": {},
  "last_selected_employee": {},
  "last_tool": "employee-profile",
  "last_tool_result_summary": {},
  "updated_at": "ISO timestamp"
}
```

## Workflow Export

Export final n8n workflows as JSON and store them in:

```text
docs/n8n/sisdmk-internal-chat.workflow.json
docs/n8n/sisdmk-public-chat.workflow.json
```

Never export credentials or API keys.
