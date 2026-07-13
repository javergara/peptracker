import type { CyclePeptideDose, ScheduleConfig } from "@/lib/schedule";
import { doseForCycleDay, protocolLabel } from "@/lib/titration";
import { asDosage } from "@/types/peptide";

/**
 * Parse a free-form stack-item dose string into a numeric amount + unit.
 *
 * `StackItem.dose` is author-entered prose like "250 mcg", "2mg", "200-300 mcg"
 * or "5 IU". We extract the first number and a known unit (mcg|mg), defaulting
 * the unit to "mcg" when absent/unknown. Returns `{}` when no number is present.
 *
 * Pure — no DB, no React. Used to prefill a stack cycle's per-peptide dose
 * inputs with the stack's suggested doses.
 */
export function parseDoseAmount(input: string | null | undefined): {
  dose?: number;
  unit?: string;
} {
  if (!input) return {};
  const num = input.match(/[\d.]+/)?.[0];
  const dose = num ? Number(num) : undefined;
  // "mcg" contains no "mg", so a bare "mg" match disambiguates the two units.
  const unit = /mg/i.test(input) ? "mg" : "mcg";
  return Number.isFinite(dose) && (dose ?? 0) > 0 ? { dose, unit } : { unit };
}

/**
 * Build a lookup of peptideId → {dose, unit} for a cycle's dosing config.
 * Single-peptide cycles map the one peptide to `dosePerAdmin`/`unit`; stack
 * cycles use the per-peptide `items`. Drives the dose default when logging.
 */
export function doseDefaultsByPeptide(
  items: CyclePeptideDose[] | undefined,
): Record<string, { dose?: number; unit?: string }> {
  const map: Record<string, { dose?: number; unit?: string }> = {};
  for (const it of items ?? []) {
    if (it.peptideId) map[it.peptideId] = { dose: it.dose, unit: it.unit };
  }
  return map;
}

/**
 * The effective single-peptide dose for a cycle on `date`. When the cycle is
 * following a titration protocol (`scheduleConfig.titration`), the dose comes
 * from the peptide's `dosage.protocols` schedule for the current week; otherwise
 * it's the flat `dosePerAdmin`/`unit`. Returns null when nothing is configured
 * (or the titration schedule hasn't started). Pure — lets the dashboard chip
 * and quick-log resolve titration cycles the same way the detail page does,
 * instead of reading the (blanked-for-titration) `dosePerAdmin`.
 */
export function effectiveSingleDose(
  cfg:
    | Pick<ScheduleConfig, "titration" | "dosePerAdmin" | "unit">
    | null
    | undefined,
  peptideDosage: unknown,
  startDate: Date,
  date: Date,
): { amount: number; unit: string } | null {
  const label = cfg?.titration?.label;
  if (label) {
    const protocols = asDosage(peptideDosage)?.protocols ?? [];
    const protocol = protocols.find((p, i) => protocolLabel(p, i) === label);
    const today = protocol ? doseForCycleDay(protocol, startDate, date) : null;
    if (today) return { amount: today.amount, unit: today.unit };
    // Titration configured but not yet started / no matching step: fall through
    // to any flat dose, else null.
  }
  if (cfg?.dosePerAdmin) {
    return { amount: cfg.dosePerAdmin, unit: cfg.unit ?? "mcg" };
  }
  return null;
}

/**
 * Whether an `active` cycle's planned window has elapsed — it has an `endDate`
 * and today's day-start is past it. Open-ended cycles (no `endDate`) never end
 * this way. Pure. An active cycle past its end date otherwise lingers forever:
 * it inflates the dashboard's ACTIVE count and clutters the active-cycles card
 * while producing zero due doses. Consumers use this to split running from
 * ended cycles and prompt the user to complete (or extend) the ended ones.
 */
export function isCycleEnded(
  endDate: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!endDate) return false;
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  return startOfToday.getTime() > endDate.getTime();
}

/**
 * Whole days of washout remaining after a cycle's end: `endDate + washoutDays`
 * minus today (clamped at 0). Returns null when there's no end date or no
 * planned washout. Pure — drives the ended-cycle prompt's rest countdown.
 */
export function washoutDaysLeft(
  endDate: Date | null | undefined,
  washoutDays: number | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!endDate || !washoutDays || washoutDays <= 0) return null;
  const washoutEnd = endDate.getTime() + washoutDays * 24 * 60 * 60 * 1000;
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  return Math.max(0, Math.ceil((washoutEnd - startOfToday) / 86_400_000));
}
