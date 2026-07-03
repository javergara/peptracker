"use client";

import * as React from "react";

import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Eyebrow } from "@/components/common/eyebrow";
import { CYCLE_STATUSES } from "@/types/peptide";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  /** Days of the week (0=Sun..6=Sat) for twice-weekly/custom frequencies. */
  daysOfWeek?: number[];
  timesPerDay?: number;
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
  const [frequency, setFrequency] = React.useState(
    defaults.frequency ?? "daily",
  );
  const [days, setDays] = React.useState<number[]>(defaults.daysOfWeek ?? []);
  const isStack = source.startsWith("stack:");
  const selectedStack = isStack
    ? stacks.find((s) => `stack:${s.id}` === source)
    : undefined;
  // These frequencies only fire on explicitly picked weekdays.
  const needsDays = frequency === "twice-weekly" || frequency === "custom";

  const toggleDay = (d: number) =>
    setDays((prev) =>
      prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d].sort((a, b) => a - b),
    );

  return (
    <ActionForm
      action={action}
      success="Cycle saved"
      resetOnSuccess={false}
      className="space-y-6"
    >
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
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className={inputCls}
            >
              <option value="daily">Daily</option>
              <option value="eod">Every other day</option>
              <option value="twice-weekly">Twice weekly</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom days</option>
            </select>
          </div>
        </div>

        {needsDays ? (
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">
              Days of the week <span className="text-destructive">*</span>
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, d) => {
                const selected = days.includes(d);
                return (
                  <label
                    key={d}
                    className={cn(
                      "has-[:focus-visible]:ring-ring cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors select-none has-[:focus-visible]:ring-2",
                      selected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-input text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="daysOfWeek"
                      value={d}
                      checked={selected}
                      onChange={() => toggleDay(d)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
            <p
              className={cn(
                "text-xs",
                days.length === 0
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {days.length === 0
                ? "Pick at least one day — the cycle won't schedule doses without it."
                : frequency === "twice-weekly" && days.length !== 2
                  ? "Twice weekly usually means two days."
                  : "Doses are scheduled on these days."}
            </p>
          </fieldset>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="timesPerDay" className="text-sm font-medium">
              Times per day
            </label>
            <input
              id="timesPerDay"
              name="timesPerDay"
              type="number"
              min="1"
              max="6"
              step="1"
              inputMode="numeric"
              defaultValue={defaults.timesPerDay ?? 1}
              className={inputCls}
            />
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

      <SubmitButton disabled={needsDays && days.length === 0}>
        {submitLabel}
      </SubmitButton>
    </ActionForm>
  );
}
