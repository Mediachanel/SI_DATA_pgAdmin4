#!/usr/bin/env sh
set -eu

REPO_URL="${REPO_URL:-https://github.com/Mediachanel/SI_DATA_pgAdmin4.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/DATA/AppData/si-kepegawaian}"
SOURCE_DIR="${SOURCE_DIR:-$APP_DIR/source}"
APP_PORT="${APP_PORT:-3000}"
APP_ORIGIN="${APP_ORIGIN:-}"
JWT_SECRET="${JWT_SECRET:-}"
ALLOW_INSECURE_LOCAL_HTTP="${ALLOW_INSECURE_LOCAL_HTTP:-}"
COOKIE_SECURE="${COOKIE_SECURE:-}"
AI_ENABLE_N8N="${AI_ENABLE_N8N:-true}"
N8N_WEBHOOK_URL="${N8N_WEBHOOK_URL:-}"
N8N_PUBLIC_WEBHOOK_URL="${N8N_PUBLIC_WEBHOOK_URL:-}"
N8N_API_SECRET="${N8N_API_SECRET:-}"
N8N_WEBHOOK_TIMEOUT_MS="${N8N_WEBHOOK_TIMEOUT_MS:-20000}"
N8N_WEBHOOK_RETRIES="${N8N_WEBHOOK_RETRIES:-1}"
TRUST_PROXY_HEADERS="${TRUST_PROXY_HEADERS:-true}"
NETWORK_NAME="${NETWORK_NAME:-sisdmk2-network}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-sisdmk-postgres}"
POSTGRES_ADMIN_USER="${POSTGRES_ADMIN_USER:-}"
POSTGRES_DATABASE="${POSTGRES_DATABASE:-si_data}"
POSTGRES_DATABASES="${POSTGRES_DATABASES:-si_data}"
POSTGRES_USER="${POSTGRES_USER:-sisdmk_admin}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
POSTGRES_HOST="${POSTGRES_HOST:-$POSTGRES_CONTAINER}"
POSTGRES_HOSTS="${POSTGRES_HOSTS:-$POSTGRES_CONTAINER,host.docker.internal,172.17.0.1,postgres,db,127.0.0.1}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_CONNECT_TIMEOUT_MS="${POSTGRES_CONNECT_TIMEOUT_MS:-1500}"
POSTGRES_IDLE_TIMEOUT_MS="${POSTGRES_IDLE_TIMEOUT_MS:-30000}"
POSTGRES_POOL_MAX="${POSTGRES_POOL_MAX:-10}"
POSTGRES_POOL_VERIFY_INTERVAL_MS="${POSTGRES_POOL_VERIFY_INTERVAL_MS:-15000}"
POSTGRES_APPLICATION_NAME="${POSTGRES_APPLICATION_NAME:-sisdmk2-app}"
DASHBOARD_CACHE_TTL_MS="${DASHBOARD_CACHE_TTL_MS:-30000}"
DASHBOARD_DATA_CACHE_TTL_MS="${DASHBOARD_DATA_CACHE_TTL_MS:-30000}"
ENSURE_DATABASE="${ENSURE_DATABASE:-1}"
RESTORE_DUMP="${RESTORE_DUMP:-}"
RESTORE_USER="${RESTORE_USER:-}"
FORCE_ENV="${FORCE_ENV:-0}"
INSTALL_DEPS="${INSTALL_DEPS:-0}"

