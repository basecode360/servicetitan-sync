const axios = require('axios');
const pool = require('../db/postgres');
const { getAccessToken } = require('./auth');

async function fetchCustomers() {
  console.log('👥 Starting customers fetch...');

  try {
    const token = await getAccessToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'ST-App-Key': process.env.ST_APP_KEY,
    };
    const baseUrl = `https://api.servicetitan.io/crm/v2/tenant/${process.env.ST_TENANT}/customers`;
    let page = 1;
    const pageSize = 100;
    let totalCustomers = 0;

    while (true) {
      try {
        console.log(`📄 Fetching customers page ${page}...`);

        const response = await axios.get(baseUrl, {
          headers,
          params: {
            page,
            pageSize,
            modifiedAfter: '2024-01-01T00:00:00Z',
          },
        });

        const customers = response.data.data;

        if (!customers || customers.length === 0) {
          console.log('📋 No more customers to fetch');
          break;
        }

        for (const customer of customers) {
          try {
            const {
              id: customer_id,
              name,
              firstName: first_name,
              lastName: last_name,
              companyName: company_name,
              email,
              phoneNumber: phone_number,
              mobileNumber: mobile_number,
              address,
              createdOn: created_on,
              modifiedOn: modified_on,
              active,
            } = customer;

            // Extract address info
            const address_street = address?.street || null;
            const address_city = address?.city || null;
            const address_state = address?.state || null;
            const address_zip = address?.zip || null;

            await pool.query(
              `
              INSERT INTO customers (
                customer_id, name, first_name, last_name, company_name,
                email, phone_number, mobile_number, 
                address_street, address_city, address_state, address_zip,
                created_on, modified_on, active
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
              ON CONFLICT (customer_id) DO UPDATE SET
                name = EXCLUDED.name,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                company_name = EXCLUDED.company_name,
                email = EXCLUDED.email,
                phone_number = EXCLUDED.phone_number,
                mobile_number = EXCLUDED.mobile_number,
                address_street = EXCLUDED.address_street,
                address_city = EXCLUDED.address_city,
                address_state = EXCLUDED.address_state,
                address_zip = EXCLUDED.address_zip,
                created_on = EXCLUDED.created_on,
                modified_on = EXCLUDED.modified_on,
                active = EXCLUDED.active;
              `,
              [
                customer_id,
                name,
                first_name,
                last_name,
                company_name,
                email,
                phone_number,
                mobile_number,
                address_street,
                address_city,
                address_state,
                address_zip,
                created_on,
                modified_on,
                active,
              ]
            );

            totalCustomers++;
          } catch (dbError) {
            console.error(
              `❌ Error saving customer ${customer.id}:`,
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
          `❌ Error fetching customers page ${page}:`,
          apiError.message
        );
        if (apiError.response?.status === 401) {
          console.error('🔒 Unauthorized - token may be expired');
        }
        break;
      }
    }

    console.log(
      `✅ Customers fetch complete. Total customers processed: ${totalCustomers}`
    );
  } catch (error) {
    console.error('❌ Fatal error in fetchCustomers:', error.message);
    throw error;
  }
}

module.exports = fetchCustomers;
