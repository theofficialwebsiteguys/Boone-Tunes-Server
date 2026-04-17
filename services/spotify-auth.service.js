/**
 * Spotify Auth Service — Authorization Code Flow
 *
 * Handles user-level OAuth: account login, token exchange, profile fetch,
 * token refresh, and playlist retrieval.
 *
 * Compliance notes (Spotify Developer Policy):
 * - Only email, display_name, and Spotify ID are stored from the user profile.
 * - Access/refresh tokens are stored solely to make API calls on the user's behalf.
 * - Playlist metadata only (no track audio, no content caching).
 * - Tokens are invalidated from our DB when the user disconnects Spotify.
 */

const axios = require('axios');

const SPOTIFY_ACCOUNTS_URL = 'https://accounts.spotify.com';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Scopes required for this platform
const SCOPES = [
  'user-read-email',
  'user-read-private',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
].join(' ');

/**
 * Returns the Spotify authorization URL to redirect the user to.
 * @param {string} state - CSRF state token
 */
const getAuthorizationUrl = (state) => {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    scope: SCOPES,
    state,
    // Always show the Spotify login dialog so users can switch accounts
    show_dialog: 'true',
  });
  return `${SPOTIFY_ACCOUNTS_URL}/authorize?${params}`;
};

/**
 * Exchanges an authorization code for Spotify access + refresh tokens.
 * @param {string} code - Authorization code from Spotify callback
 * @returns {{ access_token, refresh_token, expires_in, scope }}
 */
const exchangeCodeForTokens = async (code) => {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const response = await axios.post(
    `${SPOTIFY_ACCOUNTS_URL}/api/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data;
};

/**
 * Refreshes an expired Spotify access token using the stored refresh token.
 * @param {string} refreshToken - The user's stored Spotify refresh token
 * @returns {{ access_token, expires_in, refresh_token? }}
 */
const refreshAccessToken = async (refreshToken) => {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const response = await axios.post(
    `${SPOTIFY_ACCOUNTS_URL}/api/token`,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data;
};

/**
 * Fetches the authenticated user's Spotify profile.
 * Only id, email, and display_name are used — nothing else is stored.
 * @param {string} accessToken
 */
const getSpotifyProfile = async (accessToken) => {
  const response = await axios.get(`${SPOTIFY_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
};

/**
 * Fetches all of the user's Spotify playlists (metadata only).
 * Handles pagination to retrieve up to 200 playlists.
 * @param {string} accessToken
 */
const getUserPlaylists = async (accessToken) => {
  const playlists = [];
  let url = `${SPOTIFY_API_BASE}/me/playlists`;
  const params = { limit: 50 };

  while (url) {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
    });

    playlists.push(...response.data.items);

    // Spotify returns null when there are no more pages
    url = response.data.next || null;
    // After first request, params are baked into the next URL
    delete params.limit;
  }

  return playlists;
};

/**
 * Fetches all tracks for a given playlist.
 * Handles pagination (Spotify returns max 100 per page).
 *
 * Compliance: track data is NOT stored in the DB.
 *   - albumArtUrl is a reference to Spotify's CDN — the image is never copied.
 *   - Callers are expected to cache this data short-term (in-memory only).
 *   - Only the fields needed for YouTube search + display are returned.
 *
 * @param {string} accessToken
 * @param {string} playlistId
 * @returns {Array} Normalised track objects
 */
const getPlaylistTracks = async (accessToken, playlistId) => {
  const tracks = [];
  let url = `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`;
  const params = {
    limit: 100,
    fields: 'next,items(track(id,name,duration_ms,uri,artists(name),album(name,images)))',
  };

  while (url) {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
    });

    const items = response.data.items ?? [];

    for (const item of items) {
      const track = item?.track;
      // Skip null tracks (e.g. local files, deleted tracks)
      if (!track?.id) continue;

      tracks.push({
        spotifyId:   track.id,
        name:        track.name,
        artists:     track.artists.map((a) => a.name),
        albumName:   track.album?.name ?? null,
        // URL points directly to Spotify's CDN — never downloaded or stored
        albumArtUrl: track.album?.images?.[0]?.url ?? null,
        durationMs:  track.duration_ms,
        spotifyUri:  track.uri,
      });
    }

    url = response.data.next || null;
    // After the first request, pagination params are embedded in next URL
    delete params.limit;
    delete params.fields;
  }

  return tracks;
};

/**
 * Fetches all of the user's liked/saved tracks.
 * Handles pagination (max 50 per page).
 *
 * Returns tracks in the same normalised shape as getPlaylistTracks.
 * Compliance: not stored in DB, callers should cache short-term in memory only.
 *
 * Requires scope: user-library-read
 * @param {string} accessToken
 */
const getLikedTracks = async (accessToken) => {
  const tracks = [];
  let url = `${SPOTIFY_API_BASE}/me/tracks`;
  const params = { limit: 50 };

  while (url) {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
    });

    const items = response.data.items ?? [];

    for (const item of items) {
      const track = item?.track;
      if (!track?.id) continue;

      tracks.push({
        spotifyId:   track.id,
        name:        track.name,
        artists:     track.artists.map((a) => a.name),
        albumName:   track.album?.name ?? null,
        albumArtUrl: track.album?.images?.[0]?.url ?? null,
        durationMs:  track.duration_ms,
        spotifyUri:  track.uri,
      });
    }

    url = response.data.next || null;
    delete params.limit;
  }

  return tracks;
};

/**
 * Searches Spotify for tracks matching a query string.
 * Supports natural language queries like "Bohemian Rhapsody Queen" or just an artist name.
 *
 * Returns tracks in the same normalised shape as getPlaylistTracks so the
 * frontend can use a single TrackList component for both playlists and search.
 *
 * Compliance: results are not stored. Callers should cache short-term in memory only.
 *
 * @param {string} accessToken
 * @param {string} query
 * @param {number} limit - max 50
 */
const searchTracks = async (accessToken, query, limit = 20) => {
  const response = await axios.get(`${SPOTIFY_API_BASE}/search`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      q: query,
      type: 'track',
      limit: Math.min(limit, 50),
    },
  });

  const items = response.data.tracks?.items ?? [];

  return items
    .filter((track) => track?.id)
    .map((track) => ({
      spotifyId:   track.id,
      name:        track.name,
      artists:     track.artists.map((a) => a.name),
      albumName:   track.album?.name ?? null,
      albumArtUrl: track.album?.images?.[0]?.url ?? null,
      durationMs:  track.duration_ms,
      spotifyUri:  track.uri,
    }));
};

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getSpotifyProfile,
  getUserPlaylists,
  getPlaylistTracks,
  getLikedTracks,
  searchTracks,
};
