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
const { getUserPlaylists } = require('../services/spotify-auth.service');

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

    res.json({ playlists });
  } catch (err) {
    console.error('[Playlists] Sync error:', err.message);
    res.status(500).json({ error: 'Failed to fetch playlists.' });
  }
};

module.exports = { syncAndGetPlaylists };
