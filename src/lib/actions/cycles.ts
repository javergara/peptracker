"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/queries";

export type CycleStatusValue = "planned" | "active" | "paused" | "completed";

export async function createCycle(formData: FormData) {
  const user = await getCurrentUser();
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
  const data = {
    userId: user.id,
    name,
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : null,
    status,
    peptideId: kind === "peptide" ? id : null,
    stackId: kind === "stack" ? id : null,
    scheduleConfig: { frequency, dosePerAdmin, unit },
    notes: notes || null,
  };

  const cycle = await prisma.cycle.create({ data });
  revalidatePath("/cycles");
  revalidatePath("/");
  return cycle.id;
}

export async function updateCycleStatus(id: string, status: CycleStatusValue) {
  await prisma.cycle.update({ where: { id }, data: { status } });
  revalidatePath("/cycles");
  revalidatePath(`/cycles/${id}`);
  revalidatePath("/");
}

export async function deleteCycle(id: string) {
  await prisma.cycle.delete({ where: { id } });
  revalidatePath("/cycles");
  revalidatePath("/");
}
