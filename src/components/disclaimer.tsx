import { AlertTriangle } from "lucide-react";

import { DISCLAIMER_LONG } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Prominent, reusable "not medical advice" banner. */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "border-warn/30 bg-warn-wash text-warn-foreground flex gap-3 rounded-lg border p-3 text-sm",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <p className="leading-relaxed">{DISCLAIMER_LONG}</p>
    </div>
  );
}
