"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";

import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Button } from "@/components/ui/button";
import {
  ConditionFields,
  type ConditionFieldValues,
} from "@/components/health/condition-form";
import { deleteCondition, updateCondition } from "@/lib/actions/health-profile";
import {
  CONDITION_STATUS_LABELS,
  CONDITION_STATUS_STYLE,
  asConditionStatus,
} from "@/types/health-profile";
import { formatDate } from "@/lib/dates";

export interface ConditionRowData extends ConditionFieldValues {
  id: string;
}

function Chips({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      {values.map((v) => (
        <span
          key={v}
          className="num bg-secondary text-secondary-foreground border-border inline-flex items-center rounded-full border px-2 py-0.5 text-xs"
        >
          {v}
        </span>
      ))}
    </div>
  );
}

export function ConditionRow({ condition }: { condition: ConditionRowData }) {
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const c = condition;
  const status = asConditionStatus(c.status);
  const boundUpdate = updateCondition.bind(null, c.id);

  function handleDelete() {
    if (!confirm(`Delete "${c.name}"?`)) return;
    startDelete(async () => {
      try {
        await deleteCondition(c.id);
        toast.success("Condition deleted");
      } catch {
        toast.error("Failed to delete condition");
      }
    });
  }

  return (
    <div className="card-surface rounded-[18px] p-5">
      {!editing ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{c.name}</span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${CONDITION_STATUS_STYLE[status]}`}
              >
                {CONDITION_STATUS_LABELS[status]}
              </span>
              {c.code ? (
                <span className="num text-muted-foreground text-xs">
                  {c.code}
                </span>
              ) : null}
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              {c.system ? <span>{c.system}</span> : null}
              {c.system && c.onsetDate ? (
                <span className="text-muted-foreground/60">·</span>
              ) : null}
              {c.onsetDate ? (
                <span className="num">
                  Since {formatDate(c.onsetDate, "MMM yyyy")}
                </span>
              ) : null}
            </div>
            {c.notes ? (
              <p className="text-sm whitespace-pre-wrap">{c.notes}</p>
            ) : null}
            <Chips label="Biomarkers:" values={c.biomarkerSlugs} />
            <Chips label="Peptides:" values={c.relatedPeptides} />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${c.name}`}
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${c.name}`}
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
            <span className="text-sm font-medium">Edit condition</span>
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
            success="Condition updated"
            resetOnSuccess={false}
            className="grid gap-4 sm:grid-cols-2"
          >
            <ConditionFields idPrefix={`edit-${c.id}`} values={c} />
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
