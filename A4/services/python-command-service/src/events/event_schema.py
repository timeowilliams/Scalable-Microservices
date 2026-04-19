import json
import time
import random
import string
from datetime import datetime
from typing import Dict, Any

# Event type constants
SENSOR_EVENTS = {
    'CREATED': 'sensor.created',
    'UPDATED': 'sensor.updated',
    'ALERT': 'sensor.alert',
    'TELEMETRY': 'sensor.telemetry'
}

COMMAND_EVENTS = {
    'ISSUED': 'command.issued',
    'MISSION_STATUS_CHANGED': 'mission.status.changed',
    'THREAT_LEVEL_CHANGED': 'threat.level.changed',
    'ALERT_ACKNOWLEDGED': 'alert.acknowledged'
}


def create_sensor_event(event_type: str, sensor_data: Dict[str, Any], source: str = 'sensor-service') -> Dict[str, Any]:
    return {
        'event_type': event_type,
        'event_id': f"event_{int(time.time() * 1000)}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=9))}",
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'source': source,
        'data': sensor_data
    }


def create_command_event(event_type: str, command_data: Dict[str, Any], source: str = 'command-service') -> Dict[str, Any]:
    return {
        'event_type': event_type,
        'event_id': f"event_{int(time.time() * 1000)}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=9))}",
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'source': source,
        'data': command_data
    }
