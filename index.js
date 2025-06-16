require('dotenv').config();
const ProcessLock = require('./src/utils/processLock');
const startScheduler = require('./src/scheduler/cronJob');

console.log('🚀 ServiceTitan Sync Service Starting...');
console.log('='.repeat(50));
console.log('📅 Started at:', new Date().toISOString());
console.log('🔧 Environment:', {
  PG_HOST: process.env.PG_HOST,
  PG_PORT: process.env.PG_PORT,
  PG_DB: process.env.PG_DB,
  ST_TOKEN_URL: process.env.ST_TOKEN_URL,
  ST_TENANT: process.env.ST_TENANT,
});
console.log('='.repeat(50));

// Create process lock instance
const processLock = new ProcessLock();

async function startService() {
  // Try to acquire process lock
  const lockAcquired = await processLock.acquireLock();

  if (!lockAcquired) {
    console.log('❌ Cannot start: Another sync process is already running');
    console.log('💡 To force start:');
    console.log('   1. Stop other instances: npm run stop:all');
    console.log('   2. Remove lock file: rm sync.lock');
    console.log('   3. Restart: npm start');
    process.exit(1);
  }

  // Handle graceful shutdown
  const cleanup = () => {
    console.log('\n🛑 Shutting down gracefully...');
    processLock.releaseLock();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', () => {
    processLock.releaseLock();
  });

  // Cleanup on uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    processLock.releaseLock();
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    processLock.releaseLock();
    process.exit(1);
  });

  // Start the scheduler
  try {
    startScheduler();
    console.log('✅ Scheduler started successfully');
    console.log('💡 Press Ctrl+C to stop the service');
    console.log('🔍 Monitor progress: npm run check:status');
  } catch (error) {
    console.error('❌ Failed to start scheduler:', error.message);
    processLock.releaseLock();
    process.exit(1);
  }
}

// Check if another instance is already running
if (ProcessLock.isRunning()) {
  console.log('⚠️ Another ServiceTitan sync instance appears to be running');
  console.log('🔍 Check with: ps aux | grep "node index.js"');
  console.log('🛑 Stop with: npm run stop:all');
  process.exit(1);
} else {
  startService();
}
