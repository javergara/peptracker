"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { deleteDose, restoreDose } from "@/lib/actions/doses";
import { Button } from "@/components/ui/button";

export function DeleteDoseButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={isPending}
      aria-label="Delete dose"
      onClick={() =>
        startTransition(async () => {
          try {
            const snapshot = await deleteDose(id);
            // Soft-delete UX: let the user undo from the toast.
            toast.success("Dose deleted", {
              action: {
                label: "Undo",
                onClick: () =>
                  restoreDose(snapshot)
                    .then(() => toast.success("Dose restored"))
                    .catch(() => toast.error("Couldn't undo.")),
              },
            });
          } catch {
            toast.error("Could not delete dose.");
          }
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
