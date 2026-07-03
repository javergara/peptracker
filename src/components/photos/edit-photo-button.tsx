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
import { updatePhotoCaption } from "@/lib/actions/photos";
import { toDateInputValue } from "@/lib/dates";

export interface EditPhotoButtonProps {
  id: string;
  caption: string | null;
  takenAt: string; // ISO
}

/** Small popover for correcting a photo's caption/date — never touches the file. */
export function EditPhotoButton({
  id,
  caption,
  takenAt,
}: EditPhotoButtonProps) {
  const [open, setOpen] = React.useState(false);

  async function handleUpdate(formData: FormData) {
    await updatePhotoCaption(id, formData);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label="Edit caption"
          />
        }
      >
        <Pencil className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Edit photo</PopoverTitle>
        </PopoverHeader>
        <ActionForm
          action={handleUpdate}
          success="Photo updated"
          resetOnSuccess={false}
          className="grid gap-3"
        >
          <div className="space-y-1">
            <label
              htmlFor={`edit-photo-caption-${id}`}
              className="text-xs font-medium"
            >
              Caption
            </label>
            <Input
              id={`edit-photo-caption-${id}`}
              name="caption"
              defaultValue={caption ?? ""}
              placeholder="e.g. Week 4 front"
              maxLength={120}
              className="px-2 py-1.5"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor={`edit-photo-date-${id}`}
              className="text-xs font-medium"
            >
              Date taken
            </label>
            <Input
              id={`edit-photo-date-${id}`}
              name="takenAt"
              type="date"
              defaultValue={toDateInputValue(takenAt)}
              required
              className="px-2 py-1.5"
            />
          </div>
          <SubmitButton size="sm">Save</SubmitButton>
        </ActionForm>
      </PopoverContent>
    </Popover>
  );
}
