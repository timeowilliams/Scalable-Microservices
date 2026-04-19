#!/usr/bin/env python3
import argparse
import json
import random
import statistics
import time
import urllib.error
import urllib.request
from pathlib import Path


def request_json(method: str, url: str, token: str, payload: dict | None = None, timeout: float = 5.0):
    body = None
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Correlation-ID": f"a4-load-{int(time.time() * 1000)}-{random.randint(1000,9999)}",
    }
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8")
        return resp.status, (json.loads(raw) if raw else {})


def run_dataset(base_url: str, token: str, size: int, timeout: float):
    latencies_ms = []
    failures = 0
    # Unique per invocation so repeated experiments do not 409/400 on existing DB rows.
    run_suffix = str(int(time.time() * 1000))

    for idx in range(size):
        sensor_id = f"a4_sensor_{run_suffix}_{idx:05d}"
        dashboard_id = f"a4_dashboard_{run_suffix}_{idx:05d}"
        sensor_payload = {
            "sensor_id": sensor_id,
            "type": "temperature" if idx % 2 == 0 else "motion",
            "value": 60 + (idx % 40),
            "unit": "F",
            "location": f"sector-{idx % 12}",
        }
        dash_payload = {
            "dashboard_id": dashboard_id,
            "mission_id": f"mission-{idx % 9}",
            "threat_level": "high" if idx % 11 == 0 else "low",
            "status": "active",
        }
        start = time.perf_counter()
        try:
            request_json("POST", f"{base_url}:3000/sensors", token, sensor_payload, timeout)
            request_json("POST", f"{base_url}:3001/dashboards", token, dash_payload, timeout)
            request_json(
                "POST",
                f"{base_url}:3001/threat-assessment",
                token,
                {"sensor_ids": [sensor_id]},
                timeout,
            )
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
            failures += 1
        finally:
            latencies_ms.append((time.perf_counter() - start) * 1000.0)

    elapsed_s = sum(latencies_ms) / 1000.0
    success = max(0, size - failures)
    throughput = success / elapsed_s if elapsed_s else 0.0
    p50 = statistics.median(latencies_ms) if latencies_ms else 0.0
    p90 = (
        statistics.quantiles(latencies_ms, n=10)[8]
        if len(latencies_ms) >= 10
        else max(latencies_ms, default=0.0)
    )
    return {
        "run_suffix": run_suffix,
        "events": size,
        "successes": success,
        "failures": failures,
        "failure_rate": failures / size if size else 0.0,
        "throughput_events_per_sec": throughput,
        "latency_ms_p50": p50,
        "latency_ms_p90": p90,
        "latency_ms_mean": statistics.fmean(latencies_ms) if latencies_ms else 0.0,
    }


def main():
    parser = argparse.ArgumentParser(description="A4 synthetic load test runner")
    parser.add_argument("--base-url", default="http://localhost", help="Base URL host prefix")
    parser.add_argument("--token", default="replace-with-secure-key", help="Bearer token value")
    parser.add_argument("--dataset-size", type=int, required=True, help="Number of iterations")
    parser.add_argument("--timeout", type=float, default=5.0, help="Per request timeout seconds")
    parser.add_argument("--output", required=True, help="Output JSON path")
    args = parser.parse_args()

    result = run_dataset(args.base_url, args.token, args.dataset_size, args.timeout)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, indent=2))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
