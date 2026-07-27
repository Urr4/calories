const path = require('path');
const express = require('express');
const db = require('./db');

const PORT = process.env.PORT || 3003;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'calories.db');
const STATIC_DIR = path.join(__dirname, '..', '..', 'frontend', 'dist');

async function main() {
  await db.initDb(DB_PATH);

  const app = express();
  app.use(express.json());

  app.use('/api/persons', require('./routes/persons'));
  app.use('/api/foods', require('./routes/foods'));
  app.use('/api/meals', require('./routes/meals'));
  app.use('/api/entries', require('./routes/entries'));
  app.use('/api/summary', require('./routes/summary'));
  app.use('/api/off-config', require('./routes/off-config'));

  // Serve the built frontend (production/Docker image); harmless if the dist
  // folder doesn't exist yet during local backend-only development.
  app.use(express.static(STATIC_DIR));
  app.get(/^\/(?!api).*/, (req, res, next) => {
    res.sendFile(path.join(STATIC_DIR, 'index.html'), (err) => {
      if (err) next();
    });
  });

  app.listen(PORT, () => {
    console.log(`calories backend listening on port ${PORT} (DB: ${DB_PATH})`);
  });
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
