const axios = require('axios');
const pool = require('../db/postgres');
const { getAccessToken } = require('./auth');

async function fetchJobHistory() {
  console.log('📊 Starting job history fetch...');

  try {
    const token = await getAccessToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'ST-App-Key': process.env.ST_APP_KEY,
    };

    // Get recent job IDs to fetch history for
    console.log('📋 Getting recent job IDs...');
    const jobsResult = await pool.query(`
      SELECT job_id 
      FROM jobs 
      WHERE scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY scheduled_date DESC 
      LIMIT 500
    `);

    const jobIds = jobsResult.rows.map((row) => row.job_id);
    console.log(`📊 Found ${jobIds.length} recent jobs to fetch history for`);

    let totalHistoryItems = 0;
    let processedJobs = 0;

    for (const jobId of jobIds) {
      try {
        processedJobs++;
        if (processedJobs % 25 === 0) {
          console.log(
            `📄 Processing job history ${processedJobs}/${jobIds.length}...`
          );
        }

        const response = await axios.get(
          `https://api.servicetitan.io/jpm/v2/tenant/${process.env.ST_TENANT}/jobs/${jobId}/history`,
          {
            headers,
            timeout: 10000,
          }
        );

        const historyItems = response.data.data || response.data;

        if (historyItems && Array.isArray(historyItems)) {
          for (const historyItem of historyItems) {
            try {
              const {
                id: history_id,
                eventType: event_type,
                description,
                changedBy: changed_by_obj,
                changedOn: occurred_at,
                oldValue: old_value,
                newValue: new_value,
              } = historyItem;

              // Extract changed by info
              const changed_by = changed_by_obj?.name || null;
              const changed_by_id = changed_by_obj?.id || null;

              await pool.query(
                `
                INSERT INTO job_history (
                  history_id, job_id, event_type, description, 
                  changed_by, changed_by_id, occurred_at, old_value, new_value
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (history_id) DO UPDATE SET
                  event_type = EXCLUDED.event_type,
                  description = EXCLUDED.description,
                  changed_by = EXCLUDED.changed_by,
                  changed_by_id = EXCLUDED.changed_by_id,
                  occurred_at = EXCLUDED.occurred_at,
                  old_value = EXCLUDED.old_value,
                  new_value = EXCLUDED.new_value;
                `,
                [
                  history_id,
                  jobId,
                  event_type,
                  description,
                  changed_by,
                  changed_by_id,
                  occurred_at,
                  old_value,
                  new_value,
                ]
              );

              totalHistoryItems++;
            } catch (dbError) {
              console.error(
                `❌ Error saving history ${historyItem.id} for job ${jobId}:`,
                dbError.message
              );
            }
          }
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (apiError) {
        if (apiError.response?.status === 404) {
          // Job history not found - skip silently
          continue;
        }
        console.error(
          `❌ Error fetching history for job ${jobId}:`,
          apiError.message
        );
        continue;
      }
    }

    console.log(
      `✅ Job history fetch complete. Total history items processed: ${totalHistoryItems} from ${processedJobs} jobs`
    );
  } catch (error) {
    console.error('❌ Fatal error in fetchJobHistory:', error.message);
    throw error;
  }
}

module.exports = fetchJobHistory;
