/**
 * YouTube Service — API Key (Data API v3)
 *
 * Cache strategy (quota-safe):
 *   On startup: loads data/youtube-cache.json into memory — these entries
 *   never expire and count as zero API units. Commit the seed file to git so
 *   Heroku always boots pre-warmed.
 *
 *   Runtime: new searches hit the API once then live in the in-memory Map for
 *   the process lifetime (24 h TTL). On Heroku the Map resets on dyno restart;
 *   the seed file picks up the slack.
 *
 *   Run `node scripts/seed-youtube-cache.js` to regenerate the seed file.
 */

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const CACHE_TTL_MS     = 24 * 60 * 60 * 1000; // 24 hours
const SEED_FILE        = path.join(__dirname, '../data/youtube-cache.json');

// In-memory working cache — key: "query|maxResults"
const cache = new Map();

// ── Load seed file on startup ──────────────────────────────────────────────

(function loadSeedFile() {
  if (!fs.existsSync(SEED_FILE)) return;
  try {
    const raw  = fs.readFileSync(SEED_FILE, 'utf8');
    const data = JSON.parse(raw);
    let count  = 0;
    for (const [key, entry] of Object.entries(data)) {
      // Seed entries get a far-future expiry so they never evict during testing
      cache.set(key, { items: entry.items, expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000 });
      count++;
    }
    console.log(`[YouTube] Loaded ${count} seeded entries from cache file`);
  } catch (err) {
    console.warn('[YouTube] Could not load seed file:', err.message);
  }
})();

// ── Core search ───────────────────────────────────────────────────────────

/**
 * Search YouTube videos by query string using the Data API v3.
 * Seed-file hits cost 0 units. Runtime hits cost 100 units and are cached
 * for 24 hours for the lifetime of the process.
 *
 * @param {string} query      - Search term
 * @param {number} maxResults - Max results (default 5)
 */
const searchVideos = async (query = 'test', maxResults = 5) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY must be set in .env');

  const cacheKey = `${query}|${maxResults}`;
  const cached   = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    console.log(`[YouTube] Cache hit: "${query}"`);
    return cached.items;
  }

  console.log(`[YouTube] API call (${cache.size} cached): "${query}"`);

  const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
    params: { part: 'snippet', q: query, type: 'video', maxResults, key: apiKey },
  });

  const items = response.data.items;
  cache.set(cacheKey, { items, expiresAt: Date.now() + CACHE_TTL_MS });

  return items;
};

// ── Trending ──────────────────────────────────────────────────────────────

const TRENDING_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — trending moves slowly enough

/**
 * Fetches YouTube's real "most popular" videos in the Music category (id 10).
 * Uses videos.list?chart=mostPopular, which returns real view counts via the
 * `statistics` part — nothing here is fabricated.
 *
 * @param {number} maxResults - Max videos to return (default 12)
 */
const getTrendingMusicVideos = async (maxResults = 12) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY must be set in .env');

  const cacheKey = `trending|${maxResults}`;
  const cached   = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    console.log('[YouTube] Trending cache hit');
    return cached.items;
  }

  console.log('[YouTube] API call: trending music videos');

  const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
    params: {
      part: 'snippet,statistics',
      chart: 'mostPopular',
      videoCategoryId: 10, // Music
      regionCode: 'US',
      maxResults,
      key: apiKey,
    },
  });

  const items = response.data.items;
  cache.set(cacheKey, { items, expiresAt: Date.now() + TRENDING_CACHE_TTL_MS });

  return items;
};

module.exports = { searchVideos, getTrendingMusicVideos };
