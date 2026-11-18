'use strict';

/**
 * Minimal client for the public, keyless battle.training read API.
 * Docs: https://api.battle.training/llms.txt
 * All endpoints below need no API key and no account.
 */

const BASE_URL = 'https://api.battle.training/api';
const USER_AGENT = 'battle-training-cli/1.0 (+https://battle.training)';

class ApiError extends Error {
  constructor(status, path, detail) {
    super(`battle.training API ${status} for ${path}${detail ? `: ${detail}` : ''}`);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
  }
}

async function get(path) {
  let res;
  try {
    res = await fetch(BASE_URL + path, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
    });
  } catch (err) {
    throw new Error(`could not reach ${BASE_URL}${path}: ${err.message}`);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body && (body.error || body.message)) detail = body.error || body.message;
    } catch {
      // keep the HTTP status text
    }
    throw new ApiError(res.status, path, detail);
  }
  return res.json();
}

/** GET /api/bots/<handle> — profile, public-ladder row, cup entries, versions. */
function getBot(handle) {
  return get(`/bots/${encodeURIComponent(handle)}`);
}

/** GET /api/matches?bot=<handle>&limit=<n> — recent sets, newest first. */
function getMatches(handle, limit = 10) {
  return get(`/matches?bot=${encodeURIComponent(handle)}&limit=${limit}`);
}

/** GET /api/ladders — every ladder and cup (public, previews, cups). */
function getLadders() {
  return get('/ladders');
}

/** GET /api/ladders/<slug> — one ladder/cup incl. standings + recent sets. */
function getLadder(slug) {
  return get(`/ladders/${encodeURIComponent(slug)}`);
}

/** GET /api/ladder — the whole public board with rank deltas. */
function getPublicBoard() {
  return get('/ladder');
}

/** GET /api/status — arena snapshot (top 20, cup standings, headlines). */
function getStatus() {
  return get('/status');
}

module.exports = { ApiError, getBot, getMatches, getLadders, getLadder, getPublicBoard, getStatus };
