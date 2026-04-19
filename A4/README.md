# A4 Capstone: Scaling, Hardening, and Operating a Polyglot Microservices System

This A4 package is fully self-contained under `A4/` (source, scripts, configs, and documentation).

## Capstone Scope

This capstone demonstrates a production-style operating story for a polyglot system:

- **Services (4 app services, 2 languages):**
  - `services/node-sensor-service` (Node.js/Express)
  - `services/python-sensor-service` (Python/FastAPI)
  - `services/node-command-service` (Node.js/Express)
  - `services/python-command-service` (Python/FastAPI)
- **Supporting infrastructure:**
  - PostgreSQL databases (database-per-service)
  - RabbitMQ event bus
  - Jaeger for distributed traces
- **Mission command web app (core deliverable):**
  - `ui/mission-command-ui` (React + TypeScript)
  - Hybrid data model: real health telemetry + simulated mission stream

This report covers architecture review, scaling, failure testing, security, observability, and final analysis.

## Repository Layout (A4 Only)

- `A4/docker-compose.yml`: runtime topology for services + observability
- `A4/services/`: all backend source code used for A4
- `A4/ui/mission-command-ui/`: command web app source
- `A4/scripts/`: repeatable scaling/load/chaos scripts
- `A4/config/`: env template + security notes
- `A4/diagrams/`: architecture/security/observability diagrams
- `A4/logs/`: command and experiment outputs
- `A4/screenshots/`: dashboard and runtime evidence captures
- `A4/architecture-review.md`: architecture assessment
- `A4/asset-inventory.md`: A2/A3 reuse mapping

## Architecture Summary

System-level architecture is documented in:

- `diagrams/system-view.mmd`
- `diagrams/traffic-scaling.mmd`
- `diagrams/security-before.mmd`
- `diagrams/security-after.mmd`
- `diagrams/observability-flow.mmd`

Design highlights:

- Stateless API layers are horizontally scalable.
- Data durability remains in Postgres and RabbitMQ.
- Sync + async communication paths expose realistic bottlenecks under stress.
- Explicit backpressure controls are added to `node-command-service`.

## Running the A4 Stack

1. Copy environment template:
   - `cp A4/config/.env.example A4/config/.env`
2. Set secure API key in `.env`.
3. Start stack:
   - `bash A4/scripts/bootstrap.sh`
   - **Host ports:** `command-lb` (nginx, see `A4/nginx/command-lb.conf`) publishes **3001** and load-balances across `node-command-service` replicas so `docker compose --scale node-command-service=3` does not collide on the host. `node-sensor-service` publishes **3000** for local load tests and `curl` metrics.
4. Verify health:
   - `curl -s http://localhost:3001/health`
   - `curl -s http://localhost:3000/health`
5. Optional observability checks:
   - `http://localhost:16686` (Jaeger)
   - `http://localhost:3001/metrics`
   - `http://localhost:3000/metrics`

## Horizontal Scaling Experiment

### Setup

- Target service for scaling: `node-command-service`
- Baseline: 1 replica
- Scaled run: 3 replicas (`docker compose ... --scale node-command-service=3`)
- Script: `scripts/scale_experiment.sh`

### Collected Measurements

For each of **small/medium/large** dataset sizes, collect:

- throughput (events/s)
- latency p50/p90
- failure rate
- CPU/memory (`docker stats` snapshots)
- queue backlog proxy and service logs

Artifacts:

- `logs/baseline-*.json`
- `logs/scaled-*.json`
- `logs/baseline-ps.txt`, `logs/scaled-ps.txt`
- `logs/node-command-service-scaled.log`

### Why Results Change

Expected behavior after scaling:

- improved throughput when command API is the bottleneck
- improved p50 latency under parallel request load
- p90 may still rise if DB or sensor dependency becomes dominant

If scaled results are not better, likely causes:

- DB contention moved bottleneck downstream
- write-heavy routes constrained by explicit backpressure policy
- burst profile exceeds configured write queue limits

## Failure and Chaos Testing

Script: `scripts/chaos_test.sh`

### Scenario A: Kill command replica under load

- **Prediction:** p90 latency rises; service remains partially available.
- **Action:** kill one `node-command-service` instance during request run.
- **Evidence:** `logs/chaos-after-kill.json`, `logs/chaos-after-kill.log`
- **Interpretation:** confirms partial resilience and load-balancer failover behavior.

### Scenario B: Stop command DB temporarily

- **Prediction:** command routes return errors/degraded responses and queue waits increase.
- **Action:** stop `node-command-db` during run, then restore.
- **Evidence:** `logs/chaos-db-down.json`, `logs/chaos-db-recovered.json`, logs
- **Interpretation:** validates failure surface at stateful layer and recovery behavior.

### Mitigation Demonstrated

Explicit backpressure configuration in `node-command-service`:

- `BACKPRESSURE_MAX_CONCURRENT_WRITES`
- `BACKPRESSURE_MAX_PENDING_WRITES`
- `BACKPRESSURE_OVERLOAD_STRATEGY` (`delay`/`fail-fast`/`drop`)
- `BACKPRESSURE_MAX_QUEUE_WAIT_MS`

Re-run Scenario B after tuning these values to show reduced collapse behavior.

## Security Enhancements

### 1) Restricted ingress topology

- `node-command-service` is the primary exposed app service.
- Sensor services and databases stay internal.
- Before/after architecture captured in:
  - `diagrams/security-before.mmd`
  - `diagrams/security-after.mmd`

Why it matters:

