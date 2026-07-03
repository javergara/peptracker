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
import { Input } from "@/components/ui/input";
import { updateLab } from "@/lib/actions/labs";
import { toDateInputValue } from "@/lib/dates";

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
            <Input
              id={`edit-lab-value-${id}`}
              name="value"
              type="number"
              step="any"
              inputMode="decimal"
              min="0"
              defaultValue={value}
              required
              className="px-2 py-1.5"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor={`edit-lab-date-${id}`}
              className="text-xs font-medium"
            >
              Date taken
            </label>
            <Input
              id={`edit-lab-date-${id}`}
              name="takenAt"
              type="date"
              defaultValue={toDateInputValue(takenAt)}
              required
              className="px-2 py-1.5"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor={`edit-lab-notes-${id}`}
              className="text-xs font-medium"
            >
              Notes
            </label>
            <Input
              id={`edit-lab-notes-${id}`}
              name="notes"
              defaultValue={notes ?? ""}
              placeholder="optional"
              maxLength={280}
              className="px-2 py-1.5"
            />
          </div>
          <SubmitButton size="sm">Save</SubmitButton>
        </ActionForm>
      </PopoverContent>
    </Popover>
  );
}
