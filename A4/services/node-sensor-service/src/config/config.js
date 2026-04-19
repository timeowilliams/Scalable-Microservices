class Config {
  constructor() {
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.apiKey = process.env.API_KEY || 'default-api-key-change-me';
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.nodeEnv = process.env.NODE_ENV || 'development';
    
    // Database configuration
    this.dbHost = process.env.DB_HOST || 'localhost';
    this.dbPort = parseInt(process.env.DB_PORT || '5432', 10);
    this.dbName = process.env.DB_NAME || 'node_sensor_db';
    this.dbUser = process.env.DB_USER || 'sensor_user';
    this.dbPassword = process.env.DB_PASSWORD || 'sensor_pass';
    
    // RabbitMQ configuration
    this.rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';
    
    // Worker configuration
    this.workers = parseInt(process.env.WORKERS || '2', 10);

    // Observability configuration
    this.enableMetrics = (process.env.ENABLE_METRICS || 'true') === 'true';
    this.otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '';
    this.otelServiceName = process.env.OTEL_SERVICE_NAME || 'node-sensor-service';

    // Network boundary and browser security
    this.allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
    this.enableHsts = (process.env.ENABLE_HSTS || 'false') === 'true';
  }

  getPort() {
    return this.port;
  }

  getApiKey() {
    return this.apiKey;
  }

  getLogLevel() {
    return this.logLevel;
  }

  getNodeEnv() {
    return this.nodeEnv;
  }

  getDbConfig() {
    return {
      host: this.dbHost,
      port: this.dbPort,
      database: this.dbName,
      user: this.dbUser,
      password: this.dbPassword,
      min: 2, // Bulkhead: minimum pool size
      max: 10, // Bulkhead: maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  getRabbitmqUrl() {
    return this.rabbitmqUrl;
  }

  getWorkers() {
    return this.workers;
  }

  isMetricsEnabled() {
    return this.enableMetrics;
  }

  getOtelEndpoint() {
    return this.otelEndpoint;
  }

  getOtelServiceName() {
    return this.otelServiceName;
  }

  getAllowedOrigin() {
    return this.allowedOrigin;
  }

  isHstsEnabled() {
    return this.enableHsts;
  }
}

module.exports = Config;
