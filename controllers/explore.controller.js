/**
 * Explore Controller
 *
 * Powers the "Explore Music" page: editorial Spotify playlists, seeded
 * recommendations, and real YouTube trending music videos.
 *
 * Note on Spotify's Nov 2024 Web API changes: /recommendations and
 * /related-artists were deprecated for apps without pre-existing extended
 * quota access, so this deliberately avoids them. Recommendations are built
 * instead from artist search + /artists/{id}/top-tracks (still available),
 * seeded from artist names the caller already has (from the user's own
 * playlists/liked songs) — no track data is stored.
 */

const {
  searchArtist,
  getArtistTopTracks,
} = require('../services/spotify-auth.service');
const { searchPlaylists } = require('../services/spotify.service');
const { getTrendingMusicVideos } = require('../services/youtube.service');
const cache = require('../utils/cache');

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const demoData  = DEMO_MODE ? require('../data/demo-data') : null;

// Search terms used to discover real, currently-fetchable playlists to feature.
// Spotify's own editorial playlists (Today's Top Hits, RapCaviar, etc.) return
// 404 via client-credentials — confirmed empirically, Spotify has locked its
// own editorial catalog out of the Web API. Searching instead of hardcoding an
// ID surfaces an active curator's playlist that's actually reachable.
const PLAYLIST_SEARCH_TERMS = [
  "today's top hits",
  'rap hits',
  'rock classics',
  'chill vibes',
];

const PLAYLIST_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const RECS_CACHE_TTL     = 10 * 60 * 1000; // 10 minutes
const MAX_SEED_ARTISTS   = 5;
const MAX_RECOMMENDED    = 30;

/**
 * GET /api/explore/spotify-playlists
 * Returns one real, currently-fetchable playlist per search term (see
 * PLAYLIST_SEARCH_TERMS above for why this searches rather than hardcodes IDs).
 */
const getSpotifyPlaylists = async (req, res) => {
  if (DEMO_MODE) {
    return res.json({
      playlists: demoData.playlists.map((pl) => ({
        id: pl.spotifyPlaylistId,
        name: pl.name,
        description: pl.description,
        imageUrl: pl.imageUrl,
        trackCount: pl.trackCount,
      })),
    });
  }

  try {
    const playlists = await Promise.all(
      PLAYLIST_SEARCH_TERMS.map(async (term) => {
        const key = `explore:playlist-search:${term}`;
        const cached = cache.get(key);
        if (cached) return cached;

        try {
          // Request a few results, not just 1 — Spotify's top search slot is
          // sometimes a null/inaccessible entry, so take the first valid one.
          const results = await searchPlaylists(term, 5);
          const meta = results[0];
          if (!meta) return null;
          cache.set(key, meta, PLAYLIST_CACHE_TTL);
          return meta;
        } catch (err) {
          console.error(`[Explore] Failed to find playlist for "${term}":`, err.message);
          return null;
        }
      })
    );

    res.json({ playlists: playlists.filter(Boolean) });
  } catch (err) {
    console.error('[Explore] Spotify playlists error:', err.message);
    res.status(500).json({ error: 'Failed to fetch Spotify playlists.' });
  }
};

/**
 * GET /api/explore/recommendations?seedArtists=Artist+One,Artist+Two
 *
 * Requires: requireSpotifyToken (sets req.spotifyToken)
 */
const getRecommendations = async (req, res) => {
  const seedArtists = (req.query.seedArtists ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_SEED_ARTISTS);

  if (DEMO_MODE) {
    const allTracks = Object.values(demoData.tracks).flat();
    const shuffled = [...allTracks].sort(() => Math.random() - 0.5);
    return res.json({ tracks: shuffled.slice(0, MAX_RECOMMENDED) });
  }

  if (seedArtists.length === 0) {
    return res.json({ tracks: [] });
  }

  const key = `explore:recs:${req.user.id}:${seedArtists.join('|').toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) {
    return res.json({ tracks: cached, fromCache: true });
  }

  try {
    const trackLists = await Promise.all(
      seedArtists.map(async (name) => {
        try {
          const artist = await searchArtist(req.spotifyToken, name);
          if (!artist) return [];
          return await getArtistTopTracks(req.spotifyToken, artist.id);
        } catch (err) {
          console.error(`[Explore] Seed artist "${name}" failed:`, err.message);
          return [];
        }
      })
    );

    const seen = new Set();
    const merged = [];
    for (const track of trackLists.flat()) {
      if (seen.has(track.spotifyId)) continue;
      seen.add(track.spotifyId);
      merged.push(track);
    }

    // Shuffle so results aren't grouped strictly by seed artist
    for (let i = merged.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [merged[i], merged[j]] = [merged[j], merged[i]];
    }

    const tracks = merged.slice(0, MAX_RECOMMENDED);
    cache.set(key, tracks, RECS_CACHE_TTL);
    res.json({ tracks, fromCache: false });
  } catch (err) {
    console.error('[Explore] Recommendations error:', err.message);
    res.status(500).json({ error: 'Failed to fetch recommendations.' });
  }
};

/**
 * GET /api/explore/trending
 * Real YouTube "most popular" videos in the Music category.
 */
const getTrending = async (req, res) => {
  try {
    const items = await getTrendingMusicVideos(12);

    const videos = items.map((item) => ({
      videoId:      item.id,
      title:        item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail:
        item.snippet.thumbnails?.medium?.url ??
        item.snippet.thumbnails?.default?.url ??
        null,
      viewCount: item.statistics?.viewCount ? Number(item.statistics.viewCount) : null,
    }));

    res.json({ videos });
  } catch (err) {
    console.error('[Explore] Trending error:', err.message);
    res.status(500).json({ error: 'Failed to fetch trending videos.' });
  }
};

module.exports = { getSpotifyPlaylists, getRecommendations, getTrending };
