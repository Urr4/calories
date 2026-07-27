const express = require('express');
const db = require('../db');
const { lookupBarcode } = require('../openfoodfacts');

const router = express.Router();

// Lists foods, sorted by how often the given person has logged them
// (descending), falling back to name for foods never used by that person.
router.get('/', (req, res) => {
  const { personId, q } = req.query;
  const search = q ? `%${q.trim()}%` : null;

  let rows;
  if (personId) {
    rows = db.all(
      `SELECT f.*, COALESCE(u.usage_count, 0) AS usage_count
       FROM foods f
       LEFT JOIN (
         SELECT item_id, COUNT(*) AS usage_count
         FROM log_entries
         WHERE person_id = ? AND item_type = 'food'
         GROUP BY item_id
       ) u ON u.item_id = f.id
       WHERE (? IS NULL OR f.name LIKE ?)
       ORDER BY usage_count DESC, f.name COLLATE NOCASE`,
      [personId, search, search]
    );
  } else {
    rows = db.all(
      `SELECT f.*, 0 AS usage_count FROM foods f
       WHERE (? IS NULL OR f.name LIKE ?)
       ORDER BY f.name COLLATE NOCASE`,
      [search, search]
    );
  }
  res.json(rows);
});

router.get('/lookup/:barcode', async (req, res) => {
  try {
    const result = await lookupBarcode(req.params.barcode);
    if (!result) return res.status(404).json({ error: 'product not found' });
    res.json(result);
  } catch (err) {
    console.error('barcode lookup failed', err);
    res.status(502).json({ error: 'barcode lookup failed' });
  }
});

router.post('/', (req, res) => {
  const {
    name, barcode,
    caloriesPer100g, proteinPer100g, fatPer100g, carbsPer100g, fiberPer100g,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const numericFields = { caloriesPer100g, proteinPer100g, fatPer100g, carbsPer100g, fiberPer100g };
  for (const [key, value] of Object.entries(numericFields)) {
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
      return res.status(400).json({ error: `${key} must be a non-negative number` });
    }
  }

  if (barcode) {
    const existing = db.get('SELECT id FROM foods WHERE barcode = ?', [barcode]);
    if (existing) return res.status(409).json({ error: 'a food with this barcode already exists' });
  }

  const id = db.newId();
  db.run(
    `INSERT INTO foods (id, name, barcode, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name.trim(), barcode || null, caloriesPer100g, proteinPer100g, fatPer100g, carbsPer100g, fiberPer100g]
  );
  const food = db.get('SELECT * FROM foods WHERE id = ?', [id]);
  res.status(201).json(food);
});

module.exports = router;
