# Architecture Review

## System Under Review

The A4 capstone system uses the A2 polyglot microservice stack as the operational substrate:

- `node-sensor-service` (Node.js/Express)
- `python-sensor-service` (Python/FastAPI)
- `node-command-service` (Node.js/Express)
- `python-command-service` (Python/FastAPI)
- RabbitMQ for asynchronous event delivery
- Four Postgres databases (database-per-service pattern)

This satisfies the capstone requirement of 3-5 services and at least two languages.

## Core Services and Responsibilities

- Sensor services ingest and serve sensor data, then publish domain events.
- Command services aggregate sensor inputs and expose command/alert/dashboard APIs.
- RabbitMQ decouples event producers and consumers across service boundaries.
- Each service owns its own data schema and database.

## Stateful vs Stateless Analysis

- Stateless: HTTP API process layers in all four app services are horizontally scalable.
- Stateful:
  - Postgres instances are durable state stores.
  - RabbitMQ maintains queue state and delivery semantics.
  - In-memory rate limiting/breaker state exists per app instance and is not shared.

## Likely Bottlenecks

- Synchronous dependency chain from command services to sensor services under burst load.
- Database I/O contention in command services when dashboards and alerts spike together.
- RabbitMQ consumer lag during high event throughput or slow consumers.
- Uneven load if replicas are added without controlled balancing and concurrency limits.

## Failure Concerns

- Dependency failures (DB, RabbitMQ, downstream sensor service) can amplify latency and error rates.
- Process-local limiter/breaker state can diverge across replicas.
- Missing centralized telemetry can delay diagnosis during chained failures.
- Excessive retries under partial outages can become self-inflicted load.

## Scaling Concerns

- App services scale horizontally, but data tier and queue layer become the limiting factors.
- Without explicit backpressure controls, queue growth can hide overload until latency collapses.
- Clustered workers inside a single container improve host utilization but do not replace true replica-level scaling.

## Refactors If More Time Were Available

1. Introduce a shared distributed rate-limiter/overload budget (Redis-backed token bucket) for cross-replica fairness.
2. Move analytical aggregation paths to SQL/materialized views to reduce application-side fan-out work.
3. Add centralized OpenTelemetry collector and standardized semantic conventions across Node and Python services.
4. Split write-heavy versus read-heavy API paths into dedicated deployable units for clearer scaling controls.
5. Add contract and failure-injection tests in CI to lock in resilience behavior over time.

## Why This Matters for A4

A4 focuses on proving behavior under stress, failure, and operations. The architecture already has realistic production constraints (multiple services, async messaging, dedicated data stores). This allows meaningful experiments in horizontal scaling, resilience tuning, security boundaries, observability depth, and operational reporting.
