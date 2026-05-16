import { getConnectedPool } from "@/lib/db/postgres";

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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

function pickText(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text.slice(0, 255);
  }
  return "";
}

function buildApprovedFields(document) {
  const result = parseJson(document?.result);
  const correction = parseJson(document?.correction_payload);
  const resultFields = result?.candidateFields || result?.metadata || {};
  const correctionFields = correction?.candidateFields || correction?.metadata || correction || {};
  const fields = { ...resultFields, ...correctionFields };
  return {
    nama: pickText(fields.nama, fields.name),
    nip: pickText(fields.nip, fields.NIP),
    nrk: pickText(fields.nrk, fields.NRK),
    nik: pickText(fields.nik, fields.NIK),
    nama_ukpd: pickText(fields.ukpd, fields.nama_ukpd, fields.UKPD),
    nama_jabatan_menpan: pickText(fields.jabatan, fields.nama_jabatan_menpan)
  };
}

function buildPegawaiUpdate(fields, current) {
  const allowed = ["nama", "nik", "nama_ukpd", "nama_jabatan_menpan"];
  const updates = [];
  const values = [];
  for (const column of allowed) {
    if (!fields[column]) continue;
    if (String(current?.[column] || "") === fields[column]) continue;
    updates.push(`${column} = ?`);
    values.push(fields[column]);
  }
  return { updates, values };
}

async function applyApprovedAiDocument(connection, document) {
  const fields = buildApprovedFields(document);
  const identifiers = [
    ["nip", fields.nip],
    ["nrk", fields.nrk],
    ["nik", fields.nik]
  ].filter(([, value]) => value);

  if (!identifiers.length) {
    return { applied: false, reason: "no_identifier", fields };
  }

  const where = identifiers.map(([column]) => `${column} = ?`).join(" OR ");
  const params = identifiers.map(([, value]) => value);
  const [rows] = await connection.query(`SELECT * FROM pegawai WHERE ${where} LIMIT 1`, params);
  const current = rows[0];
  if (!current) return { applied: false, reason: "pegawai_not_found", fields };

  const update = buildPegawaiUpdate(fields, current);
  if (!update.updates.length) {
    return { applied: false, reason: "no_changes", id_pegawai: current.id_pegawai, fields };
  }

  await connection.query(
    `UPDATE pegawai SET ${update.updates.join(", ")} WHERE id_pegawai = ?`,
    [...update.values, current.id_pegawai]
  );
  return {
    applied: true,
    reason: "updated",
    id_pegawai: current.id_pegawai,
    updatedFields: update.updates.map((item) => item.split(" = ")[0])
  };
}

export function normalizeAiDocumentRow(row) {
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    size_bytes: Number(row.size_bytes || 0),
    classification_confidence: normalizeNumber(row.classification_confidence),
    classification: parseJson(row.classification),
    result: parseJson(row.result),
    correction_payload: parseJson(row.correction_payload)
  };
}

