const fs = require('fs');
const path = require('path');

const LOCK_FILE = path.join(__dirname, '../../sync.lock');

class ProcessLock {
  constructor() {
    this.lockAcquired = false;
  }

  async acquireLock() {
    try {
      // Check if lock file exists and is recent
      if (fs.existsSync(LOCK_FILE)) {
        const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
        const lockAge = Date.now() - lockData.timestamp;

        // If lock is older than 2 hours, consider it stale
        if (lockAge < 2 * 60 * 60 * 1000) {
          console.log('🔒 Another sync process is already running');
          console.log(`   Process PID: ${lockData.pid}`);
          console.log(
            `   Started: ${new Date(lockData.timestamp).toISOString()}`
          );
          return false;
        } else {
          console.log('🧹 Removing stale lock file');
          fs.unlinkSync(LOCK_FILE);
        }
      }

      // Create new lock file
      const lockData = {
        pid: process.pid,
        timestamp: Date.now(),
        started: new Date().toISOString(),
      };

      fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
      this.lockAcquired = true;

      console.log(`🔐 Process lock acquired (PID: ${process.pid})`);
      return true;
    } catch (error) {
      console.error('❌ Failed to acquire process lock:', error.message);
      return false;
    }
  }

  releaseLock() {
    if (this.lockAcquired && fs.existsSync(LOCK_FILE)) {
      try {
        fs.unlinkSync(LOCK_FILE);
        this.lockAcquired = false;
        console.log('🔓 Process lock released');
      } catch (error) {
        console.error('❌ Failed to release process lock:', error.message);
      }
    }
  }

  // Check if another instance is running
  static isRunning() {
    if (!fs.existsSync(LOCK_FILE)) {
      return false;
    }

    try {
      const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
      const lockAge = Date.now() - lockData.timestamp;

      // Consider stale if older than 2 hours
      return lockAge < 2 * 60 * 60 * 1000;
    } catch (error) {
      return false;
    }
  }
}

module.exports = ProcessLock;
