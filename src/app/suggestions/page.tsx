import { Sparkles } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Disclaimer } from "@/components/disclaimer";
import { SuggestionExplorer } from "@/components/suggestions/suggestion-explorer";
import { listPeptides, listStacks } from "@/lib/queries";
import { asStringArray } from "@/types/peptide";

export const metadata = { title: "Suggestions" };

export default async function SuggestionsPage() {
  const [peptides, stacks] = await Promise.all([listPeptides(), listStacks()]);

  const suggestPeptides = peptides.map((p) => ({
    slug: p.slug,
    name: p.name,
    tags: asStringArray(p.tags),
    category: p.category,
    summary: p.summary,
  }));

  const suggestStacks = stacks.map((s) => ({
    slug: s.slug,
    name: s.name,
    tags: asStringArray(s.tags),
    goal: s.goal,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Suggestions"
        description="Pick a goal to see matching peptides and stacks. Rule-based, from curated tags."
      />
      <Disclaimer className="mb-6" />
      <div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
        <Sparkles className="size-4" />
        Select a goal below
      </div>
      <SuggestionExplorer peptides={suggestPeptides} stacks={suggestStacks} />
    </div>
  );
}

export const dynamic = "force-dynamic";
