"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Flag } from "lucide-react";

import { updateCycleStatus } from "@/lib/actions/cycles";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";

export interface EndedCycle {
  id: string;
  name: string;
  endDate: string; // ISO
  /** Whole days of washout still remaining, or null when none planned. */
  washoutLeft: number | null;
}

/**
 * Dashboard prompt for `active` cycles whose planned end date has passed. Such
 * cycles otherwise linger as "active" forever (inflating counts, producing no
 * due doses). Offers a one-tap "Mark complete", a link to extend the dates, and
 * a link to the cycle summary — plus the washout countdown when one is planned.
 * Renders nothing when there are no ended cycles.
 */
export function EndedCyclesPrompt({ cycles }: { cycles: EndedCycle[] }) {
  const [isPending, startTransition] = useTransition();
  if (cycles.length === 0) return null;

  function complete(id: string, name: string) {
    startTransition(async () => {
      try {
        await updateCycleStatus(id, "completed");
        toast.success(`Marked "${name}" complete`);
      } catch {
        toast.error("Could not update the cycle.");
      }
    });
  }

  return (
    <section className="bg-warn-wash border-warn/30 mb-[18px] rounded-[18px] border p-5">
      <div className="text-warn-foreground flex items-center gap-2">
        <Flag className="size-4 shrink-0" />
        <h2 className="font-display text-[15px] font-semibold">
          {cycles.length === 1 ? "A cycle has" : `${cycles.length} cycles have`}{" "}
          reached the end date
        </h2>
      </div>
      <ul className="mt-3 space-y-3">
        {cycles.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
          >
            <div className="min-w-0">
              <Link
                href={`/cycles/${c.id}`}
                className="text-foreground text-sm font-medium hover:underline"
              >
                {c.name}
              </Link>
              <p className="text-muted-foreground num text-xs">
                Ended {formatDate(c.endDate, "MMM d")}
                {c.washoutLeft != null
                  ? c.washoutLeft > 0
                    ? ` · ${c.washoutLeft} day${c.washoutLeft === 1 ? "" : "s"} washout left`
                    : " · washout complete"
                  : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => complete(c.id, c.name)}
              >
                <CheckCircle2 className="size-4" />
                Mark complete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                render={<Link href={`/cycles/${c.id}/edit`} />}
              >
                Extend
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
