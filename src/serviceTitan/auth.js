const axios = require('axios');
require('dotenv').config();

let accessToken = null;
let tokenExpiry = null;
let refreshInProgress = false;

async function getAccessToken(forceRefresh = false) {
  const currentTime = Math.floor(Date.now() / 1000);

  // If refresh already in progress, wait for it
  if (refreshInProgress) {
    console.log('🔄 Waiting for token refresh in progress...');
    while (refreshInProgress) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return accessToken;
  }

  // Check if the token is still valid (with 5 minute buffer)
  if (
    !forceRefresh &&
    accessToken &&
    tokenExpiry &&
    currentTime < tokenExpiry - 300
  ) {
    const remainingTime = Math.round((tokenExpiry - currentTime) / 60);
    console.log(`🔐 Using cached token (expires in ${remainingTime} minutes)`);
    return accessToken;
  }

  // If token expires in less than 5 minutes, force refresh
  if (accessToken && tokenExpiry && currentTime > tokenExpiry - 300) {
    console.log('⚠️ Token expiring soon, forcing refresh...');
    forceRefresh = true;
  }

  refreshInProgress = true;
  console.log('🔄 Requesting new access token...');

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
        timeout: 15000, // 15 second timeout
      }
    );

    accessToken = response.data.access_token;
    const expiresIn = response.data.expires_in;

    // Set token expiry time (current time + expires_in - buffer)
    tokenExpiry = currentTime + expiresIn - 120; // 2 minute buffer instead of 1

    const expiryDate = new Date(tokenExpiry * 1000);
    console.log(
      `✅ New access token obtained (expires at ${expiryDate.toISOString()})`
    );

    return accessToken;
  } catch (error) {
    console.error('❌ Error obtaining access token:');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.message);
    } else {
      console.error('Request setup error:', error.message);
    }

    // Clear cached token on error
    accessToken = null;
    tokenExpiry = null;

    throw error;
  } finally {
    refreshInProgress = false;
  }
}

// Helper function to handle API calls with automatic token refresh
async function makeAuthenticatedRequest(url, options = {}) {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const token = await getAccessToken(attempts > 0); // Force refresh on retry

      const headers = {
        Authorization: `Bearer ${token}`,
        'ST-App-Key': process.env.ST_APP_KEY,
        ...options.headers,
      };

      const response = await axios.get(url, {
        ...options,
        headers,
        timeout: 30000, // 30 second timeout
      });

      return response;
    } catch (error) {
      attempts++;

      if (error.response?.status === 401 && attempts < maxAttempts) {
        console.log(
          `🔄 Token expired, retrying (attempt ${attempts}/${maxAttempts})...`
        );
        accessToken = null; // Force token refresh
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
        continue;
      }

      throw error;
    }
  }
}

module.exports = { getAccessToken, makeAuthenticatedRequest };
