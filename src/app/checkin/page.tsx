import { ClipboardCheck } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Eyebrow } from "@/components/common/eyebrow";
import { EmptyState } from "@/components/common/empty-state";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RatingScale } from "@/components/checkin/rating-scale";
import {
  CheckInHistoryRow,
  type CheckInHistoryData,
} from "@/components/checkin/checkin-history-row";
import { saveCheckIn } from "@/lib/actions/checkin";
import { getCurrentUser, getTodaysCheckIn, listCheckIns } from "@/lib/queries";
import { toDateInputValue } from "@/lib/dates";
import { asCheckInRatings, CHECKIN_MARKERS } from "@/types/checkin";
import { asStringArray } from "@/types/peptide";

export const metadata = { title: "Check-in" };
export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const now = new Date();
  const today = toDateInputValue(now);

  const [user, todaysCheckIn, recent] = await Promise.all([
    getCurrentUser(),
    getTodaysCheckIn(),
    listCheckIns(30),
  ]);

  const accentColor = user.color ?? undefined;
  const todaysRatings = todaysCheckIn
    ? asCheckInRatings(todaysCheckIn.ratings)
    : {};
  const todaysSideEffects = todaysCheckIn
    ? asStringArray(todaysCheckIn.sideEffects)
    : [];

  const history: CheckInHistoryData[] = recent.map((c) => ({
    id: c.id,
    date: c.date,
    ratings: asCheckInRatings(c.ratings),
    sideEffects: asStringArray(c.sideEffects),
    notes: c.notes,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Check-in"
        description="A quick daily wellbeing log — mood, energy, sleep, and more. Self-report only, not medical advice."
        accentColor={accentColor}
      />

      {/* Check-in form — prefilled with today's entry when one exists, so
          re-submitting the same day edits it in place (unique per userId+date). */}
      <div className="card-surface mb-8 rounded-[18px]">
        <div className="border-border border-b px-5 pt-4 pb-3">
          <Eyebrow className="mb-1">
            {todaysCheckIn ? "Edit today's check-in" : "New check-in"}
          </Eyebrow>
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <ClipboardCheck className="size-4" />
            How are you feeling?
          </h2>
        </div>
        <div className="px-5 py-4">
          <ActionForm
            action={saveCheckIn}
            success={todaysCheckIn ? "Check-in updated" : "Check-in saved"}
            resetOnSuccess={false}
            className="space-y-5"
          >
            <div className="max-w-[200px] space-y-1.5">
              <label htmlFor="checkin-date" className="text-sm font-medium">
                Date
              </label>
              <Input
                id="checkin-date"
                name="date"
                type="date"
                max={today}
                defaultValue={
                  todaysCheckIn ? toDateInputValue(todaysCheckIn.date) : today
                }
                required
              />
            </div>

            <div className="space-y-4">
              {CHECKIN_MARKERS.map((m) => (
                <RatingScale
                  key={m.key}
                  name={`rating:${m.key}`}
                  label={m.label}
                  lowLabel={m.lowLabel}
                  highLabel={m.highLabel}
                  defaultValue={todaysRatings[m.key]}
                />
              ))}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="checkin-sideEffects"
                className="text-sm font-medium"
              >
                Side effects
              </label>
              <Input
                id="checkin-sideEffects"
                name="sideEffects"
                placeholder="comma-separated, e.g. headache, nausea"
                defaultValue={todaysSideEffects.join(", ")}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="checkin-notes" className="text-sm font-medium">
                Notes
              </label>
              <Textarea
                id="checkin-notes"
                name="notes"
                rows={3}
                placeholder="Anything else worth noting..."
                defaultValue={todaysCheckIn?.notes ?? ""}
              />
            </div>

            <div className="flex items-center justify-end">
              <SubmitButton>
                <ClipboardCheck className="size-4" />
                {todaysCheckIn ? "Update check-in" : "Save check-in"}
              </SubmitButton>
            </div>
          </ActionForm>
        </div>
      </div>

      {/* History */}
      <h2 className="font-display mb-3 text-base font-semibold tracking-tight">
        Recent check-ins
      </h2>
      {history.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="size-6" />}
          title="No check-ins yet"
          description="Save your first check-in above to start tracking daily wellbeing alongside your protocols."
        />
      ) : (
        <div className="space-y-3">
          {history.map((c) => (
            <CheckInHistoryRow
              key={c.id}
              checkIn={c}
              accentColor={accentColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}
