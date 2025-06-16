const pool = require('../db/postgres');
const { makeAuthenticatedRequest } = require('./auth');

async function fetchJobs() {
  console.log('🔄 Starting jobs fetch...');

  try {
    const baseUrl = `https://api.servicetitan.io/jpm/v2/tenant/${process.env.ST_TENANT}/jobs`;
    let page = 1;
    const pageSize = 50; // Reduced from 100 to be safer
    let totalJobs = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    while (true) {
      try {
        console.log(`📄 Fetching jobs page ${page}...`);

        const response = await makeAuthenticatedRequest(baseUrl, {
          params: {
            page,
            pageSize,
            createdAfter: '2024-01-01T00:00:00Z',
          },
        });

        const jobs = response.data.data;

        if (!jobs || jobs.length === 0) {
          console.log('📋 No more jobs to fetch');
          break;
        }

        for (const job of jobs) {
          try {
            const {
              id: job_id,
              jobType,
              technician,
              location,
              status,
              scheduledDate,
            } = job;

            // Safely extract nested properties
            const job_type = jobType?.name || null;
            const technician_name = technician?.name || null;
            const location_name = location?.name || null;
            const scheduled_date = scheduledDate || null;

            await pool.query(
              `
              INSERT INTO jobs (job_id, job_type, technician, location, status, scheduled_date)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (job_id) DO UPDATE SET
                job_type = EXCLUDED.job_type,
                technician = EXCLUDED.technician,
                location = EXCLUDED.location,
                status = EXCLUDED.status,
                scheduled_date = EXCLUDED.scheduled_date;
              `,
              [
                job_id,
                job_type,
                technician_name,
                location_name,
                status,
                scheduled_date,
              ]
            );

            totalJobs++;
          } catch (dbError) {
            console.error(`❌ Error saving job ${job.id}:`, dbError.message);
          }
        }

        // Reset error counter on success
        consecutiveErrors = 0;

        // Check if there are more pages
        if (!response.data.hasMore) {
          break;
        }

        page += 1;

        // Progress update every 50 pages
        if (page % 50 === 0) {
          console.log(`📊 Progress: ${totalJobs} jobs processed so far...`);
        }

        // Rate limiting - longer delay for large dataset
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (apiError) {
        consecutiveErrors++;
        console.error(
          `❌ Error fetching jobs page ${page} (attempt ${consecutiveErrors}):`,
          apiError.message
        );

        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error(
            `💥 Too many consecutive errors (${maxConsecutiveErrors}), stopping jobs fetch`
          );
          break;
        }

        // Wait longer before retry
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue; // Retry same page
      }
    }

    console.log(`✅ Jobs fetch complete. Total jobs processed: ${totalJobs}`);
  } catch (error) {
    console.error('❌ Fatal error in fetchJobs:', error.message);
    throw error;
  }
}

module.exports = fetchJobs;
