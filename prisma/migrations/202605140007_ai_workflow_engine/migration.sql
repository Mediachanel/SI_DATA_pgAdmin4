CREATE TABLE IF NOT EXISTS ai_workflows (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_workflows_active
  ON ai_workflows (is_active);

CREATE TABLE IF NOT EXISTS ai_workflow_runs (
  id BIGSERIAL PRIMARY KEY,
  workflow_name VARCHAR(120) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'running',
  channel VARCHAR(40) NOT NULL DEFAULT 'internal',
  user_id VARCHAR(120),
  user_role VARCHAR(50),
  username VARCHAR(120),
  trigger_message TEXT,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  execution_ms INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_workflow_runs_workflow_name
  ON ai_workflow_runs (workflow_name);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_runs_status
  ON ai_workflow_runs (status);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_runs_channel
  ON ai_workflow_runs (channel);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_runs_user_role
  ON ai_workflow_runs (user_role);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_runs_started_at
  ON ai_workflow_runs (started_at);

CREATE TABLE IF NOT EXISTS ai_workflow_node_runs (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT NOT NULL REFERENCES ai_workflow_runs(id) ON DELETE CASCADE,
  node_id VARCHAR(120) NOT NULL,
  node_type VARCHAR(120) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'success',
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  error JSONB,
  execution_ms INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ai_workflow_node_runs_run_id
  ON ai_workflow_node_runs (run_id);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_node_runs_node_type
  ON ai_workflow_node_runs (node_type);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_node_runs_status
  ON ai_workflow_node_runs (status);

INSERT INTO ai_workflows (name, description, definition)
VALUES
  (
    'internal_hris_chat',
    'Workflow internal HRIS chat seperti n8n.',
    '{
      "name": "internal_hris_chat",
      "nodes": [
        { "id": "trigger", "type": "chat_trigger" },
        { "id": "intent", "type": "intent_detection" },
        { "id": "entity", "type": "entity_extraction" },
        { "id": "permission", "type": "permission_check" },
        { "id": "tool", "type": "tool_execution" },
        { "id": "database", "type": "database_query" },
        { "id": "knowledge", "type": "knowledge_search" },
        { "id": "context", "type": "context_builder" },
        { "id": "openai", "type": "openai_response" },
        { "id": "verify", "type": "verification" },
        { "id": "audit", "type": "audit_log" }
      ]
    }'::jsonb
  ),
  (
    'public_qna_chat',
    'Workflow public QnA chat halaman login seperti n8n.',
    '{
      "name": "public_qna_chat",
      "nodes": [
        { "id": "trigger", "type": "chat_trigger" },
        { "id": "qna", "type": "public_qna_search" },
        { "id": "context", "type": "context_builder" },
        { "id": "openai", "type": "openai_response" },
        { "id": "verify", "type": "verification" },
        { "id": "audit", "type": "audit_log" },
        { "id": "handoff", "type": "human_handoff" }
      ]
    }'::jsonb
  ),
  (
    'crud_create_workflow',
    'Workflow CREATE aman berbasis draft dan approval.',
    '{
      "name": "crud_create_workflow",
      "nodes": [
        { "id": "trigger", "type": "ChatTriggerNode" },
        { "id": "intent", "type": "IntentDetectionNode" },
        { "id": "entity", "type": "EntityExtractionNode" },
        { "id": "role_scope", "type": "RoleScopeNode" },
        { "id": "permission", "type": "PermissionCheckNode" },
        { "id": "draft_create", "type": "CreateDataNode" },
        { "id": "approval", "type": "ApprovalRequestNode" },
        { "id": "context", "type": "ContextBuilderNode" },
        { "id": "reasoning", "type": "OpenAIReasoningNode" },
        { "id": "verify", "type": "VerificationNode" },
        { "id": "audit", "type": "AuditLogNode" },
        { "id": "notification", "type": "NotificationNode" }
      ]
    }'::jsonb
  ),
  (
    'crud_read_workflow',
    'Workflow READ aman berbasis tool retrieval dan verification.',
    '{
      "name": "crud_read_workflow",
      "nodes": [
        { "id": "trigger", "type": "ChatTriggerNode" },
        { "id": "intent", "type": "IntentDetectionNode" },
        { "id": "entity", "type": "EntityExtractionNode" },
        { "id": "memory", "type": "ContextMemoryNode" },
        { "id": "role_scope", "type": "RoleScopeNode" },
        { "id": "permission", "type": "PermissionCheckNode" },
        { "id": "read", "type": "ReadDataNode" },
        { "id": "database", "type": "DatabaseQueryNode" },
        { "id": "dashboard", "type": "DashboardRetrievalNode" },
        { "id": "knowledge", "type": "KnowledgeBaseSearchNode" },
        { "id": "context", "type": "ContextBuilderNode" },
        { "id": "reasoning", "type": "OpenAIReasoningNode" },
        { "id": "verify", "type": "VerificationNode" },
        { "id": "audit", "type": "AuditLogNode" }
      ]
    }'::jsonb
  ),
  (
    'crud_update_workflow',
    'Workflow UPDATE aman berbasis draft dan approval.',
    '{
      "name": "crud_update_workflow",
      "nodes": [
        { "id": "trigger", "type": "ChatTriggerNode" },
        { "id": "intent", "type": "IntentDetectionNode" },
        { "id": "entity", "type": "EntityExtractionNode" },
        { "id": "role_scope", "type": "RoleScopeNode" },
        { "id": "permission", "type": "PermissionCheckNode" },
        { "id": "draft_update", "type": "UpdateDataNode" },
        { "id": "approval", "type": "ApprovalRequestNode" },
        { "id": "context", "type": "ContextBuilderNode" },
        { "id": "reasoning", "type": "OpenAIReasoningNode" },
        { "id": "verify", "type": "VerificationNode" },
        { "id": "audit", "type": "AuditLogNode" },
        { "id": "notification", "type": "NotificationNode" }
      ]
    }'::jsonb
  ),
  (
    'crud_soft_delete_workflow',
    'Workflow DELETE aman: soft delete/archive draft wajib approval.',
    '{
      "name": "crud_soft_delete_workflow",
      "nodes": [
        { "id": "trigger", "type": "ChatTriggerNode" },
        { "id": "intent", "type": "IntentDetectionNode" },
        { "id": "entity", "type": "EntityExtractionNode" },
        { "id": "role_scope", "type": "RoleScopeNode" },
        { "id": "permission", "type": "PermissionCheckNode" },
        { "id": "soft_delete", "type": "SoftDeleteNode" },
        { "id": "approval", "type": "ApprovalRequestNode" },
        { "id": "context", "type": "ContextBuilderNode" },
        { "id": "reasoning", "type": "OpenAIReasoningNode" },
        { "id": "verify", "type": "VerificationNode" },
        { "id": "audit", "type": "AuditLogNode" },
        { "id": "notification", "type": "NotificationNode" }
      ]
    }'::jsonb
  )
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    definition = EXCLUDED.definition,
    updated_at = CURRENT_TIMESTAMP;
