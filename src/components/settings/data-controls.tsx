"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";

import { exportUserData, importUserData } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";

export function DataControls() {
  const [isPending, startTransition] = useTransition();
  const [json, setJson] = useState("");

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
        toast.success(`Imported ${count} measurement(s)`);
        setJson("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import failed.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onExport} disabled={isPending}>
        <Download className="size-4" />
        Export data (JSON)
      </Button>

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
          Import measurements
        </Button>
      </div>
    </div>
  );
}
