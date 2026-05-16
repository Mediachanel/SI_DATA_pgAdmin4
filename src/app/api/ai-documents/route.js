import { ROLES } from "@/lib/constants/roles";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/helpers/response";
import { listAiDocuments } from "@/lib/ai-documents/repository";

export const runtime = "nodejs";

function getLimit(value) {
  const limit = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(limit)) return 50;
  return Math.min(100, Math.max(1, limit));
}

export async function GET(request) {
  const { error } = await requireAuth([ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const data = await listAiDocuments({
    status: searchParams.get("status") || "",
    limit: getLimit(searchParams.get("limit"))
  });
  return ok(data);
}

export async function POST(request) {
  const { error } = await requireAuth([ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD], request);
  if (error) return error;

  return fail("AI dokumen lama dinonaktifkan. Pemrosesan AI dokumen harus dipindahkan ke n8n workflow.", 410);
}
