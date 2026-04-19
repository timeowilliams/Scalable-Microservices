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
const SensorEventPublisher = require('./events/sensorEventPublisher');
const { httpMetricsMiddleware, metricsHandler } = require('./observability/metrics');

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
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Access-Control-Allow-Origin', config.getAllowedOrigin());
    if (config.isHstsEnabled()) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });
  app.use(correlationIdMiddleware);
  app.use((req, res, next) => {
    logger.setCorrelationId(req.correlationId);
    next();
  });
  if (config.isMetricsEnabled()) {
    app.use(httpMetricsMiddleware);
  }

  // Health check endpoint with database status
  app.get('/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', service: 'node', database: 'connected' });
    } catch (error) {
      res.status(503).json({ status: 'error', service: 'node', database: 'disconnected' });
    }
  });

  if (config.isMetricsEnabled()) {
    app.get('/metrics', metricsHandler);
  }

  // Sensor routes with dependency injection
  const sensorAuthMiddleware = authMiddleware(config, logger);
  app.use('/sensors', createSensorRoutes(controller, sensorAuthMiddleware, validateSensorCreate));

  return app;
}

module.exports = createApp;
