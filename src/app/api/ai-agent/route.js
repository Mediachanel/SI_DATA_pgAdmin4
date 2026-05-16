import { fail } from "@/lib/helpers/response";

export const runtime = "nodejs";

export async function GET() {
  return fail("AI Agent lama dinonaktifkan. Gunakan /ai-agent yang terhubung ke /api/ai/chat via n8n.", 410);
}

export async function POST() {
  return fail("AI Agent lama dinonaktifkan. Semua AI internal wajib melewati n8n workflow.", 410);
}
