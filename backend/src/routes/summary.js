const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const { personId, date } = req.query;
  if (!personId || !date) {
    return res.status(400).json({ error: 'personId and date query params are required' });
  }

  const totals = db.get(
    `SELECT COALESCE(SUM(calories), 0) AS calories,
            COALESCE(SUM(carbs_g), 0) AS carbs_g,
            COALESCE(SUM(protein_g), 0) AS protein_g,
            COALESCE(SUM(fiber_g), 0) AS fiber_g
     FROM log_entries WHERE person_id = ? AND entry_date = ?`,
    [personId, date]
  );

  const targets = db.get('SELECT calories, carbs_g, protein_g, fiber_g FROM person_targets WHERE person_id = ?', [
    personId,
  ]) || { calories: 2000, carbs_g: 250, protein_g: 100, fiber_g: 30 };

  res.json({ totals, targets });
});

module.exports = router;
