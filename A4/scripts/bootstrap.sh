#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -f "${ROOT_DIR}/config/.env" ]]; then
  cp "${ROOT_DIR}/config/.env.example" "${ROOT_DIR}/config/.env"
  echo "Created ${ROOT_DIR}/config/.env from template."
fi

docker compose -f "${ROOT_DIR}/docker-compose.yml" --env-file "${ROOT_DIR}/config/.env" up -d --build
echo "A4 stack is starting. Run: docker compose -f ${ROOT_DIR}/docker-compose.yml ps"
