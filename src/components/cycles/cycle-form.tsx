"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/common/eyebrow";
import { CYCLE_STATUSES } from "@/types/peptide";

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

/** A stack option with its peptides + suggested per-peptide doses. */
export interface StackOption {
  id: string;
  name: string;
  items: {
    peptideId: string;
    peptideName: string;
    dose?: number;
    unit?: string;
  }[];
}

export interface CycleFormDefaults {
  name?: string;
  /** "peptide:<id>" | "stack:<id>" */
  source?: string;
  startDate?: string; // yyyy-MM-dd
  endDate?: string; // yyyy-MM-dd
  status?: string;
  frequency?: string;
  dosePerAdmin?: number | string;
  unit?: string;
  notes?: string;
  /** Edit-mode per-peptide dose prefill (peptideId → dose/unit). */
  items?: Record<string, { dose?: number; unit?: string }>;
}

/**
 * Shared create/edit form for a cycle. The "Dosing" section adapts to the
 * selected source: a single-peptide cycle gets one dose field, while a stack
 * cycle gets one dose input PER peptide (each peptide doses differently).
 */
export function CycleForm({
  peptides,
  stacks,
  action,
  submitLabel,
  defaults = {},
}: {
  peptides: { id: string; name: string }[];
  stacks: StackOption[];
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  defaults?: CycleFormDefaults;
}) {
  const [source, setSource] = React.useState(defaults.source ?? "");
  const isStack = source.startsWith("stack:");
  const selectedStack = isStack
    ? stacks.find((s) => `stack:${s.id}` === source)
    : undefined;

  return (
    <form action={action} className="space-y-6">
      {/* Basics */}
      <div className="space-y-4">
        <Eyebrow>Basics</Eyebrow>
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Name <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={defaults.name}
            placeholder="e.g. Recovery block"
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="source" className="text-sm font-medium">
            Based on <span className="text-destructive">*</span>
          </label>
          <select
            id="source"
            name="source"
            required
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>
              — Select —
            </option>
            <optgroup label="Peptides">
              {peptides.map((p) => (
                <option key={p.id} value={`peptide:${p.id}`}>
                  {p.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Stacks">
              {stacks.map((s) => (
                <option key={s.id} value={`stack:${s.id}`}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Schedule */}
      <div className="space-y-4">
        <Eyebrow>Schedule</Eyebrow>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="startDate" className="text-sm font-medium">
              Start date <span className="text-destructive">*</span>
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              required
              defaultValue={defaults.startDate}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="endDate" className="text-sm font-medium">
              End date
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={defaults.endDate}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={defaults.status ?? "active"}
              className={inputCls}
            >
              {CYCLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="frequency" className="text-sm font-medium">
              Frequency
            </label>
            <select
              id="frequency"
              name="frequency"
              defaultValue={defaults.frequency ?? "daily"}
              className={inputCls}
            >
              <option value="daily">Daily</option>
              <option value="eod">Every other day</option>
              <option value="twice-weekly">Twice weekly</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dosing — adapts to single peptide vs. stack */}
      <div className="space-y-4">
        <Eyebrow>Dosing</Eyebrow>
        {isStack ? (
          selectedStack && selectedStack.items.length > 0 ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">
                Each peptide in this stack doses differently — set the amount
                per administration for each. Used as the default when logging.
              </p>
              {selectedStack.items.map((it) => {
                const pre = defaults.items?.[it.peptideId];
                const dose = pre?.dose ?? it.dose;
                const unit = pre?.unit ?? it.unit ?? "mcg";
                return (
                  <div
                    key={it.peptideId}
                    className="grid items-end gap-3 sm:grid-cols-[1.4fr_1fr_0.8fr]"
                  >
                    <span className="text-foreground text-sm font-medium">
                      {it.peptideName}
                    </span>
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`itemDose-${it.peptideId}`}
                        className="text-muted-foreground text-xs"
                      >
                        Dose
                      </label>
                      <input
                        id={`itemDose-${it.peptideId}`}
                        name={`itemDose:${it.peptideId}`}
                        type="number"
                        step="any"
                        min="0"
                        defaultValue={dose ?? ""}
                        placeholder="e.g. 250"
                        className={inputCls}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`itemUnit-${it.peptideId}`}
                        className="text-muted-foreground text-xs"
                      >
                        Unit
                      </label>
                      <select
                        id={`itemUnit-${it.peptideId}`}
                        name={`itemUnit:${it.peptideId}`}
                        defaultValue={unit}
                        className={inputCls}
                      >
                        <option value="mcg">mcg</option>
                        <option value="mg">mg</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              This stack has no peptides to dose.
            </p>
          )
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="dosePerAdmin" className="text-sm font-medium">
                Dose per administration
              </label>
              <input
                id="dosePerAdmin"
                name="dosePerAdmin"
                type="number"
                step="any"
                min="0"
                defaultValue={defaults.dosePerAdmin}
                placeholder="e.g. 250"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="unit" className="text-sm font-medium">
                Unit
              </label>
              <select
                id="unit"
                name="unit"
                defaultValue={defaults.unit ?? "mcg"}
                className={inputCls}
              >
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-4">
        <Eyebrow>Notes</Eyebrow>
        <div className="space-y-1.5">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={defaults.notes}
            className={`${inputCls} resize-none`}
          />
        </div>
      </div>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
