const express = require('express');
const db = require('../db');

const router = express.Router();

function loadMealIngredients(mealId) {
  return db.all(
    `SELECT mi.id, mi.food_id, mi.quantity_g, f.name AS food_name,
            f.calories_per_100g, f.protein_per_100g, f.fat_per_100g, f.carbs_per_100g, f.fiber_per_100g
     FROM meal_ingredients mi
     JOIN foods f ON f.id = mi.food_id
     WHERE mi.meal_id = ?`,
    [mealId]
  );
}

function nutritionForIngredients(ingredients) {
  return ingredients.reduce(
    (acc, ing) => {
      const factor = ing.quantity_g / 100;
      acc.calories += ing.calories_per_100g * factor;
      acc.protein_g += ing.protein_per_100g * factor;
      acc.fat_g += ing.fat_per_100g * factor;
      acc.carbs_g += ing.carbs_per_100g * factor;
      acc.fiber_g += ing.fiber_per_100g * factor;
      return acc;
    },
    { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 }
  );
}

// Lists meals, sorted by how often the given person has logged them.
router.get('/', (req, res) => {
  const { personId, q } = req.query;
  const search = q ? `%${q.trim()}%` : null;

  let meals;
  if (personId) {
    meals = db.all(
      `SELECT m.*, COALESCE(u.usage_count, 0) AS usage_count
       FROM meals m
       LEFT JOIN (
         SELECT item_id, COUNT(*) AS usage_count
         FROM log_entries
         WHERE person_id = ? AND item_type = 'meal'
         GROUP BY item_id
       ) u ON u.item_id = m.id
       WHERE (? IS NULL OR m.name LIKE ?)
       ORDER BY usage_count DESC, m.name COLLATE NOCASE`,
      [personId, search, search]
    );
  } else {
    meals = db.all(
      `SELECT m.*, 0 AS usage_count FROM meals m
       WHERE (? IS NULL OR m.name LIKE ?)
       ORDER BY m.name COLLATE NOCASE`,
      [search, search]
    );
  }

  const withNutrition = meals.map((meal) => {
    const ingredients = loadMealIngredients(meal.id);
    return { ...meal, ingredients, nutritionPerPortion: nutritionForIngredients(ingredients) };
  });

  res.json(withNutrition);
});

router.post('/', (req, res) => {
  const { name, ingredients } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: 'ingredients must be a non-empty array' });
  }
  for (const ing of ingredients) {
    if (!ing.foodId || typeof ing.quantityG !== 'number' || ing.quantityG <= 0) {
      return res.status(400).json({ error: 'each ingredient needs foodId and a positive quantityG' });
    }
    const food = db.get('SELECT id FROM foods WHERE id = ?', [ing.foodId]);
    if (!food) return res.status(400).json({ error: `unknown foodId: ${ing.foodId}` });
  }

  const mealId = db.newId();
  db.run('INSERT INTO meals (id, name) VALUES (?, ?)', [mealId, name.trim()]);
  for (const ing of ingredients) {
    db.run('INSERT INTO meal_ingredients (id, meal_id, food_id, quantity_g) VALUES (?, ?, ?, ?)', [
      db.newId(),
      mealId,
      ing.foodId,
      ing.quantityG,
    ]);
  }

  const meal = db.get('SELECT * FROM meals WHERE id = ?', [mealId]);
  const mealIngredients = loadMealIngredients(mealId);
  res.status(201).json({ ...meal, ingredients: mealIngredients, nutritionPerPortion: nutritionForIngredients(mealIngredients) });
});

module.exports = router;
module.exports.nutritionForIngredients = nutritionForIngredients;
