"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { deleteVial } from "@/lib/actions/vials";
import { Button } from "@/components/ui/button";

export function DeleteVialButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={isPending}
      aria-label="Delete vial"
      onClick={() =>
        startTransition(async () => {
          try {
            await deleteVial(id);
            toast.success("Vial deleted");
          } catch {
            toast.error("Could not delete vial.");
          }
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
