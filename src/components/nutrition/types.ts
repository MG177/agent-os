export type NutritionView = "today" | "log" | "library";

export interface LogEntry {
  timestamp: string;
  food_name: string;
  quantity_grams: number;
  consumed_nutrition: {
    calories: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
  };
}

export interface MacroGoals {
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
}

export interface DailyTotals {
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  meal_count: number;
}

export interface FoodEntry {
  key: string;
  display_name: string;
  per_100g: {
    calories: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
    fiber_g?: number;
    sugar_g?: number;
  };
  added_date?: string;
}

export function parseNutritionView(
  value: string | null | undefined,
): NutritionView {
  if (value === "log" || value === "library") return value;
  return "today";
}
