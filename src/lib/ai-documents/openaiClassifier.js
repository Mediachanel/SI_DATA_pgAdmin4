import { classifyAiDocumentMock } from "./classifier.js";
import { assertOpenAiSafe } from "../security/contentSafety.js";

function shouldUseOpenAi() {
  return Boolean(process.env.OPENAI_API_KEY && process.env.AI_DOCUMENT_CLASSIFIER_PROVIDER === "openai");
}

function parseJsonText(text) {
  if (!text) return null;
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  try {
    return JSON.parse(fenced || trimmed);
  } catch {
    return null;
  }
}

function getOutputText(response) {
  if (typeof response?.output_text === "string") return response.output_text;
  const parts = [];
  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n");
}

function normalizeOpenAiResult(parsed, fallback, meta) {
  const label = String(parsed?.label || fallback.label || "dokumen_lain").slice(0, 80);
  const confidence = Number(parsed?.confidence);
  return {
    ...fallback,
    provider: "openai",
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    label,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : fallback.confidence,
    status: "classified",
    extracted: {
      needsHumanReview: true,
      summary: String(parsed?.summary || fallback.extracted?.summary || "").slice(0, 500),
      candidateFields: {
        ...(fallback.extracted?.candidateFields || {}),
        ...(parsed?.candidateFields && typeof parsed.candidateFields === "object" ? parsed.candidateFields : {})
      },
      source: "openai_metadata_only"
    },
    openai: {
      metadataOnly: true,
      requestFileName: meta.fileName
    }
  };
}

export async function classifyAiDocument({ fileName, extension, sizeBytes, sha256, extractedText = "" }) {
  const fallback = classifyAiDocumentMock({ fileName, extension, sizeBytes, sha256 });
  if (!shouldUseOpenAi()) return fallback;

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const safeText = String(extractedText || "").slice(0, 6000);
  try {
    assertOpenAiSafe({ fileName, extension, safeText }, { allowPersonalData: false });
  } catch (error) {
    return {
      ...fallback,
      openaiSkipped: true,
      openaiSkipReason: error.message
    };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({ fileName, extension, sizeBytes, sha256, textPreview: safeText })
            }
          ]
        }
      ],
      instructions: [
        "Klasifikasikan dokumen HRIS SI SDMK dari metadata dan cuplikan teks aman.",
        "Jangan mengarang field yang tidak terlihat dari input.",
        "Balas JSON valid: {\"label\":\"...\",\"confidence\":0.0,\"summary\":\"...\",\"candidateFields\":{\"nama\":\"\",\"nip\":\"\",\"nrk\":\"\"}}.",
        "Semua hasil wajib dianggap draft dan butuh review admin."
      ].join(" ")
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    return {
      ...fallback,
      openaiError: errorText.slice(0, 500)
    };
  }

  const payload = await response.json();
  const parsed = parseJsonText(getOutputText(payload));
  if (!parsed) return fallback;
  return normalizeOpenAiResult(parsed, fallback, { fileName });
}
