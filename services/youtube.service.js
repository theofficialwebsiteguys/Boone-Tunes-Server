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

// In-memory cache — key: "query|maxResults", value: { items, expiresAt }
// TTL: 24 hours. Survives the process lifetime; resets on server restart.
const cache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Search YouTube videos by query string using the Data API v3.
 * Results are cached for 24 hours to conserve quota (100 units per search).
 *
 * @param {string} query - Search term
 * @param {number} maxResults - Max results (default 5)
 */
const searchVideos = async (query = 'test', maxResults = 5) => {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY must be set in .env');
  }

  const cacheKey = `${query}|${maxResults}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    console.log(`[YouTube] Cache hit for: "${query}"`);
    return cached.items;
  }

  console.log(`[YouTube] API call for: "${query}" (${cache.size} entries cached)`);

  const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
    params: {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults,
      key: apiKey,
    },
  });

  const items = response.data.items;
  cache.set(cacheKey, { items, expiresAt: Date.now() + CACHE_TTL_MS });

  return items;
};

module.exports = { searchVideos };
