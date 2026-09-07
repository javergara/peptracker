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
import { createCondition } from "@/lib/actions/health-profile";
import {
  CONDITION_STATUSES,
  CONDITION_STATUS_LABELS,
} from "@/types/health-profile";

const textareaCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

const STATUS_ITEMS: Record<string, string> = Object.fromEntries(
  CONDITION_STATUSES.map((s) => [s, CONDITION_STATUS_LABELS[s]]),
);

export interface ConditionFieldValues {
  name: string;
  code: string | null;
  status: string;
  system: string | null;
  onsetDate: Date | null;
  notes: string | null;
  biomarkerSlugs: string[];
  relatedPeptides: string[];
}

function toDateValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * The shared field set for a condition (add + edit). `idPrefix` keeps label/id
 * associations unique when many rows render at once.
 */
export function ConditionFields({
  idPrefix,
  values,
}: {
  idPrefix: string;
  values?: ConditionFieldValues;
}) {
  return (
    <>
      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor={`${idPrefix}-name`} className="text-sm font-medium">
          Condition <span className="text-destructive">*</span>
        </label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          required
          defaultValue={values?.name ?? ""}
          placeholder="e.g. Dyslipidemia"
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
            {CONDITION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {CONDITION_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`${idPrefix}-onsetDate`}
          className="text-sm font-medium"
        >
          Onset date
        </label>
        <Input
          id={`${idPrefix}-onsetDate`}
          name="onsetDate"
          type="date"
          defaultValue={values?.onsetDate ? toDateValue(values.onsetDate) : ""}
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
          placeholder="e.g. E78.5"
          maxLength={40}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-system`} className="text-sm font-medium">
          Body system{" "}
          <span className="text-muted-foreground font-normal">— optional</span>
        </label>
        <Input
          id={`${idPrefix}-system`}
          name="system"
          defaultValue={values?.system ?? ""}
          placeholder="e.g. Cardiometabolic"
          maxLength={60}
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
        <label
          htmlFor={`${idPrefix}-relatedPeptides`}
          className="text-sm font-medium"
        >
          Related peptides{" "}
          <span className="text-muted-foreground font-normal">
            — comma-separated slugs
          </span>
        </label>
        <Input
          id={`${idPrefix}-relatedPeptides`}
          name="relatedPeptides"
          defaultValue={(values?.relatedPeptides ?? []).join(", ")}
          placeholder="e.g. tesamorelin"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor={`${idPrefix}-notes`} className="text-sm font-medium">
          Notes
        </label>
        <textarea
          id={`${idPrefix}-notes`}
          name="notes"
          rows={3}
          defaultValue={values?.notes ?? ""}
          placeholder="Context, findings, plan…"
          className={textareaCls}
        />
      </div>
    </>
  );
}

/** Add-condition form shown at the top of the health page. */
export function AddConditionForm() {
  return (
    <ActionForm
      action={createCondition}
      success="Condition added"
      className="grid gap-4 sm:grid-cols-2"
    >
      <ConditionFields idPrefix="new-condition" />
      <div className="flex items-center justify-end sm:col-span-2">
        <SubmitButton>
          <Plus className="size-4" />
          Add condition
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
