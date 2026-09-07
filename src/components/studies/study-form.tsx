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
import { createStudy } from "@/lib/actions/studies";
import {
  STUDY_MODALITIES,
  STUDY_MODALITY_LABELS,
  STUDY_STATUSES,
  STUDY_STATUS_LABELS,
} from "@/types/study";

const textareaCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

const MODALITY_ITEMS: Record<string, string> = Object.fromEntries(
  STUDY_MODALITIES.map((m) => [m, STUDY_MODALITY_LABELS[m]]),
);
const STATUS_ITEMS: Record<string, string> = Object.fromEntries(
  STUDY_STATUSES.map((s) => [s, STUDY_STATUS_LABELS[s]]),
);

export interface StudyFieldValues {
  name: string;
  modality: string;
  status: string;
  bodyRegion: string | null;
  performedAt: Date | null;
  followUpAt: Date | null;
  findings: string | null;
  impression: string | null;
  notes: string | null;
}

function toDateValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * The shared field set for a study (add + edit). `idPrefix` keeps label/id
 * associations unique when many rows render at once.
 */
export function StudyFields({
  idPrefix,
  values,
}: {
  idPrefix: string;
  values?: StudyFieldValues;
}) {
  return (
    <>
      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor={`${idPrefix}-name`} className="text-sm font-medium">
          Study <span className="text-destructive">*</span>
        </label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          required
          defaultValue={values?.name ?? ""}
          placeholder="e.g. Abdominal ultrasound"
          maxLength={160}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-modality`} className="text-sm font-medium">
          Modality
        </label>
        <Select
          name="modality"
          defaultValue={values?.modality ?? "ultrasound"}
          items={MODALITY_ITEMS}
        >
          <SelectTrigger id={`${idPrefix}-modality`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STUDY_MODALITIES.map((m) => (
              <SelectItem key={m} value={m}>
                {STUDY_MODALITY_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-status`} className="text-sm font-medium">
          Status
        </label>
        <Select
          name="status"
          defaultValue={values?.status ?? "completed"}
          items={STATUS_ITEMS}
        >
          <SelectTrigger id={`${idPrefix}-status`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STUDY_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STUDY_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`${idPrefix}-bodyRegion`}
          className="text-sm font-medium"
        >
          Body region{" "}
          <span className="text-muted-foreground font-normal">— optional</span>
        </label>
        <Input
          id={`${idPrefix}-bodyRegion`}
          name="bodyRegion"
          defaultValue={values?.bodyRegion ?? ""}
          placeholder="e.g. Upper abdomen, liver"
          maxLength={80}
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`${idPrefix}-performedAt`}
          className="text-sm font-medium"
        >
          Performed on
        </label>
        <Input
          id={`${idPrefix}-performedAt`}
          name="performedAt"
          type="date"
          defaultValue={
            values?.performedAt ? toDateValue(values.performedAt) : ""
          }
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`${idPrefix}-followUpAt`}
          className="text-sm font-medium"
        >
          Follow-up date{" "}
          <span className="text-muted-foreground font-normal">— optional</span>
        </label>
        <Input
          id={`${idPrefix}-followUpAt`}
          name="followUpAt"
          type="date"
          defaultValue={
            values?.followUpAt ? toDateValue(values.followUpAt) : ""
          }
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor={`${idPrefix}-findings`} className="text-sm font-medium">
          Findings{" "}
          <span className="text-muted-foreground font-normal">— optional</span>
        </label>
        <textarea
          id={`${idPrefix}-findings`}
          name="findings"
          rows={2}
          defaultValue={values?.findings ?? ""}
          placeholder="What the study showed…"
          className={textareaCls}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <label
          htmlFor={`${idPrefix}-impression`}
          className="text-sm font-medium"
        >
          Impression{" "}
          <span className="text-muted-foreground font-normal">— optional</span>
        </label>
        <textarea
          id={`${idPrefix}-impression`}
          name="impression"
          rows={2}
          defaultValue={values?.impression ?? ""}
          placeholder="Radiologist's conclusion…"
          className={textareaCls}
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
          placeholder="Where it was done, next steps…"
          className={textareaCls}
        />
      </div>
    </>
  );
}

/** Add-study form. */
export function AddStudyForm() {
  return (
    <ActionForm
      action={createStudy}
      success="Study added"
      className="grid gap-4 sm:grid-cols-2"
    >
      <StudyFields idPrefix="new-study" />
      <div className="flex items-center justify-end sm:col-span-2">
        <SubmitButton>
          <Plus className="size-4" />
          Add study
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
