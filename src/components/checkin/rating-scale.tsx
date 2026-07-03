"use client";

import { RadioGroup } from "@base-ui/react/radio-group";
import { Radio } from "@base-ui/react/radio";
import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * A 1-5 segmented rating control styled as pills, with low/high anchor labels
 * at each end. Built on base-ui's RadioGroup/Radio so it gets a real
 * `role="radiogroup"` + `role="radio"` items, roving-tabindex keyboard
 * navigation (arrow keys), and a hidden native radio input per option — so
 * `name` posts through `FormData` like any other form field. Leaving every
 * option unselected (no `defaultValue`) means the marker is simply skipped.
 */
export function RatingScale({
  name,
  label,
  lowLabel,
  highLabel,
  defaultValue,
}: {
  /** Form field name — submitted as `<name>=<1-5>` when a value is picked. */
  name: string;
  label: string;
  lowLabel: string;
  highLabel: string;
  /** 1-5, or omit to leave the marker unrated. */
  defaultValue?: number;
}) {
  const labelId = useId();

  return (
    <div className="space-y-2">
      <span id={labelId} className="text-sm font-medium">
        {label}
      </span>
      <RadioGroup
        aria-labelledby={labelId}
        name={name}
        defaultValue={defaultValue != null ? String(defaultValue) : undefined}
        className="flex items-center gap-3"
      >
        <span className="text-muted-foreground w-16 shrink-0 text-[11px] leading-tight">
          {lowLabel}
        </span>
        <div className="flex flex-1 items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Radio.Root
              key={n}
              value={String(n)}
              aria-label={`${label}: ${n}`}
              className={cn(
                "num border-input bg-background text-foreground hover:bg-accent flex size-9 items-center justify-center rounded-full border text-[13px] font-semibold transition-colors outline-none",
                "focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2",
                "data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-checked:hover:bg-primary/90",
              )}
            >
              {n}
            </Radio.Root>
          ))}
        </div>
        <span className="text-muted-foreground w-16 shrink-0 text-right text-[11px] leading-tight">
          {highLabel}
        </span>
      </RadioGroup>
    </div>
  );
}
