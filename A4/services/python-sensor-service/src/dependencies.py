from functools import lru_cache
from config.config import Config
from services.logger import Logger
from repositories.sensor_repository import SensorRepository
from services.sensor_service import SensorService
from controllers.sensor_controller import SensorController
from db.connection import get_pool, initialize_database
from events.sensor_event_publisher import SensorEventPublisher


@lru_cache()
def get_config() -> Config:
    return Config()


def get_logger() -> Logger:
    config = get_config()
    return Logger(config)


async def get_repository() -> SensorRepository:
    pool = await get_pool()
    return SensorRepository(pool)


async def get_sensor_service() -> SensorService:
    repository = await get_repository()
    logger = get_logger()
    event_publisher = SensorEventPublisher()  # Bulkhead: separate event bus connection
    return SensorService(repository, logger, event_publisher)


async def get_sensor_controller() -> SensorController:
    service = await get_sensor_service()
    logger = get_logger()
    return SensorController(service, logger)


def get_api_key() -> str:
    config = get_config()
    return config.get_api_key()
