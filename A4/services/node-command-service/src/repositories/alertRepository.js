const { getPool } = require('../db/connection');

class AlertRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findAll(filters = {}) {
    let query = 'SELECT * FROM alerts WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.acknowledged !== undefined) {
      query += ` AND acknowledged = $${paramCount++}`;
      params.push(filters.acknowledged);
    }
    if (filters.severity) {
      query += ` AND severity = $${paramCount++}`;
      params.push(filters.severity);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramCount++}`;
      params.push(filters.limit);
      if (filters.offset) {
        query += ` OFFSET $${paramCount++}`;
        params.push(filters.offset);
      }
    }

    const result = await this.pool.query(query, params);
    return result.rows.map(row => ({
      alert_id: row.alert_id,
      sensor_id: row.sensor_id,
      alert_type: row.alert_type,
      severity: row.severity,
      message: row.message,
      acknowledged: row.acknowledged,
      created_at: row.created_at.toISOString()
    }));
  }

  async findById(id) {
    const result = await this.pool.query(
      'SELECT * FROM alerts WHERE alert_id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      alert_id: row.alert_id,
      sensor_id: row.sensor_id,
      alert_type: row.alert_type,
      severity: row.severity,
      message: row.message,
      acknowledged: row.acknowledged,
      created_at: row.created_at.toISOString()
    };
  }

  async create(alertData) {
    const { alert_id, sensor_id, alert_type, severity, message } = alertData;
    
    const result = await this.pool.query(
      `INSERT INTO alerts (alert_id, sensor_id, alert_type, severity, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [alert_id, sensor_id, alert_type, severity, message]
    );
    
    const row = result.rows[0];
    return {
      alert_id: row.alert_id,
      sensor_id: row.sensor_id,
      alert_type: row.alert_type,
      severity: row.severity,
      message: row.message,
      acknowledged: row.acknowledged,
      created_at: row.created_at.toISOString()
    };
  }

  async acknowledge(id) {
    const result = await this.pool.query(
      'UPDATE alerts SET acknowledged = TRUE WHERE alert_id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      alert_id: row.alert_id,
      sensor_id: row.sensor_id,
      alert_type: row.alert_type,
      severity: row.severity,
      message: row.message,
      acknowledged: row.acknowledged,
      created_at: row.created_at.toISOString()
    };
  }
}

module.exports = AlertRepository;
