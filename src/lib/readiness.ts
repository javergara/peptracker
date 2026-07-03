/**
 * Readiness score (pure, unit-tested): combines the latest sleep, HRV,
 * resting heart rate, and mood signals into a single 0-100 score.
 *
 * Normalization (documented, pragmatic — not clinical):
 * - sleep (hours): 0h → 0, 8h → 100, clamped (≥8h stays 100; diminishing
 *   returns past ~9h aren't modeled).
 * - hrv (ms, RMSSD-style): 20ms → 0, 100ms → 100 (higher is better). 20-100ms
 *   spans the typical adult resting HRV range.
 * - restingHr (bpm): 90bpm → 0, 40bpm → 100 (lower is better). 40-90bpm spans
 *   typical adult resting heart rate.
 * - mood (1-5 rating): linearly mapped to 0-100.
 *
 * Each present signal is normalized to 0-100, then combined as a weighted
 * average (sleep + HRV weighted higher — they're the strongest recovery
 * signals in the wearables literature; resting HR and mood weighted lower).
 * Missing signals are simply excluded, not treated as zero.
 */

export type ReadinessKey = "sleep" | "hrv" | "restingHr" | "mood";

/** Latest normalized inputs — null means "no recent data for this signal". */
export interface ReadinessInputs {
  /** Hours slept. */
  sleep: number | null;
  /** Heart-rate variability, ms (RMSSD-style). */
  hrv: number | null;
  /** Resting heart rate, bpm. */
  restingHr: number | null;
  /** Mood rating, 1-5. */
  mood: number | null;
}

export interface ReadinessComponent {
  key: ReadinessKey;
  /** The raw (un-normalized) input value. */
  value: number;
  /** This signal's 0-100 normalized contribution. */
  contribution: number;
}

export interface ReadinessResult {
  /** 0-100 overall score, rounded. */
  score: number;
  components: ReadinessComponent[];
  /** Keys of the signals that were available and used. */
  available: ReadinessKey[];
}

/** Sleep/HRV weighted higher than resting HR/mood (see module doc). */
const WEIGHTS: Record<ReadinessKey, number> = {
  sleep: 1.5,
  hrv: 1.5,
  restingHr: 1,
  mood: 1,
};

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Linear map from [lo, hi] to [0, 100], clamped. Set `invert` for lower-is-better. */
function normalizeRange(
  value: number,
  lo: number,
  hi: number,
  invert = false,
): number {
  const pct = ((value - lo) / (hi - lo)) * 100;
  return clamp(invert ? 100 - pct : pct);
}

const NORMALIZERS: Record<ReadinessKey, (v: number) => number> = {
  sleep: (h) => normalizeRange(h, 0, 8),
  hrv: (ms) => normalizeRange(ms, 20, 100),
  restingHr: (bpm) => normalizeRange(bpm, 40, 90, true),
  mood: (rating) => normalizeRange(rating, 1, 5),
};

const KEYS: ReadinessKey[] = ["sleep", "hrv", "restingHr", "mood"];

/**
 * Combine the latest available signals into a 0-100 readiness score. Returns
 * null when every input is null (nothing to compute).
 */
export function computeReadiness(
  inputs: ReadinessInputs,
): ReadinessResult | null {
  const components: ReadinessComponent[] = [];
  for (const key of KEYS) {
    const raw = inputs[key];
    if (raw == null || Number.isNaN(raw)) continue;
    components.push({ key, value: raw, contribution: NORMALIZERS[key](raw) });
  }
  if (components.length === 0) return null;

  const totalWeight = components.reduce((s, c) => s + WEIGHTS[c.key], 0);
  const weighted = components.reduce(
    (s, c) => s + c.contribution * WEIGHTS[c.key],
    0,
  );
  const score = Math.round(clamp(weighted / totalWeight));

  return { score, components, available: components.map((c) => c.key) };
}

/** Qualitative label for a 0-100 readiness score. */
export function readinessLabel(score: number): string {
  if (score >= 75) return "Rested";
  if (score >= 50) return "Moderate";
  return "Low";
}

/**
 * Derive readiness inputs from a set of recent measurements (any window —
 * caller decides how far back to look, e.g. last 14 days) plus today's
 * check-in ratings. Picks the most recently recorded value per measurement
 * type; mood comes from the check-in (not a Measurement).
 */
export function deriveReadinessInputs(params: {
  measurements: { type: string; value: number; recordedAt: Date }[];
  checkInRatings?: Record<string, number> | null;
}): ReadinessInputs {
  const latestByType = new Map<string, { value: number; recordedAt: Date }>();
  for (const m of params.measurements) {
    const existing = latestByType.get(m.type);
    if (!existing || m.recordedAt.getTime() > existing.recordedAt.getTime()) {
      latestByType.set(m.type, { value: m.value, recordedAt: m.recordedAt });
    }
  }

  return {
    sleep: latestByType.get("sleep")?.value ?? null,
    hrv: latestByType.get("hrv")?.value ?? null,
    restingHr: latestByType.get("restingHr")?.value ?? null,
    mood: params.checkInRatings?.mood ?? null,
  };
}
