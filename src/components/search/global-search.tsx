"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { getSearchIndex, type SearchItem } from "@/lib/actions/search";
import { Eyebrow } from "@/components/common/eyebrow";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Global ⌘K / Ctrl+K command palette. The search index (nav + peptides +
 * biomarkers + the profile's cycles/stacks) is loaded ONCE via the
 * `getSearchIndex` server action the first time the palette opens, then every
 * keystroke filters that in-memory array — no per-keystroke DB round-trips
 * (see CLAUDE.md free-tier caution).
 *
 * Open state is owned by the parent (`AppShell`) so both the desktop sidebar
 * trigger and the mobile Sheet trigger can open the same dialog instance.
 */

const GROUP_LABELS: Record<SearchItem["type"], string> = {
  nav: "Navigate",
  peptide: "Peptides",
  biomarker: "Biomarkers",
  cycle: "Your cycles",
  stack: "Your stacks",
};

const GROUP_ORDER: SearchItem["type"][] = [
  "nav",
  "peptide",
  "biomarker",
  "cycle",
  "stack",
];

const MAX_PER_GROUP = 6;

function normalize(value: string): string {
  // NFD splits accented chars into base + combining marks (U+0300–U+036F),
  // so stripping that range makes matching diacritic-insensitive (e.g. "peptide" vs "péptide").
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

type FlatItem = SearchItem & { flatIndex: number };
type Group = { type: SearchItem["type"]; label: string; items: FlatItem[] };

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [index, setIndex] = React.useState<SearchItem[] | null>(null);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const itemRefs = React.useRef(new Map<number, HTMLElement>());
  const fetchingRef = React.useRef(false);
  const loading = index === null;

  /** Closes the dialog and resets the transient query/selection state. */
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      onOpenChange(next);
      if (!next) {
        setQuery("");
        setActiveIndex(0);
      }
    },
    [onOpenChange],
  );

  // Global ⌘K / Ctrl+K listener — works regardless of which trigger opened it
  // last, and even if the dialog is already closed.
  React.useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        handleOpenChange(true);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [handleOpenChange]);

  // Load the index once, on first open only.
  React.useEffect(() => {
    if (!open || index !== null || fetchingRef.current) return;
    fetchingRef.current = true;
    getSearchIndex()
      .then(setIndex)
      .catch(() => setIndex([]))
      .finally(() => {
        fetchingRef.current = false;
      });
  }, [open, index]);

  // Autofocus the search input whenever the dialog opens.
  React.useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const groups = React.useMemo<Group[]>(() => {
    if (!index) return [];
    const q = normalize(query);
    const matches = q
      ? index.filter((item) => {
          const haystack = normalize(
            [item.label, item.sublabel, item.keywords]
              .filter(Boolean)
              .join(" "),
          );
          return haystack.includes(q);
        })
      : index.filter((item) => item.type === "nav");

    const byType = new Map<SearchItem["type"], SearchItem[]>();
    for (const item of matches) {
      const list = byType.get(item.type) ?? [];
      if (list.length < MAX_PER_GROUP) list.push(item);
      byType.set(item.type, list);
    }

    let counter = 0;
    return GROUP_ORDER.filter((type) => byType.has(type)).map((type) => ({
      type,
      label: GROUP_LABELS[type],
      items: byType
        .get(type)!
        .map((item) => ({ ...item, flatIndex: counter++ })),
    }));
  }, [index, query]);

  const flatResults = React.useMemo(
    () => groups.flatMap((g) => g.items),
    [groups],
  );

  // Keep the active option in view when navigating with arrow keys.
  React.useEffect(() => {
    itemRefs.current.get(activeIndex)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function handleQueryChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    setActiveIndex(0); // new query -> reselect the top result
  }

  function select(item: SearchItem) {
    handleOpenChange(false);
    router.push(item.href);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = flatResults[activeIndex];
      if (item) select(item);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[16%] max-w-lg translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Search Peptra</DialogTitle>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search
            className="text-muted-foreground size-4 shrink-0"
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder="Search peptides, biomarkers, cycles, stacks…"
            aria-label="Search Peptra"
            role="combobox"
            aria-expanded={flatResults.length > 0}
            aria-controls="global-search-results"
            aria-activedescendant={
              flatResults[activeIndex]
                ? `global-search-item-${flatResults[activeIndex].flatIndex}`
                : undefined
            }
            autoComplete="off"
            className="border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="text-muted-foreground border-input hidden shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
            Esc
          </kbd>
        </div>

        <div
          id="global-search-results"
          role="listbox"
          aria-label="Search results"
          className="max-h-[60vh] overflow-y-auto p-2"
        >
          {loading ? (
            <p className="text-muted-foreground px-3 py-8 text-center text-sm">
              Loading…
            </p>
          ) : groups.length === 0 ? (
            <p className="text-muted-foreground px-3 py-8 text-center text-sm">
              {query ? `No results for "${query}".` : "Start typing to search."}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.type} className="mb-2 last:mb-0">
                <Eyebrow className="px-2 py-1.5">{group.label}</Eyebrow>
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active = item.flatIndex === activeIndex;
                    return (
                      <li key={`${item.type}-${item.href}`}>
                        <button
                          type="button"
                          id={`global-search-item-${item.flatIndex}`}
                          role="option"
                          aria-selected={active}
                          ref={(el) => {
                            if (el) itemRefs.current.set(item.flatIndex, el);
                            else itemRefs.current.delete(item.flatIndex);
                          }}
                          onClick={() => select(item)}
                          onMouseEnter={() => setActiveIndex(item.flatIndex)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none",
                            active
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-accent/60",
                          )}
                        >
                          <span className="truncate font-medium">
                            {item.label}
                          </span>
                          {item.sublabel ? (
                            <span className="text-muted-foreground shrink-0 truncate text-xs">
                              {item.sublabel}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