log() {
  printf '%s\n' "$*"
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'USAGE'
Deploy SI Kepegawaian dari GitHub langsung di CasaOS/DietPi.

Usage:
  sh scripts/deploy-casaos-github.sh [options]

Options:
  --repo-url URL              GitHub repo URL
  --branch NAME               Branch yang akan dideploy
  --app-dir PATH              Folder data app di CasaOS
  --app-port PORT             Port host untuk aplikasi, default 3000
  --app-origin URL            URL publik aplikasi, contoh https://info.kepegawaian.media
  --jwt-secret VALUE          JWT secret production
  --ai-enable-n8n true|false  Aktifkan bridge AI n8n, default true
  --n8n-webhook-url URL       Webhook n8n untuk chat internal
  --n8n-public-webhook-url URL Webhook n8n untuk chat publik
  --n8n-api-secret VALUE      Secret header x-ai-secret untuk n8n dan tool internal
  --n8n-webhook-timeout-ms MS Timeout webhook n8n, default 20000
  --n8n-webhook-retries N     Retry webhook n8n, default 1
  --trust-proxy-headers true|false Percaya header Cloudflare/proxy, default true
  --network-name NAME         Docker network untuk app dan PostgreSQL
  --postgres-container NAME   Nama container PostgreSQL, default sisdmk-postgres
  --postgres-admin-user NAME  User admin PostgreSQL untuk membuat database
  --postgres-database NAME    Nama database aplikasi, default si_data
  --postgres-user NAME        User database aplikasi, default sisdmk_admin
  --postgres-password VALUE   Password user database aplikasi
  --skip-db-create            Jangan buat database PostgreSQL otomatis
  --restore-dump PATH         Restore dump .sql/.tgz yang sudah ada di server
  --restore-user NAME         User PostgreSQL untuk restore dump
  --force-env                 Tulis ulang .env.casaos
  --install-deps              Install git/ca-certificates via apt jika belum ada
  -h, --help                  Tampilkan bantuan

Contoh:
  sh deploy-casaos-github.sh --install-deps --force-env --app-origin https://info.kepegawaian.media --restore-dump /DATA/Downloads/si_data.pg16.sql.tgz
USAGE
}

need_value() {
  [ $# -ge 2 ] || die "Argumen $1 butuh nilai."
}

while [ $# -gt 0 ]; do
  case "$1" in
    --repo-url)
      need_value "$@"
      REPO_URL="$2"
      shift 2
      ;;
    --branch)
      need_value "$@"
      BRANCH="$2"
      shift 2
      ;;
    --app-dir)
      need_value "$@"
      APP_DIR="$2"
      SOURCE_DIR="$APP_DIR/source"
      shift 2
      ;;
    --app-port)
      need_value "$@"
      APP_PORT="$2"
      shift 2
      ;;
    --app-origin)
      need_value "$@"
      APP_ORIGIN="$2"
      shift 2
      ;;
    --jwt-secret)
      need_value "$@"
      JWT_SECRET="$2"
      shift 2
      ;;
    --ai-enable-n8n)
      need_value "$@"
      AI_ENABLE_N8N="$2"
      shift 2
      ;;
    --n8n-webhook-url)
      need_value "$@"
      N8N_WEBHOOK_URL="$2"
      shift 2
      ;;
    --n8n-public-webhook-url)
      need_value "$@"
      N8N_PUBLIC_WEBHOOK_URL="$2"
      shift 2
      ;;
    --n8n-api-secret)
      need_value "$@"
      N8N_API_SECRET="$2"
      shift 2
      ;;
    --n8n-webhook-timeout-ms)
      need_value "$@"
      N8N_WEBHOOK_TIMEOUT_MS="$2"
      shift 2
      ;;
    --n8n-webhook-retries)
      need_value "$@"
      N8N_WEBHOOK_RETRIES="$2"
      shift 2
      ;;
    --trust-proxy-headers)
      need_value "$@"
      TRUST_PROXY_HEADERS="$2"
      shift 2
      ;;
    --network-name)
      need_value "$@"
      NETWORK_NAME="$2"
      shift 2
      ;;
    --postgres-container)
      need_value "$@"
      POSTGRES_CONTAINER="$2"
      POSTGRES_HOST="$POSTGRES_CONTAINER"
      POSTGRES_HOSTS="$POSTGRES_CONTAINER,host.docker.internal,172.17.0.1,postgres,db,127.0.0.1"
      shift 2
      ;;
    --postgres-admin-user)
      need_value "$@"
      POSTGRES_ADMIN_USER="$2"
      shift 2
      ;;
    --postgres-database)
      need_value "$@"
      POSTGRES_DATABASE="$2"
      POSTGRES_DATABASES="$2"
      shift 2
      ;;
    --postgres-user)
      need_value "$@"
      POSTGRES_USER="$2"
      shift 2
      ;;
    --postgres-password)
      need_value "$@"
      POSTGRES_PASSWORD="$2"
      shift 2
      ;;
    --skip-db-create)
      ENSURE_DATABASE="0"
      shift
      ;;
    --restore-dump)
      need_value "$@"
      RESTORE_DUMP="$2"
      shift 2
      ;;
    --restore-user)
      need_value "$@"
      RESTORE_USER="$2"
      shift 2
      ;;
    --force-env)
      FORCE_ENV="1"
      shift
      ;;
    --install-deps)
      INSTALL_DEPS="1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Argumen tidak dikenal: $1"
      ;;
  esac
