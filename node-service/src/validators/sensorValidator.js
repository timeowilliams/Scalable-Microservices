function validateSensorCreate(req, res, next) {
  const errors = [];
  const { sensor_id, type, value, unit, timestamp } = req.body;

  // Validate sensor_id
  if (!sensor_id || typeof sensor_id !== 'string') {
    errors.push('sensor_id is required and must be a string');
  } else if (!/^[a-z0-9_]+$/.test(sensor_id)) {
    errors.push('sensor_id must match pattern: lowercase letters, numbers, and underscores only');
  } else if (sensor_id.length > 100) {
    errors.push('sensor_id must be 100 characters or less');
  }

  // Validate type
  const validTypes = ['temperature', 'humidity', 'motion', 'pressure', 'light'];
  if (!type || !validTypes.includes(type)) {
    errors.push(`type is required and must be one of: ${validTypes.join(', ')}`);
  }

  // Validate value
  if (value === undefined || value === null || typeof value !== 'number') {
    errors.push('value is required and must be a number');
  }

  // Validate unit
  if (!unit || typeof unit !== 'string') {
    errors.push('unit is required and must be a string');
  }

  // Validate timestamp if provided
  if (timestamp !== undefined && timestamp !== null) {
    if (typeof timestamp !== 'string') {
      errors.push('timestamp must be a string');
    } else {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        errors.push('timestamp must be a valid ISO 8601 date-time string');
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors
    });
  }

  next();
}

module.exports = validateSensorCreate;
