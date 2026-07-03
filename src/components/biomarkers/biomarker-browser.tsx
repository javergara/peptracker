"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { useState, useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/common/eyebrow";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";
import {
  BIOMARKER_SYSTEMS,
  SYSTEM_LABELS,
  type BiomarkerSystem,
} from "@/types/biomarker";
import { SYSTEM_BADGE } from "@/lib/constants";

export interface BiomarkerCard {
  id: string;
  slug: string;
  name: string;
  system: BiomarkerSystem;
  unit: string;
  summary: string;
  aliases: string[];
}

interface BiomarkerBrowserProps {
  biomarkers: BiomarkerCard[];
}

export function BiomarkerBrowser({ biomarkers }: BiomarkerBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local state for snappy typing; the URL is kept in sync so filters are
  // shareable / bookmarkable / survive reload.
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [system, setSystem] = useState<string>(
    () => searchParams.get("system") ?? "all",
  );

  function syncUrl(q: string, sys: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sys !== "all") params.set("system", sys);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function updateQuery(q: string) {
    setQuery(q);
    syncUrl(q, system);
  }
  function updateSystem(sys: string) {
    setSystem(sys);
    syncUrl(query, sys);
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return biomarkers.filter((b) => {
      const matchesSystem = system === "all" || b.system === system;
      if (!matchesSystem) return false;
      if (!q) return true;
      const aliasText = b.aliases.join(" ").toLowerCase();
      return (
        b.name.toLowerCase().includes(q) ||
        aliasText.includes(q) ||
        b.summary.toLowerCase().includes(q)
      );
    });
  }, [biomarkers, query, system]);

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search biomarkers by name, alias, or summary…"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-lg border py-2 pr-3 pl-9 text-sm outline-none focus-visible:ring-2"
          />
        </div>
        {/* System select */}
        <div className="relative flex items-center gap-2">
          <SlidersHorizontal className="text-muted-foreground size-4 shrink-0" />
          <select
            value={system}
            onChange={(e) => updateSystem(e.target.value)}
            className="border-input bg-background focus-visible:ring-ring rounded-lg border py-2 pr-8 pl-3 text-sm outline-none focus-visible:ring-2"
          >
            <option value="all">All systems</option>
            {BIOMARKER_SYSTEMS.map((sys) => (
              <option key={sys} value={sys}>
                {SYSTEM_LABELS[sys]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2">
        <Eyebrow>
          <span className="num">{filtered.length}</span> biomarker
          {filtered.length !== 1 ? "s" : ""}
        </Eyebrow>
        {(query || system !== "all") && (
          <button
            onClick={() => {
              setQuery("");
              setSystem("all");
              syncUrl("", "all");
            }}
            className="text-primary eyebrow hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="size-8" />}
          title="No biomarkers found"
          description="Try a different search term or system filter."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((biomarker) => (
            <Link
              key={biomarker.id}
              href={`/biomarkers/${biomarker.slug}`}
              className="group block focus-visible:outline-none"
            >
              <div
                className={cn(
                  "card-surface h-full rounded-2xl px-5 py-4",
                  "group-focus-visible:ring-ring group-focus-visible:ring-2",
                )}
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <Eyebrow>{SYSTEM_LABELS[biomarker.system]}</Eyebrow>
                  <span className="num text-muted-foreground text-xs">
                    {biomarker.unit}
                  </span>
                </div>
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-base leading-snug font-semibold tracking-tight">
                    {biomarker.name}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(SYSTEM_BADGE[biomarker.system])}
                  >
                    {SYSTEM_LABELS[biomarker.system]}
                  </Badge>
                </div>
                <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
                  {biomarker.summary}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
