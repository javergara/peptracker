"use client";

import { useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  completeLabReminder,
  deleteLabReminder,
} from "@/lib/actions/labReminders";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RecheckRowProps {
  id: string;
  label: string;
  dueAt: string; // ISO string (serialised from server)
  note: string | null;
  completedAt: string | null; // ISO string or null
  biomarkerName?: string | null;
  isOverdue: boolean;
}

export function RecheckRow({
  id,
  label,
  dueAt,
  note,
  completedAt,
  biomarkerName,
  isOverdue,
}: RecheckRowProps) {
  const [isPending, startTransition] = useTransition();
  const isCompleted = completedAt !== null;

  function handleComplete() {
    startTransition(async () => {
      try {
        await completeLabReminder(id);
        toast.success("Reminder marked done");
      } catch {
        toast.error("Could not update reminder.");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteLabReminder(id);
        toast.success("Reminder deleted");
      } catch {
        toast.error("Could not delete reminder.");
      }
    });
  }

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 py-2",
        isCompleted && "opacity-50",
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <p
          className={cn(
            "text-sm leading-snug font-medium",
            isCompleted && "line-through",
          )}
        >
          {label}
        </p>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span
            className={cn(
              isOverdue && !isCompleted
                ? "font-medium text-amber-700 dark:text-amber-300"
                : "",
            )}
          >
            {isOverdue && !isCompleted ? "Overdue · " : ""}
            {new Date(dueAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          {biomarkerName ? <span>{biomarkerName}</span> : null}
          {note ? <span className="truncate">{note}</span> : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {!isCompleted ? (
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isPending}
            aria-label="Mark reminder done"
            onClick={handleComplete}
          >
            <Check className="size-4" />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isPending}
          aria-label="Delete reminder"
          onClick={handleDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
