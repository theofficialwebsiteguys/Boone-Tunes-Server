/**
 * Spotify Service — Client Credentials Flow
 *
 * Compliance notes (Spotify Developer Policy):
 * - No Spotify content or metadata is permanently stored.
 * - User disconnect support will be added when user-level OAuth is implemented.
 * - Spotify data is NOT used for targeted advertising or user profiling.
 * - Access tokens are held in memory only and discarded on server restart.
 */

const axios = require('axios');

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// In-memory token cache — not persisted to disk or database
let tokenCache = {
  accessToken: null,
  expiresAt: null,
};

/**
 * Returns a valid Spotify access token.
 * Uses cached token if still valid; otherwise fetches a new one.
 */
const getAccessToken = async () => {
  const now = Date.now();

  if (tokenCache.accessToken && tokenCache.expiresAt && now < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await axios.post(
    SPOTIFY_TOKEN_URL,
    new URLSearchParams({ grant_type: 'client_credentials' }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const { access_token, expires_in } = response.data;

  // Cache token with a 60-second buffer before actual expiration
  tokenCache = {
    accessToken: access_token,
    expiresAt: now + (expires_in - 60) * 1000,
  };

  console.log('[Spotify] Access token refreshed successfully.');
  return access_token;
};

/**
 * Search Spotify tracks by query string.
 * Returns the raw Spotify tracks response — caller decides what to forward.
 * Data is NOT stored.
 *
 * @param {string} query - Search term (e.g. "Fleetwood Mac")
 * @param {number} limit - Max results (default 5)
 */
const searchTracks = async (query = 'test', limit = 5) => {
  const token = await getAccessToken();

  const response = await axios.get(`${SPOTIFY_API_BASE}/search`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { q: query, type: 'track', limit },
  });

  // Return only the tracks portion — minimal surface area
  return response.data.tracks;
};

module.exports = { getAccessToken, searchTracks };
