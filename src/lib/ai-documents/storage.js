import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { normalizeAiDocumentFileName } from "./validation";

function storageRoot() {
  return path.resolve(process.env.STORAGE_LOCAL_PATH || path.join(process.cwd(), "storage"), "ai-documents");
}

function dateParts(date = new Date()) {
  return [String(date.getFullYear()), String(date.getMonth() + 1).padStart(2, "0")];
}

export function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function saveAiDocumentFile({ fileName, extension, buffer }) {
  const [year, month] = dateParts();
  const root = storageRoot();
  const directory = path.join(root, year, month);
  const safeOriginalName = normalizeAiDocumentFileName(fileName);
  const storedFilename = `${Date.now()}-${crypto.randomUUID()}${extension || ""}`;
  const fullPath = path.join(directory, storedFilename);

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(fullPath, buffer, { flag: "wx" });

  return {
    originalFilename: safeOriginalName,
    storedFilename,
    storagePath: path.relative(process.cwd(), fullPath),
    sha256: sha256Buffer(buffer)
  };
}
