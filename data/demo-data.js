/**
 * Demo mode data — returned by playlist endpoints when DEMO_MODE=true.
 *
 * Track names and artists are chosen to exactly match the seeded YouTube cache
 * entries in data/youtube-cache.json so every video lookup is a cache hit
 * and costs zero API quota during demos.
 *
 * Cache key format (youtube.service.js): `${artist} ${track} official music video|5`
 */

const fs   = require('fs');
const path = require('path');

let ytCache = {};
try {
  const cacheFile = path.join(__dirname, 'youtube-cache.json');
  if (fs.existsSync(cacheFile)) ytCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
} catch {}

function thumb(artist, track) {
  const key   = `${artist} ${track} official music video|5`;
  const entry = ytCache[key];
  return entry?.items?.[0]?.snippet?.thumbnails?.high?.url ?? null;
}

const t = (id, name, artists, albumName, durationMs) => ({
  spotifyId:   `demo_${id}`,
  name,
  artists,
  albumName,
  albumArtUrl: thumb(artists[0], name),
  durationMs,
  spotifyUri:  `spotify:track:demo_${id}`,
});

// ── Tracks ────────────────────────────────────────────────────────────────────

const POP = [
  t('ts1',  'Anti-Hero',         ['Taylor Swift'],  'Midnights',                    200690),
  t('ts2',  'Shake It Off',      ['Taylor Swift'],  '1989',                         219200),
  t('ts3',  'Love Story',        ['Taylor Swift'],  'Fearless',                     235266),
  t('dl1',  'Levitating',        ['Dua Lipa'],      'Future Nostalgia',             203064),
  t('dl2',  "Don't Start Now",   ['Dua Lipa'],      'Future Nostalgia',             183290),
  t('be1',  'bad guy',           ['Billie Eilish'], 'WHEN WE ALL FALL ASLEEP...',   194090),
  t('be2',  'Happier Than Ever', ['Billie Eilish'], 'Happier Than Ever',            298848),
  t('or1',  'good 4 u',         ['Olivia Rodrigo'],'SOUR',                         178147),
  t('or2',  'drivers license',   ['Olivia Rodrigo'],'SOUR',                        242334),
  t('ag1',  '7 rings',           ['Ariana Grande'], 'thank u, next',               178640),
  t('pm1',  'Circles',           ['Post Malone'],   "Hollywood's Bleeding",        214290),
  t('hs1',  'As It Was',         ['Harry Styles'],  "Harry's House",               167303),
];

const RAP = [
  t('tw1',  'Blinding Lights',   ['The Weeknd'],    'After Hours',                 200040),
  t('tw2',  'Save Your Tears',   ['The Weeknd'],    'After Hours',                 215626),
  t('tw3',  'Starboy',           ['The Weeknd'],    'Starboy',                     230453),
  t('dr1',  "God's Plan",        ['Drake'],         'Scorpion',                    198901),
  t('dr2',  'One Dance',         ['Drake'],         'Views',                       173987),
  t('kl1',  'HUMBLE.',           ['Kendrick Lamar'],'DAMN.',                       177000),
  t('kl2',  'Not Like Us',       ['Kendrick Lamar'],'GNX',                        274000),
  t('sz1',  'Kill Bill',         ['SZA'],           'SOS',                         153947),
  t('sz2',  'Good Days',         ['SZA'],           'Good Days',                   279950),
  t('tc1',  'See You Again',     ['Tyler the Creator'], 'FLOWER BOY',             210546),
  t('fo1',  'Chanel',            ['Frank Ocean'],   'Blonde',                      219000),
];

const INDIE = [
  t('am1',  'Do I Wanna Know?',  ['Arctic Monkeys'], 'AM',                        272394),
  t('am2',  'R U Mine?',         ['Arctic Monkeys'], 'AM',                        201975),
  t('rh1',  'Creep',             ['Radiohead'],      'Pablo Honey',               238640),
  t('st1',  'Last Nite',         ['The Strokes'],    'Is This It',                193813),
  t('ti1',  'The Less I Know The Better', ['Tame Impala'], 'Currents',            216640),
  t('ti2',  'Let It Happen',     ['Tame Impala'],    'Currents',                  467626),
];

const ELECTRONIC = [
  t('dp1',  'Get Lucky',         ['Daft Punk'],     'Random Access Memories',     369626),
  t('dp2',  'One More Time',     ['Daft Punk'],     'Discovery',                  320415),
  t('ch1',  'Summer',            ['Calvin Harris'], 'Motion',                     223626),
];

const LIKED = [...POP.slice(0, 5), ...RAP.slice(0, 5), ...INDIE.slice(0, 3), ...ELECTRONIC];

// ── Playlists ─────────────────────────────────────────────────────────────────

const PLAYLISTS = [
  {
    id:                null,
    spotifyPlaylistId: 'demo-pop-hits',
    name:              'Pop Hits',
    description:       'The biggest pop songs right now',
    trackCount:        POP.length,
    imageUrl:          null,
    isPublic:          true,
    snapshotId:        'demo',
  },
  {
    id:                null,
    spotifyPlaylistId: 'demo-rap-rnb',
    name:              'Rap & R&B',
    description:       'Top hip-hop and R&B tracks',
    trackCount:        RAP.length,
    imageUrl:          null,
    isPublic:          true,
    snapshotId:        'demo',
  },
  {
    id:                null,
    spotifyPlaylistId: 'demo-indie-rock',
    name:              'Indie & Rock',
    description:       'Indie and alternative favorites',
    trackCount:        INDIE.length,
    imageUrl:          null,
    isPublic:          true,
    snapshotId:        'demo',
  },
  {
    id:                null,
    spotifyPlaylistId: 'demo-electronic',
    name:              'Electronic Vibes',
    description:       'Electronic and dance music',
    trackCount:        ELECTRONIC.length,
    imageUrl:          null,
    isPublic:          true,
    snapshotId:        'demo',
  },
];

const TRACKS = {
  'demo-pop-hits':    POP,
  'demo-rap-rnb':     RAP,
  'demo-indie-rock':  INDIE,
  'demo-electronic':  ELECTRONIC,
  'liked-songs':      LIKED,
};

module.exports = { playlists: PLAYLISTS, tracks: TRACKS };
