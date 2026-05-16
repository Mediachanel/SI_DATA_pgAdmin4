CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (code, name, description)
VALUES
  ('SUPER_ADMIN', 'Super Admin', 'Akses penuh seluruh data dan konfigurasi SI SDMK.'),
  ('ADMIN_WILAYAH', 'Admin Wilayah', 'Akses data pegawai sesuai wilayah administrasi.'),
  ('ADMIN_UKPD', 'Admin UKPD', 'Akses data pegawai pada UKPD sendiri.')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS app_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(120) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_code VARCHAR(50) NOT NULL REFERENCES roles(code),
  wilayah VARCHAR(120),
  ukpd_id INTEGER,
  nama_ukpd VARCHAR(220),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS app_users_role_code_idx ON app_users(role_code);
CREATE INDEX IF NOT EXISTS app_users_wilayah_idx ON app_users(wilayah);
CREATE INDEX IF NOT EXISTS app_users_ukpd_id_idx ON app_users(ukpd_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id VARCHAR(120),
  actor_role VARCHAR(50),
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(120),
  entity_id VARCHAR(120),
  ip_address VARCHAR(80),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);

ALTER TABLE ukpd ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'ADMIN_UKPD';
ALTER TABLE ukpd ADD COLUMN IF NOT EXISTS wilayah VARCHAR(120);

ALTER TABLE ukpd
  DROP CONSTRAINT IF EXISTS ukpd_role_check;

ALTER TABLE ukpd
  ADD CONSTRAINT ukpd_role_check
  CHECK (role IN ('SUPER_ADMIN', 'ADMIN_WILAYAH', 'ADMIN_UKPD'));
