"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { SearchableSelect } from "@/components/common/searchable-select";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addStock } from "@/lib/actions/stock";
import { FREQUENCY_LABELS, FREQUENCY_OPTIONS } from "@/lib/stock";
import { isDiluent } from "@/types/peptide";

interface PeptideOption {
  id: string;
  name: string;
  category: string;
}

/**
 * Add-to-stock form. Client so it can react to the selected peptide: diluents
 * (BAC water) are measured in **mL** and have no per-dose supply, so the size
 * field relabels to mL and the dose/frequency inputs drop away.
 */
export function AddStockForm({
  peptides,
  initialPeptideId,
}: {
  peptides: PeptideOption[];
  /** Preselected peptide when deep-linked from the peptide detail page. */
  initialPeptideId?: string;
}) {
  const [peptideId, setPeptideId] = React.useState<string | null>(
    initialPeptideId && peptides.some((p) => p.id === initialPeptideId)
      ? initialPeptideId
      : null,
  );
  const selected = peptides.find((p) => p.id === peptideId);
  const diluent = isDiluent(selected?.category);

  return (
    <ActionForm
      action={addStock}
      success="Added to stock"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div className="space-y-1.5">
        <label htmlFor="s-peptide" className="text-sm font-medium">
          Peptide <span className="text-destructive">*</span>
        </label>
        <SearchableSelect
          id="s-peptide"
          name="peptideId"
          required
          placeholder="— Select peptide —"
          value={peptideId}
          onValueChange={setPeptideId}
          options={peptides.map((p) => ({ value: p.id, label: p.name }))}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="s-vialmg" className="text-sm font-medium">
          Vial size ({diluent ? "mL" : "mg"}){" "}
          <span className="text-destructive">*</span>
        </label>
        <Input
          id="s-vialmg"
          name="vialMg"
          type="number"
          step="any"
          min="0.1"
          inputMode="decimal"
          required
          placeholder={diluent ? "e.g. 3" : "e.g. 5"}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="s-qty" className="text-sm font-medium">
          Quantity <span className="text-destructive">*</span>
        </label>
        <Input
          id="s-qty"
          name="quantity"
          type="number"
          step="1"
          min="1"
          inputMode="numeric"
          defaultValue={1}
          required
        />
      </div>

      {/* Dose + frequency are meaningless for a diluent — hide them. */}
      {!diluent ? (
        <>
          <div className="space-y-1.5">
            <label htmlFor="s-dose" className="text-sm font-medium">
              Planned dose
            </label>
            <div className="flex gap-2">
              <Input
                id="s-dose"
                name="dose"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                placeholder="e.g. 250"
              />
              <Select name="doseUnit" defaultValue="mcg">
                <SelectTrigger aria-label="Dose unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcg">mcg</SelectItem>
                  <SelectItem value="mg">mg</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="s-freq" className="text-sm font-medium">
              Frequency
            </label>
            <Select
              name="frequency"
              defaultValue="daily"
              items={FREQUENCY_LABELS}
            >
              <SelectTrigger id="s-freq">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="s-price" className="text-sm font-medium">
          Price (per vial){" "}
          <span className="text-muted-foreground font-normal">— optional</span>
        </label>
        <Input
          id="s-price"
          name="price"
          type="number"
          step="any"
          min="0"
          inputMode="decimal"
          placeholder="e.g. 45.00"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="s-notes" className="text-sm font-medium">
          Notes
        </label>
        <Input
          id="s-notes"
          name="notes"
          placeholder="Optional notes"
          maxLength={280}
        />
      </div>
      <div className="flex items-end">
        <SubmitButton>
          <Plus className="size-4" />
          Add to stock
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
