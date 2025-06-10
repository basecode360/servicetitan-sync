const cron = require('node-cron');
const fetchInvoices = require('../serviceTitan/fetchInvoices');
const fetchJobs = require('../serviceTitan/fetchJobs');

function startScheduler() {
  // Schedule the task to run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log(`🔄 Sync started at ${new Date().toISOString()}`);
    try {
      await fetchInvoices();
      await fetchJobs();
      console.log('✅ Sync complete');
    } catch (err) {
      console.error('❌ Sync error:', err.message);
    }
  });
}

module.exports = startScheduler;
