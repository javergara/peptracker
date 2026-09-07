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
import { createFamilyHistory } from "@/lib/actions/health-profile";
import { RELATIVE_LABELS, RELATIVE_TYPES } from "@/types/health-profile";

const RELATIVE_ITEMS: Record<string, string> = Object.fromEntries(
  RELATIVE_TYPES.map((r) => [r, RELATIVE_LABELS[r]]),
);

export interface FamilyFieldValues {
  relative: string;
  condition: string;
  notes: string | null;
}

export function FamilyFields({
  idPrefix,
  values,
}: {
  idPrefix: string;
  values?: FamilyFieldValues;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-relative`} className="text-sm font-medium">
          Relative
        </label>
        <Select
          name="relative"
          defaultValue={values?.relative ?? "father"}
          items={RELATIVE_ITEMS}
        >
          <SelectTrigger id={`${idPrefix}-relative`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RELATIVE_TYPES.map((r) => (
              <SelectItem key={r} value={r}>
                {RELATIVE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <label
          htmlFor={`${idPrefix}-condition`}
          className="text-sm font-medium"
        >
          Condition <span className="text-destructive">*</span>
        </label>
        <Input
          id={`${idPrefix}-condition`}
          name="condition"
          required
          defaultValue={values?.condition ?? ""}
          placeholder="e.g. Type 2 diabetes"
          maxLength={120}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor={`${idPrefix}-notes`} className="text-sm font-medium">
          Notes
        </label>
        <Input
          id={`${idPrefix}-notes`}
          name="notes"
          defaultValue={values?.notes ?? ""}
          placeholder="optional"
          maxLength={280}
        />
      </div>
    </>
  );
}

export function AddFamilyHistoryForm() {
  return (
    <ActionForm
      action={createFamilyHistory}
      success="Family history added"
      className="grid gap-4 sm:grid-cols-3"
    >
      <FamilyFields idPrefix="new-family" />
      <div className="flex items-center justify-end sm:col-span-3">
        <SubmitButton>
          <Plus className="size-4" />
          Add entry
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
