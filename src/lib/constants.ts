import type { BiomarkerSystem } from "@/types/biomarker";
import type { LabStatus } from "@/lib/labs";
import type { VialGaugeStatus } from "@/lib/vials";
import type {
  PeptideCategory,
  GoalTag,
  InteractionKind,
} from "@/types/peptide";

export const APP_NAME = "Peptra";

export const DISCLAIMER_SHORT =
  "Educational and research use only. Not medical advice.";

export const DISCLAIMER_LONG =
  "This application is for educational and informational purposes only and is not medical advice. Many peptides listed are research compounds that are not approved for human use. Nothing here is a recommendation to obtain or use any substance. Consult a qualified healthcare professional before making any health decisions.";

/** Tailwind class fragments for badges per category. */
export const CATEGORY_BADGE: Record<PeptideCategory, string> = {
  GLP_GIP:
    "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  GH_SECRETAGOGUE:
    "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  HEALING_REPAIR:
    "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  MITOCHONDRIAL:
    "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  COSMETIC:
    "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30",
  NOOTROPIC_ANXIOLYTIC:
    "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  IMMUNE_ANTIINFLAMMATORY:
    "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
};

/** Tailwind class fragments for biomarker system (panel) badges. */
export const SYSTEM_BADGE: Record<BiomarkerSystem, string> = {
  LIPIDS:
    "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  LIVER:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  RENAL: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  METABOLIC:
    "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  HORMONE:
    "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  THYROID: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
  HEMATOLOGY:
    "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  VITAMIN: "bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/30",
  INFLAMMATION:
    "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  OTHER:
    "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
};

export const GOAL_BADGE: Partial<Record<GoalTag, string>> = {
  "fat-loss": "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "recovery-injury": "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "cognition-mood": "bg-purple-500/15 text-purple-700 dark:text-purple-300",
};

/**
 * Clinical status styling for the Labs reference-range tracks + count tiles.
 * These use the clinical-only --ok/--warn/--bad tokens (see globals.css) — green
 * and red are reserved for in/out-of-range semantics and never brand surfaces.
 */
export const LAB_STATUS_STYLE: Record<
  LabStatus,
  { label: string; dot: string; text: string; wash: string; pill: string }
> = {
  ok: {
    label: "In range",
    dot: "bg-ok",
    text: "text-ok",
    wash: "bg-ok-wash",
    pill: "bg-ok-wash text-ok",
  },
  borderline: {
    label: "Borderline",
    dot: "bg-warn",
    text: "text-warn-foreground",
    wash: "bg-warn-wash",
    pill: "bg-warn-wash text-warn-foreground",
  },
  bad: {
    label: "Out of range",
    dot: "bg-bad",
    text: "text-bad",
    wash: "bg-bad-wash",
    pill: "bg-bad-wash text-bad",
  },
};

/**
 * Status pill styling for inventory vial cards. The gauge fill itself is drawn
 * by `VialGauge` (SVG); this maps each state to its pill label + classes.
 */
export const VIAL_STATUS_STYLE: Record<
  VialGaugeStatus,
  { label: string; pill: string }
> = {
  active: { label: "Active", pill: "bg-ok-wash text-ok" },
  soon: { label: "Expires soon", pill: "bg-warn-wash text-warn-foreground" },
  sealed: { label: "Sealed", pill: "bg-sealed-wash text-sealed" },
  expired: { label: "Expired", pill: "bg-bad-wash text-bad" },
  empty: { label: "Empty", pill: "bg-muted text-muted-foreground" },
};

export const INTERACTION_STYLE: Record<
  InteractionKind,
  { label: string; badge: string }
> = {
  synergy: {
    label: "Synergy",
    badge:
      "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  },
  caution: {
    label: "Caution",
    badge:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  avoid: {
    label: "Avoid",
    badge: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  },
};
