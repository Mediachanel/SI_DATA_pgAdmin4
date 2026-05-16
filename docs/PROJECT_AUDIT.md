# SI-SDMK Project Audit

Tanggal audit: 2026-05-16

## Ringkasan Eksekutif

SI-SDMK berjalan sebagai aplikasi Next.js 15 di Docker/CasaOS dengan PostgreSQL 16 dan integrasi n8n. Kondisi server aktif yang harus menjadi acuan:

```text
App container      : sisdmk2-app
Database container : sisdmk-postgres
Database           : si_data
Database user      : sisdmk_admin
AI container       : sisdmk-n8n
App domain         : https://dinkes.kepegawaian.media
n8n domain         : https://n8n.kepegawaian.media
```

Catatan lama yang menyebut `pasarkita-postgres`, `pasir-postgres`, MariaDB, atau MySQL tidak boleh dipakai untuk deployment Next.js production.

## Temuan Utama

- Docker cache Next.js membutuhkan path writable di `/app/.next/cache`; compose sekarang memakai tmpfs untuk cache itu.
- App membutuhkan `APP_ORIGIN=https://dinkes.kepegawaian.media`, `COOKIE_SECURE=true`, `ALLOW_INSECURE_LOCAL_HTTP=false`, dan `TRUST_PROXY_HEADERS=true` saat lewat Cloudflare Tunnel.
- Login gagal dengan 503 berarti backend tidak dapat menghubungi PostgreSQL. Login gagal 401 berarti database terbaca tetapi akun/password tidak cocok.
- `POSTGRES_HOST` untuk container app harus `sisdmk-postgres` karena app dan database berada dalam Docker network yang sama.
- AI n8n sudah memakai webhook nyata, bukan mock, melalui `/api/ai/chat` dan `/api/ai/public-chat`.
- Tool database internal untuk n8n sudah tersedia untuk pencarian pegawai, profil pegawai, ringkasan dashboard, QnA publik, dan draft perubahan pegawai.
- CRUD AI yang aman harus melalui draft + approval. Direct mutation dari LLM ke tabel pegawai tidak direkomendasikan.

## Source Changes 2026-05-16

- `docker-compose.casaos.yml`
  - Default PostgreSQL diarahkan ke `sisdmk-postgres` dan `sisdmk_admin`.
  - `read_only: true` dihapus untuk menghindari konflik runtime Next.js.
  - Ditambahkan tmpfs `/app/.next/cache` untuk cache image Next.js.
  - Ditambahkan healthcheck ke `/api/health`.
  - Ditambahkan env n8n timeout/retry dan pool PostgreSQL.

- `Dockerfile`
  - Membuat `/app/.next/cache/images` dan memastikan owner `node`.

- `src/app/api/health/route.js`
  - Health endpoint production untuk PostgreSQL, local storage, Next cache, dan status konfigurasi n8n tanpa membocorkan secret.

- `src/lib/db/postgres.js`
  - Pool PostgreSQL kini mendukung `POSTGRES_POOL_MAX`, `POSTGRES_IDLE_TIMEOUT_MS`, dan `POSTGRES_APPLICATION_NAME`.
  - Keepalive diaktifkan.
  - Pool terpilih sekarang memakai interval verifikasi (`POSTGRES_POOL_VERIFY_INTERVAL_MS`) agar request login/dashboard tidak melakukan ping DB berulang pada setiap query.

- `src/app/api/dashboard/route.js`
  - Payload dashboard memakai cache pendek (`DASHBOARD_CACHE_TTL_MS`) per user/filter untuk mempercepat buka dashboard berulang tanpa mengubah data permanen.

- `src/lib/dashboardData.js`
  - Data pegawai yang sudah disaring sesuai scope user memakai cache pendek (`DASHBOARD_DATA_CACHE_TTL_MS`) sehingga filter status/wilayah dan analitik tidak membaca ulang tabel besar pada setiap request.

- `src/lib/auth/requestGuards.js`
  - Same-origin guard kini menerima `APP_URL` selain `APP_ORIGIN` dan `ALLOWED_ORIGINS`.

- `src/app/api/auth/login/route.js`
  - Log error diperbaiki dari MySQL menjadi PostgreSQL.

- `src/lib/n8n-ai/webhookClient.js`
  - Client webhook n8n production dengan request id, timeout, retry, dan error normalization.

- `src/app/api/ai/chat/route.js` dan `src/app/api/ai/public-chat/route.js`
  - Menggunakan webhook client baru.
  - Mengirim `conversation_id`, `request_id`, source, user scope, dan metadata client.
  - Same-origin guard diaktifkan.

- `src/components/ai/InternalAiChat.jsx` dan `src/components/ai/PublicAiChat.jsx`
  - Membuat `conversation_id` stabil per sesi browser.

- `src/app/api/internal-ai/tools/pegawai-change-draft/route.js`
  - Tool n8n baru untuk membuat draft CREATE/UPDATE/DELETE pegawai yang wajib approval.

## Area Risiko

- n8n workflow belum tersedia di repo sebagai export JSON siap import. Dokumen `N8N_WORKFLOW_PLAN.md` mendefinisikan kontraknya.
- Approval executor untuk menerapkan `ai_agent_tasks` ke tabel pegawai perlu diselesaikan sebelum CRUD AI dianggap end-to-end.
- Rate limit masih in-memory; untuk multi-replica perlu Redis atau database-backed limiter.
- WebSocket realtime belum diimplementasikan di aplikasi. Cloudflare mendukung WebSocket, tetapi aplikasi saat ini masih request/response HTTP.
- RAG/vector memory sudah dirancang di migration pgvector, tetapi pipeline indexing dan retrieval n8n masih perlu diikat ke workflow final.

## Validasi Minimum

Di server:

```bash
docker exec sisdmk2-app npm run check:postgres
curl -fsS http://127.0.0.1:8091/api/health
docker logs --tail 100 sisdmk2-app
docker logs --tail 100 sisdmk-n8n
```

Di browser:

```text
https://dinkes.kepegawaian.media/login
https://dinkes.kepegawaian.media/api/health
```
