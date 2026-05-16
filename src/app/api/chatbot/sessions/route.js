import { fail } from "@/lib/helpers/response";

export const runtime = "nodejs";

export async function GET() {
  return fail("Monitoring chatbot lama dinonaktifkan karena chatbot lama sudah tidak aktif.", 410);
}
