/**
 * Spotify Auth Service — Authorization Code Flow
 *
 * Handles user-level OAuth: account login, token exchange, profile fetch,
 * token refresh, and playlist retrieval.
 *
 * Compliance notes (Spotify Developer Policy):
 * - Only email, display_name, and Spotify ID are stored from the user profile.
 * - Access/refresh tokens are stored solely to make API calls on the user's behalf.
 * - Playlist metadata only (no track audio, no content caching).
 * - Tokens are invalidated from our DB when the user disconnects Spotify.
 */

const axios = require('axios');

const SPOTIFY_ACCOUNTS_URL = 'https://accounts.spotify.com';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Scopes required for this platform
const SCOPES = [
  'user-read-email',
  'user-read-private',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

/**
 * Returns the Spotify authorization URL to redirect the user to.
 * @param {string} state - CSRF state token
 */
const getAuthorizationUrl = (state) => {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    scope: SCOPES,
    state,
  });
  return `${SPOTIFY_ACCOUNTS_URL}/authorize?${params}`;
};

/**
 * Exchanges an authorization code for Spotify access + refresh tokens.
 * @param {string} code - Authorization code from Spotify callback
 * @returns {{ access_token, refresh_token, expires_in, scope }}
 */
const exchangeCodeForTokens = async (code) => {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const response = await axios.post(
    `${SPOTIFY_ACCOUNTS_URL}/api/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data;
};

/**
 * Refreshes an expired Spotify access token using the stored refresh token.
 * @param {string} refreshToken - The user's stored Spotify refresh token
 * @returns {{ access_token, expires_in, refresh_token? }}
 */
const refreshAccessToken = async (refreshToken) => {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const response = await axios.post(
    `${SPOTIFY_ACCOUNTS_URL}/api/token`,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data;
};

/**
 * Fetches the authenticated user's Spotify profile.
 * Only id, email, and display_name are used — nothing else is stored.
 * @param {string} accessToken
 */
const getSpotifyProfile = async (accessToken) => {
  const response = await axios.get(`${SPOTIFY_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
};

/**
 * Fetches all of the user's Spotify playlists (metadata only).
 * Handles pagination to retrieve up to 200 playlists.
 * @param {string} accessToken
 */
const getUserPlaylists = async (accessToken) => {
  const playlists = [];
  let url = `${SPOTIFY_API_BASE}/me/playlists`;
  const params = { limit: 50 };

  while (url) {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
    });

    playlists.push(...response.data.items);

    // Spotify returns null when there are no more pages
    url = response.data.next || null;
    // After first request, params are baked into the next URL
    delete params.limit;
  }

  return playlists;
};

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getSpotifyProfile,
  getUserPlaylists,
};
