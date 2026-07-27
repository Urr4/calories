const fetch = require('node-fetch');
const stubData = require('./off-stub-data.json');

const OFF_MODE = (process.env.OFF_MODE || 'stub').toLowerCase();

// Looks up nutrition data for a barcode. Returns null if not found.
// In "stub" mode (default, used for local development), data is read from a
// small local fixture file so the barcode-scan flow can be tested without
// internet access or hitting Open Food Facts rate limits.
// In "live" mode (used in deployment), the real Open Food Facts API is called.
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
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'calories-app/1.0 (personal project)' },
  });
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

module.exports = { lookupBarcode, OFF_MODE };
