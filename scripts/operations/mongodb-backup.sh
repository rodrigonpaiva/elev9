#!/usr/bin/env bash

set -euo pipefail

die() {
  echo "[Mongo backup] configuration error: $1" >&2
  exit 2
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required on the authorized host"
}

environment="${BACKUP_ENVIRONMENT:-}"
database="${BACKUP_DATABASE:-}"
output_dir="${BACKUP_OUTPUT_DIR:-}"
uri="${MONGODB_URI:-}"

[[ -n "$environment" ]] || die "BACKUP_ENVIRONMENT is required"
[[ -n "$database" ]] || die "BACKUP_DATABASE is required"
[[ -n "$output_dir" ]] || die "BACKUP_OUTPUT_DIR is required"
[[ -n "$uri" ]] || die "MONGODB_URI must be supplied through the environment"

case "$environment" in
  development|test|ci|preproduction)
    ;;
  production)
    [[ "${CONFIRM_PRODUCTION_BACKUP:-}" == "I_UNDERSTAND_BACKUP_PRODUCTION" ]] \
      || die "production backup requires explicit confirmation"
    ;;
  *)
    die "BACKUP_ENVIRONMENT must be development, test, ci, preproduction or production"
    ;;
esac

[[ "$database" =~ ^[A-Za-z0-9_-]+$ ]] || die "BACKUP_DATABASE contains unsupported characters"
[[ "$output_dir" = /* ]] || die "BACKUP_OUTPUT_DIR must be an absolute path"
[[ ! -e "$output_dir" ]] || die "BACKUP_OUTPUT_DIR already exists; refusing to overwrite"

require_command mongodump
umask 077
mkdir -p "$output_dir"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="$output_dir/${database}-${timestamp}.archive.gz"

# Do not enable shell tracing. The URI is intentionally never printed.
mongodump --quiet --uri="$uri" --db="$database" --archive="$archive" --gzip

cat >"$output_dir/manifest.txt" <<EOF
backup_format=mongodump_archive_gzip
environment=$environment
database=$database
created_at=$timestamp
archive=$(basename "$archive")
EOF

echo "[Mongo backup] completed: $(basename "$archive")"
