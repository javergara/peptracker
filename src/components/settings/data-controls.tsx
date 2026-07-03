"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Upload } from "lucide-react";

import {
  exportUserData,
  importUserData,
  exportDosesCsv,
  exportLabsCsv,
  importMeasurementsCsv,
} from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function DataControls() {
  const [isPending, startTransition] = useTransition();
  const [json, setJson] = useState("");
  const [wearableCsv, setWearableCsv] = useState("");

  function downloadCsv(csv: string, filename: string) {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onExportDosesCsv() {
    startTransition(async () => {
      try {
        const csv = await exportDosesCsv();
        downloadCsv(csv, `doses-${new Date().toISOString().slice(0, 10)}.csv`);
        toast.success("Exported dose log CSV");
      } catch {
        toast.error("CSV export failed.");
      }
    });
  }

  function onExportLabsCsv() {
    startTransition(async () => {
      try {
        const csv = await exportLabsCsv();
        downloadCsv(csv, `labs-${new Date().toISOString().slice(0, 10)}.csv`);
        toast.success("Exported labs CSV");
      } catch {
        toast.error("CSV export failed.");
      }
    });
  }

  function onExport() {
    startTransition(async () => {
      try {
        const data = await exportUserData();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `peptides-backup-${data.exportedAt.slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported backup");
      } catch {
        toast.error("Export failed.");
      }
    });
  }

  function onImport() {
    if (!json.trim()) {
      toast.error("Paste a backup JSON first.");
      return;
    }
    startTransition(async () => {
      try {
        const count = await importUserData(json);
        toast.success(`Imported ${count} record(s)`);
        setJson("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import failed.");
      }
    });
  }

  function onImportWearableCsv() {
    if (!wearableCsv.trim()) {
      toast.error("Paste wearable CSV data first.");
      return;
    }
    startTransition(async () => {
      try {
        const count = await importMeasurementsCsv(wearableCsv);
        toast.success(`Imported ${count} measurement(s)`);
        setWearableCsv("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "CSV import failed.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onExport} disabled={isPending}>
          <Download className="size-4" />
          Export data (JSON)
        </Button>
        <Button
          variant="outline"
          onClick={onExportDosesCsv}
          disabled={isPending}
        >
          <FileSpreadsheet className="size-4" />
          Export doses (CSV)
        </Button>
        <Button
          variant="outline"
          onClick={onExportLabsCsv}
          disabled={isPending}
        >
          <FileSpreadsheet className="size-4" />
          Export labs (CSV)
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Import backup</label>
        <Textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={4}
          placeholder="Paste exported JSON here…"
          className="resize-none font-mono text-xs"
        />
        <Button
          variant="outline"
          onClick={onImport}
          disabled={isPending || !json.trim()}
        >
          <Upload className="size-4" />
          Import backup
        </Button>
        <p className="text-muted-foreground text-xs">
          Restores cycles, doses, vials, stock, labs, measurements, journal,
          supplements and reminders. Additive — importing the same backup twice
          duplicates records. Photos are not included.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Import wearable CSV</label>
        <Textarea
          value={wearableCsv}
          onChange={(e) => setWearableCsv(e.target.value)}
          rows={4}
          placeholder={
            "date,type,value,unit\n2026-07-01,sleep,7.5,h\n2026-07-01,hrv,62,ms\n2026-07-01,restingHr,54,bpm"
          }
          className="resize-none font-mono text-xs"
        />
        <Button
          variant="outline"
          onClick={onImportWearableCsv}
          disabled={isPending || !wearableCsv.trim()}
        >
          <Upload className="size-4" />
          Import wearable CSV
        </Button>
        <p className="text-muted-foreground text-xs">
          Header row <code className="font-mono">date,type,value,unit</code>{" "}
          (unit optional). <code className="font-mono">type</code> must be one
          of weight, bodyFat, sleep, recovery, restingHr, hrv, steps, workout,
          custom. Invalid rows are skipped; each valid row becomes a new
          measurement (additive, no dedup).
        </p>
      </div>
    </div>
  );
}
