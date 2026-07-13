import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import type { StockLevel } from "@/lib/queries";
import { isLowStock } from "@/lib/stock";

/**
 * Dashboard low-stock warning: peptides running low on supply — under ~2 weeks
 * of doses left where a planned dose/cadence is known, else ≤1 vial on hand.
 * Renders nothing when everything is well-stocked.
 */
export function LowStockAlert({ levels }: { levels: StockLevel[] }) {
  const low = levels
    .filter((l) => isLowStock(l))
    .sort(
      (a, b) =>
        (a.daysOfSupply ?? Infinity) - (b.daysOfSupply ?? Infinity) ||
        a.total - b.total,
    );
  if (low.length === 0) return null;

  return (
    <section className="bg-warn-wash border-warn/30 mb-[18px] rounded-[18px] border p-5">
      <div className="text-warn-foreground flex items-center gap-2">
        <AlertTriangle className="size-4 shrink-0" />
        <h2 className="font-display text-[15px] font-semibold">
          Low stock — reorder soon
        </h2>
      </div>
      <ul className="mt-3 space-y-1.5">
        {low.map((l) => (
          <li
            key={l.peptideId}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <span className="text-foreground font-medium">{l.peptideName}</span>
            <span className="text-muted-foreground num text-xs">
              {l.daysOfSupply != null
                ? `~${l.daysOfSupply} day${l.daysOfSupply === 1 ? "" : "s"} left · `
                : ""}
              {l.total} vial{l.total === 1 ? "" : "s"} ({l.stockVials} stock +{" "}
              {l.activeVials} in use)
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/inventory?tab=stock"
        className="text-warn-foreground mt-3 inline-block text-xs font-semibold underline underline-offset-4"
      >
        Manage stock →
      </Link>
    </section>
  );
}