done

install_deps() {
  [ "$INSTALL_DEPS" = "1" ] || return 0
  command -v apt-get >/dev/null 2>&1 || die "apt-get tidak tersedia untuk --install-deps."

  missing=""
  command -v git >/dev/null 2>&1 || missing="$missing git"
  [ -d /etc/ssl/certs ] || missing="$missing ca-certificates"

  if [ -n "$missing" ]; then
    log "Menginstall dependency:$missing"
    apt-get update
    apt-get install -y $missing
  fi
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Command '$1' tidak ditemukan."
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32
    return
  fi

  if [ -r /dev/urandom ]; then
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | dd bs=48 count=1 2>/dev/null
    printf '\n'
    return
  fi

  date +%s | sha256sum | awk '{print $1}'
}

docker_compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    die "Docker Compose tidak ditemukan."
  fi
}

detect_app_origin() {
  host_ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  if [ -z "$host_ip" ]; then
    host_ip="127.0.0.1"
  fi
  printf 'http://%s:%s\n' "$host_ip" "$APP_PORT"
}

write_env_file() {
  env_file="$APP_DIR/.env.casaos"

  if [ "$FORCE_ENV" != "1" ] && [ -f "$env_file" ]; then
    log "Memakai env yang sudah ada: $env_file"
    return
  fi

  if [ -z "$APP_ORIGIN" ]; then
    APP_ORIGIN="$(detect_app_origin)"
  fi

  if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET="$(generate_secret)"
  fi

  if [ -z "$POSTGRES_PASSWORD" ]; then
    POSTGRES_PASSWORD="$(generate_secret)"
  fi

  if [ -z "$COOKIE_SECURE" ]; then
    case "$APP_ORIGIN" in
      https://*) COOKIE_SECURE="true" ;;
      *) COOKIE_SECURE="false" ;;
    esac
  fi

  if [ -z "$ALLOW_INSECURE_LOCAL_HTTP" ]; then
    case "$APP_ORIGIN" in
      https://*) ALLOW_INSECURE_LOCAL_HTTP="false" ;;
      *) ALLOW_INSECURE_LOCAL_HTTP="true" ;;
    esac
  fi

  mkdir -p "$APP_DIR"
  umask 077
  cat > "$env_file" <<ENV
