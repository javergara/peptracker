"use client";

import { useEffect, useState, useTransition } from "react";
import { Timer } from "lucide-react";
import { toast } from "sonner";

import { AdherenceRing } from "@/components/common/adherence-ring";
import { Eyebrow } from "@/components/common/eyebrow";
import { Button } from "@/components/ui/button";
import { cancelFast, endFast, startFast } from "@/lib/actions/fasting";
import {
  FASTING_PRESETS,
  fastingProgress,
  formatDuration,
} from "@/lib/fasting";

export interface ActiveFast {
  startedAt: Date;
  targetHours: number;
}

/**
 * Intermittent-fasting timer. Shows a live elapsed/goal ring for an active fast
 * (ticking every 30s) with End/Cancel, or preset start buttons when idle.
 */
export function FastingCard({ fast }: { fast: ActiveFast | null }) {
  const [now, setNow] = useState(() => Date.now());
  const [isPending, start] = useTransition();

  useEffect(() => {
    if (!fast) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [fast]);

  function run(fn: () => Promise<void>, ok: string) {
    start(async () => {
      try {
        await fn();
        toast.success(ok);
      } catch {
        toast.error("Something went wrong.");
      }
    });
  }

  return (
    <div className="card-surface rounded-2xl p-5">
      <Eyebrow className="mb-3 flex items-center gap-1.5">
        <Timer className="size-3.5" />
        Fasting
      </Eyebrow>

      {fast ? (
        (() => {
          const p = fastingProgress(
            fast.startedAt,
            fast.targetHours,
            new Date(now),
          );
          return (
            <div className="flex items-center gap-5">
              <AdherenceRing
                percent={p.pct}
                size={116}
                label={formatDuration(p.elapsedMs)}
                subtitle={
                  p.complete ? "goal reached" : `of ${fast.targetHours}h`
                }
              />
              <div className="flex-1 space-y-2">
                <p className="text-muted-foreground text-sm">
                  {p.complete ? (
                    <span className="text-[var(--ok)]">
                      Target reached — you can eat.
                    </span>
                  ) : (
                    <>
                      <span className="num text-foreground font-medium">
                        {formatDuration(p.remainingMs)}
                      </span>{" "}
                      to go
                    </>
                  )}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => run(endFast, "Fast ended")}
                  >
                    End fast
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => run(cancelFast, "Fast discarded")}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Start a fast and track your window.
          </p>
          <div className="flex flex-wrap gap-2">
            {FASTING_PRESETS.map((preset) => (
              <Button
                key={preset.key}
                size="sm"
                variant="secondary"
                disabled={isPending}
                onClick={() =>
                  run(
                    () => startFast(preset.hours),
                    `Started ${preset.label} fast`,
                  )
                }
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
