const DOCUMENT_LABELS = {
  ".pdf": "dokumen_pdf",
  ".docx": "dokumen_word",
  ".xlsx": "spreadsheet_pegawai",
  ".csv": "data_tabular",
  ".png": "gambar_dokumen",
  ".jpg": "gambar_dokumen",
  ".jpeg": "gambar_dokumen"
};

function normalizeNameFromFilename(fileName) {
  return String(fileName || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/\b(drh|pegawai|mutasi|putus|jf|data|phase\d+)\b/gi, " ")
    .replace(/[_\-]+/g, " ")
    .replace(/\b\d{6,}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMetadataFromFilename(fileName) {
  const text = String(fileName || "");
  const nip = text.match(/\b(19|20)\d{16}\b/)?.[0] || "";
  const nrk = text.match(/\b\d{5,6}\b/)?.[0] || "";
  const name = normalizeNameFromFilename(text);
  return {
    nama: name || "",
    nip,
    nrk
  };
}

export function classifyAiDocumentMock({ fileName, extension, sizeBytes, sha256 }) {
  const lowerName = String(fileName || "").toLowerCase();
  let label = DOCUMENT_LABELS[extension] || "dokumen_lain";
  const hints = [];

  if (lowerName.includes("drh")) {
    label = "drh_pegawai";
    hints.push("Nama file mengandung DRH.");
  }
  if (lowerName.includes("pegawai") || lowerName.includes("sdm")) {
    label = extension === ".xlsx" || extension === ".csv" ? "data_pegawai" : label;
    hints.push("Nama file mengandung kata pegawai/SDM.");
  }
  if (lowerName.includes("mutasi")) {
    label = "dokumen_usulan_mutasi";
    hints.push("Nama file mengandung mutasi.");
  }
  if (lowerName.includes("putus") || lowerName.includes("jf")) {
    label = "dokumen_usulan_putus_jf";
    hints.push("Nama file mengandung putus/JF.");
  }

  const confidence = hints.length ? 0.82 : 0.62;
  return {
    label,
    confidence,
    status: "classified",
    provider: "mock",
    model: "phase2-mock-classifier",
    sha256,
    sizeBytes,
    hints,
    extracted: {
      needsHumanReview: true,
      summary: "Klasifikasi awal Phase 2. Hasil wajib direview admin sebelum dipakai.",
      candidateFields: extractMetadataFromFilename(fileName)
    }
  };
}
