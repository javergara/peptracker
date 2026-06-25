"use client";

import { INJECTION_SITES } from "@/lib/sites";

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

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
  defaults,
}: DoseFormFieldsProps) {
  const siteDefault = defaults?.site ?? suggestedSite;
  const moodDefault = defaults?.mood != null ? String(defaults.mood) : "";
  const energyDefault = defaults?.energy != null ? String(defaults.energy) : "";
  const checkedSideEffects = new Set(defaults?.sideEffects ?? []);
  return (
    <>
      {/* Vial selector */}
      {vials.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Vial (optional)</label>
          <select name="vialId" defaultValue="" className={inputCls}>
            <option value="">— No vial —</option>
            {vials.map((v) => {
              const peptideName = v.peptide?.name ?? v.peptideName ?? "Unknown";
              const lbl = v.label ? ` — ${v.label}` : "";
              return (
                <option key={v.id} value={v.id}>
                  {peptideName}
                  {lbl} ({v.remainingMcg.toFixed(0)} mcg left)
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Injection site */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Injection site</label>
        {lastSite && (
          <p className="text-muted-foreground text-xs">Last used: {lastSite}</p>
        )}
        <select name="site" defaultValue={siteDefault} className={inputCls}>
          <option value="">— Select site —</option>
          {INJECTION_SITES.map((s) => (
            <option key={s} value={s}>
              {s}
              {s === suggestedSite ? " ✓ suggested" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Mood */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Mood <span className="text-muted-foreground font-normal">(1–5)</span>
        </label>
        <select name="mood" defaultValue={moodDefault} className={inputCls}>
          <option value="">— Skip —</option>
          <option value="1">1 — Poor</option>
          <option value="2">2 — Below average</option>
          <option value="3">3 — Neutral</option>
          <option value="4">4 — Good</option>
          <option value="5">5 — Excellent</option>
        </select>
      </div>

      {/* Energy */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Energy{" "}
          <span className="text-muted-foreground font-normal">(1–5)</span>
        </label>
        <select name="energy" defaultValue={energyDefault} className={inputCls}>
          <option value="">— Skip —</option>
          <option value="1">1 — Exhausted</option>
          <option value="2">2 — Low</option>
          <option value="3">3 — Moderate</option>
          <option value="4">4 — High</option>
          <option value="5">5 — Peak</option>
        </select>
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
