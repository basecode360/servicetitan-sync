const axios = require('axios');
const pool = require('../db/postgres');
const { getAccessToken } = require('./auth');

async function fetchEstimates() {
  console.log('💰 Starting estimates fetch...');

  try {
    const token = await getAccessToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'ST-App-Key': process.env.ST_APP_KEY,
    };
    const baseUrl = `https://api.servicetitan.io/sales/v2/tenant/${process.env.ST_TENANT}/estimates`;
    let page = 1;
    const pageSize = 100;
    let totalEstimates = 0;

    while (true) {
      try {
        console.log(`📄 Fetching estimates page ${page}...`);

        const response = await axios.get(baseUrl, {
          headers,
          params: {
            page,
            pageSize,
            createdAfter: '2024-01-01T00:00:00Z',
          },
        });

        const estimates = response.data.data;

        if (!estimates || estimates.length === 0) {
          console.log('📋 No more estimates to fetch');
          break;
        }

        for (const estimate of estimates) {
          try {
            const {
              id: estimate_id,
              jobId: job_id,
              customerId: customer_id,
              total,
              status,
              soldBy: sold_by_obj,
              createdOn: created_on,
              soldOn: sold_on,
              items,
            } = estimate;

            // Extract sold by info
            const sold_by = sold_by_obj?.name || null;
            const items_count = items ? items.length : 0;

            await pool.query(
              `
              INSERT INTO estimates (
                estimate_id, job_id, customer_id, total, status,
                sold_by, created_on, sold_on, items_count
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (estimate_id) DO UPDATE SET
                job_id = EXCLUDED.job_id,
                customer_id = EXCLUDED.customer_id,
                total = EXCLUDED.total,
                status = EXCLUDED.status,
                sold_by = EXCLUDED.sold_by,
                created_on = EXCLUDED.created_on,
                sold_on = EXCLUDED.sold_on,
                items_count = EXCLUDED.items_count;
              `,
              [
                estimate_id,
                job_id,
                customer_id,
                total,
                status,
                sold_by,
                created_on,
                sold_on,
                items_count,
              ]
            );

            totalEstimates++;
          } catch (dbError) {
            console.error(
              `❌ Error saving estimate ${estimate.id}:`,
              dbError.message
            );
          }
        }

        if (!response.data.hasMore) {
          break;
        }

        page += 1;
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (apiError) {
        console.error(
          `❌ Error fetching estimates page ${page}:`,
          apiError.message
        );
        if (apiError.response?.status === 401) {
          console.error('🔒 Unauthorized - token may be expired');
        }
        break;
      }
    }

    console.log(
      `✅ Estimates fetch complete. Total estimates processed: ${totalEstimates}`
    );
  } catch (error) {
    console.error('❌ Fatal error in fetchEstimates:', error.message);
    throw error;
  }
}

module.exports = fetchEstimates;
