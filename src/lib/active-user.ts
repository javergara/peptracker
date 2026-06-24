import "server-only";

import { cookies } from "next/headers";

import { prisma } from "@/lib/db";

/**
 * Multi-profile support WITHOUT login: the "active profile" is stored in a
 * cookie. Any server component or action resolves the current profile through
 * getActiveUser(). Switching profiles just rewrites the cookie.
 */
export const ACTIVE_USER_COOKIE = "activeUserId";

export async function getActiveUser() {
  const store = await cookies();
  const id = store.get(ACTIVE_USER_COOKIE)?.value;
  if (id) {
    const u = await prisma.user.findUnique({ where: { id } });
    if (u) return u;
  }
  const first = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (first) return first;
  // Bootstrap a default profile on a fresh database.
  return prisma.user.create({
    data: { name: "Me", email: "local@peptides.app" },
  });
}

export async function getAllUsers() {
  return prisma.user.findMany({ orderBy: { createdAt: "asc" } });
}
