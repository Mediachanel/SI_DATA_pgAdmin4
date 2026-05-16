import { fail } from "@/lib/helpers/response";

export const runtime = "nodejs";

export async function GET() {
  return fail("AI Workflow Engine internal lama dinonaktifkan. Workflow AI sekarang berjalan di n8n.", 410);
}

export async function POST() {
  return fail("AI Workflow Engine internal lama dinonaktifkan. Workflow AI sekarang berjalan di n8n.", 410);
}
