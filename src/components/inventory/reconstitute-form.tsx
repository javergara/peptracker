"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { FlaskConical } from "lucide-react";

import { reconstituteVial } from "@/lib/actions/vials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReconstituteForm({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FlaskConical className="size-3.5" />
        Reconstitute
      </Button>
    );
  }

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await reconstituteVial(formData);
        toast.success("Vial reconstituted");
        setOpen(false);
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not reconstitute vial.",
        );
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="flex-1 space-y-1">
        <label className="text-xs font-medium">BAC water (mL)</label>
        <Input
          name="bacWaterMl"
          type="number"
          step="0.1"
          min="0.1"
          inputMode="decimal"
          required
          placeholder="e.g. 2"
        />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        Save
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
    </form>
  );
}
