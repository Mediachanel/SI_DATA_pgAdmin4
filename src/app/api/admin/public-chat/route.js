import { fail } from "@/lib/helpers/response";

export const runtime = "nodejs";

export async function GET() {
  return fail("Monitoring public chat lama dinonaktifkan. Audit n8n dicatat di ai_workflow_logs.", 410);
}
