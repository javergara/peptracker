"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/queries";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function createStack(formData: FormData) {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const peptideIds = formData.getAll("peptideIds").map(String).filter(Boolean);

  if (!name || peptideIds.length === 0) {
    throw new Error("A name and at least one peptide are required.");
  }

  let slug = slugify(name);
  // Ensure uniqueness.
  const existing = await prisma.stack.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const stack = await prisma.stack.create({
    data: {
      slug,
      name,
      goal: goal || null,
      description: description || "Custom stack.",
      isPreset: false,
      userId: user.id,
      items: {
        create: peptideIds.map((peptideId, order) => ({ peptideId, order })),
      },
    },
  });

  revalidatePath("/stacks");
  return stack.slug;
}

export async function deleteStack(id: string) {
  // Only user-created stacks can be deleted; presets are protected.
  const stack = await prisma.stack.findUnique({ where: { id } });
  if (!stack || stack.isPreset) {
    throw new Error("Preset stacks cannot be deleted.");
  }
  await prisma.stack.delete({ where: { id } });
  revalidatePath("/stacks");
}
