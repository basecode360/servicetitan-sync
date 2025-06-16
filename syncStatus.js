const pool = require('./src/db/postgres');

async function checkSyncStatus() {
  try {
    console.log('📊 ServiceTitan Sync Status Check');
    console.log('='.repeat(40));

    // Quick record counts
    const tables = ['invoices', 'jobs', 'appointments'];
    const counts = {};

    for (const table of tables) {
      try {
        const result = await pool.query(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        counts[table] = parseInt(result.rows[0].count);
      } catch (error) {
        counts[table] = 0;
      }
    }

    console.log('📋 CURRENT DATA COUNTS:');
    console.log(`   Invoices: ${counts.invoices.toLocaleString()}`);
    console.log(`   Jobs: ${counts.jobs.toLocaleString()}`);
    console.log(`   Appointments: ${counts.appointments.toLocaleString()}`);

    // Recent activity (last hour)
    console.log('\n⏰ RECENT ACTIVITY (Last 1 hour):');
    try {
      const recentInvoices = await pool.query(`
        SELECT COUNT(*) as count 
        FROM invoices 
        WHERE created_at >= NOW() - INTERVAL '1 hour'
      `);

      const recentJobs = await pool.query(`
        SELECT COUNT(*) as count 
        FROM jobs 
        WHERE scheduled_date >= NOW() - INTERVAL '1 hour' 
           OR scheduled_date IS NULL
      `);

      console.log(`   New Invoices: ${recentInvoices.rows[0].count}`);
      console.log(`   New Jobs: ${recentJobs.rows[0].count}`);
    } catch (error) {
      console.log('   ❌ Could not fetch recent activity');
    }

    // Data freshness check
    console.log('\n🔄 DATA FRESHNESS:');
    try {
      const latestInvoice = await pool.query(`
        SELECT created_at 
        FROM invoices 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      const latestJob = await pool.query(`
        SELECT scheduled_date 
        FROM jobs 
        WHERE scheduled_date IS NOT NULL
        ORDER BY scheduled_date DESC 
        LIMIT 1
      `);

      if (latestInvoice.rows.length > 0) {
        const invoiceAge = Math.round(
          (Date.now() - new Date(latestInvoice.rows[0].created_at)) /
            (1000 * 60)
        );
        console.log(`   Latest Invoice: ${invoiceAge} minutes ago`);
      }

      if (latestJob.rows.length > 0) {
        const jobDate = new Date(latestJob.rows[0].scheduled_date);
        const isRecent = jobDate > new Date(Date.now() - 24 * 60 * 60 * 1000);
        console.log(
          `   Latest Job: ${jobDate.toLocaleDateString()} ${
            isRecent ? '(Recent)' : '(Older)'
          }`
        );
      }
    } catch (error) {
      console.log('   ❌ Could not check data freshness');
    }

    // Sync health indicators
    console.log('\n🏥 SYNC HEALTH:');

    // Check for gaps in data
    try {
      const invoiceGaps = await pool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM invoices 
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 7
      `);

      const daysWithData = invoiceGaps.rows.length;
      console.log(`   Data Coverage: ${daysWithData}/7 days have invoice data`);

      if (daysWithData >= 6) {
        console.log('   ✅ Sync appears healthy');
      } else if (daysWithData >= 4) {
        console.log('   ⚠️ Some sync gaps detected');
      } else {
        console.log('   ❌ Significant sync issues detected');
      }
    } catch (error) {
      console.log('   ❌ Could not assess sync health');
    }

    // Quick troubleshooting tips
    console.log('\n💡 TROUBLESHOOTING TIPS:');
    console.log('   • If counts are not increasing: Check if sync is running');
    console.log('   • If getting 401 errors: Check .env credentials');
    console.log('   • If slow syncing: Large dataset, be patient');
    console.log('   • Check logs: npm start (watch for errors)');

    console.log('\n🔧 USEFUL COMMANDS:');
    console.log('   • Full data check: node checkData.js');
    console.log('   • Test API: node testToken.js');
    console.log('   • Test DB: node testDbConnection.js');
    console.log('   • Start sync: npm start');

    console.log('\n✅ Status check complete!');
  } catch (error) {
    console.error('❌ Error checking sync status:', error.message);
  } finally {
    await pool.end();
  }
}

checkSyncStatus();
