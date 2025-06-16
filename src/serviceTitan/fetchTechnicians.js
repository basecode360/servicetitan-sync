const axios = require('axios');
const pool = require('../db/postgres');
const { getAccessToken } = require('./auth');

async function fetchTechnicians() {
  console.log('🔧 Starting technicians fetch...');

  try {
    const token = await getAccessToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'ST-App-Key': process.env.ST_APP_KEY,
    };
    const baseUrl = `https://api.servicetitan.io/settings/v2/tenant/${process.env.ST_TENANT}/employees`;
    let page = 1;
    const pageSize = 100;
    let totalTechnicians = 0;

    while (true) {
      try {
        console.log(`📄 Fetching technicians page ${page}...`);

        const response = await axios.get(baseUrl, {
          headers,
          params: {
            page,
            pageSize,
            // Only get technicians (not office staff)
            filter: 'isTechnician eq true',
          },
        });

        const technicians = response.data.data;

        if (!technicians || technicians.length === 0) {
          console.log('📋 No more technicians to fetch');
          break;
        }

        for (const technician of technicians) {
          try {
            const {
              id: technician_id,
              name,
              firstName: first_name,
              lastName: last_name,
              email,
              phoneNumber: phone_number,
              employeeId: employee_id,
              active,
              createdOn: created_on,
            } = technician;

            await pool.query(
              `
              INSERT INTO technicians (
                technician_id, name, first_name, last_name,
                email, phone_number, employee_id, active, created_on
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (technician_id) DO UPDATE SET
                name = EXCLUDED.name,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                email = EXCLUDED.email,
                phone_number = EXCLUDED.phone_number,
                employee_id = EXCLUDED.employee_id,
                active = EXCLUDED.active,
                created_on = EXCLUDED.created_on;
              `,
              [
                technician_id,
                name,
                first_name,
                last_name,
                email,
                phone_number,
                employee_id,
                active,
                created_on,
              ]
            );

            totalTechnicians++;
          } catch (dbError) {
            console.error(
              `❌ Error saving technician ${technician.id}:`,
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
          `❌ Error fetching technicians page ${page}:`,
          apiError.message
        );
        if (apiError.response?.status === 401) {
          console.error('🔒 Unauthorized - token may be expired');
        }
        break;
      }
    }

    console.log(
      `✅ Technicians fetch complete. Total technicians processed: ${totalTechnicians}`
    );
  } catch (error) {
    console.error('❌ Fatal error in fetchTechnicians:', error.message);
    throw error;
  }
}

module.exports = fetchTechnicians;
