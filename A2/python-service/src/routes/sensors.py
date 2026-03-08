from fastapi import APIRouter, Depends, Request
from typing import Optional
from dependencies import get_sensor_controller
from controllers.sensor_controller import SensorController
from models.sensor import Sensor, SensorCreate
from middleware.auth import verify_api_key

router = APIRouter(prefix="/sensors", tags=["sensors"])


@router.get("", response_model=dict)
async def get_all_sensors(
    request: Request,
    type: Optional[str] = None,
    limit: Optional[int] = None,
    offset: int = 0,
    controller: SensorController = Depends(get_sensor_controller)
):
    """List all sensors with optional filtering and pagination"""
    return await controller.get_all_sensors(request, type, limit, offset)


@router.get("/{sensor_id}", response_model=Sensor)
async def get_sensor_by_id(
    request: Request,
    sensor_id: str,
    controller: SensorController = Depends(get_sensor_controller)
):
    """Get sensor by ID"""
    return await controller.get_sensor_by_id(request, sensor_id)


@router.post("", response_model=Sensor, status_code=201)
async def create_sensor(
    request: Request,
    sensor: SensorCreate,
    controller: SensorController = Depends(get_sensor_controller),
    _: str = Depends(verify_api_key)
):
    """Create a new sensor reading (requires API key authentication)"""
    sensor_data = sensor.dict()
    return await controller.create_sensor(request, sensor_data)
