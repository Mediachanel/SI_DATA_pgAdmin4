# AI Workflow Agent SI SDMK

Phase 8 menjalankan AI internal dan public chat sebagai workflow agent seperti n8n. AI tidak menjawab langsung; chat trigger masuk ke node workflow, tool mengambil data, OpenAI hanya menjelaskan evidence, verification menahan jawaban berisiko, lalu audit mencatat setiap node.

## Pipeline

```text
TRIGGER
-> INTENT
-> ENTITY
-> PERMISSION
-> TOOL / DATABASE / RAG
-> CONTEXT BUILDER
-> OPENAI RESPONSE
-> VERIFICATION
-> AUDIT LOG
-> RESPONSE / HUMAN HANDOFF
```

## Komponen Utama

- `src/lib/ai-workflows/AiWorkflowEngine.js`: engine utama yang memuat workflow JSON, menjalankan node berurutan, dan menyelesaikan run.
- `src/lib/ai-workflows/WorkflowRunner.js`: runner node execution yang mencatat input/output, durasi, status sukses/error, dan memastikan workflow benar-benar berjalan per node.
- `src/lib/ai-workflows/WorkflowRegistry.js`: registry node/workflow seperti platform n8n internal. Registry memetakan nama wajib seperti `ChatTriggerNode`, `DatabaseQueryNode`, `ApprovalRequestNode`, dan `SoftDeleteNode` ke executor canonical.
- `src/lib/ai-workflows/WorkflowNodeExecutor.js`: executor node seperti `TriggerNode`, `IntentDetectionNode`, `PermissionCheckNode`, `ToolExecutionNode`, `OpenAIResponseNode`, `VerificationNode`, dan `HumanHandoffNode`.
- `src/lib/ai-workflows/WorkflowContextBuilder.js`: context builder workflow yang menyusun role, scope, intent, entity, tool result, RAG chunks, memory, dan privacy rules.
- `src/lib/ai-workflows/WorkflowAuditLogger.js`: logger run dan node ke `ai_workflow_runs` dan `ai_workflow_node_runs`.
- `src/lib/ai-workflows/definitions/internal_hris_chat.json`: workflow internal chat.
- `src/lib/ai-workflows/definitions/public_qna_chat.json`: workflow public chat.
- `src/lib/ai-workflows/definitions/crud_create_workflow.json`: create draft + approval.
- `src/lib/ai-workflows/definitions/crud_read_workflow.json`: read retrieval + verification.
- `src/lib/ai-workflows/definitions/crud_update_workflow.json`: update draft + approval.
- `src/lib/ai-workflows/definitions/crud_soft_delete_workflow.json`: soft delete/archive draft + approval.
- `src/lib/ai-orchestrator/AIOrchestratorService.js`: service utama yang menerima pesan, membaca memory, memilih tool, membangun context, memverifikasi jawaban, dan mengembalikan audit payload.
- `src/lib/ai-orchestrator/intentClassifier.js`: intent reasoning berbasis rule fallback dan optional OpenAI planner.
- `src/lib/ai-orchestrator/entityExtractor.js`: ekstraksi nama pegawai, NIP, NRK, NIK, status pegawai, UKPD, wilayah, jabatan, dokumen, nomor usulan, periode, dan kategori QnA.
- `src/lib/ai-orchestrator/toolRegistry.js`: official HRIS tools. AI tidak menerima SQL mentah; semua akses data lewat tool ini.
- `src/lib/ai-orchestrator/permissionGuard.js`: role-aware guard backend untuk Super Admin, Admin Wilayah, Admin UKPD, dan Public.
- `src/lib/ai-orchestrator/contextBuilder.js`: menyusun context nyata berisi role, scope, intent, entity, tool result, RAG chunks, memory, dan batasan privasi.
- `src/lib/ai-orchestrator/answerGenerator.js`: membuat jawaban analis SDM dari evidence. OpenAI optional hanya boleh rewrite dari context.
- `src/lib/ai-orchestrator/verificationLayer.js`: menahan jawaban jika angka tidak berasal dari tool, identifier penuh bocor, scope dilanggar, atau evidence kosong.
- `src/lib/ai-orchestrator/correctionHandler.js`: loop koreksi untuk pesan seperti `salah`, `keliru`, `coba cek lagi`, dan `maksud saya`.
- `src/lib/ai-orchestrator/memoryManager.js`: menyimpan last intent, entity, pegawai, tool result, jawaban, dan correction count.
- `src/lib/rag/RagService.js`: RAG public/internal dengan chunking, metadata, visibility filter, embedding OpenAI opsional, dan lexical fallback.

