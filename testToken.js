const axios = require('axios');
require('dotenv').config();

(async () => {
  // Log environment variables for debugging
  console.log('🔍 Environment Variables:');
  console.log('ST_TOKEN_URL:', process.env.ST_TOKEN_URL);
  console.log('ST_CLIENT_ID:', process.env.ST_CLIENT_ID);
  console.log(
    'ST_CLIENT_SECRET:',
    process.env.ST_CLIENT_SECRET ? '***HIDDEN***' : 'NOT SET'
  );
  console.log('ST_TENANT:', process.env.ST_TENANT);
  console.log('---');

  try {
    console.log('🔄 Requesting access token from ServiceTitan...');

    const response = await axios.post(
      process.env.ST_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.ST_CLIENT_ID,
        client_secret: process.env.ST_CLIENT_SECRET,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      }
    );

    console.log('✅ SUCCESS! Token response:');
    console.log(
      'Access Token:',
      response.data.access_token ? '***TOKEN_RECEIVED***' : 'NO TOKEN'
    );
    console.log('Token Type:', response.data.token_type);
    console.log('Expires In:', response.data.expires_in, 'seconds');

    // Test API calls with the correct endpoints
    if (response.data.access_token) {
      console.log('\n🔄 Testing API calls with correct endpoints...');

      const headers = {
        Authorization: `Bearer ${response.data.access_token}`,
        'ST-App-Key': process.env.ST_APP_KEY, // Using APP_KEY instead of client_id
      };

      // Test 1: Jobs endpoint
      try {
        console.log('\n📋 Testing Jobs endpoint...');
        const jobsResponse = await axios.get(
          `https://api.servicetitan.io/jpm/v2/tenant/${process.env.ST_TENANT}/jobs`,
          {
            headers,
            params: {
              page: 1,
              pageSize: 1, // Just get 1 record to test
            },
            timeout: 10000,
          }
        );

        console.log('✅ Jobs API SUCCESS!');
        console.log('Status:', jobsResponse.status);
        console.log(
          'Has Data:',
          jobsResponse.data.data ? jobsResponse.data.data.length > 0 : false
        );
        console.log(headers);
      } catch (jobsError) {
        console.error('❌ Jobs API FAILED:');
        if (jobsError.response) {
          console.error('Status:', jobsError.response.status);
          console.error('Data:', jobsError.response.data);
        } else {
          console.error('Error:', jobsError.message);
        }
      }

      // Test 2: Invoices endpoint
      try {
        console.log('\n💰 Testing Invoices endpoint...');
        const invoicesResponse = await axios.get(
          `https://api.servicetitan.io/accounting/v2/tenant/${process.env.ST_TENANT}/invoices`,
          {
            headers,
            params: {
              page: 1,
              pageSize: 1, // Just get 1 record to test
            },
            timeout: 10000,
          }
        );

        console.log('✅ Invoices API SUCCESS!');
        console.log('Status:', invoicesResponse.status);
        console.log(
          'Has Data:',
          invoicesResponse.data.data
            ? invoicesResponse.data.data.length > 0
            : false
        );
      } catch (invoicesError) {
        console.error('❌ Invoices API FAILED:');
        if (invoicesError.response) {
          console.error('Status:', invoicesError.response.status);
          console.error('Data:', invoicesError.response.data);
        } else {
          console.error('Error:', invoicesError.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ TOKEN REQUEST FAILED:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Response Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.message);
    } else {
      console.error('Request setup error:', error.message);
    }
  }
})();
