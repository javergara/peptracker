"use client";

import * as React from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  deleteMeasurement,
  updateMeasurement,
} from "@/lib/actions/measurements";
import { formatDate, toDateInputValue } from "@/lib/dates";

const inputCls =
  "border-input bg-background focus-visible:ring-ring rounded-lg border px-2 py-1 text-xs outline-none focus-visible:ring-2";

export interface MeasurementRowProps {
  id: string;
  typeLabel: string;
  label: string | null;
  value: number;
  unit: string | null;
  recordedAt: string; // ISO
}

/** A single "Recent measurements" row with inline edit + confirm-delete. */
export function MeasurementRow({
  id,
  typeLabel,
  label,
  value,
  unit,
  recordedAt,
}: MeasurementRowProps) {
  const [editing, setEditing] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  function handleDelete() {
    if (!confirm("Delete this measurement? This can't be undone.")) return;
    startTransition(async () => {
      try {
        await deleteMeasurement(id);
        toast.success("Measurement deleted");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not delete measurement.",
        );
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateMeasurement(id, formData);
        toast.success("Measurement updated");
        setEditing(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not update measurement.",
        );
      }
    });
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-center gap-2 py-2"
      >
        <fieldset disabled={isPending} className="contents">
          <span className="text-muted-foreground w-20 shrink-0 text-xs">
            {typeLabel}
          </span>
          <input
            name="value"
            type="number"
            step="any"
            inputMode="decimal"
            defaultValue={value}
            required
            className={`${inputCls} w-24`}
            aria-label="Value"
          />
          <input
            name="label"
            defaultValue={label ?? ""}
            placeholder="label"
            className={`${inputCls} w-28`}
            aria-label="Label"
          />
          <input
            name="recordedAt"
            type="date"
            defaultValue={toDateInputValue(recordedAt)}
            className={`${inputCls} w-36`}
            aria-label="Date"
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon-sm"
            aria-label="Save measurement"
          >
            <Check className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Cancel edit"
            onClick={() => setEditing(false)}
          >
            <X className="size-4" />
          </Button>
        </fieldset>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <span className="text-muted-foreground w-20 shrink-0 text-xs">
          {typeLabel}
        </span>
        <span className="num text-sm font-medium">
          {value}
          {unit ? ` ${unit}` : ""}
        </span>
        {label ? (
          <span className="text-muted-foreground text-xs">{label}</span>
        ) : null}
        <span className="text-muted-foreground text-xs">
          {formatDate(recordedAt, "MMM d, yyyy")}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isPending}
          aria-label="Edit measurement"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isPending}
          aria-label="Delete measurement"
          onClick={handleDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
