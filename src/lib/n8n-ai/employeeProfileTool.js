export const EMPLOYEE_PROFILE_SECTION_CONFIG = {
  pegawai: {
    table: "pegawai",
    defaultFields: ["nama", "jenis_pegawai", "nama_ukpd", "wilayah", "nama_jabatan_menpan", "pangkat_golongan", "kondisi"],
    fields: [
      "id_pegawai",
      "nama",
      "jenis_kelamin",
      "tempat_lahir",
      "tanggal_lahir",
      "nik",
      "agama",
      "nama_ukpd",
      "jenis_ukpd",
      "wilayah",
      "jenis_pegawai",
      "status_rumpun",
      "jenis_kontrak",
      "nrk",
      "nip",
      "nama_jabatan_orb",
      "nama_jabatan_menpan",
      "struktur_atasan_langsung",
      "pangkat_golongan",
      "tmt_pangkat_terakhir",
      "jenjang_pendidikan",
      "program_studi",
      "nama_universitas",
      "no_hp_pegawai",
      "email",
      "no_bpjs",
      "kondisi",
      "status_perkawinan",
      "gelar_depan",
      "gelar_belakang",
      "tmt_kerja_ukpd",
      "created_at",
      "id_ukpd",
      "ukpd_id"
    ]
  },
  alamat: {
    table: "alamat",
    defaultFields: ["tipe", "alamat_lengkap"],
    fields: ["tipe", "jalan", "kelurahan", "kecamatan", "kota_kabupaten", "provinsi", "kode_provinsi", "kode_kota_kab", "kode_kecamatan", "kode_kelurahan", "alamat_lengkap"],
    orderBy: "CASE WHEN LOWER(`tipe`) = 'ktp' THEN 0 WHEN LOWER(`tipe`) = 'domisili' THEN 1 ELSE 2 END, `id` ASC"
  },
  keluarga: {
    table: "keluarga",
    defaultFields: ["hubungan", "hubungan_detail", "nama", "jenis_kelamin", "tanggal_lahir", "pekerjaan"],
    fields: ["hubungan", "hubungan_detail", "status_punya", "status_tunjangan", "urutan", "nama", "jenis_kelamin", "tempat_lahir", "tanggal_lahir", "no_tlp", "email", "pekerjaan"],
    orderBy: "CASE WHEN `sumber_tabel` = 'drh_pdf_keluarga' THEN 0 ELSE 1 END, `hubungan` ASC, `urutan` ASC, `id` ASC"
  },
  riwayat_pendidikan: {
    table: "riwayat_pendidikan",
    defaultFields: ["jenis_riwayat", "jenjang_pendidikan", "program_studi", "nama_institusi", "nama_universitas", "tahun_lulus"],
    fields: ["jenis_riwayat", "jenjang_pendidikan", "program_studi", "nama_institusi", "nama_universitas", "kota_institusi", "tahun_lulus", "nomor_ijazah", "tanggal_ijazah", "keterangan"],
    orderBy: "COALESCE(`tanggal_ijazah`, `tahun_lulus`, '') DESC, `id` DESC"
  },
  riwayat_jabatan: {
    table: "riwayat_jabatan",
    defaultFields: ["jenis_jabatan", "nama_jabatan_menpan", "nama_jabatan_orb", "nama_ukpd", "wilayah", "tmt_jabatan"],
    fields: ["jenis_jabatan", "lokasi", "nama_jabatan_orb", "nama_jabatan_menpan", "struktur_atasan_langsung", "nama_ukpd", "wilayah", "jenis_pegawai", "status_rumpun", "pangkat_golongan", "eselon", "tmt_jabatan", "nomor_sk", "tanggal_sk", "keterangan"],
    orderBy: "COALESCE(`tmt_jabatan`, `tanggal_sk`, '') DESC, `id` DESC"
  },
  riwayat_gaji_pokok: {
    table: "riwayat_gaji_pokok",
    defaultFields: ["tmt_gaji", "pangkat_golongan", "gaji_pokok"],
    fields: ["tmt_gaji", "pangkat_golongan", "gaji_pokok", "nomor_sk", "tanggal_sk", "keterangan"],
    orderBy: "COALESCE(`tmt_gaji`, `tanggal_sk`, '') DESC, `id` DESC"
  },
  riwayat_pangkat: {
    table: "riwayat_pangkat",
    defaultFields: ["pangkat_golongan", "tmt_pangkat", "lokasi"],
    fields: ["pangkat_golongan", "tmt_pangkat", "lokasi", "nomor_sk", "tanggal_sk", "keterangan"],
    orderBy: "COALESCE(`tmt_pangkat`, `tanggal_sk`, '') DESC, `id` DESC"
  },
  riwayat_penghargaan: {
    table: "riwayat_penghargaan",
    defaultFields: ["nama_penghargaan", "asal_penghargaan", "tanggal_sk"],
    fields: ["nama_penghargaan", "asal_penghargaan", "nomor_sk", "tanggal_sk", "keterangan"],
    orderBy: "COALESCE(`tanggal_sk`, '') DESC, `id` DESC"
  },
  riwayat_skp: {
    table: "riwayat_skp",
    defaultFields: ["tahun", "nilai_skp", "nilai_perilaku", "nilai_prestasi"],
    fields: ["tahun", "nilai_skp", "nilai_perilaku", "nilai_prestasi", "keterangan_prestasi", "keterangan"],
    orderBy: "COALESCE(`tahun`, '') DESC, `id` DESC"
  },
  riwayat_hukuman_disiplin: {
    table: "riwayat_hukuman_disiplin",
    defaultFields: ["tanggal_mulai", "tanggal_akhir", "hukuman_disiplin"],
    fields: ["tanggal_mulai", "tanggal_akhir", "hukuman_disiplin", "nomor_sk", "tanggal_sk", "keterangan"],
    orderBy: "COALESCE(`tanggal_mulai`, `tanggal_sk`, '') DESC, `id` DESC"
  },
  riwayat_prestasi_pendidikan: {
    table: "riwayat_prestasi_pendidikan",
    defaultFields: ["kategori", "jenjang_pendidikan", "prestasi"],
    fields: ["kategori", "jenjang_pendidikan", "prestasi"],
    orderBy: "`id` DESC"
  },
  riwayat_narasumber: {
    table: "riwayat_narasumber",
    defaultFields: ["kegiatan", "judul_materi", "lembaga_penyelenggara"],
    fields: ["kegiatan", "judul_materi", "lembaga_penyelenggara"],
    orderBy: "`id` DESC"
  },
  riwayat_kegiatan_strategis: {
    table: "riwayat_kegiatan_strategis",
    defaultFields: ["kegiatan", "tahun_anggaran", "kedudukan_dalam_kegiatan"],
    fields: ["kegiatan", "tahun_anggaran", "jumlah_anggaran", "kedudukan_dalam_kegiatan"],
    orderBy: "COALESCE(`tahun_anggaran`, '') DESC, `id` DESC"
  },
  riwayat_keberhasilan: {
    table: "riwayat_keberhasilan",
    defaultFields: ["jabatan", "tahun", "keberhasilan"],
    fields: ["jabatan", "tahun", "keberhasilan", "kendala_yang_dihadapi", "solusi_yang_dilakukan"],
    orderBy: "COALESCE(`tahun`, '') DESC, `id` DESC"
  },
  usulan_mutasi: {
    table: "usulan_mutasi",
    defaultFields: ["tanggal_usulan", "status", "jenis_mutasi", "ukpd_tujuan", "jabatan_baru", "alasan"],
    fields: ["tanggal_usulan", "status", "nama_ukpd", "ukpd_tujuan", "jabatan", "jabatan_baru", "pangkat_golongan", "jenis_mutasi", "keterangan", "alasan", "created_by_ukpd"],
    orderBy: "COALESCE(`tanggal_usulan`, `created_at`) DESC, `id` DESC",
    match: "identity"
  },
  usulan_pjf_stop: {
    table: "usulan_pjf_stop",
    defaultFields: ["tanggal_usulan", "status", "jabatan", "jabatan_baru", "alasan_pemutusan"],
    fields: ["tanggal_usulan", "status", "nama_ukpd", "jabatan", "jabatan_baru", "angka_kredit", "nomor_surat", "tanggal_surat", "hal", "pimpinan", "asal_surat", "keterangan", "alasan_pemutusan", "created_by_ukpd"],
    orderBy: "COALESCE(`tanggal_usulan`, `created_at`) DESC, `id` DESC",
    match: "identity"
  }
};

