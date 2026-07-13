/**
 * Proactive correlation insight discovery (pure, unit-tested).
 *
 * Scans every pair of logged series (measurements, mood/energy, lab markers,
 * check-ins, …) and surfaces the strongest, best-sampled relationships as
 * ranked `Insight`s — so users don't have to manually hunt with the
 * CorrelationExplorer. Reuses `linearRegression`/`correlationStrength` from
 * `stats.ts` for the actual math.
 */
import {
  correlationStrength,
  linearRegression,
  pearsonPValue,
} from "@/lib/stats";

/** A single data point in a series: epoch-ms timestamp + numeric value. */
export interface CorrelationPoint {
  date: number;
  value: number;
}

/** A named, orderable data series to search for correlations within. */
export interface CorrelationSeries {
  key: string;
  label: string;
  unit?: string | null;
  points: CorrelationPoint[];
}

export type CorrelationDirection = "positive" | "inverse";

export interface Insight {
  aKey: string;
  aLabel: string;
  aUnit?: string | null;
  bKey: string;
  bLabel: string;
  bUnit?: string | null;
  /** Pearson r (signed). */
  r: number;
  rSquared: number;
  /** Number of paired points the correlation was computed over. */
  n: number;
  /** Two-tailed p-value that the correlation differs from zero. */
  pValue: number;
  /**
   * True when BOTH series move strongly with time over the window — the apparent
   * correlation may be a shared time-trend artifact (e.g. both drift during a
   * cycle) rather than a real relationship. Surfaced as a caveat, not hidden.
   */
  coTrended: boolean;
  direction: CorrelationDirection;
  /** Qualitative strength label from `correlationStrength` (e.g. "strong"). */
  strength: string;
}

export interface FindCorrelationsOptions {
  /** Minimum paired points required to consider a pair. Default 6. */
  minN?: number;
  /** Minimum |r| required to keep a pair. Default 0.5. */
  threshold?: number;
  /** Max two-tailed p-value to keep a pair (significance gate). Default 0.05. */
  maxP?: number;
  /** Max number of insights returned. Default 6. */
  topK?: number;
  /** Max ms apart two points may be to be paired. Default 14 days. */
  pairWindowMs?: number;
}

const DEFAULT_MIN_N = 6;
const DEFAULT_THRESHOLD = 0.5;
const DEFAULT_MAX_P = 0.05;
const DEFAULT_TOP_K = 6;
const DEFAULT_PAIR_WINDOW_MS = 14 * 86_400_000;
/** |r| vs time above which a series counts as strongly time-trending. */
const CO_TREND_R = 0.7;

/**
 * Pair `a` and `b` points **one-to-one** by nearest date within `windowMs`:
 * each point is used at most once (greedy closest-first matching). This avoids
 * the independence violation of reusing one `a` value against many `b` values,
 * which inflates both the sample size and the correlation. Exported so the
 * CorrelationExplorer pairs identically.
 */
export function pairByNearestDate(
  a: CorrelationPoint[],
  b: CorrelationPoint[],
  windowMs: number,
): { x: number; y: number }[] {
  const candidates: { diff: number; ai: number; bi: number }[] = [];
  for (let bi = 0; bi < b.length; bi++) {
    for (let ai = 0; ai < a.length; ai++) {
      const diff = Math.abs(a[ai].date - b[bi].date);
      if (diff <= windowMs) candidates.push({ diff, ai, bi });
    }
  }
  candidates.sort((p, q) => p.diff - q.diff);
  const usedA = new Set<number>();
  const usedB = new Set<number>();
  const out: { x: number; y: number }[] = [];
  for (const c of candidates) {
    if (usedA.has(c.ai) || usedB.has(c.bi)) continue;
    usedA.add(c.ai);
    usedB.add(c.bi);
    out.push({ x: a[c.ai].value, y: b[c.bi].value });
  }
  return out;
}

