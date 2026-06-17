/**
 * MongoDB client singleton for the `nutrition-tracker` database.
 *
 * Reads MONGODB_URI from env (see .env.example). The database name comes from
 * the URI path (e.g. `mongodb://host:27017/nutrition-tracker`); if the path is
 * empty, falls back to `nutrition-tracker`.
 *
 * Required for nutrition: set MONGODB_URI (see .env.example).
 */

import type { Db, MongoClient as MongoClientType, Collection } from "mongodb";
import type { ClickUpTask } from "@/lib/integrations/clickup/types";

const DEFAULT_DB_NAME = "nutrition-tracker";

let clientPromise: Promise<MongoClientType> | null = null;

function getUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. See .env.example. " +
        "Example: mongodb://localhost:27017/nutrition-tracker",
    );
  }
  return uri;
}

function dbNameFromUri(uri: string): string {
  // mongodb://host[:port]/dbname?opts  |  mongodb+srv://host/dbname?opts
  try {
    const stripped = uri.replace(/^mongodb(\+srv)?:\/\//, "");
    const afterHost = stripped.split("/").slice(1).join("/");
    if (!afterHost) return DEFAULT_DB_NAME;
    const name = afterHost.split("?")[0].split("/")[0];
    return name || DEFAULT_DB_NAME;
  } catch {
    return DEFAULT_DB_NAME;
  }
}

export async function getMongoClient(): Promise<MongoClientType> {
  if (!clientPromise) {
    // Lazy-require so apps that don't touch Mongo don't pay the import cost
    // (and so the package can be installed lazily without breaking dev).
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(getUri());
    clientPromise = client.connect().catch((err) => {
      // Allow retry after mongod starts (singleton must not stay rejected forever).
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbNameFromUri(getUri()));
}

// ── Collections ──────────────────────────────────────────────────────
// Schemas mirror src/lib/nutrition.ts types until migration is complete.

export interface FoodDoc {
  _id: string; // slug, e.g. "nasi-putih"
  display_name: string;
  per_100g: {
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
  };
  added_date: string; // ISO date (YYYY-MM-DD)
}

export interface MealDoc {
  _id: string; // ISO timestamp (matches audit `target`)
  date: string; // YYYY-MM-DD in user's TZ; used for daily-totals queries
  timestamp: string; // full ISO timestamp
  food_name: string;
  food_id?: string; // FK to FoodDoc._id when resolved from DB
  quantity_grams: number;
  nutrition_per_100g: FoodDoc["per_100g"];
  consumed_nutrition: {
    calories: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
  };
  source: "nutrition-form" | "nutrition-chat" | "whatsapp" | "system";
}

export interface GoalsDoc {
  _id: "default"; // single-row collection keyed on a constant
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  updated_at: string;
}

export async function foodsCollection(): Promise<Collection<FoodDoc>> {
  const db = await getDb();
  return db.collection<FoodDoc>("foods");
}

export async function mealsCollection(): Promise<Collection<MealDoc>> {
  const db = await getDb();
  return db.collection<MealDoc>("meals");
}

export async function goalsCollection(): Promise<Collection<GoalsDoc>> {
  const db = await getDb();
  return db.collection<GoalsDoc>("goals");
}

// ── ClickUp cache ────────────────────────────────────────────────────
// Persistent read-through cache for ClickUp tasks. One doc per task so
// write-through is a single replaceOne and pruning is a deleteMany; every
// existing view (groupTasks, sprint filters) reconstructs from a flat find().

/** One cached ClickUp task. `_id` is the ClickUp task id. */
export interface ClickUpTaskDoc {
  _id: string;
  teamId: string; // active workspace — reads always filter by this
  task: ClickUpTask; // normalized shape from client.ts normalizeTask()
  listId: string; // == task.listId, denormalized for the sprint-list index
  isAssignee: boolean; // returned by the assignees[] filter
  isWatcher: boolean; // returned by the watchers[] filter
  inSprintList: boolean; // present in the resolved sprint list fetch
  syncedAt: string; // ISO; set on every sync / write-through
}

/** Singleton sync state per workspace. `_id` is the teamId. */
export interface ClickUpSyncMetaDoc {
  _id: string;
  syncedAt: string | null;
  sprintFolderId: string | null;
  sprintFolderName: string | null;
  sprintListId: string | null;
  sprintListName: string | null;
  syncStatus: "idle" | "syncing" | "ok" | "error";
  lastError?: string | null;
  taskCount?: number;
}

export async function clickupTasksCollection(): Promise<
  Collection<ClickUpTaskDoc>
> {
  const db = await getDb();
  return db.collection<ClickUpTaskDoc>("clickup_tasks");
}

export async function clickupSyncMetaCollection(): Promise<
  Collection<ClickUpSyncMetaDoc>
> {
  const db = await getDb();
  return db.collection<ClickUpSyncMetaDoc>("clickup_sync_meta");
}

/**
 * Idempotent index creation. Call once on first DB touch (or from a startup
 * route / migration script) — safe to re-run.
 */
export async function ensureIndexes(): Promise<void> {
  const meals = await mealsCollection();
  await meals.createIndex({ date: -1 });
  await meals.createIndex({ timestamp: -1 });

  const foods = await foodsCollection();
  await foods.createIndex({ display_name: 1 });

  const clickupTasks = await clickupTasksCollection();
  await clickupTasks.createIndex({ teamId: 1, syncedAt: -1 });
  await clickupTasks.createIndex({ teamId: 1, listId: 1 });
  await clickupTasks.createIndex({ teamId: 1, isAssignee: 1 });
}
