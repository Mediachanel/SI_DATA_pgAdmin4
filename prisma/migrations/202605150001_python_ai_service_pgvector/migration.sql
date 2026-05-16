CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE knowledge_embeddings
  ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);

CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_vector_cosine
  ON knowledge_embeddings
  USING ivfflat (embedding_vector vector_cosine_ops)
  WITH (lists = 100)
  WHERE embedding_vector IS NOT NULL;

CREATE TABLE IF NOT EXISTS ai_draft_changes (
  id BIGSERIAL PRIMARY KEY,
  action_type VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  target_id VARCHAR(120),
  status VARCHAR(40) NOT NULL DEFAULT 'PENDING_APPROVAL',
  requested_by_id VARCHAR(120),
  requested_by_role VARCHAR(50),
  requested_by_username VARCHAR(120),
  approved_by_id VARCHAR(120),
  approved_by_role VARCHAR(50),
  message TEXT,
  entities JSONB NOT NULL DEFAULT '{}'::jsonb,
  proposed_changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  rejected_reason TEXT,
  approved_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_draft_changes_status
  ON ai_draft_changes (status);
CREATE INDEX IF NOT EXISTS idx_ai_draft_changes_action_type
  ON ai_draft_changes (action_type);
CREATE INDEX IF NOT EXISTS idx_ai_draft_changes_entity_target
  ON ai_draft_changes (entity_type, target_id);
CREATE INDEX IF NOT EXISTS idx_ai_draft_changes_requested_by
  ON ai_draft_changes (requested_by_id, requested_by_role);
CREATE INDEX IF NOT EXISTS idx_ai_draft_changes_created_at
  ON ai_draft_changes (created_at);