/** |Pearson r| of a series against time — how strongly it trends over the window. */
function timeTrendStrength(points: CorrelationPoint[]): number {
  if (points.length < 3) return 0;
  return Math.abs(
    linearRegression(points.map((p) => ({ x: p.date, y: p.value }))).r,
  );
}

/**
 * Find the strongest, best-sampled correlations across every unordered pair
 * of series. Ranked by |r| × √n (favors relationships that are both strong
 * AND well-sampled, so a noisy r=0.9 over 5 points doesn't outrank a stable
 * r=0.6 over 40 points).
 */
export function findStrongCorrelations(
  series: CorrelationSeries[],
  opts?: FindCorrelationsOptions,
): Insight[] {
  const minN = opts?.minN ?? DEFAULT_MIN_N;
  const threshold = opts?.threshold ?? DEFAULT_THRESHOLD;
  const maxP = opts?.maxP ?? DEFAULT_MAX_P;
  const topK = opts?.topK ?? DEFAULT_TOP_K;
  const pairWindowMs = opts?.pairWindowMs ?? DEFAULT_PAIR_WINDOW_MS;

  const usable = series.filter((s) => s.points.length > 0);
  const trendStrength = new Map(
    usable.map((s) => [s.key, timeTrendStrength(s.points)]),
  );

  const scored: (Insight & { score: number })[] = [];

  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const a = usable[i];
      const b = usable[j];
      const paired = pairByNearestDate(a.points, b.points, pairWindowMs);
      if (paired.length < minN) continue;

      const reg = linearRegression(paired.map((p) => ({ x: p.x, y: p.y })));
      if (reg.n < minN) continue;
      if (Math.abs(reg.r) < threshold) continue;

      // Significance gate: reject correlations that could plausibly be noise
      // (a small-sample r=0.5 is not significant). With ~dozens of pairs scanned
      // this also curbs the multiple-comparisons false-positive rate.
      const pValue = pearsonPValue(reg.r, reg.n);
      if (pValue > maxP) continue;

      const coTrended =
        (trendStrength.get(a.key) ?? 0) >= CO_TREND_R &&
        (trendStrength.get(b.key) ?? 0) >= CO_TREND_R;

      scored.push({
        aKey: a.key,
        aLabel: a.label,
        aUnit: a.unit,
        bKey: b.key,
        bLabel: b.label,
        bUnit: b.unit,
        r: reg.r,
        rSquared: reg.r2,
        n: reg.n,
        pValue,
        coTrended,
        direction: reg.r >= 0 ? "positive" : "inverse",
        strength: correlationStrength(reg.r),
        score: Math.abs(reg.r) * Math.sqrt(reg.n),
      });
    }
  }

  scored.sort((x, y) => y.score - x.score);

  return scored.slice(0, topK).map((s) => ({
    aKey: s.aKey,
    aLabel: s.aLabel,
    aUnit: s.aUnit,
    bKey: s.bKey,
    bLabel: s.bLabel,
    bUnit: s.bUnit,
    r: s.r,
    rSquared: s.rSquared,
    n: s.n,
    pValue: s.pValue,
    coTrended: s.coTrended,
    direction: s.direction,
    strength: s.strength,
  }));
}

/**
 * Turn an Insight into a plain, correlational (never causal) sentence, e.g.
 * "Higher sleep tends to go with higher HRV (r = 0.62, n = 18)." or
 * "Higher BPC-157 dose tends to go with lower weight (r = -0.58, n = 12)."
 */
export function describeInsight(insight: Insight): string {
  const qualifier = insight.direction === "positive" ? "higher" : "lower";
  const signedR = `${insight.r < 0 ? "−" : ""}${Math.abs(insight.r).toFixed(2)}`;
  const caveat = insight.coTrended
    ? " Both also trend over time, so this may reflect a shared trend rather than a direct link."
    : "";
  return `Higher ${insight.aLabel} tends to go with ${qualifier} ${insight.bLabel} (r = ${signedR}, n = ${insight.n}).${caveat}`;
}
