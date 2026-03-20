const express = require('express');
const router = express.Router();
const { spotifyTest, youtubeTest } = require('../controllers/integrations.controller');

// GET /api/integrations/spotify/test?q=<optional search term>
router.get('/spotify/test', spotifyTest);

// GET /api/integrations/youtube/test?q=<optional search term>
router.get('/youtube/test', youtubeTest);

module.exports = router;
