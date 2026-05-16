# Sistem Informasi SDM Kesehatan Dinas Kesehatan Provinsi DKI Jakarta

MVP aplikasi kepegawaian internal berbasis Next.js App Router, Tailwind CSS, JWT HttpOnly cookie, RBAC, dan koneksi PostgreSQL.

## Menjalankan Project

```bash
npm install
npm test
npm run dev
```

Aplikasi berjalan di `http://localhost:3000`.

## Phase 1 Core SI SDMK

Branch pengembangan bertahap HRIS/AI Agent dimulai dari `feature/ai-agent-roadmap`. Backup sebelum perubahan Phase 1 dibuat di `backup/pre-ai-agent-roadmap-phase1-2026-05-11`.

Audit struktur dan risiko awal ada di [Phase 1 Audit](docs/phase-1-audit.md).

Perubahan Phase 1 berfokus pada fondasi aman tanpa mengganti seluruh data layer:

- RBAC pegawai dipusatkan di `src/lib/rbac/scope.js`.
- Validasi dan sanitasi payload pegawai ditambahkan di `src/lib/validation/pegawai.js`.
- Audit log CRUD pegawai dan security event disiapkan ke tabel `audit_logs`.
- Migration PostgreSQL/Prisma baseline tersedia di `prisma/migrations/202605110001_phase1_core_rbac_audit/migration.sql`.
- Prisma schema awal tersedia sebagai kontrak bertahap di `prisma/schema.prisma`; runtime aplikasi masih memakai `pg` agar kompatibel dengan fitur lama.
- Seed role dan Super Admin awal memakai env variable melalui `npm run seed:phase1`.
- Test minimal auth dan RBAC memakai Node test runner melalui `npm test`.

### Menjalankan Migration Phase 1

Jika Prisma CLI sudah tersedia di environment Anda, jalankan:

```bash
npx prisma migrate deploy
```

Tanpa Prisma CLI, migration SQL bisa dijalankan langsung ke PostgreSQL:

```bash
psql "$DATABASE_URL" -f prisma/migrations/202605110001_phase1_core_rbac_audit/migration.sql
```

Untuk Docker compose satu stack:

```bash
docker exec -i sisdmk2-db psql -U "$POSTGRES_USER" -d si_data < prisma/migrations/202605110001_phase1_core_rbac_audit/migration.sql
```

### Seed User dan Role Awal

Jangan hardcode password. Set password dari env:

```bash
SEED_SUPER_ADMIN_USERNAME=superadmin SEED_SUPER_ADMIN_PASSWORD="password-kuat-minimal-12" npm run seed:phase1
```

Script ini mengisi `roles` dan `app_users`. Login lama dari tabel `ukpd` tetap dipertahankan pada Phase 1 supaya fitur existing tidak putus.

### Env Wajib Roadmap

Minimal env untuk roadmap bertahap:

```env
DATABASE_URL=postgresql://sisdmk2_user:CHANGE_ME@127.0.0.1:5432/si_data?schema=public
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=sisdmk2_user
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DATABASE=si_data
JWT_SECRET=CHANGE_ME_MIN_32_CHARS
NEXTAUTH_SECRET=
APP_URL=http://localhost:3000
APP_ORIGIN=http://localhost:3000
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./storage
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
AI_ASSISTANT_PROVIDER=local
AI_DOCUMENT_CLASSIFIER_PROVIDER=mock
AI_DOCUMENT_MAX_BYTES=10485760
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_GRAPH_VERSION=v20.0
CHATBOT_AUTO_REPLY=false
```

### Cara Test Phase 1

```bash
npm test
npm run check:postgres
npm run dev
```

Uji manual yang disarankan:

- Login sebagai Super Admin, Admin Wilayah, dan Admin UKPD.
- Pastikan Admin UKPD hanya melihat/mengubah pegawai UKPD sendiri.
- Pastikan Admin Wilayah hanya melihat/mengubah pegawai wilayahnya.
- Coba input nama pegawai dengan karakter HTML seperti `<script>` dan pastikan payload tersanitasi.
- Buat, ubah, dan hapus data pegawai lalu cek tabel `audit_logs`.

Test upload dan AI extraction belum diaktifkan di Phase 1 karena termasuk Phase 2. Kontrak env dan storage sudah disiapkan agar Phase 2 bisa masuk tanpa membongkar ulang fondasi.

## Roadmap AI HRIS

Migration bertahap setelah Phase 1:

