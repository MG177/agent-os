import type { AuditSource } from "@agent-os/platform/audit";
import { getAppTimeZone } from "@agent-os/contracts/timezone";
import {
  deleteFoodMongo,
  deleteMealMongo,
  insertMealMongo,
  readFoodDbMongo,
  readFoodFrequencyMongo,
  readGoalsMongo,
  readLogMongo,
  upsertFoodMongo,
  writeGoalsMongo,
} from "@agent-os/platform/nutrition-mongo";

export interface NutritionPer100g {
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  saturated_fat_g?: number;
  trans_fat_g?: number;
  cholesterol_mg?: number;
  sodium_mg?: number;
}

export interface ConsumedNutrition {
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
}

export interface LogEntry {
  timestamp: string;
  food_name: string;
  quantity_grams: number;
  nutrition_per_100g: NutritionPer100g;
  consumed_nutrition: ConsumedNutrition;
}

export interface FoodDbEntry {
  display_name: string;
  per_100g: NutritionPer100g;
  added_date: string;
}

export interface FoodDb {
  [key: string]: FoodDbEntry;
}

export interface MacroGoals {
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
}

export interface DailyTotals extends ConsumedNutrition {
  meal_count: number;
}

export async function readLog(date: string): Promise<LogEntry[]> {
  return readLogMongo(date);
}

export async function readFoodFrequency(): Promise<{ food_name: string; count: number; last_logged: string }[]> {
  return readFoodFrequencyMongo();
}

export async function insertMeal(
  date: string,
  entry: LogEntry,
  source: AuditSource,
): Promise<void> {
  await insertMealMongo(date, entry, source);
}

export async function deleteMeal(date: string, id: string): Promise<boolean> {
  return deleteMealMongo(date, id);
}

export async function readFoodDb(): Promise<FoodDb> {
  return readFoodDbMongo();
}

export async function upsertFood(key: string, entry: FoodDbEntry): Promise<void> {
  await upsertFoodMongo(key, entry);
}

export async function deleteFood(key: string): Promise<boolean> {
  return deleteFoodMongo(key);
}

export async function writeFoodDb(db: FoodDb): Promise<void> {
  for (const [key, entry] of Object.entries(db)) {
    await upsertFoodMongo(key, entry);
  }
}

export async function readGoals(): Promise<MacroGoals> {
  return readGoalsMongo();
}

export async function writeGoals(goals: MacroGoals): Promise<void> {
  await writeGoalsMongo(goals);
}

export function calculateTotals(entries: LogEntry[]): DailyTotals {
  const totals: DailyTotals = {
    calories: 0,
    protein_g: 0,
    carb_g: 0,
    fat_g: 0,
    meal_count: entries.length,
  };
  for (const e of entries) {
    totals.calories += e.consumed_nutrition.calories;
    totals.protein_g += e.consumed_nutrition.protein_g;
    totals.carb_g += e.consumed_nutrition.carb_g;
    totals.fat_g += e.consumed_nutrition.fat_g;
  }
  totals.calories = Math.round(totals.calories * 10) / 10;
  totals.protein_g = Math.round(totals.protein_g * 10) / 10;
  totals.carb_g = Math.round(totals.carb_g * 10) / 10;
  totals.fat_g = Math.round(totals.fat_g * 10) / 10;
  return totals;
}

export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: getAppTimeZone(),
  });
}
