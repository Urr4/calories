const express = require('express');
const db = require('../db');
const { nutritionForIngredients } = require('./meals');

const router = express.Router();

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

function loadMealIngredients(mealId) {
  return db.all(
    `SELECT mi.quantity_g, f.calories_per_100g, f.protein_per_100g, f.fat_per_100g, f.carbs_per_100g, f.fiber_per_100g
     FROM meal_ingredients mi JOIN foods f ON f.id = mi.food_id WHERE mi.meal_id = ?`,
    [mealId]
  );
}

router.get('/', (req, res) => {
  const { personId, date } = req.query;
  if (!personId || !date) {
    return res.status(400).json({ error: 'personId and date query params are required' });
  }
  const entries = db.all(
    `SELECT le.*, 
        CASE WHEN le.item_type = 'food' THEN f.name ELSE m.name END AS item_name
     FROM log_entries le
     LEFT JOIN foods f ON le.item_type = 'food' AND f.id = le.item_id
     LEFT JOIN meals m ON le.item_type = 'meal' AND m.id = le.item_id
     WHERE le.person_id = ? AND le.entry_date = ?
     ORDER BY le.created_at ASC`,
    [personId, date]
  );
  res.json(entries);
});

router.post('/', (req, res) => {
  const { personId, date, mealSlot, itemType, itemId, quantityG } = req.body;

  if (!personId || !date || !mealSlot || !itemType || !itemId) {
    return res.status(400).json({ error: 'personId, date, mealSlot, itemType and itemId are required' });
  }
  if (!MEAL_SLOTS.includes(mealSlot)) {
    return res.status(400).json({ error: `mealSlot must be one of ${MEAL_SLOTS.join(', ')}` });
  }
  if (!['food', 'meal'].includes(itemType)) {
    return res.status(400).json({ error: 'itemType must be "food" or "meal"' });
  }
  const person = db.get('SELECT id FROM persons WHERE id = ?', [personId]);
  if (!person) return res.status(404).json({ error: 'person not found' });

  let nutrition;
  let storedQuantityG = null;

  if (itemType === 'food') {
    if (typeof quantityG !== 'number' || quantityG <= 0) {
      return res.status(400).json({ error: 'quantityG must be a positive number for foods' });
    }
    const food = db.get('SELECT * FROM foods WHERE id = ?', [itemId]);
    if (!food) return res.status(404).json({ error: 'food not found' });
    const factor = quantityG / 100;
    nutrition = {
      calories: food.calories_per_100g * factor,
      protein_g: food.protein_per_100g * factor,
      carbs_g: food.carbs_per_100g * factor,
      fiber_g: food.fiber_per_100g * factor,
    };
    storedQuantityG = quantityG;
  } else {
    const meal = db.get('SELECT * FROM meals WHERE id = ?', [itemId]);
    if (!meal) return res.status(404).json({ error: 'meal not found' });
    const ingredients = loadMealIngredients(itemId);
    nutrition = nutritionForIngredients(ingredients);
  }

  const id = db.newId();
  db.run(
    `INSERT INTO log_entries (id, person_id, entry_date, meal_slot, item_type, item_id, quantity_g, calories, protein_g, carbs_g, fiber_g)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, personId, date, mealSlot, itemType, itemId, storedQuantityG, nutrition.calories, nutrition.protein_g, nutrition.carbs_g, nutrition.fiber_g]
  );

  const entry = db.get('SELECT * FROM log_entries WHERE id = ?', [id]);
  res.status(201).json(entry);
});

router.delete('/:id', (req, res) => {
  const existing = db.get('SELECT id FROM log_entries WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'entry not found' });
  db.run('DELETE FROM log_entries WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

module.exports = router;
