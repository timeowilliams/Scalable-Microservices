from events.rabbitmq_client import publish_event
from events.event_schema import COMMAND_EVENTS, create_command_event
from typing import Dict, Any


class CommandEventPublisher:
    def publish_command_issued(self, command_data: Dict[str, Any]):
        event = create_command_event(COMMAND_EVENTS['ISSUED'], command_data, 'python-command-service')
        return publish_event('command.events', 'command.issued', event)

    def publish_mission_status_changed(self, mission_data: Dict[str, Any]):
        event = create_command_event(COMMAND_EVENTS['MISSION_STATUS_CHANGED'], mission_data, 'python-command-service')
        return publish_event('command.events', 'mission.status.changed', event)

    def publish_threat_level_changed(self, threat_data: Dict[str, Any]):
        event = create_command_event(COMMAND_EVENTS['THREAT_LEVEL_CHANGED'], threat_data, 'python-command-service')
        return publish_event('command.events', 'threat.level.changed', event)

    def publish_alert_acknowledged(self, alert_data: Dict[str, Any]):
        event = create_command_event(COMMAND_EVENTS['ALERT_ACKNOWLEDGED'], alert_data, 'python-command-service')
        return publish_event('command.events', 'alert.acknowledged', event)
