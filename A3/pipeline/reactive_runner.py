"""Async pipeline: bounded queue + fixed worker pool; asyncpg for persist."""

from __future__ import annotations

import asyncio
import csv
import json
import os
import time
from pathlib import Path
from typing import Any

import asyncpg
import psutil

from pipeline.config import Settings
from pipeline import db
from pipeline import observability
from pipeline import stages


MODE = "reactive"


def _payload(ne: stages.NormalizedEvent) -> dict[str, Any]:
    return {
        "event_id": ne.event_id,
        "sensor_id": ne.sensor_id,
        "type": ne.event_type,
        "value": ne.value,
        "unit": ne.unit,
        "timestamp": ne.timestamp_iso,
        "severity": ne.severity,
        "location": ne.raw_location,
    }


async def run(dataset_path: Path, settings: Settings | None = None) -> dict[str, Any]:
    settings = settings or Settings.from_env()
    log = observability.setup_logging(settings.log_level)
    tracer = observability.setup_tracing(
        "a3-pipeline-reactive",
        settings.otel_endpoint,
        settings.trace_sample_ratio,
    )

    summary_path = os.getenv("BENCHMARK_SUMMARY", "results/benchmark_summary.json")
    csv_path = os.getenv("BENCHMARK_CSV", "results/benchmark.csv")

    proc = psutil.Process()
    peak_rss = proc.memory_info().rss
    errors = 0
    processed = 0
    alerts = 0
    processed_lock = asyncio.Lock()

    async def bump_processed() -> None:
        nonlocal processed
        async with processed_lock:
            processed += 1
            observability.metrics_inc_processed(MODE)

    async def bump_errors() -> None:
        nonlocal errors
        async with processed_lock:
            errors += 1

    async def bump_alerts() -> None:
        nonlocal alerts
        async with processed_lock:
            alerts += 1

    queue: asyncio.Queue = asyncio.Queue(maxsize=settings.queue_maxsize)

    pool = await asyncpg.create_pool(
        settings.dsn_async,
        min_size=settings.worker_count,
        max_size=max(settings.worker_count + 2, 4),
    )
    await db.init_schema_async(pool)

    t0 = time.perf_counter()

    async def producer() -> None:
        with open(dataset_path, encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                raw = json.loads(line)
                # Backpressure: blocks when queue has maxsize items
                await queue.put(("event", raw, line_num))
        for _ in range(settings.worker_count):
            await queue.put(("stop", None, 0))

    async def worker(worker_id: int) -> None:
        nonlocal peak_rss
        while True:
            item = await queue.get()
            try:
                kind, raw, line_num = item  # type: ignore[misc]
                if kind == "stop":
                    return

                if line_num % 2000 == 0:
                    async with processed_lock:
                        peak_rss = max(peak_rss, proc.memory_info().rss)

                sample = observability.should_sample(settings.trace_sample_ratio)

                t_val = time.perf_counter()
                with observability.stage_span(
                    tracer, "validate", sample=sample, attributes={"mode": MODE, "worker": worker_id}
                ):
                    ok, err = stages.validate(raw)
                observability.metrics_observe_stage(MODE, "validate", time.perf_counter() - t_val)

                if not ok:
                    await bump_errors()
                    observability.metrics_inc_validation_error(MODE)
                    observability.log_extra(
                        log,
                        "validation_failed",
                        mode=MODE,
                        correlation_id=raw.get("event_id", f"line_{line_num}"),
                        stage="validate",
                        error=err,
                    )
                    continue

                t_norm = time.perf_counter()
                with observability.stage_span(
                    tracer, "normalize", sample=sample, attributes={"mode": MODE, "worker": worker_id}
                ):
                    ne = stages.normalize(raw)
                observability.metrics_observe_stage(MODE, "normalize", time.perf_counter() - t_norm)

                t_an = time.perf_counter()
                with observability.stage_span(
                    tracer, "analyze", sample=sample, attributes={"mode": MODE, "worker": worker_id}
                ):
                    score = stages.analyze(ne)
                observability.metrics_observe_stage(MODE, "analyze", time.perf_counter() - t_an)

                alert = stages.should_alert(score)

                t_db = time.perf_counter()
                try:
                    with observability.stage_span(
                        tracer, "persist", sample=sample, attributes={"mode": MODE, "worker": worker_id}
                    ):
                        async with pool.acquire() as conn:
                            await db.insert_processed_async(
                                conn,
                                event_id=ne.event_id,
                                sensor_id=ne.sensor_id,
                                event_type=ne.event_type,
                                payload=_payload(ne),
                                anomaly_score=score,
                                alert_raised=alert,
                            )
                except Exception as e:
                    await bump_errors()
                    observability.metrics_inc_db_error(MODE)
                    observability.log_extra(
                        log,
                        "db_error",
                        mode=MODE,
                        correlation_id=ne.event_id,
                        stage="persist",
                        error=str(e),
                    )
                    continue
                observability.metrics_observe_stage(MODE, "persist", time.perf_counter() - t_db)

                with observability.stage_span(
                    tracer, "alert", sample=sample, attributes={"mode": MODE, "worker": worker_id}
                ):
                    if alert:
                        await bump_alerts()
                        observability.metrics_inc_alert(MODE)

                await bump_processed()
            finally:
                queue.task_done()

    prod_task = asyncio.create_task(producer())
    workers = [asyncio.create_task(worker(i)) for i in range(settings.worker_count)]
    await prod_task
    await asyncio.gather(*workers)

    await pool.close()

    duration = time.perf_counter() - t0
    peak_rss = max(peak_rss, proc.memory_info().rss)
    peak_mb = peak_rss / (1024 * 1024)
    eps = processed / duration if duration > 0 else 0.0

    dataset_label = dataset_path.stem
    row = {
        "dataset": dataset_label,
        "mode": MODE,
        "event_count": processed,
        "duration_s": round(duration, 4),
        "events_per_s": round(eps, 2),
        "peak_rss_mb": round(peak_mb, 2),
        "errors": errors,
        "alerts": alerts,
    }

    observability.log_extra(
        log,
        "run_complete",
        mode=MODE,
        alerts_raised=alerts,
        **{k: v for k, v in row.items() if k != "mode"},
    )

    Path(summary_path).parent.mkdir(parents=True, exist_ok=True)
    with open(summary_path, "w", encoding="utf-8") as sf:
        json.dump(row, sf, indent=2)

    _append_csv(csv_path, row)

    return row


def _append_csv(path: str, row: dict[str, Any]) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    write_header = not p.exists()
    with open(p, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f,
            fieldnames=[
                "dataset",
                "mode",
                "event_count",
                "duration_s",
                "events_per_s",
                "peak_rss_mb",
                "errors",
                "alerts",
            ],
        )
        if write_header:
            w.writeheader()
        w.writerow(row)


def run_sync(dataset_path: Path, settings: Settings | None = None) -> dict[str, Any]:
    return asyncio.run(run(dataset_path, settings))
