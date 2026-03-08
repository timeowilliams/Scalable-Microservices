const axios = require('axios');
const Config = require('../config/config');

// Bulkhead: Separate HTTP client instances with connection limits
const syncClient = axios.create({
  timeout: 5000,
  maxRedirects: 0,
  // Bulkhead: limit connections for sync calls
  httpAgent: new (require('http').Agent)({ maxSockets: 5 }),
  httpsAgent: new (require('https').Agent)({ maxSockets: 5 })
});

const asyncClient = axios.create({
  timeout: 10000,
  maxRedirects: 0,
  // Bulkhead: separate pool for async calls
  httpAgent: new (require('http').Agent)({ maxSockets: 20 }),
  httpsAgent: new (require('https').Agent)({ maxSockets: 20 })
});

// Circuit Breaker implementation
class CircuitBreaker {
  constructor(failureThreshold = 5, recoveryTimeout = 30000) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
    this.failures = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.lastFailureTime = null;
  }

  async call(func, ...args) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN: dependency unavailable');
      }
    }

    try {
      const result = await func(...args);
      this.failures = 0;
      this.state = 'CLOSED';
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
      }

      throw error;
    }
  }
}

const circuitBreaker = new CircuitBreaker(5, 30000);

class SensorClient {
  constructor() {
    const config = new Config();
    this.baseUrl = config.getSensorServiceUrl();
  }

  // Synchronous call - blocking, simple operation
  async getSensorSync(sensorId) {
    return circuitBreaker.call(async () => {
      const response = await syncClient.get(`${this.baseUrl}/sensors/${sensorId}`);
      return response.data;
    });
  }

  // Asynchronous parallel calls - non-blocking, batch operations
  async getSensorsAsync(sensorIds) {
    return circuitBreaker.call(async () => {
      const promises = sensorIds.map(id =>
        asyncClient.get(`${this.baseUrl}/sensors/${id}`)
          .then(res => res.data)
          .catch(err => ({ error: err.message, sensor_id: id }))
      );
      return Promise.all(promises);
    });
  }

  // Get all sensors
  async getAllSensors(filters = {}) {
    return circuitBreaker.call(async () => {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const url = `${this.baseUrl}/sensors${params.toString() ? '?' + params.toString() : ''}`;
      const response = await asyncClient.get(url);
      return response.data;
    });
  }
}

module.exports = SensorClient;
