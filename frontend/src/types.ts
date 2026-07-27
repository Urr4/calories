export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snack',
};

export interface Person {
  id: string;
  name: string;
  created_at: string;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fiber_g: number;
}

export interface Food {
  id: string;
  name: string;
  barcode: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  fiber_per_100g: number;
  created_at: string;
  usage_count: number;
}

export interface MealIngredient {
  id: string;
  food_id: string;
  quantity_g: number;
  food_name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  fiber_per_100g: number;
}

export interface NutritionTotals {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
}

export interface Meal {
  id: string;
  name: string;
  created_at: string;
  usage_count: number;
  ingredients: MealIngredient[];
  nutritionPerPortion: NutritionTotals;
}

export interface LogEntry {
  id: string;
  person_id: string;
  entry_date: string;
  meal_slot: MealSlot;
  item_type: 'food' | 'meal';
  item_id: string;
  item_name: string;
  quantity_g: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fiber_g: number;
  created_at: string;
}

export interface SummaryTotals {
  calories: number;
  carbs_g: number;
  protein_g: number;
  fiber_g: number;
}

export interface Summary {
  totals: SummaryTotals;
  targets: SummaryTotals;
}

export interface BarcodeLookupResult {
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  fiberPer100g: number;
  source: string;
}
