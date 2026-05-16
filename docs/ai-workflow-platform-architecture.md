# AI Workflow Platform Architecture

Tanggal audit: 2026-05-14

## Audit Arsitektur AI Saat Ini

SI SDMK sudah memiliki beberapa fondasi AI:

- Public chat di halaman login memakai guard untuk membatasi jawaban ke QnA publik.
- Internal AI chat sudah melewati workflow `internal_hris_chat`, bukan langsung mengirim pesan user ke OpenAI.
- `AIOrchestratorService` sudah memecah proses menjadi intent, entity, permission, tool retrieval, context, answer generation, verification, memory, correction, dan audit.
- `RagService` sudah menyediakan tabel `knowledge_documents`, `knowledge_chunks`, `knowledge_embeddings`, `knowledge_categories`, dan `knowledge_sources`.
- Monitor `/ai-workflows` dan `/ai-workflows/runs` sudah membaca workflow run dan node run.

## Diagnosis Halusinasi

Risiko halusinasi sebelum perombakan ini:

- Node workflow belum punya registry formal, sehingga belum terlihat seperti platform node seperti n8n.
- Tool registry belum memuat seluruh nama resmi target HRIS, dashboard, dokumen, usulan, CRUD, dan knowledge.
- CRUD sensitif baru sebatas draft surat; belum ada pola draft create/update/archive yang eksplisit.
- Workflow output final dapat tertimpa output audit node, sehingga metadata source/retrieval/verification kurang konsisten di respons final.
- Definisi workflow CRUD belum tersedia sebagai workflow terpisah untuk create, read, update, dan soft delete.

## Desain Final

Pipeline standar:

```text
Trigger
-> Intent Reasoning
-> Workflow Engine
-> Node Execution
-> Tool Execution
-> CRUD Service / Database Retrieval / RAG
-> Context Builder
-> OpenAI Explanation
-> Verification Layer
-> Audit Log
```

OpenAI hanya menjadi planner/rewrite/explanation opsional. Semua data berasal dari tool resmi server-side dan semua payload dimasking.

## Komponen

- `AiWorkflowEngine`: entry point workflow.
- `WorkflowRunner`: menjalankan node dan mencatat input/output tiap node.
- `WorkflowNodeExecutor`: implementasi node execution.
- `WorkflowContextBuilder`: penyusun context evidence.
- `WorkflowAuditLogger`: logger run dan node run.
- `WorkflowRegistry`: registry node wajib dan workflow definition.
- `AIOrchestratorService`: orchestrator intent, tool, context, verification, memory, audit.
- `HrisToolRegistry`: tool resmi HRIS dan CRUD draft.
- `RagService`: chunking, embeddings opsional, lexical/semantic search, visibility filter.

## Workflow CRUD

Create:

```text
ChatTriggerNode -> IntentDetectionNode -> EntityExtractionNode
-> RoleScopeNode -> PermissionCheckNode -> CreateDataNode
-> ApprovalRequestNode -> ContextBuilderNode -> OpenAIReasoningNode
-> VerificationNode -> AuditLogNode -> NotificationNode
```

Read:

```text
ChatTriggerNode -> IntentDetectionNode -> EntityExtractionNode
-> ContextMemoryNode -> RoleScopeNode -> PermissionCheckNode
-> ReadDataNode -> DatabaseQueryNode -> DashboardRetrievalNode
-> KnowledgeBaseSearchNode -> ContextBuilderNode -> OpenAIReasoningNode
-> VerificationNode -> AuditLogNode
```

Update:

```text
ChatTriggerNode -> IntentDetectionNode -> EntityExtractionNode
-> RoleScopeNode -> PermissionCheckNode -> UpdateDataNode
-> ApprovalRequestNode -> ContextBuilderNode -> OpenAIReasoningNode
-> VerificationNode -> AuditLogNode -> NotificationNode
```

Delete:

```text
ChatTriggerNode -> IntentDetectionNode -> EntityExtractionNode
-> RoleScopeNode -> PermissionCheckNode -> SoftDeleteNode
-> ApprovalRequestNode -> ContextBuilderNode -> OpenAIReasoningNode
-> VerificationNode -> AuditLogNode -> NotificationNode
```

Hard delete dari AI diblok oleh `DeleteDataNode`. `SoftDeleteNode` hanya membuat draft archive/soft-delete dan wajib approval.

## Output Contract

Setiap output agent membawa:

- `sourceTools`: tool resmi yang digunakan.
- `retrievalStatus`: `retrieved`, `empty`, `denied`, atau `not_requested`.
- `verification.status`: `passed` atau `failed`.
- `meta.approvalRequired`: `true` untuk workflow CRUD sensitif.
- `nodeTrace`: jejak node yang berjalan.
- `workflowRunId`: id audit run jika tabel workflow tersedia.

## File Dibuat/Diubah

- `src/lib/ai-workflows/WorkflowRegistry.js`
- `src/lib/ai-workflows/WorkflowRunner.js`
- `src/lib/ai-workflows/WorkflowNodeExecutor.js`
- `src/lib/ai-workflows/AiWorkflowEngine.js`
- `src/lib/ai-workflows/definitions/crud_create_workflow.json`
- `src/lib/ai-workflows/definitions/crud_read_workflow.json`
- `src/lib/ai-workflows/definitions/crud_update_workflow.json`
- `src/lib/ai-workflows/definitions/crud_soft_delete_workflow.json`
- `src/lib/ai-orchestrator/toolRegistry.js`
- `src/lib/ai-orchestrator/intentClassifier.js`
- `src/lib/ai-orchestrator/permissionGuard.js`
- `src/lib/ai-orchestrator/answerGenerator.js`
- `src/app/api/ai-workflows/route.js`
- `prisma/migrations/202605140007_ai_workflow_engine/migration.sql`
- `tests/ai-workflow-platform.test.mjs`

## Testing

Coverage tambahan:

- registry node wajib seperti n8n;
- official tool allowlist;
- CRUD draft tanpa final database write;
- workflow create memakai PascalCase node dan menghasilkan `pending_approval`;
- output final mempertahankan metadata approval/retrieval/verification setelah audit node.
