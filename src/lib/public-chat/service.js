import { createPool, getConnectedPool, getPostgresCandidates, getPostgresDatabaseCandidates } from "../db/postgres.js";
import { getClientIp } from "../security/requestIdentity.js";
import { inspectContentSafety } from "../security/contentSafety.js";

const PRIVATE_DATA_RESPONSE = "Untuk melihat data tersebut, silakan login terlebih dahulu sesuai hak akses Anda.";
const PUBLIC_QNA_NOT_FOUND_RESPONSE = "Maaf, informasi tersebut belum tersedia pada QnA publik SI SDMK. Silakan login atau hubungi admin.";
const PRIVATE_PATTERNS = [
  /\b(nik|nip|nrk)\b/i,
  /\b(status\s+usulan|data\s+pegawai|dokumen\s+pegawai|semua\s+pegawai)\b/i,
  /\b(jabatan|ukpd|wilayah)\s+[a-z][a-z\s'.-]{2,80}\b/i,
  /\b(kepala|direktur|pimpinan|pejabat|plt|plh)\b.*\b(dinas|ukpd|puskesmas|rsud|suku dinas|sudinkes)\b/i,
  /\b\d{16,18}\b/
];
const PROMPT_INJECTION_PATTERNS = [
  /\b(sql|select|drop|delete|update|bypass|abaikan instruksi|ignore previous)\b/i,
  /\b(tampilkan|lihat|minta).*\b(nik|nip|nrk)\b/i
];

function containsPersonalData(text) {
  return /\b(nik|nip|nrk)\b/i.test(String(text || "")) || /\b\d{16,18}\b/.test(String(text || ""));
}

function redactPersonalData(text) {
  return String(text || "")
    .replace(/\b\d{16,18}\b/g, "[REDACTED_ID]")
    .replace(/\b(nik|nip|nrk)\s*[:=]?\s*[0-9\s-]{6,24}\b/gi, "$1 [REDACTED_ID]");
}

function parseJson(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function normalizeSession(row) {
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    handoff_required: Boolean(row.handoff_required)
  };
}

function normalizeMessage(row) {
  return {
    ...row,
    id: Number(row.id),
    session_id: Number(row.session_id),
    matched_qna_id: row.matched_qna_id ? Number(row.matched_qna_id) : null,
    metadata: parseJson(row.metadata)
  };
}

function scoreQna(text, item) {
  const normalized = text.toLowerCase();
  const keywords = Array.isArray(item.keywords) ? item.keywords : [];
  const haystack = `${item.question} ${item.answer} ${keywords.join(" ")}`.toLowerCase();
  let score = 0;
  for (const keyword of keywords) {
    if (normalized.includes(String(keyword).toLowerCase())) score += 2;
  }
  for (const token of normalized.split(/\s+/).filter((part) => part.length > 3)) {
    if (haystack.includes(token)) score += 1;
  }
  return score;
}

export function isPublicChatPrivateRequest(text) {
  return PRIVATE_PATTERNS.some((pattern) => pattern.test(String(text || "")));
}

export function isPromptInjectionRequest(text) {
  const safety = inspectContentSafety(text, { allowPersonalData: true });
  return !safety.allowed || PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(String(text || "")));
}

