"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { deleteProfile } from "@/lib/actions/profiles";
import { Button } from "@/components/ui/button";

export function DeleteProfileButton({
  id,
  name,
  disabled,
}: {
  id: string;
  name: string;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={disabled || isPending}
      aria-label={`Delete ${name}`}
      onClick={() => {
        if (
          !confirm(
            `Delete profile "${name}" and all of its cycles, dose logs, and metrics? This cannot be undone.`,
          )
        )
          return;
        startTransition(async () => {
          try {
            await deleteProfile(id);
            toast.success("Profile deleted");
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Could not delete profile.",
            );
          }
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
