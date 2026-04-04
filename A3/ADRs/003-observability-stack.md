# ADR-003: Observability Stack (JSON Logs, Prometheus Metrics, OpenTelemetry → Jaeger)

## Status

Accepted

## Context

Assignment 3 requires **observability** evidence: structured logs, metrics, and distributed traces, while keeping the **default path** runnable in Docker with minimal manual wiring.

We need to decide:

- Log format and destination
- How to expose **metrics** without requiring a full Prometheus server for local runs
- How to make **traces** optional or sampleable so large benchmarks do not overwhelm the exporter

## Decision

1. **Structured logging** — Python logging emits **JSON lines** to stdout (e.g. `run_complete`, `validation_failed`, `db_error`) with fields such as `mode`, `dataset`, `duration_s`, `events_per_s`, and alert counts. Logger namespace: `a3.pipeline`.

2. **Metrics** — **`prometheus_client`** registers counters and histograms (prefix `a3_pipeline_*`) for stages, errors, and alerts. The process exposes the standard Prometheus scrape pattern suitable for demos; scraping a live Prometheus instance is optional for the assignment.

3. **Traces** — **OpenTelemetry** instruments stage boundaries (`validate`, `normalize`, `analyze`, `persist`, `alert`). Export uses **OTLP gRPC**. If **`OTEL_EXPORTER_OTLP_ENDPOINT`** is unset or empty after stripping, **no OTLP export** is configured (traces in-process only / no exporter spam).

4. **Local trace backend** — **Docker Compose** includes **Jaeger** with OTLP on **4317** and UI on **16686**, aligned with the default endpoint in compose for the `pipeline` service.

5. **Sampling** — **`OTEL_TRACES_SAMPLE_RATIO`** (default `1.0`) reduces span volume for **large** dataset runs.

### Rationale

1. **JSON logs** parse cleanly in CI, Docker, and ELK-style stacks
2. **Prometheus** is the de facto metrics lingua franca for services
3. **OTLP → Jaeger** is a standard, reproducible student path without vendor lock-in
4. **Optional OTLP** keeps offline or DB-only runs simple

## Consequences

**Positive:**

- Single compose stack demonstrates **logs + metrics + traces**
- Easy to capture screenshots (Jaeger UI) and log lines for the write-up

**Negative:**

- Three parallel telemetry paths increase dependencies and startup cost
- Misconfigured sampling on huge runs can still stress Jaeger; operators should lower `OTEL_TRACES_SAMPLE_RATIO`

## Implementation

- `pipeline/observability.py` — logging setup, metrics, OTel tracer provider and OTLP guard
- `A3/docker-compose.yml` — `jaeger`, `postgres`, `pipeline` services

## References

- [OpenTelemetry Python](https://opentelemetry.io/docs/languages/python/)
- [Jaeger OTLP](https://www.jaegertracing.io/docs/latest/apis/#opentelemetry-protocol-stable)
