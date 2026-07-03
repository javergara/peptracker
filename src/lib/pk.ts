/**
 * Estimated active-levels (pharmacokinetics) math — a simple one-compartment
 * exponential-decay model used ONLY to visualize the *relative* rise-and-fall
 * of a compound from logged doses. It is an educational estimate, NOT a
 * measured plasma concentration and NOT medical advice:
 *
 * - instantaneous absorption (each dose adds its full amount at `takenAt`);
 * - first-order elimination with the peptide's `halfLifeHours`;
 * - linear superposition of overlapping doses (levels add up).
 *
 * All pure — no DB, no React. Amounts are kept in whatever unit the caller
 * passes (we normalize per peptide before summing, so mixing mg/mcg across
 * peptides is fine as long as one peptide is internally consistent).
 */

const LN2 = Math.LN2;
const HOUR_MS = 3_600_000;

export interface PkDose {
  /** ms epoch of administration. */
  t: number;
  /** Dose amount (already normalized to the series unit). */
  amount: number;
}

export interface PkPoint {
  t: number;
  level: number;
}

/** Fraction of a dose remaining after `hoursElapsed`, given a half-life. */
export function remainingFraction(
  hoursElapsed: number,
  halfLifeHours: number,
): number {
  if (hoursElapsed <= 0) return 1;
  if (halfLifeHours <= 0) return 0;
  return Math.exp((-LN2 * hoursElapsed) / halfLifeHours);
}

/**
 * Active level at time `t` (ms) from all doses at or before it: sum of each
 * dose's remaining fraction. Doses after `t` don't contribute.
 */
export function levelAt(
  t: number,
  doses: PkDose[],
  halfLifeHours: number,
): number {
  let total = 0;
  for (const d of doses) {
    if (d.t > t) continue;
    total += d.amount * remainingFraction((t - d.t) / HOUR_MS, halfLifeHours);
  }
  return total;
}

/**
 * Sample the active-level curve across [from, to] (ms) at `stepHours`
 * resolution, plus a point exactly at each dose time so spikes aren't missed.
 * Returns points sorted by time. Empty when there are no doses or a
 * non-positive half-life.
 */
export function activeLevelSeries(
  doses: PkDose[],
  halfLifeHours: number,
  from: number,
  to: number,
  stepHours = 3,
): PkPoint[] {
  if (doses.length === 0 || halfLifeHours <= 0 || to <= from) return [];
  const step = Math.max(1, stepHours) * HOUR_MS;

  const times = new Set<number>();
  for (let t = from; t <= to; t += step) times.add(t);
  times.add(to);
  // Include each in-window dose instant for a crisp rise.
  for (const d of doses) {
    if (d.t >= from && d.t <= to) times.add(d.t);
  }

  return [...times]
    .sort((a, b) => a - b)
    .map((t) => ({ t, level: levelAt(t, doses, halfLifeHours) }));
}

/**
 * Time (hours) for the current level to decay below `fraction` of its value at
 * `now`, assuming no further doses — e.g. "~how long until it's mostly gone".
 * Returns null if already below or nothing on board.
 */
export function hoursUntilFraction(
  doses: PkDose[],
  halfLifeHours: number,
  now: number,
  fraction = 0.1,
): number | null {
  const current = levelAt(now, doses, halfLifeHours);
  if (current <= 0 || halfLifeHours <= 0) return null;
  // With a single decaying pool the future is dominated by the sum, which
  // decays with the half-life; solve current * (1/2)^(h/hl) = current*fraction.
  if (fraction <= 0 || fraction >= 1) return null;
  return (halfLifeHours * Math.log(1 / fraction)) / LN2;
}
