const { Pool } = require('pg');
require('dotenv').config();

async function setupCompleteDatabase() {
  const pool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    password: process.env.PG_PASS,
    database: process.env.PG_DB,
  });

  try {
    console.log('🔧 Setting up complete ServiceTitan database schema...');

    // 1. Appointments Table
    console.log('📅 Creating appointments table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        appointment_id BIGINT UNIQUE NOT NULL,
        job_id BIGINT,
        appointment_number VARCHAR,
        technician_id BIGINT,
        technician_name TEXT,
        scheduled_start TIMESTAMP,
        scheduled_end TIMESTAMP,
        arrival_window_start TIMESTAMP,
        arrival_window_end TIMESTAMP,
        status VARCHAR,
        special_instructions TEXT,
        created_on TIMESTAMP,
        modified_on TIMESTAMP,
        customer_id BIGINT,
        unused BOOLEAN,
        created_by_id BIGINT,
        is_confirmed BOOLEAN
      );
    `);

    // 2. Job Notes Table
    console.log('📝 Creating job_notes table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_notes (
        id SERIAL PRIMARY KEY,
        note_id VARCHAR UNIQUE NOT NULL,
        job_id VARCHAR,
        note_text TEXT,
        author VARCHAR,
        author_id VARCHAR,
        created_on TIMESTAMP,
        is_internal BOOLEAN DEFAULT false
      );
    `);

    // 3. Job History Table
    console.log('📊 Creating job_history table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_history (
        id SERIAL PRIMARY KEY,
        history_id VARCHAR UNIQUE NOT NULL,
        job_id VARCHAR,
        event_type VARCHAR,
        description TEXT,
        changed_by VARCHAR,
        changed_by_id VARCHAR,
        occurred_at TIMESTAMP,
        old_value TEXT,
        new_value TEXT
      );
    `);

    // 4. Customers Table (Enhanced)
    console.log('👥 Creating customers table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        customer_id VARCHAR UNIQUE NOT NULL,
        name VARCHAR,
        first_name VARCHAR,
        last_name VARCHAR,
        company_name VARCHAR,
        email VARCHAR,
        phone_number VARCHAR,
        mobile_number VARCHAR,
        address_street VARCHAR,
        address_city VARCHAR,
        address_state VARCHAR,
        address_zip VARCHAR,
        created_on TIMESTAMP,
        modified_on TIMESTAMP,
        active BOOLEAN DEFAULT true
      );
    `);

    // 5. Technicians Table
    console.log('🔧 Creating technicians table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS technicians (
        id SERIAL PRIMARY KEY,
        technician_id VARCHAR UNIQUE NOT NULL,
        name VARCHAR,
        first_name VARCHAR,
        last_name VARCHAR,
        email VARCHAR,
        phone_number VARCHAR,
        employee_id VARCHAR,
        active BOOLEAN DEFAULT true,
        created_on TIMESTAMP
      );
    `);

    // 6. Lookup Tables
    console.log('📋 Creating lookup tables...');

    // Job Types
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_types (
        id SERIAL PRIMARY KEY,
        job_type_id VARCHAR UNIQUE NOT NULL,
        name VARCHAR,
        description TEXT,
        active BOOLEAN DEFAULT true
      );
    `);

    // Job Cancel Reasons
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_cancel_reasons (
        id SERIAL PRIMARY KEY,
        reason_id VARCHAR UNIQUE NOT NULL,
        reason VARCHAR,
        description TEXT,
        active BOOLEAN DEFAULT true
      );
    `);

    // Job Hold Reasons
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_hold_reasons (
        id SERIAL PRIMARY KEY,
        reason_id VARCHAR UNIQUE NOT NULL,
        reason VARCHAR,
        description TEXT,
        active BOOLEAN DEFAULT true
      );
    `);

    // Estimates Table
    console.log('💰 Creating estimates table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS estimates (
        id SERIAL PRIMARY KEY,
        estimate_id VARCHAR UNIQUE NOT NULL,
        job_id VARCHAR,
        customer_id VARCHAR,
        total NUMERIC,
        status VARCHAR,
        sold_by VARCHAR,
        created_on TIMESTAMP,
        sold_on TIMESTAMP,
        items_count INTEGER DEFAULT 0
      );
    `);

    // Create indexes for better performance
    console.log('🔍 Creating database indexes...');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_appointments_job_id ON appointments(job_id);',
      'CREATE INDEX IF NOT EXISTS idx_appointments_technician ON appointments(technician_id);',
      'CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);',
      'CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_start);',

      'CREATE INDEX IF NOT EXISTS idx_job_notes_job_id ON job_notes(job_id);',
      'CREATE INDEX IF NOT EXISTS idx_job_notes_created ON job_notes(created_on);',

      'CREATE INDEX IF NOT EXISTS idx_job_history_job_id ON job_history(job_id);',
      'CREATE INDEX IF NOT EXISTS idx_job_history_event ON job_history(event_type);',
      'CREATE INDEX IF NOT EXISTS idx_job_history_occurred ON job_history(occurred_at);',

      'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);',
      'CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);',
      'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number);',

      'CREATE INDEX IF NOT EXISTS idx_technicians_name ON technicians(name);',
      'CREATE INDEX IF NOT EXISTS idx_technicians_active ON technicians(active);',

      'CREATE INDEX IF NOT EXISTS idx_estimates_job_id ON estimates(job_id);',
      'CREATE INDEX IF NOT EXISTS idx_estimates_customer ON estimates(customer_id);',
      'CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);',
    ];

    for (const indexQuery of indexes) {
      await pool.query(indexQuery);
    }

    console.log('✅ Complete database schema created successfully!');
    console.log('📊 Tables created:');
    console.log('   - appointments');
    console.log('   - job_notes');
    console.log('   - job_history');
    console.log('   - customers');
    console.log('   - technicians');
    console.log('   - job_types');
    console.log('   - job_cancel_reasons');
    console.log('   - job_hold_reasons');
    console.log('   - estimates');
    console.log('🔍 All indexes created for optimal performance');
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

setupCompleteDatabase();