```bash
npm run migrate:phase2
npm run migrate:phase3
npm run migrate:phase4
npm run migrate:phase5
npm run migrate:phase6
npm run migrate:phase7
npm run migrate:phase8
npm test
npm run lint
npm run build
```

Ringkasan modul roadmap:

- Phase 2 `ai-documents`: upload PDF/gambar/DOCX/Excel, validasi MIME/ekstensi/ukuran/nama file, storage lokal, tabel `ai_documents`, `ai_extraction_results`, `ai_validation_queue`, klasifikasi dokumen, extraction metadata draft, confidence score, catatan AI, dan halaman review admin di `/ai-documents`.
- Phase 3 `chatbot`: webhook resmi WhatsApp Business Cloud API di `/api/chatbot/whatsapp`, tabel `chat_sessions`, `chat_messages`, `chatbot_intents`, intent awal, masking data pribadi, handoff admin, dan dashboard monitoring `/chatbot`.
- Phase 4 `ai-agent`: tools resmi terbatas, permission check role, blokir instruksi SQL mentah, masking NIK/NIP/telepon, task approval, audit log AI, dan halaman `/ai-agent`.
- Phase 5 chat split: public chat di halaman login hanya membaca `public_qna_knowledge_base`, internal AI chat di `/ai-assistant` memakai session user dan permission guard, monitoring public chat di `/admin/public-chat`, QnA admin di `/admin/qna-knowledge-base`, task queue di `/ai-agent/tasks`, dan audit log di `/ai-agent/audit-log`.
- Cutover n8n (15 Mei 2026): jalur AI internal lama, public chat lama, chatbot WhatsApp lama, AI agent approval lama, dan workflow engine internal lama dinonaktifkan dengan HTTP 410.

### AI n8n Workflow

Jalur AI aktif sekarang adalah bridge Next.js ke n8n:

- `POST /api/ai/chat`: chat internal setelah login, mengirim user dan role scope ke webhook `N8N_WEBHOOK_URL`.
- `POST /api/ai/public-chat`: chat publik login page, mengirim pesan ke `N8N_PUBLIC_WEBHOOK_URL`.
- `POST /api/internal-ai/tools/employee-count`: tool database resmi untuk hitung pegawai.
- `POST /api/internal-ai/tools/search-employee`: tool database resmi untuk pencarian pegawai.
- `POST /api/internal-ai/tools/dashboard-summary`: tool ringkasan dashboard.
- `POST /api/internal-ai/tools/employee-profile`: tool profil pegawai lintas tabel dengan allowlist section/field. Kirim `user`, `query`/`id_pegawai`, `sections`, dan `fields`; backend hanya mengembalikan kolom yang diminta serta tetap memasking NIK/NIP/NRK/nomor kontak.
- `POST /api/internal-ai/tools/public-qna`: tool QnA publik.

Semua tool internal n8n wajib mengirim header `x-ai-secret` yang cocok dengan `N8N_API_SECRET`. Chat internal tetap membaca HRIS sesuai role: Super Admin semua data, Admin Wilayah hanya wilayah sendiri, dan Admin UKPD hanya UKPD sendiri.

Endpoint lama seperti `/api/internal-chat`, `/api/public-chat`, `/api/ai-agent`, `/api/ai-workflows`, dan webhook chatbot lama tidak lagi menjalankan AI lokal. Endpoint tersebut hanya menjadi penutup eksplisit agar tidak ada fallback tersembunyi ke orchestrator atau service AI lama.

AI document classifier memakai provider `mock` secara default agar aman untuk lokal/test. Untuk memakai OpenAI, set `AI_DOCUMENT_CLASSIFIER_PROVIDER=openai`, `OPENAI_API_KEY`, dan `OPENAI_MODEL` tanpa hardcode secret.

Panduan production deployment, backup, restore, dan redeploy aman ada di [Production Deployment](docs/production-deployment.md).

## Pakai Database Offline Lokal

Bisa. Untuk cek sistem sebelum deploy, pakai PostgreSQL lokal selama nama database dan struktur tabel sama dengan server.

Langkah yang disarankan untuk PostgreSQL lokal:

```bash
copy .env.local.example .env.local
npm run check:postgres
npm run dev
```

Isi `.env.local` untuk koneksi lokal:

```env
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=
POSTGRES_DATABASE=si_data
JWT_SECRET=dev-local-only-change-me
APP_ORIGIN=http://localhost:3000
```

