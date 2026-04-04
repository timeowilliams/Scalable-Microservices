"""
Pipeline stages: validate → normalize → analyze → (persist in runner) → alert.

Analyze is deterministic from (type, value) only so blocking and reactive runs match.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

REQUIRED_FIELDS = ("sensor_id", "timestamp", "value", "type")
ALLOWED_TYPES = frozenset({"temperature", "humidity", "motion", "rf", "pressure", "light"})

# Static baselines for anomaly scoring (operational stand-in for learned normals)
TYPE_BASELINE: dict[str, float] = {
    "temperature": 70.0,
    "humidity": 45.0,
    "motion": 0.0,
    "rf": -65.0,
    "pressure": 30.0,
    "light": 400.0,
}

ALERT_THRESHOLD = 0.72


@dataclass
class NormalizedEvent:
    event_id: str
    sensor_id: str
    event_type: str
    value: float
    unit: str
    timestamp_iso: str
    severity: str
    raw_location: dict[str, Any] | None


def validate(raw: dict[str, Any]) -> tuple[bool, str | None]:
    for f in REQUIRED_FIELDS:
        if f not in raw or raw[f] is None:
            return False, f"missing_field:{f}"
    if raw["type"] not in ALLOWED_TYPES:
        return False, "invalid_type"
    try:
        float(raw["value"])
    except (TypeError, ValueError):
        return False, "invalid_value"
    return True, None


def normalize(raw: dict[str, Any]) -> NormalizedEvent:
    eid = str(raw.get("event_id") or f"evt_{raw['sensor_id']}_{raw['timestamp']}")
    ts = raw["timestamp"]
    if isinstance(ts, (int, float)):
        dt = datetime.fromtimestamp(float(ts), tz=timezone.utc)
    else:
        s = str(ts).replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
    iso = dt.isoformat().replace("+00:00", "Z")

    et = str(raw["type"])
    val = float(raw["value"])
    unit = str(raw.get("unit") or _default_unit(et))
    loc = raw.get("location")
    if loc is not None and not isinstance(loc, dict):
        loc = None

    # Simple severity label from raw value magnitude (deterministic)
    av = abs(val)
    if av > 1000:
        sev = "critical"
    elif av > 100:
        sev = "high"
    elif av > 10:
        sev = "medium"
    else:
        sev = "low"

    return NormalizedEvent(
        event_id=eid,
        sensor_id=str(raw["sensor_id"]),
        event_type=et,
        value=val,
        unit=unit,
        timestamp_iso=iso,
        severity=sev,
        raw_location=loc,
    )


def _default_unit(event_type: str) -> str:
    return {
        "temperature": "F",
        "humidity": "%",
        "motion": "count",
        "rf": "dBm",
        "pressure": "inHg",
        "light": "lux",
    }.get(event_type, "raw")


def analyze(ne: NormalizedEvent) -> float:
    """
    Anomaly score in [0, 1]: deviation from type baseline, squashed with tanh.
    Same inputs always yield same score (no cross-event state).
    """
    base = TYPE_BASELINE.get(ne.event_type, 0.0)
    delta = abs(ne.value - base)
    # Scale per type so RF dBm vs temperature are comparable-ish
    scale = {"temperature": 15.0, "humidity": 25.0, "motion": 5.0, "rf": 20.0, "pressure": 5.0, "light": 200.0}.get(
        ne.event_type, 50.0
    )
    z = min(delta / scale, 5.0)
    return float((math.tanh(z) + 1.0) / 2.0)


def should_alert(score: float) -> bool:
    return score >= ALERT_THRESHOLD
