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
const { getPool, initializeDatabase } = require('./db/connection');

function createApp() {
  const app = express();

  // Dependency Injection setup
  const config = new Config();
  const logger = new Logger(config);
  const pool = getPool(); // Bulkhead: isolated database connection pool
  const repository = new SensorRepository(pool);
  const eventPublisher = new SensorEventPublisher(); // Bulkhead: separate event bus connection
  const service = new SensorService(repository, logger, eventPublisher);
  const controller = new SensorController(service, logger);

  // Initialize database on startup
  initializeDatabase().catch(err => {
    logger.error('Failed to initialize database', { error: err.message });
  });

  // Middleware
  app.use(express.json());
  app.use(correlationIdMiddleware);
  app.use((req, res, next) => {
    logger.setCorrelationId(req.correlationId);
    next();
  });

  // Health check endpoint with database status
  app.get('/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', service: 'node', database: 'connected' });
    } catch (error) {
      res.status(503).json({ status: 'error', service: 'node', database: 'disconnected' });
    }
  });

  // Sensor routes with dependency injection
  const sensorAuthMiddleware = authMiddleware(config, logger);
  app.use('/sensors', createSensorRoutes(controller, sensorAuthMiddleware, validateSensorCreate));

  return app;
}

module.exports = createApp;
