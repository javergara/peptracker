"use client";

import { useState, useTransition } from "react";
import { FlaskConical, Save } from "lucide-react";
import { toast } from "sonner";

import { Eyebrow } from "@/components/common/eyebrow";
import { Button } from "@/components/ui/button";
import { calculateReconstitution } from "@/lib/reconstitution";
import { createVial } from "@/lib/actions/vials";

interface ReconstitutionCalculatorProps {
  defaultVialMg?: number;
  defaultBacWaterMl?: number;
  /** When provided, the "Save as vial" button becomes available. */
  peptideId?: string;
}

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export function ReconstitutionCalculator({
  defaultVialMg = 5,
  defaultBacWaterMl = 2,
  peptideId,
}: ReconstitutionCalculatorProps) {
  const [vialMg, setVialMg] = useState<string>(String(defaultVialMg));
  const [bacWaterMl, setBacWaterMl] = useState<string>(
    String(defaultBacWaterMl),
  );
  const [doseMcg, setDoseMcg] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const result = calculateReconstitution({
    vialMg: parseFloat(vialMg) || 0,
    bacWaterMl: parseFloat(bacWaterMl) || 0,
    doseMcg: parseFloat(doseMcg) || 0,
  });

  const hasResult =
    parseFloat(vialMg) > 0 &&
    parseFloat(bacWaterMl) > 0 &&
    parseFloat(doseMcg) > 0;

  const canSave =
    !!peptideId && parseFloat(vialMg) > 0 && parseFloat(bacWaterMl) > 0;

  function handleSaveAsVial() {
    if (!peptideId) return;
    const fd = new FormData();
    fd.set("peptideId", peptideId);
    fd.set("totalMcg", String(parseFloat(vialMg) * 1000));
    fd.set("bacWaterMl", bacWaterMl);
    startTransition(async () => {
      try {
        await createVial(fd);
        toast.success("Vial saved to inventory");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save vial.");
      }
    });
  }

  return (
    <div className="card-surface @container rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
      <Eyebrow className="mb-4">
        <span className="flex items-center gap-2">
          <FlaskConical className="size-3.5" />
          RECONSTITUTION CALCULATOR
        </span>
      </Eyebrow>

      <div className="space-y-5">
        {/* Inputs */}
        <div className="grid grid-cols-1 gap-4 @sm:grid-cols-3">
          <div className="space-y-1.5">
            <label
              htmlFor="recon-vial-mg"
              className="text-sm leading-none font-medium"
            >
              Vial size (mg)
            </label>
            <input
              id="recon-vial-mg"
              type="number"
              min="0"
              step="0.1"
              value={vialMg}
              onChange={(e) => setVialMg(e.target.value)}
              className={inputCls}
              placeholder="e.g. 5"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="recon-bac-ml"
              className="text-sm leading-none font-medium"
            >
              BAC water (mL)
            </label>
            <input
              id="recon-bac-ml"
              type="number"
              min="0"
              step="0.1"
              value={bacWaterMl}
              onChange={(e) => setBacWaterMl(e.target.value)}
              className={inputCls}
              placeholder="e.g. 2"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="recon-dose-mcg"
              className="text-sm leading-none font-medium"
            >
              Target dose (mcg)
            </label>
            <input
              id="recon-dose-mcg"
              type="number"
              min="0"
              step="1"
              value={doseMcg}
              onChange={(e) => setDoseMcg(e.target.value)}
              className={inputCls}
              placeholder="e.g. 250"
            />
          </div>
        </div>

        {/* Results */}
        {hasResult ? (
          <div className="bg-accent/50 grid grid-cols-2 gap-3 rounded-xl p-4 @lg:grid-cols-4">
            <ResultItem
              label="CONCENTRATION"
              value={`${result.concentrationMcgPerMl}`}
              unit="mcg/mL"
              sub={`${result.concentrationMgPerMl} mg/mL`}
            />
            <ResultItem
              label="DRAW VOLUME"
              value={`${result.drawMl}`}
              unit="mL"
            />
            <ResultItem
              label="INSULIN UNITS"
              value={`${result.insulinUnits}`}
              unit="U"
              sub="U-100 syringe"
            />
            <ResultItem
              label="DOSES / VIAL"
              value={String(result.dosesPerVial)}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-center text-sm">
            Enter vial size, BAC water volume, and target dose to calculate.
          </p>
        )}

        {/* Save as vial */}
        {canSave && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleSaveAsVial}
            >
              <Save className="size-3.5" />
              Save as vial
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultItem({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="space-y-0.5 text-center">
      <p className="eyebrow text-[#8B86AD]">{label}</p>
      <p className="text-foreground text-lg font-semibold">
        <span className="num">{value}</span>
        {unit && (
          <span className="text-muted-foreground ml-0.5 text-xs font-normal">
            {" "}
            {unit}
          </span>
        )}
      </p>
      {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
    </div>
  );
}
