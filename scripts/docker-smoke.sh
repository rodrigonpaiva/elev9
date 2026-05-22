#!/usr/bin/env bash
set -euo pipefail

compose() {
  docker compose "$@"
}

check_health() {
  curl -fsS --max-time 3 "$1" >/dev/null 2>&1
}

cleanup() {
  local exit_code=$?

  compose down --remove-orphans >/dev/null 2>&1 || true

  exit "$exit_code"
}

trap cleanup EXIT

echo "Starting Docker runtime..."
compose up -d --build >/dev/null

echo "Waiting for API readiness..."
ready=false
for _ in $(seq 1 30); do
  if check_health http://127.0.0.1:3000/health/ready; then
    ready=true
    break
  fi

  sleep 2
done

if [ "$ready" != "true" ]; then
  echo "API readiness check timed out."
  compose logs api --no-color
  exit 1
fi

if ! check_health http://127.0.0.1:3000/health; then
  echo "API liveness check failed."
  compose logs api --no-color
  exit 1
fi

if ! check_health http://127.0.0.1:3000/health/ready; then
  echo "API readiness check failed."
  compose logs api --no-color
  exit 1
fi

echo "API ready."
echo "Smoke validation passed."
