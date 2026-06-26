"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { cn } from "@/lib/utils";

const RANGES = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "1y", value: "1y" },
] as const;

export type RangeValue = (typeof RANGES)[number]["value"];
export const DEFAULT_RANGE: RangeValue = "30d";

function RangeControlInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = (searchParams.get("range") as RangeValue) ?? DEFAULT_RANGE;
  const isValid = RANGES.some((r) => r.value === current);
  const active = isValid ? current : DEFAULT_RANGE;

  function pick(value: RangeValue) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div
      className="border-border bg-card flex gap-0 rounded-[11px] border p-[3px]"
      role="group"
      aria-label="Time range"
    >
      {RANGES.map((r) => {
        const isActive = r.value === active;
        return (
          <button
            key={r.value}
            type="button"
            onClick={() => pick(r.value)}
            aria-pressed={isActive}
            className={cn(
              "focus-visible:ring-ring rounded-[8px] px-3 py-[7px] text-[12.5px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
              isActive
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

/** Segmented time-range control. Reads/writes `?range` in the URL. */
export function MetricsRangeControl() {
  return (
    <Suspense
      fallback={
        <div className="border-border bg-card flex gap-0 rounded-[11px] border p-[3px]">
          {RANGES.map((r) => (
            <span
              key={r.value}
              className={cn(
                "rounded-[8px] px-3 py-[7px] text-[12.5px] font-medium",
                r.value === DEFAULT_RANGE
                  ? "bg-foreground text-background"
                  : "text-muted-foreground",
              )}
            >
              {r.label}
            </span>
          ))}
        </div>
      }
    >
      <RangeControlInner />
    </Suspense>
  );
}
