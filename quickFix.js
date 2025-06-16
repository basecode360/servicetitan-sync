#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 ServiceTitan Quick Fix Tool');
console.log('='.repeat(40));

function runCommand(command, description) {
  try {
    console.log(`📋 ${description}...`);
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log('✅ Success');
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.message.split('\n')[0]);
    return false;
  }
}

async function quickFix() {
  // 1. Stop all running instances
  console.log('\n🛑 Step 1: Stopping all instances...');
  runCommand(
    'pkill -f "servicetitan-sync" || true',
    'Killing ServiceTitan processes'
  );
  runCommand('pkill -f "node index.js" || true', 'Killing Node processes');

  // 2. Clean up lock files
  console.log('\n🧹 Step 2: Cleaning up lock files...');
  try {
    if (fs.existsSync('sync.lock')) {
      fs.unlinkSync('sync.lock');
      console.log('✅ Removed sync.lock');
    }
    if (fs.existsSync('sync_state.json')) {
      fs.unlinkSync('sync_state.json');
      console.log('✅ Removed sync_state.json');
    }
  } catch (error) {
    console.log('⚠️ Could not clean lock files:', error.message);
  }

  // 3. Create required directories
  console.log('\n📁 Step 3: Creating required directories...');
  try {
    if (!fs.existsSync('src/utils')) {
      fs.mkdirSync('src/utils', { recursive: true });
      console.log('✅ Created src/utils directory');
    }
  } catch (error) {
    console.log('❌ Could not create directories:', error.message);
  }

  // 4. Test database connection
  console.log('\n🔍 Step 4: Testing connections...');
  const dbTest = runCommand(
    'node testDbConnection.js',
    'Testing database connection'
  );
  const apiTest = runCommand('node testToken.js', 'Testing ServiceTitan API');

  // 5. Check data status
  console.log('\n📊 Step 5: Checking data status...');
  runCommand('node syncStatus.js', 'Checking sync status');

  // 6. Recommendations
  console.log('\n💡 RECOMMENDATIONS:');

  if (!dbTest) {
    console.log('❌ Database issue detected:');
    console.log('   • Check if PostgreSQL is running');
    console.log('   • Verify credentials in .env file');
    console.log('   • Run: npm run setup:db');
  }

  if (!apiTest) {
    console.log('❌ API issue detected:');
    console.log('   • Check .env credentials');
    console.log('   • Verify ST_APP_KEY is correct');
    console.log('   • Contact ServiceTitan support if needed');
  }

  if (dbTest && apiTest) {
    console.log('✅ All systems appear healthy!');
    console.log('🚀 Ready to start: npm start');
  }

  console.log('\n🔧 TROUBLESHOOTING COMMANDS:');
  console.log('   • Reset everything: npm run stop:force');
  console.log('   • Manual quick sync: npm run sync:quick');
  console.log('   • Check status: npm run check:status');
  console.log('   • View data: npm run check:data');
}

quickFix().catch(console.error);
