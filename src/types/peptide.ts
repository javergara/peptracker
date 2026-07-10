import { z } from "zod";

/**
 * Shared domain vocabulary + zod schemas. Because SQLite cannot store enums or
 * arrays, the DB keeps these as String / Json; this module is the single source
 * of truth for valid values, labels, and parsing of those Json columns.
 */

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export const PEPTIDE_CATEGORIES = [
  "GLP_GIP",
  "GH_SECRETAGOGUE",
  "HEALING_REPAIR",
  "MITOCHONDRIAL",
  "COSMETIC",
  "NOOTROPIC_ANXIOLYTIC",
  "IMMUNE_ANTIINFLAMMATORY",
  "DILUENT",
] as const;
export type PeptideCategory = (typeof PEPTIDE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<PeptideCategory, string> = {
  GLP_GIP: "Metabolic (GLP-1/GIP)",
  GH_SECRETAGOGUE: "Growth Hormone",
  HEALING_REPAIR: "Healing & Repair",
  MITOCHONDRIAL: "Mitochondrial",
  COSMETIC: "Cosmetic & Skin",
  NOOTROPIC_ANXIOLYTIC: "Nootropic & Mood",
  IMMUNE_ANTIINFLAMMATORY: "Immune & Anti-inflammatory",
  DILUENT: "Diluent & Supplies",
};

/**
 * Diluents (BAC water) are supplies, not peptides: measured in **mL**, not
 * mcg/mg, and never reconstituted/activated. Inventory treats them specially.
 */
export function isDiluent(category?: string | null): boolean {
  return category === "DILUENT";
}

// ---------------------------------------------------------------------------
// Routes of administration
// ---------------------------------------------------------------------------
export const ROUTES = ["SUBQ", "IM", "NASAL", "TOPICAL", "ORAL"] as const;
export type Route = (typeof ROUTES)[number];

export const ROUTE_LABELS: Record<Route, string> = {
  SUBQ: "Subcutaneous",
  IM: "Intramuscular",
  NASAL: "Nasal",
  TOPICAL: "Topical",
  ORAL: "Oral",
};

// ---------------------------------------------------------------------------
// Goal tags (drive rule-based suggestions)
// ---------------------------------------------------------------------------
export const GOAL_TAGS = [
  "fat-loss",
  "recovery-injury",
  "muscle-growth",
  "skin-antiaging",
  "cognition-mood",
  "longevity",
  "metabolic",
  "immune",
  "sleep",
  "gh-axis",
] as const;
export type GoalTag = (typeof GOAL_TAGS)[number];

export const GOAL_LABELS: Record<GoalTag, string> = {
  "fat-loss": "Fat Loss",
  "recovery-injury": "Recovery & Injury",
  "muscle-growth": "Muscle Growth",
  "skin-antiaging": "Skin & Anti-aging",
  "cognition-mood": "Cognition & Mood",
  longevity: "Longevity",
  metabolic: "Metabolic Health",
  immune: "Immune Support",
  sleep: "Sleep",
  "gh-axis": "GH Axis",
};

// ---------------------------------------------------------------------------
// Interaction kinds
// ---------------------------------------------------------------------------
export const INTERACTION_KINDS = ["synergy", "caution", "avoid"] as const;
export type InteractionKind = (typeof INTERACTION_KINDS)[number];

// ---------------------------------------------------------------------------
// Cycle status
// ---------------------------------------------------------------------------
export const CYCLE_STATUSES = [
  "planned",
  "active",
  "paused",
  "completed",
] as const;
export type CycleStatus = (typeof CYCLE_STATUSES)[number];

// ---------------------------------------------------------------------------
// Zod schemas for the Json columns
// ---------------------------------------------------------------------------
/** One step of a titration schedule (e.g. "weeks 1–4 → 2 mg"). */
export const titrationStepSchema = z.object({
  weeks: z.string(), // e.g. "1–4", "1-2", "13+"
  amount: z.number(), // numeric dose (so injection volume can be auto-computed)
  unit: z.enum(["mg", "mcg"]),
  note: z.string().optional(), // e.g. "split AM/PM", "pre-sleep"
});
export type TitrationStep = z.infer<typeof titrationStepSchema>;

/** A named dosing protocol (Standard / Aggressive / Maintenance …). */
export const dosingProtocolSchema = z.object({
  label: z.string().optional(),
  steps: z.array(titrationStepSchema),
});
export type DosingProtocol = z.infer<typeof dosingProtocolSchema>;

export const dosageSchema = z.object({
  low: z.string(),
  standard: z.string(),
  high: z.string(),
  unit: z.string(),
  notes: z.string().optional().default(""),
  // Optional enrichments (titration tables, timing, ceiling).
  timing: z.string().optional(),
  maxDose: z.string().optional(),
  protocols: z.array(dosingProtocolSchema).optional(),
});
export type Dosage = z.infer<typeof dosageSchema>;

export const reconstitutionSchema = z.object({
  vialMg: z.number(),
  bacWaterMl: z.number(),
  notes: z.string().optional().default(""),
});
export type Reconstitution = z.infer<typeof reconstitutionSchema>;

export const rawInteractionSchema = z.object({
  with: z.string(),
  kind: z.string(),
  note: z.string(),
});
export type RawInteraction = z.infer<typeof rawInteractionSchema>;

export const referenceSchema = z.object({
  title: z.string(),
  url: z.string(),
});
export type Reference = z.infer<typeof referenceSchema>;

/** Full shape of a researched peptide JSON file (prisma/data/*.json). */
export const peptideDataSchema = z.object({
  slug: z.string(),
  name: z.string(),
  aliases: z.array(z.string()),
  category: z.enum(PEPTIDE_CATEGORIES),
  summary: z.string(),
  mechanism: z.string(),
  benefits: z.array(z.string()),
  risks: z.array(z.string()),
  sideEffects: z.array(z.string()),
  dosage: dosageSchema,
  route: z.enum(ROUTES),
  frequency: z.string(),
  halfLife: z.string(),
  /**
   * Numeric elimination half-life in HOURS (midpoint when sources give a
   * range) — drives the estimated active-levels (PK) chart. Optional: peptides
   * without a citable value simply don't chart. Cite the source in
   * `references`.
   */
  halfLifeHours: z.number().positive().optional(),
  cycleLength: z.string(),
  reconstitution: reconstitutionSchema,
  storage: z.string(),
  contraindications: z.array(z.string()),
  interactions: z.array(rawInteractionSchema),
  references: z.array(referenceSchema),
  tags: z.array(z.string()),
  status: z.string(),
});
export type PeptideData = z.infer<typeof peptideDataSchema>;

// ---------------------------------------------------------------------------
// Safe parsers for Prisma Json columns (Json is typed as `unknown`-ish)
// ---------------------------------------------------------------------------
export function asStringArray(value: unknown): string[] {
  const parsed = z.array(z.string()).safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function asDosage(value: unknown): Dosage | null {
  const parsed = dosageSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function asReconstitution(value: unknown): Reconstitution | null {
  const parsed = reconstitutionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function asInteractions(value: unknown): RawInteraction[] {
  const parsed = z.array(rawInteractionSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function asReferences(value: unknown): Reference[] {
  const parsed = z.array(referenceSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}
