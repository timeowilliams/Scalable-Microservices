const { getPool } = require('../db/connection');

class DashboardRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findAll() {
    const result = await this.pool.query(
      'SELECT * FROM tactical_dashboards ORDER BY created_at DESC'
    );
    return result.rows.map(row => ({
      dashboard_id: row.dashboard_id,
      mission_id: row.mission_id,
      sensor_summary: row.sensor_summary,
      threat_level: row.threat_level,
      status: row.status,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString()
    }));
  }

  async findById(id) {
    const result = await this.pool.query(
      'SELECT * FROM tactical_dashboards WHERE dashboard_id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      dashboard_id: row.dashboard_id,
      mission_id: row.mission_id,
      sensor_summary: row.sensor_summary,
      threat_level: row.threat_level,
      status: row.status,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString()
    };
  }

  async create(dashboardData) {
    const { dashboard_id, mission_id, sensor_summary, threat_level, status } = dashboardData;
    
    const result = await this.pool.query(
      `INSERT INTO tactical_dashboards (dashboard_id, mission_id, sensor_summary, threat_level, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [dashboard_id, mission_id, JSON.stringify(sensor_summary), threat_level, status]
    );
    
    const row = result.rows[0];
    return {
      dashboard_id: row.dashboard_id,
      mission_id: row.mission_id,
      sensor_summary: row.sensor_summary,
      threat_level: row.threat_level,
      status: row.status,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString()
    };
  }

  async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.sensor_summary !== undefined) {
      fields.push(`sensor_summary = $${paramCount++}`);
      values.push(JSON.stringify(updates.sensor_summary));
    }
    if (updates.threat_level !== undefined) {
      fields.push(`threat_level = $${paramCount++}`);
      values.push(updates.threat_level);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }

    if (fields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    const result = await this.pool.query(
      `UPDATE tactical_dashboards SET ${fields.join(', ')} WHERE dashboard_id = $${paramCount} RETURNING *`,
      values
    );

    const row = result.rows[0];
    return {
      dashboard_id: row.dashboard_id,
      mission_id: row.mission_id,
      sensor_summary: row.sensor_summary,
      threat_level: row.threat_level,
      status: row.status,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString()
    };
  }
}

module.exports = DashboardRepository;
