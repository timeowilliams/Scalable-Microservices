// Event Schema Definitions

const SENSOR_EVENTS = {
  CREATED: 'sensor.created',
  UPDATED: 'sensor.updated',
  ALERT: 'sensor.alert',
  TELEMETRY: 'sensor.telemetry'
};

const COMMAND_EVENTS = {
  ISSUED: 'command.issued',
  MISSION_STATUS_CHANGED: 'mission.status.changed',
  THREAT_LEVEL_CHANGED: 'threat.level.changed',
  ALERT_ACKNOWLEDGED: 'alert.acknowledged'
};

function createSensorEvent(eventType, sensorData, source = 'sensor-service') {
  return {
    event_type: eventType,
    event_id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    source: source,
    data: sensorData
  };
}

function createCommandEvent(eventType, commandData, source = 'command-service') {
  return {
    event_type: eventType,
    event_id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    source: source,
    data: commandData
  };
}

module.exports = {
  SENSOR_EVENTS,
  COMMAND_EVENTS,
  createSensorEvent,
  createCommandEvent
};
