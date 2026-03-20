const express = require('express');
const router = express.Router();
const { register, login, refresh, me } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Public — rate limited
router.post('/register', authLimiter, register);
router.post('/login',    authLimiter, login);
router.post('/refresh',  authLimiter, refresh);

// Protected
router.get('/me', requireAuth, me);

module.exports = router;
