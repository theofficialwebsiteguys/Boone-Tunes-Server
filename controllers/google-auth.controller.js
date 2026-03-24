/**
 * Google OAuth Controller
 *
 * Google is an optional alternative login method.
 * It does NOT create a standalone account — it either:
 *   1. Logs in an existing user (matched by googleId or email), or
 *   2. Creates a new user record (but Spotify must be connected to use the platform).
 *
 * GET  /api/auth/google          → redirects user to Google login
 * GET  /api/auth/google/callback → handles Google redirect, issues app JWT
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');
const googleAuth = require('../services/google-auth.service');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

const issueAppTokens = (user) => {
  const payload = { sub: user.id, email: user.email };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
  return { accessToken, refreshToken };
};

const generateState = () =>
  jwt.sign({ nonce: crypto.randomBytes(16).toString('hex') }, process.env.JWT_SECRET, {
    expiresIn: '10m',
  });

const verifyState = (state) => {
  try {
    jwt.verify(state, process.env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
};

/**
 * GET /api/auth/google
 * Redirects the browser to the Google authorization page.
 */
const initiateGoogleLogin = (req, res) => {
  const state = generateState();
  const url = googleAuth.getAuthorizationUrl(state);
  res.redirect(url);
};

/**
 * GET /api/auth/google/callback
 * Google redirects here after the user grants (or denies) access.
 */
const googleCallback = async (req, res) => {
  const { code, state, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const callbackBase = `${frontendUrl}/auth/callback`;

  if (error) {
    return res.redirect(`${callbackBase}?error=${encodeURIComponent(error)}`);
  }

  if (!state || !verifyState(state)) {
    return res.redirect(`${callbackBase}?error=invalid_state`);
  }

  if (!code) {
    return res.redirect(`${callbackBase}?error=missing_code`);
  }

  try {
    const googleTokens = await googleAuth.exchangeCodeForTokens(code);
    const profile = await googleAuth.getGoogleProfile(googleTokens.access_token);

    // profile.sub is the stable Google user ID
    let user = await User.findOne({ where: { googleId: profile.sub } });

    if (!user && profile.email) {
      // Match by email — links the Google ID to an existing account
      user = await User.findOne({ where: { email: profile.email } });
    }

    if (user) {
      // Link Google ID if not already set
      if (!user.googleId) {
        await user.update({ googleId: profile.sub });
      }
    } else {
      // New user via Google — account created but Spotify is required to use features
      user = await User.create({
        email: profile.email,
        googleId: profile.sub,
        displayName: profile.name || null,
      });
    }

    const { accessToken, refreshToken } = issueAppTokens(user);

    return res.redirect(
      `${callbackBase}?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`
    );
  } catch (err) {
    console.error('[Google Auth] Callback error:', err.message);
    return res.redirect(`${callbackBase}?error=auth_failed`);
  }
};

module.exports = { initiateGoogleLogin, googleCallback };
