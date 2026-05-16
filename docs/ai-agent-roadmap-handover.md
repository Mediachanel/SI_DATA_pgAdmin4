# Handover Pengembangan HRIS AI Agent SI SDMK

Tanggal dibuat: 2026-05-11
Branch kerja: `feature/ai-agent-roadmap`
Backup sebelum Phase 1: `backup/pre-ai-agent-roadmap-phase1-2026-05-11`

## Tujuan Kegiatan

Mengembangkan aplikasi SI SDMK secara bertahap menjadi sistem HRIS modern dengan AI Agent, tanpa membongkar project sekaligus dan tanpa menghapus fitur lama yang masih dipakai.

Roadmap besar:

- Phase 1: Core SI SDMK, RBAC, audit log, validasi, migration, seed, test dasar.
- Phase 2: AI File Classification dan review queue.
- Phase 3: WhatsApp chatbot resmi berbasis WhatsApp Business Cloud API.
- Phase 4: AI Agent enterprise dengan tool resmi, permission check, approval workflow, dan audit penuh.

Status saat ini: Phase 3 irisan awal juga sudah dibuat dan diverifikasi pada 2026-05-14. Phase 1 stabil, Phase 2 backend/UI review queue tersedia, dan Phase 3 sudah punya webhook WhatsApp Cloud API, penyimpanan percakapan, intent awal, guardrail privasi, serta dashboard monitoring chat.

## Audit Struktur Project

Project saat ini memakai:

- Frontend: Next.js App Router, React, Tailwind CSS.
- Backend: Next.js API Routes di `src/app/api`.
- Database: PostgreSQL.
- Data access: masih memakai `pg` melalui compatibility layer `src/lib/db/postgres.js`.
- Auth: JWT HttpOnly cookie `sdm_session`.
- RBAC: sudah ada di middleware/API/sidebar, lalu mulai dipusatkan di Phase 1.
- Docker/CasaOS: sudah tersedia `Dockerfile`, `docker-compose.yml`, dan `docker-compose.casaos.yml`.

Catatan penting:

- Prisma belum menjadi runtime ORM aktif sebelum Phase 1.
- Migration Prisma/PostgreSQL baseline baru mulai disiapkan di Phase 1.
- Banyak perubahan lama di folder `proposal/visual-menu`, file `.docx`, dan file Excel sudah ada sebelum kegiatan Phase 1 ini. Jangan dianggap sebagai perubahan Phase 1.

## Perubahan Phase 1 Yang Sudah Dibuat

File baru:

- `docs/phase-1-audit.md`
- `docs/ai-agent-roadmap-handover.md`
- `prisma/schema.prisma`
- `prisma/migrations/202605110001_phase1_core_rbac_audit/migration.sql`
- `scripts/seed-phase1-rbac.mjs`
- `src/lib/auth/passwordVerifier.js`
- `src/lib/rbac/scope.js`
- `src/lib/validation/pegawai.js`
- `tests/auth-rbac.test.mjs`

File yang diubah:

- `.env.example`
- `.env.local.example`
- `.env.casaos.example`
- `README.md`
- `docker-compose.yml`
- `docker-compose.casaos.yml`
- `package.json`
- `src/app/api/pegawai/route.js`
- `src/app/api/pegawai/[id]/route.js`
- `src/lib/auth/access.js`
- `src/lib/auth/passwords.js`
- `src/lib/security/auditLog.js`

Isi perubahan utama:

- RBAC pegawai dipusatkan di `src/lib/rbac/scope.js`.
- Validasi dan sanitasi payload pegawai ditambahkan di `src/lib/validation/pegawai.js`.
- ID pegawai pada route detail/update/delete divalidasi eksplisit.
- Audit log database disiapkan untuk aksi pegawai dan security event.
- Migration PostgreSQL/Prisma baseline menambahkan tabel `roles`, `app_users`, dan `audit_logs`.
- Seed role dan Super Admin dibuat lewat env variable, bukan hardcode.
- Login mencoba `app_users` lebih dulu jika migration sudah dijalankan, lalu fallback ke tabel lama `ukpd`.
- Env example diperluas untuk roadmap: `DATABASE_URL`, `OPENAI_API_KEY`, WhatsApp token, storage, `APP_URL`, `JWT_SECRET`/`NEXTAUTH_SECRET`.
- Test minimal auth dan RBAC ditambahkan memakai Node test runner.

