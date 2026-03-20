const { searchTracks } = require('../services/spotify.service');
const { searchVideos } = require('../services/youtube.service');

/**
 * GET /api/integrations/spotify/test
 * Verifies Spotify Client Credentials flow and returns a sample track search.
 */
const spotifyTest = async (req, res) => {
  const query = req.query.q || 'Fleetwood Mac';

  try {
    const tracks = await searchTracks(query, 5);
    console.log(`[Spotify] Test search for "${query}" succeeded — ${tracks.items.length} results.`);

    res.json({
      success: true,
      query,
      total: tracks.total,
      results: tracks.items.map((track) => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        album: track.album.name,
        previewUrl: track.preview_url,
        spotifyUrl: track.external_urls.spotify,
      })),
    });
  } catch (err) {
    console.error('[Spotify] Test request failed:', err.message);
    res.status(502).json({
      success: false,
      error: 'Spotify API request failed',
      detail: err.response?.data || err.message,
    });
  }
};

/**
 * GET /api/integrations/youtube/test
 * Verifies YouTube Data API v3 connection and returns a sample video search.
 */
const youtubeTest = async (req, res) => {
  const query = req.query.q || 'Boone Tunes live music';

  try {
    const items = await searchVideos(query, 5);
    console.log(`[YouTube] Test search for "${query}" succeeded — ${items.length} results.`);

    res.json({
      success: true,
      query,
      results: items.map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails?.medium?.url,
      })),
    });
  } catch (err) {
    console.error('[YouTube] Test request failed:', err.message);
    res.status(502).json({
      success: false,
      error: 'YouTube API request failed',
      detail: err.response?.data || err.message,
    });
  }
};

module.exports = { spotifyTest, youtubeTest };
