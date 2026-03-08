from functools import lru_cache
from config.config import Config
from services.logger import Logger
from repositories.dashboard_repository import DashboardRepository
from repositories.alert_repository import AlertRepository
from services.command_service import CommandService
from controllers.command_controller import CommandController
from clients.sensor_client import SensorClient
from db.connection import get_pool


@lru_cache()
def get_config() -> Config:
    return Config()


def get_logger() -> Logger:
    config = get_config()
    return Logger(config)


async def get_dashboard_repository() -> DashboardRepository:
    pool = await get_pool()
    return DashboardRepository(pool)


async def get_alert_repository() -> AlertRepository:
    pool = await get_pool()
    return AlertRepository(pool)


def get_sensor_client() -> SensorClient:
    return SensorClient()


async def get_command_service() -> CommandService:
    dashboard_repo = await get_dashboard_repository()
    alert_repo = await get_alert_repository()
    sensor_client = get_sensor_client()
    logger = get_logger()
    return CommandService(dashboard_repo, alert_repo, sensor_client, logger)


async def get_command_controller() -> CommandController:
    service = await get_command_service()
    logger = get_logger()
    return CommandController(service, logger)


def get_api_key() -> str:
    config = get_config()
    return config.get_api_key()
