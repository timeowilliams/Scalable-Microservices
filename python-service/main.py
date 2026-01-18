from fastapi import FastAPI
from datetime import datetime

app = FastAPI()

sensors = [
    {
        "sensor_id": "temp_living_room",
        "type": "temperature",
        "value": 72.4,
        "unit": "F",
        "timestamp": "2026-01-18T14:30:00Z"
    },
    {
        "sensor_id": "humidity_basement",
        "type": "humidity",
        "value": 45,
        "unit": "%",
        "timestamp": "2026-01-18T14:30:00Z"
    },
    {
        "sensor_id": "motion_kitchen",
        "type": "motion",
        "value": 0,
        "unit": "boolean",
        "timestamp": "2026-01-18T14:30:00Z"
    },
    {
        "sensor_id": "temp_bedroom",
        "type": "temperature",
        "value": 68.2,
        "unit": "F",
        "timestamp": "2026-01-18T14:30:00Z"
    },
    {
        "sensor_id": "humidity_living_room",
        "type": "humidity",
        "value": 42,
        "unit": "%",
        "timestamp": "2026-01-18T14:30:00Z"
    }
]


@app.get("/health")
def health():
    return {"status": "ok", "service": "python"}


@app.get("/sensors")
def get_sensors():
    return sensors
