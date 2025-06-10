const axios = require('axios');
const pool = require('../db/postgres');
const { getAccessToken } = require('./auth');

async function fetchInvoices() {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const baseUrl = 'https://api.servicetitan.io/v2/invoices';
  let page = 1;
  const pageSize = 100;

  while (true) {
    try {
      const response = await axios.get(baseUrl, {
        headers,
        params: { page, pageSize },
      });

      const invoices = response.data.data;

      if (!invoices || invoices.length === 0) {
        break;
      }

      for (const invoice of invoices) {
        const {
          id: invoice_id,
          customer,
          total,
          balance,
          status,
          createdDate: created_at,
          modifiedDate: updated_at,
        } = invoice;

        const customer_name = customer?.name || null;

        await pool.query(
          `
          INSERT INTO invoices (invoice_id, customer_name, total, balance, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (invoice_id) DO UPDATE SET
            customer_name = EXCLUDED.customer_name,
            total = EXCLUDED.total,
            balance = EXCLUDED.balance,
            status = EXCLUDED.status,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at;
          `,
          [
            invoice_id,
            customer_name,
            total,
            balance,
            status,
            created_at,
            updated_at,
          ]
        );
      }

      if (!response.data.hasMore) {
        break;
      }

      page += 1;
    } catch (error) {
      console.error('Error fetching invoices:', error.message);
      break;
    }
  }
}

module.exports = fetchInvoices;
