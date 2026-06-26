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
  const startRaw = String(formData.get("startDate") ?? "");
  const endRaw = String(formData.get("endDate") ?? "");
  const status = String(formData.get("status") ?? "active").trim() || "active";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  return {
    name,
    category,
    dose,
    frequency,
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
