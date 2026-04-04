"""Environment-driven configuration for the A3 pipeline."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str
    queue_maxsize: int
    worker_count: int
    otel_endpoint: str | None
    trace_sample_ratio: float
    log_level: str

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            db_host=os.getenv("DB_HOST", "localhost"),
            db_port=int(os.getenv("DB_PORT", "5432")),
            db_name=os.getenv("DB_NAME", "a3_pipeline_db"),
            db_user=os.getenv("DB_USER", "a3_user"),
            db_password=os.getenv("DB_PASSWORD", "a3_pass"),
            queue_maxsize=int(os.getenv("QUEUE_MAXSIZE", "256")),
            worker_count=int(os.getenv("WORKER_COUNT", "8")),
            otel_endpoint=(os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT") or "").strip() or None,
            trace_sample_ratio=float(os.getenv("OTEL_TRACES_SAMPLE_RATIO", "1.0")),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
        )

    @property
    def dsn_sync(self) -> str:
        return (
            f"host={self.db_host} port={self.db_port} dbname={self.db_name} "
            f"user={self.db_user} password={self.db_password}"
        )

    @property
    def dsn_async(self) -> str:
        return (
            f"postgresql://{self.db_user}:{self.db_password}@"
            f"{self.db_host}:{self.db_port}/{self.db_name}"
        )
