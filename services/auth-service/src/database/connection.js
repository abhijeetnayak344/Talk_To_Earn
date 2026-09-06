const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool = null;

async function connectDatabase() {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test connection
  try {
    const client = await pool.connect();
    logger.info('Database connected successfully');
    client.release();
    return pool;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return pool;
}

async function query(text, params) {
  const client = await pool.connect();
  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } finally {
    client.release();
  }
}

module.exports = {
  connectDatabase,
  getPool,
  query
};
