"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { deleteStack } from "@/lib/actions/stacks";

export function DeleteStackButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label={`Delete ${name}`}
      disabled={isPending}
      className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors disabled:pointer-events-none disabled:opacity-50"
      onClick={() =>
        startTransition(async () => {
          try {
            await deleteStack(id);
            toast.success("Stack deleted");
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Could not delete stack.",
            );
          }
        })
      }
    >
      <Trash2 className="size-4" />
    </button>
  );
}
