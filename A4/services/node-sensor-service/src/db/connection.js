const { Pool } = require('pg');
const Config = require('../config/config');

let pool = null;

function getPool() {
  if (!pool) {
    const config = new Config();
    const dbConfig = config.getDbConfig();
    
    // Bulkhead: Create isolated connection pool for database
    pool = new Pool(dbConfig);
    
    // Handle pool errors gracefully
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
    
    // Test connection on startup
    pool.query('SELECT 1')
      .then(() => {
        console.log('Database connection pool established');
      })
      .catch((err) => {
        console.error('Failed to establish database connection pool', err);
      });
  }
  
  return pool;
}

async function initializeDatabase() {
  const pool = getPool();
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    // Read and execute migration files
    const migration1 = await fs.readFile(
      path.join(__dirname, '../migrations/001_create_sensors.sql'),
      'utf8'
    );
    await pool.query(migration1);
    
    const migration2 = await fs.readFile(
      path.join(__dirname, '../migrations/002_seed_data.sql'),
      'utf8'
    );
    await pool.query(migration2);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  initializeDatabase,
  closePool
};
