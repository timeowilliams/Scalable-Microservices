"""PostgreSQL: schema init and inserts (sync + async)."""

from __future__ import annotations

import json
from typing import Any

import asyncpg

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS processed_events (
    id BIGSERIAL PRIMARY KEY,
    event_id TEXT NOT NULL,
    sensor_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    normalized_payload JSONB NOT NULL,
    anomaly_score DOUBLE PRECISION NOT NULL,
    alert_raised BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_processed_events_sensor ON processed_events (sensor_id);
CREATE INDEX IF NOT EXISTS idx_processed_events_created ON processed_events (created_at);
"""


def init_schema_sync(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(SCHEMA_SQL)
    conn.commit()


async def init_schema_async(pool: asyncpg.Pool) -> None:
    async with pool.acquire() as conn:
        await conn.execute(SCHEMA_SQL)


def insert_processed_sync(
    conn,
    *,
    event_id: str,
    sensor_id: str,
    event_type: str,
    payload: dict[str, Any],
    anomaly_score: float,
    alert_raised: bool,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO processed_events
            (event_id, sensor_id, event_type, normalized_payload, anomaly_score, alert_raised)
            VALUES (%s, %s, %s, %s::jsonb, %s, %s)
            """,
            (
                event_id,
                sensor_id,
                event_type,
                json.dumps(payload),
                anomaly_score,
                alert_raised,
            ),
        )
    conn.commit()


async def insert_processed_async(
    conn: asyncpg.Connection,
    *,
    event_id: str,
    sensor_id: str,
    event_type: str,
    payload: dict[str, Any],
    anomaly_score: float,
    alert_raised: bool,
) -> None:
    await conn.execute(
        """
        INSERT INTO processed_events
        (event_id, sensor_id, event_type, normalized_payload, anomaly_score, alert_raised)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6)
        """,
        event_id,
        sensor_id,
        event_type,
        json.dumps(payload),
        anomaly_score,
        alert_raised,
    )
