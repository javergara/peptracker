import { Pill } from "lucide-react";

import type { SupplementAdherence as SupplementAdherenceData } from "@/lib/queries";
import { Eyebrow } from "@/components/common/eyebrow";

/**
 * Compact dashboard card of today's dose-timing progress for active
 * supplements that have `timesPerDay` configured. Renders nothing when there
 * are none (continuous, untracked supplements don't show here).
 */
export function SupplementAdherence({
  items,
}: {
  items: SupplementAdherenceData[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
      <div className="mb-3.5 flex items-center gap-2">
        <Pill className="text-muted-foreground size-4" />
        <Eyebrow>Supplements today</Eyebrow>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const pct =
            item.expectedToday > 0
              ? Math.min(
                  100,
                  Math.round((item.takenToday / item.expectedToday) * 100),
                )
              : 0;
          return (
            <div key={item.id}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="text-foreground truncate text-[13px] font-medium">
                  {item.name}
                </span>
                <span className="num text-muted-foreground shrink-0 text-[12px]">
                  {item.takenToday}/{item.expectedToday}
                </span>
              </div>
              <div className="bg-accent h-1.5 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full [background:var(--gradient-gauge)]"
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={item.takenToday}
                  aria-valuemin={0}
                  aria-valuemax={item.expectedToday}
                  aria-label={`${item.name} intake today`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
