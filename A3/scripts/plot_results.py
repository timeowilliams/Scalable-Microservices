#!/usr/bin/env python3
"""Build matplotlib charts from results/benchmark.csv (stdlib csv only)."""

from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt


def load_rows(path: Path) -> list[dict[str, str]]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("csv_path", type=Path, nargs="?", default=Path("results/benchmark.csv"))
    ap.add_argument("--out-dir", type=Path, default=Path("results"))
    args = ap.parse_args()
    rows = load_rows(args.csv_path)
    if not rows:
        print("No rows in CSV; run benchmark first.")
        return 1

    by_ds: dict[str, dict[str, dict]] = defaultdict(dict)
    order: list[str] = []
    for r in rows:
        ds = r["dataset"]
        if ds not in order:
            order.append(ds)
        mode = r["mode"]
        by_ds[ds][mode] = r

    modes = ["blocking", "reactive"]
    x_labels = order
    x = range(len(x_labels))
    width = 0.35

    def floats(key: str) -> tuple[list[float], list[float]]:
        b, rx = [], []
        for ds in order:
            m = by_ds[ds]
            b.append(float(m.get("blocking", {}).get(key, 0) or 0))
            rx.append(float(m.get("reactive", {}).get(key, 0) or 0))
        return b, rx

    args.out_dir.mkdir(parents=True, exist_ok=True)

    # Throughput
    fig, ax = plt.subplots(figsize=(8, 4))
    tb, tr = floats("events_per_s")
    ax.bar([i - width / 2 for i in x], tb, width, label="blocking")
    ax.bar([i + width / 2 for i in x], tr, width, label="reactive")
    ax.set_ylabel("Events / second")
    ax.set_title("Pipeline throughput by dataset")
    ax.set_xticks(list(x))
    ax.set_xticklabels(x_labels)
    ax.legend()
    fig.tight_layout()
    fig.savefig(args.out_dir / "throughput.png", dpi=120)
    plt.close(fig)

    # Runtime
    fig, ax = plt.subplots(figsize=(8, 4))
    rb, rr = floats("duration_s")
    ax.bar([i - width / 2 for i in x], rb, width, label="blocking")
    ax.bar([i + width / 2 for i in x], rr, width, label="reactive")
    ax.set_ylabel("Seconds (total run)")
    ax.set_title("Total runtime by dataset")
    ax.set_xticks(list(x))
    ax.set_xticklabels(x_labels)
    ax.legend()
    fig.tight_layout()
    fig.savefig(args.out_dir / "runtime.png", dpi=120)
    plt.close(fig)

    # Memory if present
    if any(float(r.get("peak_rss_mb") or 0) > 0 for r in rows):
        fig, ax = plt.subplots(figsize=(8, 4))
        mb, mr = floats("peak_rss_mb")
        ax.bar([i - width / 2 for i in x], mb, width, label="blocking")
        ax.bar([i + width / 2 for i in x], mr, width, label="reactive")
        ax.set_ylabel("Peak RSS (MB)")
        ax.set_title("Peak process memory by dataset")
        ax.set_xticks(list(x))
        ax.set_xticklabels(x_labels)
        ax.legend()
        fig.tight_layout()
        fig.savefig(args.out_dir / "memory.png", dpi=120)
        plt.close(fig)

    print(f"Wrote charts to {args.out_dir.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
