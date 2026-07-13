import "server-only";

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";
import {
  buildInterventionBands,
  type InterventionInput,
} from "@/lib/interventions";
import { estimateStockSupply, toMcg } from "@/lib/stock";

/**
 * The peptide library, preset stacks, biomarker catalog, and interaction edges
 * are GLOBAL reference data that only change on `npm run db:seed`. We wrap their
 * reads in `unstable_cache` so they're served from Next's data cache instead of
 * hitting Neon on every page view (Neon's free tier is compute/CU-hour bound).
 * `revalidate` re-pulls hourly; nothing user-scoped is cached here.
 */
const CATALOG_REVALIDATE = 3600; // seconds (catalog is effectively static)

/**
 * Central read-side data access. Server Components and server actions import
 * from here so query shapes stay consistent across the app.
 *
 * Profile-owned data (cycles, dose logs, measurements) is scoped to the
 * currently active profile (see src/lib/active-user.ts). The peptide library,
 * preset stacks, and interactions are global.
 */

/** The active profile (resolved from the activeUserId cookie). */
export async function getCurrentUser() {
  return getActiveUser();
}

export const listPeptides = unstable_cache(
  async () => prisma.peptide.findMany({ orderBy: { name: "asc" } }),
  ["peptides:list"],
  { revalidate: CATALOG_REVALIDATE, tags: ["peptides"] },
);

export const getPeptideBySlug = unstable_cache(
  async (slug: string) => prisma.peptide.findUnique({ where: { slug } }),
  ["peptide:by-slug"],
  { revalidate: CATALOG_REVALIDATE, tags: ["peptides"] },
);

export const getPeptideInteractions = unstable_cache(
  async (peptideId: string) => {
    const rows = await prisma.peptideInteraction.findMany({
      where: {
        OR: [{ peptideAId: peptideId }, { peptideBId: peptideId }],
      },
      include: { peptideA: true, peptideB: true },
    });
    // Normalize so `other` is always the counterpart peptide.
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      note: r.note,
      other: r.peptideAId === peptideId ? r.peptideB : r.peptideA,
    }));
  },
  ["peptide:interactions"],
  { revalidate: CATALOG_REVALIDATE, tags: ["interactions"] },
);

/** Flat peptide-to-peptide interaction rows (for the stack builder / checks). */
export const getAllInteractionRows = unstable_cache(
  async () => {
    const rows = await prisma.peptideInteraction.findMany();
    return rows.map((r) => ({
      peptideAId: r.peptideAId,
      peptideBId: r.peptideBId,
      kind: r.kind,
      note: r.note,
    }));
  },
  ["interactions:all"],
  { revalidate: CATALOG_REVALIDATE, tags: ["interactions"] },
);

// NOTE: stacks are NOT cached. Unlike the peptide/biomarker catalogs (seed-only),
// `Stack` can be user-created via the custom stack builder, and these reads
// return user stacks too — caching them cross-request could hide a freshly built
// stack until the TTL elapsed. Keep them live.
export async function listStacks() {
  return prisma.stack.findMany({
    orderBy: [{ isPreset: "desc" }, { name: "asc" }],
    include: {
      items: { include: { peptide: true }, orderBy: { order: "asc" } },
    },
  });
}

export async function getStackBySlug(slug: string) {
  return prisma.stack.findUnique({
    where: { slug },
    include: {
      items: { include: { peptide: true }, orderBy: { order: "asc" } },
    },
  });
}

/** `status` filters to one CycleStatus (e.g. "active"); omit/undefined = all. */
export async function listCycles(status?: string) {
  const user = await getActiveUser();
  return prisma.cycle.findMany({
    where: { userId: user.id, ...(status ? { status } : {}) },
    orderBy: { startDate: "desc" },
    include: {
      peptide: true,
      stack: true,
      _count: { select: { doseLogs: true } },
    },
  });
}

export async function getCycle(id: string) {
  const user = await getActiveUser();
  return prisma.cycle.findFirst({
    where: { id, userId: user.id },
    include: {
      peptide: true,
      stack: { include: { items: { include: { peptide: true } } } },
      doseLogs: {
        orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
        include: { peptide: true },
      },
    },
  });
}

