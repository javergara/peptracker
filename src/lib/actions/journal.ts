"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";

/** Parse the shared journal entry form fields (used by create + update). */
function parseJournalForm(formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Entry text is required.");
  return { body };
}

export async function createJournalEntry(formData: FormData) {
  const user = await getActiveUser();
  await prisma.journalEntry.create({
    data: { userId: user.id, ...parseJournalForm(formData) },
  });
  revalidatePath("/journal");
}

export async function updateJournalEntry(id: string, formData: FormData) {
  const user = await getActiveUser();
  const result = await prisma.journalEntry.updateMany({
    where: { id, userId: user.id },
    data: parseJournalForm(formData),
  });
  if (result.count === 0) throw new Error("Journal entry not found.");
  revalidatePath("/journal");
}

export async function deleteJournalEntry(id: string) {
  const user = await getActiveUser();
  const result = await prisma.journalEntry.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) throw new Error("Journal entry not found.");
  revalidatePath("/journal");
}
