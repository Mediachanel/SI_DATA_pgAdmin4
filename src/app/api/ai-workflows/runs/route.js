import { fail } from "@/lib/helpers/response";

export const runtime = "nodejs";

export async function GET() {
  return fail("Audit run AI Workflow Engine lama dinonaktifkan. Gunakan ai_workflow_logs untuk audit n8n.", 410);
}