/**
 * All of the active profile's cycles shaped for the cycle timeline/Gantt
 * (`buildCycleLanes` in `src/lib/cycle-timeline.ts`): peptide + stack-item
 * peptides + `scheduleConfig` so single-peptide and stack cycles can both be
 * fanned out into per-peptide lanes.
 */
export async function getCyclesForTimeline() {
  const user = await getActiveUser();
  return prisma.cycle.findMany({
    where: { userId: user.id },
    orderBy: { startDate: "asc" },
    include: {
      peptide: { select: { id: true, name: true } },
      stack: {
        select: {
          items: { select: { peptide: { select: { id: true, name: true } } } },
        },
      },
    },
  });
}

/**
 * All cycles across ALL profiles, shaped for the cycle timeline/Gantt (mirrors
 * `getCyclesForTimeline` but without the active-profile scope) — powers the
 * calendar's year view when the "All profiles" overlay is on.
 */
export async function getAllCyclesForTimeline() {
  return prisma.cycle.findMany({
    orderBy: { startDate: "asc" },
    include: {
      peptide: { select: { id: true, name: true } },
      stack: {
        select: {
          items: { select: { peptide: { select: { id: true, name: true } } } },
        },
      },
    },
  });
}

/** A single logged dose owned by the active profile (for the edit form). */
export async function getDoseLog(id: string) {
  const user = await getActiveUser();
  return prisma.doseLog.findFirst({
    where: { id, userId: user.id },
    include: { peptide: true },
  });
}

/**
 * The bodyweight recorded at a dose (if any). Weight isn't FK-linked to a dose
 * — it's a weight Measurement stamped at the dose's takenAt (see logDose) — so
 * we resolve it by matching that timestamp. Used to prefill the edit-dose form.
 */
export async function getDoseWeight(takenAt: Date): Promise<number | null> {
  const user = await getActiveUser();
  const m = await prisma.measurement.findFirst({
    where: { userId: user.id, type: "weight", recordedAt: takenAt },
    orderBy: { id: "desc" },
    select: { value: true },
  });
  return m?.value ?? null;
}

export async function getActiveCycles() {
  const user = await getActiveUser();
  return prisma.cycle.findMany({
    where: { status: "active", userId: user.id },
    orderBy: { startDate: "desc" },
    include: {
      peptide: true,
      stack: { include: { items: { include: { peptide: true } } } },
    },
  });
}

/**
 * Peptide IDs currently in play across the active profile's ACTIVE cycles — a
 * stack cycle contributes every peptide in its stack. Powers the cycle-detail
 * "live interaction guard" (checks for synergy/caution/avoid edges among
 * everything actively being dosed right now).
 */
export async function getActiveCyclePeptideIds(): Promise<string[]> {
  const user = await getActiveUser();
  const cycles = await prisma.cycle.findMany({
    where: { status: "active", userId: user.id },
    select: {
      peptideId: true,
      stack: { select: { items: { select: { peptideId: true } } } },
    },
  });
  const ids = new Set<string>();
  for (const c of cycles) {
    if (c.peptideId) ids.add(c.peptideId);
    for (const item of c.stack?.items ?? []) ids.add(item.peptideId);
  }
  return Array.from(ids);
}

/** Cycles the active profile can log doses against (for select inputs). */
export async function getLoggableCycles() {
  const user = await getActiveUser();
  return prisma.cycle.findMany({
    where: { userId: user.id, status: { in: ["active", "planned", "paused"] } },
    orderBy: { startDate: "desc" },
    select: { id: true, name: true },
  });
}

export async function getRecentDoseLogs(limit = 10) {
  const user = await getActiveUser();
  return prisma.doseLog.findMany({
    where: { userId: user.id },
    orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: { peptide: true, cycle: true },
  });
}

/**
 * Paged dose-log history for the /log "Recent doses" table. Optional
 * `peptideId` narrows to one peptide. Uses skip/take (not fetch-all-then-slice)
 * so history pages stay cheap against Neon's free tier.
 */
