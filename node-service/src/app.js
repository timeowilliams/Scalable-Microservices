const express = require('express');
const Config = require('./config/config');
const Logger = require('./services/logger');
const SensorRepository = require('./repositories/sensorRepository');
const SensorService = require('./services/sensorService');
const SensorController = require('./controllers/sensorController');
const createSensorRoutes = require('./routes/sensors');
const correlationIdMiddleware = require('./middleware/correlationId');
const authMiddleware = require('./middleware/auth');
const validateSensorCreate = require('./validators/sensorValidator');

// Initialize in-memory storage with initial data
const storage = new Map([
  ['temp_living_room', {
    sensor_id: 'temp_living_room',
    type: 'temperature',
    value: 72.4,
    unit: 'F',
    timestamp: '2026-01-18T14:30:00Z'
  }],
  ['humidity_basement', {
    sensor_id: 'humidity_basement',
    type: 'humidity',
    value: 45,
    unit: '%',
    timestamp: '2026-01-18T14:30:00Z'
  }],
  ['motion_kitchen', {
    sensor_id: 'motion_kitchen',
    type: 'motion',
    value: 0,
    unit: 'boolean',
    timestamp: '2026-01-18T14:30:00Z'
  }],
  ['temp_bedroom', {
    sensor_id: 'temp_bedroom',
    type: 'temperature',
    value: 68.2,
    unit: 'F',
    timestamp: '2026-01-18T14:30:00Z'
  }],
  ['humidity_living_room', {
    sensor_id: 'humidity_living_room',
    type: 'humidity',
    value: 42,
    unit: '%',
    timestamp: '2026-01-18T14:30:00Z'
  }]
]);

function createApp() {
  const app = express();

  // Dependency Injection setup
  const config = new Config();
  const logger = new Logger(config);
  const repository = new SensorRepository(storage);
  const service = new SensorService(repository, logger);
  const controller = new SensorController(service, logger);

  // Middleware
  app.use(express.json());
  app.use(correlationIdMiddleware);
  app.use((req, res, next) => {
    logger.setCorrelationId(req.correlationId);
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'node' });
  });

  // Sensor routes with dependency injection
  const sensorAuthMiddleware = authMiddleware(config, logger);
  app.use('/sensors', createSensorRoutes(controller, sensorAuthMiddleware, validateSensorCreate));

  return app;
}

module.exports = createApp;
