/**
 * Spotify Service — Client Credentials Flow
 *
 * Compliance notes (Spotify Developer Policy):
 * - No Spotify content or metadata is permanently stored.
 * - User disconnect support will be added when user-level OAuth is implemented.
 * - Spotify data is NOT used for targeted advertising or user profiling.
 * - Access tokens are held in memory only and discarded on server restart.
 */

const axios = require('axios');

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// In-memory token cache — not persisted to disk or database
let tokenCache = {
  accessToken: null,
  expiresAt: null,
};

/**
 * Returns a valid Spotify access token.
 * Uses cached token if still valid; otherwise fetches a new one.
 */
const getAccessToken = async () => {
  const now = Date.now();

  if (tokenCache.accessToken && tokenCache.expiresAt && now < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await axios.post(
    SPOTIFY_TOKEN_URL,
    new URLSearchParams({ grant_type: 'client_credentials' }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const { access_token, expires_in } = response.data;

  // Cache token with a 60-second buffer before actual expiration
  tokenCache = {
    accessToken: access_token,
    expiresAt: now + (expires_in - 60) * 1000,
  };

  console.log('[Spotify] Access token refreshed successfully.');
  return access_token;
};

/**
 * Search Spotify tracks by query string.
 * Returns the raw Spotify tracks response — caller decides what to forward.
 * Data is NOT stored.
 *
 * @param {string} query - Search term (e.g. "Fleetwood Mac")
 * @param {number} limit - Max results (default 5)
 */
const searchTracks = async (query = 'test', limit = 5) => {
  const token = await getAccessToken();

  const response = await axios.get(`${SPOTIFY_API_BASE}/search`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { q: query, type: 'track', limit },
  });

  // Return only the tracks portion — minimal surface area
  return response.data.tracks;
};

/**
 * Fetches metadata for a public playlist (name, description, image, track count)
 * using the client-credentials token.
 *
 * NOTE: this only works for regular user/curator-owned public playlists.
 * Playlists owned by Spotify's own editorial account (Today's Top Hits,
 * RapCaviar, etc.) return 404 via client-credentials — confirmed empirically,
 * Spotify has locked those out of the Web API even though the generic
 * `GET /playlists/{id}` endpoint itself is not deprecated. Use
 * `searchPlaylists` to discover a real, fetchable playlist instead of
 * hardcoding an editorial playlist ID.
 *
 * @param {string} playlistId - Spotify playlist ID
 */
const getPlaylistMeta = async (playlistId) => {
  const token = await getAccessToken();

  const response = await axios.get(`${SPOTIFY_API_BASE}/playlists/${playlistId}`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { fields: 'id,name,description,images,tracks.total' },
  });

  return normalizePlaylistMeta(response.data);
};

/**
 * Searches Spotify for playlists matching a query and returns the top match's
 * metadata. Used to surface real, currently-fetchable playlists (e.g. a
 * "Top Hits 2026" playlist from an active curator) since Spotify's own
 * editorial playlists are no longer reachable via client-credentials.
 *
 * @param {string} query
 */
const searchPlaylists = async (query, limit = 1) => {
  const token = await getAccessToken();

  const response = await axios.get(`${SPOTIFY_API_BASE}/search`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { q: query, type: 'playlist', limit },
  });

  const items = (response.data.playlists?.items ?? []).filter(Boolean);
  return items.map(normalizePlaylistMeta);
};

const normalizePlaylistMeta = (data) => ({
  id: data.id,
  name: data.name,
  description: data.description || null,
  imageUrl: data.images?.[0]?.url ?? null,
  trackCount: data.tracks?.total ?? 0,
});

module.exports = { getAccessToken, searchTracks, getPlaylistMeta, searchPlaylists };
