/**
 * Search Controller
 *
 * GET /api/search?q=<query>&limit=<number>
 *
 * Searches Spotify for tracks matching the query and returns them in the same
 * normalised shape as playlist tracks — the frontend TrackList component works
 * for both without any changes.
 *
 * Compliance: results are not stored. Short-term in-memory cache only.
 */

const { searchTracks } = require('../services/spotify-auth.service');
const cache = require('../utils/cache');

const SEARCH_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const searchCacheKey = (userId, query, limit) =>
  `search:${userId}:${query.toLowerCase().trim()}:${limit}`;

/**
 * GET /api/search?q=bohemian+rhapsody&limit=20
 */
const search = async (req, res) => {
  const q = req.query.q?.trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  const key = searchCacheKey(req.user.id, q, limit);
  const cached = cache.get(key);
  if (cached) {
    return res.json({ tracks: cached, query: q, fromCache: true });
  }

  try {
    const tracks = await searchTracks(req.spotifyToken, q, limit);
    cache.set(key, tracks, SEARCH_CACHE_TTL);
    res.json({ tracks, query: q, fromCache: false });
  } catch (err) {
    console.error('[Search] Error:', err.message);
    res.status(500).json({ error: 'Search failed.' });
  }
};

module.exports = { search };
