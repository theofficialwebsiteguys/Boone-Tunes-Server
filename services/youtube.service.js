/**
 * YouTube Service — API Key (Data API v3)
 *
 * Current implementation uses a server-side API key for public data only.
 *
 * OAuth 2.0 structure is prepared below for future use cases:
 * - Uploading videos on behalf of a user
 * - Reading a user's private playlists
 * OAuth requires YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET and a redirect flow
 * (do NOT implement until user-facing auth is ready).
 */

const axios = require('axios');

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Search YouTube videos by query string using the Data API v3.
 * Returns an array of video items — data is NOT stored.
 *
 * @param {string} query - Search term (e.g. "Boone Tunes live")
 * @param {number} maxResults - Max results (default 5)
 */
const searchVideos = async (query = 'test', maxResults = 5) => {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY must be set in .env');
  }

  const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
    params: {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults,
      key: apiKey,
    },
  });

  return response.data.items;
};

// ---------------------------------------------------------------------------
// OAuth 2.0 scaffold — NOT yet implemented
// When user-level OAuth is needed, wire these up with the full redirect flow.
// Required env vars: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET
// ---------------------------------------------------------------------------

// const getOAuthClient = () => { /* TODO */ };
// const getUserPlaylists = async (oauthToken) => { /* TODO */ };
// const uploadVideo = async (oauthToken, videoData) => { /* TODO */ };

module.exports = { searchVideos };