export async function getDoseLogsPage({
  page = 1,
  pageSize = 15,
  peptideId,
}: {
  page?: number;
  pageSize?: number;
  peptideId?: string;
} = {}) {
  const user = await getActiveUser();
  const where = {
    userId: user.id,
    ...(peptideId ? { peptideId } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.doseLog.findMany({
      where,
      orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
      skip: (Math.max(1, page) - 1) * pageSize,
      take: pageSize,
      include: { peptide: true, cycle: true },
    }),
    prisma.doseLog.count({ where }),
  ]);
  return { rows, total };
}

/** Dose logs for the active profile within a date range (calendar view). */
export async function getDoseLogsInRange(start: Date, end: Date) {
  const user = await getActiveUser();
  return prisma.doseLog.findMany({
    where: { userId: user.id, takenAt: { gte: start, lte: end } },
    orderBy: [{ takenAt: "asc" }, { createdAt: "asc" }],
    include: { peptide: true, cycle: true },
  });
}

/** Dose logs across ALL profiles in a range (combined calendar overlay). */
export async function getAllDoseLogsInRange(start: Date, end: Date) {
  return prisma.doseLog.findMany({
    where: { takenAt: { gte: start, lte: end } },
    orderBy: [{ takenAt: "asc" }, { createdAt: "asc" }],
    include: { peptide: true, cycle: true, user: true },
  });
}

export async function listMeasurements(type?: string) {
  const user = await getActiveUser();
  return prisma.measurement.findMany({
    where: { userId: user.id, ...(type ? { type } : {}) },
    orderBy: { recordedAt: "asc" },
  });
}

/** Measurements for the active profile within a date range (cycle insights). */
export async function getMeasurementsInRange(start: Date, end: Date) {
  const user = await getActiveUser();
  return prisma.measurement.findMany({
    where: { userId: user.id, recordedAt: { gte: start, lte: end } },
    orderBy: { recordedAt: "asc" },
  });
}

/**
 * Recent sleep/HRV/resting-HR measurements (readiness score inputs), scoped
 * to the last `days` (default 14 — enough to find the latest reading of each
 * type without pulling full history).
 */
export async function getReadinessMeasurements(days = 14) {
  const user = await getActiveUser();
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.measurement.findMany({
    where: {
      userId: user.id,
      type: { in: ["sleep", "hrv", "restingHr"] },
      recordedAt: { gte: start },
    },
    orderBy: { recordedAt: "asc" },
  });
}

// --- Vials / inventory -----------------------------------------------------

export async function listVials() {
  const user = await getActiveUser();
  return prisma.vial.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { peptide: true },
  });
}

/** Active/sealed vials for a peptide — used by the dose-log vial selector. */
export async function getActiveVialsForPeptide(peptideId: string) {
  const user = await getActiveUser();
  return prisma.vial.findMany({
    where: {
      userId: user.id,
      peptideId,
      status: { in: ["sealed", "active"] },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, label: true, remainingMcg: true, expiresAt: true },
  });
}

/** All active/sealed vials (for log forms that pick peptide + vial together). */
export async function listActiveVials() {
  const user = await getActiveUser();
  return prisma.vial.findMany({
    where: { userId: user.id, status: { in: ["sealed", "active"] } },
    orderBy: { createdAt: "asc" },
    include: { peptide: true },
  });
}

// --- Stock reserve ---------------------------------------------------------

/** The active profile's stock (unopened vials in reserve), by peptide name. */
export async function listStockItems() {
  const user = await getActiveUser();
  return prisma.stockItem.findMany({
    where: { userId: user.id },
    orderBy: [{ peptide: { name: "asc" } }, { vialMcg: "asc" }],
    include: { peptide: true },
  });
}

export interface StockLevel {
  peptideId: string;
  peptideName: string;
  /** Unopened vials in the reserve. */
  stockVials: number;
  /** Active/sealed vials currently in tracking. */
  activeVials: number;
  /** Combined vials on hand — drives the vial-count low-stock fallback. */
  total: number;
  /**
   * Estimated days of supply left at the peptide's planned dose + frequency,
   * across stock reserve + remaining in active/sealed vials. `null` when no
   * planned dose/cadence is set (e.g. diluents) — callers fall back to `total`.
   */
  daysOfSupply: number | null;
}