APP_PORT=$APP_PORT
JWT_SECRET=$JWT_SECRET
APP_URL=$APP_ORIGIN
APP_ORIGIN=$APP_ORIGIN
ALLOW_INSECURE_LOCAL_HTTP=$ALLOW_INSECURE_LOCAL_HTTP
COOKIE_SECURE=$COOKIE_SECURE
TRUST_PROXY_HEADERS=$TRUST_PROXY_HEADERS
AI_ENABLE_N8N=$AI_ENABLE_N8N
N8N_WEBHOOK_URL=$N8N_WEBHOOK_URL
N8N_PUBLIC_WEBHOOK_URL=$N8N_PUBLIC_WEBHOOK_URL
N8N_API_SECRET=$N8N_API_SECRET
N8N_WEBHOOK_TIMEOUT_MS=$N8N_WEBHOOK_TIMEOUT_MS
N8N_WEBHOOK_RETRIES=$N8N_WEBHOOK_RETRIES
POSTGRES_HOST=$POSTGRES_HOST
POSTGRES_HOSTS=$POSTGRES_HOSTS
POSTGRES_PORT=$POSTGRES_PORT
POSTGRES_DATABASE=$POSTGRES_DATABASE
POSTGRES_DATABASES=$POSTGRES_DATABASES
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_CONNECT_TIMEOUT_MS=$POSTGRES_CONNECT_TIMEOUT_MS
POSTGRES_IDLE_TIMEOUT_MS=$POSTGRES_IDLE_TIMEOUT_MS
POSTGRES_POOL_MAX=$POSTGRES_POOL_MAX
POSTGRES_POOL_VERIFY_INTERVAL_MS=$POSTGRES_POOL_VERIFY_INTERVAL_MS
POSTGRES_APPLICATION_NAME=$POSTGRES_APPLICATION_NAME
DASHBOARD_CACHE_TTL_MS=$DASHBOARD_CACHE_TTL_MS
DASHBOARD_DATA_CACHE_TTL_MS=$DASHBOARD_DATA_CACHE_TTL_MS
ENV

  log "Menulis env: $env_file"
}

sync_source() {
  mkdir -p "$APP_DIR"

  if [ -d "$SOURCE_DIR/.git" ]; then
    log "Update source dari GitHub: $SOURCE_DIR"
    cd "$SOURCE_DIR"
    git remote set-url origin "$REPO_URL"
    git fetch --prune origin

    if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
      git checkout "$BRANCH"
    else
      git checkout -b "$BRANCH" "origin/$BRANCH"
    fi

    git pull --ff-only origin "$BRANCH"
  else
    if [ -e "$SOURCE_DIR" ]; then
      die "$SOURCE_DIR sudah ada tapi bukan repo git."
    fi

    log "Clone source dari GitHub ke $SOURCE_DIR"
    git clone --branch "$BRANCH" "$REPO_URL" "$SOURCE_DIR"
    cd "$SOURCE_DIR"
  fi
}

connect_postgres_network() {
  docker network inspect "$NETWORK_NAME" >/dev/null 2>&1 || docker network create "$NETWORK_NAME" >/dev/null

  if docker ps -a --format '{{.Names}}' | grep -qx "$POSTGRES_CONTAINER"; then
    docker network connect "$NETWORK_NAME" "$POSTGRES_CONTAINER" >/dev/null 2>&1 || true
  else
    log "Peringatan: container PostgreSQL '$POSTGRES_CONTAINER' tidak ditemukan."
  fi
}

postgres_can_connect() {
  candidate_user="$1"
  candidate_db="$2"
  docker exec "$POSTGRES_CONTAINER" psql -U "$candidate_user" -d "$candidate_db" -tAc "SELECT 1" >/dev/null 2>&1
}

