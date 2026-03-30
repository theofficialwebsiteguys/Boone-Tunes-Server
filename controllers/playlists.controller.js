/**
 * Playlists Controller
 *
 * GET /api/playlists → syncs the user's Spotify playlists to the DB,
 *                      then returns the stored metadata.
 *
 * Compliance: only playlist metadata is stored (name, track count, image URL).
 * No track-level data, no audio content.
 */

const { Playlist } = require('../models');
const { getUserPlaylists, getPlaylistTracks, getLikedTracks } = require('../services/spotify-auth.service');

// Virtual playlist ID used to represent the user's liked songs
const LIKED_SONGS_ID = 'liked-songs';
const cache = require('../utils/cache');

// Track cache TTL — 5 minutes. Data is never written to the DB.
const TRACK_CACHE_TTL = 5 * 60 * 1000;
const trackCacheKey = (userId, playlistId) => `tracks:${userId}:${playlistId}`;

/**
 * GET /api/playlists
 * Fetches the authenticated user's playlists from Spotify, upserts them
 * into the local DB, and returns the full list.
 *
 * Requires: requireAuth middleware (sets req.user)
 *           requireSpotifyToken middleware (sets req.spotifyToken)
 */
const syncAndGetPlaylists = async (req, res) => {
  try {
    const spotifyPlaylists = await getUserPlaylists(req.spotifyToken);

    // Upsert each playlist — updates existing records, inserts new ones
    await Promise.all(
      spotifyPlaylists.map((pl) =>
        Playlist.upsert({
          userId: req.user.id,
          spotifyPlaylistId: pl.id,
          name: pl.name,
          description: pl.description || null,
          trackCount: pl.tracks?.total ?? 0,
          imageUrl: pl.images?.[0]?.url || null,
          isPublic: pl.public ?? false,
          snapshotId: pl.snapshot_id || null,
        })
      )
    );

    // Return the full stored list sorted alphabetically
    const playlists = await Playlist.findAll({
      where: { userId: req.user.id },
      attributes: [
        'id',
        'spotifyPlaylistId',
        'name',
        'description',
        'trackCount',
        'imageUrl',
        'isPublic',
        'snapshotId',
      ],
      order: [['name', 'ASC']],
    });

    // Prepend a virtual "Liked Songs" entry — not stored in DB, injected at response time
    const likedSongs = {
      id: null,
      spotifyPlaylistId: LIKED_SONGS_ID,
      name: 'Liked Songs',
      description: null,
      trackCount: null,
      imageUrl: null,
      isPublic: false,
      snapshotId: null,
    };

    res.json({ playlists: [likedSongs, ...playlists] });
  } catch (err) {
    console.error('[Playlists] Sync error:', err.message);
    res.status(500).json({ error: 'Failed to fetch playlists.' });
  }
};

/**
 * GET /api/playlists/:spotifyPlaylistId/tracks
 *
 * Returns the tracks for a given playlist.
 * Results are served from a 5-minute in-memory cache to reduce Spotify API calls.
 *
 * Compliance:
 *   - Track data is NOT stored in the database.
 *   - albumArtUrl is a Spotify CDN reference — the frontend loads the image
 *     directly from Spotify's servers; we never copy or proxy it.
 *   - Cache is in-memory only and expires after 5 minutes.
 */
const getTracksForPlaylist = async (req, res) => {
  const { spotifyPlaylistId } = req.params;
  const key = trackCacheKey(req.user.id, spotifyPlaylistId);

  const cached = cache.get(key);
  if (cached) {
    return res.json({ tracks: cached, fromCache: true });
  }

  try {
    const tracks = spotifyPlaylistId === LIKED_SONGS_ID
      ? await getLikedTracks(req.spotifyToken)
      : await getPlaylistTracks(req.spotifyToken, spotifyPlaylistId);

    cache.set(key, tracks, TRACK_CACHE_TTL);
    res.json({ tracks, fromCache: false });
  } catch (err) {
    console.error('[Playlists] Track fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch tracks.' });
  }
};

module.exports = { syncAndGetPlaylists, getTracksForPlaylist };
