const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

const authRoutes = require('./auth.routes');
const contactRoutes = require('./contact.routes');
const userRoutes = require('./userRoutes');
const integrationRoutes = require('./integrations.routes');
const playlistRoutes = require('./playlists.routes');
const searchRoutes = require('./search.routes');
const youtubeRoutes = require('./youtube.routes');

// Public
router.use('/auth',    authRoutes);
router.use('/contact', contactRoutes);

// Protected — requireAuth applied at the router level
router.use('/users',        requireAuth, userRoutes);
router.use('/integrations', requireAuth, integrationRoutes);
router.use('/playlists',    requireAuth, playlistRoutes);
router.use('/search',       requireAuth, searchRoutes);
router.use('/youtube',      requireAuth, youtubeRoutes);

module.exports = router;
