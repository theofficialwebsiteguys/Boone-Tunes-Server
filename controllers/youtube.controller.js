/**
 * YouTube Controller
 *
 * GET /api/youtube/search?track=&artist=&maxResults=
 * Searches YouTube for music videos matching a track and returns the top results.
 * Results are never stored — callers should cache short-term in memory only.
 */

const youtubeService = require('../services/youtube.service');

/**
 * GET /api/youtube/search
 *
 * Query params:
 *   track      {string}  Track name (required)
 *   artist     {string}  Artist name (recommended)
 *   maxResults {number}  Max videos to return (optional, default 5, max 10)
 */
const searchForTrack = async (req, res) => {
  const { track, artist, maxResults = '5' } = req.query;

  if (!track) {
    return res.status(400).json({ error: 'track query param is required' });
  }

  const limit = Math.min(parseInt(maxResults, 10) || 5, 10);

  try {
    // Build a query optimised for official music videos
    const query = artist
      ? `${artist} ${track} official music video`
      : `${track} official music video`;

    const items = await youtubeService.searchVideos(query, limit);

    const videos = items.map(item => ({
      videoId:      item.id.videoId,
      title:        item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail:
        item.snippet.thumbnails?.medium?.url ??
        item.snippet.thumbnails?.default?.url ??
        null,
    }));

    return res.json({ videos });
  } catch (err) {
    const status  = err.response?.status;
    const reason  = err.response?.data?.error?.errors?.[0]?.reason ?? 'unknown';
    const message = err.response?.data?.error?.message ?? err.message;

    console.error('[YouTube] Search error:');
    console.error('  HTTP status :', status ?? 'no response');
    console.error('  Reason      :', reason);
    console.error('  Message     :', message);
    if (err.response?.data) {
      console.error('  Full body   :', JSON.stringify(err.response.data, null, 2));
    }

    const isQuota = status === 403 && reason === 'quotaExceeded';
    return res.status(500).json({
      error: isQuota ? 'YouTube quota exceeded — resets at midnight Pacific time' : 'YouTube search failed',
      status,
      reason,
    });
  }
};

/**
 * GET /api/youtube/direct-search
 *
 * Free-form YouTube search — the query is used exactly as provided, with no
 * "official music video" suffix. Intended for users searching for covers,
 * live performances, or anything not found via the track-based search.
 *
 * Query params:
 *   q          {string}  Raw search query (required)
 *   maxResults {number}  Max videos to return (optional, default 8, max 10)
 */
const directSearch = async (req, res) => {
  const { q, maxResults = '8' } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'q query param is required' });
  }

  const limit = Math.min(parseInt(maxResults, 10) || 8, 10);

  try {
    const items = await youtubeService.searchVideos(q.trim(), limit);

    const videos = items.map(item => ({
      videoId:      item.id.videoId,
      title:        item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail:
        item.snippet.thumbnails?.medium?.url ??
        item.snippet.thumbnails?.default?.url ??
        null,
    }));

    return res.json({ videos });
  } catch (err) {
    const status  = err.response?.status;
    const reason  = err.response?.data?.error?.errors?.[0]?.reason ?? 'unknown';
    const message = err.response?.data?.error?.message ?? err.message;

    console.error('[YouTube] Direct search error:');
    console.error('  HTTP status :', status ?? 'no response');
    console.error('  Reason      :', reason);
    console.error('  Message     :', message);

    const isQuota = status === 403 && reason === 'quotaExceeded';
    return res.status(500).json({
      error: isQuota ? 'YouTube quota exceeded — resets at midnight Pacific time' : 'YouTube search failed',
      status,
      reason,
    });
  }
};

module.exports = { searchForTrack, directSearch };
