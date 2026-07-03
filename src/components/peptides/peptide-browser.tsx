"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { useState, useMemo } from "react";

import { RouteBadge, GoalBadges } from "@/components/common/badges";
import { Eyebrow } from "@/components/common/eyebrow";
import { EmptyState } from "@/components/common/empty-state";
import { asStringArray } from "@/types/peptide";
import {
  CATEGORY_LABELS,
  PEPTIDE_CATEGORIES,
  type PeptideCategory,
} from "@/types/peptide";
import type { Peptide } from "@/generated/prisma/client";

interface PeptideBrowserProps {
  peptides: Peptide[];
}

export function PeptideBrowser({ peptides }: PeptideBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local state for snappy typing; the URL is kept in sync so filters are
  // shareable / bookmarkable / survive reload.
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [category, setCategory] = useState<string>(
    () => searchParams.get("cat") ?? "all",
  );

  function syncUrl(q: string, cat: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cat !== "all") params.set("cat", cat);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function updateQuery(q: string) {
    setQuery(q);
    syncUrl(q, category);
  }
  function updateCategory(cat: string) {
    setCategory(cat);
    syncUrl(query, cat);
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return peptides.filter((p) => {
      const matchesCategory = category === "all" || p.category === category;
      if (!matchesCategory) return false;
      if (!q) return true;
      const aliases = asStringArray(p.aliases).join(" ").toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        aliases.includes(q) ||
        (p.summary ?? "").toLowerCase().includes(q)
      );
    });
  }, [peptides, query, category]);

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search peptides by name, alias, or summary…"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-lg border py-2 pr-3 pl-9 text-sm outline-none focus-visible:ring-2"
          />
        </div>
        {/* Category select */}
        <div className="relative flex items-center gap-2">
          <SlidersHorizontal className="text-muted-foreground size-4 shrink-0" />
          <select
            value={category}
            onChange={(e) => updateCategory(e.target.value)}
            className="border-input bg-background focus-visible:ring-ring rounded-lg border py-2 pr-8 pl-3 text-sm outline-none focus-visible:ring-2"
          >
            <option value="all">All categories</option>
            {PEPTIDE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat as PeptideCategory]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-muted-foreground text-sm">
        <span className="num">{filtered.length}</span> peptide
        {filtered.length !== 1 ? "s" : ""}
        {(query || category !== "all") && (
          <button
            onClick={() => {
              setQuery("");
              setCategory("all");
              syncUrl("", "all");
            }}
            className="text-primary ml-2 hover:underline"
          >
            Clear filters
          </button>
        )}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="size-8" />}
          title="No peptides found"
          description="Try a different search term or category."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((peptide) => {
            const tags = asStringArray(peptide.tags);
            return (
              <Link
                key={peptide.id}
                href={`/peptides/${peptide.slug}`}
                className="group block focus-visible:outline-none"
              >
                <div className="card-surface group-focus-visible:ring-ring flex h-full flex-col gap-3 rounded-[18px] p-5 group-focus-visible:ring-2">
                  {/* Category eyebrow */}
                  <Eyebrow>
                    {CATEGORY_LABELS[peptide.category as PeptideCategory] ??
                      peptide.category}
                  </Eyebrow>

                  {/* Name + badges */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-display text-foreground text-base leading-snug font-semibold">
                      {peptide.name}
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      <RouteBadge route={peptide.route} />
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-muted-foreground line-clamp-3 flex-1 text-sm leading-relaxed">
                    {peptide.summary}
                  </p>

                  {/* Goal badges */}
                  {tags.length > 0 && <GoalBadges tags={tags} />}

                  {/* Footer caret */}
                  <span className="text-primary mt-auto text-xs font-medium">
                    View details →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
