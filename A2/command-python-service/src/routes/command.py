from fastapi import APIRouter, Depends, Body, Request
from controllers.command_controller import CommandController
from middleware.auth import verify_api_key
from dependencies import get_command_controller, get_api_key

router = APIRouter()


@router.get("/dashboards")
async def get_all_dashboards(
    request: Request,
    controller: CommandController = Depends(get_command_controller)
):
    return await controller.get_all_dashboards(request)


@router.get("/dashboards/{dashboard_id}")
async def get_dashboard_by_id(
    request: Request,
    dashboard_id: str,
    controller: CommandController = Depends(get_command_controller)
):
    return await controller.get_dashboard_by_id(request, dashboard_id)


@router.post("/dashboards")
async def create_dashboard(
    request: Request,
    dashboard_data: dict = Body(...),
    controller: CommandController = Depends(get_command_controller),
    _: str = Depends(verify_api_key)
):
    return await controller.create_dashboard(request, dashboard_data)


@router.get("/alerts")
async def get_all_alerts(
    request: Request,
    acknowledged: bool = None,
    severity: str = None,
    limit: int = None,
    offset: int = 0,
    controller: CommandController = Depends(get_command_controller)
):
    return await controller.get_all_alerts(request, acknowledged, severity, limit, offset)


@router.post("/alerts")
async def create_alert(
    request: Request,
    alert_data: dict = Body(...),
    controller: CommandController = Depends(get_command_controller),
    _: str = Depends(verify_api_key)
):
    return await controller.create_alert(request, alert_data)


@router.patch("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    request: Request,
    alert_id: str,
    controller: CommandController = Depends(get_command_controller),
    _: str = Depends(verify_api_key)
):
    return await controller.acknowledge_alert(request, alert_id)


# Async endpoints
@router.post("/sensor-aggregate")
async def aggregate_sensors(
    request: Request,
    sensor_ids: dict = Body(...),
    controller: CommandController = Depends(get_command_controller),
    _: str = Depends(verify_api_key)
):
    return await controller.aggregate_sensors(request, sensor_ids)


@router.post("/mission-plan")
async def create_mission_plan(
    request: Request,
    mission_data: dict = Body(...),
    controller: CommandController = Depends(get_command_controller),
    _: str = Depends(verify_api_key)
):
    return await controller.create_mission_plan(request, mission_data)


@router.post("/threat-assessment")
async def assess_threats(
    request: Request,
    sensor_ids: dict = Body(...),
    controller: CommandController = Depends(get_command_controller),
    _: str = Depends(verify_api_key)
):
    return await controller.assess_threats(request, sensor_ids)
