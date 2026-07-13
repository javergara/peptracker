"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Syringe } from "lucide-react";

import { logDose } from "@/lib/actions/doses";
import { DUPLICATE_DOSE_ERROR } from "@/lib/dose-guard";
import { Button } from "@/components/ui/button";
import { toDateTimeLocalValue } from "@/lib/dates";
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
  guard = true,
}: {
  cycleId: string;
  peptideId: string;
  amount: number;
  unit: string;
  site: string;
  /** Optional short label (e.g. peptide name) for stack rows with several buttons. */
  label?: string;
  className?: string;
  /**
   * Whether to guard against an accidental duplicate (confirm-and-retry when the
   * same peptide was logged recently). Defaults true; pass false for
   * administrations that legitimately expect several doses in a day.
   */
  guard?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function buildFormData(confirmDuplicate: boolean) {
    const formData = new FormData();
    formData.set("peptideId", peptideId);
    formData.set("cycleId", cycleId);
    formData.set("amount", String(amount));
    formData.set("unit", unit);
    formData.set("site", site);
    // Ask the server to guard against an accidental double-log of this peptide.
    if (guard) formData.set("guardDuplicate", "true");
    if (confirmDuplicate) formData.set("confirmDuplicate", "true");
    // Local wall-clock string (not UTC ISO) so the logged time matches the
    // user's clock, consistent with the log form + calendar quick-log.
    formData.set("takenAt", toDateTimeLocalValue(new Date()));
    return formData;
  }

  function onClick() {
    startTransition(async () => {
      try {
        await logDose(buildFormData(false));
        toast.success(`Dose logged — ${amount} ${unit}`);
      } catch (err) {
        // Recent same-peptide dose: confirm, then retry bypassing the guard.
        if (err instanceof Error && err.message === DUPLICATE_DOSE_ERROR) {
          const name = label ?? "this peptide";
          if (
            !confirm(
              `You already logged ${name} in the last few hours. Log another dose anyway?`,
            )
          ) {
            return;
          }
          try {
            await logDose(buildFormData(true));
            toast.success(`Dose logged — ${amount} ${unit}`);
          } catch (retryErr) {
            toast.error(
              retryErr instanceof Error
                ? retryErr.message
                : "Could not log dose.",
            );
          }
          return;
        }
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