## Status Verifikasi

Update 2026-05-14:

Berhasil:

```bash
npm.cmd run check:postgres
npm.cmd run migrate:phase1
npm.cmd test
npm.cmd run build
```

Hasil:

- Koneksi PostgreSQL berhasil ke database `si_data`.
- Migration Phase 1 berhasil lewat script Node `scripts/migrate-phase1.mjs`.
- Tabel/objek Phase 1 terverifikasi: 3 role, `app_users`, dan `audit_logs`.
- Seed Super Admin berhasil lewat `npm.cmd run seed:phase1`.
- 5 test pass, 0 test fail, tanpa warning ESM setelah package diset sebagai module.
- Production build Next.js berhasil. Timeout build sebelumnya berasal dari sandbox tool yang membatasi proses child; build di luar sandbox selesai dalam 41 detik.

Manual RBAC API test:

- Login Super Admin berhasil dan dapat membaca data pegawai.
- Login Admin Wilayah test untuk `Jakarta Pusat` berhasil dan hanya menerima baris wilayah tersebut.
- Login Admin UKPD test untuk `Puskesmas Cempaka Putih` berhasil dan hanya menerima baris UKPD tersebut.
- Admin UKPD berhasil membuat, mengubah, lalu menghapus pegawai dummy ID `30890`.
- Audit log database berisi `pegawai.create`, `pegawai.update`, dan `pegawai.delete` untuk pegawai dummy tersebut.

Catatan:

- `psql` dan Prisma CLI tidak tersedia di PATH/dependency lokal saat verifikasi, sehingga migration distabilkan dengan script Node/pg.
- Server production lokal sempat dinyalakan untuk manual test lalu dihentikan setelah pengujian.

Berhasil:

```bash
npm.cmd test
```

Hasil terakhir:

- 5 test pass.
- 0 test fail.
- Warning Node tentang ESM sudah diselesaikan dengan `"type": "module"`.

Sebelumnya bermasalah, sekarang selesai:

```bash
npm.cmd run lint
```

Status: sudah non-interaktif via ESLint CLI dan `eslint.config.mjs`.

```bash
npm.cmd run check:postgres
```

Status: berhasil. Script sekarang membaca `.env.local` secara default.

```bash
npm.cmd run build
```

Status: berhasil. Timeout sebelumnya terjadi di sandbox tool; build di luar sandbox selesai normal.

## Cara Melanjutkan Setelah Istirahat

Urutan yang disarankan:

1. Pastikan masih di branch kerja:

```bash
git branch --show-current
```

Harus tampil:

```bash
feature/ai-agent-roadmap
```

2. Cek perubahan aktif:

```bash
git status --short
```

Perhatikan: perubahan lama di `proposal/visual-menu`, beberapa `.docx`, dan file Excel bukan bagian inti Phase 1. Jangan dihapus atau direvert sembarangan.

3. Isi `.env.local` dengan koneksi PostgreSQL yang benar.

Minimal:

```env
DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/si_data?schema=public
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=USER
POSTGRES_PASSWORD=PASSWORD
POSTGRES_DATABASE=si_data
JWT_SECRET=secret-lokal-minimal-32-karakter
APP_URL=http://localhost:3000
APP_ORIGIN=http://localhost:3000
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./storage
```

4. Jalankan migration Phase 1.

Jalur lokal yang sudah diverifikasi:

```bash
npm.cmd run migrate:phase1
```

Alternatif jika Prisma CLI/psql tersedia:

Dengan Prisma CLI:

```bash
npx prisma migrate deploy
```

Atau langsung SQL:

```bash
psql "$DATABASE_URL" -f prisma/migrations/202605110001_phase1_core_rbac_audit/migration.sql
```

Untuk Docker compose:

```bash
docker exec -i sisdmk2-db psql -U "$POSTGRES_USER" -d si_data < prisma/migrations/202605110001_phase1_core_rbac_audit/migration.sql
```

5. Seed user awal.

Gunakan password kuat, jangan pakai contoh di production:

```bash
SEED_SUPER_ADMIN_USERNAME=superadmin SEED_SUPER_ADMIN_PASSWORD="password-kuat-minimal-12" npm.cmd run seed:phase1
```

