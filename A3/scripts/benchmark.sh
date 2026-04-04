#!/usr/bin/env bash
# Run full benchmark inside Docker (from repo: A3/). Requires Docker Compose v2.
set -euo pipefail
cd "$(dirname "$0")/.."

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-a3-pipeline}"

echo "Starting Postgres + Jaeger..."
docker compose up -d postgres jaeger
sleep 4

echo "Building pipeline image..."
docker compose build pipeline

rm -f results/benchmark.csv

for SIZE in small medium large; do
  echo "=== Dataset: ${SIZE} ==="
  docker compose run --rm --no-deps pipeline \
    python -m pipeline generate --size "${SIZE}" --output "/app/data/${SIZE}.jsonl"

  docker compose run --rm \
    -e BENCHMARK_CSV=/app/results/benchmark.csv \
    -e BENCHMARK_SUMMARY=/app/results/summary_blocking_"${SIZE}".json \
    pipeline \
    python -m pipeline run-blocking --dataset "/app/data/${SIZE}.jsonl"

  docker compose run --rm \
    -e BENCHMARK_CSV=/app/results/benchmark.csv \
    -e BENCHMARK_SUMMARY=/app/results/summary_reactive_"${SIZE}".json \
    pipeline \
    python -m pipeline run-reactive --dataset "/app/data/${SIZE}.jsonl"
done

echo "Plotting charts..."
docker compose run --rm --no-deps pipeline \
  python /app/scripts/plot_results.py /app/results/benchmark.csv --out-dir /app/results

echo "Done. See results/benchmark.csv and results/*.png"
