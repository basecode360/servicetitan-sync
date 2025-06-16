#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

console.log('🚀 ServiceTitan Complete Integration Setup');
console.log('='.repeat(50));

async function setupComplete() {
  // Step 1: Database Setup
  console.log('📋 Step 1: Setting up complete database schema...');
  try {
    await require('./setupCompleteDatabase.js');
    console.log('✅ Database setup complete');
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    return;
  }

  // Step 2: Add Indexes
  console.log('\n📋 Step 2: Adding performance indexes...');
  try {
    await require('./addIndexes.js');
    console.log('✅ Indexes added successfully');
  } catch (error) {
    console.error('❌ Indexes setup failed:', error.message);
  }

  // Step 3: Test ServiceTitan Connection
  console.log('\n📋 Step 3: Testing ServiceTitan API connection...');
  try {
    await require('./testToken.js');
    console.log('✅ ServiceTitan API connection verified');
  } catch (error) {
    console.error('❌ ServiceTitan API test failed:', error.message);
    console.log('⚠️  Please check your .env file credentials');
    return;
  }

  // Step 4: Test Database Connection
  console.log('\n📋 Step 4: Testing database connection...');
  try {
    await require('./testDbConnection.js');
    console.log('✅ Database connection verified');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return;
  }

  console.log('\n🎉 COMPLETE SETUP FINISHED!');
  console.log('='.repeat(50));
  console.log('✅ Database schema created with all tables');
  console.log('✅ Performance indexes added');
  console.log('✅ ServiceTitan API connection verified');
  console.log('✅ Database connection verified');

  console.log('\n🚀 NEXT STEPS:');
  console.log('1. Start the complete sync: npm start');
  console.log('2. Check data anytime: node checkData.js');
  console.log('3. Set up ngrok for Databox: ngrok tcp 5432');
  console.log('4. Connect Databox to your PostgreSQL database');

  console.log('\n📊 YOUR TABLES:');
  const tables = [
    '• invoices',
    '• jobs',
    '• appointments',
    '• customers',
    '• technicians',
    '• estimates',
    '• job_notes',
    '• job_history',
    '• job_types',
    '• job_cancel_reasons',
    '• job_hold_reasons',
  ];
  tables.forEach((table) => console.log(`   ${table}`));

  console.log('\n⏰ SYNC SCHEDULE:');
  console.log(
    '   • Quick sync (invoices, jobs, appointments): Every 30 minutes'
  );
  console.log('   • Full sync (all data): Every 2 hours');

  console.log('\n💡 DATABOX SAMPLE QUERIES:');
  console.log("   SELECT COUNT(*) FROM jobs WHERE status = 'Completed';");
  console.log("   SELECT SUM(total) FROM invoices WHERE status = 'Paid';");
  console.log(
    '   SELECT technician_name, COUNT(*) FROM appointments GROUP BY technician_name;'
  );
}

setupComplete().catch(console.error);
