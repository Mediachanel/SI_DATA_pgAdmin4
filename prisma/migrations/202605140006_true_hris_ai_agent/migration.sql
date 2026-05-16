CREATE TABLE IF NOT EXISTS knowledge_categories (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(80) UNIQUE,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  visibility VARCHAR(20) NOT NULL DEFAULT 'internal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knowledge_categories_visibility
  ON knowledge_categories (visibility);

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(120) UNIQUE,
  name VARCHAR(180) NOT NULL,
  source_type VARCHAR(80) NOT NULL DEFAULT 'manual',
  uri TEXT,
  visibility VARCHAR(20) NOT NULL DEFAULT 'internal',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_visibility
  ON knowledge_sources (visibility);

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES knowledge_categories(id) ON DELETE SET NULL,
  source_ref_id BIGINT REFERENCES knowledge_sources(id) ON DELETE SET NULL,
  title VARCHAR(240) NOT NULL,
  content TEXT NOT NULL,
  visibility VARCHAR(20) NOT NULL DEFAULT 'internal',
  category VARCHAR(120),
  source_type VARCHAR(80) NOT NULL DEFAULT 'manual',
  source_id VARCHAR(180),
  checksum VARCHAR(80),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_visibility
  ON knowledge_documents (visibility);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_category_id
  ON knowledge_documents (category_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source_ref_id
  ON knowledge_documents (source_ref_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source_id
  ON knowledge_documents (source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_active
  ON knowledge_documents (is_active);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id
  ON knowledge_chunks (document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_active
  ON knowledge_chunks (is_active);

CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id BIGSERIAL PRIMARY KEY,
  chunk_id BIGINT NOT NULL REFERENCES knowledge_chunks(id) ON DELETE CASCADE,
  provider VARCHAR(80) NOT NULL DEFAULT 'openai',
  model VARCHAR(120) NOT NULL,
  embedding JSONB NOT NULL,
  dimensions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(chunk_id, provider, model)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_chunk_id
  ON knowledge_embeddings (chunk_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_model
  ON knowledge_embeddings (model);

ALTER TABLE ai_audit_logs
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS detected_intent VARCHAR(80),
  ADD COLUMN IF NOT EXISTS extracted_entity JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_tool JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tool_result_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS response TEXT,
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(40),
  ADD COLUMN IF NOT EXISTS scope_result VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_detected_intent
  ON ai_audit_logs (detected_intent);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_verification_status
  ON ai_audit_logs (verification_status);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_scope_result
  ON ai_audit_logs (scope_result);

INSERT INTO knowledge_categories (code, name, description, visibility)
VALUES
  ('public_faq', 'FAQ Publik', 'Pertanyaan umum yang boleh dijawab sebelum login.', 'public'),
  ('internal_sop', 'SOP Internal', 'SOP dan referensi internal SI SDMK.', 'internal'),
  ('document_format', 'Format Dokumen', 'Panduan format dan kelengkapan dokumen.', 'public')
ON CONFLICT (code) DO NOTHING;
