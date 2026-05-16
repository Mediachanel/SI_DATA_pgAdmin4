# CasaOS Deployment

Deploy dijalankan dari terminal CasaOS/DietPi, source ditarik dari GitHub, lalu container dibuild di server.

Deployment ini hanya untuk SI Kepegawaian:

- App container: `sisdmk2-app`
- App folder: `/DATA/AppData/si-kepegawaian`
- Database utama: `si_data`
- PostgreSQL existing: `sisdmk-postgres`
- PostgreSQL admin/user existing: `sisdmk_admin`
- Docker network: `sisdmk2-network`
- Domain produksi: `https://dinkes.kepegawaian.media`
- Port host app: `8091`

Aplikasi memakai PostgreSQL SI SDMK sendiri. Jangan memakai konfigurasi MariaDB/MySQL lama untuk app Next.js ini.

## Deploy dari CasaOS via GitHub

Jalankan command ini langsung di terminal CasaOS/DietPi sebagai root. Pastikan perubahan terbaru sudah dipush ke GitHub branch `main`.

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

Jika `curl` belum ada:

```bash
apt-get update
apt-get install -y curl
```

Script akan clone/pull repo ke `/DATA/AppData/si-kepegawaian/source`, membuat `.env.casaos`, membuat/cek database `si_data`, lalu menjalankan:

```bash
docker compose -f docker-compose.casaos.yml up -d --build
docker exec sisdmk2-app npm run check:postgres
```

## Konfigurasi Server Saat Ini

Server CasaOS/DietPi yang dipakai saat ini memiliki container database:

```text
sisdmk-postgres
```

Env PostgreSQL container tersebut:

```text
POSTGRES_DB=si_data
POSTGRES_USER=sisdmk_admin
POSTGRES_PASSWORD=lihat nilai POSTGRES_PASSWORD di env server
```

Aplikasi SI Kepegawaian memakai database PostgreSQL bernama `si_data` dengan user `sisdmk_admin`.

Isian Adminer yang benar:

```text
Sistem     : PostgreSQL
Server     : sisdmk-postgres
Pengguna   : sisdmk_admin
Sandi      : nilai POSTGRES_PASSWORD dari env server
Basis data : si_data
```

Untuk melihat env PostgreSQL di server:

```bash
docker inspect sisdmk-postgres --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E 'POSTGRES|PG'
```

Catatan penting: container lama `sikepeg-api` memakai MariaDB/MySQL, bukan PostgreSQL:

```text
DB_HOST=host.docker.internal
DB_NAME=sisdmk2
DB_PORT=3306
DB_USER=root
```

Jangan memakai env `DB_*` untuk app baru ini. App Next.js baru membaca env `POSTGRES_*`.

## Restore Data `si_data`

Karena data pegawai tidak berasal dari seed dummy di repo, upload dump lokal `si_data.pg16.sql.tgz` lewat File Manager CasaOS dulu. Misalnya file berada di `/DATA/Downloads/si_data.pg16.sql.tgz`.

Lalu jalankan deploy sekaligus restore:

```bash
cd /DATA/AppData/si-kepegawaian
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

Jika dump sudah diekstrak menjadi `.sql`, path `.sql` juga bisa dipakai:

```bash
sh deploy-casaos-github.sh --restore-dump /DATA/Downloads/si_data.pg16.sql
```

Jangan restore database lain ke `si_data`. Pakai hanya dump PostgreSQL yang memang berasal dari database SI SDMK.

## Validasi

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker logs --tail 80 sisdmk2-app
docker exec sisdmk2-app npm run check:postgres
docker exec -it sisdmk-postgres psql -U sisdmk_admin -d si_data -c "\dt"
```

## Deploy Ulang Tanpa Restore

Untuk update kode berikutnya setelah push ke GitHub:

```bash
cd /DATA/AppData/si-kepegawaian
sh deploy-casaos-github.sh \
  --force-env \
  --app-port 8091 \
  --app-origin https://dinkes.kepegawaian.media \
  --postgres-container sisdmk-postgres \
  --postgres-admin-user sisdmk_admin \
  --postgres-user sisdmk_admin \
  --postgres-password 'PASSWORD_POSTGRES_SISDMK' \
  --postgres-database si_data
```

Jika ingin menjalankan Docker Compose manual dari folder app, pastikan env CasaOS ikut dibaca. Tanpa env file ini, compose bisa gagal dengan pesan `POSTGRES_PASSWORD is missing`.

```bash
cd /DATA/AppData/si-kepegawaian
git pull origin main
cp .env.casaos .env
docker compose --env-file .env.casaos -f docker-compose.casaos.yml up -d --build
docker logs --tail 50 sisdmk2-app
```

## Jika User PostgreSQL Bukan `postgres`

Jika container PostgreSQL CasaOS tidak punya role `postgres`, jalankan dengan user admin yang benar:

```bash
sh deploy-casaos-github.sh \
  --postgres-container sisdmk-postgres \
  --postgres-admin-user NAMA_USER_ADMIN \
  --postgres-user NAMA_USER_APP \
  --postgres-password 'PASSWORD_USER_APP' \
  --force-env \
  --app-port 8091 \
  --app-origin https://dinkes.kepegawaian.media
```

## Cloudflare Tunnel

Jika memakai domain `dinkes.kepegawaian.media`, arahkan ingress Cloudflare Tunnel ke port host aplikasi:

```yaml
ingress:
  - hostname: dinkes.kepegawaian.media
    service: http://172.31.254.202:8091
  - service: http_status:404
```

Jika IP CasaOS berubah, sesuaikan bagian `172.31.254.202`. Jika menjalankan tunnel di host yang sama, `service` juga bisa diarahkan ke `http://localhost:8091`.

## Troubleshooting Build CasaOS

Jika build sukses tetapi container gagal dibuat karena nama sudah dipakai:

```text
Conflict. The container name "/sisdmk2-app" is already in use
```

Hapus container app lama lalu deploy ulang:

```bash
docker rm -f sisdmk2-app
cd /DATA/AppData/si-kepegawaian
sh deploy-casaos-github.sh \
  --force-env \
  --app-port 8091 \
  --app-origin https://dinkes.kepegawaian.media \
  --postgres-container sisdmk-postgres \
  --postgres-admin-user sisdmk_admin \
  --postgres-user sisdmk_admin \
  --postgres-password 'PASSWORD_POSTGRES_SISDMK' \
  --postgres-database si_data
```

Jika gagal karena port `3000` sudah dipakai, gunakan `--app-port 8091` seperti command di atas.

Jika muncul:

```text
getaddrinfo ENOTFOUND pasir-postgres
# atau
getaddrinfo ENOTFOUND pasarkita-postgres
```

Berarti nama container database salah atau masih memakai catatan lama. Server ini memakai `sisdmk-postgres`.

Jika muncul:

```text
password authentication failed for user "postgres"
```

Berarti user PostgreSQL salah. Server ini memakai user `sisdmk_admin`, bukan `postgres`.
