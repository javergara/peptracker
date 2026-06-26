import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";

/**
 * Profiles belong to the logged-in Account. The "active profile" within that
 * account is stored in a cookie; every server component / action resolves it
 * through getActiveUser(). All profile-owned reads stay scoped by the active
 * profile's id, and the set of selectable profiles is scoped to the account.
 *
 * `getAccountId` and `getActiveUser` are wrapped in React `cache()` so the many
 * read functions that call them during a single render/action resolve the
 * session + profile **once per request** instead of re-hitting auth + Postgres
 * for every query. These are per-request caches (never cross-request), so they
 * stay correctly scoped to the current session — a global cache here would leak
 * one account's profile to another.
 */
export const ACTIVE_USER_COOKIE = "activeUserId";

/** The signed-in account id, or null when there is no session. */
export const getAccountId = cache(async (): Promise<string | null> => {
  const session = await auth();
  return session?.user?.accountId ?? null;
});

/** Like getAccountId, but throws — use in code paths that require a session. */
export async function requireAccountId(): Promise<string> {
  const accountId = await getAccountId();
  if (!accountId) throw new Error("Not authenticated");
  return accountId;
}

export const getActiveUser = cache(async () => {
  const accountId = await requireAccountId();
  const store = await cookies();
  const id = store.get(ACTIVE_USER_COOKIE)?.value;
  if (id) {
    const u = await prisma.user.findFirst({ where: { id, accountId } });
    if (u) return u;
  }
  const first = await prisma.user.findFirst({
    where: { accountId },
    orderBy: { createdAt: "asc" },
  });
  if (first) return first;
  // Account has no profiles yet — bootstrap a default one named after it.
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  return prisma.user.create({
    data: { name: account?.name || "Me", accountId },
  });
});

export async function getAllUsers() {
  const accountId = await getAccountId();
  if (!accountId) return [];
  return prisma.user.findMany({
    where: { accountId },
    orderBy: { createdAt: "asc" },
  });
}
