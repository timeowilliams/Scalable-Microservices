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
}

module.exports = Config;
