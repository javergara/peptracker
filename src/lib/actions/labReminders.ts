"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";

/**
 * One-off lab-recheck action items (e.g. "Recheck ALT/AST in 6 weeks"). When
 * `dueAt <= now` and not yet completed, the daily reminders cron includes them
 * in the push. All mutations are ownership-scoped to the active profile.
 */

export async function addLabReminder(formData: FormData) {
  const user = await getActiveUser();
  const label = String(formData.get("label") ?? "").trim();
  const dueRaw = String(formData.get("dueAt") ?? "");
  if (!label) throw new Error("A label is required.");
  if (!dueRaw) throw new Error("A due date is required.");
  const biomarkerSlug =
    String(formData.get("biomarkerSlug") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  await prisma.labReminder.create({
    data: {
      userId: user.id,
      label,
      dueAt: new Date(dueRaw),
      biomarkerSlug,
      note,
    },
  });
  revalidatePath("/labs");
}

export async function completeLabReminder(id: string) {
  const user = await getActiveUser();
  const res = await prisma.labReminder.updateMany({
    where: { id, userId: user.id },
    data: { completedAt: new Date() },
  });
  if (res.count === 0) throw new Error("Reminder not found.");
  revalidatePath("/labs");
}

export async function deleteLabReminder(id: string) {
  const user = await getActiveUser();
  await prisma.labReminder.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/labs");
}
