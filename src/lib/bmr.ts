/**
 * BMR / TDEE from body stats (pure, unit-tested) — the Mifflin-St Jeor equation.
 * This is the FORMULA-based estimate that seeds the food goal wizard; the
 * data-driven counterpart is src/lib/tdee.ts (learns from real weight + intake).
 * Educational estimate, not medical advice.
 */

export type Sex = "M" | "F";

export interface BmrInputs {
  weightKg: number;
  heightCm: number;
  age: number;
  /** Non-M/F profiles: pass the average of the two (caller decides). */
  sex: Sex;
}

/** Activity multipliers applied to BMR to get TDEE. */
export const ACTIVITY_LEVELS = [
  { key: "sedentary", label: "Sedentary (little exercise)", factor: 1.2 },
  { key: "light", label: "Light (1–3 days/wk)", factor: 1.375 },
  { key: "moderate", label: "Moderate (3–5 days/wk)", factor: 1.55 },
  { key: "active", label: "Active (6–7 days/wk)", factor: 1.725 },
  { key: "athlete", label: "Athlete (2x/day)", factor: 1.9 },
] as const;

export type ActivityKey = (typeof ACTIVITY_LEVELS)[number]["key"];

export function activityFactor(key: string): number {
  return ACTIVITY_LEVELS.find((a) => a.key === key)?.factor ?? 1.2;
}

/**
 * Mifflin-St Jeor BMR (kcal/day). Returns null when any input is missing/invalid
 * (the wizard then prompts for it). Base: 10·kg + 6.25·cm − 5·age + s, where
 * s = +5 (male) / −161 (female).
 */
export function mifflinStJeorBmr(inputs: Partial<BmrInputs>): number | null {
  const { weightKg, heightCm, age, sex } = inputs;
  if (
    !weightKg ||
    !heightCm ||
    !age ||
    weightKg <= 0 ||
    heightCm <= 0 ||
    age <= 0 ||
    (sex !== "M" && sex !== "F")
  ) {
    return null;
  }
  const s = sex === "M" ? 5 : -161;
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + s);
}

/** TDEE = BMR × activity factor (null-safe). */
export function tdeeFromBmr(
  bmr: number | null,
  activity: string,
): number | null {
  if (bmr == null) return null;
  return Math.round(bmr * activityFactor(activity));
}

/**
 * A pragmatic macro split for a calorie target: protein at 1.8 g/kg bodyweight,
 * fat at 25% of calories, carbs filling the rest. Grams, rounded.
 */
export function suggestMacros(
  calories: number,
  weightKg: number,
): { protein: number; carbs: number; fat: number } {
  if (calories <= 0) return { protein: 0, carbs: 0, fat: 0 };
  const protein = Math.round((weightKg > 0 ? 1.8 * weightKg : 0) || 0);
  const fat = Math.round((calories * 0.25) / 9);
  const proteinCals = protein * 4;
  const fatCals = fat * 9;
  const carbs = Math.max(0, Math.round((calories - proteinCals - fatCals) / 4));
  return { protein, carbs, fat };
}
