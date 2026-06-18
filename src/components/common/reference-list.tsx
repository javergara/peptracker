import { ExternalLink } from "lucide-react";

import type { Reference } from "@/types/peptide";

export function ReferenceList({ references }: { references: Reference[] }) {
  if (!references?.length) return null;
  return (
    <ol className="space-y-2 text-sm">
      {references.map((ref, i) => (
        <li key={`${ref.url}-${i}`} className="flex gap-2">
          <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
          <a
            href={ref.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-start gap-1 hover:underline"
          >
            <span>{ref.title}</span>
            <ExternalLink className="mt-0.5 size-3 shrink-0" />
          </a>
        </li>
      ))}
    </ol>
  );
}
