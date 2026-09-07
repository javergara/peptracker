"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";

import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Button } from "@/components/ui/button";
import {
  FamilyFields,
  type FamilyFieldValues,
} from "@/components/health/family-history-form";
import {
  deleteFamilyHistory,
  updateFamilyHistory,
} from "@/lib/actions/health-profile";

export interface FamilyHistoryRowData extends FamilyFieldValues {
  id: string;
}

export function FamilyHistoryRow({ entry }: { entry: FamilyHistoryRowData }) {
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const boundUpdate = updateFamilyHistory.bind(null, entry.id);

  function handleDelete() {
    if (!confirm("Delete this family history entry?")) return;
    startDelete(async () => {
      try {
        await deleteFamilyHistory(entry.id);
        toast.success("Entry deleted");
      } catch {
        toast.error("Failed to delete entry");
      }
    });
  }

  return (
    <div className="border-border flex items-start justify-between gap-3 border-b py-2.5 last:border-b-0">
      {!editing ? (
        <>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-medium">{entry.condition}</span>
              {entry.notes ? (
                <span className="text-muted-foreground"> — {entry.notes}</span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${entry.condition}`}
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${entry.condition}`}
              disabled={isDeleting}
              onClick={handleDelete}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </>
      ) : (
        <div className="w-full">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Edit entry</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Cancel edit"
              onClick={() => setEditing(false)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
          <ActionForm
            action={async (fd) => {
              await boundUpdate(fd);
              setEditing(false);
            }}
            success="Entry updated"
            resetOnSuccess={false}
            className="grid gap-4 sm:grid-cols-3"
          >
            <FamilyFields idPrefix={`edit-${entry.id}`} values={entry} />
            <div className="flex items-center gap-2 sm:col-span-3">
              <SubmitButton size="sm">
                <Check className="size-3.5" />
                Save
              </SubmitButton>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
