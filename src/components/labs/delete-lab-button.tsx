"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { deleteLab } from "@/lib/actions/labs";
import { Button } from "@/components/ui/button";

export function DeleteLabButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={isPending}
      aria-label="Delete lab result"
      onClick={() =>
        startTransition(async () => {
          try {
            await deleteLab(id);
            toast.success("Lab result deleted");
          } catch {
            toast.error("Could not delete lab result.");
          }
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
