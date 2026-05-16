import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getRequestedFieldsForSection,
  maskEmployeeProfileValue,
  normalizeEmployeeProfileSections,
  pickEmployeeProfileFields
} from "../src/lib/n8n-ai/employeeProfileTool.js";

describe("employee profile n8n tool contract", () => {
  it("expands section aliases without allowing arbitrary table names", () => {
    assert.deepEqual(normalizeEmployeeProfileSections(["pendidikan", "riwayat_jabatan", "DROP TABLE pegawai"]), [
      "riwayat_pendidikan",
      "riwayat_jabatan"
    ]);
  });

  it("returns only requested allowlisted fields for a section", () => {
    assert.deepEqual(getRequestedFieldsForSection("pegawai", { pegawai: ["nama", "nik", "password"] }), ["nama", "nik"]);
  });

  it("masks sensitive identifiers while preserving requested non-sensitive fields", () => {
    const picked = pickEmployeeProfileFields(
      { nama: "Siti Aminah", nik: "3171012345678901", nip: "198001012006042001", nama_ukpd: "Puskesmas A" },
      ["nama", "nik", "nip", "nama_ukpd"]
    );

    assert.equal(picked.nama, "Siti Aminah");
    assert.equal(picked.nama_ukpd, "Puskesmas A");
    assert.equal(picked.nik, "317****901");
    assert.equal(picked.nip, "198****001");
    assert.equal(maskEmployeeProfileValue("no_hp_pegawai", "081234567890"), "081****890");
  });
});
