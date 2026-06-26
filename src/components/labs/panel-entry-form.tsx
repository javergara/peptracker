"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FlaskConical } from "lucide-react";

import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { addLabPanel } from "@/lib/actions/labs";
import { SYSTEM_LABELS, BIOMARKER_SYSTEMS } from "@/types/biomarker";
import { cn } from "@/lib/utils";
import { toDateInputValue } from "@/lib/dates";

export interface PanelBiomarker {
  slug: string;
  name: string;
  system: string;
  unit: string;
}

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export function PanelEntryForm({
  biomarkers,
}: {
  biomarkers: PanelBiomarker[];
}) {
  // Track which systems are expanded (default: none open to avoid overwhelming)
  const [openSystems, setOpenSystems] = useState<Set<string>>(new Set());

  function toggle(system: string) {
    setOpenSystems((prev) => {
      const next = new Set(prev);
      if (next.has(system)) {
        next.delete(system);
      } else {
        next.add(system);
      }
      return next;
    });
  }

  // Group biomarkers by system in canonical order
  const bySystem = new Map<string, PanelBiomarker[]>();
  for (const sys of BIOMARKER_SYSTEMS) {
    bySystem.set(sys, []);
  }
  for (const bm of biomarkers) {
    const arr = bySystem.get(bm.system) ?? [];
    arr.push(bm);
    bySystem.set(bm.system, arr);
  }

  const today = toDateInputValue(new Date());

  return (
    <ActionForm
      action={addLabPanel}
      success="Panel logged"
      className="space-y-4"
    >
      {/* Panel date */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="panel-takenAt" className="text-sm font-medium">
            Date taken <span className="text-destructive">*</span>
          </label>
          <input
            id="panel-takenAt"
            name="takenAt"
            type="date"
            required
            defaultValue={today}
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="panel-notes" className="text-sm font-medium">
            Notes (optional)
          </label>
          <input
            id="panel-notes"
            name="notes"
            placeholder="Lab name, fasting, etc."
            className={inputCls}
          />
        </div>
      </div>

      {/* System sections */}
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs">
          Expand a panel section and fill in any values you have. Empty fields
          are skipped.
        </p>
        {BIOMARKER_SYSTEMS.map((sys) => {
          const markers = bySystem.get(sys) ?? [];
          if (markers.length === 0) return null;
          const isOpen = openSystems.has(sys);
          return (
            <div key={sys} className="rounded-lg border">
              <button
                type="button"
                onClick={() => toggle(sys)}
                aria-expanded={isOpen}
                className={cn(
                  "hover:bg-muted/50 focus-visible:ring-ring flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  isOpen && "rounded-b-none border-b",
                )}
              >
                <span>
                  {SYSTEM_LABELS[sys]}{" "}
                  <span className="text-muted-foreground font-normal">
                    ({markers.length})
                  </span>
                </span>
                {isOpen ? (
                  <ChevronDown className="size-4 shrink-0" />
                ) : (
                  <ChevronRight className="size-4 shrink-0" />
                )}
              </button>
              {isOpen ? (
                <div className="divide-y px-3 pt-1 pb-2">
                  {markers.map((bm) => (
                    <div
                      key={bm.slug}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 py-2"
                    >
                      {/* Hidden slug field */}
                      <input type="hidden" name="slug" value={bm.slug} />
                      <label
                        htmlFor={`panel-val-${bm.slug}`}
                        className="text-sm"
                      >
                        {bm.name}
                        <span className="text-muted-foreground ml-1 text-xs">
                          {bm.unit}
                        </span>
                      </label>
                      <input
                        id={`panel-val-${bm.slug}`}
                        name="value"
                        type="number"
                        step="any"
                        inputMode="decimal"
                        placeholder={bm.unit}
                        className="border-input bg-background focus-visible:ring-ring w-28 rounded-lg border px-3 py-1.5 text-sm outline-none focus-visible:ring-2"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <SubmitButton>
        <FlaskConical className="size-4" />
        Log panel
      </SubmitButton>
    </ActionForm>
  );
}
