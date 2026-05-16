import { requireAuth } from "@/lib/auth/requireAuth";
import { validateSameOrigin } from "@/lib/auth/requestGuards";
import { ROLES } from "@/lib/constants/roles";
import { fail, ok } from "@/lib/helpers/response";
import { extractWorkflowLogPayload, writeAiWorkflowLog } from "@/lib/n8n-ai/audit";
import { isN8nAiEnabled, normalizeUserForWorkflow } from "@/lib/n8n-ai/security";
import { normalizeWorkflowResponse } from "@/lib/n8n-ai/response";
import { callN8nWebhook, N8nWebhookError } from "@/lib/n8n-ai/webhookClient";

export const runtime = "nodejs";

export async function POST(request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const { user, error } = await requireAuth([ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD], request);
  if (error) return error;

  try {
    const body = await request.json();
    const message = String(body.message || "").trim();

    if (!message) {
      return fail("Pesan tidak boleh kosong", 400);
    }

    if (!isN8nAiEnabled()) {
      return fail("AI n8n belum aktif. Set AI_ENABLE_N8N=true.", 503);
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    const secret = process.env.N8N_API_SECRET;

    if (!webhookUrl || !secret) {
      return fail("Konfigurasi n8n belum tersedia", 500);
    }

    const workflowUser = normalizeUserForWorkflow(user);
    const { result, requestId, attempt } = await callN8nWebhook({
      webhookUrl,
      secret,
      source: "internal_chat",
      payload: {
        message,
        source: "internal_chat",
        conversation_id: body.conversation_id || body.session_id || null,
        user: workflowUser,
        client: {
          user_agent: request.headers.get("user-agent") || null
        }
      }
    });

    const normalized = normalizeWorkflowResponse(result, message);
    normalized.request_id = requestId;
    normalized.webhook_attempt = attempt;
    await writeAiWorkflowLog(extractWorkflowLogPayload({
      result: normalized,
      message,
      source: "internal_chat",
      user: workflowUser
    }));

    return ok(normalized, "AI n8n selesai memproses pesan.");
  } catch (err) {
    if (err instanceof N8nWebhookError) {
      await writeAiWorkflowLog({
        source: "internal_chat",
        message: "n8n webhook failed",
        verification: "n8n_error",
        response: err.message
      });
      return fail(err.message, err.status || 502, err.result);
    }

    console.error("AI n8n chat error:", err);
    return fail("Terjadi kesalahan AI workflow", 500);
  }
}
