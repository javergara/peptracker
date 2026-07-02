import type { CyclePeptideDose } from "@/lib/schedule";

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
