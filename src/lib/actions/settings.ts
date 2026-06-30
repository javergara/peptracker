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
  const [cycles, doseLogs, measurements, journal, customStacks] =
    await Promise.all([
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
    ]);

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
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
  };
}

type ImportPayload = {
  measurements?: {
    type: string;
    label?: string | null;
    value: number;
    unit?: string | null;
    recordedAt?: string;
  }[];
};

/** Minimal import: restores measurements (safe, additive). Extend as needed. */
export async function importUserData(json: string) {
  const user = await getCurrentUser();
  let payload: ImportPayload;
  try {
    payload = JSON.parse(json) as ImportPayload;
  } catch {
    throw new Error("Invalid JSON file.");
  }

  const measurements = payload.measurements ?? [];
  for (const m of measurements) {
    await prisma.measurement.create({
      data: {
        userId: user.id,
        type: m.type,
        label: m.label ?? null,
        value: m.value,
        unit: m.unit ?? null,
        recordedAt: m.recordedAt ? new Date(m.recordedAt) : new Date(),
      },
    });
  }

  revalidatePath("/metrics");
  revalidatePath("/settings");
  return measurements.length;
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
