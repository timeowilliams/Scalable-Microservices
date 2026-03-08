const { publishEvent } = require('./rabbitmqClient');
const { SENSOR_EVENTS, createSensorEvent } = require('./eventSchema');

class SensorEventPublisher {
  async publishSensorCreated(sensorData) {
    const event = createSensorEvent(SENSOR_EVENTS.CREATED, sensorData, 'node-sensor-service');
    return await publishEvent('sensor.events', 'sensor.created', event);
  }

  async publishSensorUpdated(sensorData) {
    const event = createSensorEvent(SENSOR_EVENTS.UPDATED, sensorData, 'node-sensor-service');
    return await publishEvent('sensor.events', 'sensor.updated', event);
  }

  async publishSensorAlert(sensorData, alertMessage) {
    const event = createSensorEvent(SENSOR_EVENTS.ALERT, {
      ...sensorData,
      alert_message: alertMessage
    }, 'node-sensor-service');
    return await publishEvent('sensor.events', 'sensor.alert', event);
  }
}

module.exports = SensorEventPublisher;
