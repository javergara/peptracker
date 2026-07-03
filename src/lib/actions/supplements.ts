"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";

/**
 * Supplements are continuous compounds (vitamins, minerals, omega-3, creatine…)
 * tracked as date ranges — they overlay the biomarker timeline as confounder
 * bands. All mutations are ownership-scoped to the active profile.
 */

function readFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const dose = String(formData.get("dose") ?? "").trim() || null;
  const frequency = String(formData.get("frequency") ?? "").trim() || null;
  const timesPerDayRaw = String(formData.get("timesPerDay") ?? "").trim();
  const timesPerDay = timesPerDayRaw ? Number(timesPerDayRaw) : null;
  const timing = String(formData.get("timing") ?? "").trim() || null;
  const startRaw = String(formData.get("startDate") ?? "");
  const endRaw = String(formData.get("endDate") ?? "");
  const status = String(formData.get("status") ?? "active").trim() || "active";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  return {
    name,
    category,
    dose,
    frequency,
    timesPerDay:
      timesPerDay != null && Number.isFinite(timesPerDay) && timesPerDay > 0
        ? Math.round(timesPerDay)
        : null,
    timing,
    startDate: startRaw ? new Date(startRaw) : new Date(),
    endDate: endRaw ? new Date(endRaw) : null,
    status,
    notes,
  };
}

export async function addSupplement(formData: FormData) {
  const user = await getActiveUser();
  const data = readFields(formData);
  if (!data.name) throw new Error("A supplement name is required.");
  await prisma.supplement.create({ data: { userId: user.id, ...data } });
  revalidatePath("/supplements");
}

export async function updateSupplement(id: string, formData: FormData) {
  const user = await getActiveUser();
  const data = readFields(formData);
  if (!data.name) throw new Error("A supplement name is required.");
  const res = await prisma.supplement.updateMany({
    where: { id, userId: user.id },
    data,
  });
  if (res.count === 0) throw new Error("Supplement not found.");
  revalidatePath("/supplements");
}

export async function deleteSupplement(id: string) {
  const user = await getActiveUser();
  await prisma.supplement.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/supplements");
}

/**
 * Dose-timing adherence logging. A SupplementLog is a single logged intake,
 * distinct from the continuous Supplement date range it belongs to.
 */

export async function logSupplementIntake(
  supplementId: string,
): Promise<{ id: string; takenAt: string }> {
  const user = await getActiveUser();
  const supplement = await prisma.supplement.findFirst({
    where: { id: supplementId, userId: user.id },
  });
  if (!supplement) throw new Error("Supplement not found.");

  const log = await prisma.supplementLog.create({
    data: { userId: user.id, supplementId, takenAt: new Date() },
  });
  revalidatePath("/supplements");
  revalidatePath("/");
  return { id: log.id, takenAt: log.takenAt.toISOString() };
}

/** Undo for logSupplementIntake. */
export async function deleteSupplementLog(id: string) {
  const user = await getActiveUser();
  await prisma.supplementLog.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/supplements");
  revalidatePath("/");
}
