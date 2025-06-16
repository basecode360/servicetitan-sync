const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASS,
  database: 'postgres', // Connect to default database first
});

async function setupDatabase() {
  try {
    // Create database if it doesn't exist
    console.log('🔧 Creating database...');
    await pool.query(`CREATE DATABASE ${process.env.PG_DB}`);
    console.log('✅ Database created successfully');
  } catch (error) {
    if (error.code === '42P04') {
      console.log('ℹ️ Database already exists');
    } else {
      console.error('❌ Error creating database:', error.message);
    }
  }

  // Close connection to postgres database
  await pool.end();

  // Connect to the servicetitan database
  const appPool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    password: process.env.PG_PASS,
    database: process.env.PG_DB,
  });

  try {
    // Create invoices table
    console.log('🔧 Creating invoices table...');
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_id VARCHAR UNIQUE NOT NULL,
        customer_name VARCHAR,
        total NUMERIC,
        balance NUMERIC,
        status VARCHAR,
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      );
    `);
    console.log('✅ Invoices table created successfully');

    // Create jobs table
    console.log('🔧 Creating jobs table...');
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        job_id VARCHAR UNIQUE NOT NULL,
        job_type VARCHAR,
        technician VARCHAR,
        location VARCHAR,
        status VARCHAR,
        scheduled_date TIMESTAMP
      );
    `);
    console.log('✅ Jobs table created successfully');

    console.log('🎉 Database setup complete!');
  } catch (error) {
    console.error('❌ Error setting up tables:', error.message);
  } finally {
    await appPool.end();
  }
}

setupDatabase();
