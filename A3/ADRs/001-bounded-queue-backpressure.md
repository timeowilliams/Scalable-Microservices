# ADR-001: Backpressure via Bounded `asyncio.Queue` (No Semaphore)

## Status

Accepted

## Context

Assignment 3 models tactical sensor surge: ingestion can outrun persistence. We need a **reactive** pipeline that:

- Overlaps I/O with multiple consumers
- **Bounds** in-memory buffering so RAM does not grow without limit when the database or downstream slows
- Keeps the backpressure mechanism **explicit** and easy to reason about in reports and benchmarks

Alternatives considered include unbounded queues, `asyncio.create_task` per row with `gather`, and limiting concurrency with `asyncio.Semaphore`.

## Decision

We implement backpressure using a **bounded `asyncio.Queue`** with `maxsize = QUEUE_MAXSIZE` (`M`):

- The **producer** `await queue.put(item)` **blocks** when **M** items are already queued
- A **fixed pool** of **`WORKER_COUNT` (`W`)** consumer tasks drains the queue and runs the same stage chain as the blocking pipeline

We **do not** use `asyncio.Semaphore` in this codebase for load shaping: **queue capacity** is the single, documented lever for “how much can pile up before intake slows.”

### Rationale

1. **Clear semantics**: “Full queue ⇒ producer waits” maps directly to coursework language on backpressure
2. **Decoupled knobs**: **`M`** (buffer depth) and **`W`** (parallelism) are independent—e.g. large `M` with small `W` vs small `M` with larger `W` for experiments
3. **Avoids task storms**: Per-event tasks without a bounded queue risk huge pending work sets; a bounded queue caps pending items

## Consequences

**Positive:**

- Predictable upper bound on queued events (plus in-flight work bounded by `W`)
- Simple to explain in README, diagrams, and benchmarks
- Degrades under stress by **adding latency** at the producer instead of exhausting memory

**Negative:**

- Deep queues can **hide** sustained overload until latency grows; operators should watch queue depth (via logs/metrics) and DB health
- Tuning requires choosing both `M` and `W` relative to **asyncpg** pool size

## Implementation

- `pipeline/reactive_runner.py`: producer + `asyncio.Queue(maxsize=config.queue_maxsize)` + `WORKER_COUNT` workers
- Environment: `QUEUE_MAXSIZE`, `WORKER_COUNT`

## References

- [asyncio queues](https://docs.python.org/3/library/asyncio-queue.html)
