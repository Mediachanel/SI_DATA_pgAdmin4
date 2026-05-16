CREATE TABLE IF NOT EXISTS ai_agent_tasks (
  id BIGSERIAL PRIMARY KEY,
  requested_by_id VARCHAR(120),
  requested_by_role VARCHAR(50),
  requested_by_username VARCHAR(120),
  mode VARCHAR(30) NOT NULL DEFAULT 'assistant',
  tool_name VARCHAR(80) NOT NULL,
  prompt TEXT NOT NULL,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(40) NOT NULL DEFAULT 'completed',
  approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by_id VARCHAR(120),
  approved_by_role VARCHAR(50),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ai_agent_tasks_status_idx ON ai_agent_tasks(status);
CREATE INDEX IF NOT EXISTS ai_agent_tasks_tool_name_idx ON ai_agent_tasks(tool_name);
CREATE INDEX IF NOT EXISTS ai_agent_tasks_created_at_idx ON ai_agent_tasks(created_at);

CREATE TABLE IF NOT EXISTS ai_agent_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT REFERENCES ai_agent_tasks(id) ON DELETE SET NULL,
  actor_id VARCHAR(120),
  actor_role VARCHAR(50),
  action VARCHAR(120) NOT NULL,
  tool_name VARCHAR(80),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ai_agent_audit_logs_task_id_idx ON ai_agent_audit_logs(task_id);
CREATE INDEX IF NOT EXISTS ai_agent_audit_logs_action_idx ON ai_agent_audit_logs(action);
CREATE INDEX IF NOT EXISTS ai_agent_audit_logs_created_at_idx ON ai_agent_audit_logs(created_at);
