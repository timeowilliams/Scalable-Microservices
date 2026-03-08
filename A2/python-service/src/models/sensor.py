from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
import re


class SensorBase(BaseModel):
    sensor_id: str = Field(..., description="Unique identifier for the sensor", min_length=1, max_length=100)
    type: str = Field(..., description="Type of sensor")
    value: float = Field(..., description="Sensor reading value")
    unit: str = Field(..., description="Unit of measurement")
    timestamp: Optional[str] = Field(None, description="ISO 8601 timestamp")

    @validator('sensor_id')
    def validate_sensor_id(cls, v):
        if not re.match(r'^[a-z0-9_]+$', v):
            raise ValueError('sensor_id must match pattern: lowercase letters, numbers, and underscores only')
        return v

    @validator('type')
    def validate_type(cls, v):
        valid_types = ['temperature', 'humidity', 'motion', 'pressure', 'light']
        if v not in valid_types:
            raise ValueError(f'type must be one of: {", ".join(valid_types)}')
        return v

    @validator('timestamp')
    def validate_timestamp(cls, v):
        if v is not None:
            try:
                datetime.fromisoformat(v.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                raise ValueError('timestamp must be a valid ISO 8601 date-time string')
        return v


class SensorCreate(SensorBase):
    """Schema for creating a new sensor"""
    pass


class Sensor(SensorBase):
    """Schema for sensor response"""
    timestamp: str = Field(..., description="ISO 8601 timestamp")

    class Config:
        schema_extra = {
            "example": {
                "sensor_id": "temp_living_room",
                "type": "temperature",
                "value": 72.4,
                "unit": "F",
                "timestamp": "2026-01-18T14:30:00Z"
            }
        }
