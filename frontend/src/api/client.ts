import axios from 'axios';
import type {
  BarcodeLookupResult,
  Food,
  LogEntry,
  Meal,
  MealSlot,
  Person,
  Summary,
} from '../types';

const api = axios.create({ baseURL: '/api' });

export const personsApi = {
  list: () => api.get<Person[]>('/persons').then((r) => r.data),
  create: (name: string) => api.post<Person>('/persons', { name }).then((r) => r.data),
  updateTargets: (
    id: string,
    targets: { calories: number; carbs_g: number; protein_g: number; fiber_g: number }
  ) => api.put<Person>(`/persons/${id}/targets`, targets).then((r) => r.data),
};

export const foodsApi = {
  list: (personId: string, q?: string) =>
    api.get<Food[]>('/foods', { params: { personId, q } }).then((r) => r.data),
  create: (food: {
    name: string;
    barcode?: string | null;
    caloriesPer100g: number;
    proteinPer100g: number;
    fatPer100g: number;
    carbsPer100g: number;
    fiberPer100g: number;
  }) => api.post<Food>('/foods', food).then((r) => r.data),
  lookupBarcode: (barcode: string) =>
    api
      .get<BarcodeLookupResult>(`/foods/lookup/${encodeURIComponent(barcode)}`)
      .then((r) => r.data),
};

export const mealsApi = {
  list: (personId: string, q?: string) =>
    api.get<Meal[]>('/meals', { params: { personId, q } }).then((r) => r.data),
  create: (meal: { name: string; ingredients: { foodId: string; quantityG: number }[] }) =>
    api.post<Meal>('/meals', meal).then((r) => r.data),
};

export const entriesApi = {
  list: (personId: string, date: string) =>
    api.get<LogEntry[]>('/entries', { params: { personId, date } }).then((r) => r.data),
  create: (entry: {
    personId: string;
    date: string;
    mealSlot: MealSlot;
    itemType: 'food' | 'meal';
    itemId: string;
    quantityG?: number;
  }) => api.post<LogEntry>('/entries', entry).then((r) => r.data),
  remove: (id: string) => api.delete(`/entries/${id}`),
};

export const summaryApi = {
  get: (personId: string, date: string) =>
    api.get<Summary>('/summary', { params: { personId, date } }).then((r) => r.data),
};
