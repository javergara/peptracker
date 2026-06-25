"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { ACTIVE_USER_COOKIE, requireAccountId } from "@/lib/active-user";

const COOKIE_OPTS = {
  httpOnly: false,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
};

export async function setActiveUser(id: string) {
  const accountId = await requireAccountId();
  // Only allow switching to a profile this account owns.
  const owned = await prisma.user.findFirst({ where: { id, accountId } });
  if (!owned) throw new Error("Profile not found.");

  const store = await cookies();
  store.set(ACTIVE_USER_COOKIE, id, COOKIE_OPTS);
  // Everything is profile-scoped, so refresh the whole tree.
  revalidatePath("/", "layout");
}

export async function createProfile(formData: FormData) {
  const accountId = await requireAccountId();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const makeActive = formData.get("makeActive") != null;
  if (!name) throw new Error("A profile name is required.");

  const user = await prisma.user.create({
    data: { name, color: color || null, accountId },
  });

  if (makeActive) {
    const store = await cookies();
    store.set(ACTIVE_USER_COOKIE, user.id, COOKIE_OPTS);
  }
  revalidatePath("/", "layout");
}

export async function updateProfile(formData: FormData) {
  const accountId = await requireAccountId();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  if (!id || !name) throw new Error("Profile id and name are required.");

  // updateMany with an accountId filter so one account can't edit another's.
  await prisma.user.updateMany({
    where: { id, accountId },
    data: { name, color: color || null },
  });
  revalidatePath("/", "layout");
}

export async function deleteProfile(id: string) {
  const accountId = await requireAccountId();
  const count = await prisma.user.count({ where: { accountId } });
  if (count <= 1) {
    throw new Error("You can't delete the only profile.");
  }
  await prisma.user.deleteMany({ where: { id, accountId } });

  // If the deleted profile was active, fall back to another one.
  const store = await cookies();
  if (store.get(ACTIVE_USER_COOKIE)?.value === id) {
    const next = await prisma.user.findFirst({
      where: { accountId },
      orderBy: { createdAt: "asc" },
    });
    if (next) store.set(ACTIVE_USER_COOKIE, next.id, COOKIE_OPTS);
  }
  revalidatePath("/", "layout");
}
