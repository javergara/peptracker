"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, X, Check, Plus, History } from "lucide-react";
import { toast } from "sonner";

import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MedicationFields,
  type MedicationFieldValues,
} from "@/components/medications/medication-form";
import {
  addDoseChange,
  deleteDoseChange,
  deleteMedication,
  updateMedication,
} from "@/lib/actions/medications";
import { currentDoseChange, sortDoseChanges } from "@/lib/medications";
import {
  MEDICATION_STATUS_LABELS,
  MEDICATION_STATUS_STYLE,
  asMedicationStatus,
} from "@/types/medication";
import { formatDate } from "@/lib/dates";

export interface DoseChangeData {
  id: string;
  dose: string;
  reason: string | null;
  effectiveAt: Date;
}

export interface MedicationRowData extends MedicationFieldValues {
  id: string;
  changes: DoseChangeData[];
}

function todayInputValue(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function DoseHistory({
  medicationId,
  changes,
}: {
  medicationId: string;
  changes: DoseChangeData[];
}) {
  const [isDeleting, startDelete] = useTransition();
  const sorted = sortDoseChanges(changes);

  function handleDelete(id: string, dose: string) {
    if (!confirm(`Remove the "${dose}" dose change?`)) return;
    startDelete(async () => {
      try {
        await deleteDoseChange(id);
        toast.success("Dose change removed");
      } catch {
        toast.error("Failed to remove dose change");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <History className="size-3.5" />
        Dose history
      </div>
      {sorted.length ? (
        <ol className="space-y-2">
          {sorted.map((ch) => (
            <li
              key={ch.id}
              className="border-border flex items-start justify-between gap-3 border-l-2 pl-3"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="num font-medium">{ch.dose}</span>
                  <span className="num text-muted-foreground text-xs">
                    {formatDate(ch.effectiveAt, "d MMM yyyy")}
                  </span>
                </div>
                {ch.reason ? (
                  <p className="text-muted-foreground text-sm">{ch.reason}</p>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove dose change ${ch.dose}`}
                disabled={isDeleting}
                onClick={() => handleDelete(ch.id, ch.dose)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground text-sm">No dose changes logged.</p>
      )}

      <ActionForm
        action={addDoseChange.bind(null, medicationId)}
        success="Dose change added"
        className="grid gap-3 sm:grid-cols-2"
      >
        <div className="space-y-1.5">
          <label
            htmlFor={`dose-${medicationId}`}
            className="text-sm font-medium"
          >
            New dose
          </label>
          <Input
            id={`dose-${medicationId}`}
            name="dose"
            required
            placeholder="e.g. 20 mg"
            maxLength={60}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`effectiveAt-${medicationId}`}
            className="text-sm font-medium"
          >
            Effective from
          </label>
          <Input
            id={`effectiveAt-${medicationId}`}
            name="effectiveAt"
            type="date"
            required
            defaultValue={todayInputValue()}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label
            htmlFor={`reason-${medicationId}`}
            className="text-sm font-medium"
          >
            Reason{" "}
            <span className="text-muted-foreground font-normal">
              — optional
            </span>
          </label>
          <Input
            id={`reason-${medicationId}`}
            name="reason"
            placeholder="e.g. lowered due to elevated transaminases"
            maxLength={200}
          />
        </div>
        <div className="sm:col-span-2">
          <SubmitButton size="sm" variant="outline">
            <Plus className="size-3.5" />
            Add dose change
          </SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}

export function MedicationRow({
  medication,
}: {
  medication: MedicationRowData;
}) {
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const m = medication;
  const status = asMedicationStatus(m.status);
  const boundUpdate = updateMedication.bind(null, m.id);
  const current = currentDoseChange(m.changes);

  function handleDelete() {
    if (!confirm(`Delete "${m.name}" and its dose history?`)) return;
    startDelete(async () => {
      try {
        await deleteMedication(m.id);
        toast.success("Medication deleted");
      } catch {
        toast.error("Failed to delete medication");
      }
    });
  }

  return (
    <div className="card-surface rounded-[18px] p-5">
      {!editing ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{m.name}</span>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${MEDICATION_STATUS_STYLE[status]}`}
                >
                  {MEDICATION_STATUS_LABELS[status]}
                </span>
                {m.code ? (
                  <span className="num text-muted-foreground text-xs">
                    {m.code}
                  </span>
                ) : null}
              </div>
              <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                {current ? (
                  <span>
                    Current dose:{" "}
                    <span className="num text-foreground font-medium">
                      {current.dose}
                    </span>
                  </span>
                ) : (
                  <span>No current dose</span>
                )}
                {m.startDate ? (
                  <>
                    <span className="text-muted-foreground/60">·</span>
                    <span className="num">
                      Since {formatDate(m.startDate, "MMM yyyy")}
                    </span>
                  </>
                ) : null}
              </div>
              {m.notes ? (
                <p className="text-sm whitespace-pre-wrap">{m.notes}</p>
              ) : null}
              {m.biomarkerSlugs.length ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground text-xs">
                    Biomarkers:
                  </span>
                  {m.biomarkerSlugs.map((v) => (
                    <span
                      key={v}
                      className="num bg-secondary text-secondary-foreground border-border inline-flex items-center rounded-full border px-2 py-0.5 text-xs"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${m.name}`}
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${m.name}`}
                disabled={isDeleting}
                onClick={handleDelete}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="border-border border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory((s) => !s)}
              aria-expanded={showHistory}
            >
              <History className="size-3.5" />
              {showHistory ? "Hide" : "Dose history"}
              <span className="num text-muted-foreground">
                ({m.changes.length})
              </span>
            </Button>
            {showHistory ? (
              <div className="mt-3">
                <DoseHistory medicationId={m.id} changes={m.changes} />
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Edit medication</span>
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
            success="Medication updated"
            resetOnSuccess={false}
            className="grid gap-4 sm:grid-cols-2"
          >
            <MedicationFields idPrefix={`edit-${m.id}`} values={m} />
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
