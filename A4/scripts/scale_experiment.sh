#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.yml"
ENV_FILE="${ROOT_DIR}/config/.env"
LOG_DIR="${ROOT_DIR}/logs"

mkdir -p "${LOG_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Copy config/.env.example first."
  exit 1
fi

API_KEY="$(sed -n 's/^API_KEY=//p;q' "${ENV_FILE}")"

echo "Starting baseline stack..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --build
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps > "${LOG_DIR}/baseline-ps.txt"

echo "Running baseline small/medium/large load tests..."
python3 "${ROOT_DIR}/scripts/run_load_test.py" --dataset-size 50 --token "${API_KEY}" --output "${LOG_DIR}/baseline-small.json"
python3 "${ROOT_DIR}/scripts/run_load_test.py" --dataset-size 150 --token "${API_KEY}" --output "${LOG_DIR}/baseline-medium.json"
python3 "${ROOT_DIR}/scripts/run_load_test.py" --dataset-size 300 --token "${API_KEY}" --output "${LOG_DIR}/baseline-large.json"

echo "Scaling node-command-service to 3 replicas..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --scale node-command-service=3 node-command-service
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps > "${LOG_DIR}/scaled-ps.txt"

echo "Running scaled small/medium/large load tests..."
python3 "${ROOT_DIR}/scripts/run_load_test.py" --dataset-size 50 --token "${API_KEY}" --output "${LOG_DIR}/scaled-small.json"
python3 "${ROOT_DIR}/scripts/run_load_test.py" --dataset-size 150 --token "${API_KEY}" --output "${LOG_DIR}/scaled-medium.json"
python3 "${ROOT_DIR}/scripts/run_load_test.py" --dataset-size 300 --token "${API_KEY}" --output "${LOG_DIR}/scaled-large.json"

echo "Capturing command-service logs for load-balancing evidence..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" logs node-command-service > "${LOG_DIR}/node-command-service-scaled.log"

echo "Scale experiment complete. Outputs are in ${LOG_DIR}."
