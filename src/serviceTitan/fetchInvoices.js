const pool = require('../db/postgres');
const { makeAuthenticatedRequest } = require('./auth');

async function fetchInvoices() {
  console.log('🔄 Starting invoices fetch...');

  try {
    const baseUrl = `https://api.servicetitan.io/accounting/v2/tenant/${process.env.ST_TENANT}/invoices`;
    let page = 1;
    const pageSize = 50; // Reduced from 100 to be safer
    let totalInvoices = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    while (true) {
      try {
        console.log(`📄 Fetching invoices page ${page}...`);

        const response = await makeAuthenticatedRequest(baseUrl, {
          params: {
            page,
            pageSize,
            createdAfter: '2024-01-01T00:00:00Z',
          },
        });

        const invoices = response.data.data;

        if (!invoices || invoices.length === 0) {
          console.log('📋 No more invoices to fetch');
          break;
        }

        for (const invoice of invoices) {
          try {
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

            totalInvoices++;
          } catch (dbError) {
            console.error(
              `❌ Error saving invoice ${invoice.id}:`,
              dbError.message
            );
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
          console.log(
            `📊 Progress: ${totalInvoices} invoices processed so far...`
          );
        }

        // Rate limiting - longer delay for large dataset
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (apiError) {
        consecutiveErrors++;
        console.error(
          `❌ Error fetching invoices page ${page} (attempt ${consecutiveErrors}):`,
          apiError.message
        );

        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error(
            `💥 Too many consecutive errors (${maxConsecutiveErrors}), stopping invoices fetch`
          );
          break;
        }

        // Wait longer before retry
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue; // Retry same page
      }
    }

    console.log(
      `✅ Invoices fetch complete. Total invoices processed: ${totalInvoices}`
    );
  } catch (error) {
    console.error('❌ Fatal error in fetchInvoices:', error.message);
    throw error;
  }
}

module.exports = fetchInvoices;
