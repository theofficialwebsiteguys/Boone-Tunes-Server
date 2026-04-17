/**
 * Google Auth Service — OAuth 2.0
 *
 * Used for optional Google login. Only fetches identity information
 * (sub/googleId, email, name) — no Google data is stored beyond what
 * is needed to identify the user account.
 */

const axios = require('axios');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

// openid + email is all we need to identify the user
const SCOPES = ['openid', 'email', 'profile'].join(' ');

/**
 * Returns the Google authorization URL to redirect the user to.
 * @param {string} state - CSRF state token
 */
const getAuthorizationUrl = (state) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    state,
    // 'online' — we only need identity, no offline access
    access_type: 'online',
    // Always show the account chooser so users can switch accounts
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
};

/**
 * Exchanges an authorization code for a Google access token.
 * @param {string} code
 */
const exchangeCodeForTokens = async (code) => {
  const response = await axios.post(
    GOOGLE_TOKEN_URL,
    new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return response.data;
};

/**
 * Fetches the authenticated user's Google profile.
 * Returns { sub, email, name, picture } — only sub, email, and name are used.
 * @param {string} accessToken
 */
const getGoogleProfile = async (accessToken) => {
  const response = await axios.get(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
};

module.exports = { getAuthorizationUrl, exchangeCodeForTokens, getGoogleProfile };
