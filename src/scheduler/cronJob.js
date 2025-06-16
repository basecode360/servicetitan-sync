const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const fetchInvoices = require('../serviceTitan/fetchInvoices');
const fetchJobs = require('../serviceTitan/fetchJobs');
const fetchAppointments = require('../serviceTitan/fetchAppointments');
const fetchJobNotes = require('../serviceTitan/fetchJobNotes');
const fetchJobHistory = require('../serviceTitan/fetchJobHistory');
const fetchCustomers = require('../serviceTitan/fetchCustomers');
const fetchTechnicians = require('../serviceTitan/fetchTechnicians');
const fetchEstimates = require('../serviceTitan/fetchEstimates');
const fetchLookupTables = require('../serviceTitan/fetchLookupTables');

// Sync state management with file-based locking
const SYNC_STATE_FILE = path.join(__dirname, '../../sync_state.json');

class SyncManager {
  constructor() {
    this.state = this.loadState();
  }

  loadState() {
    try {
      if (fs.existsSync(SYNC_STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(SYNC_STATE_FILE, 'utf8'));

        // Check if sync is stuck (older than 2 hours)
        if (
          state.syncInProgress &&
          Date.now() - state.lastActivity > 2 * 60 * 60 * 1000
        ) {
          console.log('🧹 Detected stuck sync, resetting state');
          state.syncInProgress = false;
        }

        return state;
      }
    } catch (error) {
      console.log('⚠️ Could not load sync state, using defaults');
    }

    return {
      syncInProgress: false,
      lastSyncTime: null,
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastActivity: Date.now(),
    };
  }

  saveState() {
    try {
      this.state.lastActivity = Date.now();
      fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('⚠️ Could not save sync state:', error.message);
    }
  }

  acquireSync(syncType = 'unknown') {
    if (this.state.syncInProgress) {
      const timeSinceStart = Date.now() - this.state.lastActivity;
      console.log(
        `⏳ Sync already in progress for ${Math.round(
          timeSinceStart / 1000 / 60
        )} minutes`
      );
      return false;
    }

    this.state.syncInProgress = true;
    this.state.currentSyncType = syncType;
    this.state.syncStartTime = Date.now();
    this.saveState();
    return true;
  }

  releaseSync(success = true) {
    this.state.syncInProgress = false;
    this.state.totalSyncs++;

    if (success) {
      this.state.successfulSyncs++;
      this.state.lastSyncTime = Date.now();
    } else {
      this.state.failedSyncs++;
    }

    delete this.state.currentSyncType;
    delete this.state.syncStartTime;
    this.saveState();
  }

  isStuck() {
    if (!this.state.syncInProgress) return false;

    const timeSinceStart = Date.now() - this.state.lastActivity;
    return timeSinceStart > 2 * 60 * 60 * 1000; // 2 hours
  }

  forceReset() {
    console.log('🔄 Force resetting sync state');
    this.state.syncInProgress = false;
    delete this.state.currentSyncType;
    delete this.state.syncStartTime;
    this.saveState();
  }
}

const syncManager = new SyncManager();

function startScheduler() {
  console.log('🚀 Starting Enhanced ServiceTitan sync scheduler...');
  console.log('⏰ Quick sync will run every 30 minutes');
  console.log('🔄 Full sync will run every 3 hours');

  // Reset any stuck sync on startup
  if (syncManager.isStuck()) {
    syncManager.forceReset();
  }

  // Quick sync every 30 minutes (only core data)
  cron.schedule('*/30 * * * *', async () => {
    await runQuickSync();
  });

  // Full sync every 3 hours (all data)
  cron.schedule('0 */3 * * *', async () => {
    await runFullSync();
  });

  // Status check every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    if (syncManager.state.syncInProgress) {
      const duration = Math.round(
        (Date.now() - syncManager.state.syncStartTime) / 1000 / 60
      );
      console.log(
        `📊 Sync Status: ${syncManager.state.currentSyncType} running for ${duration} minutes`
      );
    }
  });

  // Run initial quick sync immediately when starting
  console.log('🔄 Running initial quick sync in 5 seconds...');
  setTimeout(async () => {
    await runQuickSync();
  }, 5000);
}