Lalu import SQL ke database lokal `si_data` dengan urutan:

```bash
sql/ukpd_password_generated.sql
sql/export_pegawai_ukpd.sql
sql/create_alamat_riwayat_tables.sql
sql/import_alamat_generated_20_parts/import_alamat_part_01.sql s.d. part_20.sql
sql/create_keluarga_from_existing.sql
sql/import_keluarga_generated_parts/import_keluarga_part_01.sql s.d. part_20.sql
```

Catatan:

- `create_keluarga_from_existing.sql` hanya membuat tabel `keluarga` dan seed dari tabel lama `pasangan` + `anak` jika tabel itu ada. Kalau lokal Anda hanya memakai hasil generate, lanjutkan juga dengan import file part `import_keluarga_generated_parts`.
- App sudah mencoba host lokal otomatis seperti `127.0.0.1` dan `localhost`, plus database `si_data`, jadi untuk test offline ini memang didukung.
- Jika `npm run check:postgres` sukses, aplikasi pada umumnya sudah bisa membaca database lokal yang sama polanya dengan server.

## Deploy ke CasaOS

Ada dua skenario. Pilih salah satu, jangan dicampur:

- `docker-compose.casaos.yml`: app memakai PostgreSQL yang sudah ada di CasaOS/server.
- `docker-compose.yml`: app dan PostgreSQL berjalan dalam satu stack compose baru.

### Deploy cepat dari CasaOS via GitHub

Jalankan script dari terminal CasaOS/DietPi, lalu server akan pull GitHub, build container, cek database `si_data`, dan start app.

```bash
mkdir -p /DATA/AppData/si-kepegawaian
cd /DATA/AppData/si-kepegawaian
curl -fsSL https://raw.githubusercontent.com/Mediachanel/SI_DATA_pgAdmin4/main/scripts/deploy-casaos-github.sh -o deploy-casaos-github.sh
sh deploy-casaos-github.sh \
  --install-deps \
  --force-env \
  --app-port 8091 \
  --app-origin https://dinkes.kepegawaian.media \
  --postgres-container sisdmk-postgres \
  --postgres-admin-user sisdmk_admin \
  --postgres-user sisdmk_admin \
  --postgres-password 'PASSWORD_POSTGRES_SISDMK' \
  --postgres-database si_data
```

Jika dump `si_data.pg16.sql.tgz` sudah di-upload ke CasaOS, deploy sekaligus restore:

```bash
sh deploy-casaos-github.sh \
  --force-env \
  --app-port 8091 \
  --app-origin https://dinkes.kepegawaian.media \
  --postgres-container sisdmk-postgres \
  --postgres-admin-user sisdmk_admin \
  --postgres-user sisdmk_admin \
  --postgres-password 'PASSWORD_POSTGRES_SISDMK' \
  --postgres-database si_data \
  --restore-dump /DATA/Downloads/si_data.pg16.sql.tgz
```

Detail lengkap ada di [CasaOS Deployment](docs/CASAOS.md).

### Skenario A: Pakai PostgreSQL CasaOS/server yang sudah ada

Konfigurasi server aktif:

```text
Sistem     : PostgreSQL
Server     : sisdmk-postgres
Pengguna   : sisdmk_admin
Sandi      : nilai POSTGRES_PASSWORD dari env server
Basis data : si_data
```

Pastikan database `si_data` bisa diakses dari container lewat host yang diset di `POSTGRES_HOST`/`POSTGRES_HOSTS`. Untuk skenario ini, pakai `docker-compose.casaos.yml`.

Jika source project sudah ada di CasaOS, deploy bisa memakai script:

```bash
sh scripts/deploy-casaos.sh --app-origin http://IP-CASAOS:3000 --postgres-password "PASSWORD_POSTGRES"
```

Untuk deploy ulang dan menulis ulang `.env.casaos`:

```bash
sh scripts/deploy-casaos.sh --force-env --app-origin http://IP-CASAOS:3000 --postgres-password "PASSWORD_POSTGRES"
```

Lalu deploy:

```bash
git pull origin main
docker compose -f docker-compose.casaos.yml down
docker compose -f docker-compose.casaos.yml build --no-cache app
docker compose -f docker-compose.casaos.yml up -d
```

Tes koneksi dari container app:

```bash
docker exec sisdmk2-app npm run check:postgres
```

