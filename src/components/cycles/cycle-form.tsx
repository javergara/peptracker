"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Eyebrow } from "@/components/common/eyebrow";
import { SearchableSelect } from "@/components/common/searchable-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CYCLE_STATUSES, type DosingProtocol } from "@/types/peptide";
import { protocolLabel } from "@/lib/titration";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  /** Planned rest period after the cycle ends, in days (optional). */
  washoutDays?: number | string;
  notes?: string;
  /**
   * Edit-mode per-peptide prefill (peptideId → dose/unit + optional schedule
   * override). The schedule fields are absent when the peptide inherits the
   * cycle-level schedule.
   */
  items?: Record<
    string,
    {
      dose?: number;
      unit?: string;
      frequency?: string;
      daysOfWeek?: number[];
      timesPerDay?: number;
      startDate?: string; // yyyy-MM-dd
      endDate?: string; // yyyy-MM-dd
    }
  >;
  /** Chosen titration protocol label, for single-peptide cycles (see `protocolLabel`). */
  titrationLabel?: string;
}

/** Local UI state for one stack peptide's optional schedule override. */
interface ItemScheduleState {
  /** Whether the "Customize schedule" disclosure is expanded. */
  open: boolean;
  /** "inherit" or a `Frequency` value. */
  frequency: string;
  days: number[];
  /** Kept as a string so the input can be empty (= inherit). */
  timesPerDay: string;
  startDate: string;
  endDate: string;
}

const DEFAULT_ITEM_SCHEDULE: ItemScheduleState = {
  open: false,
  frequency: "inherit",
  days: [],
  timesPerDay: "",
  startDate: "",
  endDate: "",
};

/** Whether a per-peptide schedule state differs from "inherit the cycle". */
function hasScheduleOverride(s: ItemScheduleState): boolean {
  return (
    s.frequency !== "inherit" ||
    s.days.length > 0 ||
    s.timesPerDay !== "" ||
    s.startDate !== "" ||
    s.endDate !== ""
  );
}

