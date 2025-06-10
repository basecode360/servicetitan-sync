const axios = require('axios');
require('dotenv').config();

let accessToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  const currentTime = Math.floor(Date.now() / 1000);

  // Check if the token is still valid
  if (accessToken && tokenExpiry && currentTime < tokenExpiry) {
    return accessToken;
  }

  try {
    const response = await axios.post(
      process.env.ST_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.ST_CLIENT_ID,
        client_secret: process.env.ST_CLIENT_SECRET,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    accessToken = response.data.access_token;
    // Set token expiry time (current time + expires_in - buffer)
    tokenExpiry = currentTime + response.data.expires_in - 60; // Subtracting 60 seconds as buffer

    return accessToken;
  } catch (error) {
    console.error(
      'Error obtaining access token:',
      error.response ? error.response.data : error.message
    );
    throw error;
  }
}

module.exports = { getAccessToken };