Jika user database belum dibuat, app akan gagal dengan pesan akses user. Buat user PostgreSQL sesuai nilai `POSTGRES_USER` dan beri akses ke database `POSTGRES_DATABASE`.

Jika menjalankan compose manual di CasaOS, gunakan env file CasaOS agar `POSTGRES_PASSWORD` dan `JWT_SECRET` terbaca:

```bash
cp .env.casaos .env
docker compose --env-file .env.casaos -f docker-compose.casaos.yml up -d --build
```

### Skenario B: App dan PostgreSQL satu stack compose

Pakai `docker-compose.yml`. Dalam skenario ini host PostgreSQL untuk app adalah `db:5432`, bukan `host.docker.internal`.

```bash
docker compose down
docker compose build --no-cache app
docker compose up -d
docker exec -i sisdmk2-db psql -U "$POSTGRES_USER" -d si_data < sql/ukpd_password_generated.sql
docker exec -i sisdmk2-db psql -U "$POSTGRES_USER" -d si_data < sql/export_pegawai_ukpd.sql
docker exec sisdmk2-app npm run check:postgres
```

Setelah berjalan, app tersedia di `http://IP-CASAOS:8080`.

Catatan troubleshooting:

- Di dalam container, `localhost` dan `127.0.0.1` menunjuk ke container itu sendiri. Untuk database di host/CasaOS, pakai `host.docker.internal` dengan `extra_hosts: host.docker.internal:host-gateway`.
- Kalau database berada dalam compose yang sama, pakai nama service `db`.
- Kolom `ukpd.password` harus memakai hash bcrypt atau SHA-256, bukan plaintext.
- Jangan pakai password seed/default di production. Aplikasi production menolak password umum seperti `admin123` dan `password123`.
- Jika muncul pesan gagal konek database, cek `POSTGRES_HOSTS`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`, dan `POSTGRES_DATABASES` pada container app.
- Jika volume `sisdmk2_postgres_data` sudah pernah dibuat dengan password lama, mengganti `POSTGRES_PASSWORD` di compose tidak otomatis mengubah password user yang sudah ada. Pakai password lama, ubah password user manual dari PostgreSQL, atau buat volume baru bila data lama boleh dihapus.
- Aplikasi mencoba beberapa host PostgreSQL secara berurutan dari `POSTGRES_HOSTS`, lalu fallback lokal/CasaOS: `postgres`, `db`, `host.docker.internal`, `172.17.0.1`, `127.0.0.1`, dan `localhost`. Database yang dicoba berasal dari `POSTGRES_DATABASES`/`POSTGRES_DATABASE`, dengan fallback ke `si_data`.

## Form Pegawai

Field `Jabatan Standar Kepgub 11` memakai daftar `jabatan_standar` sebagai referensi resmi. Pada data utama pegawai dan `Riwayat Jabatan`, field ini ditampilkan sebagai dropdown agar user tidak perlu mengetik nilai persis secara manual.

Jika ada nilai lama dari DRH/import seperti `Pengolah Data` yang belum ada di daftar standar, pilih padanan jabatan dari dropdown. Validasi penyimpanan akan menolak nilai bebas yang tidak ada di referensi.

## Import CSV Master Pegawai

File CSV pengguna sudah dipetakan dengan script:

```bash
node scripts/import-master-pegawai.mjs "c:\Users\Dinkes_laptop3\Downloads\MASTER DATA PEGAWAI (9).csv"
```

Hasil import disimpan di `src/data/generated/` dan dipakai langsung oleh API MVP:

- `pegawai.json`: 30.963 pegawai
- `ukpd.json`: 91 UKPD
- `alamat.json`: 57.074 alamat domisili/KTP
- `pasangan.json`: 19.645 data pasangan
- `anak.json`: 23.741 data anak
- `import-summary.json`: ringkasan header dan anomali

Ada 1 baris dengan nilai `WILAYAH` anomali yaitu `PUSKESMAS`; data ini ditandai di `import-summary.json`.

## Sinkronisasi Kode UKPD

Daftar UKPD resmi dapat disinkronkan dari CSV:

```bash
node scripts/sync-ukpd-csv.mjs "c:\Users\Dinkes_laptop3\Downloads\ukpd (5).csv"
```

Script ini menimpa `src/data/generated/ukpd.json` dengan daftar UKPD resmi dan mengisi `id_ukpd`/`ukpd_id` pada `pegawai.json` berdasarkan `nama_ukpd`.

Hasil sinkronisasi terakhir:

- 89 UKPD resmi
- 30.963 dari 30.963 pegawai berhasil mendapat kode UKPD
- 0 nama UKPD tidak cocok

Alias nama yang disamakan:

- `Puskesmas Mampang Perapatan` -> `Puskesmas Mampang Prapatan`
- `UPT Pusdatin` -> `UPT Pusat Data dan Informasi Kesehatan`
- `UPT Pusat Pelatihan Kesehatan Daerah` -> `UPT Pusat Pelatihan Pegawai`

## Normalisasi Jenjang Pendidikan

Nilai pendidikan dari CSV distandarkan untuk dashboard agar grafik tidak pecah oleh variasi penulisan:

```bash
node scripts/normalize-generated-education.mjs
```

Kelompok standar: `SD`, `SMP`, `SMA/SMK`, `D1`, `D2`, `D3`, `D4`, `S1`, `Profesi`, `S2`, `Spesialis`, `S3`, dan `Tidak Diketahui`. Nilai asli tetap disimpan di `jenjang_pendidikan_raw`.

## Normalisasi Rumpun Jabatan

Rumpun jabatan PJLP distandarkan menjadi `PJLP` agar grafik tidak pecah menjadi `PJLP Kebersihan`, `PJLP Keamanan`, `Petugas Kebersihan`, dan variasi lain.

```bash
node scripts/normalize-generated-rumpun.mjs
```

Nilai asli tetap disimpan di `status_rumpun_raw`.

## Normalisasi Jabatan Kepmenpan 11

Jabatan Kepmenpan/Permenpan 11 distandarkan dari variasi penulisan mentah ke nama jabatan baku:

```bash
node scripts/normalize-generated-jabatan-menpan.mjs
```

Nilai asli tetap disimpan di `nama_jabatan_menpan_raw`, sedangkan `nama_jabatan_menpan` dipakai dashboard dan tabel sebagai nilai standar.

## Normalisasi Jenis Kelamin

Jenis kelamin distandarkan menjadi `Laki-laki`, `Perempuan`, atau `Tidak Diketahui`:

```bash
node scripts/normalize-generated-gender.mjs
```

Nilai asli tetap disimpan di `jenis_kelamin_raw`.

## Akun Login

Jika PostgreSQL aktif, login membaca tabel `ukpd`. Buat seed password dengan `UKPD_DEFAULT_PASSWORD="password-kuat-minimal-12" node scripts/generate-ukpd-password-sql.mjs`, lalu import `sql/ukpd_password_generated.sql`.

| Role | Username / Nama UKPD | Password |
| --- | --- | --- |
| Super Admin | `SUPER ADMIN` | password unik yang sudah diganti |
| Dinas Kesehatan | `Dinas Kesehatan` | password unik yang sudah diganti |
| Admin UKPD | nama UKPD, contoh `Puskesmas Tebet` | password unik yang sudah diganti |
| Admin UKPD | kode UKPD, contoh `4` | password unik yang sudah diganti |

Di production, `JWT_SECRET`, `POSTGRES_PASSWORD`, dan password akun wajib diset kuat. Secret lokal/contoh tidak boleh dipakai untuk deploy.

## Struktur Utama

```text
src/
  app/
    (app)/
      dashboard/
      pegawai/
      usulan/
      import-drh/
      duk/
      qna-admin/
      profil/
    api/
    login/
  components/
    layout/
    cards/
    charts/
    forms/
    profile/
    tables/
    ui/
  data/
    menu/
  lib/
    auth/
    constants/
    db/
    helpers/
database/
  schema.sql
```

## Catatan Arsitektur

- RBAC diterapkan pada middleware, sidebar, dan API.
- `filterPegawaiByRole` memastikan Super Admin, Admin Wilayah, dan Admin UKPD hanya menerima data sesuai kewenangan.
- Auth memakai JWT melalui HttpOnly cookie.
- Password UKPD diverifikasi dari tabel PostgreSQL `ukpd`; format bcrypt dan SHA-256 didukung.
- API pegawai, dashboard, DUK, drilldown, dan pivot membaca tabel PostgreSQL `pegawai` dan `ukpd`. Jika koneksi database gagal, API mengembalikan error dan tidak memakai data JSON dummy.
- Query database memakai adapter PostgreSQL di `src/lib/db/postgres.js`.
- Untuk produksi, gunakan `id_ukpd` sebagai foreign key utama dan pertahankan `nama_ukpd` sebagai label laporan bila diperlukan.
