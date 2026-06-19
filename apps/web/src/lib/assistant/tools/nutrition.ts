import { z } from "zod";
import { appendAudit, hashPayload } from "@/lib/audit";
import {
  readLog,
  readFoodDb,
  upsertFood,
  readGoals,
  insertMeal,
  calculateTotals,
  todayISO,
  type LogEntry,
  type NutritionPer100g,
} from "@/lib/nutrition";
import type { AssistantToolDefinition } from "@/lib/assistant/types";

const nutritionPer100gSchema = z.object({
  calories: z.number(),
  protein_g: z.number(),
  carb_g: z.number(),
  fat_g: z.number(),
  fiber_g: z.number().optional(),
  sugar_g: z.number().optional(),
});

const logFoodSchema = z.object({
  food_name: z.string(),
  quantity_grams: z.number(),
  nutrition_per_100g: nutritionPer100gSchema.optional(),
});

const searchFoodSchema = z.object({
  query: z.string(),
});

const addFoodSchema = z.object({
  food_name: z.string(),
  per_100g: nutritionPer100gSchema,
});

async function executeLogFood(
  args: z.infer<typeof logFoodSchema>,
): Promise<unknown> {
  const { food_name, quantity_grams } = args;
  let nutrition = args.nutrition_per_100g as NutritionPer100g | undefined;

  if (!nutrition) {
    const db = await readFoodDb();
    const key = food_name.trim().toLowerCase();
    const found = db[key];
    if (!found) {
      return {
        error: `"${food_name}" not in database. Provide nutrition_per_100g.`,
      };
    }
    nutrition = found.per_100g;
  }

  const factor = quantity_grams / 100;
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    food_name: food_name.trim(),
    quantity_grams,
    nutrition_per_100g: nutrition,
    consumed_nutrition: {
      calories: Math.round(nutrition.calories * factor * 10) / 10,
      protein_g: Math.round(nutrition.protein_g * factor * 10) / 10,
      carb_g: Math.round(nutrition.carb_g * factor * 10) / 10,
      fat_g: Math.round(nutrition.fat_g * factor * 10) / 10,
    },
  };

  const date = todayISO();
  await insertMeal(date, entry, "nutrition-chat");
  const entries = await readLog(date);
  const totals = calculateTotals(entries);

  appendAudit({
    source: "nutrition-chat",
    action: "nutrition.create",
    target: entry.timestamp,
    payload_hash: hashPayload(entry),
    meta: { date, food_name: entry.food_name, grams: entry.quantity_grams },
  });

  return { success: true, logged: entry.consumed_nutrition, totals };
}

export const nutritionTools: AssistantToolDefinition[] = [
  {
    name: "log_food",
    description:
      "Log a food entry for today. Call when the user mentions eating or drinking something.",
    module: "nutrition",
    boundary: "write",
    transport: "local",
    zodSchema: logFoodSchema,
    inputSchema: {
      type: "object",
      properties: {
        food_name: { type: "string", description: "Name of the food" },
        quantity_grams: { type: "number", description: "Quantity in grams" },
        nutrition_per_100g: {
          type: "object",
          description:
            "Per 100g macros — required if food is not in the database or from an image",
          properties: {
            calories: { type: "number" },
            protein_g: { type: "number" },
            carb_g: { type: "number" },
            fat_g: { type: "number" },
            fiber_g: { type: "number" },
            sugar_g: { type: "number" },
          },
          required: ["calories", "protein_g", "carb_g", "fat_g"],
        },
      },
      required: ["food_name", "quantity_grams"],
    },
    execute: (args) => executeLogFood(logFoodSchema.parse(args)),
  },
  {
    name: "get_daily_summary",
    description:
      "Get nutrition summary for today: totals eaten, goals, and remaining macros.",
    module: "nutrition",
    boundary: "read",
    transport: "local",
    zodSchema: z.object({}),
    inputSchema: { type: "object", properties: {} },
    execute: async () => {
      const date = todayISO();
      const entries = await readLog(date);
      const totals = calculateTotals(entries);
      const goals = await readGoals();
      return {
        date,
        totals,
        goals,
        remaining: {
          calories: Math.max(0, goals.calories - totals.calories),
          protein_g: Math.max(0, goals.protein_g - totals.protein_g),
          carb_g: Math.max(0, goals.carb_g - totals.carb_g),
          fat_g: Math.max(0, goals.fat_g - totals.fat_g),
        },
        meals: entries.map((e) => ({
          name: e.food_name,
          grams: e.quantity_grams,
          kcal: e.consumed_nutrition.calories,
        })),
      };
    },
  },
  {
    name: "search_food_db",
    description: "Search the food database by name.",
    module: "nutrition",
    boundary: "read",
    transport: "local",
    zodSchema: searchFoodSchema,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Food name to search" },
      },
      required: ["query"],
    },
    execute: async (args) => {
      const { query } = searchFoodSchema.parse(args);
      const q = query.toLowerCase();
      const db = await readFoodDb();
      const results = Object.entries(db)
        .filter(
          ([key, e]) =>
            key.includes(q) || e.display_name.toLowerCase().includes(q),
        )
        .slice(0, 5)
        .map(([key, e]) => ({ key, ...e }));
      return { results, count: results.length };
    },
  },
  {
    name: "add_food_to_db",
    description: "Save a new food to the database for future quick logging.",
    module: "nutrition",
    boundary: "write",
    transport: "local",
    zodSchema: addFoodSchema,
    inputSchema: {
      type: "object",
      properties: {
        food_name: { type: "string" },
        per_100g: {
          type: "object",
          properties: {
            calories: { type: "number" },
            protein_g: { type: "number" },
            carb_g: { type: "number" },
            fat_g: { type: "number" },
            fiber_g: { type: "number" },
            sugar_g: { type: "number" },
          },
          required: ["calories", "protein_g", "carb_g", "fat_g"],
        },
      },
      required: ["food_name", "per_100g"],
    },
    execute: async (args) => {
      const parsed = addFoodSchema.parse(args);
      const key = parsed.food_name.trim().toLowerCase();
      await upsertFood(key, {
        display_name: parsed.food_name.trim(),
        per_100g: parsed.per_100g,
        added_date: new Date().toISOString(),
      });
      return { success: true, key };
    },
  },
];
