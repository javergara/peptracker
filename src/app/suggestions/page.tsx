import { Sparkles } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Disclaimer } from "@/components/disclaimer";
import { SuggestionExplorer } from "@/components/suggestions/suggestion-explorer";
import {
  getActiveCycles,
  getStockLevels,
  listPeptides,
  listStacks,
} from "@/lib/queries";
import { asReferences, asStringArray } from "@/types/peptide";

export const metadata = { title: "Suggestions" };

export default async function SuggestionsPage() {
  const [peptides, stacks, stockLevels, activeCycles] = await Promise.all([
    listPeptides(),
    listStacks(),
    getStockLevels(),
    getActiveCycles(),
  ]);

  // Peptides the active profile already has on hand or is actively cycling —
  // used to boost/badge suggestions you can act on immediately.
  const ownedPeptideIds = new Set<string>();
  for (const l of stockLevels) {
    if (l.total > 0) ownedPeptideIds.add(l.peptideId);
  }
  for (const c of activeCycles) {
    if (c.peptideId) ownedPeptideIds.add(c.peptideId);
    for (const it of c.stack?.items ?? []) ownedPeptideIds.add(it.peptideId);
  }

  const suggestPeptides = peptides.map((p) => ({
    slug: p.slug,
    name: p.name,
    tags: asStringArray(p.tags),
    category: p.category,
    summary: p.summary,
    referenceCount: asReferences(p.references).length,
    owned: ownedPeptideIds.has(p.id),
  }));

  const suggestStacks = stacks.map((s) => ({
    slug: s.slug,
    name: s.name,
    tags: asStringArray(s.tags),
    goal: s.goal,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Suggestions"
        description="Pick one or more goals — results rank by goal coverage, evidence depth, and what you already have on hand."
      />
      <Disclaimer className="mb-6" />
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Sparkles className="size-4" />
        Select a goal below
      </div>
      <SuggestionExplorer peptides={suggestPeptides} stacks={suggestStacks} />
    </div>
  );
}

export const dynamic = "force-dynamic";
