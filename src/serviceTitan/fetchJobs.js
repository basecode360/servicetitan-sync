const axios = require('axios');
const pool = require('../db/postgres');
const { getAccessToken } = require('./auth');

async function fetchJobs() {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const baseUrl = 'https://api.servicetitan.io/v2/jobs';
  let page = 1;
  const pageSize = 100;

  while (true) {
    try {
      const response = await axios.get(baseUrl, {
        headers,
        params: { page, pageSize },
      });

      const jobs = response.data.data;

      if (!jobs || jobs.length === 0) {
        break;
      }

      for (const job of jobs) {
        const {
          id: job_id,
          jobType: { name: job_type } = {},
          technician: { name: technician } = {},
          location: { name: location } = {},
          status,
          scheduledDate,
        } = job;

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
          [job_id, job_type, technician, location, status, scheduled_date]
        );
      }

      if (!response.data.hasMore) {
        break;
      }

      page += 1;
    } catch (error) {
      console.error('Error fetching jobs:', error.message);
      break;
    }
  }
}

module.exports = fetchJobs;