async function runQuickSync() {
  if (!syncManager.acquireSync('QUICK')) {
    return;
  }

  const startTime = new Date();
  console.log(`\n🔄 QUICK SYNC started at ${startTime.toISOString()}`);
  console.log('='.repeat(50));

  try {
    // Only sync the most frequently changing data (in order of importance)
    console.log('💰 Phase 1: Invoices...');
    await fetchInvoices();
    syncManager.saveState(); // Update activity

    console.log('🔧 Phase 2: Jobs...');
    await fetchJobs();
    syncManager.saveState(); // Update activity

    console.log('📅 Phase 3: Appointments...');
    await fetchAppointments();
    syncManager.saveState(); // Update activity

    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);

    syncManager.releaseSync(true);

    console.log('='.repeat(50));
    console.log(
      `✅ Quick sync completed in ${Math.round(duration / 60)} minutes`
    );
    console.log(
      `📊 Stats: ${syncManager.state.successfulSyncs}/${syncManager.state.totalSyncs} successful`
    );
    console.log(
      `⏰ Next sync at: ${new Date(Date.now() + 30 * 60 * 1000).toISOString()}`
    );
  } catch (err) {
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);

    syncManager.releaseSync(false);

    console.log('='.repeat(50));
    console.error(
      `❌ Quick sync failed after ${Math.round(duration / 60)} minutes:`,
      err.message
    );
    console.log(
      `📊 Stats: ${syncManager.state.successfulSyncs}/${syncManager.state.totalSyncs} successful, ${syncManager.state.failedSyncs} failed`
    );
  }
}

async function runFullSync() {
  if (!syncManager.acquireSync('FULL')) {
    return;
  }

  const startTime = new Date();
  console.log(`\n🔄 FULL SYNC started at ${startTime.toISOString()}`);
  console.log('='.repeat(60));

  try {
    // Phase 1: Core data
    console.log('📊 Phase 1: Core Data');
    await fetchInvoices();
    syncManager.saveState();
    await fetchJobs();
    syncManager.saveState();
    await fetchAppointments();
    syncManager.saveState();
    console.log('✅ Phase 1 complete\n');

    // Phase 2: People data
    console.log('👥 Phase 2: People Data');
    await fetchCustomers();
    syncManager.saveState();
    await fetchTechnicians();
    syncManager.saveState();
    console.log('✅ Phase 2 complete\n');

    // Phase 3: Business data
    console.log('💰 Phase 3: Business Data');
    await fetchEstimates();
    syncManager.saveState();

    // Lookup tables are optional - don't fail if they don't work
    try {
      await fetchLookupTables();
      syncManager.saveState();
    } catch (error) {
      console.log('⚠️ Lookup tables skipped (not available in API plan)');
    }

    console.log('✅ Phase 3 complete\n');

    // Phase 4: Job details (limited sample)
    console.log('📝 Phase 4: Job Details (Sample)');
    await fetchJobNotes();
    syncManager.saveState();
    await fetchJobHistory();
    syncManager.saveState();
    console.log('✅ Phase 4 complete\n');

    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);

    syncManager.releaseSync(true);

    console.log('='.repeat(60));
    console.log(
      `✅ FULL SYNC completed in ${Math.round(duration / 60)} minutes`
    );
    console.log(
      `📊 Stats: ${syncManager.state.successfulSyncs}/${syncManager.state.totalSyncs} successful`
    );
  } catch (err) {
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);

    syncManager.releaseSync(false);

    console.log('='.repeat(60));
    console.error(
      `❌ FULL SYNC failed after ${Math.round(duration / 60)} minutes:`,
      err.message
    );
    console.log(
      `📊 Stats: ${syncManager.state.successfulSyncs}/${syncManager.state.totalSyncs} successful, ${syncManager.state.failedSyncs} failed`
    );
  }
}

module.exports = startScheduler;
