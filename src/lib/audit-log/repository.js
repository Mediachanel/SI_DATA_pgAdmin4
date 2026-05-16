import { getConnectedPool } from "../db/postgres.js";

function parseJson(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function moduleFromAction(action, fallback = "") {
  if (fallback) return fallback;
  const prefix = String(action || "").split(".")[0];
  if (prefix === "ai_document") return "ai_documents";
  if (prefix === "ai_agent") return "ai_agent";
  if (prefix === "chatbot") return "chatbot";
  if (prefix === "login" || prefix === "security") return "auth";
  return prefix || "system";
}

function normalizeAuditLog(row) {
  const metadata = parseJson(row.metadata);
  return {
    id: `${row.source}-${row.id}`,
    source: row.source,
    raw_id: Number(row.id),
    user: row.actor_id || row.actor_username || "",
    role: row.actor_role || "",
    action: row.action || "",
    status: metadata.status || metadata.queueStatus || metadata.decision || "",
    module: moduleFromAction(row.action, row.module),
    entity_type: row.entity_type || row.tool_name || "",
    entity_id: row.entity_id || row.task_id || "",
    metadata,
    created_at: row.created_at
  };
}

function matchesFilters(item, filters) {
  if (filters.user && !String(item.user || "").toLowerCase().includes(filters.user.toLowerCase())) return false;
  if (filters.role && item.role !== filters.role) return false;
  if (filters.action && !String(item.action || "").toLowerCase().includes(filters.action.toLowerCase())) return false;
  if (filters.status && item.status !== filters.status) return false;
  if (filters.module && item.module !== filters.module) return false;
  if (filters.dateFrom && new Date(item.created_at) < new Date(`${filters.dateFrom}T00:00:00`)) return false;
  if (filters.dateTo && new Date(item.created_at) > new Date(`${filters.dateTo}T23:59:59`)) return false;
  return true;
}

export async function listAuditLogs(filters = {}) {
  const pool = await getConnectedPool();
  const [generalRows] = await pool.query(
    `SELECT 'audit' AS source, id, actor_id, actor_role, action, entity_type, entity_id, metadata, created_at,
            NULL AS actor_username, NULL AS tool_name, NULL AS task_id, NULL AS module
     FROM audit_logs
     ORDER BY created_at DESC
     LIMIT 300`
  ).catch(() => [[]]);
  const [aiRows] = await pool.query(
    `SELECT 'ai_agent' AS source, id, actor_id, actor_role, action, NULL AS entity_type, NULL AS entity_id,
            metadata, created_at, NULL AS actor_username, tool_name, task_id, 'ai_agent' AS module
     FROM ai_agent_audit_logs
     ORDER BY created_at DESC
     LIMIT 300`
  ).catch(() => [[]]);
  const [internalRows] = await pool.query(
    `SELECT 'internal_chat' AS source, id, user_id AS actor_id, user_role AS actor_role, 'internal_chat.session' AS action,
            'internal_chat_session' AS entity_type, id AS entity_id, '{}'::jsonb AS metadata, updated_at AS created_at,
            username AS actor_username, NULL AS tool_name, NULL AS task_id, 'internal_chat' AS module
     FROM internal_chat_sessions
     ORDER BY updated_at DESC
     LIMIT 100`
  ).catch(() => [[]]);

  return [...generalRows, ...aiRows, ...internalRows]
    .map(normalizeAuditLog)
    .filter((item) => matchesFilters(item, filters))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, Math.min(200, Math.max(1, Number(filters.limit) || 100)));
}