/**
 * Per-peptide supply picture: Σ stock quantity + count of active/sealed vials,
 * plus an estimated **days of supply** from the total mcg on hand (stock vial
 * size × qty + remaining in active/sealed vials) against the planned
 * dose/frequency. Candidate peptides are those with a stock item OR any vial.
 * Powers the stock-card low badge and the dashboard low-stock alert.
 */
export async function getStockLevels(): Promise<StockLevel[]> {
  const user = await getActiveUser();
  const [stock, vials] = await Promise.all([
    prisma.stockItem.findMany({
      where: { userId: user.id },
      select: {
        peptideId: true,
        quantity: true,
        vialMcg: true,
        dose: true,
        doseUnit: true,
        frequency: true,
        peptide: { select: { name: true } },
      },
    }),
    prisma.vial.findMany({
      where: { userId: user.id },
      select: {
        peptideId: true,
        status: true,
        remainingMcg: true,
        peptide: { select: { name: true } },
      },
    }),
  ]);

  interface Acc extends StockLevel {
    mcgOnHand: number;
    doseMcg: number | null;
    frequency: string;
  }
  const levels = new Map<string, Acc>();
  const ensure = (peptideId: string, peptideName: string) => {
    let l = levels.get(peptideId);
    if (!l) {
      l = {
        peptideId,
        peptideName,
        stockVials: 0,
        activeVials: 0,
        total: 0,
        daysOfSupply: null,
        mcgOnHand: 0,
        doseMcg: null,
        frequency: "daily",
      };
      levels.set(peptideId, l);
    }
    return l;
  };

  for (const s of stock) {
    const l = ensure(s.peptideId, s.peptide.name);
    l.stockVials += s.quantity;
    l.mcgOnHand += s.vialMcg * s.quantity;
    // Adopt the first stock item that carries a planned dose as the cadence.
    if (l.doseMcg == null) {
      const dm = toMcg(s.dose, s.doseUnit);
      if (dm && dm > 0) {
        l.doseMcg = dm;
        l.frequency = s.frequency;
      }
    }
  }
  for (const v of vials) {
    const l = ensure(v.peptideId, v.peptide.name);
    if (v.status === "active" || v.status === "sealed") {
      l.activeVials += 1;
      l.mcgOnHand += v.remainingMcg;
    }
  }

  for (const l of levels.values()) {
    l.total = l.stockVials + l.activeVials;
    l.daysOfSupply = estimateStockSupply({
      vialMcg: l.mcgOnHand,
      quantity: 1,
      doseMcg: l.doseMcg,
      frequency: l.frequency,
    }).days;
  }

  return Array.from(levels.values())
    .map(
      (l): StockLevel => ({
        peptideId: l.peptideId,
        peptideName: l.peptideName,
        stockVials: l.stockVials,
        activeVials: l.activeVials,
        total: l.total,
        daysOfSupply: l.daysOfSupply,
      }),
    )
    .sort((a, b) => a.peptideName.localeCompare(b.peptideName));
}

/**
 * The most recently priced vial or stock item for a peptide (whichever is
 * newer), reduced to `{ price, vialMcg }`. Drives the cycle-detail cost
 * estimate — returns null when the profile has never set a `price` on any
 * vial/stock row for this peptide.
 */
