"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deleteCheckIn } from "@/lib/actions/checkin";
import { formatDate } from "@/lib/dates";
import { moodFace } from "@/lib/mood";
import { CHECKIN_MARKERS, type CheckInRatings } from "@/types/checkin";

export interface CheckInHistoryData {
  id: string;
  date: Date;
  ratings: CheckInRatings;
  sideEffects: string[];
  notes: string | null;
}

/** One history card: compact marker chips (mood shown as an emoji face), side
 * effects, notes, and a delete control. Editing happens via the form above
 * (re-picking the same date upserts it) — this row is read + delete only. */
export function CheckInHistoryRow({
  checkIn,
  accentColor,
}: {
  checkIn: CheckInHistoryData;
  accentColor?: string;
}) {
  const [isDeleting, startDelete] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this check-in?")) return;
    startDelete(async () => {
      try {
        await deleteCheckIn(checkIn.id);
        toast.success("Check-in deleted");
      } catch {
        toast.error("Failed to delete check-in");
      }
    });
  }

  const mood = moodFace(checkIn.ratings.mood);
  const rated = CHECKIN_MARKERS.filter((m) => checkIn.ratings[m.key] != null);

  return (
    <div className="card-surface rounded-[18px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {accentColor ? (
              <span
                aria-hidden
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: accentColor }}
              />
            ) : null}
            <span className="text-foreground text-[13px] font-medium">
              {formatDate(checkIn.date, "EEE, MMM d, yyyy")}
            </span>
            {mood ? (
              <span
                role="img"
                aria-label={mood.label}
                title={mood.label}
                className="text-sm"
              >
                {mood.emoji}
              </span>
            ) : null}
          </div>

          {rated.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {rated.map((m) => (
                <span
                  key={m.key}
                  className="bg-accent text-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                >
                  {m.label}
                  <span className="num font-semibold">
                    {checkIn.ratings[m.key]}
                  </span>
                </span>
              ))}
            </div>
          ) : null}

          {checkIn.sideEffects.length > 0 ? (
            <p className="text-muted-foreground text-[12px]">
              Side effects: {checkIn.sideEffects.join(", ")}
            </p>
          ) : null}

          {checkIn.notes ? (
            <p className="text-foreground text-[13px] whitespace-pre-wrap">
              {checkIn.notes}
            </p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete check-in"
          disabled={isDeleting}
          onClick={handleDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
