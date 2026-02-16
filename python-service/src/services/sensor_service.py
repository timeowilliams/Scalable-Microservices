from typing import Dict, List, Optional, Any
from datetime import datetime


class SensorService:
    def __init__(self, repository, logger):
        self.repository = repository
        self.logger = logger

    def get_all_sensors(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        filters = filters or {}
        self.logger.info('Fetching all sensors', {'filters': filters})

        sensors = self.repository.find_all()

        # Business rule: Filter by type
        if 'type' in filters and filters['type']:
            sensors = [s for s in sensors if s['type'] == filters['type']]

        # Business rule: Pagination
        if 'limit' in filters and filters['limit']:
            offset = filters.get('offset', 0)
            sensors = sensors[offset:offset + filters['limit']]

        return sensors

    def get_sensor_by_id(self, sensor_id: str) -> Dict[str, Any]:
        self.logger.info('Fetching sensor', {'sensor_id': sensor_id})

        sensor = self.repository.find_by_id(sensor_id)

        if not sensor:
            self.logger.warn('Sensor not found', {'sensor_id': sensor_id})
            raise ValueError('Sensor not found')

        return sensor

    def create_sensor(self, sensor_data: Dict[str, Any]) -> Dict[str, Any]:
        sensor_id = sensor_data['sensor_id']
        self.logger.info('Creating sensor', {'sensor_id': sensor_id})

        # Business rule: Check duplicates
        if self.repository.exists(sensor_id):
            self.logger.warn('Sensor already exists', {'sensor_id': sensor_id})
            raise ValueError('Sensor already exists')

        # Business rule: Auto-timestamp
        if 'timestamp' not in sensor_data or not sensor_data['timestamp']:
            sensor_data['timestamp'] = datetime.utcnow().isoformat() + 'Z'

        # Business rule: Validate ranges
        self._validate_sensor_value(sensor_data)

        return self.repository.create(sensor_data)

    def _validate_sensor_value(self, sensor: Dict[str, Any]):
        sensor_type = sensor['type']
        value = sensor['value']
        unit = sensor['unit']

        # Temperature validation
        if sensor_type == 'temperature':
            if unit == 'F' and not (-50 <= value <= 150):
                raise ValueError('Temperature out of valid range (-50 to 150 F)')
            if unit == 'C' and not (-45 <= value <= 65):
                raise ValueError('Temperature out of valid range (-45 to 65 C)')

        # Humidity validation
        if sensor_type == 'humidity':
            if unit == '%' and not (0 <= value <= 100):
                raise ValueError('Humidity out of valid range (0 to 100%)')

        # Motion validation
        if sensor_type == 'motion':
            if unit == 'boolean' and value not in [0, 1]:
                raise ValueError('Motion sensor value must be 0 or 1')

        # Pressure validation
        if sensor_type == 'pressure':
            if unit == 'psi' and not (0 <= value <= 200):
                raise ValueError('Pressure out of valid range (0 to 200 psi)')
            if unit == 'kPa' and not (0 <= value <= 1400):
                raise ValueError('Pressure out of valid range (0 to 1400 kPa)')

        # Light validation
        if sensor_type == 'light':
            if unit == 'lux' and value < 0:
                raise ValueError('Light value must be non-negative')
