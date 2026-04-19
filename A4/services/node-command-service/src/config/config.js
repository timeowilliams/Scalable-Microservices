class Config {
  constructor() {
    this.port = parseInt(process.env.PORT || '3001', 10);
    this.apiKey = process.env.API_KEY || 'default-api-key-change-me';
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.nodeEnv = process.env.NODE_ENV || 'development';
    
    // Database configuration
    this.dbHost = process.env.DB_HOST || 'localhost';
    this.dbPort = parseInt(process.env.DB_PORT || '5432', 10);
    this.dbName = process.env.DB_NAME || 'node_command_db';
    this.dbUser = process.env.DB_USER || 'command_user';
    this.dbPassword = process.env.DB_PASSWORD || 'command_pass';
    
    // Sensor service URL
    this.sensorServiceUrl = process.env.SENSOR_SERVICE_URL || 'http://localhost:3000';
    
    // RabbitMQ configuration
    this.rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';
    
    // Worker configuration
    this.workers = parseInt(process.env.WORKERS || '2', 10);

    // Explicit backpressure controls
    this.generalRateLimitRps = parseInt(process.env.RATE_LIMIT_GENERAL_RPS || '100', 10);
    this.generalRateLimitBurst = parseInt(process.env.RATE_LIMIT_GENERAL_BURST || '200', 10);
    this.writeRateLimitRps = parseInt(process.env.RATE_LIMIT_WRITE_RPS || '50', 10);
    this.writeRateLimitBurst = parseInt(process.env.RATE_LIMIT_WRITE_BURST || '100', 10);
    this.maxConcurrentWrites = parseInt(process.env.BACKPRESSURE_MAX_CONCURRENT_WRITES || '16', 10);
    this.maxPendingWrites = parseInt(process.env.BACKPRESSURE_MAX_PENDING_WRITES || '32', 10);
    this.overloadStrategy = process.env.BACKPRESSURE_OVERLOAD_STRATEGY || 'fail-fast';
    this.maxQueueWaitMs = parseInt(process.env.BACKPRESSURE_MAX_QUEUE_WAIT_MS || '3000', 10);

    // Observability configuration
    this.enableMetrics = (process.env.ENABLE_METRICS || 'true') === 'true';
    this.otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '';
    this.otelServiceName = process.env.OTEL_SERVICE_NAME || 'node-command-service';

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
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  getSensorServiceUrl() {
    return this.sensorServiceUrl;
  }

  getRabbitmqUrl() {
    return this.rabbitmqUrl;
  }

  getWorkers() {
    return this.workers;
  }

  getRateLimitConfig() {
    return {
      generalRps: this.generalRateLimitRps,
      generalBurst: this.generalRateLimitBurst,
      writeRps: this.writeRateLimitRps,
      writeBurst: this.writeRateLimitBurst,
    };
  }

  getBackpressureConfig() {
    return {
      maxConcurrentWrites: this.maxConcurrentWrites,
      maxPendingWrites: this.maxPendingWrites,
      overloadStrategy: this.overloadStrategy,
      maxQueueWaitMs: this.maxQueueWaitMs,
    };
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
