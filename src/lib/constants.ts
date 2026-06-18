import type {
  PeptideCategory,
  GoalTag,
  InteractionKind,
} from "@/types/peptide";

export const APP_NAME = "Peptides Tracker";

export const DISCLAIMER_SHORT =
  "Educational and research use only. Not medical advice.";

export const DISCLAIMER_LONG =
  "This application is for educational and informational purposes only and is not medical advice. Many peptides listed are research compounds that are not approved for human use. Nothing here is a recommendation to obtain or use any substance. Consult a qualified healthcare professional before making any health decisions.";

/** Tailwind class fragments for badges per category. */
export const CATEGORY_BADGE: Record<PeptideCategory, string> = {
  GLP_GIP:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  GH_SECRETAGOGUE:
    "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  HEALING_REPAIR:
    "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  MITOCHONDRIAL:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  COSMETIC:
    "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30",
  NOOTROPIC_ANXIOLYTIC:
    "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  IMMUNE_ANTIINFLAMMATORY:
    "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
};

export const GOAL_BADGE: Partial<Record<GoalTag, string>> = {
  "fat-loss": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "recovery-injury": "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "cognition-mood": "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

export const INTERACTION_STYLE: Record<
  InteractionKind,
  { label: string; badge: string }
> = {
  synergy: {
    label: "Synergy",
    badge:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
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
