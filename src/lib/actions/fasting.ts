"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";

/**
 * Intermittent-fasting sessions (profile-scoped). An open session (endedAt
 * null) is the active fast; there is at most one per profile — starting a new
 * fast supersedes any that was left open.
 */

export async function startFast(targetHours: number) {
  const user = await getActiveUser();
  const hours = Math.round(targetHours);
  const target =
    Number.isFinite(hours) && hours > 0 && hours <= 48 ? hours : 16;

  // Close any dangling open fast, then begin a fresh one.
  await prisma.fastingSession.updateMany({
    where: { userId: user.id, endedAt: null },
    data: { endedAt: new Date() },
  });
  await prisma.fastingSession.create({
    data: { userId: user.id, targetHours: target },
  });

  revalidatePath("/food");
  revalidatePath("/");
}

/** End the active fast (marks endedAt). */
export async function endFast() {
  const user = await getActiveUser();
  await prisma.fastingSession.updateMany({
    where: { userId: user.id, endedAt: null },
    data: { endedAt: new Date() },
  });
  revalidatePath("/food");
  revalidatePath("/");
}

/** Discard the active fast entirely (started by mistake). */
export async function cancelFast() {
  const user = await getActiveUser();
  await prisma.fastingSession.deleteMany({
    where: { userId: user.id, endedAt: null },
  });
  revalidatePath("/food");
  revalidatePath("/");
}
