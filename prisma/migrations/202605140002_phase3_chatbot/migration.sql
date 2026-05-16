CREATE TABLE IF NOT EXISTS chatbot_intents (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  requires_handoff BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO chatbot_intents (code, name, description, requires_handoff)
VALUES
  ('cek_status_usulan', 'Cek Status Usulan', 'Pertanyaan tentang status usulan mutasi atau putus JF.', TRUE),
  ('format_dokumen', 'Format Dokumen', 'Pertanyaan tentang format atau persyaratan dokumen.', FALSE),
  ('deadline', 'Deadline', 'Pertanyaan tentang batas waktu atau jadwal layanan.', FALSE),
  ('cara_update_data', 'Cara Update Data', 'Pertanyaan tentang cara memperbarui data pegawai.', FALSE),
  ('kontak_admin', 'Kontak Admin', 'Pertanyaan tentang kanal bantuan atau kontak admin.', FALSE),
  ('faq_umum', 'FAQ Umum', 'Pertanyaan umum yang dijawab dari knowledge base.', FALSE),
  ('handoff_admin', 'Teruskan ke Admin', 'Pertanyaan yang tidak yakin dijawab bot atau berkaitan data pribadi.', TRUE)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    requires_handoff = EXCLUDED.requires_handoff;

CREATE TABLE IF NOT EXISTS chat_sessions (
  id BIGSERIAL PRIMARY KEY,
  channel VARCHAR(40) NOT NULL DEFAULT 'whatsapp',
  external_user_id VARCHAR(120) NOT NULL,
  display_name VARCHAR(180),
  status VARCHAR(40) NOT NULL DEFAULT 'open',
  last_intent_code VARCHAR(80) REFERENCES chatbot_intents(code),
  handoff_required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(channel, external_user_id)
);

CREATE INDEX IF NOT EXISTS chat_sessions_status_idx ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS chat_sessions_last_intent_code_idx ON chat_sessions(last_intent_code);
CREATE INDEX IF NOT EXISTS chat_sessions_updated_at_idx ON chat_sessions(updated_at);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  direction VARCHAR(20) NOT NULL,
  message_type VARCHAR(40) NOT NULL DEFAULT 'text',
  provider_message_id VARCHAR(180),
  body TEXT,
  redacted_body TEXT,
  intent_code VARCHAR(80) REFERENCES chatbot_intents(code),
  confidence NUMERIC(5, 4),
  ai_response JSONB,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS chat_messages_provider_message_id_idx ON chat_messages(provider_message_id);
CREATE INDEX IF NOT EXISTS chat_messages_intent_code_idx ON chat_messages(intent_code);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at);
