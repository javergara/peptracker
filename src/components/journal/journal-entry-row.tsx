"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";

import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Button } from "@/components/ui/button";
import { updateJournalEntry, deleteJournalEntry } from "@/lib/actions/journal";
import { formatDate } from "@/lib/dates";

const textareaCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export interface JournalEntryRowData {
  id: string;
  date: Date;
  body: string;
}

export function JournalEntryRow({
  entry,
  accentColor,
}: {
  entry: JournalEntryRowData;
  accentColor?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const boundUpdate = updateJournalEntry.bind(null, entry.id);

  function handleDelete() {
    if (!confirm("Delete this journal entry?")) return;
    startDelete(async () => {
      try {
        await deleteJournalEntry(entry.id);
        toast.success("Journal entry deleted");
      } catch {
        toast.error("Failed to delete journal entry");
      }
    });
  }

  return (
    <div className="card-surface rounded-[18px] p-5">
      {!editing ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {accentColor ? (
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: accentColor }}
                />
              ) : null}
              <span className="num text-muted-foreground text-xs">
                {formatDate(entry.date, "MMM d, yyyy · h:mm a")}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{entry.body}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit entry"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete entry"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div>
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
            success="Journal entry updated"
            resetOnSuccess={false}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <label htmlFor={`body-${entry.id}`} className="sr-only">
                Entry
              </label>
              <textarea
                id={`body-${entry.id}`}
                name="body"
                required
                rows={4}
                defaultValue={entry.body}
                className={textareaCls}
              />
            </div>
            <div className="flex items-center gap-2">
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
