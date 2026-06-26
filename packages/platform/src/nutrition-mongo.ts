import {
  ensureIndexes,
  foodsCollection,
  goalsCollection,
  mealsCollection,
  type FoodDoc,
  type MealDoc,
} from "@agent-os/platform/mongo";
import type { AuditSource } from "@agent-os/platform/audit";
import type {
  FoodDb,
  FoodDbEntry,
  LogEntry,
  MacroGoals,
} from "@agent-os/platform/nutrition";

const DEFAULT_GOALS: MacroGoals = {
  calories: 2200,
  protein_g: 160,
  carb_g: 220,
  fat_g: 73,
};

let indexesReady: Promise<void> | null = null;

async function ready(): Promise<void> {
  if (!indexesReady) {
    indexesReady = ensureIndexes();
  }
  await indexesReady;
}

function mealToLogEntry(doc: MealDoc): LogEntry {
  return {
    timestamp: doc.timestamp,
    food_name: doc.food_name,
    quantity_grams: doc.quantity_grams,
    nutrition_per_100g: doc.nutrition_per_100g,
    consumed_nutrition: doc.consumed_nutrition,
  };
}

function foodDocToEntry(doc: FoodDoc): FoodDbEntry {
  return {
    display_name: doc.display_name,
    per_100g: doc.per_100g,
    added_date: doc.added_date,
  };
}

export async function readLogMongo(date: string): Promise<LogEntry[]> {
  await ready();
  const meals = await mealsCollection();
  const docs = await meals
    .find({ date })
    .sort({ timestamp: 1 })
    .toArray();
  return docs.map(mealToLogEntry);
}

export async function readFoodFrequencyMongo(): Promise<{ food_name: string; count: number; last_logged: string }[]> {
  await ready();
  const meals = await mealsCollection();
  const rows = await meals
    .aggregate<{ _id: string; count: number; last_logged: string }>([
      { $group: { _id: "$food_name", count: { $sum: 1 }, last_logged: { $max: "$timestamp" } } },
      { $sort: { count: -1 } },
    ])
    .toArray();
  return rows.map((r) => ({ food_name: r._id, count: r.count, last_logged: r.last_logged }));
}

export async function insertMealMongo(
  date: string,
  entry: LogEntry,
  source: AuditSource,
): Promise<void> {
  await ready();
  const meals = await mealsCollection();
  const foodKey = entry.food_name.trim().toLowerCase();
  const foods = await foodsCollection();
  const food = await foods.findOne({ _id: foodKey });

  const doc: MealDoc = {
    _id: entry.timestamp,
    date,
    timestamp: entry.timestamp,
    food_name: entry.food_name,
    food_id: food ? foodKey : undefined,
    quantity_grams: entry.quantity_grams,
    nutrition_per_100g: entry.nutrition_per_100g,
    consumed_nutrition: entry.consumed_nutrition,
    source:
      source === "nutrition-chat"
        ? "nutrition-chat"
        : source === "whatsapp"
          ? "whatsapp"
          : source === "nutrition-form"
            ? "nutrition-form"
            : "system",
  };

  await meals.replaceOne({ _id: doc._id }, doc, { upsert: true });
}

export async function deleteMealMongo(
  date: string,
  id: string,
): Promise<boolean> {
  await ready();
  const meals = await mealsCollection();
  const result = await meals.deleteOne({ _id: id, date });
  return result.deletedCount === 1;
}

export async function readFoodDbMongo(): Promise<FoodDb> {
  await ready();
  const foods = await foodsCollection();
  const docs = await foods.find().toArray();
  const db: FoodDb = {};
  for (const doc of docs) {
    db[doc._id] = foodDocToEntry(doc);
  }
  return db;
}

export async function upsertFoodMongo(
  key: string,
  entry: FoodDbEntry,
): Promise<void> {
  await ready();
  const foods = await foodsCollection();
  const doc: FoodDoc = {
    _id: key,
    display_name: entry.display_name,
    per_100g: entry.per_100g,
    added_date: entry.added_date,
  };
  await foods.replaceOne({ _id: key }, doc, { upsert: true });
}

export async function deleteFoodMongo(key: string): Promise<boolean> {
  await ready();
  const foods = await foodsCollection();
  const result = await foods.deleteOne({ _id: key });
  return result.deletedCount === 1;
}

export async function readGoalsMongo(): Promise<MacroGoals> {
  await ready();
  const goals = await goalsCollection();
  const doc = await goals.findOne({ _id: "default" });
  if (!doc) return DEFAULT_GOALS;
  return {
    calories: doc.calories,
    protein_g: doc.protein_g,
    carb_g: doc.carb_g,
    fat_g: doc.fat_g,
  };
}

export async function writeGoalsMongo(goals: MacroGoals): Promise<void> {
  await ready();
  const coll = await goalsCollection();
  await coll.updateOne(
    { _id: "default" },
    {
      $set: {
        calories: goals.calories,
        protein_g: goals.protein_g,
        carb_g: goals.carb_g,
        fat_g: goals.fat_g,
        updated_at: new Date().toISOString(),
      },
      $setOnInsert: { _id: "default" },
    },
    { upsert: true },
  );
}

