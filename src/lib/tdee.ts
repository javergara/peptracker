import { linearRegression } from "@/lib/stats";

/**
 * Adaptive TDEE (total daily energy expenditure) estimate — pure, unit-tested.
 *
 * Idea (MacroFactor-style): your real maintenance calories aren't a formula —
 * they're revealed by how your weight actually trends against how much you
 * actually eat. Over a window:
 *
 *   energy balance/day (kcal) = weight slope (kg/day) × KCAL_PER_KG
 *   TDEE ≈ average daily intake (kcal) − energy balance/day
 *
 * i.e. if you ate 2200 kcal/day and gained 0.1 kg/week, you were in a small
 * surplus, so maintenance is a bit under 2200. If weight held flat, TDEE ≈
 * intake. This is an educational estimate, NOT medical advice — surface it under
 * the Disclaimer. Needs enough paired days to be trustworthy (see `confidence`).
 */

/** 1 kg of body-mass change ≈ 7700 kcal (the classic ~3500 kcal/lb figure). */
export const KCAL_PER_KG = 7700;

const DAY_MS = 86_400_000;
/** Below this many logged-intake days the estimate is treated as low/none. */
const MIN_DAYS_FOR_ESTIMATE = 10;
const GOOD_DAYS = 21;

export type TdeeConfidence = "none" | "low" | "medium" | "high";

export interface TdeePoint {
  /** Epoch ms (day granularity is fine). */
  t: number;
  /** Value: kcal for intake, kg for weight. */
  value: number;
}

export interface TdeeResult {
  /** Estimated maintenance calories, rounded — null when not enough data. */
  tdeeKcal: number | null;
  /** Average logged daily intake over the window (kcal). */
  avgIntakeKcal: number;
  /** Weight trend over the window (kg per week; negative = losing). */
  weightSlopeKgPerWeek: number;
  /** Net energy balance per day implied by the weight trend (kcal). */
  energyBalanceKcalPerDay: number;
  /** Number of days with logged intake used. */
  intakeDays: number;
  /** Number of weight readings used. */
  weightReadings: number;
  confidence: TdeeConfidence;
}

/** Bucket points to local-day midnight epoch and average per day. */
function averagePerDay(points: TdeePoint[]): { t: number; value: number }[] {
  const byDay = new Map<number, { sum: number; n: number }>();
  for (const p of points) {
    const day = Math.floor(p.t / DAY_MS) * DAY_MS;
    const cur = byDay.get(day) ?? { sum: 0, n: 0 };
    cur.sum += p.value;
    cur.n += 1;
    byDay.set(day, cur);
  }
  return [...byDay.entries()]
    .map(([t, { sum, n }]) => ({ t, value: sum / n }))
    .sort((a, b) => a.t - b.t);
}

function confidenceFor(
  intakeDays: number,
  weightReadings: number,
): TdeeConfidence {
  if (intakeDays < MIN_DAYS_FOR_ESTIMATE || weightReadings < 2) return "none";
  if (intakeDays >= GOOD_DAYS && weightReadings >= 6) return "high";
  if (intakeDays >= 14 && weightReadings >= 4) return "medium";
  return "low";
}

/**
 * Estimate TDEE from daily intake + weight series. Both are raw point lists
 * (multiple readings per day are averaged). Returns `tdeeKcal: null` when there
 * isn't enough data (confidence "none").
 */
export function computeTdee({
  intake,
  weight,
}: {
  /** Calorie-intake points (typically one per day). */
  intake: TdeePoint[];
  /** Bodyweight points in kg. */
  weight: TdeePoint[];
}): TdeeResult {
  const intakeDaily = averagePerDay(intake);
  const weightDaily = averagePerDay(weight);

  const avgIntakeKcal =
    intakeDaily.length > 0
      ? Math.round(
          intakeDaily.reduce((s, p) => s + p.value, 0) / intakeDaily.length,
        )
      : 0;

  // Weight slope in kg/day via OLS on (day, kg). Regress on day index to keep
  // the x-magnitude small and numerically stable.
  const reg = linearRegression(
    weightDaily.map((p) => ({ x: p.t / DAY_MS, y: p.value })),
  );
  const slopeKgPerDay = weightDaily.length >= 2 ? reg.slope : 0;
  const weightSlopeKgPerWeek = Math.round(slopeKgPerDay * 7 * 100) / 100;
  const energyBalanceKcalPerDay = Math.round(slopeKgPerDay * KCAL_PER_KG);

  const confidence = confidenceFor(intakeDaily.length, weightDaily.length);
  const tdeeKcal =
    confidence === "none"
      ? null
      : Math.round(avgIntakeKcal - energyBalanceKcalPerDay);

  return {
    tdeeKcal,
    avgIntakeKcal,
    weightSlopeKgPerWeek,
    energyBalanceKcalPerDay,
    intakeDays: intakeDaily.length,
    weightReadings: weightDaily.length,
    confidence,
  };
}

/**
 * Suggested daily calorie target for a goal rate of weight change.
 * `rateKgPerWeek` negative = lose, positive = gain, 0 = maintain.
 * Returns null when TDEE is unknown.
 */
export function suggestGoalCalories(
  tdeeKcal: number | null,
  rateKgPerWeek: number,
): number | null {
  if (tdeeKcal == null) return null;
  const dailyDelta = (rateKgPerWeek * KCAL_PER_KG) / 7;
  return Math.round(tdeeKcal + dailyDelta);
}
