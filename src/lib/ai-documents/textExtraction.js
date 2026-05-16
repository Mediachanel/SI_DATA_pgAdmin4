import JSZip from "jszip";

const MAX_TEXT_LENGTH = 12_000;

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

function extractPdfText(buffer) {
  const text = buffer.toString("latin1")
    .replace(/\\[nr]/g, "\n")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, " ");
  return cleanText(text);
}

async function extractDocxText(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) return "";
  return cleanText(documentXml.replace(/<\/w:p>/g, "\n").replace(/<w:tab\/>/g, " "));
}

async function extractXlsxText(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const sharedXml = await zip.file("xl/sharedStrings.xml")?.async("string");
  if (!sharedXml) return "";
  return cleanText(sharedXml.replace(/<\/si>/g, "\n"));
}

function extractCsvText(buffer) {
  return cleanText(buffer.toString("utf8"));
}

export async function extractAiDocumentText({ buffer, extension }) {
  try {
    if (extension === ".pdf") return { text: extractPdfText(buffer), method: "pdf_raw_text" };
    if (extension === ".docx") return { text: await extractDocxText(buffer), method: "docx_xml_text" };
    if (extension === ".xlsx") return { text: await extractXlsxText(buffer), method: "xlsx_shared_strings" };
    if (extension === ".csv") return { text: extractCsvText(buffer), method: "csv_text" };
    if ([".png", ".jpg", ".jpeg"].includes(extension)) return { text: "", method: "ocr_not_configured" };
  } catch (error) {
    return { text: "", method: "extract_failed", error: error.message };
  }
  return { text: "", method: "unsupported" };
}
