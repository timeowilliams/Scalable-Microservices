class SensorController {
  constructor(service, logger) {
    this.service = service;
    this.logger = logger;
  }

  async getAllSensors(req, res) {
    try {
      const correlationId = req.correlationId || req.headers['x-correlation-id'];
      this.logger.setCorrelationId(correlationId);

      // Extract query parameters (HTTP concern)
      const filters = {
        type: req.query.type,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset, 10) : undefined
      };

      // Call service (business logic)
      const sensors = this.service.getAllSensors(filters);

      // Format HTTP response
      res.status(200).json({
        data: sensors,
        count: sensors.length
      });
    } catch (error) {
      this.logger.error('Error fetching sensors', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSensorById(req, res) {
    try {
      const correlationId = req.correlationId || req.headers['x-correlation-id'];
      this.logger.setCorrelationId(correlationId);

      const { id } = req.params; // Extract from URL path

      const sensor = this.service.getSensorById(id);

      res.status(200).json(sensor);
    } catch (error) {
      if (error.message === 'Sensor not found') {
        res.status(404).json({ error: 'Sensor not found' });
      } else {
        this.logger.error('Error fetching sensor', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async createSensor(req, res) {
    try {
      const correlationId = req.correlationId || req.headers['x-correlation-id'];
      this.logger.setCorrelationId(correlationId);

      const sensorData = req.body; // Parse JSON body

      const created = this.service.createSensor(sensorData);

      res.status(201).json(created);
    } catch (error) {
      if (error.message === 'Sensor already exists') {
        res.status(409).json({ error: 'Sensor already exists' });
      } else if (error.message.includes('out of valid range') || error.message.includes('must be')) {
        res.status(400).json({ error: error.message });
      } else {
        this.logger.error('Error creating sensor', { error: error.message });
        res.status(400).json({ error: error.message });
      }
    }
  }
}

module.exports = SensorController;
