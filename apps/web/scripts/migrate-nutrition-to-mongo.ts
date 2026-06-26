/**
 * One-shot idempotent import: legacy JSON files → MongoDB.
 * Requires MONGODB_URI. Does not use JSON at runtime — import only.
 *
 * Usage: LEGACY_NUTRITION_IMPORT_DIR=/path/to/json npm run migrate:nutrition
 */

import fs from "fs";
import path from "path";
import {
  ensureIndexes,
  foodsCollection,
  goalsCollection,
  mealsCollection,
  type FoodDoc,
  type MealDoc,
} from "@agent-os/platform/mongo";
import type { FoodDb, LogEntry, MacroGoals } from "@agent-os/platform/nutrition";

const DEFAULT_GOALS: MacroGoals = {
  calories: 2200,
  protein_g: 160,
  carb_g: 220,
  fat_g: 73,
};

const IMPORT_DIR =
  process.env.LEGACY_NUTRITION_IMPORT_DIR ||
  path.join(process.env.HOME || "", ".local", "share", "agent-os", "nutrition");

const FOOD_DB_PATH = path.join(IMPORT_DIR, "food_database.json");
const GOALS_PATH = path.join(IMPORT_DIR, "goals.json");

function getLogPath(date: string): string {
  return path.join(IMPORT_DIR, `log_${date}.json`);
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function listLogDates(): string[] {
  if (!fs.existsSync(IMPORT_DIR)) return [];
  return fs
    .readdirSync(IMPORT_DIR)
    .filter((f) => /^log_\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => f.replace(/^log_|\.json$/g, ""))
    .sort();
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Add it to .env.local or the environment.");
    process.exit(1);
  }

  console.log("Legacy import dir:", IMPORT_DIR);
  await ensureIndexes();

  const foods = await foodsCollection();
  const meals = await mealsCollection();
  const goalsColl = await goalsCollection();

  let foodCount = 0;
  const foodDb = readJsonFile<FoodDb>(FOOD_DB_PATH, {});
  for (const [key, entry] of Object.entries(foodDb)) {
    const doc: FoodDoc = {
      _id: key,
      display_name: entry.display_name,
      per_100g: entry.per_100g,
      added_date: entry.added_date,
    };
    await foods.replaceOne({ _id: key }, doc, { upsert: true });
    foodCount++;
  }

  const goalsJson = readJsonFile<Partial<MacroGoals>>(GOALS_PATH, {});
  const mergedGoals = { ...DEFAULT_GOALS, ...goalsJson };
  await goalsColl.updateOne(
    { _id: "default" },
    {
      $set: {
        calories: mergedGoals.calories,
        protein_g: mergedGoals.protein_g,
        carb_g: mergedGoals.carb_g,
        fat_g: mergedGoals.fat_g,
        updated_at: new Date().toISOString(),
      },
      $setOnInsert: { _id: "default" },
    },
    { upsert: true },
  );

  let mealCount = 0;
  const foodKeys = new Set(Object.keys(foodDb));

  for (const date of listLogDates()) {
    const entries = readJsonFile<LogEntry[]>(getLogPath(date), []);
    for (const entry of entries) {
      const foodKey = entry.food_name.trim().toLowerCase();
      const doc: MealDoc = {
        _id: entry.timestamp,
        date,
        timestamp: entry.timestamp,
        food_name: entry.food_name,
        food_id: foodKeys.has(foodKey) ? foodKey : undefined,
        quantity_grams: entry.quantity_grams,
        nutrition_per_100g: entry.nutrition_per_100g,
        consumed_nutrition: entry.consumed_nutrition,
        source: "system",
      };
      await meals.replaceOne({ _id: doc._id }, doc, { upsert: true });
      mealCount++;
    }
  }

  console.log(
    `Done. foods=${foodCount} meals=${mealCount} goals=default (imported from ${IMPORT_DIR})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
