"use client";

import { useTransition } from "react";
import { Droplet, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { AdherenceRing } from "@/components/common/adherence-ring";
import { Eyebrow } from "@/components/common/eyebrow";
import { Button } from "@/components/ui/button";
import { logWater, undoLastWater } from "@/lib/actions/food";
import { goalProgress } from "@/lib/food";

const INCREMENTS = [250, 500];

/** Daily water tracker — ring vs goal + quick +mL buttons (undo removes last). */
export function WaterCard({
  total,
  goal,
  date,
}: {
  total: number;
  goal: number | null;
  /** yyyy-MM-dd the water logs into. */
  date: string;
}) {
  const [isPending, start] = useTransition();
  const pct = goalProgress(total, goal);

  function add(ml: number) {
    start(async () => {
      try {
        await logWater(ml, date);
      } catch {
        toast.error("Could not log water.");
      }
    });
  }

  function undo() {
    start(async () => {
      try {
        await undoLastWater(date);
      } catch {
        toast.error("Nothing to undo.");
      }
    });
  }

  return (
    <div className="card-surface rounded-2xl p-5">
      <Eyebrow className="mb-3 flex items-center gap-1.5">
        <Droplet className="size-3.5" />
        Water
      </Eyebrow>
      <div className="flex items-center gap-5">
        <AdherenceRing
          percent={pct}
          size={104}
          label={`${(total / 1000).toFixed(total % 1000 === 0 ? 0 : 1)}L`}
          subtitle={goal ? `of ${(goal / 1000).toFixed(1)}L` : "logged"}
        />
        <div className="flex flex-1 flex-wrap gap-2">
          {INCREMENTS.map((ml) => (
            <Button
              key={ml}
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => add(ml)}
            >
              +{ml} mL
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending || total <= 0}
            onClick={undo}
            aria-label="Undo last water"
          >
            <Undo2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