export function publicChatReply({ text, qnaItems = [] }) {
  const redactedText = redactPersonalData(text);
  if (isPromptInjectionRequest(text)) {
    return {
      answer: "Maaf, saya hanya dapat menjawab informasi layanan umum SI SDMK.",
      redactedText,
      intent: "blocked_prompt",
      confidence: 1,
      handoff: false,
      matchedQna: null
    };
  }
  if (isPublicChatPrivateRequest(text) || containsPersonalData(text)) {
    return {
      answer: PRIVATE_DATA_RESPONSE,
      redactedText,
      intent: "private_data_request",
      confidence: 1,
      handoff: false,
      matchedQna: null
    };
  }

  const ranked = qnaItems
    .map((item) => ({ ...item, score: scoreQna(text, item) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score <= 0) {
    return {
      answer: PUBLIC_QNA_NOT_FOUND_RESPONSE,
      redactedText,
      intent: "qna_not_found",
      confidence: 0.2,
      handoff: true,
      matchedQna: null
    };
  }

  return {
    answer: best.answer,
    redactedText,
    intent: best.code || "public_qna",
    confidence: Math.min(0.95, 0.55 + best.score / 10),
    handoff: false,
    matchedQna: best
  };
}

export async function listPublicQna({ activeOnly = true } = {}) {
  const pool = await getConnectedPool();
  const [rows] = await pool.query(
    `SELECT * FROM public_qna_knowledge_base
     ${activeOnly ? "WHERE is_active = TRUE" : ""}
     ORDER BY category ASC, question ASC`
  );
  const publicRows = rows.map((row) => ({ ...row, id: Number(row.id), is_active: Boolean(row.is_active), source: "public_qna" }));
  const legacyRows = await findLegacyQnaRows();
  const legacyQna = legacyRows.map((row) => {
    const keywordText = `${row.category || ""} ${row.category_description || ""} ${row.question || ""}`;
    const keywords = [...new Set(keywordText.toLowerCase().split(/[^a-z0-9\u00c0-\u024f]+/i).filter((item) => item.length > 3))];
    return {
      ...row,
      id: Number(row.id),
      source: "legacy_qna",
      code: `legacy_qna_${row.id}`,
      keywords,
      is_active: true
    };
  });
  return [...publicRows, ...legacyQna];
}

async function findLegacyQnaRows() {
  const hosts = getPostgresCandidates();
  const databases = getPostgresDatabaseCandidates();
  for (const candidate of hosts) {
    for (const database of databases) {
      const pool = createPool({ ...candidate, database });
      try {
        const [rows] = await pool.query(
          `SELECT
             i.\`id\`,
             i.\`question\`,
             i.\`answer\`,
             i.\`status\`,
             c.\`name\` AS category,
             c.\`description\` AS category_description,
             c.\`is_active\` AS category_is_active
           FROM \`qna_item\` i
           INNER JOIN \`qna_category\` c ON c.\`id\` = i.\`category_id\`
           WHERE i.\`status\` = 'published' AND c.\`is_active\` = 1
           ORDER BY c.\`sort_order\` ASC, c.\`name\` ASC, i.\`updated_at\` DESC, i.\`id\` DESC`
        );
        await pool.end().catch(() => {});
        if (rows.length) return rows;
      } catch {
        await pool.end().catch(() => {});
      }
    }
  }
  return [];
}

async function writePublicAiAudit(pool, { text, reply, ip }) {
  try {
    await pool.query(
      `INSERT INTO ai_audit_logs
       (actor_id, actor_role, prompt, message, intent, detected_intent, tool_name, extracted_entity,
        selected_tool, tool_result_summary, confidence_score, response, verification_status, scope_result,
        execution_ms, permission_result, fallback, response_status, module, metadata)
       VALUES (?, 'PUBLIC', ?, ?, ?, ?, ?, CAST(? AS jsonb), CAST(? AS jsonb), CAST(? AS jsonb), ?, ?, ?, ?, 0, ?, ?, ?, 'public_ai_chat', CAST(? AS jsonb))`,
      [
        ip || "anonymous",
        reply.redactedText,
        reply.redactedText,
        reply.intent || null,
        reply.intent || null,
        "public_qna_rag",
        JSON.stringify({}),
        JSON.stringify(reply.output?.selectedTools || []),
        JSON.stringify([{ source: reply.source || "QnA Publik", total: reply.output?.meta?.total || 0 }]),
        reply.confidence || null,
        reply.answer,
        reply.verification?.status || null,
        "allowed_public",
        "allowed",
        reply.handoff,
        reply.handoff ? "needs_clarification" : "completed",
        JSON.stringify({ rawMessage: redactPersonalData(text), source: reply.source || null })
      ]
    );
  } catch {
    // AI audit migration may not exist in older local databases.
  }
}

export async function upsertPublicQna({ id = null, question, answer, keywords = [], category = "Umum", isActive = true }) {
  const pool = await getConnectedPool();
  const keywordArray = Array.isArray(keywords) ? keywords : String(keywords || "").split(",").map((item) => item.trim()).filter(Boolean);
  if (id) {
    const [, rawResult] = await pool.query(
      `UPDATE public_qna_knowledge_base
       SET question = ?, answer = ?, keywords = ?, category = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
       RETURNING *`,
      [question, answer, keywordArray, category, isActive, id]
    );
    return rawResult.rows?.[0] || null;
  }
  const [, rawResult] = await pool.query(
    `INSERT INTO public_qna_knowledge_base (question, answer, keywords, category, is_active)
     VALUES (?, ?, ?, ?, ?)
     RETURNING *`,
    [question, answer, keywordArray, category, isActive]
  );
  return rawResult.rows?.[0] || null;
}

export async function handlePublicChat({ request, visitorId = "", text }) {
  const pool = await getConnectedPool();
  const ip = getClientIp(request);
  const userAgent = request?.headers?.get("user-agent") || "";
  const safeVisitorId = String(visitorId || ip || "anonymous").slice(0, 120);
  const [, sessionResult] = await pool.query(
    `INSERT INTO public_chat_sessions (visitor_id, ip_address, user_agent)
     VALUES (?, ?, ?)
     RETURNING *`,
    [safeVisitorId, ip, userAgent]
  );
  const session = normalizeSession(sessionResult.rows[0]);
  const qnaItems = await listPublicQna({ activeOnly: true });
  const guardReply = publicChatReply({ text, qnaItems });
  const reply = guardReply;

  await pool.query(
    `INSERT INTO public_chat_messages (session_id, direction, body, redacted_body, matched_qna_id, intent, confidence, metadata)
     VALUES (?, 'inbound', ?, ?, ?, ?, ?, CAST(? AS jsonb))`,
    [session.id, text, reply.redactedText, reply.matchedQna?.source === "public_qna" || reply.matchedQna?.source === "public_qna_knowledge_base" ? reply.matchedQna.id : null, reply.intent, reply.confidence, JSON.stringify({ source: "public_widget", answerSource: reply.source || null, qnaSource: reply.matchedQna?.source || null, qnaId: reply.matchedQna?.id || null, verification: reply.verification || null })]
  );
  const [, outboundResult] = await pool.query(
    `INSERT INTO public_chat_messages (session_id, direction, body, redacted_body, matched_qna_id, intent, confidence, metadata)
     VALUES (?, 'outbound', ?, ?, ?, ?, ?, CAST(? AS jsonb))
     RETURNING *`,
    [session.id, reply.answer, reply.answer, reply.matchedQna?.source === "public_qna" || reply.matchedQna?.source === "public_qna_knowledge_base" ? reply.matchedQna.id : null, reply.intent, reply.confidence, JSON.stringify({ handoff: reply.handoff, answerSource: reply.source || null, output: reply.output || null, qnaSource: reply.matchedQna?.source || null, qnaId: reply.matchedQna?.id || null })]
  );
  await pool.query(
    `UPDATE public_chat_sessions
     SET last_intent = ?, handoff_required = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [reply.intent, reply.handoff, session.id]
  );
  await writePublicAiAudit(pool, { text, reply, ip });

  return {
    session,
    message: normalizeMessage(outboundResult.rows[0]),
    answer: reply.answer,
    redactedText: reply.redactedText,
    intent: reply.intent,
    confidence: reply.confidence,
    source: reply.source || "QnA Publik",
    output: reply.output || { rows: [], meta: {}, source: reply.source || "QnA Publik", confidence: reply.confidence }
  };
}

export async function listPublicChatSessions({ limit = 50 } = {}) {
  const pool = await getConnectedPool();
  const [rows] = await pool.query(
    `SELECT s.*,
            COUNT(m.id) AS message_count,
            MAX(CASE WHEN m.direction = 'inbound' THEN m.redacted_body ELSE NULL END) AS last_inbound_message
     FROM public_chat_sessions s
     LEFT JOIN public_chat_messages m ON m.session_id = s.id
     GROUP BY s.id
     ORDER BY s.updated_at DESC
     LIMIT ?`,
    [Math.min(100, Math.max(1, Number(limit) || 50))]
  );
  return rows.map((row) => ({ ...normalizeSession(row), message_count: Number(row.message_count || 0) }));
}

export async function listPublicChatMessages(sessionId) {
  const pool = await getConnectedPool();
  const [rows] = await pool.query(
    "SELECT * FROM public_chat_messages WHERE session_id = ? ORDER BY created_at ASC, id ASC",
    [sessionId]
  );
  return rows.map(normalizeMessage);
}
