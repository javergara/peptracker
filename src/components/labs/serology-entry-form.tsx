"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";

import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addQualitativeLab } from "@/lib/actions/labs";

export interface QualitativeMarker {
  slug: string;
  name: string;
  options: string[];
}

/**
 * Entry form for a qualitative serology result (reactive/non-reactive etc.).
 * Reacts to the selected marker to show its allowed result options, and submits
 * the categorical result through `addQualitativeLab` (numeric labs are handled by
 * the sibling numeric form).
 */
export function SerologyEntryForm({
  markers,
  today,
}: {
  markers: QualitativeMarker[];
  today: string;
}) {
  const [slug, setSlug] = React.useState<string>(markers[0]?.slug ?? "");
  const [result, setResult] = React.useState<string>("");

  const selected = markers.find((m) => m.slug === slug) ?? null;

  if (markers.length === 0) return null;

  return (
    <ActionForm
      action={addQualitativeLab}
      success="Serology result added"
      className="grid gap-4 sm:grid-cols-2"
    >
      {/* Marker */}
      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor="serology-marker" className="text-sm font-medium">
          Serology marker <span className="text-destructive">*</span>
        </label>
        <Select
          name="biomarkerSlug"
          value={slug}
          onValueChange={(v) => {
            setSlug(String(v ?? ""));
            setResult(""); // options differ per marker
          }}
        >
          <SelectTrigger id="serology-marker">
            <SelectValue placeholder="Choose a marker" />
          </SelectTrigger>
          <SelectContent>
            {markers.map((m) => (
              <SelectItem key={m.slug} value={m.slug}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Result */}
      <div className="space-y-1.5">
        <label htmlFor="serology-result" className="text-sm font-medium">
          Result <span className="text-destructive">*</span>
        </label>
        <Select
          name="qualitativeValue"
          value={result}
          onValueChange={(v) => setResult(String(v ?? ""))}
        >
          <SelectTrigger id="serology-result">
            <SelectValue placeholder="Choose a result" />
          </SelectTrigger>
          <SelectContent>
            {(selected?.options ?? []).map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date */}
      <div className="space-y-1.5">
        <label htmlFor="serology-date" className="text-sm font-medium">
          Date taken
        </label>
        <Input
          id="serology-date"
          name="takenAt"
          type="date"
          defaultValue={today}
          required
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor="serology-notes" className="text-sm font-medium">
          Notes
        </label>
        <Input
          id="serology-notes"
          name="notes"
          placeholder="optional"
          maxLength={280}
        />
      </div>

      <div className="sm:col-span-2">
        <SubmitButton disabled={!slug || !result}>
          <ShieldCheck className="size-4" />
          Add serology
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
