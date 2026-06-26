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
import { Eyebrow } from "@/components/common/eyebrow";
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
            className={`focus-visible:ring-ring rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
              goal === tag
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-accent text-foreground"
            }`}
          >
            {GOAL_LABELS[tag]}
          </button>
        ))}
      </div>

      {/* Hint when nothing selected */}
      {!goal && (
        <p className="text-muted-foreground text-sm">
          Select a goal above to see matching peptides and stacks.
        </p>
      )}

      {goal && results && (
        <div className="space-y-8">
          {/* Peptides section */}
          <section className="space-y-3">
            <div className="flex items-baseline gap-2">
              <h2 className="font-display text-foreground text-base font-semibold">
                Peptides
              </h2>
              <span className="num text-muted-foreground text-sm">
                {results.peptides.length}
              </span>
            </div>

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
                    className="group block focus-visible:outline-none"
                  >
                    <div className="card-surface group-focus-visible:ring-ring flex h-full flex-col gap-2 rounded-[18px] p-4 [box-shadow:var(--shadow-card)] transition-shadow duration-150 group-hover:[box-shadow:var(--shadow-card-hover)] group-focus-visible:ring-2">
                      <Eyebrow className="text-[#8B86AD]">PEPTIDE</Eyebrow>
                      <span className="font-display text-foreground text-sm font-semibold">
                        {p.name}
                      </span>
                      {p.summary && (
                        <span className="text-muted-foreground line-clamp-2 flex-1 text-xs leading-relaxed">
                          {p.summary}
                        </span>
                      )}
                      <span className="text-primary mt-auto text-xs font-medium">
                        View details →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Stacks section */}
          <section className="space-y-3">
            <div className="flex items-baseline gap-2">
              <h2 className="font-display text-foreground text-base font-semibold">
                Stacks
              </h2>
              <span className="num text-muted-foreground text-sm">
                {results.stacks.length}
              </span>
            </div>

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
                    className="group block focus-visible:outline-none"
                  >
                    <div className="card-surface group-focus-visible:ring-ring flex h-full flex-col gap-2 rounded-[18px] p-4 [box-shadow:var(--shadow-card)] transition-shadow duration-150 group-hover:[box-shadow:var(--shadow-card-hover)] group-focus-visible:ring-2">
                      {s.goal && (
                        <Eyebrow className="text-[#8B86AD]">{s.goal}</Eyebrow>
                      )}
                      {!s.goal && (
                        <Eyebrow className="text-[#8B86AD]">STACK</Eyebrow>
                      )}
                      <span className="font-display text-foreground text-sm font-semibold">
                        {s.name}
                      </span>
                      <span className="text-primary mt-auto text-xs font-medium">
                        View details →
                      </span>
                    </div>
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
