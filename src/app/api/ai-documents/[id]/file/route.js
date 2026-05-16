import fs from "node:fs/promises";
import path from "node:path";
import { ROLES } from "@/lib/constants/roles";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail } from "@/lib/helpers/response";
import { getAiDocumentById } from "@/lib/ai-documents/repository";
import { parsePositiveId } from "@/lib/validation/pegawai";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { writeAuditLog } from "@/lib/security/auditLog";

export const runtime = "nodejs";

function isInsidePath(child, parent) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function getStorageRoot() {
  return path.resolve(process.env.STORAGE_LOCAL_PATH || path.join(process.cwd(), "storage"));
}

function safeStoragePath(storagePath) {
  const root = getStorageRoot();
  const fullPath = path.resolve(process.cwd(), storagePath || "");
  return isInsidePath(fullPath, root) ? fullPath : null;
}

function contentDisposition(mode, fileName) {
  const safeName = String(fileName || "ai-document").replace(/["\r\n]/g, "");
  return `${mode === "download" ? "attachment" : "inline"}; filename="${safeName}"`;
}

export async function GET(request, { params }) {
  const { user, error } = await requireAuth([ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD], request);
  if (error) return error;
  const rateLimitError = enforceRateLimit(request, {
    namespace: "ai-document-file",
    limit: 120,
    windowMs: 15 * 60 * 1000,
    key: user.username || user.id
  });
  if (rateLimitError) return rateLimitError;

  const { id: rawId } = await params;
  const id = parsePositiveId(rawId);
  if (!id) return fail("ID dokumen AI tidak valid.", 400);

  const document = await getAiDocumentById(id);
  if (!document) return fail("Dokumen AI tidak ditemukan.", 404);

  const fullPath = safeStoragePath(document.storage_path);
  if (!fullPath) return fail("Lokasi dokumen tidak valid.", 422);

  try {
    const file = await fs.readFile(fullPath);
    const { searchParams } = new URL(request.url);
    await writeAuditLog({
      request,
      user,
      action: searchParams.get("download") === "1" ? "ai_document.download" : "ai_document.preview",
      entityType: "ai_document",
      entityId: id,
      metadata: { fileName: document.original_filename }
    });
    return new Response(file, {
      headers: {
        "Content-Type": document.content_type || "application/octet-stream",
        "Content-Length": String(file.length),
        "Content-Disposition": contentDisposition(searchParams.get("download") === "1" ? "download" : "inline", document.original_filename),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return fail("File dokumen AI tidak ditemukan di penyimpanan.", 404);
  }
}
