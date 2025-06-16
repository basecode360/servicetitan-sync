const axios = require('axios');
const pool = require('../db/postgres');
const { getAccessToken } = require('./auth');

async function fetchJobNotes() {
  console.log('📝 Starting job notes fetch...');

  try {
    const token = await getAccessToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'ST-App-Key': process.env.ST_APP_KEY,
    };

    // First, get recent job IDs to fetch notes for
    console.log('📋 Getting recent job IDs...');
    const jobsResult = await pool.query(`
      SELECT job_id 
      FROM jobs 
      WHERE scheduled_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY scheduled_date DESC 
      LIMIT 1000
    `);

    const jobIds = jobsResult.rows.map((row) => row.job_id);
    console.log(`📊 Found ${jobIds.length} recent jobs to fetch notes for`);

    let totalNotes = 0;
    let processedJobs = 0;

    for (const jobId of jobIds) {
      try {
        processedJobs++;
        if (processedJobs % 50 === 0) {
          console.log(`📄 Processing job ${processedJobs}/${jobIds.length}...`);
        }

        const response = await axios.get(
          `https://api.servicetitan.io/jpm/v2/tenant/${process.env.ST_TENANT}/jobs/${jobId}/notes`,
          {
            headers,
            timeout: 10000,
          }
        );

        const notes = response.data.data || response.data;

        if (notes && Array.isArray(notes)) {
          for (const note of notes) {
            try {
              const {
                id: note_id,
                text: note_text,
                author,
                createdOn: created_on,
                isInternal: is_internal,
              } = note;

              // Extract author info
              const author_name = author?.name || null;
              const author_id = author?.id || null;

              await pool.query(
                `
                INSERT INTO job_notes (
                  note_id, job_id, note_text, author, author_id, created_on, is_internal
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (note_id) DO UPDATE SET
                  note_text = EXCLUDED.note_text,
                  author = EXCLUDED.author,
                  author_id = EXCLUDED.author_id,
                  created_on = EXCLUDED.created_on,
                  is_internal = EXCLUDED.is_internal;
                `,
                [
                  note_id,
                  jobId,
                  note_text,
                  author_name,
                  author_id,
                  created_on,
                  is_internal,
                ]
              );

              totalNotes++;
            } catch (dbError) {
              console.error(
                `❌ Error saving note ${note.id} for job ${jobId}:`,
                dbError.message
              );
            }
          }
        }

        // Rate limiting - small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (apiError) {
        if (apiError.response?.status === 404) {
          // Job notes not found - skip silently
          continue;
        }
        console.error(
          `❌ Error fetching notes for job ${jobId}:`,
          apiError.message
        );
        continue;
      }
    }

    console.log(
      `✅ Job notes fetch complete. Total notes processed: ${totalNotes} from ${processedJobs} jobs`
    );
  } catch (error) {
    console.error('❌ Fatal error in fetchJobNotes:', error.message);
    throw error;
  }
}

module.exports = fetchJobNotes;
