/**
 * YouTube Controller
 *
 * GET /api/youtube/search?track=&artist=
 * Searches YouTube for music videos matching a track and returns one result
 * per video type (top/music video, live, lyrics, official audio).
 * Results are never stored — callers should cache short-term in memory only.
 */

const youtubeService = require('../services/youtube.service');

/**
 * One targeted search per video type instead of a single generic search —
 * guarantees each type is represented (when YouTube actually has one) rather
 * than hoping all four happen to show up in one mixed result set.
 *
 * `music-video` keeps maxResults at 5 (matching the query+limit the app has
 * always used) so it still hits the pre-seeded quota-free cache; the other
 * three are new query shapes and will cost quota on first lookup.
 *
 * Order here is the order returned to the client: Top, Live, Lyrics, Audio.
 */
const VIDEO_CATEGORIES = [
  { category: 'music-video',    suffix: 'official music video', maxResults: 5, prefer: null },
  { category: 'live',           suffix: 'live',                 maxResults: 3, prefer: /\blive\b/i },
  { category: 'lyric-video',    suffix: 'lyrics',                maxResults: 3, prefer: /lyric/i },
  { category: 'official-audio', suffix: 'official audio',        maxResults: 3, prefer: /official\s+audio|audio\s+only/i },
];

const toVideo = (item, category) => ({
  videoId:      item.id.videoId,
  title:        item.snippet.title,
  channelTitle: item.snippet.channelTitle,
  thumbnail:
    item.snippet.thumbnails?.medium?.url ??
    item.snippet.thumbnails?.default?.url ??
    null,
  category,
});

/**
 * GET /api/youtube/search
 *
 * Query params:
 *   track  {string}  Track name (required)
 *   artist {string}  Artist name (recommended)
 */
const searchForTrack = async (req, res) => {
  const { track, artist } = req.query;

  if (!track) {
    return res.status(400).json({ error: 'track query param is required' });
  }

  const base = artist ? `${artist} ${track}` : track;
  let quotaExceeded = false;

  try {
    // Fetch every category's raw candidates in parallel first...
    const rawResults = await Promise.all(
      VIDEO_CATEGORIES.map(async (def) => {
        try {
          const items = await youtubeService.searchVideos(`${base} ${def.suffix}`, def.maxResults);
          return { ...def, items };
        } catch (err) {
          const reason = err.response?.data?.error?.errors?.[0]?.reason;
          if (err.response?.status === 403 && reason === 'quotaExceeded') quotaExceeded = true;
          console.error(`[YouTube] "${def.category}" search failed:`, err.message);
          return { ...def, items: [] };
        }
      })
    );

    // ...then greedily claim one distinct video per category, in category
    // order, skipping any videoId a previous category already claimed. This
    // prevents e.g. "Audio" silently falling back to the same upload already
    // picked for "Top" when no dedicated audio-only video exists.
    const usedIds = new Set();
    const videos = [];

    for (const { category, prefer, items } of rawResults) {
      const candidates = items.filter(item => !usedIds.has(item.id.videoId));
      if (!candidates.length) continue;

      const best = (prefer && candidates.find(item => prefer.test(item.snippet.title))) || candidates[0];
      usedIds.add(best.id.videoId);
      videos.push(toVideo(best, category));
    }

    if (videos.length === 0 && quotaExceeded) {
      return res.status(500).json({
        error: 'YouTube quota exceeded — resets at midnight Pacific time',
        status: 403,
        reason: 'quotaExceeded',
      });
    }

    return res.json({ videos });
  } catch (err) {
    console.error('[YouTube] Search error:', err.message);
    return res.status(500).json({ error: 'YouTube search failed' });
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
