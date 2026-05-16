import { z } from "zod";
import { getConnectedPool } from "@/lib/db/postgres";
import { ROLES } from "@/lib/constants/roles";
import { addPegawaiScope, checkN8nSecret } from "@/lib/n8n-ai/security";

export const runtime = "nodejs";

const ALLOWED_ACTIONS = new Set(["create", "update", "delete"]);
const ALLOWED_ROLES = new Set([ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD]);

const schema = z.object({
  action: z.enum(["create", "update", "delete"]),
  reason: z.string().trim().min(5).max(1000),
  id_pegawai: z.union([z.string(), z.number()]).optional(),
  payload: z.record(z.any()).default({}),
  user: z.object({
    id: z.union([z.string(), z.number()]).optional(),
    username: z.string().optional(),
    role: z.string(),
    wilayah: z.string().optional().nullable(),
    wilayah_id: z.string().optional().nullable(),
    nama_ukpd: z.string().optional().nullable(),
    ukpd_id: z.string().optional().nullable()
  })
});

function toolResponse(payload, status = 200) {
  return Response.json(payload, { status });
}

async function ensureTaskTables(pool) {
  await pool.query(`
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
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_agent_audit_logs (
      id BIGSERIAL PRIMARY KEY,
      task_id BIGINT REFERENCES ai_agent_tasks(id) ON DELETE SET NULL,
      actor_id VARCHAR(120),
      actor_role VARCHAR(50),
      action VARCHAR(120) NOT NULL,
      tool_name VARCHAR(80),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function normalizePayloadForRole(action, payload, user) {
  const normalized = { ...payload };
  if (user.role === ROLES.ADMIN_UKPD) {
    const allowedUkpd = user.nama_ukpd || user.ukpd_id || "";
    if (action === "create" && !normalized.nama_ukpd) normalized.nama_ukpd = allowedUkpd;
    if (normalized.nama_ukpd && String(normalized.nama_ukpd).toLowerCase() !== String(allowedUkpd).toLowerCase()) {
      throw new Error("Admin UKPD hanya boleh membuat draft untuk UKPD sendiri.");
    }
  }
  return normalized;
}

async function assertTargetInScope(pool, action, idPegawai, user) {
  if (action === "create") return null;
  const id = Number(idPegawai);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("id_pegawai wajib diisi untuk update/delete.");
  }

  const where = ["p.`id_pegawai` = ?"];
  const params = [id];
  addPegawaiScope(where, params, user, { pegawaiAlias: "p", ukpdAlias: "u" });

  const [rows] = await pool.query(
    `SELECT p.\`id_pegawai\`, p.\`nama\`, p.\`nama_ukpd\`, COALESCE(NULLIF(p.\`wilayah\`, ''), u.\`wilayah\`) AS wilayah
     FROM \`pegawai\` p
     LEFT JOIN \`ukpd\` u ON u.\`nama_ukpd\` = p.\`nama_ukpd\`
     WHERE ${where.join(" AND ")}
     LIMIT 1`,
    params
  );

  if (!rows[0]) {
    throw new Error("Pegawai tidak ditemukan atau berada di luar scope role user.");
  }

  return rows[0];
}

export async function POST(request) {
  if (!checkN8nSecret(request)) {
    return toolResponse({ error: "Forbidden" }, 403);
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return toolResponse({ error: "Payload draft perubahan pegawai tidak valid.", details: parsed.error.flatten() }, 422);
  }

  const { action, reason, id_pegawai: idPegawai, user } = parsed.data;
  if (!ALLOWED_ACTIONS.has(action) || !ALLOWED_ROLES.has(user.role)) {
    return toolResponse({ error: "User atau action tidak diizinkan." }, 403);
  }

  try {
    const pool = await getConnectedPool();
    await ensureTaskTables(pool);
    const current = await assertTargetInScope(pool, action, idPegawai, user);
    const payload = normalizePayloadForRole(action, parsed.data.payload, user);
    const input = {
      action,
      id_pegawai: current?.id_pegawai || idPegawai || null,
      current,
      proposed_payload: payload,
      reason
    };

    const [taskResult] = await pool.query(
      `INSERT INTO ai_agent_tasks
        (requested_by_id, requested_by_role, requested_by_username, mode, tool_name, prompt, input, output, status, approval_required)
       VALUES (?, ?, ?, 'n8n', 'pegawai-change-draft', ?, CAST(? AS JSONB), '{}'::jsonb, 'pending_approval', TRUE)`,
      [
        user.id ? String(user.id) : null,
        user.role,
        user.username || user.nama_ukpd || null,
        reason,
        JSON.stringify(input)
      ]
    );

    const taskId = taskResult.insertId || taskResult.id || taskResult.raw_id;
    await pool.query(
      `INSERT INTO ai_agent_audit_logs (task_id, actor_id, actor_role, action, tool_name, metadata)
       VALUES (?, ?, ?, 'ai_agent.task_created', 'pegawai-change-draft', CAST(? AS JSONB))`,
      [taskId || null, user.id ? String(user.id) : null, user.role, JSON.stringify({ action, id_pegawai: input.id_pegawai })]
    );

    return toolResponse({
      source: "database",
      tool: "pegawai-change-draft",
      verification: "pending_human_approval",
      task_id: taskId || null,
      status: "pending_approval",
      approval_required: true,
      message: "Draft perubahan pegawai dibuat dan menunggu approval manusia.",
      input
    }, 201);
  } catch (error) {
    return toolResponse({ error: error.message || "Gagal membuat draft perubahan pegawai." }, 400);
  }
}