6. Jalankan test dasar:

```bash
npm.cmd test
```

7. Cek koneksi database:

```bash
npm.cmd run check:postgres
```

8. Jalankan app lokal:

```bash
npm.cmd run dev
```

9. Uji manual:

- Login sebagai Super Admin.
- Login sebagai Admin Wilayah.
- Login sebagai Admin UKPD.
- Pastikan Admin UKPD hanya melihat data UKPD sendiri.
- Pastikan Admin Wilayah hanya melihat data wilayahnya.
- Buat data pegawai dummy.
- Ubah data pegawai dummy.
- Hapus data pegawai dummy.
- Cek tabel `audit_logs` berisi aksi `pegawai.create`, `pegawai.update`, dan `pegawai.delete`.

10. Verifikasi build:

```bash
npm.cmd run build
```

Jika timeout hanya terjadi di tool/sandbox, jalankan di shell normal atau CI runner karena build production sudah terbukti selesai normal di luar sandbox.

## Gate Sebelum Phase 2

Checklist stabilitas Phase 1 yang sudah terpenuhi pada 2026-05-14:

- Migration berhasil di database target.
- Seed Super Admin berhasil.
- Login role lama dan role baru tidak rusak.
- RBAC Super Admin, Admin Wilayah, dan Admin UKPD sudah diuji manual.
- Audit log sudah masuk database.
- `npm.cmd test` tetap hijau.
- Penyebab `next build` timeout sudah jelas atau sudah diperbaiki.
- `npm.cmd run lint` sudah non-interaktif dan hijau.

## Perubahan Phase 2 Yang Sudah Dibuat

File baru:

- `prisma/migrations/202605140001_phase2_ai_documents/migration.sql`
- `scripts/migrate-phase2.mjs`
- `src/lib/ai-documents/validation.js`
- `src/lib/ai-documents/storage.js`
- `src/lib/ai-documents/classifier.js`
- `src/lib/ai-documents/openaiClassifier.js`
- `src/lib/ai-documents/repository.js`
- `src/app/api/ai-documents/route.js`
- `src/app/api/ai-documents/[id]/route.js`
- `src/app/api/ai-documents/[id]/file/route.js`
- `src/app/(app)/ai-documents/page.jsx`
- `tests/ai-documents.test.mjs`

File yang diubah:

- `.env.example`
- `.env.local.example`
- `.env.casaos.example`
- `README.md`
- `package.json`
- `prisma/schema.prisma`
- `src/data/menu/sidebarMenu.js`

Isi perubahan utama:

- Tabel Phase 2 dibuat: `ai_documents`, `ai_extraction_results`, dan `ai_validation_queue`.
- Upload dokumen AI tervalidasi berdasarkan ekstensi, MIME type, ukuran, nama file aman, dan signature dasar.
- File disimpan ke storage lokal di bawah `STORAGE_LOCAL_PATH` atau fallback `storage/ai-documents`.
- Klasifikasi awal default memakai mock deterministic classifier.
- OpenAI Responses API bisa diaktifkan dengan `AI_DOCUMENT_CLASSIFIER_PROVIDER=openai` dan `OPENAI_API_KEY`, tetap metadata-only dan fallback ke mock jika gagal.
- Mock extraction mengambil kandidat `nama`, `nip`, dan `nrk` dari nama file bila ada.
- Semua hasil klasifikasi/extraction disimpan sebagai draft dan masuk review queue.
- Endpoint `POST /api/ai-documents` mengunggah file, menyimpan dokumen, membuat hasil klasifikasi draft, membuat antrean review, dan menulis audit log.
- Endpoint `GET /api/ai-documents` membaca daftar dokumen/queue.
- Endpoint `PATCH /api/ai-documents/[id]` hanya untuk Super Admin dan mendukung keputusan `approve`, `reject`, atau `correct`.
- Endpoint `GET /api/ai-documents/[id]/file` menyediakan preview/download file dengan permission check dan path safety.
- UI `/ai-documents` menyediakan upload, filter queue, detail klasifikasi, preview/download, approve/reject/correct, dan correction JSON.
- Menu `Review AI Dokumen` ditambahkan ke sidebar/desktop menu.
- Audit log Phase 2 ditulis untuk `ai_document.upload`, `ai_document.classify`, `ai_document.approve`, `ai_document.reject`, dan `ai_document.correct`.
- Audit log preview/download ditulis sebagai `ai_document.preview` dan `ai_document.download`.

