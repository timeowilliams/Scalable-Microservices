const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'a2_command_http_request_duration_seconds',
  help: 'HTTP request latency for command service',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

const httpRequestCount = new client.Counter({
  name: 'a2_command_http_requests_total',
  help: 'Total HTTP requests for command service',
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

/**
 * JSON snapshot for UIs: HTTP 5xx share over requests since the previous call.
 * First call returns null percentages (warm-up); subsequent calls use counter deltas.
 */
function createObservabilitySummaryHandler(isMetricsEnabled) {
  let prevSnapshot = null;

  return async (req, res) => {
    if (!isMetricsEnabled()) {
      return res.json({
        metricsEnabled: false,
        command: {
          httpErrorSharePercent: null,
          requestsInWindow: null,
          errors5xxInWindow: null,
        },
      });
    }

    const data = await httpRequestCount.get();
    let requestsTotal = 0;
    let errors5xx = 0;
    for (const v of data.values) {
      requestsTotal += v.value;
      const code = String(v.labels.status_code || '');
      if (code.startsWith('5')) errors5xx += v.value;
    }

    if (prevSnapshot === null) {
      prevSnapshot = { requestsTotal, errors5xx };
      return res.json({
        metricsEnabled: true,
        command: {
          httpErrorSharePercent: null,
          requestsInWindow: null,
          errors5xxInWindow: null,
        },
      });
    }

    const requestsInWindow = requestsTotal - prevSnapshot.requestsTotal;
    const errors5xxInWindow = errors5xx - prevSnapshot.errors5xx;
    prevSnapshot = { requestsTotal, errors5xx };

    const httpErrorSharePercent =
      requestsInWindow > 0
        ? Number(((errors5xxInWindow / requestsInWindow) * 100).toFixed(2))
        : 0;

    return res.json({
      metricsEnabled: true,
      command: {
        httpErrorSharePercent,
        requestsInWindow,
        errors5xxInWindow,
      },
    });
  };
}

module.exports = {
  register,
  httpMetricsMiddleware,
  metricsHandler,
  createObservabilitySummaryHandler,
};
