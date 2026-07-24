/**
 * Intermittent-fasting timer math (pure, unit-tested). An active fast is a
 * FastingSession with endedAt == null; these helpers derive the elapsed/goal
 * display from its startedAt + targetHours. No DB, no React.
 */

const HOUR_MS = 3_600_000;

/** Common fasting protocols (fasting-hours of a 24h day). */
export const FASTING_PRESETS = [
  { key: "14:10", label: "14:10", hours: 14 },
  { key: "16:8", label: "16:8", hours: 16 },
  { key: "18:6", label: "18:6", hours: 18 },
  { key: "20:4", label: "20:4", hours: 20 },
  { key: "omad", label: "OMAD (23:1)", hours: 23 },
] as const;

export interface FastingProgress {
  elapsedMs: number;
  elapsedHours: number;
  targetMs: number;
  /** 0–100, clamped. */
  pct: number;
  remainingMs: number;
  complete: boolean;
}

/** Progress of an active fast at `now`. */
export function fastingProgress(
  startedAt: Date,
  targetHours: number,
  now: Date = new Date(),
): FastingProgress {
  const targetMs = Math.max(1, targetHours) * HOUR_MS;
  const elapsedMs = Math.max(0, now.getTime() - startedAt.getTime());
  const pct = Math.min(100, Math.round((elapsedMs / targetMs) * 100));
  return {
    elapsedMs,
    elapsedHours: elapsedMs / HOUR_MS,
    targetMs,
    pct,
    remainingMs: Math.max(0, targetMs - elapsedMs),
    complete: elapsedMs >= targetMs,
  };
}

/** Format a duration in ms as "12h 34m" (or "34m" under an hour). */
export function formatDuration(ms: number): string {
  const totalMin = Math.floor(Math.max(0, ms) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