- Reduces blast radius and enforces boundary control.

### 2) Secrets and secure headers

- API tokens moved to `config/.env`.
- Browser security headers set in Node services:
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - optional HSTS

Why it matters:

- Improves credential hygiene and baseline HTTP hardening.

See `config/security-hardening.md` for details.

## Observability Deep Dive

### Implemented telemetry

- Structured JSON logs with correlation IDs (existing + preserved).
- Metrics endpoints:
  - `a2_command_http_requests_total`
  - `a2_command_http_request_duration_seconds`
  - `a4_sensor_http_requests_total`
  - `a4_sensor_http_request_duration_seconds`
- Distributed tracing:
  - Node command + node sensor export traces to Jaeger OTLP endpoint.
  - Correlation ID forwarded from command service to sensor service in sync/async calls.

### Incident Debugging Narrative

Incident: latency spikes and rising write queue depth during medium/high load.

1. **Detection:** metrics show p90 growth and increasing queue backlog proxy.
2. **Trace analysis:** Jaeger spans identify slow path concentrated around dependency and DB-bound calls.
3. **Log correlation:** correlation IDs connect command and sensor request chains, showing repeated delayed write routes.
4. **Confirmation:** tuning max concurrent/pending writes stabilizes error rate and reduces tail latency amplification.

This root-cause path relies on telemetry evidence rather than assumptions.

## Load Test Matrix and Analysis

Run these from A4:

- small: `python3 scripts/run_load_test.py --dataset-size 50 --token ... --output logs/small.json`
- medium: `python3 scripts/run_load_test.py --dataset-size 150 --token ... --output logs/medium.json`
- large: `python3 scripts/run_load_test.py --dataset-size 300 --token ... --output logs/large.json`

For each run, record:

- throughput
- p50/p90 latency
- CPU/memory snapshots
- failure rate
- queue backlog indicators

### Analysis expectations (required)

- Explain *why* each metric pattern appears (causality).
- Call out anomalies (counter mismatch, spikes, transient drops) and validate with logs/metrics.
- Include repeatability notes:
  - number of runs
  - variance/range
  - outlier handling (if any)
- State apples-to-apples caveats explicitly when architecture differs between compared paths.

## Mission Command Web App (Core Deliverable)

Path: `ui/mission-command-ui`

Purpose:

- Provide commander/analyst operational view.
- Use hybrid data:
  - real health telemetry from live services
  - optional live alerts + observability from `node-command-service`, or simulated mission stream from the UI (`simulation.ts`)

Operator value:

- Correlates mission incidents with backend health posture.
- Supports finals demo story: detection, impact, response, and recovery.

### Run UI

```bash
cd A4/ui/mission-command-ui
npm install
npm run dev
```

Optional environment variables (see `ui/mission-command-ui/README.md`):

- `VITE_COMMAND_BASE_URL` (default `http://localhost:3001`; use `/api/command` with Vite dev proxy)
- `VITE_SENSOR_BASE_URL` (default `http://localhost:3000`; use `/api/sensor` with Vite dev proxy)
- `VITE_USE_LIVE_MISSION_DATA` (`true` to poll `/alerts` and `/observability/summary` instead of frontend simulation)

## Finals Demo Runbook

1. Start stack with `scripts/bootstrap.sh`.
2. Open mission UI and verify live health updates.
3. Run baseline load test (small/medium/large) and capture metrics.
4. Scale command service to 3 replicas and re-run same tests.
5. Inject chaos scenario A (kill replica), show partial availability.
6. Inject chaos scenario B (DB down), show degraded behavior and recovery.
7. Walk through Jaeger traces and metrics to explain root cause.
8. Show security boundary diagram and `.env` token handling.
9. Conclude with tradeoffs and next refactors.

## What Worked Well

- Polyglot architecture remains operable under controlled stress.
- Explicit backpressure controls provide configurable overload behavior.
- Telemetry stack enables faster root cause isolation.
- Mission UI makes system state legible to non-developer operators.

## What to Improve Next

- Replace in-memory limiter state with distributed control for cross-replica fairness.
- Add persistent queue depth metric from broker management API.
- Expand role separation from UI mode to backend authorization policies.
- Add CI chaos regression tests and SLO budget checks.

---

## Final Pre-Submission Checklist

- [ ] A4 contains all source code required for capstone execution.
- [ ] Capstone hard gates are demonstrated: 3-5 services, 2+ languages, observability, security, resilience, written paper, demo runbook.
- [ ] Baseline and scaled results are captured with equivalent load profiles.
- [ ] Replica evidence and traffic distribution evidence are recorded.
- [ ] Two failure scenarios include prediction, observed outcome, and mitigation rerun.
- [ ] Security before/after diagrams and rationale are included.
- [ ] Telemetry evidence includes logs, metrics, and cross-service traces.
- [ ] Every chart/table includes a short “why this happened” explanation.
- [ ] Anomalies are explicitly explained using evidence.
- [ ] Backpressure is explicit and configurable:
  - [ ] consumer throttling controls
  - [ ] queue limits / overflow strategy
  - [ ] overload policy (delay, fail-fast, drop)
- [ ] Backpressure tradeoffs are discussed (throughput vs latency vs data-loss risk).
- [ ] Statistical rigor is documented (repeat runs, p50/p90, variance/range).
- [ ] Any async-vs-sync comparison includes apples-to-apples caveats where needed.
- [ ] Rubric categories map to concrete artifacts (logs, screenshots, scripts, config, diagrams).
- [ ] Known limitations and next improvements are evidence-backed.
