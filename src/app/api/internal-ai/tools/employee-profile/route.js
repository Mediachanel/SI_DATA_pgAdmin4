import { getConnectedPool } from "@/lib/db/postgres";
import { ensurePgTrgm, rankDecision } from "@/lib/n8n-ai/fuzzy";
import { addPegawaiScope, checkN8nSecret } from "@/lib/n8n-ai/security";
import { ROLES } from "@/lib/constants/roles";
import {
  EMPLOYEE_PROFILE_SECTION_CONFIG,
  availableEmployeeProfileSections,
  getRequestedFieldsForSection,
  maskEmployeeProfileValue,
  normalizeEmployeeProfileSections,
  pickEmployeeProfileFields
} from "@/lib/n8n-ai/employeeProfileTool";

export const runtime = "nodejs";

const ALLOWED_ROLES = new Set([ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD]);
const MAX_SECTION_ROWS = 10;

function toolResponse(payload, status = 200) {
  return Response.json(payload, { status });
}

function isAllowedUser(user = {}) {
  return ALLOWED_ROLES.has(user.role);
}

function normalizeLimit(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 3;
  return Math.min(Math.floor(number), MAX_SECTION_ROWS);
}

function buildAlamatLengkap(row = {}) {
  const parts = [row.jalan, row.kelurahan, row.kecamatan, row.kota_kabupaten, row.provinsi]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return [...new Set(parts)].join(", ");
}

function employeeSummary(row = {}) {
  return {
    id_pegawai: row.id_pegawai,
    nama: row.nama,
    nama_ukpd: row.nama_ukpd,
    wilayah: row.wilayah,
    jenis_pegawai: row.jenis_pegawai,
    jabatan: row.nama_jabatan_menpan || row.nama_jabatan_orb || null
  };
}

function candidateSummary(row = {}) {
  return {
    id_pegawai: row.id_pegawai,
    nama: row.nama,
    nip: maskEmployeeProfileValue("nip", row.nip),
    nrk: maskEmployeeProfileValue("nrk", row.nrk),
    nama_ukpd: row.nama_ukpd,
    wilayah: row.wilayah,
    score: Number(row.score || 0)
  };
}

async function findEmployee(pool, body = {}) {
  const user = body.user || {};
  const exactId = Number(body.id_pegawai || body.id || 0);
  const where = ["1=1"];
  const params = [];
  addPegawaiScope(where, params, user, { pegawaiAlias: "p", ukpdAlias: "u" });

  if (Number.isInteger(exactId) && exactId > 0) {
    const [rows] = await pool.query(
      `SELECT p.*
       FROM \`pegawai\` p
       LEFT JOIN \`ukpd\` u ON u.\`nama_ukpd\` = p.\`nama_ukpd\`
       WHERE ${where.join(" AND ")}
         AND p.\`id_pegawai\` = ?
       LIMIT 1`,
      [...params, exactId]
    );
    return { employee: rows[0] || null, candidates: [], requires_clarification: false, confidence_score: rows[0] ? 1 : 0 };
  }

  const term = String(body.nama || body.query || body.message || body.nip || body.nrk || body.nik || "").trim();
  if (!term) {
    return { employee: null, candidates: [], requires_clarification: false, confidence_score: 0, missing_query: true };
  }

  await ensurePgTrgm(pool);
  const scoreParams = [term, term, term, term];
  const matchParams = [term, term, term, term, `%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`];
  const [rows] = await pool.query(
    `SELECT
       p.*,
       GREATEST(
         similarity(COALESCE(p.\`nama\`, ''), ?),
         similarity(COALESCE(CAST(p.\`nip\` AS TEXT), ''), ?),
         similarity(COALESCE(CAST(p.\`nik\` AS TEXT), ''), ?),
         similarity(COALESCE(CAST(p.\`nrk\` AS TEXT), ''), ?)
       ) AS score
     FROM \`pegawai\` p
     LEFT JOIN \`ukpd\` u ON u.\`nama_ukpd\` = p.\`nama_ukpd\`
     WHERE ${where.join(" AND ")}
       AND (
         COALESCE(p.\`nama\`, '') % ?
         OR COALESCE(CAST(p.\`nip\` AS TEXT), '') % ?
         OR COALESCE(CAST(p.\`nik\` AS TEXT), '') % ?
         OR COALESCE(CAST(p.\`nrk\` AS TEXT), '') % ?
         OR LOWER(COALESCE(p.\`nama\`, '')) LIKE LOWER(?)
         OR LOWER(COALESCE(CAST(p.\`nip\` AS TEXT), '')) LIKE LOWER(?)
         OR LOWER(COALESCE(CAST(p.\`nrk\` AS TEXT), '')) LIKE LOWER(?)
         OR LOWER(COALESCE(CAST(p.\`nik\` AS TEXT), '')) LIKE LOWER(?)
       )
     ORDER BY score DESC, p.\`nama\` ASC
     LIMIT 5`,
    [...scoreParams, ...params, ...matchParams]
  );

  const candidates = rows.map(candidateSummary);
  const decision = rankDecision(candidates);
  const selected = decision.action === "selected"
    ? rows.find((row) => String(row.id_pegawai) === String(decision.selected?.id_pegawai)) || rows[0] || null
    : null;

  return {
    employee: selected,
    candidates,
    requires_clarification: decision.action === "clarification_required",
    not_found: decision.action === "not_found",
    confidence_score: decision.score
  };
}

