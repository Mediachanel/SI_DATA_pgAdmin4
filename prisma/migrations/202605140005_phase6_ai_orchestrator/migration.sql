ALTER TABLE internal_chat_sessions
  ADD COLUMN IF NOT EXISTS context JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_intent VARCHAR(80),
  ADD COLUMN IF NOT EXISTS last_entity JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_internal_chat_sessions_last_intent
  ON internal_chat_sessions (last_intent);

CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id VARCHAR(120),
  actor_role VARCHAR(50),
  prompt TEXT,
  intent VARCHAR(80),
  tool_name VARCHAR(80),
  execution_ms INTEGER NOT NULL DEFAULT 0,
  permission_result VARCHAR(40),
  fallback BOOLEAN NOT NULL DEFAULT FALSE,
  response_status VARCHAR(40),
  module VARCHAR(80),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_actor_id ON ai_audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_actor_role ON ai_audit_logs (actor_role);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_intent ON ai_audit_logs (intent);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_tool_name ON ai_audit_logs (tool_name);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_response_status ON ai_audit_logs (response_status);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_module ON ai_audit_logs (module);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_created_at ON ai_audit_logs (created_at);
