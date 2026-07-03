"use client";

import { useState } from "react";

import { INJECTION_SITES, type InjectionSite } from "@/lib/sites";
import { cn } from "@/lib/utils";

/**
 * A compact front/back body silhouette for picking an injection site, instead
 * of a plain <select>. Writes to a hidden `name="site"` input so it still
 * submits via FormData like the Select it replaces. Real <button>s (not SVG
 * shapes) carry the interaction so it stays keyboard/screen-reader friendly;
 * the silhouette artwork underneath is decorative (aria-hidden).
 *
 * Site → panel/position mapping is illustrative, not anatomically precise.
 */

type SitePos = { top: string; left: string };

const FRONT_POSITIONS: Partial<Record<InjectionSite, SitePos>> = {
  "Delt L": { top: "10%", left: "80%" },
  "Delt R": { top: "10%", left: "20%" },
  "Abdomen L": { top: "40%", left: "58%" },
  "Abdomen R": { top: "40%", left: "42%" },
  "Love handle L": { top: "44%", left: "84%" },
  "Love handle R": { top: "44%", left: "16%" },
  "Thigh L": { top: "72%", left: "58%" },
  "Thigh R": { top: "72%", left: "42%" },
};

const BACK_POSITIONS: Partial<Record<InjectionSite, SitePos>> = {
  "Glute L": { top: "46%", left: "58%" },
  "Glute R": { top: "46%", left: "42%" },
};

interface BodyMapSelectProps {
  /** Form field name — matches the <select> it replaces. */
  name?: string;
  /** Initially-selected site (edit prefill or the suggested site). */
  defaultValue?: string;
  /** The rotation-suggested site — gets a pulsing outline hint. */
  suggestedSite?: string;
}

export function BodyMapSelect({
  name = "site",
  defaultValue = "",
  suggestedSite = "",
}: BodyMapSelectProps) {
  const [selected, setSelected] = useState(defaultValue);

  const frontSites = INJECTION_SITES.filter(
    (s) => s in FRONT_POSITIONS,
  ) as InjectionSite[];
  const backSites = INJECTION_SITES.filter(
    (s) => s in BACK_POSITIONS,
  ) as InjectionSite[];

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={selected} />
      <div className="border-border bg-muted/40 flex items-start justify-center gap-8 rounded-xl border p-4">
        <BodyPanel
          label="Front"
          sites={frontSites}
          positions={FRONT_POSITIONS}
          selected={selected}
          suggestedSite={suggestedSite}
          onSelect={setSelected}
        />
        <BodyPanel
          label="Back"
          sites={backSites}
          positions={BACK_POSITIONS}
          selected={selected}
          suggestedSite={suggestedSite}
          onSelect={setSelected}
        />
      </div>
      <p className="text-center text-sm">
        {selected ? (
          <span className="text-foreground font-medium">{selected}</span>
        ) : (
          <span className="text-muted-foreground">— Select a site —</span>
        )}
        {suggestedSite && suggestedSite !== selected ? (
          <span className="text-muted-foreground">
            {" "}
            · suggested: {suggestedSite}
          </span>
        ) : null}
      </p>
    </div>
  );
}

function BodyPanel({
  label,
  sites,
  positions,
  selected,
  suggestedSite,
  onSelect,
}: {
  label: "Front" | "Back";
  sites: InjectionSite[];
  positions: Partial<Record<InjectionSite, SitePos>>;
  selected: string;
  suggestedSite: string;
  onSelect: (site: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="eyebrow text-[10px]">{label}</span>
      <div className="relative h-[168px] w-[88px]">
        <Silhouette />
        {sites.map((site) => {
          const pos = positions[site];
          if (!pos) return null;
          const isSelected = selected === site;
          const isSuggested = !isSelected && suggestedSite === site;
          return (
            <button
              key={site}
              type="button"
              aria-label={site}
              aria-pressed={isSelected}
              onClick={() => onSelect(site)}
              style={{ top: pos.top, left: pos.left }}
              className={cn(
                "focus-visible:ring-ring/50 absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors outline-none focus-visible:ring-3",
                isSelected
                  ? "border-primary bg-primary shadow-sm"
                  : isSuggested
                    ? "border-primary bg-primary/25 animate-pulse"
                    : "border-border bg-card hover:border-primary/60",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Decorative humanoid outline shared by both panels. */
function Silhouette() {
  return (
    <svg
      viewBox="0 0 88 168"
      width="88"
      height="168"
      aria-hidden="true"
      className="absolute inset-0"
    >
      {/* head */}
      <circle
        cx="44"
        cy="16"
        r="12"
        fill="var(--muted)"
        stroke="var(--border)"
      />
      {/* torso */}
      <path
        d="M26 30 L62 30 L68 78 L58 82 L58 110 L30 110 L30 82 L20 78 Z"
        fill="var(--muted)"
        stroke="var(--border)"
      />
      {/* arms */}
      <path
        d="M20 78 L10 118 L16 120 L26 82 Z"
        fill="var(--muted)"
        stroke="var(--border)"
      />
      <path
        d="M68 78 L78 118 L72 120 L58 82 Z"
        fill="var(--muted)"
        stroke="var(--border)"
      />
      {/* legs */}
      <path
        d="M30 110 L28 160 L38 160 L42 116 L44 116 L46 160 L58 160 L58 110 Z"
        fill="var(--muted)"
        stroke="var(--border)"
      />
    </svg>
  );
}
