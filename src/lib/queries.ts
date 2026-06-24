import "server-only";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";

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

export async function listPeptides() {
  return prisma.peptide.findMany({ orderBy: { name: "asc" } });
}

export async function getPeptideBySlug(slug: string) {
  return prisma.peptide.findUnique({ where: { slug } });
}

export async function getPeptideInteractions(peptideId: string) {
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
}

/** Flat peptide-to-peptide interaction rows (for the stack builder / checks). */
export async function getAllInteractionRows() {
  const rows = await prisma.peptideInteraction.findMany();
  return rows.map((r) => ({
    peptideAId: r.peptideAId,
    peptideBId: r.peptideBId,
    kind: r.kind,
    note: r.note,
  }));
}

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
  return prisma.cycle.findUnique({
    where: { id },
    include: {
      peptide: true,
      stack: { include: { items: { include: { peptide: true } } } },
      doseLogs: { orderBy: { takenAt: "desc" }, include: { peptide: true } },
    },
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
    orderBy: { takenAt: "desc" },
    take: limit,
    include: { peptide: true, cycle: true },
  });
}

/** Dose logs for the active profile within a date range (calendar view). */
export async function getDoseLogsInRange(start: Date, end: Date) {
  const user = await getActiveUser();
  return prisma.doseLog.findMany({
    where: { userId: user.id, takenAt: { gte: start, lte: end } },
    orderBy: { takenAt: "asc" },
    include: { peptide: true, cycle: true },
  });
}

/** Dose logs across ALL profiles in a range (combined calendar overlay). */
export async function getAllDoseLogsInRange(start: Date, end: Date) {
  return prisma.doseLog.findMany({
    where: { takenAt: { gte: start, lte: end } },
    orderBy: { takenAt: "asc" },
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

// --- Labs ------------------------------------------------------------------

export async function listLabs() {
  const user = await getActiveUser();
  return prisma.labResult.findMany({
    where: { userId: user.id },
    orderBy: { takenAt: "asc" },
  });
}

// --- Photos ----------------------------------------------------------------

export async function listPhotos() {
  const user = await getActiveUser();
  return prisma.photo.findMany({
    where: { userId: user.id },
    orderBy: { takenAt: "desc" },
  });
}
