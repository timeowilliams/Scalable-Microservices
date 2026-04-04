#!/usr/bin/env python3
"""Wrapper: generate JSONL when PYTHONPATH includes A3 root."""

import argparse
import json
import sys
from pathlib import Path

# Allow running from host: cd A3 && python scripts/generate_dataset.py
_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from pipeline.dataset_gen import write_dataset  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--size", choices=("small", "medium", "large"), required=True)
    p.add_argument("--output", type=Path, required=True)
    args = p.parse_args()
    n = write_dataset(args.size, args.output)
    print(json.dumps({"written": n, "path": str(args.output)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
