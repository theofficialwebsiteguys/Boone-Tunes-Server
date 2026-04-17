const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const cache = require('../utils/cache');

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

const issueTokens = (user) => {
  const payload = { sub: user.id, email: user.email };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  });

  return { accessToken, refreshToken };
};

/**
 * POST /api/auth/register
 * Body: { email, password }
 */
const register = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      // Intentionally vague to avoid user enumeration
      return res.status(409).json({ error: 'Registration failed. Please try a different email.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ email, passwordHash });

    const { accessToken, refreshToken } = issueTokens(user);

    res.status(201).json({ accessToken, refreshToken });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ error: 'Registration failed.' });
  }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ where: { email } });

    // Always run bcrypt compare to prevent timing attacks
    const hash = user ? user.passwordHash : '$2a$12$invalidhashplaceholderXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const { accessToken, refreshToken } = issueTokens(user);

    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ error: 'Login failed.' });
  }
};

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 * Issues a new access token using a valid refresh token.
 */
const refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findByPk(payload.sub);

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    res.json({ accessToken });
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Refresh token expired. Please log in again.'
      : 'Invalid refresh token.';
    res.status(401).json({ error: message });
  }
};

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile. Requires requireAuth middleware.
 */
const me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'displayName', 'createdAt'],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json(user);
  } catch (err) {
    console.error('[Auth] Me error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
};

/**
 * POST /api/auth/logout
 * Clears all server-side cached track data for the user.
 * JWT tokens are stateless — invalidation is handled client-side by deleting stored tokens.
 */
const logout = (req, res) => {
  cache.deleteByPrefix(`tracks:${req.user.id}:`);
  res.json({ message: 'Logged out.' });
};

module.exports = { register, login, refresh, me, logout };