async function queryRows(pool, sql, params = []) {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    if (error?.code === "42P01" || error?.code === "ER_NO_SUCH_TABLE") return [];
    throw error;
  }
}

async function loadPegawaiSection(pool, employee, fields) {
  return pickEmployeeProfileFields(employee, fields);
}

async function loadIdPegawaiSection(pool, employee, section, fields, limit) {
  const config = EMPLOYEE_PROFILE_SECTION_CONFIG[section];
  const selectFields = fields.filter((field) => field !== "alamat_lengkap");
  if (section === "alamat" && fields.includes("alamat_lengkap")) {
    for (const field of ["jalan", "kelurahan", "kecamatan", "kota_kabupaten", "provinsi"]) {
      if (!selectFields.includes(field)) selectFields.push(field);
    }
  }
  const selectSql = ["id", ...selectFields].map((field) => `\`${field}\``).join(", ");
  const rows = await queryRows(
    pool,
    `SELECT ${selectSql}
     FROM \`${config.table}\`
     WHERE \`id_pegawai\` = ?
     ORDER BY ${config.orderBy || "`id` DESC"}
     LIMIT ${limit}`,
    [Number(employee.id_pegawai)]
  );

  return rows.map((row) => {
    const hydrated = section === "alamat" ? { ...row, alamat_lengkap: buildAlamatLengkap(row) } : row;
    return pickEmployeeProfileFields(hydrated, fields);
  });
}

async function loadIdentityMatchedSection(pool, employee, section, fields, limit) {
  const config = EMPLOYEE_PROFILE_SECTION_CONFIG[section];
  const selectSql = ["id", ...fields].map((field) => `\`${field}\``).join(", ");
  const rows = await queryRows(
    pool,
    `SELECT ${selectSql}
     FROM \`${config.table}\`
     WHERE (
       (CAST(\`nip\` AS TEXT) <> '' AND CAST(\`nip\` AS TEXT) = CAST(? AS TEXT))
       OR (CAST(\`nrk\` AS TEXT) <> '' AND CAST(\`nrk\` AS TEXT) = CAST(? AS TEXT))
       OR (LOWER(COALESCE(\`nama_pegawai\`, '')) = LOWER(?) AND LOWER(COALESCE(\`nama_ukpd\`, '')) = LOWER(?))
     )
     ORDER BY ${config.orderBy || "`id` DESC"}
     LIMIT ${limit}`,
    [employee.nip || "", employee.nrk || "", employee.nama || "", employee.nama_ukpd || ""]
  );

  return rows.map((row) => pickEmployeeProfileFields(row, fields));
}

async function loadSection(pool, employee, section, fields, limit) {
  if (section === "pegawai") return loadPegawaiSection(pool, employee, fields);

  const config = EMPLOYEE_PROFILE_SECTION_CONFIG[section];
  if (!config) return null;
  if (config.match === "identity") return loadIdentityMatchedSection(pool, employee, section, fields, limit);
  return loadIdPegawaiSection(pool, employee, section, fields, limit);
}

export async function POST(request) {
  if (!checkN8nSecret(request)) {
    return toolResponse({ error: "Forbidden" }, 403);
  }

  const body = await request.json().catch(() => ({}));
  if (!isAllowedUser(body.user)) {
    return toolResponse({ error: "User workflow internal tidak valid." }, 403);
  }

  const pool = await getConnectedPool();
  const lookup = await findEmployee(pool, body);

  if (lookup.missing_query) {
    return toolResponse({
      source: "database",
      tool: "employee-profile",
      message: "Masukkan id_pegawai, nama, NIP, NRK, atau NIK pegawai.",
      data: null,
      available_sections: availableEmployeeProfileSections()
    }, 422);
  }

  if (lookup.requires_clarification) {
    return toolResponse({
      source: "database",
      tool: "employee-profile",
      requires_clarification: true,
      candidates: lookup.candidates,
      confidence_score: lookup.confidence_score,
      message: "Kandidat pegawai ditemukan lebih dari satu. Minta user memilih pegawai yang dimaksud."
    });
  }

  if (!lookup.employee) {
    return toolResponse({
      source: "database",
      tool: "employee-profile",
      data: null,
      candidates: lookup.candidates,
      not_found: true,
      confidence_score: lookup.confidence_score || 0,
      message: "Pegawai tidak ditemukan atau berada di luar scope role user."
    });
  }

  const sections = normalizeEmployeeProfileSections(body.sections, body.fields);
  const limit = normalizeLimit(body.limit_per_section ?? body.limit);
  const data = {};
  const fieldMap = {};

  for (const section of sections) {
    const fields = getRequestedFieldsForSection(section, body.fields);
    if (!fields.length) continue;
    data[section] = await loadSection(pool, lookup.employee, section, fields, limit);
    fieldMap[section] = fields;
  }

  return toolResponse({
    source: "database",
    tool: "employee-profile",
    verification: "verified",
    employee: employeeSummary(lookup.employee),
    sections_requested: sections,
    fields_returned: fieldMap,
    limit_per_section: limit,
    data,
    confidence_score: lookup.confidence_score ?? 1,
    privacy: "Kolom sensitif seperti NIK, NIP, NRK, nomor HP, dan BPJS dimasking oleh backend.",
    available_sections: availableEmployeeProfileSections()
  });
}
