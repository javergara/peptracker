import { Activity, Flame } from "lucide-react";

import { StatCard } from "@/components/common/stat-card";
import type { Adherence } from "@/lib/adherence";

export function AdherenceCards({ adherence }: { adherence: Adherence }) {
  const pct = adherence.percent !== null ? `${adherence.percent}%` : "—";

  return (
    <>
      <StatCard
        label="30-day adherence"
        value={pct}
        icon={<Activity className="size-5" />}
        hint={
          adherence.percent !== null
            ? `${adherence.logged} of ${adherence.expected} doses`
            : "No scheduled doses"
        }
      />
      <StatCard
        label="Current streak"
        value={adherence.streak === 0 ? "—" : `${adherence.streak}d`}
        icon={<Flame className="size-5" />}
        hint={
          adherence.streak > 0
            ? "Consecutive days on schedule"
            : "Log a dose to start a streak"
        }
      />
    </>
  );
}
