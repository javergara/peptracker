"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * The peptide / amount / unit trio for a cycle's "log a dose" form. Selecting a
 * peptide prefills the amount + unit from that peptide's configured cycle dose
 * (single-peptide cycle → one dose; stack cycle → per-peptide doses).
 *
 * Renders three bare grid cells (fragment) so it drops into the parent form grid.
 */
export function CycleLogFields({
  peptideOptions,
  doseByPeptide,
}: {
  peptideOptions: { id: string; name: string }[];
  doseByPeptide: Record<string, { dose?: number; unit?: string }>;
}) {
  const first = peptideOptions[0]?.id ?? "";
  const [peptideId, setPeptideId] = React.useState(first);
  const def = doseByPeptide[peptideId] ?? {};
  const [amount, setAmount] = React.useState<string>(
    def.dose != null ? String(def.dose) : "",
  );
  const [unit, setUnit] = React.useState<string>(def.unit ?? "mcg");

  function onPeptideChange(id: string) {
    setPeptideId(id);
    const next = doseByPeptide[id] ?? {};
    setAmount(next.dose != null ? String(next.dose) : "");
    setUnit(next.unit ?? "mcg");
  }

  return (
    <>
      <div className="space-y-1.5">
        <label htmlFor="cd-peptide" className="text-sm font-medium">
          Peptide
        </label>
        <Select
          name="peptideId"
          required
          value={peptideId}
          onValueChange={(v) => onPeptideChange(v ?? "")}
        >
          <SelectTrigger id="cd-peptide">
            {/* base-ui Select.Value renders the raw value (an id) unless given a
                formatter — map it back to the peptide name. */}
            <SelectValue>
              {(value) =>
                peptideOptions.find((p) => p.id === value)?.name ??
                "Select peptide"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {peptideOptions.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="cd-amount" className="text-sm font-medium">
          Amount
        </label>
        <Input
          id="cd-amount"
          name="amount"
          type="number"
          step="any"
          min="0"
          inputMode="decimal"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="cd-unit" className="text-sm font-medium">
          Unit
        </label>
        <Select
          name="unit"
          value={unit}
          onValueChange={(v) => setUnit(v ?? "mcg")}
        >
          <SelectTrigger id="cd-unit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mcg">mcg</SelectItem>
            <SelectItem value="mg">mg</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
