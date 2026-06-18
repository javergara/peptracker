import "server-only";

import { prisma } from "@/lib/db";

/**
 * Central read-side data access. Server Components and server actions import
 * from here so query shapes stay consistent across the app.
 */

/** The single local user (seeded). Created lazily if missing. */
export async function getCurrentUser() {
  const existing = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return prisma.user.create({
    data: { name: "Me", email: "local@peptides.app" },
  });
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
  return prisma.cycle.findMany({
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
  return prisma.cycle.findMany({
    where: { status: "active" },
    orderBy: { startDate: "desc" },
    include: { peptide: true, stack: true },
  });
}

export async function getRecentDoseLogs(limit = 10) {
  return prisma.doseLog.findMany({
    orderBy: { takenAt: "desc" },
    take: limit,
    include: { peptide: true, cycle: true },
  });
}

export async function listMeasurements(type?: string) {
  return prisma.measurement.findMany({
    where: type ? { type } : undefined,
    orderBy: { recordedAt: "asc" },
  });
}
