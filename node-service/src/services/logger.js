class Logger {
  constructor(config) {
    this.config = config;
    this.correlationId = null;
  }

  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
  }

  _log(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'node-sensor-service',
      ...(this.correlationId && { correlationId: this.correlationId }),
      ...metadata
    };

    const logLevel = this.config.getLogLevel();
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    
    if (levels[level] <= levels[logLevel]) {
      console.log(JSON.stringify(logEntry));
    }
  }

  info(message, metadata) {
    this._log('info', message, metadata);
  }

  warn(message, metadata) {
    this._log('warn', message, metadata);
  }

  error(message, metadata) {
    this._log('error', message, metadata);
  }

  debug(message, metadata) {
    this._log('debug', message, metadata);
  }
}

module.exports = Logger;
