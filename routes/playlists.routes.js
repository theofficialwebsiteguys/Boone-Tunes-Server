const express = require('express');
const router = express.Router();
const { syncAndGetPlaylists, getTracksForPlaylist } = require('../controllers/playlists.controller');
const { requireSpotifyToken } = require('../middleware/spotifyToken');

// requireAuth is applied at the router level in routes/index.js
// requireSpotifyToken ensures a valid, refreshed Spotify token is on req.spotifyToken

// GET /api/playlists
router.get('/', requireSpotifyToken, syncAndGetPlaylists);

// GET /api/playlists/:spotifyPlaylistId/tracks
router.get('/:spotifyPlaylistId/tracks', requireSpotifyToken, getTracksForPlaylist);

module.exports = router;
