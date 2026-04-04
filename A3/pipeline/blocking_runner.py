"""Strictly sequential pipeline: one event fully processed before the next."""

from __future__ import annotations

import csv
import json
import os
import time
from pathlib import Path
from typing import Any

import psutil
import psycopg

from pipeline.config import Settings
from pipeline import db
from pipeline import observability
from pipeline import stages


MODE = "blocking"


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


def run(dataset_path: Path, settings: Settings | None = None) -> dict[str, Any]:
    settings = settings or Settings.from_env()
    log = observability.setup_logging(settings.log_level)
    tracer = observability.setup_tracing(
        "a3-pipeline-blocking",
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
    t0 = time.perf_counter()

    with psycopg.connect(settings.dsn_sync, autocommit=False) as conn:
        db.init_schema_sync(conn)

        with open(dataset_path, encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                if line_num % 2000 == 0:
                    peak_rss = max(peak_rss, proc.memory_info().rss)

                line = line.strip()
                if not line:
                    continue

                raw = json.loads(line)
                sample = observability.should_sample(settings.trace_sample_ratio)

                t_validate = time.perf_counter()
                with observability.stage_span(
                    tracer, "validate", sample=sample, attributes={"mode": MODE}
                ):
                    ok, err = stages.validate(raw)
                observability.metrics_observe_stage(MODE, "validate", time.perf_counter() - t_validate)

                if not ok:
                    errors += 1
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
                with observability.stage_span(tracer, "normalize", sample=sample, attributes={"mode": MODE}):
                    ne = stages.normalize(raw)
                observability.metrics_observe_stage(MODE, "normalize", time.perf_counter() - t_norm)

                t_an = time.perf_counter()
                with observability.stage_span(tracer, "analyze", sample=sample, attributes={"mode": MODE}):
                    score = stages.analyze(ne)
                observability.metrics_observe_stage(MODE, "analyze", time.perf_counter() - t_an)

                alert = stages.should_alert(score)
                t_db = time.perf_counter()
                try:
                    with observability.stage_span(tracer, "persist", sample=sample, attributes={"mode": MODE}):
                        db.insert_processed_sync(
                            conn,
                            event_id=ne.event_id,
                            sensor_id=ne.sensor_id,
                            event_type=ne.event_type,
                            payload=_payload(ne),
                            anomaly_score=score,
                            alert_raised=alert,
                        )
                except Exception as e:
                    errors += 1
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

                with observability.stage_span(tracer, "alert", sample=sample, attributes={"mode": MODE}):
                    if alert:
                        alerts += 1
                        observability.metrics_inc_alert(MODE)

                processed += 1
                observability.metrics_inc_processed(MODE)

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
