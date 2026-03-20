const jwt = require('jsonwebtoken');

/**
 * Verifies the JWT access token on incoming requests.
 * Attach as middleware to any route that requires authentication.
 *
 * Expects header:  Authorization: Bearer <token>
 * On success, sets req.user = { id, email }
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Access token expired.'
      : 'Invalid access token.';
    return res.status(401).json({ error: message });
  }
};

module.exports = { requireAuth };
