"use client";

import { Plus } from "lucide-react";

import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMedication } from "@/lib/actions/medications";
import {
  MEDICATION_STATUSES,
  MEDICATION_STATUS_LABELS,
} from "@/types/medication";

const textareaCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

const STATUS_ITEMS: Record<string, string> = Object.fromEntries(
  MEDICATION_STATUSES.map((s) => [s, MEDICATION_STATUS_LABELS[s]]),
);

export interface MedicationFieldValues {
  name: string;
  code: string | null;
  status: string;
  startDate: Date | null;
  notes: string | null;
  biomarkerSlugs: string[];
}

function toDateValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * The shared field set for a medication (add + edit). `idPrefix` keeps label/id
 * associations unique when many rows render at once. Dose is NOT here — it lives
 * in the dose-change history so changes over time are captured.
 */
export function MedicationFields({
  idPrefix,
  values,
}: {
  idPrefix: string;
  values?: MedicationFieldValues;
}) {
  return (
    <>
      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor={`${idPrefix}-name`} className="text-sm font-medium">
          Medication <span className="text-destructive">*</span>
        </label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          required
          defaultValue={values?.name ?? ""}
          placeholder="e.g. Atorvastatina"
          maxLength={120}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-status`} className="text-sm font-medium">
          Status
        </label>
        <Select
          name="status"
          defaultValue={values?.status ?? "active"}
          items={STATUS_ITEMS}
        >
          <SelectTrigger id={`${idPrefix}-status`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEDICATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {MEDICATION_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`${idPrefix}-startDate`}
          className="text-sm font-medium"
        >
          Start date
        </label>
        <Input
          id={`${idPrefix}-startDate`}
          name="startDate"
          type="date"
          defaultValue={values?.startDate ? toDateValue(values.startDate) : ""}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-code`} className="text-sm font-medium">
          Code{" "}
          <span className="text-muted-foreground font-normal">— optional</span>
        </label>
        <Input
          id={`${idPrefix}-code`}
          name="code"
          defaultValue={values?.code ?? ""}
          placeholder="e.g. C10AA05 (ATC)"
          maxLength={40}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <label
          htmlFor={`${idPrefix}-biomarkerSlugs`}
          className="text-sm font-medium"
        >
          Linked biomarkers{" "}
          <span className="text-muted-foreground font-normal">
            — comma-separated slugs
          </span>
        </label>
        <Input
          id={`${idPrefix}-biomarkerSlugs`}
          name="biomarkerSlugs"
          defaultValue={(values?.biomarkerSlugs ?? []).join(", ")}
          placeholder="e.g. ldl-cholesterol, alt, ast"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor={`${idPrefix}-notes`} className="text-sm font-medium">
          Notes
        </label>
        <textarea
          id={`${idPrefix}-notes`}
          name="notes"
          rows={2}
          defaultValue={values?.notes ?? ""}
          placeholder="Prescriber, indication, plan…"
          className={textareaCls}
        />
      </div>
    </>
  );
}

/** Add-medication form: medication fields + an optional first dose. */
export function AddMedicationForm() {
  return (
    <ActionForm
      action={createMedication}
      success="Medication added"
      className="grid gap-4 sm:grid-cols-2"
    >
      <MedicationFields idPrefix="new-medication" />

      <div className="border-border mt-1 border-t pt-4 sm:col-span-2">
        <p className="text-muted-foreground mb-3 text-xs">
          Starting dose{" "}
          <span className="font-normal">
            — optional; you can add dose changes later
          </span>
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="new-medication-dose"
              className="text-sm font-medium"
            >
              Dose
            </label>
            <Input
              id="new-medication-dose"
              name="dose"
              placeholder="e.g. 40 mg"
              maxLength={60}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="new-medication-effectiveAt"
              className="text-sm font-medium"
            >
              Effective from
            </label>
            <Input
              id="new-medication-effectiveAt"
              name="effectiveAt"
              type="date"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label
              htmlFor="new-medication-reason"
              className="text-sm font-medium"
            >
              Reason{" "}
              <span className="text-muted-foreground font-normal">
                — optional
              </span>
            </label>
            <Input
              id="new-medication-reason"
              name="reason"
              placeholder="e.g. started for dyslipidemia"
              maxLength={200}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end sm:col-span-2">
        <SubmitButton>
          <Plus className="size-4" />
          Add medication
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
