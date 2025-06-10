const axios = require('axios');
require('dotenv').config();

(async () => {
  // Log environment variables for debugging
  console.log('🔍 Environment Variables:');
  console.log('ST_TOKEN_URL:', process.env.ST_TOKEN_URL);
  console.log('ST_CLIENT_ID:', process.env.ST_CLIENT_ID);
  console.log('ST_CLIENT_SECRET:', process.env.ST_CLIENT_SECRET);
  console.log('---');

  try {
    const response = await axios.post(
      process.env.ST_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.ST_CLIENT_ID,
        client_secret: process.env.ST_CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    console.log('✅ Access Token:', response.data.access_token);
  } catch (error) {
    console.error(
      '❌ Failed to get token:',
      error.response?.data || error.message
    );
  }
})();
