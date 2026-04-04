"""Structured JSON logs, Prometheus-style counters, OpenTelemetry tracing."""

from __future__ import annotations

import json
import logging
import random
import sys
import time
from contextlib import contextmanager
from typing import Any, Iterator

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import Status, StatusCode
from prometheus_client import Counter, Histogram

_events_processed = Counter(
    "a3_pipeline_events_processed_total",
    "Events successfully processed",
    ["mode"],
)
_validation_errors = Counter(
    "a3_pipeline_validation_errors_total",
    "Validation failures",
    ["mode"],
)
_alerts_raised = Counter(
    "a3_pipeline_alerts_raised_total",
    "C2-style alerts that would fire",
    ["mode"],
)
_db_errors = Counter(
    "a3_pipeline_db_errors_total",
    "Database errors",
    ["mode"],
)
_stage_seconds = Histogram(
    "a3_pipeline_stage_seconds",
    "Time spent in pipeline stage",
    ["mode", "stage"],
    buckets=(0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0),
)


class JsonLogHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        payload = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created)),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }
        if hasattr(record, "extra_fields"):
            payload.update(record.extra_fields)
        sys.stdout.write(json.dumps(payload) + "\n")
        sys.stdout.flush()


def setup_logging(level: str = "INFO") -> logging.Logger:
    log = logging.getLogger("a3.pipeline")
    log.handlers.clear()
    log.setLevel(level)
    h = JsonLogHandler()
    h.setLevel(level)
    log.addHandler(h)
    log.propagate = False
    return log


def log_extra(log: logging.Logger, message: str, **fields: Any) -> None:
    record = logging.LogRecord(
        name=log.name,
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg=message,
        args=(),
        exc_info=None,
    )
    record.extra_fields = fields
    log.handle(record)


def setup_tracing(service_name: str, otlp_endpoint: str | None, sample_ratio: float) -> trace.Tracer:
    resource = Resource.create({"service.name": service_name})
    provider = TracerProvider(resource=resource)

    if otlp_endpoint:
        exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
        provider.add_span_processor(BatchSpanProcessor(exporter))

    trace.set_tracer_provider(provider)
    return trace.get_tracer(service_name)


def should_sample(sample_ratio: float) -> bool:
    return sample_ratio >= 1.0 or random.random() < sample_ratio


@contextmanager
def stage_span(
    tracer: trace.Tracer,
    name: str,
    *,
    sample: bool,
    attributes: dict[str, Any] | None = None,
) -> Iterator[None]:
    if not sample:
        yield
        return
    with tracer.start_as_current_span(name, attributes=attributes or {}) as span:
        t0 = time.perf_counter()
        try:
            yield
        except Exception as e:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
            raise
        finally:
            span.set_attribute("duration_ms", (time.perf_counter() - t0) * 1000)


def metrics_inc_processed(mode: str) -> None:
    _events_processed.labels(mode=mode).inc()


def metrics_inc_validation_error(mode: str) -> None:
    _validation_errors.labels(mode=mode).inc()


def metrics_inc_alert(mode: str) -> None:
    _alerts_raised.labels(mode=mode).inc()


def metrics_inc_db_error(mode: str) -> None:
    _db_errors.labels(mode=mode).inc()


def metrics_observe_stage(mode: str, stage: str, seconds: float) -> None:
    _stage_seconds.labels(mode=mode, stage=stage).observe(seconds)