## Intent

Intent minimal yang didukung:

- `public_qna`
- `login_help`
- `cari_pegawai`
- `cari_jabatan_pegawai`
- `detail_pegawai`
- `statistik_pegawai`
- `jumlah_pegawai`
- `dashboard_summary`
- `pegawai_per_status`
- `pegawai_per_wilayah`
- `pegawai_per_ukpd`
- `cek_dokumen_pegawai`
- `cek_status_usulan`
- `buat_usulan_mutasi`
- `buat_draft_pegawai`
- `ubah_data_pegawai`
- `hapus_draft_usulan`
- `ringkas_usulan`
- `ringkas_dokumen`
- `analisis_sdm`
- `buat_draft_surat`
- `koreksi_jawaban`
- `klarifikasi`
- `out_of_scope`

## Official Tools

- `findEmployee`
- `searchEmployeeFuzzy`
- `getEmployeeDetail`
- `getEmployeePosition`
- `getEmployeesByRegion`
- `getEmployeesByUkpd`
- `getEmployeesByStatus`
- `getEmployeeStatistics`
- `getDashboardSummary`
- `getDashboardCharts`
- `getEmployeeCount`
- `getTotalEmployees`
- `getEmployeeCountByStatus`
- `getEmployeeCountByRegion`
- `getEmployeeCountByUkpd`
- `getEmployeeCountByGender`
- `getEmployeeCountByEducation`
- `getEducationStatistics`
- `explainDashboard`
- `getEmployeeDocuments`
- `getDocumentCompleteness`
- `validateDocument`
- `summarizeDocumentStatus`
- `getDocumentStatus`
- `createProposal`
- `getProposalStatus`
- `updateProposal`
- `summarizeProposal`
- `getProposalSummary`
- `getProposalTimeline`
- `createEmployeeDraft`
- `updateEmployeeDraft`
- `archiveEmployee`
- `createMutationDraft`
- `searchPublicQna`
- `searchInternalKnowledgeBase`
- `getRelevantKnowledgeChunks`
- `createLetterDraft`
- `createDraftLetter`
- `createRecapDraft`
- `createFollowUpRecommendation`

Semua tool CRUD sensitif hanya membuat draft dan metadata `approvalRequired`; tidak ada insert/update/delete final yang dilakukan langsung oleh AI.

## Node System

Node wajib yang tersedia di registry:

- Trigger: `ChatTriggerNode`, `ApiTriggerNode`, `WebhookTriggerNode`, `ScheduleTriggerNode`
- AI: `IntentDetectionNode`, `EntityExtractionNode`, `ContextMemoryNode`, `OpenAIReasoningNode`, `VerificationNode`, `CorrectionLoopNode`
- Data: `DatabaseQueryNode`, `DashboardRetrievalNode`, `KnowledgeBaseSearchNode`, `VectorSearchNode`
- CRUD: `CreateDataNode`, `ReadDataNode`, `UpdateDataNode`, `DeleteDataNode`, `SoftDeleteNode`
- Security: `PermissionCheckNode`, `RoleScopeNode`, `DataMaskingNode`, `RateLimitNode`
- Approval: `ApprovalRequestNode`, `ApprovalDecisionNode`
- System: `AuditLogNode`, `NotificationNode`, `ErrorHandlerNode`, `HumanHandoffNode`

Workflow JSON boleh memakai nama PascalCase di atas atau canonical snake_case lama. Executor akan menormalisasi keduanya.

## Workflow Definition JSON

Workflow didefinisikan di JSON. Contoh:

```json
{
  "name": "internal_hris_chat",
  "nodes": [
    { "id": "trigger", "type": "chat_trigger" },
    { "id": "intent", "type": "intent_detection" },
    { "id": "permission", "type": "permission_check" },
    { "id": "tool", "type": "tool_execution" },
    { "id": "openai", "type": "openai_response" },
    { "id": "verify", "type": "verification" },
    { "id": "audit", "type": "audit_log" }
  ]
}
```

Internal chat:

```text
User bertanya
-> TriggerNode
-> IntentDetectionNode
-> EntityExtractionNode
-> PermissionCheckNode
-> ToolExecutionNode
-> DatabaseQueryNode
-> ContextBuilder
-> OpenAIResponseNode
-> VerificationNode
-> AuditLogNode
-> Response
```

