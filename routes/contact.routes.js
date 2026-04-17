const express = require('express');
const router  = express.Router();
const { submit } = require('../controllers/contact.controller');
const { contactLimiter } = require('../middleware/rateLimiter');

// POST /api/contact  — public, no auth required
router.post('/', contactLimiter, submit);

module.exports = router;
