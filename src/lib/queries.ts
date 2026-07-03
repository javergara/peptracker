import "server-only";

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";
import {
  buildInterventionBands,
  type InterventionInput,
} from "@/lib/interventions";

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

export async function listCycles() {
  const user = await getActiveUser();
  return prisma.cycle.findMany({
    where: { userId: user.id },
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

/** A single logged dose owned by the active profile (for the edit form). */
export async function getDoseLog(id: string) {
  const user = await getActiveUser();
  return prisma.doseLog.findFirst({
    where: { id, userId: user.id },
    include: { peptide: true },
  });
}

export async function getActiveCycles() {
  const user = await getActiveUser();
  return prisma.cycle.findMany({
    where: { status: "active", userId: user.id },
    orderBy: { startDate: "desc" },
    include: { peptide: true, stack: true },
  });
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
  /** Combined vials on hand — drives the low-stock alert. */
  total: number;
}

/**
 * Combined vials-on-hand per peptide: Σ stock quantity + count of active/sealed
 * vials. Candidate peptides are those with a stock item OR any vial (any status).
 * Powers the stock-card low badge and the dashboard low-stock alert.
 */
export async function getStockLevels(): Promise<StockLevel[]> {
  const user = await getActiveUser();
  const [stock, vials] = await Promise.all([
    prisma.stockItem.findMany({
      where: { userId: user.id },
      include: { peptide: { select: { name: true } } },
    }),
    prisma.vial.findMany({
      where: { userId: user.id },
      select: {
        peptideId: true,
        status: true,
        peptide: { select: { name: true } },
      },
    }),
  ]);

  const levels = new Map<string, StockLevel>();
  const ensure = (peptideId: string, peptideName: string) => {
    let l = levels.get(peptideId);
    if (!l) {
      l = { peptideId, peptideName, stockVials: 0, activeVials: 0, total: 0 };
      levels.set(peptideId, l);
    }
    return l;
  };

  for (const s of stock) {
    ensure(s.peptideId, s.peptide.name).stockVials += s.quantity;
  }
  for (const v of vials) {
    const l = ensure(v.peptideId, v.peptide.name);
    if (v.status === "active" || v.status === "sealed") l.activeVials += 1;
  }
  for (const l of levels.values()) l.total = l.stockVials + l.activeVials;

  return Array.from(levels.values()).sort((a, b) =>
    a.peptideName.localeCompare(b.peptideName),
  );
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

export async function listPhotos() {
  const user = await getActiveUser();
  return prisma.photo.findMany({
    where: { userId: user.id },
    orderBy: { takenAt: "desc" },
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
