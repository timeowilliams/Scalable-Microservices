// Rate Limiter implementation (Token Bucket Algorithm)
class RateLimiter {
  constructor(rate, capacity) {
    this.rate = rate; // tokens per second
    this.capacity = capacity; // max tokens
    this.tokens = capacity;
    this.lastCheck = Date.now();
  }

  allowRequest() {
    const now = Date.now();
    const elapsed = (now - this.lastCheck) / 1000; // seconds
    this.lastCheck = now;

    // Add tokens based on elapsed time
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.rate);

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}

// Create rate limiters for different endpoints
const generalLimiter = new RateLimiter(100, 200); // 100 req/sec, burst 200
const writeLimiter = new RateLimiter(50, 100); // 50 req/sec, burst 100

function rateLimiterMiddleware(req, res, next) {
  // Use stricter limits for write operations
  const isWriteOperation = req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT';
  const limiter = isWriteOperation ? writeLimiter : generalLimiter;

  if (limiter.allowRequest()) {
    next();
  } else {
    res.status(429).json({ error: 'Rate limit exceeded' });
  }
}

module.exports = rateLimiterMiddleware;
