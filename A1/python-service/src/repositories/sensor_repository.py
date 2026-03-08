from typing import Dict, List, Optional, Any


class SensorRepository:
    def __init__(self, storage: Dict[str, Dict[str, Any]]):
        self._storage = storage

    def find_all(self) -> List[Dict[str, Any]]:
        return list(self._storage.values())

    def find_by_id(self, sensor_id: str) -> Optional[Dict[str, Any]]:
        return self._storage.get(sensor_id)

    def create(self, sensor_data: Dict[str, Any]) -> Dict[str, Any]:
        sensor_id = sensor_data['sensor_id']
        self._storage[sensor_id] = sensor_data
        return sensor_data

    def exists(self, sensor_id: str) -> bool:
        return sensor_id in self._storage
