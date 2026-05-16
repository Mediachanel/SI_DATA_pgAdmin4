import { z } from "zod";
import { ROLES } from "@/lib/constants/roles";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/helpers/response";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { writeAuditLog } from "@/lib/security/auditLog";
import { reviewAiDocument } from "@/lib/ai-documents/repository";
import { parsePositiveId } from "@/lib/validation/pegawai";

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject", "correct"]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  correction: z.record(z.unknown()).optional()
});

function reviewAction(decision) {
  if (decision === "approve") return "ai_document.approve";
  if (decision === "correct") return "ai_document.correct";
  return "ai_document.reject";
}

export async function PATCH(request, { params }) {
  const { user, error } = await requireAuth([ROLES.SUPER_ADMIN], request);
  if (error) return error;
  const rateLimitError = enforceRateLimit(request, {
    namespace: "ai-document-review",
    limit: 60,
    windowMs: 15 * 60 * 1000,
    key: user.username || user.id
  });
  if (rateLimitError) return rateLimitError;

  const { id: rawId } = await params;
  const id = parsePositiveId(rawId);
  if (!id) return fail("ID dokumen AI tidak valid.", 400);

  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return fail("Payload review dokumen AI tidak valid.", 422, parsed.error.flatten());

  const reviewed = await reviewAiDocument({
    id,
    decision: parsed.data.decision,
    notes: parsed.data.notes || "",
    correctionPayload: parsed.data.correction || {},
    user
  });
  if (!reviewed) return fail("Dokumen AI tidak ditemukan.", 404);

  await writeAuditLog({
    request,
    user,
    action: reviewAction(parsed.data.decision),
    entityType: "ai_document",
    entityId: id,
    metadata: {
      notes: parsed.data.notes || "",
      hasCorrection: Boolean(parsed.data.correction),
      applyResult: reviewed.applyResult || null
    }
  });

  return ok(reviewed, "Review dokumen AI berhasil disimpan.");
}
