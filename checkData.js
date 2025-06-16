const pool = require('./src/db/postgres');

async function checkData() {
  try {
    console.log('📊 ServiceTitan Complete Data Summary');
    console.log('='.repeat(50));

    // Check all tables
    const tables = [
      'invoices',
      'jobs',
      'appointments',
      'customers',
      'technicians',
      'estimates',
      'job_notes',
      'job_history',
      'job_types',
      'job_cancel_reasons',
      'job_hold_reasons',
    ];

    console.log('📋 TABLE OVERVIEW:');
    for (const table of tables) {
      try {
        const result = await pool.query(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        const count = parseInt(result.rows[0].count);
        console.log(
          `   ${table.padEnd(20)}: ${count.toLocaleString()} records`
        );
      } catch (error) {
        console.log(`   ${table.padEnd(20)}: ❌ Table not found`);
      }
    }

    // Detailed invoice stats
    console.log('\n💰 INVOICES DETAIL:');
    try {
      const invoicesResult = await pool.query(`
        SELECT 
          COUNT(*) as total_invoices,
          SUM(total) as total_revenue,
          COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_invoices,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_invoices,
          AVG(total) as avg_invoice_value
        FROM invoices
      `);

      const invoiceStats = invoicesResult.rows[0];
      console.log(
        `   Total: ${parseInt(invoiceStats.total_invoices).toLocaleString()}`
      );
      console.log(
        `   Revenue: ${parseFloat(
          invoiceStats.total_revenue || 0
        ).toLocaleString()}`
      );
      console.log(
        `   Paid: ${parseInt(invoiceStats.paid_invoices).toLocaleString()}`
      );
      console.log(
        `   Pending: ${parseInt(
          invoiceStats.pending_invoices
        ).toLocaleString()}`
      );
      console.log(
        `   Avg Value: ${parseFloat(
          invoiceStats.avg_invoice_value || 0
        ).toLocaleString()}`
      );
    } catch (error) {
      console.log('   ❌ Invoice analysis failed');
    }

    // Detailed job stats
    console.log('\n🔧 JOBS DETAIL:');
    try {
      const jobsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_jobs,
          COUNT(CASE WHEN status = 'Scheduled' THEN 1 END) as scheduled_jobs,
          COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress_jobs,
          COUNT(CASE WHEN scheduled_date >= CURRENT_DATE THEN 1 END) as future_jobs
        FROM jobs
      `);

      const jobStats = jobsResult.rows[0];
      console.log(
        `   Total: ${parseInt(jobStats.total_jobs).toLocaleString()}`
      );
      console.log(
        `   Completed: ${parseInt(jobStats.completed_jobs).toLocaleString()}`
      );
      console.log(
        `   Scheduled: ${parseInt(jobStats.scheduled_jobs).toLocaleString()}`
      );
      console.log(
        `   In Progress: ${parseInt(
          jobStats.in_progress_jobs
        ).toLocaleString()}`
      );
      console.log(
        `   Future Jobs: ${parseInt(jobStats.future_jobs).toLocaleString()}`
      );
    } catch (error) {
      console.log('   ❌ Jobs analysis failed');
    }

    // Appointments summary
    console.log('\n📅 APPOINTMENTS DETAIL:');
    try {
      const appointmentsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_appointments,
          COUNT(CASE WHEN scheduled_start >= CURRENT_DATE THEN 1 END) as future_appointments,
          COUNT(DISTINCT technician_id) as unique_technicians,
          COUNT(CASE WHEN status = 'Scheduled' THEN 1 END) as scheduled_appointments
        FROM appointments
      `);

      const apptStats = appointmentsResult.rows[0];
      console.log(
        `   Total: ${parseInt(apptStats.total_appointments).toLocaleString()}`
      );
      console.log(
        `   Future: ${parseInt(apptStats.future_appointments).toLocaleString()}`
      );
      console.log(
        `   Technicians: ${parseInt(
          apptStats.unique_technicians
        ).toLocaleString()}`
      );
      console.log(
        `   Scheduled: ${parseInt(
          apptStats.scheduled_appointments
        ).toLocaleString()}`
      );
    } catch (error) {
      console.log('   ❌ Appointments analysis failed');
    }

    // Customer & Technician stats
    console.log('\n👥 PEOPLE DATA:');
    try {
      const customerCount = await pool.query(
        `SELECT COUNT(*) as count FROM customers WHERE active = true`
      );
      const techCount = await pool.query(
        `SELECT COUNT(*) as count FROM technicians WHERE active = true`
      );

      console.log(
        `   Active Customers: ${parseInt(
          customerCount.rows[0].count
        ).toLocaleString()}`
      );
      console.log(
        `   Active Technicians: ${parseInt(
          techCount.rows[0].count
        ).toLocaleString()}`
      );
    } catch (error) {
      console.log('   ❌ People data analysis failed');
    }

    // Recent activity
    console.log('\n📅 RECENT ACTIVITY (Last 7 days):');
    try {
      const recentInvoices = await pool.query(`
        SELECT COUNT(*) as count 
        FROM invoices 
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `);

      const recentJobs = await pool.query(`
        SELECT COUNT(*) as count 
        FROM jobs 
        WHERE scheduled_date >= NOW() - INTERVAL '7 days'
      `);

      const recentNotes = await pool.query(`
        SELECT COUNT(*) as count 
        FROM job_notes 
        WHERE created_on >= NOW() - INTERVAL '7 days'
      `);

      console.log(
        `   New Invoices: ${parseInt(
          recentInvoices.rows[0].count
        ).toLocaleString()}`
      );
      console.log(
        `   New Jobs: ${parseInt(recentJobs.rows[0].count).toLocaleString()}`
      );
      console.log(
        `   New Notes: ${parseInt(recentNotes.rows[0].count).toLocaleString()}`
      );
    } catch (error) {
      console.log('   ❌ Recent activity analysis failed');
    }

    // Sample records for verification
    console.log('\n🔍 SAMPLE DATA VERIFICATION:');
    try {
      const sampleInvoice = await pool.query(`
        SELECT invoice_id, customer_name, total, status 
        FROM invoices 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      if (sampleInvoice.rows.length > 0) {
        const invoice = sampleInvoice.rows[0];
        console.log(
          `   Latest Invoice: #${invoice.invoice_id} - ${invoice.customer_name} - ${invoice.total} (${invoice.status})`
        );
      }

      const sampleJob = await pool.query(`
        SELECT job_id, technician, location, status 
        FROM jobs 
        ORDER BY scheduled_date DESC 
        LIMIT 1
      `);

      if (sampleJob.rows.length > 0) {
        const job = sampleJob.rows[0];
        console.log(
          `   Latest Job: #${job.job_id} - ${job.technician} - ${job.location} (${job.status})`
        );
      }

      const sampleAppointment = await pool.query(`
        SELECT appointment_id, technician_name, scheduled_start, status 
        FROM appointments 
        ORDER BY scheduled_start DESC 
        LIMIT 1
      `);

      if (sampleAppointment.rows.length > 0) {
        const appt = sampleAppointment.rows[0];
        console.log(
          `   Latest Appointment: #${appt.appointment_id} - ${appt.technician_name} - ${appt.scheduled_start} (${appt.status})`
        );
      }
    } catch (error) {
      console.log('   ❌ Sample data verification failed');
    }

    console.log('\n🎯 DATABOX READY QUERIES:');
    console.log("   SELECT COUNT(*) FROM jobs WHERE status = 'Completed';");
    console.log("   SELECT SUM(total) FROM invoices WHERE status = 'Paid';");
    console.log(
      '   SELECT technician_name, COUNT(*) FROM appointments GROUP BY technician_name;'
    );
    console.log('   SELECT status, COUNT(*) FROM jobs GROUP BY status;');

    console.log('\n✅ Complete data check finished!');
  } catch (error) {
    console.error('❌ Error checking data:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();
