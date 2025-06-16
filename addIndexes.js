const { Pool } = require('pg');
require('dotenv').config();

async function addIndexes() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  });

  try {
    console.log('📊 Adding database indexes for better performance...');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_invoices_created_on ON invoices(created_on);',
      'CREATE INDEX IF NOT EXISTS idx_jobs_created_on ON jobs(created_on);',
      'CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(start);',
      'CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);',
      'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);',
      // Add more indexes as needed
    ];

    for (const indexQuery of indexes) {
      await pool.query(indexQuery);
    }

    console.log('✅ Indexes added successfully');
  } catch (error) {
    console.error('❌ Error adding indexes:', error.message);
    throw error;
  } finally {
    // Only end the pool once, and only if it's not already ending
    if (!pool.ending && !pool.ended) {
      await pool.end();
    }
  }
}

module.exports = addIndexes;

// Only run if called directly
if (require.main === module) {
  addIndexes().catch(console.error);
}
