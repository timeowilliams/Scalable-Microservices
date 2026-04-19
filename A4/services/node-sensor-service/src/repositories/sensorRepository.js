const { getPool } = require('../db/connection');

class SensorRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findAll() {
    const result = await this.pool.query('SELECT * FROM sensors ORDER BY timestamp DESC');
    return result.rows.map(row => ({
      sensor_id: row.sensor_id,
      type: row.type,
      value: parseFloat(row.value),
      unit: row.unit,
      timestamp: row.timestamp.toISOString()
    }));
  }

  async findById(id) {
    const result = await this.pool.query(
      'SELECT * FROM sensors WHERE sensor_id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      sensor_id: row.sensor_id,
      type: row.type,
      value: parseFloat(row.value),
      unit: row.unit,
      timestamp: row.timestamp.toISOString()
    };
  }

  async create(sensorData) {
    const { sensor_id, type, value, unit, timestamp } = sensorData;
    
    const result = await this.pool.query(
      `INSERT INTO sensors (sensor_id, type, value, unit, timestamp)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [sensor_id, type, value, unit, timestamp]
    );
    
    const row = result.rows[0];
    return {
      sensor_id: row.sensor_id,
      type: row.type,
      value: parseFloat(row.value),
      unit: row.unit,
      timestamp: row.timestamp.toISOString()
    };
  }

  async exists(id) {
    const result = await this.pool.query(
      'SELECT EXISTS(SELECT 1 FROM sensors WHERE sensor_id = $1)',
      [id]
    );
    return result.rows[0].exists;
  }
}

module.exports = SensorRepository;
