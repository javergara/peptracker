"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Peptide filter for the /log history table. Navigates via `router.push` so
 * the filter lives in the URL (`?peptide=`) — shareable/reload-safe, and
 * changing it resets pagination back to page 1. Reuses the
 * `peptide-browser.tsx` convention of syncing client filter UI to the URL.
 */
export function DoseLogFilters({
  peptides,
  selectedPeptideId,
}: {
  peptides: { id: string; name: string }[];
  selectedPeptideId?: string;
}) {
  const router = useRouter();

  function onChange(value: string | null) {
    router.push(!value || value === "all" ? "/log" : `/log?peptide=${value}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="log-peptide-filter"
        className="text-muted-foreground text-sm font-medium"
      >
        Filter
      </label>
      <Select value={selectedPeptideId ?? "all"} onValueChange={onChange}>
        <SelectTrigger id="log-peptide-filter" size="sm" className="w-[200px]">
          <SelectValue>
            {(value) =>
              !value || value === "all"
                ? "All peptides"
                : (peptides.find((p) => p.id === value)?.name ?? "All peptides")
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All peptides</SelectItem>
          {peptides.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedPeptideId ? (
        <Link
          href="/log"
          className="text-primary text-xs font-medium hover:underline"
        >
          Clear
        </Link>
      ) : null}
    </div>
  );
}
