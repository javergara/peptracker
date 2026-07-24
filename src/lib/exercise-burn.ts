/**
 * Rough exercise-calorie estimates (pure, unit-tested) for the "net calories"
 * view: calories remaining = goal − intake + exercise burn. Deliberately simple
 * and clearly-labeled as an estimate — not a substitute for a HR/wearable value.
 */

/** ~0.04 kcal per step is the common rule-of-thumb (varies with weight/pace). */
const KCAL_PER_STEP = 0.04;
/** Default MET for unspecified "workout" minutes (moderate effort). */
const DEFAULT_MET = 5;

/** Calories from step count. */
export function stepsBurn(steps: number): number {
  if (!Number.isFinite(steps) || steps <= 0) return 0;
  return Math.round(steps * KCAL_PER_STEP);
}

/**
 * Calories from workout minutes via the MET formula:
 * kcal = MET · 3.5 · kg / 200 · minutes. Falls back to 70 kg when weight is
 * unknown and MET 5 when effort is unspecified.
 */
export function workoutBurn(
  minutes: number,
  weightKg = 70,
  met = DEFAULT_MET,
): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  const kg = weightKg > 0 ? weightKg : 70;
  return Math.round(((met * 3.5 * kg) / 200) * minutes);
}

/** Total estimated exercise burn for a day (steps + workout minutes). */
export function exerciseBurn({
  steps = 0,
  workoutMinutes = 0,
  weightKg = 70,
}: {
  steps?: number;
  workoutMinutes?: number;
  weightKg?: number;
}): number {
  return stepsBurn(steps) + workoutBurn(workoutMinutes, weightKg);
}
