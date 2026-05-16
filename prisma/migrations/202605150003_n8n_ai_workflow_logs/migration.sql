CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS ai_workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  role TEXT,
  source TEXT,
  message TEXT NOT NULL,
  intent TEXT,
  entities JSONB,
  tool TEXT,
  verification TEXT,
  response TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_workflow_logs_created_at_idx
  ON ai_workflow_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS ai_workflow_logs_user_id_idx
  ON ai_workflow_logs (user_id);

CREATE INDEX IF NOT EXISTS ai_workflow_logs_intent_idx
  ON ai_workflow_logs (intent);
