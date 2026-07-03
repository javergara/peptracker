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

// Parses the shared stack-builder form shape into ordered StackItem rows.
// Selection order is preserved (peptideIds arrives in the order the builder
// submitted them), and each selected peptide may carry an optional per-item
// dose/notes pair keyed as `dose:<peptideId>` / `notes:<peptideId>`.
function parseStackItems(formData: FormData) {
  const peptideIds = formData.getAll("peptideIds").map(String).filter(Boolean);
  return peptideIds.map((peptideId, order) => ({
    peptideId,
    order,
    dose: String(formData.get(`dose:${peptideId}`) ?? "").trim() || null,
    notes: String(formData.get(`notes:${peptideId}`) ?? "").trim() || null,
  }));
}

export async function createStack(formData: FormData) {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const items = parseStackItems(formData);

  if (!name || items.length === 0) {
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
      items: { create: items },
    },
  });

  revalidatePath("/stacks");
  return stack.slug;
}

export async function updateStack(id: string, formData: FormData) {
  const user = await getCurrentUser();

  // Ownership-scoped: only the owning profile's own custom stacks are
  // editable; preset stacks (userId null) never match and stay protected.
  const stack = await prisma.stack.findFirst({
    where: { id, userId: user.id, isPreset: false },
  });
  if (!stack) {
    throw new Error("Stack not found or cannot be edited.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const items = parseStackItems(formData);

  if (!name || items.length === 0) {
    throw new Error("A name and at least one peptide are required.");
  }

  await prisma.$transaction([
    prisma.stackItem.deleteMany({ where: { stackId: stack.id } }),
    prisma.stack.update({
      where: { id: stack.id },
      data: {
        name,
        goal: goal || null,
        description: description || "Custom stack.",
        items: { createMany: { data: items } },
      },
    }),
  ]);

  revalidatePath("/stacks");
  revalidatePath(`/stacks/${stack.slug}`);
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
