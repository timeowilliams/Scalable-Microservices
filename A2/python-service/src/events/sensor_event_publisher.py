from events.rabbitmq_client import publish_event
from events.event_schema import SENSOR_EVENTS, create_sensor_event
from typing import Dict, Any


class SensorEventPublisher:
    async def publish_sensor_created(self, sensor_data: Dict[str, Any]):
        event = create_sensor_event(SENSOR_EVENTS['CREATED'], sensor_data, 'python-sensor-service')
        return publish_event('sensor.events', 'sensor.created', event)

    async def publish_sensor_updated(self, sensor_data: Dict[str, Any]):
        event = create_sensor_event(SENSOR_EVENTS['UPDATED'], sensor_data, 'python-sensor-service')
        return publish_event('sensor.events', 'sensor.updated', event)

    async def publish_sensor_alert(self, sensor_data: Dict[str, Any], alert_message: str):
        event = create_sensor_event(SENSOR_EVENTS['ALERT'], {
            **sensor_data,
            'alert_message': alert_message
        }, 'python-sensor-service')
        return publish_event('sensor.events', 'sensor.alert', event)
