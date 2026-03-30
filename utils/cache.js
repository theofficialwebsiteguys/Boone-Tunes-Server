/**
 * Simple in-memory TTL cache.
 *
 * Used for short-lived Spotify track data — data is never written to the DB.
 * Entries expire automatically; the full cache for a user can be purged on logout.
 */

const store = new Map();

/**
 * @param {string} key
 * @param {*} value
 * @param {number} ttlMs - Time to live in milliseconds
 */
const set = (key, value, ttlMs) => {
  const expiresAt = Date.now() + ttlMs;
  store.set(key, { value, expiresAt });
};

/**
 * @param {string} key
 * @returns {*} Cached value, or null if missing/expired
 */
const get = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
};

/**
 * Delete all cache entries whose key starts with a given prefix.
 * Use to purge all cached data for a user on logout.
 * @param {string} prefix - e.g. `tracks:userId:`
 */
const deleteByPrefix = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};

module.exports = { set, get, deleteByPrefix };
