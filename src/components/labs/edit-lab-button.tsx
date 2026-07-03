"use client";

import * as React from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { updateLab } from "@/lib/actions/labs";
import { toDateInputValue } from "@/lib/dates";

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-2 py-1.5 text-sm outline-none focus-visible:ring-2";

export interface EditLabButtonProps {
  id: string;
  marker: string;
  value: number;
  takenAt: string; // ISO
  notes: string | null;
}

/**
 * Small popover to correct a logged result's value/date/notes. Reference
 * ranges are snapshotted at entry and are intentionally NOT editable here.
 */
export function EditLabButton({
  id,
  marker,
  value,
  takenAt,
  notes,
}: EditLabButtonProps) {
  const [open, setOpen] = React.useState(false);

  async function handleUpdate(formData: FormData) {
    await updateLab(id, formData);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${marker} result`}
          />
        }
      >
        <Pencil className="size-4" />
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Edit {marker}</PopoverTitle>
        </PopoverHeader>
        <ActionForm
          action={handleUpdate}
          success="Lab result updated"
          resetOnSuccess={false}
          className="grid gap-3"
        >
          <div className="space-y-1">
            <label
              htmlFor={`edit-lab-value-${id}`}
              className="text-xs font-medium"
            >
              Value
            </label>
            <input
              id={`edit-lab-value-${id}`}
              name="value"
              type="number"
              step="any"
              inputMode="decimal"
              defaultValue={value}
              required
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor={`edit-lab-date-${id}`}
              className="text-xs font-medium"
            >
              Date taken
            </label>
            <input
              id={`edit-lab-date-${id}`}
              name="takenAt"
              type="date"
              defaultValue={toDateInputValue(takenAt)}
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor={`edit-lab-notes-${id}`}
              className="text-xs font-medium"
            >
              Notes
            </label>
            <input
              id={`edit-lab-notes-${id}`}
              name="notes"
              defaultValue={notes ?? ""}
              placeholder="optional"
              className={inputCls}
            />
          </div>
          <SubmitButton size="sm">Save</SubmitButton>
        </ActionForm>
      </PopoverContent>
    </Popover>
  );
}
