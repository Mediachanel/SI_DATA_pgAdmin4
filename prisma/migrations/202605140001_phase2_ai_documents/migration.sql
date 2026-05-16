CREATE TABLE IF NOT EXISTS ai_documents (
  id BIGSERIAL PRIMARY KEY,
  original_filename VARCHAR(180) NOT NULL,
  stored_filename VARCHAR(180) NOT NULL,
  storage_path TEXT NOT NULL,
  content_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending_review',
  classification_label VARCHAR(80),
  classification_confidence NUMERIC(5, 4),
  classification JSONB NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by_id VARCHAR(120),
  uploaded_by_role VARCHAR(50),
  uploaded_by_username VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ai_documents_status_idx ON ai_documents(status);
CREATE INDEX IF NOT EXISTS ai_documents_classification_label_idx ON ai_documents(classification_label);
CREATE INDEX IF NOT EXISTS ai_documents_created_at_idx ON ai_documents(created_at);
CREATE INDEX IF NOT EXISTS ai_documents_sha256_idx ON ai_documents(sha256);

CREATE TABLE IF NOT EXISTS ai_extraction_results (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES ai_documents(id) ON DELETE CASCADE,
  provider VARCHAR(80) NOT NULL DEFAULT 'mock',
  model VARCHAR(120) NOT NULL DEFAULT 'phase2-mock-classifier',
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(5, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ai_extraction_results_document_id_idx ON ai_extraction_results(document_id);
CREATE INDEX IF NOT EXISTS ai_extraction_results_status_idx ON ai_extraction_results(status);

CREATE TABLE IF NOT EXISTS ai_validation_queue (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES ai_documents(id) ON DELETE CASCADE,
  extraction_result_id BIGINT REFERENCES ai_extraction_results(id) ON DELETE SET NULL,
  queue_status VARCHAR(40) NOT NULL DEFAULT 'pending',
  assigned_role VARCHAR(50) NOT NULL DEFAULT 'SUPER_ADMIN',
  reviewer_id VARCHAR(120),
  reviewer_role VARCHAR(50),
  reviewer_notes TEXT,
  correction_payload JSONB,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ai_validation_queue_document_id_idx ON ai_validation_queue(document_id);
CREATE INDEX IF NOT EXISTS ai_validation_queue_status_idx ON ai_validation_queue(queue_status);
CREATE INDEX IF NOT EXISTS ai_validation_queue_assigned_role_idx ON ai_validation_queue(assigned_role);