Status verifikasi Phase 2:

```bash
npm.cmd run migrate:phase2
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Hasil:

- Migration Phase 2 berhasil di database lokal.
- 9 test pass, 0 fail.
- Lint hijau.
- Production build berhasil dan route `/api/ai-documents` serta `/api/ai-documents/[id]` terdaftar.
- Build terbaru juga memuat halaman `/ai-documents` dan route `/api/ai-documents/[id]/file`.

Manual API smoke test:

- Login Super Admin berhasil.
- Upload PDF kecil `DRH Pegawai Phase2.pdf` berhasil.
- Dokumen AI ID `1` masuk queue dengan label `drh_pegawai`.
- Review `approve` berhasil.
- Audit log berisi `ai_document.upload`, `ai_document.classify`, dan `ai_document.approve`.
- Server test production lokal di port `3001` sudah dihentikan setelah pengujian.

Manual API/UI smoke test lanjutan:

- Halaman `/ai-documents` merespons di production server lokal.
- Upload PDF kecil `DRH Phase2 199901012026010001.pdf` berhasil.
- Dokumen AI ID `2` terklasifikasi `drh_pegawai` dengan provider `mock`.
- Preview file lewat endpoint aman mengembalikan PDF valid.
- Review `correct` berhasil dengan correction JSON.
- Audit log berisi `ai_document.upload`, `ai_document.classify`, `ai_document.preview`, dan `ai_document.correct`.

## Rencana Berikutnya Setelah Phase 1 Stabil

Prioritas lanjutan:

1. Tambahkan test route/API otomatis yang memvalidasi akses lintas role.
2. Tambahkan test untuk sanitasi payload pegawai.
3. Pastikan Docker build tidak timeout di runner target.
4. Pertimbangkan migrasi bertahap dari SQL helper ke Prisma hanya untuk tabel baru dulu, bukan seluruh tabel lama.
5. Buat halaman sederhana untuk membaca audit log jika diperlukan admin.
6. Dokumentasikan policy backup database sebelum migration production.

Lanjutan Phase 2:

- Tambahkan approval workflow yang bisa menghasilkan draft perubahan data pegawai, bukan langsung update tabel utama.
- Tambahkan test API integration untuk upload/review dengan DB test terisolasi.
- Tambahkan parsing isi PDF/DOCX/XLSX secara lokal sebelum dikirim sebagai ringkasan aman ke OpenAI.
- Tambahkan masking NIK/NIP sebelum prompt OpenAI jika mulai memproses isi dokumen.
- Tambahkan pagination server-side untuk queue jika volume dokumen besar.

## Perubahan Phase 3 Yang Sudah Dibuat

File baru:

- `prisma/migrations/202605140002_phase3_chatbot/migration.sql`
- `scripts/migrate-phase3.mjs`
- `src/lib/chatbot/privacy.js`
- `src/lib/chatbot/intents.js`
- `src/lib/chatbot/whatsapp.js`
- `src/lib/chatbot/repository.js`
- `src/app/api/chatbot/whatsapp/route.js`
- `src/app/api/chatbot/sessions/route.js`
- `src/app/(app)/chatbot/page.jsx`
- `tests/chatbot.test.mjs`

File yang diubah:

- `.env.example`
- `.env.local.example`
- `.env.casaos.example`
- `README.md`
- `package.json`
- `prisma/schema.prisma`
- `src/data/menu/sidebarMenu.js`

Isi perubahan utama:

- Tabel Phase 3 dibuat: `chat_sessions`, `chat_messages`, dan `chatbot_intents`.
- Seed intent awal dibuat di migration: `cek_status_usulan`, `format_dokumen`, `deadline`, `cara_update_data`, `kontak_admin`, `faq_umum`, dan `handoff_admin`.
- Webhook resmi WhatsApp Cloud API dibuat di `GET/POST /api/chatbot/whatsapp`.
- GET webhook mendukung challenge verification via `hub.mode`, `hub.verify_token`, dan `hub.challenge`.
- POST webhook membaca payload nested WhatsApp Cloud API (`entry[].changes[].value.messages[]`) tanpa library unofficial.
- Pesan inbound dan outbound disimpan ke database.
- Bot default rule-based untuk intent awal, dengan auto-reply WhatsApp hanya aktif jika `CHATBOT_AUTO_REPLY=true`.
- Guardrail privasi memasking NIP/NIK/nomor telepon sebelum penyimpanan redacted dan sebelum respons intent.
- Pertanyaan yang memuat data pribadi otomatis masuk `handoff_admin`.
- Dashboard `/chatbot` menampilkan sesi, pesan, intent, dan status handoff.
- Menu `Monitoring Chat` ditambahkan untuk Super Admin dan Admin Wilayah.

Status verifikasi Phase 3:

```bash
npm.cmd run migrate:phase3
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Hasil:

