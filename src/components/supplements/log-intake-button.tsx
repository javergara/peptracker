"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  logSupplementIntake,
  deleteSupplementLog,
} from "@/lib/actions/supplements";

/** One-tap intake logging for a dose-timed supplement, with an undo toast. */
export function LogIntakeButton({
  supplementId,
  accentColor,
}: {
  supplementId: string;
  accentColor?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const log = await logSupplementIntake(supplementId);
        toast.success("Intake logged", {
          action: {
            label: "Undo",
            onClick: () =>
              deleteSupplementLog(log.id)
                .then(() => toast.success("Log removed"))
                .catch(() => toast.error("Couldn't undo.")),
          },
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not log intake.",
        );
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={handleClick}
      style={accentColor ? { color: accentColor } : undefined}
    >
      <Check className="size-3.5" />
      Log intake
    </Button>
  );
}
