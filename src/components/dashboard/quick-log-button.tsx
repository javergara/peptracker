"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Syringe } from "lucide-react";

import { logDose } from "@/lib/actions/doses";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * One-tap dose logging for a dashboard "Today's doses" row. All defaults
 * (peptide, amount, unit, suggested site) are resolved server-side; this just
 * fires `logDose` with `takenAt = now` and no vial (so inventory is untouched).
 */
export function QuickLogButton({
  cycleId,
  peptideId,
  amount,
  unit,
  site,
  label,
  className,
}: {
  cycleId: string;
  peptideId: string;
  amount: number;
  unit: string;
  site: string;
  /** Optional short label (e.g. peptide name) for stack rows with several buttons. */
  label?: string;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("peptideId", peptideId);
        formData.set("cycleId", cycleId);
        formData.set("amount", String(amount));
        formData.set("unit", unit);
        formData.set("site", site);
        formData.set("takenAt", new Date().toISOString());
        await logDose(formData);
        toast.success(`Dose logged — ${amount} ${unit}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not log dose.");
      }
    });
  }

  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={onClick}
      className={cn("gap-1.5", className)}
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Syringe className="size-3.5" />
      )}
      {label ? `Log ${label}` : "Log now"}
    </Button>
  );
}
