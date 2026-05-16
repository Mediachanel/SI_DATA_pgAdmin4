import { fail } from "@/lib/helpers/response";

export const runtime = "nodejs";

export async function POST() {
  return fail("Endpoint AI lama dinonaktifkan. Gunakan /api/ai/chat melalui n8n workflow.", 410);
}