pick_admin_user() {
  for candidate in "$POSTGRES_ADMIN_USER" "$POSTGRES_USER" sisdmk_admin postgres; do
    [ -n "$candidate" ] || continue
    if postgres_can_connect "$candidate" postgres || postgres_can_connect "$candidate" "$POSTGRES_DATABASE"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

ensure_postgres_database() {
  [ "$ENSURE_DATABASE" = "1" ] || return 0

  if ! docker ps -a --format '{{.Names}}' | grep -qx "$POSTGRES_CONTAINER"; then
    log "Peringatan: database tidak dibuat karena container PostgreSQL '$POSTGRES_CONTAINER' tidak ditemukan."
    return 0
  fi

  if postgres_can_connect "$POSTGRES_USER" "$POSTGRES_DATABASE"; then
    log "Database PostgreSQL '$POSTGRES_DATABASE' sudah bisa diakses oleh user '$POSTGRES_USER'."
    return 0
  fi

  admin_user="$(pick_admin_user || true)"
  if [ -z "$admin_user" ]; then
    die "Tidak bisa login ke PostgreSQL. Coba jalankan dengan --postgres-admin-user USER_ADMIN_YANG_BENAR."
  fi

  admin_db="postgres"
  if ! postgres_can_connect "$admin_user" "$admin_db"; then
    admin_db="$POSTGRES_DATABASE"
  fi

  sql_password="$(printf '%s' "$POSTGRES_PASSWORD" | sed "s/'/''/g")"

  log "Memastikan database PostgreSQL '$POSTGRES_DATABASE' dan user '$POSTGRES_USER' tersedia..."
  docker exec -i "$POSTGRES_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$admin_user" -d "$admin_db" <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$POSTGRES_USER') THEN
    CREATE ROLE "$POSTGRES_USER" LOGIN PASSWORD '$sql_password';
  ELSE
    ALTER ROLE "$POSTGRES_USER" WITH LOGIN PASSWORD '$sql_password';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE "$POSTGRES_DATABASE" OWNER "$POSTGRES_USER"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$POSTGRES_DATABASE')\gexec

GRANT ALL PRIVILEGES ON DATABASE "$POSTGRES_DATABASE" TO "$POSTGRES_USER";
SQL
}

extract_restore_sql() {
  dump_path="$1"
  tmp_dir="$2"

  case "$dump_path" in
    *.tgz|*.tar.gz)
      tar -xzf "$dump_path" -C "$tmp_dir"
      find "$tmp_dir" -type f -name '*.sql' | head -n 1
      ;;
    *.sql)
      printf '%s\n' "$dump_path"
      ;;
    *)
      die "Format dump tidak dikenal. Pakai .sql, .tgz, atau .tar.gz."
      ;;
  esac
}

restore_dump() {
  [ -n "$RESTORE_DUMP" ] || return 0
  [ -f "$RESTORE_DUMP" ] || die "File dump tidak ditemukan: $RESTORE_DUMP"

  if ! docker ps -a --format '{{.Names}}' | grep -qx "$POSTGRES_CONTAINER"; then
    die "Container PostgreSQL '$POSTGRES_CONTAINER' tidak ditemukan untuk restore."
  fi

  restore_user="$RESTORE_USER"
  if [ -z "$restore_user" ]; then
    restore_user="$POSTGRES_ADMIN_USER"
  fi
  if [ -z "$restore_user" ]; then
    restore_user="$POSTGRES_USER"
  fi

  tmp_dir="/tmp/sisdmk2-restore-$$"
  mkdir -p "$tmp_dir"
  sql_file="$(extract_restore_sql "$RESTORE_DUMP" "$tmp_dir")"
  [ -n "$sql_file" ] && [ -f "$sql_file" ] || die "File SQL tidak ditemukan di dump: $RESTORE_DUMP"

  log "Restore dump ke database '$POSTGRES_DATABASE' dari $sql_file"
  docker cp "$sql_file" "$POSTGRES_CONTAINER:/tmp/sisdmk2_restore.sql"
  docker exec -i "$POSTGRES_CONTAINER" psql -U "$restore_user" -d "$POSTGRES_DATABASE" -v ON_ERROR_STOP=1 -f /tmp/sisdmk2_restore.sql
  docker exec "$POSTGRES_CONTAINER" rm -f /tmp/sisdmk2_restore.sql >/dev/null 2>&1 || true
  rm -rf "$tmp_dir"
}

check_app() {
  tries=1
  while [ "$tries" -le 12 ]; do
    if docker exec sisdmk2-app npm run check:postgres; then
      return 0
    fi

    log "Aplikasi belum berhasil konek database, coba lagi dalam 5 detik ($tries/12)..."
    tries=$((tries + 1))
    sleep 5
  done

  die "Cek koneksi PostgreSQL dari app gagal."
}

install_deps
require_command git
require_command docker

sync_source
write_env_file
cp "$APP_DIR/.env.casaos" "$SOURCE_DIR/.env.casaos"
cp "$APP_DIR/.env.casaos" "$SOURCE_DIR/.env"

connect_postgres_network
ensure_postgres_database
restore_dump

log "Build dan start container..."
cd "$SOURCE_DIR"
docker_compose -f docker-compose.casaos.yml up -d --build

check_app

docker ps --filter "name=sisdmk2-app" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
log "Deploy selesai: $APP_ORIGIN"
