"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";

import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Button } from "@/components/ui/button";
import {
  StudyFields,
  type StudyFieldValues,
} from "@/components/studies/study-form";
import { deleteStudy, updateStudy } from "@/lib/actions/studies";
import {
  STUDY_MODALITY_LABELS,
  STUDY_STATUS_LABELS,
  STUDY_STATUS_STYLE,
  asStudyModality,
  asStudyStatus,
} from "@/types/study";
import { formatDate } from "@/lib/dates";

export interface StudyRowData extends StudyFieldValues {
  id: string;
}

export function StudyRow({ study }: { study: StudyRowData }) {
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const s = study;
  const status = asStudyStatus(s.status);
  const modality = asStudyModality(s.modality);
  const boundUpdate = updateStudy.bind(null, s.id);

  function handleDelete() {
    if (!confirm(`Delete "${s.name}"?`)) return;
    startDelete(async () => {
      try {
        await deleteStudy(s.id);
        toast.success("Study deleted");
      } catch {
        toast.error("Failed to delete study");
      }
    });
  }

  return (
    <div className="card-surface rounded-[18px] p-5">
      {!editing ? (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{s.name}</span>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STUDY_STATUS_STYLE[status]}`}
                >
                  {STUDY_STATUS_LABELS[status]}
                </span>
                <span className="text-muted-foreground text-xs">
                  {STUDY_MODALITY_LABELS[modality]}
                </span>
              </div>
              <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                {s.bodyRegion ? <span>{s.bodyRegion}</span> : null}
                {s.performedAt ? (
                  <>
                    {s.bodyRegion ? (
                      <span className="text-muted-foreground/60">·</span>
                    ) : null}
                    <span className="num">
                      {formatDate(s.performedAt, "d MMM yyyy")}
                    </span>
                  </>
                ) : null}
                {s.followUpAt ? (
                  <>
                    <span className="text-muted-foreground/60">·</span>
                    <span className="num">
                      Follow-up {formatDate(s.followUpAt, "d MMM yyyy")}
                    </span>
                  </>
                ) : null}
              </div>
              {s.findings ? (
                <p className="text-sm whitespace-pre-wrap">
                  <span className="text-muted-foreground text-xs">
                    Findings:{" "}
                  </span>
                  {s.findings}
                </p>
              ) : null}
              {s.impression ? (
                <p className="text-sm whitespace-pre-wrap">
                  <span className="text-muted-foreground text-xs">
                    Impression:{" "}
                  </span>
                  {s.impression}
                </p>
              ) : null}
              {s.notes ? (
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                  {s.notes}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${s.name}`}
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${s.name}`}
                disabled={isDeleting}
                onClick={handleDelete}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Edit study</span>
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
            success="Study updated"
            resetOnSuccess={false}
            className="grid gap-4 sm:grid-cols-2"
          >
            <StudyFields idPrefix={`edit-${s.id}`} values={s} />
            <div className="flex items-center gap-2 sm:col-span-2">
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
