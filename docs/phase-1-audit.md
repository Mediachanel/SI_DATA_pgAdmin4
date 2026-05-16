# Phase 1 Audit SI SDMK

Tanggal audit: 2026-05-11
Branch kerja: `feature/ai-agent-roadmap`
Backup branch: `backup/pre-ai-agent-roadmap-phase1-2026-05-11`

## Struktur Saat Ini

- Aplikasi utama memakai Next.js App Router di `src/app`.
- Backend berjalan sebagai Next.js API Routes di `src/app/api`.
- Koneksi database memakai `pg` melalui compatibility layer `src/lib/db/postgres.js`.
- Auth memakai JWT di HttpOnly cookie `sdm_session`.
- RBAC sudah ada di middleware, sidebar, dan beberapa API, tetapi masih tersebar.
- Data utama pegawai/UKPD masih memakai query SQL langsung melalui helper store, bukan Prisma Client.
- Belum ada folder Prisma sebelum Phase 1 ini.
- Deployment Docker/CasaOS sudah ada melalui `Dockerfile`, `docker-compose.yml`, dan `docker-compose.casaos.yml`.

## Masalah Yang Ditemukan

- Belum ada migration Prisma/PostgreSQL resmi sebagai baseline evolusi schema.
- RBAC ada, tetapi helper scope belum terpusat dan belum punya test unit.
- Audit log keamanan masih hanya `console.info`, belum tersimpan ke PostgreSQL.
- Seed user/role awal belum memakai script aman berbasis env variable.
- Validasi payload pegawai masih terlalu longgar karena `.passthrough()` tanpa batas panjang pada banyak field.
- Validasi ID route belum eksplisit; input non-numerik bisa jatuh ke `NaN`.
- Env example belum memuat variabel Phase 2-4 seperti OpenAI, WhatsApp, dan storage abstraction.
- Test otomatis belum tersedia di `package.json`.
- Prisma belum menjadi runtime ORM, sehingga migrasi Phase 1 disiapkan sebagai kontrak bertahap tanpa mengganti data layer lama.

## Batasan Phase 1

- Tidak menghapus fitur lama.
- Tidak mengganti seluruh SQL store menjadi Prisma dalam satu langkah.
- Tidak mengaktifkan AI, upload AI, atau WhatsApp sebelum Core SI SDMK stabil.
