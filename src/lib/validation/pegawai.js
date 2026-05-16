import { z } from "zod";

const nullableText = z.string().trim().max(255).optional().or(z.literal(""));

export const pegawaiPayloadSchema = z.object({
  nama: z.string().trim().min(3).max(180),
  nama_ukpd: z.string().trim().min(3).max(220),
  jenis_pegawai: z.string().trim().min(2).max(80),
  nip: nullableText,
  nrk: nullableText,
  nik: nullableText,
  email: z.string().trim().email().max(180).optional().or(z.literal("")),
  jenis_kelamin: nullableText,
  kondisi: nullableText,
  alamat: z.unknown().optional(),
  pasangan: z.unknown().optional(),
  anak: z.unknown().optional(),
  keluarga: z.unknown().optional(),
  riwayat_pendidikan: z.unknown().optional(),
  riwayat_jabatan: z.unknown().optional(),
  riwayat_gaji_pokok: z.unknown().optional(),
  riwayat_pangkat: z.unknown().optional(),
  riwayat_penghargaan: z.unknown().optional(),
  riwayat_skp: z.unknown().optional(),
  riwayat_hukuman_disiplin: z.unknown().optional(),
  riwayat_prestasi_pendidikan: z.unknown().optional(),
  riwayat_narasumber: z.unknown().optional(),
  riwayat_kegiatan_strategis: z.unknown().optional(),
  riwayat_keberhasilan: z.unknown().optional()
}).passthrough();

export function parsePositiveId(value) {
  const id = Number.parseInt(String(value || ""), 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function sanitizeText(value) {
  return String(value)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>]/g, "")
    .trim();
}

export function sanitizeNestedText(value) {
  if (typeof value === "string") return sanitizeText(value);
  if (Array.isArray(value)) return value.map(sanitizeNestedText);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, sanitizeNestedText(item)])
  );
}

export function sanitizePegawaiPayload(payload) {
  return sanitizeNestedText(payload);
}
