"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { FlaskConical } from "lucide-react";

import { activateStock } from "@/lib/actions/stock";
import { Button } from "@/components/ui/button";

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

/**
 * Inline "activate a vial from stock" form. Asks for the diluent volume, then
 * reconstitutes one reserve vial into an active `Vial` (see activateStock).
 */
export function ActivateStockForm({
  stockId,
  disabled,
  doseLabel,
}: {
  stockId: string;
  disabled?: boolean;
  /** Planned dose shown for reference, e.g. "250 mcg · daily". */
  doseLabel?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <FlaskConical className="size-3.5" />
        Activate
      </Button>
    );
  }

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await activateStock(formData);
        toast.success("Vial activated — now in tracking");
        setOpen(false);
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not activate vial.",
        );
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-2">
      <input type="hidden" name="stockId" value={stockId} />
      {doseLabel ? (
        <p className="text-muted-foreground text-[11px]">Dose: {doseLabel}</p>
      ) : null}
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium">BAC water (mL)</label>
          <input
            name="bacWaterMl"
            type="number"
            step="0.1"
            min="0.1"
            required
            placeholder="e.g. 2"
            className={inputCls}
          />
        </div>
        <Button type="submit" size="sm" disabled={isPending}>
          Save
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
