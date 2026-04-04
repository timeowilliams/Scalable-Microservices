"""Deterministic JSONL datasets for benchmarks."""

from __future__ import annotations

import json
import random
from pathlib import Path

SIZES = {"small": 1_000, "medium": 50_000, "large": 150_000}

TYPES = ["temperature", "humidity", "motion", "rf", "pressure", "light"]


def write_dataset(size_name: str, output: Path, seed: int = 42) -> int:
    count = SIZES[size_name]
    rng = random.Random(seed)
    output.parent.mkdir(parents=True, exist_ok=True)
    n = 0
    with open(output, "w", encoding="utf-8") as f:
        for i in range(count):
            et = TYPES[i % len(TYPES)]
            base = {
                "temperature": 70.0,
                "humidity": 45.0,
                "motion": 1.0,
                "rf": -62.0,
                "pressure": 29.9,
                "light": 380.0,
            }[et]
            noise = rng.gauss(0, 8 if et != "motion" else 2)
            val = base + noise
            if i % 997 == 0:
                val += 40

            rec = {
                "event_id": f"evt_{size_name}_{i:07d}",
                "sensor_id": f"sensor_{et}_{i % 200:03d}",
                "timestamp": f"2026-04-01T{(i % 24):02d}:00:00Z",
                "value": round(val, 4),
                "type": et,
                "location": {"grid": f"G{i % 50}", "confidence": round(rng.random(), 3)},
            }
            f.write(json.dumps(rec) + "\n")
            n += 1
    return n
