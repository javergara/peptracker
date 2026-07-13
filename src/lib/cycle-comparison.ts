/**
 * On-cycle vs off-cycle comparison for a metric/marker series (pure,
 * unit-tested). Splits a series' points into those that fall inside any cycle
 * (or supplement) window vs those outside, and reports the mean of each phase,
 * the delta, percent change, and a standardized effect size (Cohen's d).
 *
 * This is the headline "did the protocol move the needle?" analysis. It's
 * **descriptive**, not causal — the same Disclaimer/framing as correlations.
 */

/** A timestamped value (epoch ms). */
export interface PhasePoint {
  date: number;
  value: number;
}

/** A cycle/supplement window; `end: null` means ongoing (up to `now`). */
export interface PhaseWindow {
  start: number;
  end: number | null;
}

export interface PhaseComparison {
  onMean: number | null;
  offMean: number | null;
  onN: number;
  offN: number;
  /** onMean − offMean (null when either phase has no points). */
  delta: number | null;
  /** delta as a percent of the off-cycle mean (null when off mean is 0/absent). */
  percentChange: number | null;
  /**
   * Cohen's d effect size (delta / pooled SD). Null unless both phases have ≥2
   * points and the pooled SD is > 0. |d| ≈ 0.2 small, 0.5 medium, 0.8 large.
   */
  cohensD: number | null;
}

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/** Sample variance (n − 1 denominator); 0 for fewer than 2 points. */
function sampleVariance(xs: number[], m: number): number {
  if (xs.length < 2) return 0;
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
}

/** Whether `date` falls inside any window (inclusive; null end = up to `now`). */
export function inAnyWindow(
  date: number,
  windows: PhaseWindow[],
  now: number,
): boolean {
  return windows.some((w) => date >= w.start && date <= (w.end ?? now));
}

/**
 * Compare a series' on-window vs off-window values. Points exactly on a window
 * boundary count as on-cycle.
 */
export function comparePhases(
  points: PhasePoint[],
  windows: PhaseWindow[],
  now: number = Date.now(),
): PhaseComparison {
  const on: number[] = [];
  const off: number[] = [];
  for (const p of points) {
    if (inAnyWindow(p.date, windows, now)) on.push(p.value);
    else off.push(p.value);
  }

  const onMean = on.length ? mean(on) : null;
  const offMean = off.length ? mean(off) : null;
  const delta = onMean != null && offMean != null ? onMean - offMean : null;
  const percentChange =
    delta != null && offMean != null && offMean !== 0
      ? (delta / Math.abs(offMean)) * 100
      : null;

  let cohensD: number | null = null;
  if (on.length >= 2 && off.length >= 2 && onMean != null && offMean != null) {
    const vOn = sampleVariance(on, onMean);
    const vOff = sampleVariance(off, offMean);
    const pooledSd = Math.sqrt(
      ((on.length - 1) * vOn + (off.length - 1) * vOff) /
        (on.length + off.length - 2),
    );
    if (pooledSd > 0) cohensD = (onMean - offMean) / pooledSd;
  }

  return {
    onMean,
    offMean,
    onN: on.length,
    offN: off.length,
    delta,
    percentChange,
    cohensD,
  };
}

/** Qualitative label for a Cohen's d magnitude. */
export function effectSizeLabel(d: number | null): string | null {
  if (d == null) return null;
  const a = Math.abs(d);
  if (a < 0.2) return "negligible";
  if (a < 0.5) return "small";
  if (a < 0.8) return "medium";
  return "large";
}
