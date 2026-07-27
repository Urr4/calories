const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

let _db = null;
let _dbPath = null;

function saveDb() {
  const data = _db.export();
  const tmp = _dbPath + '.tmp';
  fs.writeFileSync(tmp, Buffer.from(data));
  fs.renameSync(tmp, _dbPath);
}

function migrate() {
  _db.exec(`
    CREATE TABLE IF NOT EXISTS persons (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS person_targets (
      person_id  TEXT PRIMARY KEY REFERENCES persons(id) ON DELETE CASCADE,
      calories   REAL NOT NULL DEFAULT 2000,
      carbs_g    REAL NOT NULL DEFAULT 250,
      protein_g  REAL NOT NULL DEFAULT 100,
      fiber_g    REAL NOT NULL DEFAULT 30
    );

    CREATE TABLE IF NOT EXISTS foods (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      barcode           TEXT UNIQUE,
      calories_per_100g REAL NOT NULL DEFAULT 0,
      protein_per_100g  REAL NOT NULL DEFAULT 0,
      fat_per_100g      REAL NOT NULL DEFAULT 0,
      carbs_per_100g    REAL NOT NULL DEFAULT 0,
      fiber_per_100g    REAL NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meals (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meal_ingredients (
      id         TEXT PRIMARY KEY,
      meal_id    TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
      food_id    TEXT NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
      quantity_g REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS log_entries (
      id          TEXT PRIMARY KEY,
      person_id   TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      entry_date  TEXT NOT NULL,
      meal_slot   TEXT NOT NULL CHECK(meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack')),
      item_type   TEXT NOT NULL CHECK(item_type IN ('food', 'meal')),
      item_id     TEXT NOT NULL,
      quantity_g  REAL,
      calories    REAL NOT NULL DEFAULT 0,
      protein_g   REAL NOT NULL DEFAULT 0,
      carbs_g     REAL NOT NULL DEFAULT 0,
      fiber_g     REAL NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_log_entries_person_date ON log_entries(person_id, entry_date);
    CREATE INDEX IF NOT EXISTS idx_log_entries_person_item ON log_entries(person_id, item_type, item_id);
    CREATE INDEX IF NOT EXISTS idx_meal_ingredients_meal ON meal_ingredients(meal_id);
  `);
  saveDb();
}

async function initDb(dbPath) {
  _dbPath = dbPath;
  const SQL = await initSqlJs();

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }

  migrate();
  return _db;
}

function getDb() {
  if (!_db) throw new Error('Database not initialized. Call initDb() first.');
  return _db;
}

// Runs a query and returns rows as an array of plain objects.
function all(sql, params = []) {
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  const rows = all(sql, params);
  return rows[0] || null;
}

// Runs an INSERT/UPDATE/DELETE statement and persists the DB to disk.
function run(sql, params = []) {
  _db.run(sql, params);
  saveDb();
}

function newId() {
  return uuidv4();
}

module.exports = { initDb, getDb, all, get, run, newId, saveDb };
