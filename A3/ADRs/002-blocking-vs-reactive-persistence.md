# ADR-002: Blocking vs Reactive Execution (psycopg vs asyncpg)

## Status

Accepted

## Context

The assignment requires **two** implementations of the **same** logical pipeline (ingest → validate → normalize → analyze → persist → alert) so we can compare throughput, runtime, and memory under identical inputs.

We must choose:

- How the **blocking** path talks to PostgreSQL
- How the **reactive** path talks to PostgreSQL while overlapping waits
- Whether stage logic is **shared** or duplicated

## Decision

1. **Blocking pipeline** — **Strictly sequential**: for each event, run all stages to completion before starting the next. Database access uses **synchronous `psycopg`** in a single-threaded control flow.

2. **Reactive pipeline** — **Concurrent consumers**: a bounded queue feeds **`WORKER_COUNT`** async worker tasks. Each worker runs the same stage chain using **`asyncpg`** and a **connection pool** sized consistently with worker concurrency.

3. **Shared business logic** — Pure transformations and validation live in **`pipeline/stages.py`** and **`pipeline/db.py`** (schema, insert helpers) so blocking and reactive runs are **apples-to-apples** except for scheduling and DB driver API.

### Rationale

1. **Fair comparison**: Same JSONL, same validation rules, same deterministic **analyze** step (no cross-event state), same persistence schema
2. **Pedagogical clarity**: Blocking path isolates “one event at a time”; reactive path isolates “overlap I/O”
3. **Industry alignment**: Sync drivers for simple batch tools; async pools for high-concurrency I/O-bound workloads

## Consequences

**Positive:**

- Measured speedups attribute to **concurrency model + async I/O**, not different business rules
- Easier grading and debugging (diff runners, same `stages`)

**Negative:**

- Two database client stacks to maintain (`psycopg` + `asyncpg`)
- Pool sizing and `WORKER_COUNT` must stay aligned to avoid pool starvation or excess connection churn

## Implementation

- `pipeline/blocking_runner.py` — sequential loop + `psycopg`
- `pipeline/reactive_runner.py` — queue + workers + `asyncpg`
- `pipeline/__main__.py` — `run-blocking` / `run-reactive` CLI

## References

- [psycopg 3](https://www.psycopg.org/psycopg3/)
- [asyncpg](https://magicstack.github.io/asyncpg/)
