import Link from "next/link";
import { Book, Check, CheckCircle2, Flame, Plus, Syringe } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Eyebrow } from "@/components/common/eyebrow";
import { InkPanel } from "@/components/common/ink-panel";
import { AdherenceRing } from "@/components/common/adherence-ring";
import { Sparkline, MiniBars } from "@/components/common/sparkline";
import { EmptyState } from "@/components/common/empty-state";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import {
  getActiveCycles,
  getCurrentUser,
  getDoseLogsInRange,
  getRecentDoseLogs,
  listPeptides,
} from "@/lib/queries";
import { computeAdherence } from "@/lib/adherence";
import {
  cycleProgress,
  getTodaysDoses,
  type CycleLike,
  type ScheduleConfig,
} from "@/lib/schedule";
import { formatDate } from "@/lib/dates";
import { moodFace } from "@/lib/mood";

export default async function DashboardPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [user, activeCycles, peptides, recentDoses, rangeLogs] =
    await Promise.all([
      getCurrentUser(),
      getActiveCycles(),
      listPeptides(),
      getRecentDoseLogs(8),
      getDoseLogsInRange(thirtyDaysAgo, now),
    ]);

  const accent = user.color ?? "#7C3AED";

  const cycleLikes: CycleLike[] = activeCycles.map((c) => ({
    id: c.id,
    name: c.name,
    startDate: c.startDate,
    endDate: c.endDate,
    status: c.status,
    scheduleConfig: c.scheduleConfig as ScheduleConfig | null,
    peptide: c.peptide ? { name: c.peptide.name } : null,
    stack: c.stack ? { name: c.stack.name } : null,
  }));

  const todays = getTodaysDoses(cycleLikes, now);
  const todaysDue = todays.reduce((sum, t) => sum + t.times, 0);
  const adherence = computeAdherence(cycleLikes, rangeLogs, 30, now);

  // Doses per day for the last 7 days (for MiniBars)
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const dosesPerDay = daysOfWeek.map((dayStart) => {
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    return rangeLogs.filter(
      (log) => log.takenAt >= dayStart && log.takenAt <= dayEnd,
    ).length;
  });

  // Sparkline for active cycles — use last 7 days' logged counts as a proxy
  const cycleSparkline = dosesPerDay;

  // Whether streak justifies the "on track" chip
  const showStreakChip = adherence.streak > 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        description={`${user.name}'s protocols at a glance · ${formatDate(now, "EEEE, MMMM d")}`}
        accentColor={accent}
        actions={
          <Button
            className="[box-shadow:0_10px_22px_-10px_rgba(124,58,237,.85)] [background:linear-gradient(180deg,#8B47F0,#7C3AED)] hover:[background:linear-gradient(180deg,#9B57F0,#8C4AED)]"
            render={<Link href="/cycles/new" />}
          >
            <Plus className="size-4" />
            New cycle
          </Button>
        }
      />
      <Disclaimer className="mb-6" />

      {/* Row 1 — Ink hero + Adherence ring */}
      <div className="mb-[18px] grid gap-[18px] lg:grid-cols-[1.55fr_1fr]">
        {/* Ink hero */}
        <InkPanel variant="hero" molecule className="p-7">
          <Eyebrow className="text-[#C4B5FD]">TODAY · DUE NOW</Eyebrow>
          <div className="mt-2.5 mb-1 flex items-end gap-3.5">
            <span className="num text-[74px] leading-[.85] font-semibold text-[#EFEBFA]">
              {todaysDue}
            </span>
            <span className="pb-[9px] text-base text-[#C9C3E6]">
              {todaysDue === 1 ? "dose due" : "doses due"}
            </span>
          </div>
          <p className="mt-1.5 mb-5 max-w-[340px] text-[13.5px] text-[#A8A2CC]">
            {todaysDue === 0
              ? "Nothing scheduled — you're all caught up for today."
              : "Log each dose as you take it to keep your adherence streak alive."}
          </p>

          {/* Dose chips */}
          {todays.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2.5">
              {todays.slice(0, 3).map(({ cycle }) => (
                <div
                  key={cycle.id}
                  className="flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/7 px-3 py-[7px]"
                >
                  <span
                    className="size-[7px] shrink-0 rounded-full"
                    style={{ background: accent }}
                    aria-hidden
                  />
                  <span className="text-[13px] font-medium text-[#EFEBFA]">
                    {cycle.peptide?.name ?? cycle.stack?.name ?? cycle.name}
                  </span>
                  {cycle.scheduleConfig?.dosePerAdmin ? (
                    <span className="num text-xs text-[#A8A2CC]">
                      {cycle.scheduleConfig.dosePerAdmin}{" "}
                      {cycle.scheduleConfig.unit ?? "mcg"}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {/* White "Log dose" CTA */}
          <Button
            className="h-[42px] rounded-[11px] bg-white text-sm font-semibold text-[#16102E] hover:bg-white/90"
            render={<Link href="/log" />}
          >
            <Syringe className="size-4" />
            Log dose
          </Button>
        </InkPanel>

        {/* Adherence card */}
        <div className="card-surface flex flex-col rounded-[20px] p-6 [box-shadow:var(--shadow-card)]">
          <Eyebrow>30-DAY ADHERENCE</Eyebrow>
          <div className="mt-3.5 flex items-center gap-[18px]">
            <AdherenceRing
              percent={adherence.percent ?? 0}
              size={116}
              showSubtitle
            />
            <div className="flex flex-col gap-3">
              {/* Streak */}
              <div className="text-primary flex items-center gap-1.5">
                <Flame className="size-[15px]" />
                <span className="num text-[22px] leading-none font-semibold">
                  {adherence.streak}
                </span>
                <span className="text-muted-foreground text-[13px]">
                  d streak
                </span>
              </div>
              {/* Dose count */}
              <p className="text-muted-foreground text-[13px] leading-snug">
                <span className="num text-foreground font-semibold">
                  {adherence.logged}
                </span>{" "}
                of{" "}
                <span className="num text-foreground font-semibold">
                  {adherence.expected}
                </span>{" "}
                scheduled doses logged
              </p>
              {/* On-track chip — only when streak is positive */}
              {showStreakChip && (
                <div className="text-ok inline-flex items-center gap-1.5 text-[12px] font-medium">
                  <Check className="size-[13px]" strokeWidth={2} />
                  On track
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 — Three stat tiles */}
      <div className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-3">
        {/* Active cycles */}
        <div className="card-surface rounded-[18px] p-[18px] [box-shadow:var(--shadow-card)]">
          <div className="flex items-start justify-between">
            <div>
              <Eyebrow>ACTIVE CYCLES</Eyebrow>
              <div className="num text-foreground mt-1.5 text-[30px] leading-none font-semibold">
                {activeCycles.length}
              </div>
            </div>
            <Sparkline points={cycleSparkline} />
          </div>
          <p className="text-muted-foreground mt-1.5 text-[12px]">
            {activeCycles.filter((c) => !c.stackId).length} peptide
            {activeCycles.filter((c) => !c.stackId).length !== 1
              ? "s"
              : ""} · {activeCycles.filter((c) => c.stackId).length} stack
            {activeCycles.filter((c) => c.stackId).length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Doses this week */}
        <div className="card-surface rounded-[18px] p-[18px] [box-shadow:var(--shadow-card)]">
          <div className="flex items-start justify-between">
            <div>
              <Eyebrow>DOSES THIS WEEK</Eyebrow>
              <div className="num text-foreground mt-1.5 text-[30px] leading-none font-semibold">
                {dosesPerDay.reduce((a, b) => a + b, 0)}
              </div>
            </div>
            <MiniBars values={dosesPerDay} />
          </div>
          <p className="text-muted-foreground mt-1.5 text-[12px]">
            last 7 days
          </p>
        </div>

        {/* Library */}
        <div className="card-surface rounded-[18px] p-[18px] [box-shadow:var(--shadow-card)]">
          <div className="flex items-start justify-between">
            <div>
              <Eyebrow>LIBRARY</Eyebrow>
              <div className="num text-foreground mt-1.5 text-[30px] leading-none font-semibold">
                {peptides.length}
              </div>
            </div>
            <div className="bg-accent flex size-[34px] items-center justify-center rounded-[10px]">
              <Book className="text-primary size-[17px]" />
            </div>
          </div>
          <Link
            href="/peptides"
            className="text-primary mt-1.5 block text-[12px] font-medium hover:underline"
          >
            Browse peptides →
          </Link>
        </div>
      </div>

      {/* Row 3 — Today's doses + Active cycles */}
      <div className="mb-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-2">
        {/* Today's doses */}
        <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
          <h2 className="font-display text-foreground mb-3.5 text-base font-semibold">
            Today&apos;s doses
          </h2>
          {todays.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="size-6" />}
              title="Nothing due today"
              description="Active cycles with a dose scheduled for today will appear here."
            />
          ) : (
            <div className="flex flex-col divide-y divide-[#F1EEF9]">
              {todays.map(({ cycle }) => {
                // Check if there's a log today for this cycle
                const todayStart = new Date(now);
                todayStart.setHours(0, 0, 0, 0);
                const logged = rangeLogs.find(
                  (log) =>
                    log.cycleId === cycle.id && log.takenAt >= todayStart,
                );

                return (
                  <div
                    key={cycle.id}
                    className="flex items-center justify-between py-[11px]"
                  >
                    <div className="flex items-center gap-[11px]">
                      <span
                        className="size-[9px] shrink-0 rounded-full"
                        style={{ background: accent }}
                        aria-hidden
                      />
                      <div>
                        <Link
                          href={`/cycles/${cycle.id}`}
                          className="text-foreground text-[14px] font-medium hover:underline"
                        >
                          {cycle.peptide?.name ??
                            cycle.stack?.name ??
                            cycle.name}
                        </Link>
                        <p className="text-[12px] text-[#8B86AD]">
                          {cycle.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {logged ? (
                        <div className="text-ok inline-flex items-center gap-1.5 text-[12px] font-medium">
                          <Check className="size-[13px]" strokeWidth={2} />
                          Logged{" "}
                          <span className="num">
                            {formatDate(logged.takenAt, "HH:mm")}
                          </span>
                        </div>
                      ) : (
                        <>
                          {cycle.scheduleConfig?.dosePerAdmin ? (
                            <div className="num text-foreground text-[13px]">
                              {cycle.scheduleConfig.dosePerAdmin}{" "}
                              {cycle.scheduleConfig.unit ?? "mcg"}
                            </div>
                          ) : null}
                          <div className="text-[11px] text-[#8B86AD]">
                            pending
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active cycles */}
        <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
          <h2 className="font-display text-foreground mb-4 text-base font-semibold">
            Active cycles
          </h2>
          {cycleLikes.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="size-6" />}
              title="No active cycles"
              description="Start a cycle from a peptide or stack to track it here."
              action={
                <Button size="sm" render={<Link href="/cycles/new" />}>
                  New cycle
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              {cycleLikes.map((c) => {
                const prog = cycleProgress(c.startDate, c.endDate, now);
                const pct = prog.percent ?? 0;
                const weekNum =
                  prog.daysElapsed > 0
                    ? Math.ceil((prog.daysElapsed + 1) / 7)
                    : 1;
                const totalWeeks =
                  prog.totalDays != null ? Math.ceil(prog.totalDays / 7) : null;
                return (
                  <div key={c.id}>
                    <div className="mb-[7px] flex items-baseline justify-between">
                      <Link
                        href={`/cycles/${c.id}`}
                        className="text-foreground text-[14px] font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                      <span className="num text-[12px] text-[#8B86AD]">
                        {pct}%
                        {totalWeeks != null
                          ? ` · wk ${weekNum}/${totalWeeks}`
                          : ""}
                      </span>
                    </div>
                    {/* Gradient progress bar */}
                    <div className="bg-accent h-2 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full [background:var(--gradient-gauge)]"
                        style={{ width: `${pct}%` }}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 4 — Recent doses table */}
      <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
        <h2 className="font-display text-foreground mb-3 text-base font-semibold">
          Recent doses
        </h2>
        {recentDoses.length === 0 ? (
          <EmptyState
            icon={<Syringe className="size-6" />}
            title="No doses logged yet"
            description="Log your first dose to start building a history."
            action={
              <Button size="sm" render={<Link href="/log" />}>
                Log a dose
              </Button>
            }
          />
        ) : (
          <div>
            {/* Column headers */}
            <div className="eyebrow mb-0.5 grid grid-cols-[1.6fr_.8fr_1fr_.9fr_.8fr] border-b border-[#F1EEF9] px-1 pb-[9px] text-[#9A95B8]">
              <span>PEPTIDE</span>
              <span>AMOUNT</span>
              <span>WHEN</span>
              <span>SITE</span>
              <span className="text-right">MOOD</span>
            </div>
            {/* Rows */}
            {recentDoses.map((d, i) => {
              const mood = moodFace(d.mood);
              return (
                <div
                  key={d.id}
                  className={`grid grid-cols-[1.6fr_.8fr_1fr_.9fr_.8fr] items-center px-1 py-[11px] text-[13px] ${
                    i < recentDoses.length - 1
                      ? "border-b border-[#F6F4FB]"
                      : ""
                  }`}
                >
                  {/* Peptide name with 3px violet accent bar */}
                  <span className="text-foreground flex items-center gap-[9px] font-medium">
                    <span
                      className="block h-[18px] w-[3px] shrink-0 rounded-full"
                      style={{ background: accent }}
                      aria-hidden
                    />
                    {d.peptide.name}
                  </span>
                  <span className="num text-foreground">
                    {d.amount} {d.unit}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDate(d.takenAt, "MMM d · HH:mm")}
                  </span>
                  <span className="text-muted-foreground">{d.site ?? "—"}</span>
                  <span className="text-right text-base">
                    {mood ? (
                      <span
                        role="img"
                        aria-label={mood.label}
                        title={mood.label}
                      >
                        {mood.emoji}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
