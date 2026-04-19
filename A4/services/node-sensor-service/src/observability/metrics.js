const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'a4_sensor_http_request_duration_seconds',
  help: 'HTTP request latency for node sensor service',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

const httpRequestCount = new client.Counter({
  name: 'a4_sensor_http_requests_total',
  help: 'Total HTTP requests for node sensor service',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

function routeLabel(req) {
  if (req.route && req.route.path) {
    return req.baseUrl ? `${req.baseUrl}${req.route.path}` : req.route.path;
  }
  return req.path || 'unknown';
}

function httpMetricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: routeLabel(req),
      status_code: String(res.statusCode),
    };
    end(labels);
    httpRequestCount.inc(labels);
  });
  next();
}

async function metricsHandler(req, res) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

module.exports = {
  register,
  httpMetricsMiddleware,
  metricsHandler,
};
