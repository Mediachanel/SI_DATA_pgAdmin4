import { fail } from "@/lib/helpers/response";

export const runtime = "nodejs";

export async function PATCH() {
  return fail("AI Agent approval lama dinonaktifkan. Semua AI internal wajib melewati n8n workflow.", 410);
}
