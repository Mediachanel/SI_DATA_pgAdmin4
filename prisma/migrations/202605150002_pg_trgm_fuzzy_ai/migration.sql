CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_pegawai_nama_trgm
  ON pegawai USING gin (nama gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pegawai_nama_ukpd_trgm
  ON pegawai USING gin (nama_ukpd gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pegawai_wilayah_trgm
  ON pegawai USING gin (wilayah gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pegawai_jenis_pegawai_trgm
  ON pegawai USING gin (jenis_pegawai gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pegawai_jabatan_menpan_trgm
  ON pegawai USING gin (nama_jabatan_menpan gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pegawai_jabatan_orb_trgm
  ON pegawai USING gin (nama_jabatan_orb gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_ukpd_nama_ukpd_trgm
  ON ukpd USING gin (nama_ukpd gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_ukpd_wilayah_trgm
  ON ukpd USING gin (wilayah gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_ai_documents_filename_trgm
  ON ai_documents USING gin (original_filename gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_ai_documents_classification_label_trgm
  ON ai_documents USING gin (classification_label gin_trgm_ops);