Public chat:

```text
User bertanya di halaman login
-> TriggerNode
-> PublicQnaSearchNode
-> ContextBuilder
-> OpenAIResponseNode
-> VerificationNode
-> AuditLogNode
-> HumanHandoffNode jika tidak ada jawaban
```

CRUD create:

```text
Trigger -> Intent -> Entity -> RoleScope -> Permission
-> CreateDataNode -> ApprovalRequest -> Context -> Reasoning
-> Verification -> Audit -> Notification
```

CRUD read:

```text
Trigger -> Intent -> Entity -> Memory -> RoleScope -> Permission
-> ReadDataNode -> DatabaseQuery -> DashboardRetrieval/KnowledgeSearch
-> Context -> Reasoning -> Verification -> Audit
```

CRUD update/delete:

```text
Trigger -> Intent -> Entity -> RoleScope -> Permission
-> UpdateDataNode atau SoftDeleteNode
-> ApprovalRequest -> Context -> Reasoning -> Verification -> Audit -> Notification
```

## Role dan Scope

- Super Admin membaca semua data HRIS.
- Admin Wilayah hanya membaca data wilayah sendiri.
- Admin UKPD hanya membaca data UKPD sendiri.
- Public user hanya membaca QnA/RAG public.

Jika permintaan melewati scope, agent menjawab:

```text
Data tersebut berada di luar kewenangan akses Anda.
```

Public chat tidak boleh membaca pegawai, dashboard internal, usulan, atau dokumen pegawai. Jika tidak ada evidence QnA publik:

```text
Maaf, informasi tersebut belum tersedia pada QnA publik SI SDMK. Silakan login atau hubungi admin.
```

## RAG Knowledge Base

Migration Phase 7 menambahkan:

- `knowledge_documents`
- `knowledge_chunks`
- `knowledge_embeddings`
- `knowledge_categories`
- `knowledge_sources`

`RagService` mendukung:

- chunking dokumen;
- embedding OpenAI optional melalui `OPENAI_EMBEDDING_MODEL`;
- semantic search jika embedding ada;
- lexical fallback untuk local/test;
- metadata filter;
- `visibility = public` untuk public chat;
- `visibility IN ('public', 'internal')` untuk internal chat;
- source citation dan relevance score.

## Verification

Jawaban ditahan jika:

- data/statistik tidak punya tool result;
- angka tidak berasal dari evidence tool;
- NIK/NIP/NRK penuh muncul;
- public chat memakai tool internal;
- scope role dilanggar;
- confidence rendah atau data kosong.

Fallback verification akan meminta klarifikasi atau menyatakan data tidak tersedia, bukan mengarang.

Setiap output workflow membawa kontrak:

- `sourceTools`: tool resmi yang dipakai.
- `retrievalStatus`: `retrieved`, `empty`, `denied`, atau `not_requested`.
- `verification.status`: `passed` atau `failed`.
- `meta.approvalRequired`: `true` untuk aksi CRUD sensitif.

## Audit

Setiap interaksi menyimpan metadata ke `ai_workflow_runs`, `ai_workflow_node_runs`, `ai_agent_audit_logs`, dan/atau `ai_audit_logs`, termasuk:

- user/role;
- message;
- detected intent;
- extracted entity;
- selected tool;
- tool result summary;
- confidence score;
- response;
- verification status;
- scope result;
- created at.

Monitor tersedia di:

- `/ai-workflows`: daftar workflow definition.
- `/ai-workflows/runs`: daftar run, node yang berjalan, input/output tiap node, status, waktu eksekusi, user/role, dan error log.
- `/ai-agent`: tool runner lama tetap tersedia.
- `/admin/qna-knowledge-base`: admin QnA publik.

## OpenAI Opsional

Default lokal tetap:

```env
AI_ASSISTANT_PROVIDER=local
```

Untuk planner/rewrite/embedding:

```env
AI_ASSISTANT_PROVIDER=openai
OPENAI_API_KEY=isi_dari_env_production
OPENAI_MODEL=gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

OpenAI tidak menerima SQL, koneksi database, secret, atau identifier penuh. Semua payload dimasking dan harus berasal dari context/tool resmi.

## Migration

Jalankan berurutan:

```bash
npm run migrate:phase6
npm run migrate:phase7
npm run migrate:phase8
```

Phase 7 menambahkan schema RAG dan kolom audit eksplisit. Phase 8 menambahkan workflow definition dan workflow run logs.
