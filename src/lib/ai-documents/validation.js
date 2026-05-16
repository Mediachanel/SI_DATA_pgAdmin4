const MAX_UPLOAD_BYTES = Number(process.env.AI_DOCUMENT_MAX_BYTES || 10 * 1024 * 1024);

const ALLOWED_TYPES = [
  {
    extension: ".pdf",
    mimeTypes: ["application/pdf", "application/octet-stream"],
    signatures: [Buffer.from("%PDF-", "utf8")]
  },
  {
    extension: ".png",
    mimeTypes: ["image/png", "application/octet-stream"],
    signatures: [Buffer.from([0x89, 0x50, 0x4e, 0x47])]
  },
  {
    extension: ".jpg",
    mimeTypes: ["image/jpeg", "application/octet-stream"],
    signatures: [Buffer.from([0xff, 0xd8, 0xff])]
  },
  {
    extension: ".jpeg",
    mimeTypes: ["image/jpeg", "application/octet-stream"],
    signatures: [Buffer.from([0xff, 0xd8, 0xff])]
  },
  {
    extension: ".docx",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/zip",
      "application/octet-stream"
    ],
    signatures: [Buffer.from("PK", "utf8")]
  },
  {
    extension: ".xlsx",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/zip",
      "application/octet-stream"
    ],
    signatures: [Buffer.from("PK", "utf8")]
  },
  {
    extension: ".csv",
    mimeTypes: ["text/csv", "text/plain", "application/vnd.ms-excel", "application/octet-stream"],
    signatures: []
  }
];

export function normalizeAiDocumentFileName(value) {
  const clean = String(value || "dokumen")
    .normalize("NFKD")
    .replace(/[^\w.\- ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 160);
  return clean || "dokumen";
}

export function getFileExtension(fileName) {
  const match = normalizeAiDocumentFileName(fileName).toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] || "";
}

function hasSignature(buffer, signatures) {
  if (!signatures.length) return true;
  return signatures.some((signature) => buffer.subarray(0, signature.length).equals(signature));
}

export function validateAiDocumentUpload({ fileName, contentType, size, buffer }) {
  const errors = [];
  const rawName = String(fileName || "");
  const extension = getFileExtension(fileName);
  const rule = ALLOWED_TYPES.find((item) => item.extension === extension);
  const normalizedContentType = String(contentType || "").toLowerCase();
  const normalizedName = normalizeAiDocumentFileName(fileName);

  if (!rawName.trim()) errors.push("Nama file wajib diisi.");
  if (/[\\/:\u0000]/.test(rawName) || rawName.includes("..")) {
    errors.push("Nama file mengandung karakter/path yang tidak aman.");
  }
  if (normalizedName.length > 160) errors.push("Nama file terlalu panjang.");

  if (!rule) {
    errors.push("Ekstensi file tidak didukung.");
  } else if (normalizedContentType && !rule.mimeTypes.includes(normalizedContentType)) {
    errors.push("MIME type file tidak sesuai ekstensi.");
  }

  if (!Number.isFinite(size) || size <= 0) errors.push("File kosong atau tidak dapat dibaca.");
  if (size > MAX_UPLOAD_BYTES) errors.push(`Ukuran file maksimal ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`);
  if (buffer && rule && !hasSignature(buffer, rule.signatures)) errors.push("Isi file tidak sesuai format yang diizinkan.");

  return {
    valid: errors.length === 0,
    errors,
    extension,
    safeFileName: normalizedName,
    maxBytes: MAX_UPLOAD_BYTES
  };
}

export const AI_DOCUMENT_ALLOWED_EXTENSIONS = ALLOWED_TYPES.map((rule) => rule.extension);
