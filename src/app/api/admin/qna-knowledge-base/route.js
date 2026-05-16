import { z } from "zod";
import { ROLES } from "@/lib/constants/roles";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/helpers/response";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { listPublicQna, upsertPublicQna } from "@/lib/public-chat/service";
import { writeAuditLog } from "@/lib/security/auditLog";

const schema = z.object({
  id: z.coerce.number().int().positive().optional(),
  question: z.string().trim().min(3).max(2000),
  answer: z.string().trim().min(3).max(4000),
  keywords: z.union([z.array(z.string()), z.string()]).optional().default([]),
  category: z.string().trim().max(120).optional().default("Umum"),
  isActive: z.boolean().optional().default(true)
});

export async function GET(request) {
  const { user, error } = await requireAuth([ROLES.SUPER_ADMIN], request);
  if (error) return error;
  const rateLimitError = enforceRateLimit(request, { namespace: "admin-qna", limit: 120, windowMs: 15 * 60 * 1000, key: user.username || user.id });
  if (rateLimitError) return rateLimitError;
  return ok(await listPublicQna({ activeOnly: false }));
}

export async function POST(request) {
  const { user, error } = await requireAuth([ROLES.SUPER_ADMIN], request);
  if (error) return error;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Payload QnA tidak valid.", 422, parsed.error.flatten());
  const item = await upsertPublicQna(parsed.data);
  await writeAuditLog({
    request,
    user,
    action: parsed.data.id ? "public_qna.update" : "public_qna.create",
    entityType: "public_qna_knowledge_base",
    entityId: item?.id,
    metadata: { category: parsed.data.category }
  });
  return ok(item);
}
