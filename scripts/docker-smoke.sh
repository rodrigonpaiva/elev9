#!/usr/bin/env bash

set -euo pipefail

readonly api_container="elev9-api"
readonly base_url="http://localhost:3000"

echo "[Smoke] Starting Docker runtime"
docker compose up -d --build

for endpoint in "/health" "/health/ready"; do
  echo "[Smoke] Waiting for ${endpoint}"

  for attempt in $(seq 1 30); do
    if curl --fail --silent --show-error "${base_url}${endpoint}" >/dev/null; then
      echo "[Smoke] ${endpoint} responded successfully"
      break
    fi

    if [[ "${attempt}" -eq 30 ]]; then
      echo "[Smoke] ${endpoint} did not become healthy in time"
      docker logs "${api_container}" || true
      exit 1
    fi

    sleep 2
  done
done

echo "[Smoke] Docker runtime smoke check passed"
