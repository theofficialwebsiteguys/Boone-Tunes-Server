const express = require('express');
const router  = express.Router();
const { searchForTrack, directSearch } = require('../controllers/youtube.controller');

// GET /api/youtube/search?track=&artist=&maxResults=
router.get('/search', searchForTrack);

// GET /api/youtube/direct-search?q=&maxResults=
router.get('/direct-search', directSearch);

module.exports = router;
