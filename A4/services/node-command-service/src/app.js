const express = require('express');
const Config = require('./config/config');
const Logger = require('./services/logger');
const DashboardRepository = require('./repositories/dashboardRepository');
const AlertRepository = require('./repositories/alertRepository');
const CommandService = require('./services/commandService');
const CommandController = require('./controllers/commandController');
const createCommandRoutes = require('./routes/command');
const correlationIdMiddleware = require('./middleware/correlationId');
const authMiddleware = require('./middleware/auth');
const rateLimiterMiddleware = require('./middleware/rateLimiter');
const SensorClient = require('./clients/sensorClient');
const { getPool, initializeDatabase } = require('./db/connection');
const EventSubscriber = require('./events/eventSubscriber');
const { httpMetricsMiddleware, metricsHandler } = require('./observability/metrics');

function createApp() {
  const app = express();

  // Dependency Injection setup
  const config = new Config();
  const logger = new Logger(config);
  const pool = getPool(); // Bulkhead: isolated database connection pool
  const dashboardRepository = new DashboardRepository(pool);
  const alertRepository = new AlertRepository(pool);
  const sensorClient = new SensorClient(); // Bulkhead: separate HTTP client
  const service = new CommandService(dashboardRepository, alertRepository, sensorClient, logger);
  const controller = new CommandController(service, logger);

  // Initialize database on startup
  initializeDatabase().catch(err => {
    logger.error('Failed to initialize database', { error: err.message });
  });

  // Start event subscriber (non-blocking)
  const eventSubscriber = new EventSubscriber(dashboardRepository, alertRepository, logger);
  eventSubscriber.start().catch(err => {
    logger.error('Failed to start event subscriber', { error: err.message });
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
      res.json({ status: 'ok', service: 'node-command', database: 'connected' });
    } catch (error) {
      res.status(503).json({ status: 'error', service: 'node-command', database: 'disconnected' });
    }
  });

  if (config.isMetricsEnabled()) {
    app.get('/metrics', metricsHandler);
  }

  // Command routes
  const commandAuthMiddleware = authMiddleware(config, logger);
  app.use('/', createCommandRoutes(controller, commandAuthMiddleware, rateLimiterMiddleware));

  return app;
}

module.exports = createApp;
