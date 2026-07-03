"use server";

import {
  CATEGORY_LABELS,
  asStringArray,
  type PeptideCategory,
} from "@/types/peptide";
import { SYSTEM_LABELS, type BiomarkerSystem } from "@/types/biomarker";
import {
  listBiomarkers,
  listCycles,
  listPeptides,
  listStacks,
} from "@/lib/queries";

/**
 * Global ⌘K search index. Called ONCE (via the client GlobalSearch component)
 * when the palette first opens; results are then filtered entirely client-side
 * on every keystroke (no per-keystroke DB round-trips — see CLAUDE.md free-tier
 * caution). Reference data (peptides/biomarkers) rides the cached `listPeptides`/
 * `listBiomarkers` queries; cycles/stacks are user-scoped reads and stay live.
 */

export type SearchResultType =
  | "nav"
  | "peptide"
  | "biomarker"
  | "cycle"
  | "stack";

export interface SearchItem {
  type: SearchResultType;
  label: string;
  sublabel?: string;
  href: string;
  /** Extra lowercase-able terms (e.g. peptide/biomarker aliases) folded into matching. */
  keywords?: string;
}

const STATIC_NAV: SearchItem[] = [
  { type: "nav", label: "Dashboard", href: "/" },
  { type: "nav", label: "Log Dose", href: "/log" },
  { type: "nav", label: "Calendar", href: "/calendar" },
  { type: "nav", label: "Inventory", href: "/inventory" },
  { type: "nav", label: "Labs", href: "/labs" },
  { type: "nav", label: "Metrics", href: "/metrics" },
  { type: "nav", label: "Photos", href: "/photos" },
  { type: "nav", label: "Supplements", href: "/supplements" },
  { type: "nav", label: "Journal", href: "/journal" },
  { type: "nav", label: "Suggestions", href: "/suggestions" },
  { type: "nav", label: "Settings", href: "/settings" },
];

const CYCLE_STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

export async function getSearchIndex(): Promise<SearchItem[]> {
  const [peptides, biomarkers, stacks, cycles] = await Promise.all([
    listPeptides(),
    listBiomarkers(),
    listStacks(),
    listCycles(),
  ]);

  const peptideItems: SearchItem[] = peptides.map((p) => ({
    type: "peptide",
    label: p.name,
    sublabel: CATEGORY_LABELS[p.category as PeptideCategory] ?? p.category,
    href: `/peptides/${p.slug}`,
    keywords: asStringArray(p.aliases).join(" "),
  }));

  const biomarkerItems: SearchItem[] = biomarkers.map((b) => ({
    type: "biomarker",
    label: b.name,
    sublabel: SYSTEM_LABELS[b.system as BiomarkerSystem] ?? b.system,
    href: `/biomarkers/${b.slug}`,
    keywords: asStringArray(b.aliases).join(" "),
  }));

  const stackItems: SearchItem[] = stacks.map((s) => ({
    type: "stack",
    label: s.name,
    sublabel: s.isPreset ? "Preset stack" : "Your stack",
    href: `/stacks/${s.slug}`,
  }));

  const cycleItems: SearchItem[] = cycles.map((c) => ({
    type: "cycle",
    label: c.name,
    sublabel: CYCLE_STATUS_LABELS[c.status] ?? c.status,
    href: `/cycles/${c.id}`,
  }));

  return [
    ...STATIC_NAV,
    ...peptideItems,
    ...biomarkerItems,
    ...cycleItems,
    ...stackItems,
  ];
}
