/**
 * "What changed during this cycle" — pure, tested, no DB/React. Compares a
 * metric's value just before a cycle started (baseline) against its latest
 * value inside the cycle window, for any metric (measurement or lab marker)
 * that has data on both sides. Correlational only — see the disclaimer.
 */

/** A single dated value for some metric (a measurement or a lab result). */
export interface MetricPoint {
  /** Stable identity for the metric (e.g. "weight", a biomarker slug). */
  key: string;
  label: string;
  unit: string | null;
  date: Date;
  value: number;
}

export interface CycleInsight {
  key: string;
  label: string;
  unit: string | null;
  /** Average of the pre-cycle (baseline window) points. */
  baseline: number;
  /** Most recent in-cycle point. */
  latest: number;
  deltaAbs: number;
  /** Percent change from baseline, or null when baseline is 0. */
  deltaPct: number | null;
  direction: "up" | "down" | "flat";
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** How far back before the cycle start to look for a baseline value. */
export const BASELINE_WINDOW_DAYS = 30;

/**
 * Compute before/after insights for every metric with ≥1 point in the
 * baseline window (the `BASELINE_WINDOW_DAYS` before `cycleStart`) AND ≥1
 * point inside the cycle window `[cycleStart, cycleEnd]`. Ranked by the
 * magnitude of percent change (largest first; metrics with an unknown percent
 * change — zero baseline — sort last).
 */
export function computeCycleInsights(
  points: MetricPoint[],
  cycleStart: Date,
  cycleEnd: Date,
): CycleInsight[] {
  const baselineStart = new Date(
    cycleStart.getTime() - BASELINE_WINDOW_DAYS * DAY_MS,
  );
  const startMs = cycleStart.getTime();
  const endMs = cycleEnd.getTime();
  const baselineStartMs = baselineStart.getTime();

  const byKey = new Map<
    string,
    {
      label: string;
      unit: string | null;
      baseline: MetricPoint[];
      inCycle: MetricPoint[];
    }
  >();

  for (const p of points) {
    const entry = byKey.get(p.key) ?? {
      label: p.label,
      unit: p.unit,
      baseline: [],
      inCycle: [],
    };
    const t = p.date.getTime();
    if (t >= baselineStartMs && t < startMs) {
      entry.baseline.push(p);
    } else if (t >= startMs && t <= endMs) {
      entry.inCycle.push(p);
    }
    byKey.set(p.key, entry);
  }

  const results: CycleInsight[] = [];
  for (const entry of byKey.values()) {
    if (entry.baseline.length === 0 || entry.inCycle.length === 0) continue;

    const baseline =
      entry.baseline.reduce((sum, p) => sum + p.value, 0) /
      entry.baseline.length;
    const latestPoint = entry.inCycle.reduce((latest, p) =>
      p.date.getTime() > latest.date.getTime() ? p : latest,
    );
    const latest = latestPoint.value;
    const deltaAbs = latest - baseline;
    const deltaPct = baseline !== 0 ? (deltaAbs / baseline) * 100 : null;
    const direction: CycleInsight["direction"] =
      deltaAbs > 0 ? "up" : deltaAbs < 0 ? "down" : "flat";

    results.push({
      key: latestPoint.key,
      label: entry.label,
      unit: entry.unit,
      baseline,
      latest,
      deltaAbs,
      deltaPct,
      direction,
    });
  }

  return results.sort((a, b) => {
    const am = a.deltaPct == null ? -1 : Math.abs(a.deltaPct);
    const bm = b.deltaPct == null ? -1 : Math.abs(b.deltaPct);
    return bm - am;
  });
}
