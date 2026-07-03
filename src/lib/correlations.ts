/**
 * Proactive correlation insight discovery (pure, unit-tested).
 *
 * Scans every pair of logged series (measurements, mood/energy, lab markers,
 * check-ins, …) and surfaces the strongest, best-sampled relationships as
 * ranked `Insight`s — so users don't have to manually hunt with the
 * CorrelationExplorer. Reuses `linearRegression`/`correlationStrength` from
 * `stats.ts` for the actual math.
 */
import { correlationStrength, linearRegression } from "@/lib/stats";

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
  direction: CorrelationDirection;
  /** Qualitative strength label from `correlationStrength` (e.g. "strong"). */
  strength: string;
}

export interface FindCorrelationsOptions {
  /** Minimum paired points required to consider a pair. Default 5. */
  minN?: number;
  /** Minimum |r| required to keep a pair. Default 0.5. */
  threshold?: number;
  /** Max number of insights returned. Default 6. */
  topK?: number;
  /** Max ms apart two points may be to be paired. Default 14 days. */
  pairWindowMs?: number;
}

const DEFAULT_MIN_N = 5;
const DEFAULT_THRESHOLD = 0.5;
const DEFAULT_TOP_K = 6;
const DEFAULT_PAIR_WINDOW_MS = 14 * 86_400_000;

/**
 * Pair each `b` point with the nearest `a` point within `windowMs`, mirroring
 * the CorrelationExplorer's "nearest date within 14 days" pairing approach.
 */
function pairByNearestDate(
  a: CorrelationPoint[],
  b: CorrelationPoint[],
  windowMs: number,
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (const yPoint of b) {
    let best: { diff: number; value: number } | null = null;
    for (const xPoint of a) {
      const diff = Math.abs(xPoint.date - yPoint.date);
      if (diff <= windowMs && (!best || diff < best.diff)) {
        best = { diff, value: xPoint.value };
      }
    }
    if (best) out.push({ x: best.value, y: yPoint.value });
  }
  return out;
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
  const topK = opts?.topK ?? DEFAULT_TOP_K;
  const pairWindowMs = opts?.pairWindowMs ?? DEFAULT_PAIR_WINDOW_MS;

  const usable = series.filter((s) => s.points.length > 0);

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
  return `Higher ${insight.aLabel} tends to go with ${qualifier} ${insight.bLabel} (r = ${signedR}, n = ${insight.n}).`;
}
