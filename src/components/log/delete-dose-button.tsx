"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { deleteDose } from "@/lib/actions/doses";
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
            await deleteDose(id);
            toast.success("Dose deleted");
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
