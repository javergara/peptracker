"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deletePhoto } from "@/lib/actions/photos";
import { Button } from "@/components/ui/button";

export function DeletePhotoButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deletePhoto(id);
        toast.success("Photo deleted");
      } catch {
        toast.error("Failed to delete photo");
      }
    });
  }

  return (
    <Button
      variant="destructive"
      size="icon-sm"
      onClick={handleDelete}
      disabled={isPending}
      aria-label="Delete photo"
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
