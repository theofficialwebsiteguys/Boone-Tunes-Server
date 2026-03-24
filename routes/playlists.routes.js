const express = require('express');
const router = express.Router();
const { syncAndGetPlaylists } = require('../controllers/playlists.controller');
const { requireSpotifyToken } = require('../middleware/spotifyToken');

// GET /api/playlists
// Syncs playlists from Spotify and returns the stored metadata.
// requireAuth is applied at the router level in routes/index.js
// requireSpotifyToken ensures a valid Spotify token is available
router.get('/', requireSpotifyToken, syncAndGetPlaylists);

module.exports = router;
