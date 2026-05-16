import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyAiDocumentMock } from "../src/lib/ai-documents/classifier.js";
import {
  AI_DOCUMENT_ALLOWED_EXTENSIONS,
  normalizeAiDocumentFileName,
  validateAiDocumentUpload
} from "../src/lib/ai-documents/validation.js";

describe("AI document upload validation", () => {
  it("accepts a valid PDF signature and sanitizes the original name", () => {
    const buffer = Buffer.from("%PDF-1.7\nphase2");
    const result = validateAiDocumentUpload({
      fileName: "DRH Pegawai <test>.pdf",
      contentType: "application/pdf",
      size: buffer.length,
      buffer
    });

    assert.equal(result.valid, true);
    assert.equal(result.extension, ".pdf");
    assert.equal(normalizeAiDocumentFileName("DRH Pegawai <test>.pdf"), "DRH-Pegawai-test.pdf");
  });

  it("rejects mismatched extension, MIME, and content signature", () => {
    const result = validateAiDocumentUpload({
      fileName: "pegawai.pdf",
      contentType: "image/png",
      size: 12,
      buffer: Buffer.from("not a pdf")
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes("MIME type file tidak sesuai ekstensi."));
    assert.ok(result.errors.includes("Isi file tidak sesuai format yang diizinkan."));
  });

  it("keeps the allowed extension list explicit", () => {
    assert.deepEqual(AI_DOCUMENT_ALLOWED_EXTENSIONS, [".pdf", ".png", ".jpg", ".jpeg", ".docx", ".xlsx", ".csv"]);
  });
});

describe("AI document mock classifier", () => {
  it("routes DRH files into review-only classification output", () => {
    const result = classifyAiDocumentMock({
      fileName: "drh-pegawai.pdf",
      extension: ".pdf",
      sizeBytes: 120,
      sha256: "a".repeat(64)
    });

    assert.equal(result.label, "drh_pegawai");
    assert.equal(result.extracted.needsHumanReview, true);
    assert.equal(result.provider, "mock");
  });
});
