"use client";

import { useState } from "react";
import Link from "next/link";
import { Layers, Pill } from "lucide-react";

import {
  suggestByGoal,
  type SuggestPeptide,
  type SuggestStack,
} from "@/lib/suggestions";
import { GOAL_TAGS, GOAL_LABELS, type GoalTag } from "@/types/peptide";
import { EmptyState } from "@/components/common/empty-state";

interface Props {
  peptides: SuggestPeptide[];
  stacks: SuggestStack[];
}

export function SuggestionExplorer({ peptides, stacks }: Props) {
  const [goal, setGoal] = useState<GoalTag | null>(null);

  const results = goal ? suggestByGoal(goal, peptides, stacks) : null;

  return (
    <div className="space-y-6">
      {/* Goal picker */}
      <div className="flex flex-wrap gap-2">
        {GOAL_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setGoal(goal === tag ? null : tag)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              goal === tag
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted text-foreground"
            }`}
          >
            {GOAL_LABELS[tag]}
          </button>
        ))}
      </div>

      {/* Results */}
      {!goal && (
        <p className="text-muted-foreground text-sm">
          Select a goal above to see matching peptides and stacks.
        </p>
      )}

      {goal && results && (
        <div className="space-y-8">
          {/* Peptides */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold">
              Peptides{" "}
              <span className="text-muted-foreground font-normal">
                ({results.peptides.length})
              </span>
            </h2>
            {results.peptides.length === 0 ? (
              <EmptyState
                icon={<Pill className="size-6" />}
                title="No peptides match this goal"
                description="Try a different goal category."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.peptides.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/peptides/${p.slug}`}
                    className="border-border bg-card hover:border-primary/50 flex flex-col gap-1.5 rounded-xl border p-4 transition-colors"
                  >
                    <span className="text-sm font-semibold">{p.name}</span>
                    {p.summary && (
                      <span className="text-muted-foreground line-clamp-2 text-xs">
                        {p.summary}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Stacks */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold">
              Stacks{" "}
              <span className="text-muted-foreground font-normal">
                ({results.stacks.length})
              </span>
            </h2>
            {results.stacks.length === 0 ? (
              <EmptyState
                icon={<Layers className="size-6" />}
                title="No stacks match this goal"
                description="Try a different goal or build your own stack."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.stacks.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/stacks/${s.slug}`}
                    className="border-border bg-card hover:border-primary/50 flex flex-col gap-1.5 rounded-xl border p-4 transition-colors"
                  >
                    <span className="text-sm font-semibold">{s.name}</span>
                    {s.goal && (
                      <span className="text-muted-foreground text-xs">
                        {s.goal}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
