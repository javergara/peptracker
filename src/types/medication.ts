import { z } from "zod";

/**
 * Medications — source of truth for the Medications + dose-change history module.
 * Distinct from Supplement: a Medication is a prescribed drug whose dose changes
 * over time (e.g. atorvastatin 40 mg -> 20 mg), so its history matters clinically.
 * Enum-like fields are stored as `String` (SQLite-origin style, see schema.prisma);
 * `biomarkerSlugs` is a Json string[] parsed via `asStringArray` (src/types/peptide.ts).
 *
 * Educational record-keeping only — NOT medical advice. Every surface that renders
 * this data must show the <Disclaimer />.
 */

// --- Medication status -----------------------------------------------------

export const MEDICATION_STATUSES = ["active", "stopped"] as const;
export type MedicationStatus = (typeof MEDICATION_STATUSES)[number];

export const MEDICATION_STATUS_LABELS: Record<MedicationStatus, string> = {
  active: "Active",
  stopped: "Stopped",
};

/**
 * Badge styling per status. Brand/neutral only — the clinical `--ok/--bad`
 * tokens stay reserved for labs/inventory in/out-of-range signalling.
 */
export const MEDICATION_STATUS_STYLE: Record<MedicationStatus, string> = {
  active: "border-primary/20 bg-primary/10 text-primary",
  stopped: "text-muted-foreground bg-muted border-border",
};

export function isMedicationStatus(v: unknown): v is MedicationStatus {
  return (
    typeof v === "string" &&
    (MEDICATION_STATUSES as readonly string[]).includes(v)
  );
}

/** Coerce an arbitrary string to a valid status, defaulting to "active". */
export function asMedicationStatus(v: unknown): MedicationStatus {
  return isMedicationStatus(v) ? v : "active";
}

// --- Zod input schemas (form parsing in actions) ---------------------------

const optionalTrimmed = z
  .string()
  .trim()
  .transform((s) => (s === "" ? undefined : s))
  .optional();

const optionalDate = z
  .string()
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  });

export const medicationInputSchema = z.object({
  name: z.string().trim().min(1, "Medication name is required."),
  code: optionalTrimmed,
  status: z
    .string()
    .optional()
    .transform((v) => asMedicationStatus(v)),
  startDate: optionalDate,
  notes: optionalTrimmed,
  biomarkerSlugs: z.array(z.string()).optional(),
});
export type MedicationInput = z.infer<typeof medicationInputSchema>;

export const doseChangeInputSchema = z.object({
  dose: z.string().trim().min(1, "Dose is required."),
  reason: optionalTrimmed,
  effectiveAt: z
    .string()
    .min(1, "Date is required.")
    .transform((v, ctx) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: "custom", message: "Invalid date." });
        return z.NEVER;
      }
      return d;
    }),
});
export type DoseChangeInput = z.infer<typeof doseChangeInputSchema>;