- Migration Phase 3 berhasil.
- 13 test pass, 0 fail.
- Lint hijau.
- Production build berhasil dan route `/chatbot`, `/api/chatbot/whatsapp`, serta `/api/chatbot/sessions` terdaftar.

Manual webhook smoke test:

- Server production lokal dijalankan sementara di port `3001` dengan `WHATSAPP_VERIFY_TOKEN=local-test-token`.
- GET verification challenge mengembalikan `phase3_ok`.
- POST payload contoh WhatsApp Cloud API berhasil diproses.
- Session chat ID `1` tersimpan dengan intent `format_dokumen`.
- Minimal 2 pesan tersimpan: inbound user dan outbound bot response.
- Server test production lokal sudah dihentikan setelah pengujian.

Catatan Phase 3:

- Belum mengirim auto-reply WhatsApp ke Graph API secara default. Aktifkan hanya dengan `CHATBOT_AUTO_REPLY=true`, `WHATSAPP_ACCESS_TOKEN`, dan `WHATSAPP_PHONE_NUMBER_ID`.
- Dashboard monitoring belum memiliki aksi assign/close handoff; saat ini read-only.
- Bot masih rule-based. Integrasi OpenAI untuk chatbot sebaiknya dilakukan setelah knowledge base dan masking data pribadi lebih matang.

## Perubahan Phase 4 Yang Sudah Dibuat

File baru:

- `prisma/migrations/202605140003_phase4_ai_agent/migration.sql`
- `scripts/migrate-phase4.mjs`
- `src/lib/ai-agent/registry.js`
- `src/lib/ai-agent/guardrails.js`
- `src/lib/ai-agent/tools.js`
- `src/lib/ai-agent/repository.js`
- `src/app/api/ai-agent/route.js`
- `src/app/api/ai-agent/[id]/route.js`
- `src/app/(app)/ai-agent/page.jsx`
- `tests/ai-agent.test.mjs`

File yang diubah:

- `README.md`
- `package.json`
- `prisma/schema.prisma`
- `src/data/menu/sidebarMenu.js`

Isi perubahan utama:

- Tabel Phase 4 dibuat: `ai_agent_tasks` dan `ai_agent_audit_logs`.
- Registry tool resmi dibuat: `cari_pegawai`, `cek_dokumen_pegawai`, `cek_status_usulan`, `buat_draft_surat`, `ringkas_data_pegawai`, dan `rekomendasi_tindak_lanjut`.
- Semua tool memiliki role allowlist dan output dimasking untuk NIK/NIP/telepon.
- Prompt yang mengandung instruksi SQL mentah ditolak sebelum tool dijalankan.
- Mode `assistant`, `draft`, dan `action` tersedia. Tool draft/action atau tool yang wajib approval masuk status `pending_approval`.
- Approval/reject task dibuat di `PATCH /api/ai-agent/[id]` dan dibatasi untuk Super Admin.
- Semua run dan review dicatat ke `ai_agent_audit_logs` dan audit umum `audit_logs`.
- Halaman `/ai-agent` menampilkan AI Assistant, AI Task Queue, dan AI Review & Approval awal.

Status verifikasi Phase 4:

