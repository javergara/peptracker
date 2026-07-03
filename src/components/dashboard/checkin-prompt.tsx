import Link from "next/link";
import { ChevronRight, ClipboardCheck } from "lucide-react";

import { getCurrentUser, getTodaysCheckIn } from "@/lib/queries";
import { moodFace } from "@/lib/mood";
import { asCheckInRatings, CHECKIN_MARKERS } from "@/types/checkin";

/**
 * Slim dashboard prompt: nudges toward `/checkin` when today has no entry yet,
 * or shows a compact summary of today's ratings once it's logged.
 */
export async function CheckInPrompt() {
  const [user, todaysCheckIn] = await Promise.all([
    getCurrentUser(),
    getTodaysCheckIn(),
  ]);
  const accent = user.color ?? "#7C3AED";

  const rowCls =
    "card-surface mb-[18px] flex items-center justify-between gap-4 rounded-[18px] p-4 transition-colors hover:bg-accent/40 [box-shadow:var(--shadow-card)]";
  const iconWrapCls =
    "bg-accent flex size-9 shrink-0 items-center justify-center rounded-[10px]";

  if (!todaysCheckIn) {
    return (
      <Link href="/checkin" className={rowCls}>
        <div className="flex min-w-0 items-center gap-3">
          <div className={iconWrapCls}>
            <ClipboardCheck className="text-primary size-[17px]" />
          </div>
          <div className="min-w-0">
            <p className="text-foreground text-[14px] font-medium">
              How are you feeling today?
            </p>
            <p className="text-muted-foreground text-[12px]">
              Log a quick daily check-in — mood, energy, sleep &amp; more.
            </p>
          </div>
        </div>
        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
      </Link>
    );
  }

  const ratings = asCheckInRatings(todaysCheckIn.ratings);
  const mood = moodFace(ratings.mood);
  const rated = CHECKIN_MARKERS.filter((m) => ratings[m.key] != null);

  return (
    <Link href="/checkin" className={rowCls}>
      <div className="flex min-w-0 items-center gap-3">
        <div className={iconWrapCls}>
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: accent }}
            aria-hidden
          />
        </div>
        <div className="min-w-0">
          <p className="text-foreground flex items-center gap-1.5 text-[14px] font-medium">
            Today&apos;s check-in logged
            {mood ? (
              <span role="img" aria-label={mood.label} title={mood.label}>
                {mood.emoji}
              </span>
            ) : null}
          </p>
          {rated.length > 0 ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {rated.map((m) => (
                <span key={m.key} className="text-muted-foreground text-[12px]">
                  {m.label}{" "}
                  <span className="num text-foreground font-medium">
                    {ratings[m.key]}
                  </span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
    </Link>
  );
}
