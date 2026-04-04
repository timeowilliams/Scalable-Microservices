"""CLI: generate datasets, run blocking or reactive pipeline."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from pipeline.blocking_runner import run as run_blocking
from pipeline.config import Settings
from pipeline.reactive_runner import run_sync as run_reactive_sync


def _shutdown_tracing() -> None:
    from opentelemetry import trace

    p = trace.get_tracer_provider()
    shutdown = getattr(p, "shutdown", None)
    if callable(shutdown):
        shutdown()


def main() -> int:
    parser = argparse.ArgumentParser(description="A3 sensor pipeline")
    sub = parser.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("generate", help="Write JSONL dataset")
    g.add_argument("--size", choices=("small", "medium", "large"), required=True)
    g.add_argument("--output", type=Path, required=True)

    rb = sub.add_parser("run-blocking", help="Sequential pipeline")
    rb.add_argument("--dataset", type=Path, required=True)

    rr = sub.add_parser("run-reactive", help="Bounded queue + async workers")
    rr.add_argument("--dataset", type=Path, required=True)

    args = parser.parse_args()

    if args.cmd == "generate":
        from pipeline.dataset_gen import write_dataset

        n = write_dataset(args.size, args.output)
        print(json.dumps({"written": n, "path": str(args.output)}))
        return 0

    if args.cmd == "run-blocking":
        settings = Settings.from_env()
        try:
            run_blocking(args.dataset, settings)
        finally:
            _shutdown_tracing()
        return 0

    if args.cmd == "run-reactive":
        settings = Settings.from_env()
        try:
            run_reactive_sync(args.dataset, settings)
        finally:
            _shutdown_tracing()
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
