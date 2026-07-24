"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { logAgain } from "@/lib/actions/food";

export interface RecentFood {
  id: string;
  name: string;
  calories: number;
}

/**
 * One-tap re-log of recently eaten foods. Each chip re-creates that entry on the
 * viewed day (server reuses the original meal). The biggest daily-friction win.
 */
export function RecentsStrip({
  recents,
  date,
}: {
  recents: RecentFood[];
  /** yyyy-MM-dd the chip logs into. */
  date: string;
}) {
  const [isPending, start] = useTransition();
  if (recents.length === 0) return null;

  function add(food: RecentFood) {
    start(async () => {
      const fd = new FormData();
      fd.set("date", date);
      try {
        await logAgain(food.id, fd);
        toast.success(`Logged ${food.name}`);
      } catch {
        toast.error("Could not log that food.");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {recents.map((f) => (
        <button
          key={f.id}
          type="button"
          disabled={isPending}
          onClick={() => add(f)}
          className="border-border bg-card hover:bg-accent focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
        >
          <RotateCcw className="text-muted-foreground size-3.5" />
          <span className="max-w-[10rem] truncate">{f.name}</span>
          <span className="num text-muted-foreground text-xs">
            {f.calories} kcal
          </span>
        </button>
      ))}
    </div>
  );
}
