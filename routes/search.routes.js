const express = require('express');
const router = express.Router();
const { search } = require('../controllers/search.controller');
const { requireSpotifyToken } = require('../middleware/spotifyToken');

// GET /api/search?q=<query>&limit=<number>
// requireAuth applied at router level in routes/index.js
router.get('/', requireSpotifyToken, search);

module.exports = router;
