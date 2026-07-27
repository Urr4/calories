const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const persons = db.all(`
    SELECT p.id, p.name, p.created_at,
           t.calories, t.carbs_g, t.protein_g, t.fiber_g
    FROM persons p
    LEFT JOIN person_targets t ON t.person_id = p.id
    ORDER BY p.name COLLATE NOCASE
  `);
  res.json(persons);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const existing = db.get('SELECT id FROM persons WHERE name = ?', [name.trim()]);
  if (existing) {
    return res.status(409).json({ error: 'a person with this name already exists' });
  }
  const id = db.newId();
  db.run('INSERT INTO persons (id, name) VALUES (?, ?)', [id, name.trim()]);
  db.run(
    'INSERT INTO person_targets (person_id, calories, carbs_g, protein_g, fiber_g) VALUES (?, 2000, 250, 100, 30)',
    [id]
  );
  const person = db.get(
    `SELECT p.id, p.name, p.created_at, t.calories, t.carbs_g, t.protein_g, t.fiber_g
     FROM persons p LEFT JOIN person_targets t ON t.person_id = p.id WHERE p.id = ?`,
    [id]
  );
  res.status(201).json(person);
});

router.put('/:id/targets', (req, res) => {
  const { id } = req.params;
  const person = db.get('SELECT id FROM persons WHERE id = ?', [id]);
  if (!person) return res.status(404).json({ error: 'person not found' });

  const { calories, carbs_g, protein_g, fiber_g } = req.body;
  const values = [calories, carbs_g, protein_g, fiber_g];
  if (values.some((v) => typeof v !== 'number' || Number.isNaN(v) || v < 0)) {
    return res.status(400).json({ error: 'calories, carbs_g, protein_g, fiber_g must be non-negative numbers' });
  }

  db.run(
    `INSERT INTO person_targets (person_id, calories, carbs_g, protein_g, fiber_g)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(person_id) DO UPDATE SET calories = excluded.calories, carbs_g = excluded.carbs_g,
       protein_g = excluded.protein_g, fiber_g = excluded.fiber_g`,
    [id, calories, carbs_g, protein_g, fiber_g]
  );

  const updated = db.get(
    `SELECT p.id, p.name, p.created_at, t.calories, t.carbs_g, t.protein_g, t.fiber_g
     FROM persons p LEFT JOIN person_targets t ON t.person_id = p.id WHERE p.id = ?`,
    [id]
  );
  res.json(updated);
});

module.exports = router;