```bash
npm.cmd run migrate:phase4
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Hasil:

- Migration Phase 4 berhasil.
- 16 test pass, 0 fail.
- Lint hijau.
- Production build berhasil setelah dijalankan di luar sandbox; route `/ai-agent`, `/api/ai-agent`, dan `/api/ai-agent/[id]` terdaftar.

Manual AI Agent smoke test:

- Server production lokal dijalankan sementara di port `3001`.
- Login Super Admin berhasil.
- Tool `rekomendasi_tindak_lanjut` membuat task ID `1` dengan status `pending_approval`.
- Approval Super Admin mengubah status task menjadi `approved`.
- Audit AI tercatat: `ai_agent.tool_run` dan `ai_agent.task_approve`.
- Halaman `/ai-agent` merespons `200`.
- Server test production lokal sudah dihentikan setelah pengujian.

Catatan Phase 4:

- Tool tidak menjalankan SQL dari user. Query yang ada tetap berasal dari function resmi yang dikodekan di server.
- OCR gambar belum aktif; butuh layanan OCR resmi atau pipeline internal sebelum extraction gambar production-grade.
- Rate limit saat ini in-memory. Untuk multi-replica production, gunakan Redis atau rate limit di reverse proxy.

## Production Hardening Yang Sudah Dibuat

File baru:

- `src/lib/security/contentSafety.js`
- `src/lib/chatbot/knowledgeBase.js`
- `src/lib/ai-documents/textExtraction.js`
- `src/lib/audit-log/repository.js`
- `src/app/api/audit-logs/route.js`
- `src/app/(app)/ai-audit-log/page.jsx`
- `tests/production-hardening.test.mjs`
- `docs/production-deployment.md`

File yang diubah:

- `src/lib/ai-documents/validation.js`
- `src/lib/ai-documents/openaiClassifier.js`
- `src/lib/ai-documents/repository.js`
- `src/app/api/ai-documents/route.js`
- `src/app/api/ai-documents/[id]/route.js`
- `src/app/api/ai-documents/[id]/file/route.js`
- `src/app/api/ai-agent/route.js`
- `src/app/api/ai-agent/[id]/route.js`
- `src/app/api/chatbot/whatsapp/route.js`
- `src/lib/chatbot/intents.js`
- `src/data/menu/sidebarMenu.js`
- `README.md`

Isi hardening:

- Rate limit ditambahkan untuk AI Agent run/review, WhatsApp webhook/verify, AI document review/file preview, audit log read, dan upload AI Document tetap memakai limit khusus.
- Content safety lokal dibuat untuk memblokir secret, SQL mentah, dan data pribadi sebelum request OpenAI.
- OpenAI classifier kini memakai cuplikan teks aman dari PDF/DOCX/XLSX/CSV bila tersedia.
- Upload validation diperketat terhadap path traversal, karakter path, nama kosong, MIME, ekstensi, ukuran, dan signature file.
- Knowledge base chatbot awal dipisahkan ke modul SOP/FAQ sederhana.
- Approval Phase 2 tetap draft sampai Super Admin approve. Setelah approve, update ke `pegawai` hanya allowlist field dan hanya bila NIP/NRK/NIK cocok.
- Halaman `/ai-audit-log` dan API `/api/audit-logs` dibuat dengan filter user, role, action, status, tanggal, dan module.
- Dokumentasi production deployment ditambahkan di `docs/production-deployment.md`.

## Phase 5 Chat Split Yang Sudah Dibuat

File baru:

- `prisma/migrations/202605140004_phase5_chat_split/migration.sql`
- `scripts/migrate-phase5.mjs`
- `src/lib/public-chat/service.js`
- `src/lib/internal-chat/service.js`
- `src/lib/internal-chat/guard.js`
- `src/app/api/public-chat/route.js`
- `src/app/api/admin/public-chat/route.js`
- `src/app/api/admin/qna-knowledge-base/route.js`
- `src/app/api/internal-chat/route.js`
- `src/components/chat/PublicHelpChat.jsx`
- `src/app/(app)/admin/public-chat/page.jsx`
- `src/app/(app)/admin/qna-knowledge-base/page.jsx`
- `src/app/(app)/ai-assistant/page.jsx`
- `src/app/(app)/ai-agent/tasks/page.jsx`
- `src/app/(app)/ai-agent/audit-log/page.jsx`
- `tests/chat-split.test.mjs`

Isi perubahan:

- Public chat tampil sebagai floating widget `Butuh Bantuan?` di `/login` dan dapat dipakai tanpa login.
- Public chat hanya menjawab dari `public_qna_knowledge_base`, menolak data pegawai/usulan/dokumen/internal, memasking NIK/NIP/NRK, dan memakai rate limit per IP.
- Public chat tersimpan di `public_chat_sessions` dan `public_chat_messages`.
- Admin dapat memonitor public chat di `/admin/public-chat`.
- Super Admin dapat mengelola QnA public di `/admin/qna-knowledge-base`.
- Internal AI chat tersedia di `/ai-assistant`, wajib login, dan berjalan lewat tool resmi AI Agent.
- Internal chat menyimpan sesi/pesan ke `internal_chat_sessions` dan `internal_chat_messages`.
- Path task/audit sesuai roadmap tersedia di `/ai-agent/tasks` dan `/ai-agent/audit-log`.

Status verifikasi Phase 5:

```bash
npm.cmd run migrate:phase5
npm.cmd test
```

Hasil sementara:

- Migration Phase 5 berhasil.
- 27 test pass, 0 fail.

## Phase 6 Internal AI Orchestrator

File baru:

- `prisma/migrations/202605140005_phase6_ai_orchestrator/migration.sql`
- `scripts/migrate-phase6.mjs`
- `src/lib/internal-chat/nlp.js`
- `src/lib/internal-chat/memory.js`
- `src/lib/internal-chat/safeDataService.js`
- `src/lib/internal-chat/formatter.js`
- `src/lib/internal-chat/orchestrator.js`
- `src/lib/internal-chat/openaiAssistant.js`
- `docs/internal-ai-orchestrator.md`
- `tests/internal-ai-orchestrator.test.mjs`

File yang diubah:

- `README.md`
- `package.json`
- `prisma/schema.prisma`
- `src/lib/internal-chat/service.js`
- `src/lib/internal-chat/guard.js`
- `src/app/api/internal-chat/route.js`
- `src/components/chat/InternalAiChatWidget.jsx`
- `src/app/(app)/ai-assistant/page.jsx`

Isi perubahan:

- Internal chat kini melewati orchestrator: intent parser, entity extraction, session memory, permission check, safe data service, formatter, dan audit.
- Mode opsional `AI_ASSISTANT_PROVIDER=openai` menambahkan OpenAI planner dan response writer agar terasa lebih seperti ChatGPT tanpa memberi akses DB langsung.
- Pertanyaan natural seperti `jabatan seftian haryadi`, `berapa jumlah PPPK`, dan `pegawai jakarta timur` dipetakan ke tool resmi.
- Follow-up seperti `ukpd nya?` memakai konteks pegawai terakhir.
- Safe data service membaca PostgreSQL dengan query parameterized dan scope RBAC.
- Hasil pencarian pegawai memakai fuzzy score ringan agar toleran typo.
- Jawaban diformat natural, bukan JSON mentah.
- Prompt injection tambahan seperti `abaikan role`, `dump database`, dan `semua data pegawai` ditolak.
- `internal_chat_sessions` menyimpan `context`, `last_intent`, dan `last_entity`.
- `ai_audit_logs` menyimpan prompt termasking, intent, tool, execution time, permission result, fallback, status, module, dan metadata.

## Catatan Keamanan

- Jangan hardcode secret, API key, token WhatsApp, atau OpenAI key.
- Jangan memakai library WhatsApp unofficial untuk production.
- Jangan izinkan AI menjalankan SQL mentah dari user.
- Jangan biarkan AI mengubah atau menghapus data tanpa approval admin.
- Masking NIK/NIP wajib diterapkan sebelum data pegawai dipakai oleh AI/chatbot.
- Upload Phase 2 wajib memvalidasi MIME type, ekstensi, ukuran, dan nama file.
- File upload harus disimpan dengan nama aman, bukan nama asli mentah dari user.
- Semua aksi penting harus masuk `audit_logs`.

## Catatan Untuk Sesi Berikutnya

Mulai sesi berikutnya dengan kalimat:

```text
Lanjutkan Phase 1 dari docs/ai-agent-roadmap-handover.md, stabilkan migration, DB, RBAC manual test, dan build sebelum Phase 2.
```

Dengan begitu konteks kerja bisa langsung dilanjutkan dari dokumen ini.
