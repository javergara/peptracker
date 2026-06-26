import { z } from "zod";

import { asReferences, referenceSchema } from "@/types/peptide";

/**
 * Biomarker domain vocabulary + zod schemas. The labs analog of
 * `src/types/peptide.ts`: the DB stores enum-like fields as String and
 * arrays/objects as Json, and this module is the single source of truth for
 * valid values, labels, parsing, and reference-range resolution.
 */

// ---------------------------------------------------------------------------
// Systems (panel groups)
// ---------------------------------------------------------------------------
export const BIOMARKER_SYSTEMS = [
  "LIPIDS",
  "LIVER",
  "RENAL",
  "METABOLIC",
  "HORMONE",
  "THYROID",
  "HEMATOLOGY",
  "VITAMIN",
  "INFLAMMATION",
  "OTHER",
] as const;
export type BiomarkerSystem = (typeof BIOMARKER_SYSTEMS)[number];

export const SYSTEM_LABELS: Record<BiomarkerSystem, string> = {
  LIPIDS: "Lipids",
  LIVER: "Liver",
  RENAL: "Renal",
  METABOLIC: "Metabolic",
  HORMONE: "Hormones",
  THYROID: "Thyroid",
  HEMATOLOGY: "Hematology",
  VITAMIN: "Vitamins",
  INFLAMMATION: "Inflammation",
  OTHER: "Other",
};

// "high" = higher is worse, "low" = lower is worse, null/undefined = context-dependent.
export const DIRECTIONS = ["high", "low"] as const;
export type Direction = (typeof DIRECTIONS)[number];

// ---------------------------------------------------------------------------
// Zod schemas for the Json columns
// ---------------------------------------------------------------------------
/**
 * A reference-range rule. The most specific matching rule wins (see
 * `resolveRange`): sex-specific beats sex-agnostic; age-bounded rules apply only
 * when the age is known. Each biomarker should include at least one default rule
 * (no `sex`, no age bounds) so a range resolves even with no profile info.
 */
export const refRangeSchema = z.object({
  sex: z.enum(["M", "F"]).optional(),
  ageMin: z.number().optional(),
  ageMax: z.number().optional(),
  low: z.number().optional(),
  high: z.number().optional(),
  unit: z.string().optional(),
  note: z.string().optional(),
});
export type RefRange = z.infer<typeof refRangeSchema>;

/** Full shape of a researched biomarker JSON file (prisma/data/biomarkers/*.json). */
export const biomarkerDataSchema = z.object({
  slug: z.string(),
  name: z.string(),
  aliases: z.array(z.string()),
  system: z.enum(BIOMARKER_SYSTEMS),
  unit: z.string(),
  summary: z.string(),
  whatItMeans: z.string(),
  raises: z.array(z.string()),
  lowers: z.array(z.string()),
  confounders: z.array(z.string()),
  relatedPeptides: z.array(z.string()),
  ranges: z.array(refRangeSchema),
  references: z.array(referenceSchema),
  direction: z.enum(DIRECTIONS).optional(),
});
export type BiomarkerData = z.infer<typeof biomarkerDataSchema>;

// ---------------------------------------------------------------------------
// Safe parsers for Prisma Json columns
// ---------------------------------------------------------------------------
export function asRefRanges(value: unknown): RefRange[] {
  const parsed = z.array(refRangeSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

// Re-export the shared reference parser so biomarker code has one import surface.
export { asReferences };

// ---------------------------------------------------------------------------
// Reference-range resolution (sex/age aware)
// ---------------------------------------------------------------------------
export interface ResolvedRange {
  low?: number;
  high?: number;
  unit?: string;
  note?: string;
}

/** Years old from a birth year, or null if not provided. */
export function ageFromBirthYear(
  birthYear: number | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!birthYear || Number.isNaN(birthYear)) return null;
  return now.getFullYear() - birthYear;
}

/**
 * Pick the best-matching reference range for a profile. Sex-specific rules beat
 * sex-agnostic ones; age-bounded rules are only considered when the age is known
 * and falls inside the band. Returns null when no rule matches.
 */
export function resolveRange(
  ranges: RefRange[],
  ctx: { sex?: string | null; age?: number | null },
): ResolvedRange | null {
  if (!ranges.length) return null;
  const sex = ctx.sex === "M" || ctx.sex === "F" ? ctx.sex : null;
  const age = typeof ctx.age === "number" ? ctx.age : null;

  let best: RefRange | null = null;
  let bestScore = -1;

  for (const r of ranges) {
    if (r.sex && r.sex !== sex) continue; // sex mismatch
    const ageBounded = r.ageMin != null || r.ageMax != null;
    if (ageBounded) {
      if (age == null) continue; // can't apply an age band without an age
      if (r.ageMin != null && age < r.ageMin) continue;
      if (r.ageMax != null && age > r.ageMax) continue;
    }
    const score = (r.sex ? 2 : 0) + (ageBounded ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  if (!best) return null;
  return { low: best.low, high: best.high, unit: best.unit, note: best.note };
}
