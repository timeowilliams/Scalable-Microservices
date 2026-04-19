function correlationIdMiddleware(req, res, next) {
  // Generate correlation ID if not present
  const correlationId = req.headers['x-correlation-id'] || 
                       `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  
  next();
}

module.exports = correlationIdMiddleware;
