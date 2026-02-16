class Config {
  constructor() {
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.apiKey = process.env.API_KEY || 'default-api-key-change-me';
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.nodeEnv = process.env.NODE_ENV || 'development';
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
}

module.exports = Config;
