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
}

module.exports = Config;
