/**
 * Cost estimation for a peptide supply — pure, tested, no DB/React. Turns a
 * vial/stock price + planned dosing into cost-per-dose, per-month, per-cycle.
 * All amounts in mcg (convert mg→mcg before calling). Educational estimate.
 */

import { frequencyDosesPerDay } from "@/lib/stock";

/** Number of doses a single vial of `vialMcg` yields at `doseMcg` per dose. */
export function dosesPerVial(vialMcg: number, doseMcg: number | null): number {
  if (!doseMcg || doseMcg <= 0 || vialMcg <= 0) return 0;
  return Math.floor(vialMcg / doseMcg);
}

/** Cost of a single dose given a vial price + size + dose. Null if unknown. */
export function costPerDose(
  price: number | null,
  vialMcg: number,
  doseMcg: number | null,
): number | null {
  const n = dosesPerVial(vialMcg, doseMcg);
  if (price == null || price < 0 || n <= 0) return null;
  return price / n;
}

/** Estimated monthly cost (30.44 days) at a dosing frequency. Null if unknown. */
export function costPerMonth(
  perDose: number | null,
  frequency: string,
): number | null {
  if (perDose == null) return null;
  const perDay = frequencyDosesPerDay(frequency);
  if (perDay == null) return null;
  return perDose * perDay * 30.44;
}

/** Estimated cost across `days` at a dosing frequency. Null if unknown. */
export function costOverDays(
  perDose: number | null,
  frequency: string,
  days: number,
): number | null {
  if (perDose == null || days <= 0) return null;
  const perDay = frequencyDosesPerDay(frequency);
  if (perDay == null) return null;
  return perDose * perDay * days;
}

/** Format a number as a currency amount (default USD-style, no locale deps). */
export function formatCost(value: number | null, symbol = "$"): string {
  if (value == null) return "—";
  return `${symbol}${value.toFixed(2)}`;
}

/** One priced inventory line — `amount` is the total money for that line. */
export interface SpendItem {
  peptideId: string;
  peptideName: string;
  amount: number;
}

export interface SpendSummary {
  /** Total money invested across all priced lines. */
  total: number;
  /** Per-peptide totals, highest spend first. */
  byPeptide: { peptideId: string; peptideName: string; amount: number }[];
  /** How many lines carried a usable price (drives an "add prices" hint). */
  pricedLines: number;
}

/**
 * Aggregate what's been spent across priced inventory lines (active vials +
 * stock reserve). Lines with no/invalid price are ignored. Pure — the caller
 * turns each vial/stock row into a `{ amount }` (vial = its price; stock =
 * price × quantity) before passing them in.
 */
export function aggregateSpend(items: SpendItem[]): SpendSummary {
  const priced = items.filter((i) => Number.isFinite(i.amount) && i.amount > 0);
  const byId = new Map<string, { peptideName: string; amount: number }>();
  let total = 0;
  for (const i of priced) {
    total += i.amount;
    const cur = byId.get(i.peptideId);
    if (cur) cur.amount += i.amount;
    else
      byId.set(i.peptideId, { peptideName: i.peptideName, amount: i.amount });
  }
  const byPeptide = Array.from(byId.entries())
    .map(([peptideId, v]) => ({ peptideId, ...v }))
    .sort(
      (a, b) =>
        b.amount - a.amount || a.peptideName.localeCompare(b.peptideName),
    );
  return { total, byPeptide, pricedLines: priced.length };
}
