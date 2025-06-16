const pool = require('../db/postgres');
const { makeAuthenticatedRequest } = require('./auth');

async function fetchAppointments() {
  console.log('📅 Starting appointments fetch...');

  const baseUrl = `https://api.servicetitan.io/jpm/v2/tenant/${process.env.ST_TENANT}/appointments`;
  let page = 1;
  const pageSize = 50;
  let totalAppointments = 0;
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 3;

  while (true) {
    try {
      console.log(`📄 Fetching appointments page ${page}...`);

      const response = await makeAuthenticatedRequest(baseUrl, {
        params: {
          page,
          pageSize,
          includeTotal: true,
          sort: '+CreatedOn',
          // If you truly want everything ever, omit any date filter.
          // Otherwise you could do:
          // createdOnOrAfter: '2024-01-01T00:00:00Z',
        },
      });

      const appointments = response.data.data;
      if (!Array.isArray(appointments) || appointments.length === 0) {
        console.log('📋 No more appointments to fetch.');
        break;
      }

      for (const appt of appointments) {
        const {
          id: appointment_id,
          jobId: job_id,
          appointmentNumber: appointment_number,
          technician,
          start: scheduled_start,
          end: scheduled_end,
          arrivalWindowStart: arrival_window_start,
          arrivalWindowEnd: arrival_window_end,
          status,
          specialInstructions: special_instructions,
          createdOn: created_on,
          modifiedOn: modified_on,
          customerId: customer_id,
          unused,
          createdById: created_by_id,
          isConfirmed: is_confirmed,
        } = appt;

        const technician_id = technician?.id ?? null;
        const technician_name = technician?.name ?? null;

        try {
          await pool.query(
            `
            INSERT INTO appointments (
              appointment_id, job_id, appointment_number,
              technician_id, technician_name,
              scheduled_start, scheduled_end,
              arrival_window_start, arrival_window_end,
              status, special_instructions,
              created_on, modified_on,
              customer_id, unused,
              created_by_id, is_confirmed
            ) VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
            )
            ON CONFLICT (appointment_id) DO UPDATE SET
              job_id               = EXCLUDED.job_id,
              appointment_number   = EXCLUDED.appointment_number,
              technician_id        = EXCLUDED.technician_id,
              technician_name      = EXCLUDED.technician_name,
              scheduled_start      = EXCLUDED.scheduled_start,
              scheduled_end        = EXCLUDED.scheduled_end,
              arrival_window_start = EXCLUDED.arrival_window_start,
              arrival_window_end   = EXCLUDED.arrival_window_end,
              status               = EXCLUDED.status,
              special_instructions = EXCLUDED.special_instructions,
              created_on           = EXCLUDED.created_on,
              modified_on          = EXCLUDED.modified_on,
              customer_id          = EXCLUDED.customer_id,
              unused               = EXCLUDED.unused,
              created_by_id        = EXCLUDED.created_by_id,
              is_confirmed         = EXCLUDED.is_confirmed;
            `,
            [
              appointment_id,
              job_id,
              appointment_number,
              technician_id,
              technician_name,
              scheduled_start,
              scheduled_end,
              arrival_window_start,
              arrival_window_end,
              status,
              special_instructions,
              created_on,
              modified_on,
              customer_id,
              unused,
              created_by_id,
              is_confirmed,
            ]
          );
          totalAppointments++;
        } catch (dbErr) {
          console.error(
            `❌ DB error on appt ${appointment_id}:`,
            dbErr.message
          );
        }
      }

      consecutiveErrors = 0;

      // if fewer than pageSize came back, we're done
      if (appointments.length < pageSize) {
        break;
      }

      page++;

      // occasional progress log
      if (page % 50 === 0) {
        console.log(`📊 ${totalAppointments} appointments processed so far…`);
      }

      // brief pause to respect rate limits
      await new Promise((res) => setTimeout(res, 200));
    } catch (apiErr) {
      consecutiveErrors++;
      console.error(
        `❌ API error on page ${page} (attempt ${consecutiveErrors}):`,
        apiErr.message
      );

      if (consecutiveErrors >= maxConsecutiveErrors) {
        console.error(
          `💥 Stopping after ${maxConsecutiveErrors} failed attempts.`
        );
        break;
      }
      await new Promise((res) => setTimeout(res, 2000));
      // retry same page
    }
  }

  console.log(
    `✅ Completed. Total appointments upserted: ${totalAppointments}`
  );
}

module.exports = fetchAppointments;
