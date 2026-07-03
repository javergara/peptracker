"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Upload } from "lucide-react";

import {
  exportUserData,
  importUserData,
  exportDosesCsv,
  exportLabsCsv,
} from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";

export function DataControls() {
  const [isPending, startTransition] = useTransition();
  const [json, setJson] = useState("");

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
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={4}
          placeholder="Paste exported JSON here…"
          className="border-input bg-background focus-visible:ring-ring w-full resize-none rounded-lg border px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2"
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
    </div>
  );
}
