# A4 Reusable Asset Inventory

This inventory captures concrete A2/A3 assets reused for A4 implementation.

## A2 Runtime and Services

- `A2/docker-compose.yml`: baseline four-service polyglot system, Postgres per service, RabbitMQ.
- `A2/node-service/`: Node.js sensor service (Express + PostgreSQL + RabbitMQ publisher).
- `A2/python-service/`: Python sensor service (FastAPI + PostgreSQL + RabbitMQ publisher).
- `A2/command-node-service/`: Node.js command and control service (Express + rate limiting + circuit breaker client).
- `A2/command-python-service/`: Python command service (FastAPI + rate limiting + circuit breaker client).

## A2 Architectural and Resilience References

- `A2/README.md`: architecture diagrams, startup instructions, resilience evidence examples.
- `A2/ADRs/001-database-per-service.md`: state isolation rationale.
- `A2/ADRs/002-hybrid-communication.md`: synchronous API and asynchronous messaging tradeoffs.
- `A2/ADRs/003-resilience-patterns.md`: bulkhead, circuit breaker, rate limiting pattern choices.
- `A2/demo-resilience.sh`: prior failure behavior demo sequence.
- `A2/test-services.sh`: integration and smoke test utility.

## A3 Observability and Benchmark References

- `A3/docker-compose.yml`: Jaeger OTLP endpoint wiring for tracing.
- `A3/pipeline/observability.py`: structured logging + metrics + trace model reference.
- `A3/pipeline/config.py`: env-driven configurability model for queue/backpressure knobs.
- `A3/scripts/benchmark.sh`: repeatable benchmark script pattern.
- `A3/ADRs/001-bounded-queue-backpressure.md`: explicit backpressure framing.
- `A3/ADRs/003-observability-stack.md`: observability architecture rationale.
- `A3/pipeline-viz/`: existing React/Vite dashboard foundation to extend for command UI.

## A4 Reuse Strategy

- Use A2 services as the production-like microservices substrate for scaling, security, and chaos tests.
- Port A3-style telemetry practices into A2 where needed for traceability and metrics depth.
- Extend `A3/pipeline-viz` into a mission command web interface with hybrid data:
  - live operational telemetry from running services
  - simulated mission stream to drive realistic analyst workflows
