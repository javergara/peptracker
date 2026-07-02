"use client";

import * as React from "react";

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

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
        <select
          id="cd-peptide"
          name="peptideId"
          required
          value={peptideId}
          onChange={(e) => onPeptideChange(e.target.value)}
          className={inputCls}
        >
          {peptideOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="cd-amount" className="text-sm font-medium">
          Amount
        </label>
        <input
          id="cd-amount"
          name="amount"
          type="number"
          step="any"
          min="0"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputCls}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="cd-unit" className="text-sm font-medium">
          Unit
        </label>
        <select
          id="cd-unit"
          name="unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className={inputCls}
        >
          <option value="mcg">mcg</option>
          <option value="mg">mg</option>
        </select>
      </div>
    </>
  );
}
