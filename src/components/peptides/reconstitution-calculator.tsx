"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateReconstitution } from "@/lib/reconstitution";

interface ReconstitutionCalculatorProps {
  defaultVialMg?: number;
  defaultBacWaterMl?: number;
}

export function ReconstitutionCalculator({
  defaultVialMg = 5,
  defaultBacWaterMl = 2,
}: ReconstitutionCalculatorProps) {
  const [vialMg, setVialMg] = useState<string>(String(defaultVialMg));
  const [bacWaterMl, setBacWaterMl] = useState<string>(
    String(defaultBacWaterMl),
  );
  const [doseMcg, setDoseMcg] = useState<string>("");

  const result = calculateReconstitution({
    vialMg: parseFloat(vialMg) || 0,
    bacWaterMl: parseFloat(bacWaterMl) || 0,
    doseMcg: parseFloat(doseMcg) || 0,
  });

  const hasResult =
    parseFloat(vialMg) > 0 &&
    parseFloat(bacWaterMl) > 0 &&
    parseFloat(doseMcg) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="size-4" />
          Reconstitution Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Inputs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
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
              className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
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
              className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
              placeholder="e.g. 250"
            />
          </div>
        </div>

        {/* Results */}
        {hasResult ? (
          <div className="bg-muted/50 grid grid-cols-2 gap-3 rounded-xl p-4 sm:grid-cols-4">
            <ResultItem
              label="Concentration"
              value={`${result.concentrationMcgPerMl} mcg/mL`}
              sub={`${result.concentrationMgPerMl} mg/mL`}
            />
            <ResultItem label="Draw volume" value={`${result.drawMl} mL`} />
            <ResultItem
              label="Insulin units"
              value={`${result.insulinUnits} U`}
              sub="(U-100 syringe)"
            />
            <ResultItem
              label="Doses per vial"
              value={String(result.dosesPerVial)}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-center text-sm">
            Enter vial size, BAC water volume, and target dose to calculate.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ResultItem({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="space-y-0.5 text-center">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground text-lg font-semibold tabular-nums">
        {value}
      </p>
      {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
    </div>
  );
}
