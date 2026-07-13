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

export interface StockLevel {
  peptideId: string;
  peptideName: string;
  /** Unopened vials in the reserve. */
  stockVials: number;
  /** Active/sealed vials currently in tracking. */
  activeVials: number;
  /** Combined vials on hand — drives the vial-count low-stock fallback. */
  total: number;
  /**
   * Estimated days of supply left at the peptide's planned dose + frequency,
   * across stock reserve + remaining in active/sealed vials. `null` when no
   * planned dose/cadence is set (e.g. diluents) — callers fall back to `total`.
   */
  daysOfSupply: number | null;
}

export interface StockRow {
  peptideId: string;
  peptideName: string;
  quantity: number;
  vialMcg: number;
  dose: number | null;
  doseUnit: string | null;
  frequency: string;
}
export interface VialRow {
  peptideId: string;
  peptideName: string;
  status: string;
  remainingMcg: number;
}

/**
 * Pure per-peptide supply roll-up from already-queried stock + vial rows: Σ
 * stock quantity + count of active/sealed vials, plus estimated **days of
 * supply** from total mcg on hand vs the planned dose/frequency. Shared by
 * `getStockLevels` (dashboard/inventory) and the reminders cron so both agree.
 */
export function computeStockLevels(
  stock: StockRow[],
  vials: VialRow[],
): StockLevel[] {
  interface Acc extends StockLevel {
    mcgOnHand: number;
    doseMcg: number | null;
    frequency: string;
  }
  const levels = new Map<string, Acc>();
  const ensure = (peptideId: string, peptideName: string) => {
    let l = levels.get(peptideId);
    if (!l) {
      l = {
        peptideId,
        peptideName,
        stockVials: 0,
        activeVials: 0,
        total: 0,
        daysOfSupply: null,
        mcgOnHand: 0,
        doseMcg: null,
        frequency: "daily",
      };
      levels.set(peptideId, l);
    }
    return l;
  };

  for (const s of stock) {
    const l = ensure(s.peptideId, s.peptideName);
    l.stockVials += s.quantity;
    l.mcgOnHand += s.vialMcg * s.quantity;
    // Adopt the first stock item that carries a planned dose as the cadence.
    if (l.doseMcg == null) {
      const dm = toMcg(s.dose, s.doseUnit);
      if (dm && dm > 0) {
        l.doseMcg = dm;
        l.frequency = s.frequency;
      }
    }
  }
  for (const v of vials) {
    const l = ensure(v.peptideId, v.peptideName);
    if (v.status === "active" || v.status === "sealed") {
      l.activeVials += 1;
      l.mcgOnHand += v.remainingMcg;
    }
  }

  for (const l of levels.values()) {
    l.total = l.stockVials + l.activeVials;
    l.daysOfSupply = estimateStockSupply({
      vialMcg: l.mcgOnHand,
      quantity: 1,
      doseMcg: l.doseMcg,
      frequency: l.frequency,
    }).days;
  }

  return Array.from(levels.values())
    .map(
      (l): StockLevel => ({
        peptideId: l.peptideId,
        peptideName: l.peptideName,
        stockVials: l.stockVials,
        activeVials: l.activeVials,
        total: l.total,
        daysOfSupply: l.daysOfSupply,
      }),
    )
    .sort((a, b) => a.peptideName.localeCompare(b.peptideName));
}

/** Reorder when fewer than this many days of supply remain. */
export const LOW_STOCK_DAYS = 14;

/**
 * Low-stock threshold for the dashboard alert. Prefers a **days-of-supply**
 * signal (reorder under {@link LOW_STOCK_DAYS} days) so a daily-dosed peptide
 * and a weekly one aren't treated identically; falls back to a vial count of ≤1
 * when no planned dose/cadence is known (e.g. diluents).
 */
export function isLowStock(level: {
  total: number;
  daysOfSupply?: number | null;
}): boolean {
  if (level.daysOfSupply != null) return level.daysOfSupply < LOW_STOCK_DAYS;
  return level.total <= 1;
}
