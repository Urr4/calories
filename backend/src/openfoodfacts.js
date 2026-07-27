const { default: fetch } = require('node-fetch');
const stubData = require('./off-stub-data.json');
const db = require('./db');

const OFF_MODE = (process.env.OFF_MODE || 'stub').toLowerCase();

const APP_NAME = 'Calories';
const APP_VERSION = '0.0.1';
const USER_AGENT = `${APP_NAME}/${APP_VERSION} (schubert.inf@gmail.com)`;
const OFF_BASE_URL = 'https://world.openfoodfacts.org';

// Looks up nutrition data for a barcode. Returns null if not found.
// In "stub" mode (default, used for local development), data is read from a
// small local fixture file so the barcode-scan flow can be tested without
// internet access or hitting Open Food Facts rate limits.
// In "live" mode (used in deployment), the real Open Food Facts API is called,
// authenticated with the credentials configured on the config page (if any).
async function lookupBarcode(barcode) {
  if (OFF_MODE === 'live') {
    return lookupLive(barcode);
  }
  return lookupStub(barcode);
}

function lookupStub(barcode) {
  const entry = stubData.find((item) => item.barcode === barcode);
  if (!entry) return null;
  return {
    name: entry.name,
    caloriesPer100g: entry.calories_per_100g,
    proteinPer100g: entry.protein_per_100g,
    fatPer100g: entry.fat_per_100g,
    carbsPer100g: entry.carbs_per_100g,
    fiberPer100g: entry.fiber_per_100g,
    source: 'stub',
  };
}

async function lookupLive(barcode) {
  const config = getConfig();
  await ensureLoggedIn(config);

  const url = new URL(`${OFF_BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json`);
  applyAppParams(url, config);

  const res = await fetch(url, { headers: buildHeaders(config) });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;

  const nutriments = data.product.nutriments || {};
  return {
    name: data.product.product_name || data.product.generic_name || 'Unbekanntes Produkt',
    caloriesPer100g: nutriments['energy-kcal_100g'] ?? 0,
    proteinPer100g: nutriments['proteins_100g'] ?? 0,
    fatPer100g: nutriments['fat_100g'] ?? 0,
    carbsPer100g: nutriments['carbohydrates_100g'] ?? 0,
    fiberPer100g: nutriments['fiber_100g'] ?? 0,
    source: 'openfoodfacts',
  };
}

// Reads the stored Open Food Facts config (username/password/app_uuid/session
// cookie). Returns null if no credentials have been configured yet.
function getConfig() {
  return db.get('SELECT * FROM off_config WHERE id = ?', ['default']);
}

// Returns { username, configured, appUuid, authenticatedAt } without the
// password, safe to send to the frontend.
function getPublicConfig() {
  const config = getConfig();
  if (!config) return { configured: false };
  return {
    configured: true,
    username: config.username,
    appUuid: config.app_uuid,
    authenticatedAt: config.authenticated_at || null,
  };
}

function clearConfig() {
  db.run('DELETE FROM off_config WHERE id = ?', ['default']);
}

function buildHeaders(config, extra = {}) {
  const headers = { 'User-Agent': USER_AGENT, ...extra };
  if (config && config.session_cookie) {
    headers['Cookie'] = config.session_cookie;
  }
  return headers;
}

function applyAppParams(url, config) {
  url.searchParams.set('app_name', APP_NAME);
  url.searchParams.set('app_version', APP_VERSION);
  if (config && config.app_uuid) {
    url.searchParams.set('app_uuid', config.app_uuid);
  }
}

// Logs in again with the stored credentials if we have credentials but no
// session cookie yet (e.g. right after saving them, or after an explicit
// logout). Never throws - lookups fall back to unauthenticated requests
// (which Open Food Facts still allows for reads) if login fails.
async function ensureLoggedIn(config) {
  if (!config || config.session_cookie || !config.username || !config.password) return;
  try {
    await login(config.username, config.password);
  } catch (err) {
    console.error('Open Food Facts auto-login failed', err);
  }
}

// Performs the initial login request against Open Food Facts' auth endpoint
// and stores the resulting session cookie so it can be reused on later
// requests, as documented at
// https://openfoodfacts.github.io/openfoodfacts-server/api/tutorial-off-api/
async function login(username, password) {
  if (!username || !password) {
    throw new Error('username and password are required');
  }

  const config = getConfig();
  const appUuid = (config && config.app_uuid) || newSaltedUuid();

  const body = new URLSearchParams({
    user_id: username,
    password,
    app_name: APP_NAME,
    app_version: APP_VERSION,
    app_uuid: appUuid,
    body: '1',
  });

  const res = await fetch(`${OFF_BASE_URL}/cgi/auth.pl`, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    redirect: 'manual',
  });

  const data = await res.json().catch(() => ({}));
  const setCookies = res.headers.raw ? res.headers.raw()['set-cookie'] : null;

  if (!res.ok || data.status !== 1) {
    const reason = data.status_verbose || `HTTP ${res.status}`;
    throw new Error(`Anmeldung bei Open Food Facts fehlgeschlagen (${reason}). Bitte Benutzername und Passwort prüfen.`);
  }

  const sessionCookie = setCookies && setCookies.length
    ? setCookies.map((c) => c.split(';')[0]).join('; ')
    : null;

  db.run(
    `INSERT INTO off_config (id, username, password, app_uuid, session_cookie, authenticated_at, updated_at)
     VALUES ('default', ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       username = excluded.username,
       password = excluded.password,
       app_uuid = excluded.app_uuid,
       session_cookie = COALESCE(excluded.session_cookie, off_config.session_cookie),
       authenticated_at = excluded.authenticated_at,
       updated_at = excluded.updated_at`,
    [username, password, appUuid, sessionCookie]
  );

  return getPublicConfig();
}

// A UUIDv4 already contains 122 bits of randomness; we additionally mix in
// the current time and an extra random salt so the value can't be derived
// from the UUID generator's output alone, as requested ("salted uuid").
function newSaltedUuid() {
  const { v4: uuidv4 } = require('uuid');
  const crypto = require('crypto');
  const salt = crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHash('sha256').update(`${uuidv4()}:${Date.now()}:${salt}`).digest('hex');
  return [hash.slice(0, 8), hash.slice(8, 12), `4${hash.slice(13, 16)}`, hash.slice(16, 20), hash.slice(20, 32)].join('-');
}

module.exports = { lookupBarcode, login, getPublicConfig, clearConfig, OFF_MODE };
