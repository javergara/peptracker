"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/queries";

export async function updateUserSettings(formData: FormData) {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim() || "Me";
  const weightUnit = String(formData.get("weightUnit") ?? "kg");
  const doseUnit = String(formData.get("doseUnit") ?? "mcg");
  // Sex + birth year drive sex/age-aware biomarker reference ranges.
  const sexRaw = String(formData.get("sex") ?? "").trim();
  const sex =
    sexRaw === "M" || sexRaw === "F" || sexRaw === "other" ? sexRaw : null;
  const birthYearRaw = String(formData.get("birthYear") ?? "").trim();
  const birthYearNum = birthYearRaw ? Number(birthYearRaw) : NaN;
  const birthYear =
    Number.isInteger(birthYearNum) &&
    birthYearNum > 1900 &&
    birthYearNum <= new Date().getFullYear()
      ? birthYearNum
      : null;

  await prisma.user.update({
    where: { id: user.id },
    data: { name, weightUnit, doseUnit, sex, birthYear },
  });

  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/labs");
}

/** Export all user-owned data as a JSON-serializable object (local backup). */
export async function exportUserData() {
  const user = await getCurrentUser();
  const [
    cycles,
    doseLogs,
    measurements,
    journal,
    customStacks,
    labs,
    vials,
    stockItems,
    supplements,
    labReminders,
  ] = await Promise.all([
    prisma.cycle.findMany({
      where: { userId: user.id },
      orderBy: { startDate: "asc" },
    }),
    prisma.doseLog.findMany({
      where: { userId: user.id },
      orderBy: [{ takenAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.measurement.findMany({
      where: { userId: user.id },
      orderBy: { recordedAt: "asc" },
    }),
    prisma.journalEntry.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
    }),
    prisma.stack.findMany({
      where: { userId: user.id, isPreset: false },
      include: { items: true },
    }),
    prisma.labResult.findMany({
      where: { userId: user.id },
      orderBy: { takenAt: "asc" },
    }),
    prisma.vial.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.stockItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.supplement.findMany({
      where: { userId: user.id },
      orderBy: { startDate: "asc" },
    }),
    prisma.labReminder.findMany({
      where: { userId: user.id },
      orderBy: { dueAt: "asc" },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    version: 2,
    user: {
      name: user.name,
      weightUnit: user.weightUnit,
      doseUnit: user.doseUnit,
    },
    cycles,
    doseLogs,
    measurements,
    journal,
    customStacks,
    labs,
    vials,
    stockItems,
    supplements,
    labReminders,
  };
}

/** Loose row shape: we read known keys defensively and ignore the rest. */
type Row = Record<string, unknown>;

type ImportPayload = {
  measurements?: Row[];
  journal?: Row[];
  customStacks?: (Row & { items?: Row[] })[];
  cycles?: Row[];
  vials?: Row[];
  doseLogs?: Row[];
  labs?: Row[];
  stockItems?: Row[];
  supplements?: Row[];
  labReminders?: Row[];
};

const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const int = (v: unknown): number | null => {
  const n = num(v);
  return n != null && Number.isInteger(n) ? n : null;
};
const date = (v: unknown): Date | null => {
  if (typeof v !== "string" && !(v instanceof Date)) return null;
  const d = new Date(v as string | Date);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Restore a full JSON backup (additive — imported rows are ADDED next to any
 * existing data, never merged/deduped). Old ids are remapped: stacks → cycles →
 * vials → dose logs/journal keep their links; rows referencing a peptide that
 * no longer exists in the library are skipped. Photos are not part of the JSON
 * backup (blob files can't round-trip through it).
 */
export async function importUserData(json: string) {
  const user = await getCurrentUser();
  let payload: ImportPayload;
  try {
    payload = JSON.parse(json) as ImportPayload;
  } catch {
    throw new Error("Invalid JSON file.");
  }

  const knownPeptides = new Set(
    (await prisma.peptide.findMany({ select: { id: true } })).map((p) => p.id),
  );
  const keepPeptide = (v: unknown): string | null => {
    const id = str(v);
    return id && knownPeptides.has(id) ? id : null;
  };

  let imported = 0;

  await prisma.$transaction(
    async (tx) => {
      // 1. Custom stacks (fresh slugs — slug is globally unique).
      const stackIdMap = new Map<string, string>();
      for (const s of payload.customStacks ?? []) {
        const name = str(s.name);
        if (!name) continue;
        const created = await tx.stack.create({
          data: {
            slug: `custom-${crypto.randomUUID().slice(0, 8)}`,
            name,
            goal: str(s.goal),
            description: str(s.description) ?? "",
            isPreset: false,
            tags: (s.tags as object | null) ?? undefined,
            userId: user.id,
            items: {
              create: (s.items ?? [])
                .filter((it) => keepPeptide(it.peptideId))
                .map((it, i) => ({
                  peptideId: keepPeptide(it.peptideId)!,
                  dose: str(it.dose),
                  frequency: str(it.frequency),
                  timing: str(it.timing),
                  notes: str(it.notes),
                  order: int(it.order) ?? i,
                })),
            },
          },
        });
        const oldId = str(s.id);
        if (oldId) stackIdMap.set(oldId, created.id);
        imported++;
      }

      // 2. Cycles (remap stack link; drop unknown peptide links).
      const cycleIdMap = new Map<string, string>();
      for (const c of payload.cycles ?? []) {
        const name = str(c.name);
        const startDate = date(c.startDate);
        if (!name || !startDate) continue;
        const created = await tx.cycle.create({
          data: {
            userId: user.id,
            name,
            peptideId: keepPeptide(c.peptideId),
            stackId: stackIdMap.get(str(c.stackId) ?? "") ?? null,
            startDate,
            endDate: date(c.endDate),
            status: str(c.status) ?? "planned",
            scheduleConfig: (c.scheduleConfig as object | null) ?? undefined,
            notes: str(c.notes),
          },
        });
        const oldId = str(c.id);
        if (oldId) cycleIdMap.set(oldId, created.id);
        imported++;
      }

      // 3. Vials (skip unknown peptides).
      const vialIdMap = new Map<string, string>();
      for (const v of payload.vials ?? []) {
        const peptideId = keepPeptide(v.peptideId);
        const totalMcg = num(v.totalMcg);
        if (!peptideId || totalMcg == null) continue;
        const created = await tx.vial.create({
          data: {
            userId: user.id,
            peptideId,
            label: str(v.label),
            totalMcg,
            bacWaterMl: num(v.bacWaterMl),
            concentrationMcgPerMl: num(v.concentrationMcgPerMl),
            remainingMcg: num(v.remainingMcg) ?? totalMcg,
            reconstitutedAt: date(v.reconstitutedAt),
            expiresAt: date(v.expiresAt),
            status: str(v.status) ?? "sealed",
            notes: str(v.notes),
          },
        });
        const oldId = str(v.id);
        if (oldId) vialIdMap.set(oldId, created.id);
        imported++;
      }

      // 4. Dose logs (remap cycle/vial; skip unknown peptides).
      const doseRows = (payload.doseLogs ?? []).flatMap((d) => {
        const peptideId = keepPeptide(d.peptideId);
        const amount = num(d.amount);
        if (!peptideId || amount == null) return [];
        return [
          {
            userId: user.id,
            peptideId,
            cycleId: cycleIdMap.get(str(d.cycleId) ?? "") ?? null,
            vialId: vialIdMap.get(str(d.vialId) ?? "") ?? null,
            takenAt: date(d.takenAt) ?? new Date(),
            amount,
            unit: str(d.unit) ?? "mcg",
            route: str(d.route),
            site: str(d.site),
            mood: int(d.mood),
            energy: int(d.energy),
            sideEffects: (d.sideEffects as object | null) ?? undefined,
            notes: str(d.notes),
          },
        ];
      });
      if (doseRows.length) {
        await tx.doseLog.createMany({ data: doseRows });
        imported += doseRows.length;
      }

      // 5. Flat user-owned rows.
      const measurementRows = (payload.measurements ?? []).flatMap((m) => {
        const type = str(m.type);
        const value = num(m.value);
        if (!type || value == null) return [];
        return [
          {
            userId: user.id,
            type,
            label: str(m.label),
            value,
            unit: str(m.unit),
            recordedAt: date(m.recordedAt) ?? new Date(),
          },
        ];
      });
      if (measurementRows.length) {
        await tx.measurement.createMany({ data: measurementRows });
        imported += measurementRows.length;
      }

      const journalRows = (payload.journal ?? []).flatMap((j) => {
        const body = str(j.body);
        if (!body) return [];
        return [
          {
            userId: user.id,
            body,
            date: date(j.date) ?? new Date(),
            tags: (j.tags as object | null) ?? undefined,
            cycleId: cycleIdMap.get(str(j.cycleId) ?? "") ?? null,
          },
        ];
      });
      if (journalRows.length) {
        await tx.journalEntry.createMany({ data: journalRows });
        imported += journalRows.length;
      }

      const labRows = (payload.labs ?? []).flatMap((l) => {
        const marker = str(l.marker);
        const value = num(l.value);
        if (!marker || value == null) return [];
        return [
          {
            userId: user.id,
            marker,
            biomarkerSlug: str(l.biomarkerSlug),
            value,
            unit: str(l.unit),
            refLow: num(l.refLow),
            refHigh: num(l.refHigh),
            takenAt: date(l.takenAt) ?? new Date(),
            cycleId: cycleIdMap.get(str(l.cycleId) ?? "") ?? null,
            notes: str(l.notes),
          },
        ];
      });
      if (labRows.length) {
        await tx.labResult.createMany({ data: labRows });
        imported += labRows.length;
      }

      const stockRows = (payload.stockItems ?? []).flatMap((s) => {
        const peptideId = keepPeptide(s.peptideId);
        const vialMcg = num(s.vialMcg);
        if (!peptideId || vialMcg == null) return [];
        return [
          {
            userId: user.id,
            peptideId,
            vialMcg,
            quantity: int(s.quantity) ?? 1,
            dose: num(s.dose),
            doseUnit: str(s.doseUnit) ?? "mcg",
            frequency: str(s.frequency) ?? "daily",
            notes: str(s.notes),
          },
        ];
      });
      if (stockRows.length) {
        await tx.stockItem.createMany({ data: stockRows });
        imported += stockRows.length;
      }

      const supplementRows = (payload.supplements ?? []).flatMap((s) => {
        const name = str(s.name);
        const startDate = date(s.startDate);
        if (!name || !startDate) return [];
        return [
          {
            userId: user.id,
            name,
            category: str(s.category),
            dose: str(s.dose),
            frequency: str(s.frequency),
            startDate,
            endDate: date(s.endDate),
            status: str(s.status) ?? "active",
            notes: str(s.notes),
          },
        ];
      });
      if (supplementRows.length) {
        await tx.supplement.createMany({ data: supplementRows });
        imported += supplementRows.length;
      }

      const reminderRows = (payload.labReminders ?? []).flatMap((r) => {
        const label = str(r.label);
        const dueAt = date(r.dueAt);
        if (!label || !dueAt) return [];
        return [
          {
            userId: user.id,
            label,
            dueAt,
            biomarkerSlug: str(r.biomarkerSlug),
            note: str(r.note),
            completedAt: date(r.completedAt),
          },
        ];
      });
      if (reminderRows.length) {
        await tx.labReminder.createMany({ data: reminderRows });
        imported += reminderRows.length;
      }
    },
    { timeout: 30_000 },
  );

  revalidatePath("/", "layout");
  return imported;
}

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

/** Dose-log history for the active profile as CSV text. */
export async function exportDosesCsv(): Promise<string> {
  const user = await getCurrentUser();
  const doses = await prisma.doseLog.findMany({
    where: { userId: user.id },
    orderBy: { takenAt: "desc" },
    include: { peptide: true, cycle: true },
  });
  return toCsv(
    [
      "takenAt",
      "peptide",
      "amount",
      "unit",
      "route",
      "site",
      "cycle",
      "mood",
      "energy",
      "notes",
    ],
    doses.map((d) => [
      d.takenAt.toISOString(),
      d.peptide.name,
      d.amount,
      d.unit,
      d.route ?? "",
      d.site ?? "",
      d.cycle?.name ?? "",
      d.mood ?? "",
      d.energy ?? "",
      d.notes ?? "",
    ]),
  );
}

/** Lab results for the active profile as CSV text. */
export async function exportLabsCsv(): Promise<string> {
  const user = await getCurrentUser();
  const labs = await prisma.labResult.findMany({
    where: { userId: user.id },
    orderBy: { takenAt: "desc" },
  });
  return toCsv(
    ["takenAt", "marker", "value", "unit", "refLow", "refHigh", "notes"],
    labs.map((l) => [
      l.takenAt.toISOString(),
      l.marker,
      l.value,
      l.unit ?? "",
      l.refLow ?? "",
      l.refHigh ?? "",
      l.notes ?? "",
    ]),
  );
}
