function numberEnv(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJson(text) {
  if (!String(text || "").trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function requestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class N8nWebhookError extends Error {
  constructor(message, { status = 500, result = null, attempt = 0 } = {}) {
    super(message);
    this.name = "N8nWebhookError";
    this.status = status;
    this.result = result;
    this.attempt = attempt;
  }
}

export function getN8nWebhookSettings() {
  return {
    timeoutMs: numberEnv("N8N_WEBHOOK_TIMEOUT_MS", 20000, { min: 1000, max: 120000 }),
    retries: numberEnv("N8N_WEBHOOK_RETRIES", 1, { min: 0, max: 3 })
  };
}

export async function callN8nWebhook({ webhookUrl, secret, payload, source }) {
  const { timeoutMs, retries } = getN8nWebhookSettings();
  const attempts = retries + 1;
  const id = payload?.request_id || requestId();
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-ai-secret": secret,
          "x-request-id": id,
          "x-ai-source": source || payload?.source || "unknown"
        },
        body: JSON.stringify({
          ...payload,
          request_id: id,
          attempt,
          timeout_ms: timeoutMs
        })
      });

      const raw = await response.text();
      const result = parseJson(raw);
      if (raw.trim() && !result) {
        throw new N8nWebhookError("Workflow n8n harus mengembalikan JSON valid.", {
          status: 502,
          attempt
        });
      }

      if (!response.ok) {
        throw new N8nWebhookError("Workflow n8n gagal diproses.", {
          status: response.status,
          result,
          attempt
        });
      }

      if (!result) {
        throw new N8nWebhookError("Workflow n8n belum mengembalikan response JSON.", {
          status: 502,
          attempt
        });
      }

      return { result, requestId: id, attempt };
    } catch (error) {
      lastError = error;
      const retryable = error.name === "AbortError" || error.status >= 500 || !error.status;
      if (!retryable || attempt >= attempts) break;
      await sleep(250 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError?.name === "AbortError") {
    throw new N8nWebhookError("Workflow n8n timeout.", { status: 504, attempt: attempts });
  }

  if (lastError instanceof N8nWebhookError) throw lastError;
  throw new N8nWebhookError(lastError?.message || "Workflow n8n gagal diproses.", {
    status: lastError?.status || 500,
    result: lastError?.result || null,
    attempt: attempts
  });
}