export const EMPLOYEE_PROFILE_RIWAYAT_SECTIONS = [
  "riwayat_pendidikan",
  "riwayat_jabatan",
  "riwayat_gaji_pokok",
  "riwayat_pangkat",
  "riwayat_penghargaan",
  "riwayat_skp",
  "riwayat_hukuman_disiplin",
  "riwayat_prestasi_pendidikan",
  "riwayat_narasumber",
  "riwayat_kegiatan_strategis",
  "riwayat_keberhasilan"
];

const DEFAULT_SECTIONS = ["pegawai"];
const ALL_SECTIONS = Object.keys(EMPLOYEE_PROFILE_SECTION_CONFIG);
const SENSITIVE_FIELDS = new Set(["nik", "nip", "nrk", "no_hp_pegawai", "no_bpjs", "no_tlp"]);
const SECTION_ALIASES = {
  identitas: "pegawai",
  profil: "pegawai",
  biodata: "pegawai",
  kepegawaian: "pegawai",
  jabatan: "riwayat_jabatan",
  pendidikan: "riwayat_pendidikan",
  pangkat: "riwayat_pangkat",
  gaji: "riwayat_gaji_pokok",
  skp: "riwayat_skp",
  disiplin: "riwayat_hukuman_disiplin",
  penghargaan: "riwayat_penghargaan",
  mutasi: "usulan_mutasi",
  putus_jf: "usulan_pjf_stop",
  pjf_stop: "usulan_pjf_stop"
};

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function normalizeSectionName(section) {
  const key = String(section || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return SECTION_ALIASES[key] || key;
}

export function normalizeEmployeeProfileSections(sectionsInput, fieldsInput = {}) {
  const fromFields = fieldsInput && typeof fieldsInput === "object" && !Array.isArray(fieldsInput)
    ? Object.keys(fieldsInput)
    : [];
  const raw = [...asArray(sectionsInput), ...fromFields];
  const normalized = raw.length ? raw.map(normalizeSectionName) : DEFAULT_SECTIONS;
  const expanded = normalized.flatMap((section) => {
    if (section === "all") return ALL_SECTIONS;
    if (section === "riwayat" || section === "semua_riwayat") return EMPLOYEE_PROFILE_RIWAYAT_SECTIONS;
    if (section === "usulan") return ["usulan_mutasi", "usulan_pjf_stop"];
    return section;
  });
  return [...new Set(expanded)].filter((section) => EMPLOYEE_PROFILE_SECTION_CONFIG[section]);
}

export function getRequestedFieldsForSection(section, fieldsInput = {}) {
  const config = EMPLOYEE_PROFILE_SECTION_CONFIG[section];
  if (!config) return [];

  const directFields = Array.isArray(fieldsInput) ? fieldsInput : fieldsInput?.[section];
  const normalizedFields = asArray(directFields).map((field) => String(field).trim()).filter(Boolean);
  const requested = normalizedFields.length ? normalizedFields : config.defaultFields;
  const allowed = new Set(config.fields);

  return requested.filter((field) => allowed.has(field));
}

function maskIdentifier(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.length <= 6) return "***";
  return `${raw.slice(0, 3)}****${raw.slice(-3)}`;
}

function toDateString(value) {
  if (!value || typeof value !== "object" || !("toISOString" in value)) return value;
  return value.toISOString().slice(0, 10);
}

export function maskEmployeeProfileValue(field, value) {
  if (value === undefined || value === null || value === "") return value ?? null;
  if (SENSITIVE_FIELDS.has(field)) return maskIdentifier(value);
  return toDateString(value);
}

export function pickEmployeeProfileFields(row = {}, fields = []) {
  return Object.fromEntries(fields.map((field) => [field, maskEmployeeProfileValue(field, row[field])]));
}

export function availableEmployeeProfileSections() {
  return ALL_SECTIONS.map((section) => ({
    section,
    fields: EMPLOYEE_PROFILE_SECTION_CONFIG[section].fields
  }));
}
