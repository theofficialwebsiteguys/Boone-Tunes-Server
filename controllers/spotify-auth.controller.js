/**
 * Spotify OAuth Controller — Authorization Code Flow
 *
 * GET  /api/auth/spotify          → redirects user to Spotify login
 * GET  /api/auth/spotify/callback → handles Spotify redirect, creates/updates
 *                                   user, issues app JWT, redirects to frontend
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');
const spotifyAuth = require('../services/spotify-auth.service');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

const issueAppTokens = (user) => {
  const payload = { sub: user.id, email: user.email };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
  return { accessToken, refreshToken };
};

// State is a short-lived JWT — no server-side storage needed
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
 * GET /api/auth/spotify
 * Redirects the browser to the Spotify authorization page.
 */
const initiateSpotifyLogin = (req, res) => {
  const state = generateState();
  const url = spotifyAuth.getAuthorizationUrl(state);
  res.redirect(url);
};

/**
 * GET /api/auth/spotify/callback
 * Spotify redirects here after the user grants (or denies) access.
 *
 * On success: upserts the user, issues app JWTs, redirects to frontend.
 * On failure: redirects to frontend with an error param.
 */
const spotifyCallback = async (req, res) => {
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
    // Exchange code → Spotify tokens
    const spotifyTokens = await spotifyAuth.exchangeCodeForTokens(code);
    const profile = await spotifyAuth.getSpotifyProfile(spotifyTokens.access_token);

    const spotifyTokenExpiresAt = new Date(Date.now() + spotifyTokens.expires_in * 1000);

    // Try to find existing user by Spotify ID first, then fall back to email
    let user = await User.findOne({ where: { spotifyId: profile.id } });

    if (!user && profile.email) {
      user = await User.findOne({ where: { email: profile.email } });
    }

    if (user) {
      // Update Spotify credentials — tokens rotate, always keep fresh ones
      await user.update({
        spotifyId: profile.id,
        spotifyAccessToken: spotifyTokens.access_token,
        // Spotify only returns a new refresh_token on first auth; keep existing if not provided
        ...(spotifyTokens.refresh_token && { spotifyRefreshToken: spotifyTokens.refresh_token }),
        spotifyTokenExpiresAt,
        displayName: profile.display_name || user.displayName,
      });
    } else {
      // First time — create the account
      user = await User.create({
        email: profile.email,
        spotifyId: profile.id,
        spotifyAccessToken: spotifyTokens.access_token,
        spotifyRefreshToken: spotifyTokens.refresh_token,
        spotifyTokenExpiresAt,
        displayName: profile.display_name || null,
      });
    }

    const { accessToken, refreshToken } = issueAppTokens(user);

    // Redirect to frontend with tokens — the frontend should immediately
    // extract and store these, then navigate away to clear the URL
    return res.redirect(
      `${callbackBase}?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`
    );
  } catch (err) {
    console.error('[Spotify Auth] Callback error:', err.message);
    return res.redirect(`${callbackBase}?error=auth_failed`);
  }
};

module.exports = { initiateSpotifyLogin, spotifyCallback };
