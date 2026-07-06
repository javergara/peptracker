"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BodyMapSelect } from "@/components/log/body-map-select";

interface Vial {
  id: string;
  label: string | null;
  remainingMcg: number;
  peptide?: { name: string } | null;
  peptideName?: string;
}

interface DoseFormFieldsProps {
  vials?: Vial[];
  suggestedSite?: string;
  lastSite?: string | null;
  /** When set, shows an optional "weight today" field (create forms only). */
  weightUnit?: string;
  /** Prefill values when editing an existing dose. */
  defaults?: {
    site?: string | null;
    mood?: number | null;
    energy?: number | null;
    sideEffects?: string[];
  };
}

const SIDE_EFFECTS = [
  "Nausea",
  "Fatigue",
  "Headache",
  "Injection-site irritation",
  "Other",
] as const;

export function DoseFormFields({
  vials = [],
  suggestedSite = "",
  lastSite,
  weightUnit,
  defaults,
}: DoseFormFieldsProps) {
  const siteDefault = defaults?.site ?? suggestedSite;
  const moodDefault = defaults?.mood != null ? String(defaults.mood) : "";
  const energyDefault = defaults?.energy != null ? String(defaults.energy) : "";
  const checkedSideEffects = new Set(defaults?.sideEffects ?? []);
  return (
    <>
      {/* Weight today (optional) — useful for weekly GLP-1 dosing. */}
      {weightUnit ? (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Weight today{" "}
            <span className="text-muted-foreground font-normal">
              (optional, {weightUnit})
            </span>
          </label>
          <Input
            name="weight"
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            placeholder={`e.g. 82 ${weightUnit}`}
          />
          <p className="text-muted-foreground text-xs">
            Logged as a weight measurement at this dose&apos;s time — handy for
            weekly GLP-1 check-ins.
          </p>
        </div>
      ) : null}

      {/* Vial selector */}
      {vials.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Vial (optional)</label>
          <Select
            name="vialId"
            defaultValue=""
            items={{
              "": "— No vial —",
              ...Object.fromEntries(
                vials.map((v) => [
                  v.id,
                  `${v.peptide?.name ?? v.peptideName ?? "Unknown"}${
                    v.label ? ` — ${v.label}` : ""
                  } (${v.remainingMcg.toFixed(0)} mcg left)`,
                ]),
              ),
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="— No vial —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">— No vial —</SelectItem>
              {vials.map((v) => {
                const peptideName =
                  v.peptide?.name ?? v.peptideName ?? "Unknown";
                const lbl = v.label ? ` — ${v.label}` : "";
                return (
                  <SelectItem key={v.id} value={v.id}>
                    {peptideName}
                    {lbl} ({v.remainingMcg.toFixed(0)} mcg left)
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Injection site */}
      <div className="space-y-1.5 sm:col-span-2">
        <label className="text-sm font-medium">Injection site</label>
        {lastSite && (
          <p className="text-muted-foreground text-xs">Last used: {lastSite}</p>
        )}
        <BodyMapSelect
          defaultValue={siteDefault}
          suggestedSite={suggestedSite}
        />
      </div>

      {/* Mood */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Mood <span className="text-muted-foreground font-normal">(1–5)</span>
        </label>
        <Select name="mood" defaultValue={moodDefault}>
          <SelectTrigger>
            <SelectValue placeholder="— Skip —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">— Skip —</SelectItem>
            <SelectItem value="1">1 — Poor</SelectItem>
            <SelectItem value="2">2 — Below average</SelectItem>
            <SelectItem value="3">3 — Neutral</SelectItem>
            <SelectItem value="4">4 — Good</SelectItem>
            <SelectItem value="5">5 — Excellent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Energy */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Energy{" "}
          <span className="text-muted-foreground font-normal">(1–5)</span>
        </label>
        <Select name="energy" defaultValue={energyDefault}>
          <SelectTrigger>
            <SelectValue placeholder="— Skip —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">— Skip —</SelectItem>
            <SelectItem value="1">1 — Exhausted</SelectItem>
            <SelectItem value="2">2 — Low</SelectItem>
            <SelectItem value="3">3 — Moderate</SelectItem>
            <SelectItem value="4">4 — High</SelectItem>
            <SelectItem value="5">5 — Peak</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Side effects */}
      <div className="space-y-2 sm:col-span-2">
        <label className="text-sm font-medium">
          Side effects{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {SIDE_EFFECTS.map((se) => (
            <label
              key={se}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                name="sideEffects"
                value={se}
                defaultChecked={checkedSideEffects.has(se)}
                className="border-input accent-primary size-4 rounded"
              />
              {se}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
