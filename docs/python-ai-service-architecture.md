# Python AI Service Architecture

SI SDMK kini diarahkan menjadi dua service utama:

1. Next.js tetap menjadi aplikasi HRIS, UI, auth session, dan admin console.
2. Python FastAPI di `/ai-service` menjadi otak AI Agent: workflow, tool execution, RAG, reasoning, verification, audit, dan background jobs.

## Request Flow

```text
Next.js API route
-> Python FastAPI /ai/*
-> LangGraph workflow
-> permission guard
-> official tool executor
-> PostgreSQL query / pgvector RAG
-> OpenAI explanation layer
-> hallucination verification
-> masking
-> ai_audit_logs
-> response to Next.js
```

Next.js tidak lagi menjalankan AI workflow berat. Route seperti `/api/public-chat`, `/api/internal-chat`, `/api/ai-agent`, `/api/ai-documents`, dan `/api/ai-workflows` memanggil `AI_SERVICE_URL`.

## FastAPI Endpoints

- `GET /ai/health`
- `POST /ai/public-chat`
- `POST /ai/internal-chat`
- `POST /ai/workflows/run`
- `POST /ai/documents/extract`
- `POST /ai/knowledge/index`

## LangGraph Nodes

Graph internal menjalankan urutan:

```text
receive_message
-> classify_intent
-> extract_entities
-> check_permission
-> select_tool
-> execute_tool
-> retrieve_knowledge
-> build_context
-> call_openai
-> verify_answer
-> mask_sensitive_data
-> write_audit_log
-> return_response
```

Public graph tidak menjalankan tool HRIS; ia hanya mengambil QnA/knowledge `visibility=public`.

## Tools Resmi

Read tools:

- `get_total_pegawai`
- `get_pegawai_by_status`
- `get_pegawai_by_wilayah`
- `get_pegawai_by_ukpd`
- `find_pegawai`
- `get_jabatan_pegawai`
- `get_dashboard_summary`
- `get_dokumen_pegawai`
- `get_status_usulan`

CRUD tools:

- `create_draft_pegawai`
- `create_draft_usulan`
- `update_draft_pegawai`
- `approve_draft_change`
- `reject_draft_change`
- `soft_delete_draft`

CRUD final tidak boleh dilakukan langsung oleh AI. AI hanya membuat draft di `ai_draft_changes`; perubahan final hanya dijalankan saat approval admin memanggil workflow approval.

## RAG

RAG memakai tabel `knowledge_documents`, `knowledge_chunks`, dan `knowledge_embeddings.embedding_vector vector(1536)`. Indexing dokumen dilakukan lewat `/ai/knowledge/index` atau Celery job `ai_service.index_document_file`.

Public chat hanya boleh membaca:

- `public_qna_knowledge_base`
- `knowledge_documents.visibility = 'public'`

Internal chat membaca knowledge public/internal sesuai role dan tetap melewati permission guard.

## Auth Bridge

Next.js membuat JWT pendek dengan:

- issuer: `AI_SERVICE_JWT_ISSUER` default `sisdmk-nextjs`
- audience: `AI_SERVICE_JWT_AUDIENCE` default `sisdmk-ai-service`
- secret: `AI_SERVICE_JWT_SECRET` atau fallback `JWT_SECRET`

Payload membawa `id`, `username`, `role`, `wilayah`, dan `nama_ukpd`. Python memakai payload ini untuk backend permission check.

## Docker Services

`docker-compose.yml` menambahkan:

- `postgres` memakai `pgvector/pgvector:pg16`
- `redis`
- `ai-service`
- `celery-worker`
- `app-nextjs`
