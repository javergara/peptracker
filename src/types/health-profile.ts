import { z } from "zod";

/**
 * Health profile — source of truth for the Conditions + Family history module.
 * Enum-like fields are stored as `String` (SQLite-origin style, see schema.prisma)
 * and validated here; `biomarkerSlugs`/`relatedPeptides` are Json string[] parsed
 * via `asStringArray` from src/types/peptide.ts.
 *
 * Educational record-keeping only — NOT a diagnosis. Every surface that renders
 * this data must show the <Disclaimer />.
 */

// --- Condition status ------------------------------------------------------

export const CONDITION_STATUSES = ["active", "monitoring", "resolved"] as const;
export type ConditionStatus = (typeof CONDITION_STATUSES)[number];

export const CONDITION_STATUS_LABELS: Record<ConditionStatus, string> = {
  active: "Active",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

/**
 * Badge styling per status. Brand/neutral + amber only — the clinical
 * `--ok/--bad` tokens stay reserved for labs/inventory in/out-of-range signalling.
 */
export const CONDITION_STATUS_STYLE: Record<ConditionStatus, string> = {
  active: "border-primary/20 bg-primary/10 text-primary",
  monitoring: "border-warn/30 bg-warn-wash text-warn-foreground",
  resolved: "text-muted-foreground bg-muted border-border",
};

export function isConditionStatus(v: unknown): v is ConditionStatus {
  return (
    typeof v === "string" &&
    (CONDITION_STATUSES as readonly string[]).includes(v)
  );
}

/** Coerce an arbitrary string to a valid status, defaulting to "active". */
export function asConditionStatus(v: unknown): ConditionStatus {
  return isConditionStatus(v) ? v : "active";
}

// --- Family relative -------------------------------------------------------

export const RELATIVE_TYPES = [
  "father",
  "mother",
  "sibling",
  "grandparent",
  "aunt-uncle",
  "other",
] as const;
export type RelativeType = (typeof RELATIVE_TYPES)[number];

export const RELATIVE_LABELS: Record<RelativeType, string> = {
  father: "Father",
  mother: "Mother",
  sibling: "Sibling",
  grandparent: "Grandparent",
  "aunt-uncle": "Aunt / Uncle",
  other: "Other relative",
};

export function isRelativeType(v: unknown): v is RelativeType {
  return (
    typeof v === "string" && (RELATIVE_TYPES as readonly string[]).includes(v)
  );
}

export function asRelativeType(v: unknown): RelativeType {
  return isRelativeType(v) ? v : "other";
}

// --- Zod input schemas (form parsing in actions) ---------------------------

const optionalTrimmed = z
  .string()
  .trim()
  .transform((s) => (s === "" ? undefined : s))
  .optional();

export const conditionInputSchema = z.object({
  name: z.string().trim().min(1, "Condition name is required."),
  code: optionalTrimmed,
  status: z
    .string()
    .optional()
    .transform((v) => asConditionStatus(v)),
  system: optionalTrimmed,
  onsetDate: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? undefined : d;
    }),
  notes: optionalTrimmed,
  biomarkerSlugs: z.array(z.string()).optional(),
  relatedPeptides: z.array(z.string()).optional(),
});
export type ConditionInput = z.infer<typeof conditionInputSchema>;

export const familyHistoryInputSchema = z.object({
  relative: z
    .string()
    .optional()
    .transform((v) => asRelativeType(v)),
  condition: z.string().trim().min(1, "Condition is required."),
  notes: optionalTrimmed,
});
export type FamilyHistoryInput = z.infer<typeof familyHistoryInputSchema>;
