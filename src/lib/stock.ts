import type { Frequency } from "@/lib/schedule";
import { isDiluent } from "@/types/peptide";

/**
 * Stock (reserve) supply math — pure, no DB, no React. Estimates how long the
 * unopened vials you hold will last given a planned dose + frequency, and the
 * low-stock threshold used for the dashboard alert. Mirrors src/lib/cycles.ts.
 */

/**
 * Human label for a stock vial's size. Peptide vials are stored/shown in mg
 * (vialMcg / 1000). Diluents (BAC water) are measured in **mL** — the same
 * numeric column holds mL × 1000, so it divides identically but renders "mL".
 */
export function formatVialSize(
  vialMcg: number,
  category?: string | null,
): string {
  const n = vialMcg / 1000;
  const num = Number.isInteger(n) ? n : n.toFixed(1);
  return `${num} ${isDiluent(category) ? "mL" : "mg"}`;
}

/** Selectable frequencies for a stock item, with human labels. */
export const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "eod", label: "Every other day" },
  { value: "twice-weekly", label: "Twice weekly" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom" },
];

export const FREQUENCY_LABELS: Record<string, string> = Object.fromEntries(
  FREQUENCY_OPTIONS.map((o) => [o.value, o.label]),
);

/**
 * Average doses per day for a frequency (used to turn a dose count into days of
 * supply). Returns null when the cadence is unknown ("custom") so callers can
 * omit the day estimate.
 */
export function frequencyDosesPerDay(frequency: string): number | null {
  switch (frequency) {
    case "daily":
      return 1;
    case "eod":
      return 1 / 2;
    case "twice-weekly":
      return 2 / 7;
    case "weekly":
      return 1 / 7;
    default:
      return null; // "custom" / unknown
  }
}

export interface StockSupply {
  /** Whole doses one vial yields (0 when dose unknown). */
  dosesPerVial: number;
  /** Whole doses across all unopened vials in stock. */
  totalDoses: number;
  /** Estimated days the stock lasts, or null when dose/frequency is unknown. */
  days: number | null;
}

/**
 * Estimate remaining supply for a stock item. `doseMcg` must already be
 * normalized to mcg by the caller (dose * (doseUnit === "mg" ? 1000 : 1)).
 */
export function estimateStockSupply({
  vialMcg,
  quantity,
  doseMcg,
  frequency,
}: {
  vialMcg: number;
  quantity: number;
  doseMcg: number | null | undefined;
  frequency: string;
}): StockSupply {
  const qty = Math.max(0, quantity);
  if (!doseMcg || doseMcg <= 0 || vialMcg <= 0) {
    return { dosesPerVial: 0, totalDoses: 0, days: null };
  }
  const dosesPerVial = Math.floor(vialMcg / doseMcg);
  const totalDoses = Math.floor((vialMcg * qty) / doseMcg);
  const perDay = frequencyDosesPerDay(frequency);
  const days = perDay ? Math.floor(totalDoses / perDay) : null;
  return { dosesPerVial, totalDoses, days };
}

/** Normalize a dose amount + unit to mcg. */
export function toMcg(
  dose: number | null | undefined,
  unit: string | null | undefined,
): number | null {
  if (dose == null || !Number.isFinite(dose)) return null;
  return unit === "mg" ? dose * 1000 : dose;
}

/** Low-stock threshold for the dashboard alert: one vial or fewer on hand. */
export function isLowStock(totalVials: number): boolean {
  return totalVials <= 1;
}
