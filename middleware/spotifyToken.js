/**
 * requireSpotifyToken middleware
 *
 * Ensures the authenticated user has a connected Spotify account and a valid
 * access token. Automatically refreshes the token if it's expired.
 *
 * Must be used AFTER requireAuth (which sets req.user).
 * On success, sets req.spotifyToken with a valid Spotify access token.
 */

const { User } = require('../models');
const { refreshAccessToken } = require('../services/spotify-auth.service');

const requireSpotifyToken = async (req, res, next) => {
  const user = await User.findByPk(req.user.id);

  if (!user || !user.spotifyId) {
    return res.status(403).json({
      error: 'Spotify account not connected. Please log in with Spotify.',
    });
  }

  const now = new Date();
  const expiresAt = new Date(user.spotifyTokenExpiresAt);
  // Refresh 60 seconds before actual expiry
  const needsRefresh = now >= new Date(expiresAt.getTime() - 60_000);

  if (needsRefresh) {
    try {
      const newTokens = await refreshAccessToken(user.spotifyRefreshToken);

      await user.update({
        spotifyAccessToken: newTokens.access_token,
        spotifyTokenExpiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
        // Spotify may issue a new refresh token — keep it if provided
        ...(newTokens.refresh_token && { spotifyRefreshToken: newTokens.refresh_token }),
      });

      req.spotifyToken = newTokens.access_token;
    } catch (err) {
      console.error('[SpotifyToken] Refresh failed:', err.message);
      return res.status(401).json({
        error: 'Spotify session expired. Please reconnect your Spotify account.',
      });
    }
  } else {
    req.spotifyToken = user.spotifyAccessToken;
  }

  next();
};

module.exports = { requireSpotifyToken };
