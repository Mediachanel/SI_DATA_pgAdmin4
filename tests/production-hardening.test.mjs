import assert from "node:assert/strict";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { inspectContentSafety } from "../src/lib/security/contentSafety.js";
import { validateAiDocumentUpload } from "../src/lib/ai-documents/validation.js";
import { extractAiDocumentText } from "../src/lib/ai-documents/textExtraction.js";

describe("production hardening content safety", () => {
  it("blocks raw SQL and secret-like prompts before OpenAI calls", () => {
    assert.equal(inspectContentSafety("DROP TABLE pegawai").allowed, false);
    assert.equal(inspectContentSafety("gunakan API key berikut").category, "unsafe_instruction");
  });

  it("blocks personal data unless explicitly allowed for local-only tools", () => {
    assert.equal(inspectContentSafety("NIP 199901012026010001").allowed, false);
    assert.equal(inspectContentSafety("NIP 199901012026010001", { allowPersonalData: true }).allowed, true);
  });
});

describe("production hardening upload validation", () => {
  it("rejects path traversal and unsafe filenames", () => {
    const pdf = Buffer.from("%PDF-1.7\n", "utf8");
    const result = validateAiDocumentUpload({
      fileName: "../pegawai.pdf",
      contentType: "application/pdf",
      size: pdf.length,
      buffer: pdf
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((item) => item.includes("tidak aman")));
  });
});

describe("production hardening document text extraction", () => {
  it("extracts text from docx XML without executing document content", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", "<w:document><w:body><w:p><w:t>SK Mutasi Pegawai</w:t></w:p></w:body></w:document>");
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const result = await extractAiDocumentText({ buffer, extension: ".docx" });
    assert.equal(result.method, "docx_xml_text");
    assert.match(result.text, /SK Mutasi Pegawai/);
  });
});
