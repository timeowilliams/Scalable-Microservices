class SensorRepository {
  constructor(storage) {
    this.storage = storage;
  }

  findAll() {
    return Array.from(this.storage.values());
  }

  findById(id) {
    return this.storage.get(id) || null;
  }

  create(sensorData) {
    const id = sensorData.sensor_id;
    this.storage.set(id, sensorData);
    return sensorData;
  }

  exists(id) {
    return this.storage.has(id);
  }
}

module.exports = SensorRepository;
