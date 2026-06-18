import { AlertTriangle } from "lucide-react";

import { DISCLAIMER_LONG } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Prominent, reusable "not medical advice" banner. */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <p className="leading-relaxed">{DISCLAIMER_LONG}</p>
    </div>
  );
}
