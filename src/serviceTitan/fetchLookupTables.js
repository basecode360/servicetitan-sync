const pool = require('../db/postgres');
const { makeAuthenticatedRequest } = require('./auth');

async function fetchLookupTables() {
  console.log('📋 Starting lookup tables fetch...');

  try {
    // Try different endpoint patterns for lookup data
    const lookupEndpoints = [
      {
        name: 'Job Types',
        urls: [
          `https://api.servicetitan.io/settings/v2/tenant/${process.env.ST_TENANT}/job-types`,
          `https://api.servicetitan.io/jpm/v2/tenant/${process.env.ST_TENANT}/job-types`,
          `https://api.servicetitan.io/v2/tenant/${process.env.ST_TENANT}/job-types`,
        ],
        handler: processJobTypes,
      },
      {
        name: 'Business Units',
        urls: [
          `https://api.servicetitan.io/settings/v2/tenant/${process.env.ST_TENANT}/business-units`,
        ],
        handler: processBusinessUnits,
      },
      {
        name: 'Technician Categories',
        urls: [
          `https://api.servicetitan.io/settings/v2/tenant/${process.env.ST_TENANT}/technician-categories`,
        ],
        handler: processTechnicianCategories,
      },
    ];

    let successCount = 0;
    let totalAttempted = 0;

    for (const endpoint of lookupEndpoints) {
      totalAttempted++;
      console.log(`\n🔍 Trying to fetch ${endpoint.name}...`);

      let found = false;
      for (const url of endpoint.urls) {
        try {
          console.log(`📡 Testing: ${url.split('/').slice(-2).join('/')}`);
          const response = await makeAuthenticatedRequest(url);

          if (response.data && (response.data.data || response.data)) {
            console.log(`✅ Found ${endpoint.name} data!`);
            await endpoint.handler(response.data.data || response.data);
            successCount++;
            found = true;
            break;
          }
        } catch (error) {
          if (error.response?.status === 404) {
            console.log(`   ❌ 404 - Endpoint not found`);
          } else if (error.response?.status === 403) {
            console.log(`   ⛔ 403 - Access denied`);
          } else {
            console.log(`   ❌ Error: ${error.message.split('\n')[0]}`);
          }
        }
      }

      if (!found) {
        console.log(`   ⚠️ ${endpoint.name} not available via API`);
      }
    }

    console.log(
      `\n✅ Lookup tables fetch complete (${successCount}/${totalAttempted} successful)`
    );

    if (successCount === 0) {
      console.log(
        '💡 Note: Lookup tables may not be available in your API plan'
      );
      console.log(
        '   This is normal - core data sync will continue working fine'
      );
    }
  } catch (error) {
    console.error('❌ Fatal error in fetchLookupTables:', error.message);
    // Don't throw error - lookup tables are optional
    console.log('⚠️ Continuing without lookup tables - core sync unaffected');
  }
}

async function processJobTypes(data) {
  let count = 0;

  if (Array.isArray(data)) {
    for (const item of data) {
      try {
        const { id: job_type_id, name, description, active = true } = item;

        if (job_type_id && name) {
          await pool.query(
            `
            INSERT INTO job_types (job_type_id, name, description, active)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (job_type_id) DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              active = EXCLUDED.active;
            `,
            [job_type_id, name, description, active]
          );
          count++;
        }
      } catch (dbError) {
        console.error(`❌ Error saving job type:`, dbError.message);
      }
    }
  }

  console.log(`   📊 Processed ${count} job types`);
}

async function processBusinessUnits(data) {
  let count = 0;

  // Create business units table if it doesn't exist
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_units (
        id SERIAL PRIMARY KEY,
        unit_id VARCHAR UNIQUE NOT NULL,
        name VARCHAR,
        description TEXT,
        active BOOLEAN DEFAULT true
      );
    `);
  } catch (error) {
    console.log('⚠️ Could not create business_units table');
    return;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      try {
        const { id: unit_id, name, description, active = true } = item;

        if (unit_id && name) {
          await pool.query(
            `
            INSERT INTO business_units (unit_id, name, description, active)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (unit_id) DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              active = EXCLUDED.active;
            `,
            [unit_id, name, description, active]
          );
          count++;
        }
      } catch (dbError) {
        console.error(`❌ Error saving business unit:`, dbError.message);
      }
    }
  }

  console.log(`   📊 Processed ${count} business units`);
}

async function processTechnicianCategories(data) {
  let count = 0;

  // Create technician categories table if it doesn't exist
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS technician_categories (
        id SERIAL PRIMARY KEY,
        category_id VARCHAR UNIQUE NOT NULL,
        name VARCHAR,
        description TEXT,
        active BOOLEAN DEFAULT true
      );
    `);
  } catch (error) {
    console.log('⚠️ Could not create technician_categories table');
    return;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      try {
        const { id: category_id, name, description, active = true } = item;

        if (category_id && name) {
          await pool.query(
            `
            INSERT INTO technician_categories (category_id, name, description, active)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (category_id) DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              active = EXCLUDED.active;
            `,
            [category_id, name, description, active]
          );
          count++;
        }
      } catch (dbError) {
        console.error(`❌ Error saving technician category:`, dbError.message);
      }
    }
  }

  console.log(`   📊 Processed ${count} technician categories`);
}

module.exports = fetchLookupTables;