export async function getPricedSupplyForPeptide(
  peptideId: string,
): Promise<{ price: number; vialMcg: number } | null> {
  const user = await getActiveUser();
  const [vial, stock] = await Promise.all([
    prisma.vial.findFirst({
      where: { userId: user.id, peptideId, price: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { price: true, totalMcg: true, createdAt: true },
    }),
    prisma.stockItem.findFirst({
      where: { userId: user.id, peptideId, price: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { price: true, vialMcg: true, createdAt: true },
    }),
  ]);
  if (!vial && !stock) return null;
  if (vial && (!stock || vial.createdAt >= stock.createdAt)) {
    return { price: vial.price as number, vialMcg: vial.totalMcg };
  }
  return { price: stock!.price as number, vialMcg: stock!.vialMcg };
}

/**
 * Counts for the getting-started checklist. Only queried by the dashboard
 * while the account is still new (it skips this once cycles + doses exist),
 * so these extra reads don't ride every dashboard render.
 */
export async function getStarterCounts() {
  const user = await getActiveUser();
  const [measurements, labs, photos] = await Promise.all([
    prisma.measurement.count({ where: { userId: user.id } }),
    prisma.labResult.count({ where: { userId: user.id } }),
    prisma.photo.count({ where: { userId: user.id } }),
  ]);
  return { measurements, labs, photos };
}

// --- Labs ------------------------------------------------------------------

export async function listLabs() {
  const user = await getActiveUser();
  return prisma.labResult.findMany({
    where: { userId: user.id },
    orderBy: { takenAt: "asc" },
  });
}

/** Lab results for a single biomarker (by its catalog slug), oldest first. */
export async function listLabsForBiomarker(slug: string) {
  const user = await getActiveUser();
  return prisma.labResult.findMany({
    where: { userId: user.id, biomarkerSlug: slug },
    orderBy: { takenAt: "asc" },
  });
}

/** Lab results for the active profile within a date range (cycle insights). */
export async function getLabResultsInRange(start: Date, end: Date) {
  const user = await getActiveUser();
  return prisma.labResult.findMany({
    where: { userId: user.id, takenAt: { gte: start, lte: end } },
    orderBy: { takenAt: "asc" },
  });
}

// --- Biomarker catalog (global) --------------------------------------------

export const listBiomarkers = unstable_cache(
  async () => prisma.biomarker.findMany({ orderBy: { name: "asc" } }),
  ["biomarkers:list"],
  { revalidate: CATALOG_REVALIDATE, tags: ["biomarkers"] },
);

export const getBiomarker = unstable_cache(
  async (slug: string) => prisma.biomarker.findUnique({ where: { slug } }),
  ["biomarker:by-slug"],
  { revalidate: CATALOG_REVALIDATE, tags: ["biomarkers"] },
);

// --- Supplements -----------------------------------------------------------

export async function listSupplements() {
  const user = await getActiveUser();
  return prisma.supplement.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });
}

export async function getActiveSupplements() {
  const user = await getActiveUser();
  return prisma.supplement.findMany({
    where: { userId: user.id, status: "active" },
    orderBy: { startDate: "desc" },
  });
}

export interface SupplementAdherence {
  id: string;
  name: string;
  timesPerDay: number;
  takenToday: number;
  expectedToday: number;
  windowLogged: number;
  windowExpected: number;
}

/**
 * Dose-timing adherence for active supplements that have `timesPerDay` set
 * (supplements without it are continuous/untracked, so they're excluded).
 * `windowDays` includes today. Not cached — user-scoped.
 */
export async function getSupplementAdherence(
  windowDays = 7,
): Promise<SupplementAdherence[]> {
  const user = await getActiveUser();
  const supplements = await prisma.supplement.findMany({
    where: { userId: user.id, status: "active", timesPerDay: { not: null } },
    orderBy: { startDate: "desc" },
  });
  if (supplements.length === 0) return [];

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - (windowDays - 1));
  windowStart.setHours(0, 0, 0, 0);

  const logs = await prisma.supplementLog.findMany({
    where: {
      userId: user.id,
      supplementId: { in: supplements.map((s) => s.id) },
      takenAt: { gte: windowStart },
    },
    orderBy: { takenAt: "desc" },
  });

  const msPerDay = 24 * 60 * 60 * 1000;

  return supplements.map((s) => {
    const timesPerDay = s.timesPerDay ?? 0;
    const supplementLogs = logs.filter((l) => l.supplementId === s.id);
    const takenToday = supplementLogs.filter(
      (l) => l.takenAt >= todayStart,
    ).length;
    const windowLogged = supplementLogs.length;

    // Expected count over the window, clamped to the days the supplement was
    // actually active within it (handles supplements started mid-window).
    const rangeStart = s.startDate > windowStart ? s.startDate : windowStart;
    const activeDays = Math.max(
      0,
      Math.min(
        windowDays,
        Math.floor((now.getTime() - rangeStart.getTime()) / msPerDay) + 1,
      ),
    );
    const windowExpected = activeDays * timesPerDay;

    return {
      id: s.id,
      name: s.name,
      timesPerDay,
      takenToday,
      expectedToday: timesPerDay,
      windowLogged,
      windowExpected,
    };
  });
}

