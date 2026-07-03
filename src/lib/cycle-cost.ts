/**
 * Cost estimate for a dosing cycle — pure, tested, no DB/React. Wraps
 * `src/lib/cost.ts`'s per-dose math with a "spent so far" (logged doses ×
 * cost/dose) and a "projected" total (the cycle's fixed span, or per-month for
 * an open-ended cycle). One input per peptide the cycle doses (a single-
 * peptide cycle has one; a stack cycle has one per stack peptide) — sum with
 * `sumCyclePeptideCosts`. Educational estimate, not a guarantee of price.
 */

import { costOverDays, costPerDose, costPerMonth } from "@/lib/cost";

/** A priced vial or stock item used as the cost source for a peptide. */
export interface PricedSupply {
  price: number;
  /** Size of one vial, in mcg. */
  vialMcg: number;
}

export interface CyclePeptideCostInput {
  peptideId: string;
  /** Dose per administration, in mcg. Null when unconfigured. */
  doseMcg: number | null;
  frequency: string;
  supply: PricedSupply | null;
  /** Doses already logged against this cycle for this peptide. */
  loggedDoseCount: number;
}

export interface CyclePeptideCost {
  peptideId: string;
  perDose: number | null;
  spentSoFar: number | null;
  /** Projected total across the cycle span (fixed length) or per month (open-ended). */
  projected: number | null;
}

/**
 * Cost estimate for one peptide's contribution to a cycle. `days` is the
 * cycle's fixed length in days (`endDate` set), or `null` for an open-ended
 * cycle — in which case `projected` is a per-month estimate instead.
 */
export function estimateCyclePeptideCost(
  input: CyclePeptideCostInput,
  days: number | null,
): CyclePeptideCost {
  const perDose = input.supply
    ? costPerDose(input.supply.price, input.supply.vialMcg, input.doseMcg)
    : null;
  const spentSoFar = perDose == null ? null : perDose * input.loggedDoseCount;
  const projected =
    perDose == null
      ? null
      : days != null
        ? costOverDays(perDose, input.frequency, days)
        : costPerMonth(perDose, input.frequency);
  return { peptideId: input.peptideId, perDose, spentSoFar, projected };
}

export interface CycleCostSummary {
  spentSoFar: number | null;
  projected: number | null;
  /** Whether at least one peptide had a priced supply. */
  hasData: boolean;
}

/**
 * Sum per-peptide cost results into one cycle total. Peptides without a
 * priced supply are skipped entirely; `projected` stays null if any PRICED
 * peptide's own projection is unknown (e.g. a "custom" frequency).
 */
export function sumCyclePeptideCosts(
  costs: CyclePeptideCost[],
): CycleCostSummary {
  const priced = costs.filter((c) => c.perDose != null);
  if (priced.length === 0) {
    return { spentSoFar: null, projected: null, hasData: false };
  }
  const spentSoFar = priced.reduce((sum, c) => sum + (c.spentSoFar ?? 0), 0);
  const projected = priced.every((c) => c.projected != null)
    ? priced.reduce((sum, c) => sum + (c.projected as number), 0)
    : null;
  return { spentSoFar, projected, hasData: true };
}
