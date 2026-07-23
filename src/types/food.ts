import { z } from "zod";

/**
 * Food & calorie tracker config — source of truth for meal types and macro
 * metadata. Meal type is stored as a plain String on FoodLog (SQLite-origin
 * style) so adding a meal type here never needs a migration. Keep keys stable;
 * they key historical rows and the daily grouping.
 */
export const MEAL_TYPES = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
] as const;

export type MealTypeKey = (typeof MEAL_TYPES)[number]["key"];

export const MEAL_TYPE_KEYS = MEAL_TYPES.map((m) => m.key) as MealTypeKey[];

export const MEAL_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  MEAL_TYPES.map((m) => [m.key, m.label]),
);

/** Coerce arbitrary input to a known meal type (falls back to "snack"). */
export function parseMealType(value: unknown): MealTypeKey {
  return MEAL_TYPE_KEYS.includes(value as MealTypeKey)
    ? (value as MealTypeKey)
    : "snack";
}

/**
 * Macronutrients — grams→kcal factor (Atwater) + a brand chart color token.
 * Used by the daily macro bars and the metrics split. Fiber is tracked as an
 * optional extra column, not a headline macro, so it's not listed here.
 */
export const MACROS = [
  { key: "protein", label: "Protein", kcalPerGram: 4, color: "var(--chart-1)" },
  { key: "carbs", label: "Carbs", kcalPerGram: 4, color: "var(--chart-2)" },
  { key: "fat", label: "Fat", kcalPerGram: 9, color: "var(--chart-3)" },
] as const;

export type MacroKey = (typeof MACROS)[number]["key"];

export const MACRO_KEYS = MACROS.map((m) => m.key) as MacroKey[];

/** A validated numeric-nutrition shape for parsing form input. */
export const nutritionInputSchema = z.object({
  calories: z.number().min(0).max(100000),
  protein: z.number().min(0).max(10000),
  carbs: z.number().min(0).max(10000),
  fat: z.number().min(0).max(10000),
  fiber: z.number().min(0).max(10000).nullable().optional(),
});
export type NutritionInput = z.infer<typeof nutritionInputSchema>;
