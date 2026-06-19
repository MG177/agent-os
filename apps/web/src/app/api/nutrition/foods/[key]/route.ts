import { NextRequest } from "next/server";
import {
  deleteFood,
  readFoodDb,
  upsertFood,
  type FoodDbEntry,
  type NutritionPer100g,
} from "@/lib/nutrition";

const REQUIRED_MACROS = ["calories", "protein_g", "carb_g", "fat_g"] as const;

function validatePer100g(per_100g: unknown): per_100g is NutritionPer100g {
  if (!per_100g || typeof per_100g !== "object") return false;
  const p = per_100g as Record<string, unknown>;
  for (const field of REQUIRED_MACROS) {
    if (p[field] === undefined || typeof p[field] !== "number") return false;
  }
  return true;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key: rawKey } = await params;
  const oldKey = decodeURIComponent(rawKey);
  const body = await request.json().catch(() => ({}));
  const { food_name, per_100g } = body;

  if (!validatePer100g(per_100g)) {
    return Response.json(
      { error: "per_100g with calories, protein_g, carb_g, fat_g is required" },
      { status: 400 },
    );
  }

  const db = await readFoodDb();
  const existing = db[oldKey];
  if (!existing) {
    return Response.json({ error: "Food not found" }, { status: 404 });
  }

  const displayName =
    typeof food_name === "string" && food_name.trim()
      ? food_name.trim()
      : existing.display_name;
  const newKey = displayName.toLowerCase();

  if (newKey !== oldKey && db[newKey]) {
    return Response.json(
      { error: "A food with that name already exists" },
      { status: 409 },
    );
  }

  const entry: FoodDbEntry = {
    display_name: displayName,
    per_100g,
    added_date: existing.added_date,
  };

  await upsertFood(newKey, entry);
  if (newKey !== oldKey) {
    await deleteFood(oldKey);
  }

  return Response.json({ key: newKey, entry });
}
