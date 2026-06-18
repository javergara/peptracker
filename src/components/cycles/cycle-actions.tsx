"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import {
  deleteCycle,
  updateCycleStatus,
  type CycleStatusValue,
} from "@/lib/actions/cycles";
import { Button } from "@/components/ui/button";
import { CYCLE_STATUSES } from "@/types/peptide";

export function CycleActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onStatus(value: string) {
    startTransition(async () => {
      try {
        await updateCycleStatus(id, value as CycleStatusValue);
        toast.success(`Status set to ${value}`);
      } catch {
        toast.error("Could not update status.");
      }
    });
  }

  function onDelete() {
    if (!confirm("Delete this cycle and its dose logs?")) return;
    startTransition(async () => {
      try {
        await deleteCycle(id);
        toast.success("Cycle deleted");
        router.push("/cycles");
      } catch {
        toast.error("Could not delete cycle.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Cycle status"
        value={status}
        disabled={isPending}
        onChange={(e) => onStatus(e.target.value)}
        className="border-input bg-background focus-visible:ring-ring rounded-lg border px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2"
      >
        {CYCLE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Button
        variant="destructive"
        size="icon"
        disabled={isPending}
        onClick={onDelete}
        aria-label="Delete cycle"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
