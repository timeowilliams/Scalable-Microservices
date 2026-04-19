const Config = require('../config/config');

// Rate limiter implementation (token bucket algorithm)
class RateLimiter {
  constructor(rate, capacity) {
    this.rate = rate;
    this.capacity = capacity;
    this.tokens = capacity;
    this.lastCheck = Date.now();
  }

  allowRequest() {
    const now = Date.now();
    const elapsed = (now - this.lastCheck) / 1000;
    this.lastCheck = now;

    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.rate);

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}

const config = new Config();
const rateLimitConfig = config.getRateLimitConfig();
const backpressureConfig = config.getBackpressureConfig();

const generalLimiter = new RateLimiter(rateLimitConfig.generalRps, rateLimitConfig.generalBurst);
const writeLimiter = new RateLimiter(rateLimitConfig.writeRps, rateLimitConfig.writeBurst);

let activeWriteRequests = 0;
const pendingWriteQueue = [];

function drainPendingQueue() {
  while (
    pendingWriteQueue.length > 0 &&
    activeWriteRequests < backpressureConfig.maxConcurrentWrites &&
    writeLimiter.allowRequest()
  ) {
    const queued = pendingWriteQueue.shift();
    if (queued && !queued.res.headersSent) {
      queued.start();
    }
  }
}

function attachWriteLifecycle(res) {
  activeWriteRequests += 1;
  res.once('finish', () => {
    activeWriteRequests = Math.max(0, activeWriteRequests - 1);
    drainPendingQueue();
  });
}

function rejectOverload(res, strategy) {
  if (strategy === 'drop') {
    return res.status(503).json({ error: 'Service overloaded: request dropped by policy' });
  }
  return res.status(429).json({ error: 'Rate limit exceeded' });
}

function enqueueWrite(req, res, next) {
  if (pendingWriteQueue.length >= backpressureConfig.maxPendingWrites) {
    return rejectOverload(res, backpressureConfig.overloadStrategy);
  }

  const queued = {
    req,
    res,
    start: () => {
      if (!res.headersSent) {
        clearTimeout(timeoutHandle);
        attachWriteLifecycle(res);
        next();
      }
    },
  };

  const timeoutHandle = setTimeout(() => {
    const idx = pendingWriteQueue.indexOf(queued);
    if (idx >= 0) {
      pendingWriteQueue.splice(idx, 1);
    }
    if (!res.headersSent) {
      res.status(503).json({ error: 'Request queue timeout exceeded' });
    }
  }, backpressureConfig.maxQueueWaitMs);

  pendingWriteQueue.push(queued);
  return undefined;
}

function rateLimiterMiddleware(req, res, next) {
  const isWriteOperation = req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT';

  if (!isWriteOperation) {
    if (generalLimiter.allowRequest()) {
      return next();
    }
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  if (activeWriteRequests < backpressureConfig.maxConcurrentWrites && writeLimiter.allowRequest()) {
    attachWriteLifecycle(res);
    next();
    return;
  }

  if (backpressureConfig.overloadStrategy === 'delay') {
    enqueueWrite(req, res, next);
    return;
  }

  rejectOverload(res, backpressureConfig.overloadStrategy);
}

module.exports = rateLimiterMiddleware;
