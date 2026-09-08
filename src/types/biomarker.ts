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
  "INFECTION",
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
  INFECTION: "Infectious serology",
  OTHER: "Other",
};

// "high" = higher is worse, "low" = lower is worse, null/undefined = context-dependent.
export const DIRECTIONS = ["high", "low"] as const;
export type Direction = (typeof DIRECTIONS)[number];

// ---------------------------------------------------------------------------
// Value type — numeric markers (a measured number vs a reference range) vs
// qualitative markers (a categorical result like reactive/non-reactive,
// positive/negative — e.g. serologies). Qualitative markers carry no numeric
// range; their result flags against `qualitativeOptions.normal` instead.
// ---------------------------------------------------------------------------
export const BIOMARKER_VALUE_TYPES = ["numeric", "qualitative"] as const;
export type BiomarkerValueType = (typeof BIOMARKER_VALUE_TYPES)[number];

export function asBiomarkerValueType(v: unknown): BiomarkerValueType {
  return v === "qualitative" ? "qualitative" : "numeric";
}

/**
 * The allowed categorical results for a qualitative marker plus which one is the
 * expected/normal result. `abnormal` (optional) is the set that should flag; when
 * omitted, "anything that isn't `normal`" is treated as abnormal.
 */
export const qualitativeOptionsSchema = z.object({
  options: z.array(z.string()).min(1),
  normal: z.string(),
  abnormal: z.array(z.string()).optional(),
});
export type QualitativeOptions = z.infer<typeof qualitativeOptionsSchema>;

export function asQualitativeOptions(
  value: unknown,
): QualitativeOptions | null {
  const parsed = qualitativeOptionsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * Whether a qualitative result is within the normal/expected category.
 * Case-insensitive compare; returns null when the result isn't recognized.
 */
export function isQualitativeNormal(
  options: QualitativeOptions,
  result: string | null | undefined,
): boolean | null {
  if (!result) return null;
  const r = result.trim().toLowerCase();
  if (r === options.normal.trim().toLowerCase()) return true;
  if (options.abnormal?.some((a) => a.trim().toLowerCase() === r)) return false;
  // Known option that isn't the normal one → abnormal; unknown → indeterminate.
  const known = options.options.some((o) => o.trim().toLowerCase() === r);
  return known ? false : null;
}

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

/**
 * Full shape of a researched biomarker JSON file (prisma/data/biomarkers/*.json).
 * `valueType` defaults to "numeric" (existing files omit it). Qualitative markers
 * set `valueType: "qualitative"` + `qualitativeOptions` and leave `ranges` empty
 * (their unit may be an empty string).
 */
export const biomarkerDataSchema = z
  .object({
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
    valueType: z.enum(BIOMARKER_VALUE_TYPES).optional(),
    qualitativeOptions: qualitativeOptionsSchema.optional(),
  })
  .refine(
    (d) => d.valueType !== "qualitative" || d.qualitativeOptions != null,
    {
      message: "qualitative markers require qualitativeOptions",
      path: ["qualitativeOptions"],
    },
  );
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
