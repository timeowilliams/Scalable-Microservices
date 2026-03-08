class SensorService {
  constructor(repository, logger) {
    this.repository = repository;
    this.logger = logger;
  }

  getAllSensors(filters = {}) {
    this.logger.info('Fetching all sensors', { filters });

    let sensors = this.repository.findAll();

    // Business rule: Filter by type if provided
    if (filters.type) {
      sensors = sensors.filter(s => s.type === filters.type);
    }

    // Business rule: Apply pagination
    if (filters.limit) {
      const offset = filters.offset || 0;
      sensors = sensors.slice(offset, offset + filters.limit);
    }

    return sensors;
  }

  getSensorById(id) {
    this.logger.info('Fetching sensor', { sensor_id: id });

    const sensor = this.repository.findById(id);

    if (!sensor) {
      this.logger.warn('Sensor not found', { sensor_id: id });
      throw new Error('Sensor not found');
    }

    return sensor;
  }

  createSensor(sensorData) {
    const sensorId = sensorData.sensor_id;
    this.logger.info('Creating sensor', { sensor_id: sensorId });

    // Business rule: Check if sensor already exists
    if (this.repository.exists(sensorId)) {
      this.logger.warn('Sensor already exists', { sensor_id: sensorId });
      throw new Error('Sensor already exists');
    }

    // Business rule: Auto-generate timestamp if missing
    if (!sensorData.timestamp) {
      sensorData.timestamp = new Date().toISOString();
    }

    // Business rule: Validate value ranges based on type
    this._validateSensorValue(sensorData);

    return this.repository.create(sensorData);
  }

  _validateSensorValue(sensor) {
    const { type, value, unit } = sensor;

    // Temperature validation
    if (type === 'temperature') {
      if (unit === 'F' && (value < -50 || value > 150)) {
        throw new Error('Temperature out of valid range (-50 to 150 F)');
      }
      if (unit === 'C' && (value < -45 || value > 65)) {
        throw new Error('Temperature out of valid range (-45 to 65 C)');
      }
    }

    // Humidity validation
    if (type === 'humidity') {
      if (unit === '%' && (value < 0 || value > 100)) {
        throw new Error('Humidity out of valid range (0 to 100%)');
      }
    }

    // Motion validation
    if (type === 'motion') {
      if (unit === 'boolean' && value !== 0 && value !== 1) {
        throw new Error('Motion sensor value must be 0 or 1');
      }
    }

    // Pressure validation
    if (type === 'pressure') {
      if (unit === 'psi' && (value < 0 || value > 200)) {
        throw new Error('Pressure out of valid range (0 to 200 psi)');
      }
      if (unit === 'kPa' && (value < 0 || value > 1400)) {
        throw new Error('Pressure out of valid range (0 to 1400 kPa)');
      }
    }

    // Light validation
    if (type === 'light') {
      if (unit === 'lux' && value < 0) {
        throw new Error('Light value must be non-negative');
      }
    }
  }
}

module.exports = SensorService;
