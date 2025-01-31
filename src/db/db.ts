import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Create the PostgreSQL pool using environment variables
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT || '5432', 10),
});

// Function to test the connection
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Database connected successfully');
    const createTables = async () => {
      const queries = [
        `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `,
        `
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
          message_body TEXT,
          message_type VARCHAR(50),
          direction VARCHAR(10),
          status VARCHAR(50) DEFAULT 'pending',
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `,
        `
        CREATE TABLE IF NOT EXISTS closed_client (
          id SERIAL PRIMARY KEY,
          phone_number VARCHAR(255) NOT NULL,
          long_string TEXT NOT NULL,
          file_path TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `,
      ];
      
      for (const query of queries) {
        try {
          await pool.query(query);
          console.log('Table created or already exists.');
        } catch (error) {
          console.error('Error creating table:', error);
        }
      }
    };
    
    createTables();
    client.release();
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

export default pool;