import { z } from "zod";

/**
 * Imaging / studies — source of truth for the Studies log module. Records
 * medical imaging and procedures (ultrasound, CT, MRI, …) with their findings
 * and follow-up status. Enum-like fields are stored as `String` (SQLite-origin
 * style, see schema.prisma).
 *
 * Educational record-keeping only — NOT medical advice. Every surface that
 * renders this data must show the <Disclaimer />.
 */

// --- Modality --------------------------------------------------------------

export const STUDY_MODALITIES = [
  "ultrasound",
  "ct",
  "mri",
  "xray",
  "endoscopy",
  "dexa",
  "other",
] as const;
export type StudyModality = (typeof STUDY_MODALITIES)[number];

export const STUDY_MODALITY_LABELS: Record<StudyModality, string> = {
  ultrasound: "Ultrasound",
  ct: "CT scan",
  mri: "MRI",
  xray: "X-ray",
  endoscopy: "Endoscopy",
  dexa: "DEXA",
  other: "Other",
};

export function isStudyModality(v: unknown): v is StudyModality {
  return (
    typeof v === "string" && (STUDY_MODALITIES as readonly string[]).includes(v)
  );
}

/** Coerce an arbitrary string to a valid modality, defaulting to "other". */
export function asStudyModality(v: unknown): StudyModality {
  return isStudyModality(v) ? v : "other";
}

// --- Status ----------------------------------------------------------------

export const STUDY_STATUSES = ["scheduled", "completed", "follow-up"] as const;
export type StudyStatus = (typeof STUDY_STATUSES)[number];

export const STUDY_STATUS_LABELS: Record<StudyStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  "follow-up": "Needs follow-up",
};

/**
 * Badge styling per status. Brand/neutral + amber only — the clinical
 * `--ok/--bad` tokens stay reserved for labs/inventory in/out-of-range signals.
 */
export const STUDY_STATUS_STYLE: Record<StudyStatus, string> = {
  scheduled: "text-muted-foreground bg-muted border-border",
  completed: "border-primary/20 bg-primary/10 text-primary",
  "follow-up": "border-warn/30 bg-warn-wash text-warn-foreground",
};

export function isStudyStatus(v: unknown): v is StudyStatus {
  return (
    typeof v === "string" && (STUDY_STATUSES as readonly string[]).includes(v)
  );
}

/** Coerce an arbitrary string to a valid status, defaulting to "completed". */
export function asStudyStatus(v: unknown): StudyStatus {
  return isStudyStatus(v) ? v : "completed";
}

// --- Zod input schema (form parsing in actions) ----------------------------

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

export const studyInputSchema = z.object({
  name: z.string().trim().min(1, "Study name is required."),
  modality: z
    .string()
    .optional()
    .transform((v) => asStudyModality(v)),
  status: z
    .string()
    .optional()
    .transform((v) => asStudyStatus(v)),
  bodyRegion: optionalTrimmed,
  performedAt: optionalDate,
  followUpAt: optionalDate,
  findings: optionalTrimmed,
  impression: optionalTrimmed,
  notes: optionalTrimmed,
});
export type StudyInput = z.infer<typeof studyInputSchema>;
