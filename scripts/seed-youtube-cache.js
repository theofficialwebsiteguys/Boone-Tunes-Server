/**
 * YouTube Cache Seed Script
 *
 * Populates data/youtube-cache.json with results for common searches so that
 * the test/demo site never needs to hit the YouTube API during client testing
 * or screen recordings.
 *
 * Usage:
 *   node scripts/seed-youtube-cache.js
 *
 * Cost: ~100 units × number of SEARCHES below (~3,000 units total).
 * Run once, commit the output file, and you're done.
 *
 * The server loads this file automatically on startup — no code changes needed.
 */

require('dotenv').config();

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const API_KEY   = process.env.YOUTUBE_API_KEY;
const OUT_FILE  = path.join(__dirname, '../data/youtube-cache.json');
const API_BASE  = 'https://www.googleapis.com/youtube/v3';
const MAX_RESULTS = 5;

if (!API_KEY) {
  console.error('❌  YOUTUBE_API_KEY not found in .env');
  process.exit(1);
}

// ── Searches to seed ───────────────────────────────────────────────────────
// Format: { type: 'track', track, artist }  → "artist track official music video"
//         { type: 'direct', q }             → raw query (for mood/genre searches)
//
// Add anything you plan to demo — every entry here = zero API cost during testing.

const SEARCHES = [
  // ── Pop ──────────────────────────────────────────────────────────────────
  { type: 'track', artist: 'The Weeknd',      track: 'Blinding Lights'       },
  { type: 'track', artist: 'The Weeknd',      track: 'Save Your Tears'       },
  { type: 'track', artist: 'The Weeknd',      track: 'Starboy'               },
  { type: 'track', artist: 'Taylor Swift',    track: 'Anti-Hero'             },
  { type: 'track', artist: 'Taylor Swift',    track: 'Shake It Off'          },
  { type: 'track', artist: 'Taylor Swift',    track: 'Love Story'            },
  { type: 'track', artist: 'Dua Lipa',        track: 'Levitating'            },
  { type: 'track', artist: 'Dua Lipa',        track: 'Don\'t Start Now'      },
  { type: 'track', artist: 'Billie Eilish',   track: 'bad guy'               },
  { type: 'track', artist: 'Billie Eilish',   track: 'Happier Than Ever'     },
  { type: 'track', artist: 'Olivia Rodrigo',  track: 'good 4 u'              },
  { type: 'track', artist: 'Olivia Rodrigo',  track: 'drivers license'       },
  { type: 'track', artist: 'Ariana Grande',   track: '7 rings'               },
  { type: 'track', artist: 'Post Malone',     track: 'Circles'               },
  { type: 'track', artist: 'Harry Styles',    track: 'As It Was'             },

  // ── Hip-hop & R&B ─────────────────────────────────────────────────────────
  { type: 'track', artist: 'Drake',           track: 'God\'s Plan'           },
  { type: 'track', artist: 'Drake',           track: 'One Dance'             },
  { type: 'track', artist: 'Kendrick Lamar',  track: 'HUMBLE.'               },
  { type: 'track', artist: 'Kendrick Lamar',  track: 'Not Like Us'           },
  { type: 'track', artist: 'SZA',             track: 'Kill Bill'             },
  { type: 'track', artist: 'SZA',             track: 'Good Days'             },
  { type: 'track', artist: 'Tyler the Creator', track: 'See You Again'       },
  { type: 'track', artist: 'Frank Ocean',     track: 'Chanel'                },

  // ── Rock & Indie ─────────────────────────────────────────────────────────
  { type: 'track', artist: 'Arctic Monkeys',  track: 'Do I Wanna Know?'      },
  { type: 'track', artist: 'Arctic Monkeys',  track: 'R U Mine?'             },
  { type: 'track', artist: 'Radiohead',       track: 'Creep'                 },
  { type: 'track', artist: 'The Strokes',     track: 'Last Nite'             },
  { type: 'track', artist: 'Tame Impala',     track: 'The Less I Know The Better' },
  { type: 'track', artist: 'Tame Impala',     track: 'Let It Happen'         },

  // ── Electronic / Dance ───────────────────────────────────────────────────
  { type: 'track', artist: 'Daft Punk',       track: 'Get Lucky'             },
  { type: 'track', artist: 'Daft Punk',       track: 'One More Time'         },
  { type: 'track', artist: 'Calvin Harris',   track: 'Summer'                },

  // ── Genre / mood direct searches (for the mood quiz results) ─────────────
  { type: 'direct', q: 'lofi hip hop chill beats study' },
  { type: 'direct', q: 'upbeat feel good pop playlist 2024' },
  { type: 'direct', q: 'sad emotional songs playlist'    },
  { type: 'direct', q: 'late night drive music playlist' },
  { type: 'direct', q: 'hype rap playlist workout'       },
  { type: 'direct', q: 'indie folk acoustic playlist'    },
  { type: 'direct', q: '80s classic hits playlist'       },
  { type: 'direct', q: '90s throwback hip hop playlist'  },
  { type: 'direct', q: 'summer vibes playlist 2024'      },
  { type: 'direct', q: 'rainy day jazz playlist'         },
];

// ── Helper ────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function searchYouTube(query, maxResults) {
  const response = await axios.get(`${API_BASE}/search`, {
    params: { part: 'snippet', q: query, type: 'video', maxResults, key: API_KEY },
  });
  return response.data.items;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function run() {
  // Load existing cache so we don't re-fetch things already seeded
  let existing = {};
  if (fs.existsSync(OUT_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
      console.log(`📂  Loaded ${Object.keys(existing).length} existing entries`);
    } catch {
      console.warn('⚠️   Could not parse existing cache file — starting fresh');
    }
  }

  const results = { ...existing };
  let newCount  = 0;
  let skipCount = 0;

  for (const item of SEARCHES) {
    let query, cacheKey;

    if (item.type === 'track') {
      query    = `${item.artist} ${item.track} official music video`;
      cacheKey = `${query}|${MAX_RESULTS}`;
    } else {
      query    = item.q;
      cacheKey = `${query}|${MAX_RESULTS}`;
    }

    if (results[cacheKey]) {
      console.log(`  ✓ skip  "${query}"`);
      skipCount++;
      continue;
    }

    process.stdout.write(`  → fetch "${query}" … `);
    try {
      const items = await searchYouTube(query, MAX_RESULTS);
      results[cacheKey] = { items, seededAt: new Date().toISOString() };
      console.log(`${items.length} results`);
      newCount++;
    } catch (err) {
      const reason = err.response?.data?.error?.errors?.[0]?.reason ?? err.message;
      console.log(`FAILED (${reason})`);
      if (reason === 'quotaExceeded') {
        console.error('\n❌  Quota exceeded — re-run tomorrow to continue seeding.');
        break;
      }
    }

    // Polite delay between requests
    await sleep(300);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n✅  Done — ${newCount} new, ${skipCount} skipped`);
  console.log(`📄  Saved to ${OUT_FILE}`);
  console.log('\nNext steps:');
  console.log('  git add data/youtube-cache.json && git commit -m "seed: youtube cache"');
  console.log('  git push heroku main   (or your Heroku deploy command)');
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
