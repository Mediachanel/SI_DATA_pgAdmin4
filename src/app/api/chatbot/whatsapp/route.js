import { fail } from "@/lib/helpers/response";

export const runtime = "nodejs";

export async function GET() {
  return fail("Webhook chatbot lama dinonaktifkan. Semua AI/chatbot wajib melewati n8n workflow.", 410);
}

export async function POST() {
  return fail("Webhook chatbot lama dinonaktifkan. Semua AI/chatbot wajib melewati n8n workflow.", 410);
}
