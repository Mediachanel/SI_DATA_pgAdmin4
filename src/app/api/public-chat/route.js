import { fail } from "@/lib/helpers/response";

export const runtime = "nodejs";

export async function POST() {
  return fail("Endpoint public chat lama dinonaktifkan. Gunakan /api/ai/public-chat melalui n8n workflow.", 410);
}
