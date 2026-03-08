const { Pool } = require('pg');
const Config = require('../config/config');

let pool = null;

function getPool() {
  if (!pool) {
    const config = new Config();
    const dbConfig = config.getDbConfig();
    
    pool = new Pool(dbConfig);
    
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
    
    pool.query('SELECT 1')
      .then(() => {
        console.log('Command service database connection pool established');
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
    const migration1 = await fs.readFile(
      path.join(__dirname, '../migrations/001_create_dashboards.sql'),
      'utf8'
    );
    await pool.query(migration1);
    
    const migration2 = await fs.readFile(
      path.join(__dirname, '../migrations/002_create_alerts.sql'),
      'utf8'
    );
    await pool.query(migration2);
    
    console.log('Command service database initialized successfully');
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
