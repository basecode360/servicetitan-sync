const { Pool } = require('pg');
require('dotenv').config();

async function testDataboxConnection() {
  console.log('🔧 Testing exact Databox connection parameters...');

  // Test with exact same parameters as Databox
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123',
    database: 'servicetitan',
    connectTimeoutMillis: 5000,
  });

  try {
    console.log('📡 Connecting to database...');
    const client = await pool.connect();

    console.log('✅ Connection successful!');

    // Test basic query
    const result = await client.query('SELECT COUNT(*) as job_count FROM jobs');
    console.log('📊 Jobs in database:', result.rows[0].job_count);

    // Test invoice query
    const invoiceResult = await client.query(
      'SELECT COUNT(*) as invoice_count FROM invoices'
    );
    console.log(
      '💰 Invoices in database:',
      invoiceResult.rows[0].invoice_count
    );

    // Test sample query that Databox might use
    const sampleQuery = await client.query(`
      SELECT 
        status, 
        COUNT(*) as count 
      FROM jobs 
      GROUP BY status 
      LIMIT 5
    `);

    console.log('📈 Sample data for Databox:');
    sampleQuery.rows.forEach((row) => {
      console.log(`   ${row.status}: ${row.count} jobs`);
    });

    client.release();
    console.log('\n✅ Database is ready for Databox connection!');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error(
      'Details:',
      error.detail || error.hint || 'No additional details'
    );

    // Common solutions
    console.log('\n🔧 Try these solutions:');
    console.log('1. Start PostgreSQL service');
    console.log('2. Check username/password');
    console.log('3. Make sure database "servicetitan" exists');
    console.log('4. Try: psql -U postgres -d servicetitan');
  } finally {
    await pool.end();
  }
}

testDataboxConnection();
