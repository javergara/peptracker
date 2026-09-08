"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileUp, Loader2, Plus, Trash2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/common/searchable-select";
import { importLabResults } from "@/lib/actions/labs";
import { parseLabReport } from "@/lib/lab-import";
import { SYSTEM_LABELS, type BiomarkerSystem } from "@/types/biomarker";

interface EditableRow {
  id: string;
  marker: string;
  value: string;
  unit: string;
  refLow: string;
  refHigh: string;
  biomarkerSlug: string;
}

let seq = 0;
const nextId = () => `row-${seq++}`;

function emptyRow(): EditableRow {
  return {
    id: nextId(),
    marker: "",
    value: "",
    unit: "",
    refLow: "",
    refHigh: "",
    biomarkerSlug: "",
  };
}

/**
 * Reconstruct plain text from a PDF, one line per visual row. pdfjs returns
 * positioned text fragments; we group fragments by their y-coordinate so the
 * heuristic line parser (`parseLabReport`) sees report rows intact. The PDF
 * bytes never leave the browser — extraction is fully client-side (privacy).
 */
async function pdfToText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pageTexts: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Group items into lines by rounded y position.
    const lines = new Map<number, { x: number; s: string }[]>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str) continue;
      const tr = item.transform as number[];
      const y = Math.round(tr[5]);
      const x = tr[4];
      const arr = lines.get(y) ?? [];
      arr.push({ x, s: item.str });
      lines.set(y, arr);
    }
    const ys = [...lines.keys()].sort((a, b) => b - a); // top → bottom
    for (const y of ys) {
      const parts = lines
        .get(y)!
        .sort((a, b) => a.x - b.x)
        .map((i) => i.s);
      pageTexts.push(parts.join(" ").replace(/\s+/g, " ").trim());
    }
  }
  return pageTexts.join("\n");
}

