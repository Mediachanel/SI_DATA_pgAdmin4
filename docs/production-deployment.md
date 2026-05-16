# Production Deployment SI SDMK

Dokumen ini melengkapi README untuk hardening deploy Docker/CasaOS.

## Env Production Minimum

Jangan gunakan secret contoh untuk production.

```env
DATABASE_URL=postgresql://sisdmk2_user:CHANGE_ME@db:5432/si_data?schema=public
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_USER=sisdmk2_user
POSTGRES_PASSWORD=CHANGE_ME_STRONG
POSTGRES_DATABASE=si_data
JWT_SECRET=CHANGE_ME_MIN_32_CHARS
NEXTAUTH_SECRET=CHANGE_ME_MIN_32_CHARS
APP_URL=https://sisdmk.example.go.id
APP_ORIGIN=https://sisdmk.example.go.id
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=/app/storage
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
AI_DOCUMENT_CLASSIFIER_PROVIDER=mock
AI_DOCUMENT_MAX_BYTES=10485760
WHATSAPP_VERIFY_TOKEN=CHANGE_ME
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_GRAPH_VERSION=v20.0
CHATBOT_AUTO_REPLY=false
```

## Deploy Docker/CasaOS

1. Backup database sebelum update.
2. Pull/update kode pada branch production yang sudah diuji.
3. Pastikan `.env` production lengkap dan permission file storage benar.
4. Jalankan migration bertahap:

```bash
docker compose exec app npm run migrate:phase1
docker compose exec app npm run migrate:phase2
docker compose exec app npm run migrate:phase3
docker compose exec app npm run migrate:phase4
```

5. Build dan restart service:

```bash
docker compose build app
docker compose up -d
docker compose logs -f app
```

Untuk CasaOS, pastikan volume berikut persisten:

- PostgreSQL data volume.
- `STORAGE_LOCAL_PATH` untuk dokumen AI.
- File `.env` production.

## Backup Database

```bash
docker compose exec db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" -Fc -f /tmp/sisdmk.backup
docker compose cp db:/tmp/sisdmk.backup ./backup/sisdmk-$(date +%F-%H%M).backup
```

Backup SQL plain jika perlu inspeksi manual:

```bash
docker compose exec db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" > ./backup/sisdmk-$(date +%F-%H%M).sql
```

## Restore Database

Restore ke database baru atau maintenance window. Jangan restore ke production aktif tanpa validasi.

```bash
docker compose cp ./backup/sisdmk.backup db:/tmp/sisdmk.backup
docker compose exec db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" --clean --if-exists /tmp/sisdmk.backup
```

## Update Aman

Checklist sebelum redeploy:

- `npm test`
- `npm run lint`
- `npm run build`
- Backup database sudah dibuat.
- Migration sudah diuji di database staging/local.
- `OPENAI_API_KEY` dan token WhatsApp tidak pernah masuk git.
- `AI_DOCUMENT_CLASSIFIER_PROVIDER=mock` untuk demo tanpa biaya/API eksternal.
- Aktifkan `CHATBOT_AUTO_REPLY=true` hanya jika token WhatsApp Cloud API valid dan webhook sudah diverifikasi.

## Catatan Hardening

- Endpoint auth, AI Agent, chatbot, upload, file preview, dan audit log memakai rate limit in-memory. Untuk multi-replica production, pindahkan store rate limit ke Redis.
- AI Document tetap draft sampai admin approve. Saat approve, update ke tabel `pegawai` hanya dilakukan untuk field allowlist dan hanya bila NIP/NRK/NIK cocok.
- Content safety lokal memblokir prompt berisi secret, SQL mentah, dan data pribadi sebelum request OpenAI.
- OCR gambar belum aktif. Gambar tetap boleh diupload dan masuk review, tetapi extraction teks membutuhkan layanan OCR resmi atau pipeline internal.
