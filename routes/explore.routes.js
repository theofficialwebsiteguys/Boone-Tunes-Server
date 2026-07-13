const express = require('express');
const router = express.Router();
const { getSpotifyPlaylists, getRecommendations, getTrending } = require('../controllers/explore.controller');
const { requireSpotifyToken } = require('../middleware/spotifyToken');

// requireAuth is applied at the router level in routes/index.js

// GET /api/explore/spotify-playlists — client-credentials only, no user token needed
router.get('/spotify-playlists', getSpotifyPlaylists);

// GET /api/explore/recommendations?seedArtists=A,B,C — needs the user's Spotify token
router.get('/recommendations', requireSpotifyToken, getRecommendations);

// GET /api/explore/trending — YouTube only
router.get('/trending', getTrending);

module.exports = router;
