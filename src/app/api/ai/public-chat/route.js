import { validateSameOrigin } from "@/lib/auth/requestGuards";
import { fail, ok } from "@/lib/helpers/response";
import { extractWorkflowLogPayload, writeAiWorkflowLog } from "@/lib/n8n-ai/audit";
import { isN8nAiEnabled } from "@/lib/n8n-ai/security";
import { normalizeWorkflowResponse } from "@/lib/n8n-ai/response";
import { callN8nWebhook, N8nWebhookError } from "@/lib/n8n-ai/webhookClient";

export const runtime = "nodejs";

export async function POST(request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  try {
    const body = await request.json();
    const message = String(body.message || "").trim();

    if (!message) {
      return fail("Pesan tidak boleh kosong", 400);
    }

    if (!isN8nAiEnabled()) {
      return fail("AI n8n belum aktif. Set AI_ENABLE_N8N=true.", 503);
    }

    const webhookUrl = process.env.N8N_PUBLIC_WEBHOOK_URL;
    const secret = process.env.N8N_API_SECRET;

    if (!webhookUrl || !secret) {
      return fail("Konfigurasi n8n public belum tersedia", 500);
    }

    const { result, requestId, attempt } = await callN8nWebhook({
      webhookUrl,
      secret,
      source: "public_chat",
      payload: {
        message,
        source: "public_chat",
        conversation_id: body.conversation_id || body.session_id || null,
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
      source: "public_chat"
    }));

    return ok(normalized, "Public AI n8n selesai memproses pesan.");
  } catch (error) {
    if (error instanceof N8nWebhookError) {
      await writeAiWorkflowLog({
        source: "public_chat",
        message: "n8n webhook failed",
        verification: "n8n_error",
        response: error.message
      });
      return fail(error.message, error.status || 502, error.result);
    }

    console.error("AI n8n public chat error:", error);
    return fail("Public chat gagal diproses", 500);
  }
}
