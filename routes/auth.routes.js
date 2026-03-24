const express = require('express');
const router = express.Router();
const { register, login, refresh, me } = require('../controllers/auth.controller');
const { initiateSpotifyLogin, spotifyCallback } = require('../controllers/spotify-auth.controller');
const { initiateGoogleLogin, googleCallback } = require('../controllers/google-auth.controller');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// ── Email / Password ──────────────────────────────────────────────────────────
router.post('/register', authLimiter, register);
router.post('/login',    authLimiter, login);
router.post('/refresh',  authLimiter, refresh);

// ── Spotify OAuth (primary login method) ─────────────────────────────────────
// Browser navigates to this — initiates the OAuth redirect
router.get('/spotify',          initiateSpotifyLogin);
// Spotify redirects back here after user grants access
router.get('/spotify/callback', spotifyCallback);

// ── Google OAuth (optional alternative login) ─────────────────────────────────
router.get('/google',          initiateGoogleLogin);
router.get('/google/callback', googleCallback);

// ── Protected ─────────────────────────────────────────────────────────────────
router.get('/me', requireAuth, me);

module.exports = router;