/** Build the initial per-peptide schedule state map from edit-mode defaults. */
function initialItemSchedules(
  items: CycleFormDefaults["items"],
): Record<string, ItemScheduleState> {
  const map: Record<string, ItemScheduleState> = {};
  for (const [peptideId, it] of Object.entries(items ?? {})) {
    const state: ItemScheduleState = {
      open: false,
      frequency: it.frequency ?? "inherit",
      days: it.daysOfWeek ?? [],
      timesPerDay: it.timesPerDay != null ? String(it.timesPerDay) : "",
      startDate: it.startDate ?? "",
      endDate: it.endDate ?? "",
    };
    // Open the disclosure by default so an existing override is visible.
    state.open = hasScheduleOverride(state);
    map[peptideId] = state;
  }
  return map;
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
  peptides: { id: string; name: string; protocols?: DosingProtocol[] }[];
  stacks: StackOption[];
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  defaults?: CycleFormDefaults;
}) {
  const [source, setSourceRaw] = React.useState(defaults.source ?? "");
  const [frequency, setFrequency] = React.useState(
    defaults.frequency ?? "daily",
  );
  const [days, setDays] = React.useState<number[]>(defaults.daysOfWeek ?? []);
  const [titrationLabel, setTitrationLabel] = React.useState(
    defaults.titrationLabel ?? "",
  );
  const [itemSchedules, setItemSchedules] = React.useState<
    Record<string, ItemScheduleState>
  >(() => initialItemSchedules(defaults.items));
  const isStack = source.startsWith("stack:");
  const selectedStack = isStack
    ? stacks.find((s) => `stack:${s.id}` === source)
    : undefined;
  const selectedPeptide = !isStack
    ? peptides.find((p) => `peptide:${p.id}` === source)
    : undefined;
  const protocols = selectedPeptide?.protocols ?? [];

  // Changing the "based on" source invalidates any previously chosen
  // titration protocol (it belongs to the old peptide).
  const setSource = (v: string) => {
    setSourceRaw(v);
    setTitrationLabel("");
  };
  // These frequencies only fire on explicitly picked weekdays.
  const needsDays = frequency === "twice-weekly" || frequency === "custom";

  const toggleDay = (d: number) =>
    setDays((prev) =>
      prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d].sort((a, b) => a - b),
    );

  const getItemSchedule = (peptideId: string) =>
    itemSchedules[peptideId] ?? DEFAULT_ITEM_SCHEDULE;

  const updateItemSchedule = (
    peptideId: string,
    patch: Partial<ItemScheduleState>,
  ) =>
    setItemSchedules((prev) => ({
      ...prev,
      [peptideId]: { ...(prev[peptideId] ?? DEFAULT_ITEM_SCHEDULE), ...patch },
    }));

  const toggleItemDay = (peptideId: string, d: number) =>
    setItemSchedules((prev) => {
      const cur = prev[peptideId] ?? DEFAULT_ITEM_SCHEDULE;
      const nextDays = cur.days.includes(d)
        ? cur.days.filter((x) => x !== d)
        : [...cur.days, d].sort((a, b) => a - b);
      return { ...prev, [peptideId]: { ...cur, days: nextDays } };
    });

  // Any stack peptide whose own frequency override needs explicit days but
  // has none picked yet — mirrors the cycle-level `needsDays` guard.
  const itemsMissingDays = isStack
    ? (selectedStack?.items ?? []).some((it) => {
        const s = getItemSchedule(it.peptideId);
        return (
          (s.frequency === "twice-weekly" || s.frequency === "custom") &&
          s.days.length === 0
        );
      })
    : false;

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
          <Input
            id="name"
            name="name"
            required
            defaultValue={defaults.name}
            placeholder="e.g. Recovery block"
            maxLength={80}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="source" className="text-sm font-medium">
            Based on <span className="text-destructive">*</span>
          </label>
          <SearchableSelect
            id="source"
            name="source"
            required
            placeholder="— Select —"
            value={source || null}
            onValueChange={(v) => setSource(v ?? "")}
            options={[
              ...peptides.map((p) => ({
                value: `peptide:${p.id}`,
                label: p.name,
                group: "Peptides",
              })),
              ...stacks.map((s) => ({
                value: `stack:${s.id}`,
                label: s.name,
                group: "Stacks",
              })),
            ]}
          />
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
            <Input
              id="startDate"
              name="startDate"
              type="date"
              required
              defaultValue={defaults.startDate}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="endDate" className="text-sm font-medium">
              End date
            </label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={defaults.endDate}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <Select name="status" defaultValue={defaults.status ?? "active"}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CYCLE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="frequency" className="text-sm font-medium">
              Frequency
            </label>
            <Select
              name="frequency"
              value={frequency}
              onValueChange={(v) => setFrequency(v ?? "daily")}
            >
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="eod">Every other day</SelectItem>
                <SelectItem value="twice-weekly">Twice weekly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="custom">Custom days</SelectItem>
              </SelectContent>
            </Select>
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
            <Input
              id="timesPerDay"
              name="timesPerDay"
              type="number"
              min="1"
              max="6"
              step="1"
              inputMode="numeric"
              defaultValue={defaults.timesPerDay ?? 1}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="washoutDays" className="text-sm font-medium">
              Rest period after cycle (days)
            </label>
            <Input
              id="washoutDays"
              name="washoutDays"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              defaultValue={defaults.washoutDays ?? ""}
              placeholder="e.g. 28"
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
                const sched = getItemSchedule(it.peptideId);
                const itemNeedsDays =
                  sched.frequency === "twice-weekly" ||
                  sched.frequency === "custom";
                return (
                  <div
                    key={it.peptideId}
                    className="border-border/60 space-y-3 rounded-lg border p-3"
                  >
                    <div className="grid items-end gap-3 sm:grid-cols-[1.4fr_1fr_0.8fr]">
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
                        <Input
                          id={`itemDose-${it.peptideId}`}
                          name={`itemDose:${it.peptideId}`}
                          type="number"
                          step="any"
                          min="0"
                          inputMode="decimal"
                          defaultValue={dose ?? ""}
                          placeholder="e.g. 250"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label
                          htmlFor={`itemUnit-${it.peptideId}`}
                          className="text-muted-foreground text-xs"
                        >
                          Unit
                        </label>
                        <Select
                          name={`itemUnit:${it.peptideId}`}
                          defaultValue={unit}
                        >
                          <SelectTrigger id={`itemUnit-${it.peptideId}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mcg">mcg</SelectItem>
                            <SelectItem value="mg">mg</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        updateItemSchedule(it.peptideId, { open: !sched.open })
                      }
                      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex items-center gap-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      aria-expanded={sched.open}
                    >
                      {sched.open ? (
                        <ChevronDown className="size-3.5" />
                      ) : (
                        <ChevronRight className="size-3.5" />
                      )}
                      Customize schedule
                      {!sched.open && hasScheduleOverride(sched) ? (
                        <span className="text-primary">(custom)</span>
                      ) : null}
                    </button>

                    <div
                      className={cn(
                        "bg-muted/40 space-y-3 rounded-md p-3",
                        !sched.open && "hidden",
                      )}
                    >
                      <p className="text-muted-foreground text-xs">
                        Leave a field blank to inherit the cycle&apos;s schedule
                        for this peptide.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label
                            htmlFor={`itemFreq-${it.peptideId}`}
                            className="text-muted-foreground text-xs"
                          >
                            Frequency
                          </label>
                          <Select
                            name={`itemFreq:${it.peptideId}`}
                            value={sched.frequency}
                            onValueChange={(v) =>
                              updateItemSchedule(it.peptideId, {
                                frequency: v ?? "inherit",
                              })
                            }
                          >
                            <SelectTrigger id={`itemFreq-${it.peptideId}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inherit">
                                Inherit cycle
                              </SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="eod">
                                Every other day
                              </SelectItem>
                              <SelectItem value="twice-weekly">
                                Twice weekly
                              </SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="custom">
                                Custom days
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label
                            htmlFor={`itemTimesPerDay-${it.peptideId}`}
                            className="text-muted-foreground text-xs"
                          >
                            Times per day
                          </label>
                          <Input
                            id={`itemTimesPerDay-${it.peptideId}`}
                            name={`itemTimesPerDay:${it.peptideId}`}
                            type="number"
                            min="1"
                            max="6"
                            step="1"
                            inputMode="numeric"
                            value={sched.timesPerDay}
                            onChange={(e) =>
                              updateItemSchedule(it.peptideId, {
                                timesPerDay: e.target.value,
                              })
                            }
                            placeholder="Inherit"
                          />
                        </div>
                      </div>

                      {itemNeedsDays ? (
                        <fieldset className="space-y-1.5">
                          <legend className="text-muted-foreground text-xs font-medium">
                            Days of the week{" "}
                            <span className="text-destructive">*</span>
                          </legend>
                          <div className="flex flex-wrap gap-1.5">
                            {DAY_LABELS.map((label, d) => {
                              const selected = sched.days.includes(d);
                              return (
                                <label
                                  key={d}
                                  className={cn(
                                    "has-[:focus-visible]:ring-ring cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors select-none has-[:focus-visible]:ring-2",
                                    selected
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-input text-muted-foreground hover:border-primary/40",
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    name={`itemDays:${it.peptideId}`}
                                    value={d}
                                    checked={selected}
                                    onChange={() =>
                                      toggleItemDay(it.peptideId, d)
                                    }
                                    className="sr-only"
                                  />
                                  {label}
                                </label>
                              );
                            })}
                          </div>
                          {sched.days.length === 0 ? (
                            <p className="text-destructive text-xs">
                              Pick at least one day, or this peptide won&apos;t
                              be scheduled.
                            </p>
                          ) : null}
                        </fieldset>
                      ) : null}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label
                            htmlFor={`itemStart-${it.peptideId}`}
                            className="text-muted-foreground text-xs"
                          >
                            Start date
                          </label>
                          <Input
                            id={`itemStart-${it.peptideId}`}
                            name={`itemStart:${it.peptideId}`}
                            type="date"
                            value={sched.startDate}
                            onChange={(e) =>
                              updateItemSchedule(it.peptideId, {
                                startDate: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label
                            htmlFor={`itemEnd-${it.peptideId}`}
                            className="text-muted-foreground text-xs"
                          >
                            End date
                          </label>
                          <Input
                            id={`itemEnd-${it.peptideId}`}
                            name={`itemEnd:${it.peptideId}`}
                            type="date"
                            value={sched.endDate}
                            onChange={(e) =>
                              updateItemSchedule(it.peptideId, {
                                endDate: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
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
          <div className="space-y-4">
            {protocols.length > 0 ? (
              <div className="space-y-1.5">
                <label htmlFor="titrationLabel" className="text-sm font-medium">
                  Titration protocol
                </label>
                <Select
                  name="titrationLabel"
                  value={titrationLabel || "none"}
                  onValueChange={(v) =>
                    setTitrationLabel(v && v !== "none" ? v : "")
                  }
                >
                  <SelectTrigger id="titrationLabel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (fixed dose)</SelectItem>
                    {protocols.map((proto, i) => {
                      const label = protocolLabel(proto, i);
                      return (
                        <SelectItem key={label} value={label}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {titrationLabel
                    ? "The logged dose default auto-advances weekly per this protocol's schedule — the fixed dose below is unused."
                    : "Optional. Pick a protocol to auto-advance the dose week-over-week instead of a fixed amount."}
                </p>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="dosePerAdmin" className="text-sm font-medium">
                  Dose per administration
                </label>
                <Input
                  id="dosePerAdmin"
                  name="dosePerAdmin"
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  defaultValue={defaults.dosePerAdmin}
                  placeholder="e.g. 250"
                  disabled={!!titrationLabel}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="unit" className="text-sm font-medium">
                  Unit
                </label>
                <Select
                  name="unit"
                  defaultValue={defaults.unit ?? "mcg"}
                  disabled={!!titrationLabel}
                >
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcg">mcg</SelectItem>
                    <SelectItem value="mg">mg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={defaults.notes}
            className="resize-none"
            maxLength={2000}
          />
        </div>
      </div>

      <SubmitButton
        disabled={(needsDays && days.length === 0) || itemsMissingDays}
      >
        {submitLabel}
      </SubmitButton>
    </ActionForm>
  );
}
