import Link from "next/link";
import { Book, Check, CheckCircle2, Flame, Plus, Syringe } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Eyebrow } from "@/components/common/eyebrow";
import { InkPanel } from "@/components/common/ink-panel";
import { AdherenceRing } from "@/components/common/adherence-ring";
import { Sparkline, MiniBars } from "@/components/common/sparkline";
import { EmptyState } from "@/components/common/empty-state";
import { Disclaimer } from "@/components/disclaimer";
import { CheckInPrompt } from "@/components/dashboard/checkin-prompt";
import { SupplementAdherence } from "@/components/dashboard/supplement-adherence";
import { ReadinessTile } from "@/components/dashboard/readiness-tile";
import { LowStockAlert } from "@/components/dashboard/low-stock-alert";
import { MissedDosesAlert } from "@/components/dashboard/missed-doses-alert";
import { EndedCyclesPrompt } from "@/components/dashboard/ended-cycles-prompt";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { QuickLogButton } from "@/components/dashboard/quick-log-button";
import { CycleProgress } from "@/components/cycles/cycle-progress";
import { ActiveLevelsChart } from "@/components/metrics/active-levels-chart";
import { Button } from "@/components/ui/button";
import {
  getActiveCycles,
  getCurrentUser,
  getDoseLogsInRange,
  getReadinessMeasurements,
  getRecentDoseLogs,
  getStarterCounts,
  getStockLevels,
  getSupplementAdherence,
  getTodaysCheckIn,
  listPeptides,
} from "@/lib/queries";
import { computeAdherence, computeOverdue } from "@/lib/adherence";
import {
  getTodaysDoses,
  type CycleLike,
  type ScheduleConfig,
} from "@/lib/schedule";
import { formatDate } from "@/lib/dates";
import { moodFace } from "@/lib/mood";
import { activeLevelSeries, type PkDose } from "@/lib/pk";
import { computeReadiness, deriveReadinessInputs } from "@/lib/readiness";
import {
  effectiveSingleDose,
  isCycleEnded,
  washoutDaysLeft,
} from "@/lib/cycles";
import { asCheckInRatings } from "@/types/checkin";
import { suggestNextSite } from "@/lib/sites";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    user,
    activeCycles,
    peptides,
    recentDoses,
    rangeLogs,
    stockLevels,
    supplementAdherence,
    readinessMeasurements,
    todaysCheckIn,
  ] = await Promise.all([
    getCurrentUser(),
    getActiveCycles(),
    listPeptides(),
    getRecentDoseLogs(8),
    getDoseLogsInRange(thirtyDaysAgo, now),
    getStockLevels(),
    getSupplementAdherence(),
    getReadinessMeasurements(),
    getTodaysCheckIn(),
  ]);

  // Readiness score — blends the latest sleep/HRV/resting-HR measurements with
  // today's check-in mood (all optional; tile hides itself when nothing's on hand).
  const readiness = computeReadiness(
    deriveReadinessInputs({
      measurements: readinessMeasurements,
      checkInRatings: asCheckInRatings(todaysCheckIn?.ratings),
    }),
  );

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

  // An "active" cycle whose end date has passed still counts toward adherence
  // *history* (cycleLikes keeps it), but shouldn't inflate the live ACTIVE stat
  // or the active-cycles card — surface those as a completion prompt instead.
  const runningCycles = activeCycles.filter(
    (c) => !isCycleEnded(c.endDate, now),
  );
  const endedCycles = activeCycles
    .filter((c) => isCycleEnded(c.endDate, now))
    .map((c) => ({
      id: c.id,
      name: c.name,
      endDate: (c.endDate as Date).toISOString(),
      washoutLeft: washoutDaysLeft(c.endDate, c.washoutDays, now),
    }));

  const todays = getTodaysDoses(cycleLikes, now);
  const todaysDue = todays.reduce((sum, t) => sum + t.times, 0);
  const adherence = computeAdherence(cycleLikes, rangeLogs, 30, now);
  const overdue = computeOverdue(cycleLikes, rangeLogs, now);

  // Getting-started checklist: only new accounts pay the extra count queries —
  // established ones (cycle + dose exist) skip them entirely.
  const established = activeCycles.length > 0 && recentDoses.length > 0;
  const starter = established ? null : await getStarterCounts();
  const onboarding = starter
    ? {
        hasSupply: stockLevels.length > 0,
        hasCycle: activeCycles.length > 0,
        hasDose: recentDoses.length > 0,
        hasBaseline: starter.measurements > 0 || starter.labs > 0,
        hasPhoto: starter.photos > 0,
      }
    : null;

  const peptideNameById = new Map(peptides.map((p) => [p.id, p.name]));

  // Effective single-peptide dose per cycle for today — resolves titration
  // cycles (whose dosePerAdmin is intentionally blank) to the current week's
  // ramped dose, matching the cycle-detail page. Drives the dashboard dose chip
  // and one-tap quick-log so titration cycles aren't left un-loggable.
  const singleDoseByCycle = new Map<
    string,
    { peptideId: string; amount: number; unit: string }
  >();
  for (const c of activeCycles) {
    if (!c.peptideId) continue; // stack cycles dose per-peptide via items
    const dose = effectiveSingleDose(
      c.scheduleConfig as ScheduleConfig | null,
      c.peptide?.dosage,
      c.startDate,
      now,
    );
    if (dose) singleDoseByCycle.set(c.id, { peptideId: c.peptideId, ...dose });
  }

  // Today's doses, tracked per PEPTIDE/administration (not per cycle) so a
  // multi-dose day or a stack shows "1 of 2 logged" and keeps quick-log live for
  // whatever's still outstanding — logging one peptide no longer hides the rest.
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  // Count today's logged doses per cycle+peptide.
  const loggedTodayByKey = new Map<string, number>();
  for (const log of rangeLogs) {
    if (!log.cycleId || log.takenAt < todayStart) continue;
    const key = `${log.cycleId}::${log.peptideId}`;
    loggedTodayByKey.set(key, (loggedTodayByKey.get(key) ?? 0) + 1);
  }

  interface DueAdmin {
    peptideId: string;
    peptideName: string;
    expected: number;
    logged: number;
    amount?: number;
    unit: string;
  }
  interface TodayRow {
    cycleId: string;
    cycleName: string;
    title: string;
    admins: DueAdmin[];
  }
  const rawById = new Map(activeCycles.map((c) => [c.id, c]));
  const rowsByCycle = new Map<string, TodayRow>();
  for (const t of todays) {
    const raw = rawById.get(t.cycle.id);
    if (!raw) continue;
    let row = rowsByCycle.get(t.cycle.id);
    if (!row) {
      row = {
        cycleId: t.cycle.id,
        cycleName: raw.name,
        title: raw.peptide?.name ?? raw.stack?.name ?? raw.name,
        admins: [],
      };
      rowsByCycle.set(t.cycle.id, row);
    }
    if (t.peptideId) {
      // Stack item: dose comes from the per-peptide scheduleConfig.items entry.
      const item = (raw.scheduleConfig as ScheduleConfig | null)?.items?.find(
        (i) => i.peptideId === t.peptideId,
      );
      row.admins.push({
        peptideId: t.peptideId,
        peptideName: peptideNameById.get(t.peptideId) ?? "dose",
        expected: t.times,
        logged: loggedTodayByKey.get(`${t.cycle.id}::${t.peptideId}`) ?? 0,
        amount: item?.dose,
        unit: item?.unit ?? "mcg",
      });
    } else if (raw.peptideId) {
      // Single-peptide cycle: dose from the resolved single dose (flat/titration).
      const single = singleDoseByCycle.get(t.cycle.id);
      row.admins.push({
        peptideId: raw.peptideId,
        peptideName: raw.peptide?.name ?? "dose",
        expected: t.times,
        logged: loggedTodayByKey.get(`${t.cycle.id}::${raw.peptideId}`) ?? 0,
        amount: single?.amount,
        unit: single?.unit ?? "mcg",
      });
    }
  }
  const todaysRows = [...rowsByCycle.values()];

  // Suggested next injection site — same rotation logic as /log, seeded from
  // the most recently logged dose that recorded a site.
  const lastSite = recentDoses.find((d) => d.site)?.site ?? null;
  const suggestedSite = suggestNextSite(lastSite);

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

  // Active levels (estimated PK) — group ALL recently-logged doses by peptide
  // (whether or not they're tied to a cycle), for peptides with a configured
  // half-life. Reuses the 30-day rangeLogs already loaded (no extra query): the
  // full 30-day history feeds the decay math for continuity, while the chart
  // only displays the last 7 days.
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const activeLevelsFrom = sevenDaysAgo.getTime();
  const activeLevelsTo = now.getTime();
  const pkGroups = new Map<
    string,
    { name: string; halfLifeHours: number; doses: PkDose[] }
  >();
  for (const log of rangeLogs) {
    const hl = log.peptide.halfLifeHours;
    if (!hl || hl <= 0) continue;
    const group = pkGroups.get(log.peptideId) ?? {
      name: log.peptide.name,
      halfLifeHours: hl,
      doses: [],
    };
    group.doses.push({ t: log.takenAt.getTime(), amount: log.amount });
    pkGroups.set(log.peptideId, group);
  }
  const activeLevelSeriesData = Array.from(pkGroups.values()).map((g) => ({
    peptideName: g.name,
    points: activeLevelSeries(
      g.doses,
      g.halfLifeHours,
      activeLevelsFrom,
      activeLevelsTo,
    ),
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        description={`${user.name}'s protocols at a glance · ${formatDate(now, "EEEE, MMMM d")}`}
        accentColor={accent}
        actions={
          <Button className="btn-gradient" render={<Link href="/cycles/new" />}>
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
          <Eyebrow className="text-ink-accent">TODAY · DUE NOW</Eyebrow>
          <div className="mt-2.5 mb-1 flex items-end gap-3.5">
            <span className="num text-ink-foreground text-[74px] leading-[.85] font-semibold">
              {todaysDue}
            </span>
            <span className="text-ink-subtle pb-[9px] text-base">
              {todaysDue === 1 ? "dose due" : "doses due"}
            </span>
          </div>
          <p className="text-ink-muted mt-1.5 mb-5 max-w-[340px] text-[13.5px]">
            {todaysDue === 0
              ? "Nothing scheduled — you're all caught up for today."
              : "Log each dose as you take it to keep your adherence streak alive."}
          </p>

          {/* Dose chips */}
          {todaysRows.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2.5">
              {todaysRows.slice(0, 3).map((row) => {
                const dose = singleDoseByCycle.get(row.cycleId);
                return (
                  <div
                    key={row.cycleId}
                    className="flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/7 px-3 py-[7px]"
                  >
                    <span
                      className="size-[7px] shrink-0 rounded-full"
                      style={{ background: accent }}
                      aria-hidden
                    />
                    <span className="text-ink-foreground text-[13px] font-medium">
                      {row.title}
                    </span>
                    {dose ? (
                      <span className="num text-ink-muted text-xs">
                        {dose.amount} {dose.unit}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {/* White "Log dose" CTA */}
          <Button
            className="text-ink h-[42px] rounded-[11px] bg-white text-sm font-semibold hover:bg-white/90"
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

      {/* Alerts — each renders only when there's something to act on */}
      {onboarding ? <OnboardingChecklist status={onboarding} /> : null}
      <EndedCyclesPrompt cycles={endedCycles} />
      <MissedDosesAlert overdue={overdue} />
      <LowStockAlert levels={stockLevels} />

      {/* Daily wellbeing — check-in prompt, readiness, supplement adherence.
          Each piece renders only when it has something to show. */}
      <div className="mb-[18px] grid gap-[18px] lg:grid-cols-[1fr_1fr]">
        <CheckInPrompt />
        {readiness ? <ReadinessTile readiness={readiness} /> : null}
      </div>
      <SupplementAdherence items={supplementAdherence} />

      {/* Row 2 — Three stat tiles */}
      <div className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-3">
        {/* Active cycles */}
        <div className="card-surface rounded-[18px] p-[18px] [box-shadow:var(--shadow-card)]">
          <div className="flex items-start justify-between">
            <div>
              <Eyebrow>ACTIVE CYCLES</Eyebrow>
              <div className="num text-foreground mt-1.5 text-[30px] leading-none font-semibold">
                {runningCycles.length}
              </div>
            </div>
            <Sparkline points={cycleSparkline} />
          </div>
          <p className="text-muted-foreground mt-1.5 text-[12px]">
            {runningCycles.filter((c) => !c.stackId).length} peptide
            {runningCycles.filter((c) => !c.stackId).length !== 1
              ? "s"
              : ""} · {runningCycles.filter((c) => c.stackId).length} stack
            {runningCycles.filter((c) => c.stackId).length !== 1 ? "s" : ""}
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

      {/* Active levels — combined estimated PK curve for active cycles */}
      {activeLevelSeriesData.length > 0 ? (
        <div className="card-surface mb-[18px] rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
          <Eyebrow className="mb-4">Active levels · last 7 days</Eyebrow>
          <ActiveLevelsChart
            series={activeLevelSeriesData}
            from={activeLevelsFrom}
            to={activeLevelsTo}
          />
        </div>
      ) : null}

      {/* Row 3 — Today's doses + Active cycles */}
      <div className="mb-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-2">
        {/* Today's doses */}
        <div className="card-surface rounded-[18px] p-5 [box-shadow:var(--shadow-card)]">
          <h2 className="font-display text-foreground mb-3.5 text-base font-semibold">
            Today&apos;s doses
          </h2>
          {todaysRows.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="size-6" />}
              title="Nothing due today"
              description="Active cycles with a dose scheduled for today will appear here."
            />
          ) : (
            <div className="divide-border flex flex-col divide-y">
              {todaysRows.map((row) => {
                // Track logged-vs-expected per administration so a multi-dose day
                // or a stack keeps quick-log live for whatever's still due.
                const totalExpected = row.admins.reduce(
                  (s, a) => s + a.expected,
                  0,
                );
                const totalLogged = row.admins.reduce(
                  (s, a) => s + Math.min(a.logged, a.expected),
                  0,
                );
                const allDone = totalLogged >= totalExpected;
                // A single-peptide cycle has one admin whose name is the title —
                // no need to repeat it on the button.
                const isSingle =
                  row.admins.length === 1 &&
                  row.admins[0].peptideName === row.title;

                return (
                  <div key={row.cycleId} className="py-[11px]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-[11px]">
                        <span
                          className="size-[9px] shrink-0 rounded-full"
                          style={{ background: accent }}
                          aria-hidden
                        />
                        <div>
                          <Link
                            href={`/cycles/${row.cycleId}`}
                            className="text-foreground text-[14px] font-medium hover:underline"
                          >
                            {row.title}
                          </Link>
                          <p className="text-muted-foreground text-[12px]">
                            {row.cycleName}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {allDone ? (
                          <div className="text-ok inline-flex items-center gap-1.5 text-[12px] font-medium">
                            <Check className="size-[13px]" strokeWidth={2} />
                            {totalExpected > 1
                              ? `${totalLogged}/${totalExpected} logged`
                              : "Logged"}
                          </div>
                        ) : (
                          <span className="num text-muted-foreground text-[12px]">
                            {totalLogged}/{totalExpected} logged
                          </span>
                        )}
                      </div>
                    </div>

                    {/* One quick-log control per still-outstanding administration.
                        A button persists until that peptide's expected count for
                        the day is met (tapping it logs one dose at a time). */}
                    {!allDone ? (
                      <div className="mt-2 flex flex-wrap gap-1.5 pl-[20px]">
                        {row.admins.map((a) => {
                          const remaining = a.expected - a.logged;
                          if (remaining <= 0) return null;
                          const suffix =
                            a.expected > 1 ? ` (${remaining} left)` : "";
                          // No configured amount → can't one-tap; link to cycle.
                          if (a.amount == null) {
                            return (
                              <Link
                                key={a.peptideId}
                                href={`/cycles/${row.cycleId}`}
                                className="text-primary text-[12px] font-medium hover:underline"
                              >
                                Log {isSingle ? "" : `${a.peptideName} `}→
                              </Link>
                            );
                          }
                          return (
                            <QuickLogButton
                              key={a.peptideId}
                              cycleId={row.cycleId}
                              peptideId={a.peptideId}
                              amount={a.amount}
                              unit={a.unit}
                              site={suggestedSite}
                              guard={a.expected === 1}
                              label={
                                isSingle
                                  ? undefined
                                  : `${a.peptideName}${suffix}`
                              }
                              className={
                                isSingle ? undefined : "h-6 px-2 text-[11px]"
                              }
                            />
                          );
                        })}
                      </div>
                    ) : null}
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
          {runningCycles.length === 0 ? (
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
            <div className="divide-border flex flex-col divide-y">
              {runningCycles.map((c) => (
                <div key={c.id} className="py-4 first:pt-0 last:pb-0">
                  <Link
                    href={`/cycles/${c.id}`}
                    className="text-foreground mb-2 block text-[14px] font-medium hover:underline"
                  >
                    {c.name}
                  </Link>
                  <CycleProgress
                    cycle={{
                      startDate: c.startDate,
                      endDate: c.endDate,
                      status: c.status,
                      scheduleConfig: c.scheduleConfig as ScheduleConfig | null,
                      peptide: c.peptide ? { name: c.peptide.name } : null,
                      stack: c.stack
                        ? {
                            name: c.stack.name,
                            items: c.stack.items.map((it) => ({
                              peptide: {
                                id: it.peptide.id,
                                name: it.peptide.name,
                              },
                            })),
                          }
                        : null,
                    }}
                    now={now}
                  />
                </div>
              ))}
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
            {/* Column headers — 5-col grid from sm up; hidden on phones */}
            <div className="eyebrow border-border text-muted-foreground mb-0.5 hidden border-b px-1 pb-[9px] sm:grid sm:grid-cols-[1.6fr_.8fr_1fr_.9fr_.8fr]">
              <span>PEPTIDE</span>
              <span>AMOUNT</span>
              <span>WHEN</span>
              <span>SITE</span>
              <span className="text-right">MOOD</span>
            </div>
            {/* Rows */}
            {recentDoses.map((d, i) => {
              const mood = moodFace(d.mood);
              const isLast = i === recentDoses.length - 1;
              return (
                <div
                  key={d.id}
                  className={cn(
                    "px-1 py-[11px] text-[13px]",
                    !isLast && "border-border border-b",
                  )}
                >
                  {/* sm+: original 5-column grid row */}
                  <div className="hidden sm:grid sm:grid-cols-[1.6fr_.8fr_1fr_.9fr_.8fr] sm:items-center">
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
                    <span className="text-muted-foreground">
                      {d.site ?? "—"}
                    </span>
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

                  {/* Below sm: compact 2-line stacked row (no horizontal scroll) */}
                  <div className="flex flex-col gap-1 sm:hidden">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-foreground flex min-w-0 items-center gap-[9px] font-medium">
                        <span
                          className="block h-[18px] w-[3px] shrink-0 rounded-full"
                          style={{ background: accent }}
                          aria-hidden
                        />
                        <span className="truncate">{d.peptide.name}</span>
                      </span>
                      <span className="num text-foreground shrink-0">
                        {d.amount} {d.unit}
                      </span>
                    </div>
                    <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 pl-[12px] text-xs">
                      <span className="shrink-0">
                        {formatDate(d.takenAt, "MMM d · HH:mm")}
                      </span>
                      <span aria-hidden>·</span>
                      <span className="truncate">{d.site ?? "—"}</span>
                      {mood ? (
                        <>
                          <span aria-hidden>·</span>
                          <span
                            role="img"
                            aria-label={mood.label}
                            title={mood.label}
                            className="shrink-0 text-sm"
                          >
                            {mood.emoji}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
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