export async function createAiDocumentWithReview({ file, classification, user }) {
  const pool = await getConnectedPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [documentResult] = await connection.query(
      `INSERT INTO ai_documents
       (original_filename, stored_filename, storage_path, content_type, size_bytes, sha256, status,
        classification_label, classification_confidence, classification,
        uploaded_by_id, uploaded_by_role, uploaded_by_username)
       VALUES (?, ?, ?, ?, ?, ?, 'pending_review', ?, ?, CAST(? AS jsonb), ?, ?, ?)`,
      [
        file.originalFilename,
        file.storedFilename,
        file.storagePath,
        file.contentType,
        file.sizeBytes,
        file.sha256,
        classification.label,
        classification.confidence,
        JSON.stringify(classification),
        user?.id ? String(user.id) : null,
        user?.role || null,
        user?.username || user?.nama_ukpd || null
      ]
    );
    const documentId = documentResult.insertId;
    const [extractionResult] = await connection.query(
      `INSERT INTO ai_extraction_results
       (document_id, provider, model, status, result, confidence)
       VALUES (?, ?, ?, 'draft', CAST(? AS jsonb), ?)`,
      [
        documentId,
        classification.provider,
        classification.model,
        JSON.stringify(classification.extracted || {}),
        classification.confidence
      ]
    );
    await connection.query(
      `INSERT INTO ai_validation_queue
       (document_id, extraction_result_id, queue_status, assigned_role)
       VALUES (?, ?, 'pending', 'SUPER_ADMIN')`,
      [documentId, extractionResult.insertId]
    );
    const [rows] = await connection.query(
      `SELECT d.*, q.queue_status, q.assigned_role, q.reviewer_notes, q.reviewed_at, e.result
       FROM ai_documents d
       LEFT JOIN ai_validation_queue q ON q.document_id = d.id
       LEFT JOIN ai_extraction_results e ON e.document_id = d.id
       WHERE d.id = ?
       LIMIT 1`,
      [documentId]
    );
    await connection.commit();
    return normalizeAiDocumentRow(rows[0]);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listAiDocuments({ status = "", limit = 50 } = {}) {
  const pool = await getConnectedPool();
  const params = [];
  const where = [];
  if (status) {
    where.push("q.queue_status = ?");
    params.push(status);
  }
  params.push(Math.min(100, Math.max(1, Number(limit) || 50)));

  const [rows] = await pool.query(
    `SELECT d.*, q.queue_status, q.assigned_role, q.reviewer_notes, q.reviewed_at, e.result
     FROM ai_documents d
     LEFT JOIN ai_validation_queue q ON q.document_id = d.id
     LEFT JOIN ai_extraction_results e ON e.document_id = d.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY d.created_at DESC
     LIMIT ?`,
    params
  );
  return rows.map(normalizeAiDocumentRow);
}

export async function getAiDocumentById(id) {
  const pool = await getConnectedPool();
  const [rows] = await pool.query(
    `SELECT d.*, q.queue_status, q.assigned_role, q.reviewer_notes, q.reviewed_at, q.correction_payload, e.result
     FROM ai_documents d
     LEFT JOIN ai_validation_queue q ON q.document_id = d.id
     LEFT JOIN ai_extraction_results e ON e.document_id = d.id
     WHERE d.id = ?
     LIMIT 1`,
    [id]
  );
  return normalizeAiDocumentRow(rows[0]);
}

export async function reviewAiDocument({ id, decision, notes = "", correctionPayload = null, user }) {
  const queueStatus = decision === "approve" ? "approved" : decision === "correct" ? "corrected" : "rejected";
  const documentStatus = decision === "approve" ? "approved" : decision === "correct" ? "corrected" : "rejected";
  const pool = await getConnectedPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(
      `UPDATE ai_validation_queue
       SET queue_status = ?,
           reviewer_id = ?,
           reviewer_role = ?,
           reviewer_notes = ?,
           correction_payload = CAST(? AS jsonb),
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE document_id = ?`,
      [
        queueStatus,
        user?.id ? String(user.id) : null,
        user?.role || null,
        notes || null,
        JSON.stringify(correctionPayload || {}),
        id
      ]
    );
    await connection.query(
      "UPDATE ai_documents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [documentStatus, id]
    );
    if (decision === "approve") {
      await connection.query(
        "UPDATE ai_extraction_results SET status = 'approved' WHERE document_id = ?",
        [id]
      );
    }
    const [rows] = await connection.query(
      `SELECT d.*, q.queue_status, q.assigned_role, q.reviewer_notes, q.reviewed_at, q.correction_payload, e.result
       FROM ai_documents d
       LEFT JOIN ai_validation_queue q ON q.document_id = d.id
       LEFT JOIN ai_extraction_results e ON e.document_id = d.id
       WHERE d.id = ?
       LIMIT 1`,
      [id]
    );
    let applyResult = null;
    if (decision === "approve") {
      applyResult = await applyApprovedAiDocument(connection, rows[0]);
    }
    await connection.commit();
    return { ...normalizeAiDocumentRow(rows[0]), applyResult };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
