import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Database connection configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres', // Default to 'postgres' if not set
  host: process.env.DB_HOST || 'db.rvwhrvetlzqgbosrusse.supabase.co',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD, // This should be set in your .env file
  port: parseInt(process.env.DB_PORT || '5432', 10),
  ssl: {
    rejectUnauthorized: false // For development only, use proper SSL in production
  }
};

// Create a new pool using the configuration
const pool = new Pool(dbConfig);

// Function to execute a query
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error executing query', { text, error });
    throw error;
  }
}

// Function to run a SQL file
export async function runSqlFile(filePath: string) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await query(sql);
    console.log(`Successfully executed ${filePath}`);
  } catch (error) {
    console.error(`Error executing ${filePath}:`, error);
    throw error;
  }
}

// Test the connection
async function testConnection() {
  try {
    const { rows } = await query('SELECT NOW()');
    console.log('Database connection successful. Current time:', rows[0].now);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Export the pool for direct use if needed
export { pool, testConnection };

export default {
  query,
  runSqlFile,
  testConnection,
  pool
};
