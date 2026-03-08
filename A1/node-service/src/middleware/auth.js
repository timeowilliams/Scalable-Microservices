function authMiddleware(config, logger) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn('Authentication failed - missing authorization header', {
        correlationId: req.correlationId
      });
      return res.status(401).json({ error: 'Unauthorized - Invalid or missing API key' });
    }

    // Extract Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn('Authentication failed - invalid token format', {
        correlationId: req.correlationId
      });
      return res.status(401).json({ error: 'Unauthorized - Invalid or missing API key' });
    }

    const token = parts[1];
    const validApiKey = config.getApiKey();

    // Validate token syntactically (full OAuth later)
    if (token !== validApiKey) {
      logger.warn('Authentication failed - invalid API key', {
        correlationId: req.correlationId
      });
      return res.status(401).json({ error: 'Unauthorized - Invalid or missing API key' });
    }

    logger.info('Authentication successful', {
      correlationId: req.correlationId
    });

    next();
  };
}

module.exports = authMiddleware;
