const express = require('express');
const off = require('../openfoodfacts');

const router = express.Router();

// Returns the current Open Food Facts config status (never the password).
router.get('/', (req, res) => {
  res.json(off.getPublicConfig());
});

// Saves the Open Food Facts username/password, performs the initial login
// request against /cgi/auth.pl and stores the resulting session cookie.
router.post('/', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !username.trim() || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    const config = await off.login(username.trim(), password);
    res.json(config);
  } catch (err) {
    console.error('Open Food Facts login failed', err.message);
    res.status(401).json({ error: err.message || 'login failed' });
  }
});

// Clears the stored credentials/session (local logout).
router.delete('/', (req, res) => {
  off.clearConfig();
  res.status(204).end();
});

module.exports = router;
