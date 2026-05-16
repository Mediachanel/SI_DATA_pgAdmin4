CREATE TABLE IF NOT EXISTS public_qna_knowledge_base (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(80) UNIQUE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  category VARCHAR(120) DEFAULT 'Umum',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public_qna_knowledge_base (code, question, answer, keywords, category)
VALUES
  ('format_dokumen', 'Apa format dokumen yang diperbolehkan?', 'Gunakan PDF untuk berkas pendukung usulan. Untuk data tabular gunakan Excel sesuai template. Nama file harus jelas dan ukuran mengikuti batas aplikasi.', ARRAY['format','dokumen','pdf','excel','upload'], 'Dokumen'),
  ('deadline', 'Kapan deadline layanan?', 'Deadline mengikuti pengumuman atau instruksi layanan masing-masing proses. Jika belum ada jadwal resmi di aplikasi, hubungi admin wilayah atau admin UKPD.', ARRAY['deadline','batas waktu','jadwal'], 'Layanan'),
  ('cara_update_data', 'Bagaimana cara update data pegawai?', 'Update data dilakukan setelah login dari menu Data Pegawai sesuai hak akses masing-masing role.', ARRAY['update data','ubah data','edit pegawai'], 'Data Pegawai'),
  ('kontak_admin', 'Bagaimana menghubungi admin?', 'Hubungi admin SI SDMK di UKPD atau wilayah masing-masing. Pertanyaan terkait data pribadi harus dilakukan setelah login.', ARRAY['kontak','admin','bantuan','helpdesk'], 'Bantuan')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public_chat_sessions (
  id BIGSERIAL PRIMARY KEY,
  visitor_id VARCHAR(120) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'open',
  ip_address VARCHAR(80),
  user_agent TEXT,
  last_intent VARCHAR(80),
  handoff_required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS public_chat_sessions_visitor_idx ON public_chat_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS public_chat_sessions_updated_at_idx ON public_chat_sessions(updated_at);

CREATE TABLE IF NOT EXISTS public_chat_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES public_chat_sessions(id) ON DELETE CASCADE,
  direction VARCHAR(20) NOT NULL,
  body TEXT,
  redacted_body TEXT,
  matched_qna_id BIGINT REFERENCES public_qna_knowledge_base(id) ON DELETE SET NULL,
  intent VARCHAR(80),
  confidence NUMERIC(5,4),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS public_chat_messages_session_id_idx ON public_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS public_chat_messages_created_at_idx ON public_chat_messages(created_at);

CREATE TABLE IF NOT EXISTS internal_chat_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(120),
  user_role VARCHAR(50),
  username VARCHAR(120),
  status VARCHAR(40) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS internal_chat_sessions_user_idx ON internal_chat_sessions(user_id, user_role);
CREATE INDEX IF NOT EXISTS internal_chat_sessions_updated_at_idx ON internal_chat_sessions(updated_at);

CREATE TABLE IF NOT EXISTS internal_chat_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES internal_chat_sessions(id) ON DELETE CASCADE,
  direction VARCHAR(20) NOT NULL,
  body TEXT,
  redacted_body TEXT,
  tool_name VARCHAR(80),
  ai_agent_task_id BIGINT REFERENCES ai_agent_tasks(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS internal_chat_messages_session_id_idx ON internal_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS internal_chat_messages_created_at_idx ON internal_chat_messages(created_at);
