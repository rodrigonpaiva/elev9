#!/usr/bin/env bash

set -euo pipefail

die() {
  echo "[Mongo restore] configuration error: $1" >&2
  exit 2
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required on the authorized host"
}

environment="${RESTORE_ENVIRONMENT:-}"
archive="${RESTORE_ARCHIVE:-}"
source_database="${RESTORE_SOURCE_DATABASE:-}"
target_database="${RESTORE_DATABASE:-}"
uri="${MONGODB_URI:-}"

[[ "$environment" == "isolated-test" ]] || die "RESTORE_ENVIRONMENT must be isolated-test"
[[ -f "$archive" ]] || die "RESTORE_ARCHIVE must point to an existing archive"
[[ -n "$source_database" ]] || die "RESTORE_SOURCE_DATABASE is required"
[[ "$target_database" =~ ^restore_[a-z0-9_-]+$ ]] \
  || die "RESTORE_DATABASE must start with restore_"
[[ -n "$uri" ]] || die "MONGODB_URI must be supplied through the environment"
[[ "${RESTORE_ALLOW_DROP:-}" == "YES_ISOLATED_TEST_ONLY" ]] \
  || die "isolated restore requires explicit disposable-database confirmation"

[[ "$source_database" =~ ^[A-Za-z0-9_-]+$ ]] \
  || die "RESTORE_SOURCE_DATABASE contains unsupported characters"

require_command mongorestore

# The target is constrained to an isolated restore_* database. Production and
# arbitrary database names are rejected before mongorestore is invoked.
mongorestore \
  --quiet \
  --uri="$uri" \
  --archive="$archive" \
  --gzip \
  --nsInclude="${source_database}.*" \
  --nsFrom="${source_database}.*" \
  --nsTo="${target_database}.*" \
  --drop

echo "[Mongo restore] completed into isolated database: $target_database"
