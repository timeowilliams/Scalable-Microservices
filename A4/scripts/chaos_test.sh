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

echo "Preparing stack for chaos run..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --build

echo "Scenario A prediction: killing one command replica should increase p90 latency but keep partial availability."
echo "Scenario A prediction: killing one command replica should increase p90 latency but keep partial availability." > "${LOG_DIR}/chaos-scenario-a-prediction.txt"

docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --scale node-command-service=3 node-command-service
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps > "${LOG_DIR}/chaos-before-kill.txt"
CMD_ONE="$(docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps -q node-command-service | head -n 1)"
if [[ -z "${CMD_ONE}" ]]; then
  echo "No node-command-service replicas running"
  exit 1
fi
# Kill one replica only (compose kill <service> stops every replica and breaks later scenarios).
docker kill "${CMD_ONE}"
sleep 5
python3 "${ROOT_DIR}/scripts/run_load_test.py" --dataset-size 120 --token "${API_KEY}" --output "${LOG_DIR}/chaos-after-kill.json"
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" logs node-command-service > "${LOG_DIR}/chaos-after-kill.log"
echo "Restoring command replica fleet before DB chaos..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --scale node-command-service=3 node-command-service
sleep 8

echo "Scenario B prediction: stopping command DB should trigger 5xx and increased queueing while service remains up."
echo "Scenario B prediction: stopping command DB should trigger 5xx and increased queueing while service remains up." > "${LOG_DIR}/chaos-scenario-b-prediction.txt"

docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" stop node-command-db
sleep 3
python3 "${ROOT_DIR}/scripts/run_load_test.py" --dataset-size 80 --token "${API_KEY}" --output "${LOG_DIR}/chaos-db-down.json"
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" logs node-command-service > "${LOG_DIR}/chaos-db-down.log"

echo "Recovering DB and validating mitigation behavior..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" start node-command-db
sleep 8
python3 "${ROOT_DIR}/scripts/run_load_test.py" --dataset-size 80 --token "${API_KEY}" --output "${LOG_DIR}/chaos-db-recovered.json"

echo "Collecting metrics snapshots..."
curl -s http://localhost:3001/metrics > "${LOG_DIR}/metrics-node-command.prom" || true
curl -s http://localhost:3000/metrics > "${LOG_DIR}/metrics-node-sensor.prom" || true

echo "Chaos test run completed. Review ${LOG_DIR}/chaos-*.json and *.log."
