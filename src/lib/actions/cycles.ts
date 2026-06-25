"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/queries";

export type CycleStatusValue = "planned" | "active" | "paused" | "completed";

/** Parse the shared cycle form fields (used by create + update). */
function parseCycleForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const source = String(formData.get("source") ?? ""); // "peptide:<id>" | "stack:<id>"
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const status = (String(formData.get("status") ?? "active") ||
    "active") as CycleStatusValue;
  const frequency = String(formData.get("frequency") ?? "daily");
  const dosePerAdmin = Number(formData.get("dosePerAdmin") ?? 0);
  const unit = String(formData.get("unit") ?? "mcg");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name || !startDate) {
    throw new Error("Name and start date are required.");
  }

  const [kind, id] = source.split(":");
  return {
    name,
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : null,
    status,
    peptideId: kind === "peptide" ? id : null,
    stackId: kind === "stack" ? id : null,
    scheduleConfig: { frequency, dosePerAdmin, unit },
    notes: notes || null,
  };
}

export async function createCycle(formData: FormData) {
  const user = await getCurrentUser();
  const cycle = await prisma.cycle.create({
    data: { userId: user.id, ...parseCycleForm(formData) },
  });
  revalidatePath("/cycles");
  revalidatePath("/");
  return cycle.id;
}

export async function updateCycle(id: string, formData: FormData) {
  const user = await getCurrentUser();
  // Ownership check: only the active profile's cycles are editable.
  const owned = await prisma.cycle.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!owned) throw new Error("Cycle not found.");

  await prisma.cycle.update({ where: { id }, data: parseCycleForm(formData) });
  revalidatePath("/cycles");
  revalidatePath(`/cycles/${id}`);
  revalidatePath("/");
}

export async function updateCycleStatus(id: string, status: CycleStatusValue) {
  const user = await getCurrentUser();
  const result = await prisma.cycle.updateMany({
    where: { id, userId: user.id },
    data: { status },
  });
  if (result.count === 0) throw new Error("Cycle not found.");
  revalidatePath("/cycles");
  revalidatePath(`/cycles/${id}`);
  revalidatePath("/");
}

export async function deleteCycle(id: string) {
  const user = await getCurrentUser();
  const result = await prisma.cycle.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) throw new Error("Cycle not found.");
  revalidatePath("/cycles");
  revalidatePath("/");
}
