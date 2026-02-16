from functools import lru_cache
from config.config import Config
from services.logger import Logger
from repositories.sensor_repository import SensorRepository
from services.sensor_service import SensorService
from controllers.sensor_controller import SensorController


# Initialize in-memory storage with initial data
_initial_storage = {
    'temp_living_room': {
        'sensor_id': 'temp_living_room',
        'type': 'temperature',
        'value': 72.4,
        'unit': 'F',
        'timestamp': '2026-01-18T14:30:00Z'
    },
    'humidity_basement': {
        'sensor_id': 'humidity_basement',
        'type': 'humidity',
        'value': 45,
        'unit': '%',
        'timestamp': '2026-01-18T14:30:00Z'
    },
    'motion_kitchen': {
        'sensor_id': 'motion_kitchen',
        'type': 'motion',
        'value': 0,
        'unit': 'boolean',
        'timestamp': '2026-01-18T14:30:00Z'
    },
    'temp_bedroom': {
        'sensor_id': 'temp_bedroom',
        'type': 'temperature',
        'value': 68.2,
        'unit': 'F',
        'timestamp': '2026-01-18T14:30:00Z'
    },
    'humidity_living_room': {
        'sensor_id': 'humidity_living_room',
        'type': 'humidity',
        'value': 42,
        'unit': '%',
        'timestamp': '2026-01-18T14:30:00Z'
    }
}

_storage = _initial_storage.copy()


@lru_cache()
def get_config() -> Config:
    return Config()


def get_logger() -> Logger:
    config = get_config()
    return Logger(config)


def get_repository() -> SensorRepository:
    return SensorRepository(_storage)


def get_sensor_service() -> SensorService:
    repository = get_repository()
    logger = get_logger()
    return SensorService(repository, logger)


def get_sensor_controller() -> SensorController:
    service = get_sensor_service()
    logger = get_logger()
    return SensorController(service, logger)


def get_api_key() -> str:
    config = get_config()
    return config.get_api_key()