export function LabPdfImport({
  biomarkers,
}: {
  biomarkers: { slug: string; name: string; system: string }[];
}) {
  const router = useRouter();
  const [stage, setStage] = React.useState<"input" | "review">("input");
  const [rows, setRows] = React.useState<EditableRow[]>([]);
  const [dateStr, setDateStr] = React.useState("");
  const [pasteText, setPasteText] = React.useState("");
  const [extracting, setExtracting] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const bmOptions = React.useMemo(
    () => [
      { value: "", label: "— no catalog link —" },
      ...biomarkers.map((b) => ({
        value: b.slug,
        label: b.name,
        group: SYSTEM_LABELS[b.system as BiomarkerSystem] ?? "Other",
      })),
    ],
    [biomarkers],
  );

  function loadParsed(text: string) {
    const report = parseLabReport(text);
    if (report.rows.length === 0) {
      toast.error(
        "No results could be read. Try pasting the text, or add rows manually.",
      );
    }
    setRows(
      report.rows.map((r) => ({
        id: nextId(),
        marker: r.marker,
        value: String(r.value),
        unit: r.unit ?? "",
        refLow: r.refLow != null ? String(r.refLow) : "",
        refHigh: r.refHigh != null ? String(r.refHigh) : "",
        biomarkerSlug: "",
      })),
    );
    setDateStr(report.date ?? "");
    setStage("review");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    try {
      const text = await pdfToText(file);
      loadParsed(text);
    } catch (err) {
      console.error(err);
      toast.error(
        "Couldn't read that PDF. Try pasting the report text instead.",
      );
    } finally {
      setExtracting(false);
    }
  }

  function update(id: string, patch: Partial<EditableRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  async function onSave() {
    const payload = rows
      .map((r) => ({
        marker: r.marker.trim(),
        value: r.value.trim(),
        unit: r.unit.trim(),
        refLow: r.refLow.trim(),
        refHigh: r.refHigh.trim(),
        biomarkerSlug: r.biomarkerSlug,
        takenAt: dateStr,
      }))
      .filter(
        (r) => r.marker && r.value !== "" && !Number.isNaN(Number(r.value)),
      );

    if (payload.length === 0) {
      toast.error("Add at least one row with a marker name and a value.");
      return;
    }
    if (!dateStr) {
      toast.error("Set the date these results were taken.");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("rows", JSON.stringify(payload));
      await importLabResults(fd);
      toast.success(`Imported ${payload.length} result(s)`);
      router.push("/labs");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setSaving(false);
    }
  }

  // ── Input stage ──────────────────────────────────────────────────────────
  if (stage === "input") {
    return (
      <div className="space-y-6">
        <div className="card-surface rounded-2xl p-6">
          <h2 className="text-base font-semibold tracking-tight">
            Upload a lab report PDF
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            The file is read in your browser only — it&apos;s never uploaded. We
            extract the text and let you review every value before anything is
            saved.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={onFile}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={extracting}
            >
              {extracting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileUp className="size-4" />
              )}
              {extracting ? "Reading…" : "Choose PDF"}
            </Button>
          </div>
        </div>

        <div className="card-surface rounded-2xl p-6">
          <h2 className="text-base font-semibold tracking-tight">
            …or paste the report text
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            If the PDF is a scan/image, copy the text and paste it here.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
            placeholder={"COLESTEROL TOTAL 195 mg/dL < 200\nHDL 42 mg/dL > 40"}
            className="border-input bg-background focus-visible:ring-ring mt-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
          />
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => loadParsed(pasteText)}
              disabled={!pasteText.trim()}
            >
              <Wand2 className="size-4" />
              Parse text
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Review stage ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="card-surface flex flex-wrap items-end gap-4 rounded-2xl p-5">
        <div className="space-y-1.5">
          <label htmlFor="import-date" className="text-sm font-medium">
            Date taken <span className="text-destructive">*</span>
          </label>
          <Input
            id="import-date"
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="w-44"
          />
        </div>
        <p className="text-muted-foreground text-sm">
          Applies to every row below. Review and correct each value — the parser
          is best-effort. Link a catalog marker to snapshot its reference range.
        </p>
      </div>

      <div className="card-surface overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-border text-muted-foreground border-b text-left text-xs">
              <th className="px-3 py-2 font-medium">Marker</th>
              <th className="px-3 py-2 font-medium">Value</th>
              <th className="px-3 py-2 font-medium">Unit</th>
              <th className="px-3 py-2 font-medium">Ref low</th>
              <th className="px-3 py-2 font-medium">Ref high</th>
              <th className="px-3 py-2 font-medium">Catalog link</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-border/60 border-b last:border-0"
              >
                <td className="px-2 py-1.5">
                  <Input
                    value={r.marker}
                    onChange={(e) => update(r.id, { marker: e.target.value })}
                    className="min-w-[160px]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={r.value}
                    inputMode="decimal"
                    onChange={(e) => update(r.id, { value: e.target.value })}
                    className="w-24"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={r.unit}
                    onChange={(e) => update(r.id, { unit: e.target.value })}
                    className="w-24"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={r.refLow}
                    inputMode="decimal"
                    onChange={(e) => update(r.id, { refLow: e.target.value })}
                    className="w-20"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={r.refHigh}
                    inputMode="decimal"
                    onChange={(e) => update(r.id, { refHigh: e.target.value })}
                    className="w-20"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <SearchableSelect
                    options={bmOptions}
                    value={r.biomarkerSlug}
                    onValueChange={(v) =>
                      update(r.id, { biomarkerSlug: v ?? "" })
                    }
                    placeholder="— none —"
                    className="min-w-[180px]"
                    aria-label="Catalog marker"
                  />
                </td>
                <td className="px-2 py-1.5 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(r.id)}
                    aria-label="Remove row"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="text-muted-foreground px-3 py-6 text-center text-sm"
                >
                  No rows. Add one below or go back to upload again.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setRows((rs) => [...rs, emptyRow()])}
          >
            <Plus className="size-4" />
            Add row
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStage("input");
              setRows([]);
            }}
          >
            Start over
          </Button>
        </div>
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileUp className="size-4" />
          )}
          Import {rows.length} result{rows.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
}