/** Recent intake log entries for one supplement (most recent first). */
export async function listSupplementLogs(supplementId: string, limit = 20) {
  const user = await getActiveUser();
  return prisma.supplementLog.findMany({
    where: { userId: user.id, supplementId },
    orderBy: { takenAt: "desc" },
    take: limit,
  });
}

// --- Lab recheck reminders -------------------------------------------------

export async function listLabReminders() {
  const user = await getActiveUser();
  return prisma.labReminder.findMany({
    where: { userId: user.id },
    // Pending (completedAt = null) first, soonest-due first; completed last.
    orderBy: [
      { completedAt: { sort: "asc", nulls: "first" } },
      { dueAt: "asc" },
    ],
  });
}

// --- Intervention bands (timeline overlay) ---------------------------------

/** Cycles + supplements overlapping [start, end], as shaded timeline bands. */
export async function getInterventionBands(start: Date, end: Date) {
  const user = await getActiveUser();
  const [cycles, supplements] = await Promise.all([
    prisma.cycle.findMany({
      where: { userId: user.id },
      include: { peptide: true, stack: true },
      orderBy: { startDate: "asc" },
    }),
    prisma.supplement.findMany({
      where: { userId: user.id },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const items: InterventionInput[] = [
    ...cycles.map((c) => ({
      id: c.id,
      kind: "cycle" as const,
      label: c.peptide?.name ?? c.stack?.name ?? c.name,
      start: c.startDate,
      end: c.endDate,
    })),
    ...supplements.map((s) => ({
      id: s.id,
      kind: "supplement" as const,
      label: s.name,
      start: s.startDate,
      end: s.endDate,
    })),
  ];

  return buildInterventionBands(items, start, end);
}

// --- Photos ----------------------------------------------------------------

/**
 * Paged photo gallery for /photos (skip/take, not fetch-all-then-slice) —
 * Vercel Blob transfer is a free-tier-bound resource too.
 */
export async function getPhotosPage({
  page = 1,
  pageSize = 24,
}: { page?: number; pageSize?: number } = {}) {
  const user = await getActiveUser();
  const where = { userId: user.id };
  const [rows, total] = await Promise.all([
    prisma.photo.findMany({
      where,
      orderBy: { takenAt: "desc" },
      skip: (Math.max(1, page) - 1) * pageSize,
      take: pageSize,
    }),
    prisma.photo.count({ where }),
  ]);
  return { rows, total };
}

/**
 * Lightweight full-history photo list (id/caption/takenAt only, no image
 * data) for the Before/After + Timeline pickers — those need the whole
 * chronological set to stay useful even while the gallery grid paginates.
 */
export async function listPhotoMeta() {
  const user = await getActiveUser();
  return prisma.photo.findMany({
    where: { userId: user.id },
    orderBy: { takenAt: "desc" },
    select: { id: true, caption: true, takenAt: true },
  });
}

// --- Journal -----------------------------------------------------------

/** The active profile's free-text journal entries, newest first. */
export async function listJournalEntries() {
  const user = await getActiveUser();
  return prisma.journalEntry.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });
}

// --- Daily check-ins --------------------------------------------------

/** The active profile's daily wellbeing check-ins, newest first. */
export async function listCheckIns(limit?: number) {
  const user = await getActiveUser();
  return prisma.checkIn.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: limit,
  });
}

/** The check-in for a specific local-midnight `date`, or null if unlogged. */
export async function getCheckIn(date: Date) {
  const user = await getActiveUser();
  return prisma.checkIn.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });
}

/** Today's check-in (local midnight), or null if not yet logged. */
export async function getTodaysCheckIn() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return getCheckIn(today);
}
